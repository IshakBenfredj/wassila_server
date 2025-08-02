const Chat = require("../models/Chat");
const Message = require("../models/Message");

exports.getChats = async (req, res) => {
  try {
    
    const userId = req.user._id; 

    const chats = await Chat.find({ members: userId })
      .sort({ updatedAt: -1 })
      .populate("members") 
      .lean();

    res.json({
      success: true,
      data: chats,
    });
  } catch (err) {
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
    });

    if (!chat) {
      chat = await Chat.create({ members: [senderId, receiverId] });
    }

    res.json({
      success: true,
      data: chat,
      message: "تم إنشاء المحادثة بنجاح",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء إنشاء المحادثة",
    });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { chatId, senderId, receiverId, text } = req.body;

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
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: messages,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء جلب الرسائل",
    });
  }
};


exports.deleteMessage = async (req, res) => {
  try {
    const { messageId, userId } = req.body;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "الرسالة غير موجودة",
      });
    }

    if (message.senderId.toString() !== userId) {
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
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء حذف الرسالة",
    });
  }
};
