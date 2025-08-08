const Chat = require("../models/Chat");
const Message = require("../models/Message");

exports.getChats = async (req, res) => {
  try {
    const userId = req.user._id;
    const chats = await Chat.find({ members: { $in: [userId] } })
      .sort({ updatedAt: -1 })
      .populate("members")
      .populate("lastMessage.senderId");

    const enrichedChats = await Promise.all(
      chats.map(async (chat) => {
        const unreadCount = await Message.countDocuments({
          chatId: chat._id,
          receiverId: userId,
          read: false,
        });

        return {
          ...chat.toObject(),
          unreadCount,
        };
      })
    );

    res.json({
      success: true,
      data: enrichedChats,
    });
  } catch (err) {
    console.error("Error fetching chats:", err);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء جلب المحادثات",
    });
  }
};

exports.createOrGetChat = async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;

    if (!senderId || !receiverId) {
      return res.status(400).json({
        success: false,
        message: "معرف المرسل أو المستقبل مفقود",
      });
    }

    let chat = await Chat.findOne({
      members: { $all: [senderId, receiverId] },
    }).populate("members");

    if (!chat) {
      chat = await Chat.create({ members: [senderId, receiverId] });
      chat = await Chat.findById(chat._id).populate("members");
    }

    res.json({
      success: true,
      data: chat,
      message: "تم إنشاء/جلب المحادثة بنجاح",
    });
  } catch (err) {
    console.error("Error creating/getting chat:", err);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء إنشاء/جلب المحادثة",
    });
  }
};

exports.sendMessage = async (req, res) => {
  console.log("sendMessage called with body:", req.body);
  try {
    const { chatId, receiverId, text } = req.body;
    const senderId = req.user._id;

    if (!senderId || !receiverId || !text) {
      return res.status(400).json({
        success: false,
        message: "البيانات ناقصة لإرسال الرسالة",
      });
    }

    let chat = chatId
      ? await Chat.findById(chatId)
      : await Chat.findOne({ members: { $all: [senderId, receiverId] } });

    if (!chat) {
      chat = await Chat.create({ members: [senderId, receiverId] });
    }

    const message = await Message.create({
      chatId: chat._id,
      senderId,
      receiverId,
      text,
      read: false,
    });

    await Chat.findByIdAndUpdate(chat._id, {
      lastMessage: {
        text,
        senderId,
        createdAt: message.createdAt,
        read: false,
      },
    });

    res.json({
      success: true,
      data: message,
    });
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء إرسال الرسالة",
    });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;

    const messages = await Message.find({ chatId })
      .sort({ createdAt: 1 })
      .populate("receiverId");

    res.json({
      success: true,
      data: messages,
    });
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء جلب الرسائل",
    });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "الرسالة غير موجودة",
      });
    }

    if (message.senderId !== userId) {
      return res.status(403).json({
        success: false,
        message: "غير مسموح بحذف هذه الرسالة",
      });
    }

    await Message.findByIdAndDelete(messageId);

    res.json({
      success: true,
      message: "تم حذف الرسالة بنجاح",
    });
  } catch (err) {
    console.error("Error deleting message:", err);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء حذف الرسالة",
    });
  }
};
