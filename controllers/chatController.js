const Chat = require("../models/Chat");
const Message = require("../models/Message");
const { emitSocketEvent } = require("../socket");

exports.createChat = async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.user._id;

    // Check if chat already exists
    const existingChat = await Chat.findOne({
      members: { $all: [currentUserId, userId] },
    })
      .populate("members", "name image")
      .populate({
        path: "lastMessage",
        populate: {
          path: "senderId",
          select: "name image",
        },
      });

    if (existingChat) {
      return res.status(200).json({
        success: true,
        chat: existingChat,
      });
    }

    const newChat = new Chat({
      members: [currentUserId, userId],
    });

    const savedChat = await newChat.save();

    res.status(201).json({
      success: true,
      chat: savedChat,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getUserChats = async (req, res) => {
  try {
    const userId = req.user._id;
    const chats = await Chat.find({
      members: { $in: [userId] },
    })
      .populate("members", "name image")
      .populate({
        path: "lastMessage",
        populate: {
          path: "senderId",
          select: "name image",
        },
      })
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      chats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const messages = await Message.find({ chatId })
      .populate("senderId", "name image")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      messages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { chatId, text } = req.body;
    const senderId = req.user._id;

    const chat = await Chat.findById(chatId)
      .populate("members", "name image")
      .populate({
        path: "lastMessage",
        populate: {
          path: "senderId",
          select: "name image",
        },
      });
    if (!chat || !chat.members.some((member) => member._id.equals(senderId))) {
      return res.status(404).json({
        success: false,
        message: "Chat not found or unauthorized access",
      });
    }

    const receiver = chat.members.find(
      (member) => !member._id.equals(senderId)
    );

    const newMessage = new Message({
      chatId,
      senderId,
      text,
      receiverId: receiver._id,
    });

    const savedMessage = await newMessage.save();

    chat.lastMessage = {
      read: false,
      senderId,
      text,
      createdAt: new Date(),
    };
    await chat.save();
    await chat.populate("lastMessage.senderId", "name image");

    const populatedMessage = await Message.populate(savedMessage, {
      path: "senderId",
      select: "name image",
    });

    emitSocketEvent(receiver._id.toString(), "newMessage", {
      message :populatedMessage,
      chat
    });

    emitSocketEvent(senderId.toString(), "messageSent", {
      ...populatedMessage,
      chatId: chat._id.toString(),
    });

    // const populatedMessage = await Message.populate(savedMessage, {
    //   path: "senderId",
    //   select: "name image",
    // });

    // emitSocketEvent(receiver._id.toString(), "newMessage", {
    //   ...populatedMessage,
    //   chatId: chat._id.toString(),
    //   unreadCount: 1,
    // });

    // emitSocketEvent(senderId.toString(), "messageSent", {
    //   ...responseData,
    //   chatId: chat._id.toString(),
    // });

    res.status(201).json({
      success: true,
      message: populatedMessage,
      chat,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.markMessagesAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    await Message.updateMany(
      { chatId, senderId: { $ne: userId }, read: false },
      { $set: { read: true } }
    );

    res.status(200).json({
      success: true,
      // message: "Messages marked as read",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
