// controllers/chatController.js
const Chat = require('../models/Chat');
const Order = require('../models/Order');
const Trip = require('../models/Trip');
const User = require('../models/User');
const Driver = require('../models/Driver');

/**
 * Check if two users have a valid work relationship that allows them to chat
 * @param {string} userId1 - First user ID
 * @param {string} userId2 - Second user ID
 * @returns {Object} - { canChat: boolean, reason: string, relationship: object|null }
 */
const checkWorkRelationship = async (userId1, userId2) => {
  try {
    // Check for accepted orders between users
    const acceptedOrder = await Order.findOne({
      $or: [
        { client: userId1, artisan: userId2, status: 'accepted' },
        { client: userId2, artisan: userId1, status: 'accepted' },
        { client: userId1, artisan: userId2, status: 'completed' },
        { client: userId2, artisan: userId1, status: 'completed' }
      ]
    }).populate('client artisan', 'name email');

    if (acceptedOrder) {
      return {
        canChat: true,
        reason: 'Users have an accepted/completed order',
        relationship: {
          type: 'order',
          id: acceptedOrder._id,
          status: acceptedOrder.status,
          client: acceptedOrder.client,
          artisan: acceptedOrder.artisan
        }
      };
    }

    // Check if users are involved in non-pending trips
    // First get driver info for both users
    const driver1 = await Driver.findOne({ user: userId1 });
    const driver2 = await Driver.findOne({ user: userId2 });

    let tripQuery = {
      status: { $ne: 'pending' }, // Not pending (accepted, completed, etc.)
      $or: []
    };

    // Build query based on who might be driver vs client
    if (driver1) {
      tripQuery.$or.push(
        { driver: driver1._id, client: userId2 },
        { client: userId1, driver: { $exists: true } }
      );
    }
    
    if (driver2) {
      tripQuery.$or.push(
        { driver: driver2._id, client: userId1 },
        { client: userId2, driver: { $exists: true } }
      );
    }

    // Also check direct client relationships
    tripQuery.$or.push(
      { client: userId1, driver: { $exists: true }, status: { $ne: 'pending' } },
      { client: userId2, driver: { $exists: true }, status: { $ne: 'pending' } }
    );

    const nonPendingTrip = await Trip.findOne(tripQuery)
      .populate({
        path: 'driver',
        populate: {
          path: 'user',
          select: 'name email'
        }
      })
      .populate('client', 'name email');

    if (nonPendingTrip) {
      // Verify the relationship involves both users
      const driverUserId = nonPendingTrip.driver?.user?._id?.toString();
      const clientUserId = nonPendingTrip.client._id.toString();
      
      if ((driverUserId === userId1 && clientUserId === userId2) || 
          (driverUserId === userId2 && clientUserId === userId1)) {
        return {
          canChat: true,
          reason: 'Users have a non-pending trip relationship',
          relationship: {
            type: 'trip',
            id: nonPendingTrip._id,
            status: nonPendingTrip.status,
            driver: nonPendingTrip.driver,
            client: nonPendingTrip.client
          }
        };
      }
    }

    return {
      canChat: false,
      reason: 'No valid work relationship found between users',
      relationship: null
    };

  } catch (error) {
    console.error('Error checking work relationship:', error);
    return {
      canChat: false,
      reason: 'Error checking work relationship',
      relationship: null
    };
  }
};

/**
 * Create or get chat with authorization check
 */
const createOrGetChatWithAuth = async (req, res) => {
  try {
    const { userId } = req.params; // Other user ID
    const currentUserId = req.user._id.toString();

    // Prevent self-chat
    if (userId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكنك إنشاء محادثة مع نفسك'
      });
    }

    // Check if other user exists
    const otherUser = await User.findById(userId).select('-password');
    if (!otherUser) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    // Check work relationship
    const relationshipCheck = await checkWorkRelationship(currentUserId, userId);
    
    if (!relationshipCheck.canChat) {
      return res.status(403).json({
        success: false,
        message: 'لا يمكنك إنشاء محادثة مع هذا المستخدم. يجب وجود علاقة عمل صالحة (طلب مقبول أو رحلة غير معلقة)',
        reason: relationshipCheck.reason
      });
    }

    // Check if chat already exists
    let chat = await Chat.findOne({
      participants: { $all: [currentUserId, userId] }
    }).populate('participants', 'name email image role')
      .populate({
        path: 'lastMessage',
        populate: {
          path: 'sender',
          select: 'name'
        }
      });

    if (chat) {
      return res.status(200).json({
        success: true,
        message: 'تم العثور على المحادثة بنجاح',
        data: {
          chat,
          relationship: relationshipCheck.relationship
        }
      });
    }

    // Create new chat
    chat = new Chat({
      participants: [currentUserId, userId]
    });

    await chat.save();

    // Populate the new chat
    chat = await Chat.findById(chat._id)
      .populate('participants', 'name email image role')
      .populate({
        path: 'lastMessage',
        populate: {
          path: 'sender',
          select: 'name'
        }
      });

    res.status(201).json({
      success: true,
      message: 'تم إنشاء المحادثة بنجاح',
      data: {
        chat,
        relationship: relationshipCheck.relationship
      }
    });

  } catch (error) {
    console.error('Error in createOrGetChatWithAuth:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
};

/**
 * Get user's chats with relationship info
 */
const getUserChatsWithAuth = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const chats = await Chat.find({
      participants: userId
    })
    .populate('participants', 'name email image role')
    .populate({
      path: 'lastMessage',
      populate: {
        path: 'sender',
        select: 'name'
      }
    })
    .sort({ updatedAt: -1 });

    // Verify each chat still has valid work relationship
    const validChats = [];
    
    for (const chat of chats) {
      const otherUser = chat.participants.find(p => p._id.toString() !== userId.toString());
      
      if (otherUser) {
        const relationshipCheck = await checkWorkRelationship(userId.toString(), otherUser._id.toString());
        
        if (relationshipCheck.canChat) {
          validChats.push({
            ...chat.toObject(),
            relationship: relationshipCheck.relationship
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'تم جلب المحادثات بنجاح',
      data: validChats
    });

  } catch (error) {
    console.error('Error in getUserChatsWithAuth:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
};

/**
 * Check if user can access specific chat
 */
const validateChatAccess = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id.toString();

    const chat = await Chat.findById(chatId).populate('participants', '_id');
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'المحادثة غير موجودة'
      });
    }

    // Check if user is participant
    const isParticipant = chat.participants.some(p => p._id.toString() === userId);
    
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول لهذه المحادثة'
      });
    }

    // Check work relationship with other participant
    const otherUser = chat.participants.find(p => p._id.toString() !== userId);
    
    if (otherUser) {
      const relationshipCheck = await checkWorkRelationship(userId, otherUser._id.toString());
      
      if (!relationshipCheck.canChat) {
        return res.status(403).json({
          success: false,
          message: 'لم تعد لديك علاقة عمل صالحة مع هذا المستخدم',
          reason: relationshipCheck.reason
        });
      }
      
      // Add relationship info to request
      req.relationship = relationshipCheck.relationship;
    }

    req.chat = chat;
    next();

  } catch (error) {
    console.error('Error in validateChatAccess:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
};

module.exports = {
  checkWorkRelationship,
  createOrGetChatWithAuth,
  getUserChatsWithAuth,
  validateChatAccess
};