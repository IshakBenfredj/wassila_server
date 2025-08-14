const { Server } = require("socket.io");
const Chat = require("./models/Chat");
const Message = require("./models/Message");

let availableDrivers = [];
let trips = [];
let connectedClients = [];
let connectedUsers = [];
let notifications = [];

let io = null;

function emitSocketEvent(userId, event, data) {
  if (!io) {
    console.error("Socket.IO not initialized - cannot emit", event);
    return;
  }

  const user = connectedUsers.find((u) => u._id === userId);
  if (user?.socketId) {
    io.to(user.socketId).emit(event, data);
  } else {
    console.error(`User ${userId} not connected - could not emit ${event}`);
  }
}

function setupSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`🚗 Socket connected: ${socket.id}`);

    socket.on("userConnected", (data) => {
      const { _id, name, image, role } = data;

      // أزل المستخدم لو موجود مسبقًا
      connectedUsers = connectedUsers.filter((u) => u._id !== _id);

      connectedUsers.push({
        _id,
        name,
        image,
        role,
        socketId: socket.id,
        connectedAt: new Date().toISOString(),
      });

      console.log(`✅ ${role} connected: ${name} (${_id})`);
    });

    // Driver
    socket.on("driverAvailable", (data) => {
      const { driverId, name, isAvailable, coords, work, image } = data;

      availableDrivers = availableDrivers.filter((d) => d._id !== driverId);

      if (isAvailable && coords?.lat && coords?.lon) {
        availableDrivers.push({
          _id: driverId,
          name,
          location: coords,
          updatedAt: new Date().toISOString(),
          socketId: socket.id,
          isAvailable,
          work,
          image,
        });
        console.log(`✅ Driver available: ${name} (${driverId}) at`, coords);
      } else {
        console.log(`⛔️ Driver marked unavailable: ${name} (${driverId})`);
      }
    });

    socket.on("getAvailableDrivers", (callback) => {
      callback(availableDrivers);
    });

    socket.on("getDriverById", (driverId, callback) => {
      const driver = availableDrivers.find((d) => d._id === driverId);
      if (typeof callback === "function") {
        callback(driver);
      }
    });

    socket.on("updateLocation", (data) => {
      const { driverId, coords } = data;

      const driverIndex = availableDrivers.findIndex((d) => d._id === driverId);
      if (driverIndex !== -1) {
        availableDrivers[driverIndex].location = coords;
        availableDrivers[driverIndex].updatedAt = new Date().toISOString();

        io.emit("driverLocationUpdated", {
          driverId,
          location: coords,
          updatedAt: availableDrivers[driverIndex].updatedAt,
        });
      }
    });

    // Client
    socket.on("clientConnected", (data) => {
      const { clientId, name, image } = data;

      connectedClients = connectedClients.filter((c) => c._id !== clientId);

      connectedClients.push({
        _id: clientId,
        name,
        image,
        socketId: socket.id,
        connectedAt: new Date().toISOString(),
      });

      console.log(`✅ Client connected: ${name} (${clientId})`);
    });

    // Trip
    socket.on("newTrip", (tripData) => {
      trips = trips.filter((t) => t._id !== tripData._id);

      const newTrip = {
        ...tripData,
        socketId: socket.id,
      };

      trips.push(newTrip);
      io.emit("newTrip", newTrip);
      console.log("🆕 New trip created:", newTrip);
    });

    socket.on("getTrips", (callback) => {
      if (typeof callback === "function") {
        callback(trips);
      }
    });

    socket.on("getTripByClientId", (clientId, callback) => {
      const filteredTrips = trips.filter(
        (t) =>
          t.client._id === clientId &&
          !["completed", "cancelled"].includes(t.status)
      );
      console.log("filteredTrips ........", filteredTrips);
      callback(filteredTrips[0]);
    });

    socket.on("updateTrip", (data) => {
      const tripIndex = trips.findIndex((t) => t._id === data._id);
      if (tripIndex !== -1) {
        trips[tripIndex] = { ...trips[tripIndex], ...data };
        console.log("trips[tripIndex]", trips[tripIndex]);
        io.emit("updateTrip", trips[tripIndex]);
      }
    });

    // Calls
    socket.on("callClient", ({ clientId, offer }) => {
      const client = connectedClients.find((c) => c._id === clientId);
      if (client?.socketId) {
        io.to(client.socketId).emit("incomingCall", {
          offer,
          from: socket.id,
        });
      }
    });

    socket.on("callAccepted", ({ answer, toSocketId }) => {
      io.to(toSocketId).emit("callAccepted", { answer });
    });

    socket.on("ice-candidate", (candidate) => {
      socket.broadcast.emit("ice-candidate", candidate);
    });

    // Notification
    socket.on("sendNotification", (notification) => {
      const newNotif = {
        _id: notification._id,
        user: notification.user,
        fromUser: notification.fromUser,
        title: notification.title,
        body: notification.body,
        type: notification.type,
        redirectId: notification.redirectId,
        isRead: false,
        createdAt: notification.createdAt || new Date().toISOString(),
      };

      notifications.push(newNotif);
      io.emit("newNotification", newNotif);

      console.log("📢 Notification emitted (not saved):", newNotif);
    });

    socket.on("markNotificationRead", (notifId) => {
      const notifIndex = notifications.findIndex((n) => n._id === notifId);
      if (notifIndex !== -1) {
        notifications[notifIndex].isRead = true;
        io.emit("notificationUpdated", notifications[notifIndex]);
        console.log(`✅ Notification ${notifId} marked as read`);
      }
    });

    socket.on("markUserNotificationsRead", (userId) => {
      const updated = notifications.filter(
        (n) => n.user === userId && !n.isRead
      );

      if (updated.length > 0) {
        updated.forEach((n) => (n.isRead = true));
        io.emit("userNotificationsUpdated", { userId, notifications: updated });
        console.log(
          `✅ ${updated.length} notifications marked as read for user ${userId}`
        );
      } else {
        console.log(`ℹ️ No unread notifications for user ${userId}`);
      }
    });

    // &&&&&&&&&&&&&&&&&&&&&&&

    // Add these chat-related socket events to your existing setupSocket function

    // Chat Management
    // socket.on("createChat", async (data, callback) => {
    //   try {
    //     const { participants } = data;

    //     // Check if chat already exists between these users
    //     let existingChat = await Chat.findOne({
    //       participants: { $all: participants },
    //     }).populate("participants");

    //     if (existingChat) {
    //       callback({ success: true, chat: existingChat });
    //       return;
    //     }

    //     // Create new chat
    //     const newChat = new Chat({
    //       participants,
    //       createdAt: new Date(),
    //     });

    //     await newChat.save();
    //     await newChat.populate("participants");

    //     callback({ success: true, chat: newChat });
    //     console.log(
    //       `💬 New chat created between users: ${participants.join(", ")}`
    //     );
    //   } catch (error) {
    //     console.error("Error creating chat:", error);
    //     callback({ success: false, error: error.message });
    //   }
    // });

    socket.on("createChat", async (data, callback) => {
      try {
        const { participants } = data;

        // Check if chat already exists
        let existingChat = await Chat.findOne({
          participants: { $all: participants },
        }).populate("participants");

        if (existingChat) {
          callback({ success: true, chat: existingChat });
          return;
        }

        // Create new chat
        const newChat = new Chat({
          participants,
          createdAt: new Date(),
        });

        await newChat.save();
        await newChat.populate("participants");

        callback({ success: true, chat: newChat });

        // ✅ Emit to all participants (except the creator)
        participants.forEach((participantId) => {
          const participantSockets = connectedUsers.filter(
            (u) => u._id === participantId
          );
          participantSockets.forEach((user) => {
            io.to(user.socketId).emit("chatCreated", newChat);
          });
        });

        console.log(
          `💬 New chat created between users: ${participants.join(", ")}`
        );
      } catch (error) {
        console.error("Error creating chat:", error);
        callback({ success: false, error: error.message });
      }
    });

    socket.on("getUserChats", async (userId, callback) => {
      try {
        const chats = await Chat.find({
          participants: userId,
        })
          .populate("participants")
          .populate({
            path: "lastMessage",
            populate: {
              path: "sender",
              select: "name image",
            },
          })
          .sort({ updatedAt: -1 }); // Order by last message time

        // Add unread count for each chat
        const chatsWithUnread = await Promise.all(
          chats.map(async (chat) => {
            const unreadCount = await Message.countDocuments({
              chat: chat._id,
              sender: { $ne: userId },
              read: false,
            });

            return {
              ...chat.toObject(),
              unreadCount,
            };
          })
        );

        callback(chatsWithUnread);
      } catch (error) {
        console.error("Error fetching user chats:", error);
        callback([]);
      }
    });

    socket.on("getChatMessages", async (data, callback) => {
      try {
        const { chatId, page = 1, limit = 50 } = data;

        const messages = await Message.find({ chat: chatId })
          .populate("sender", "name image")
          .sort({ createdAt: 1 });

        callback(messages.reverse()); // Reverse to show oldest first
      } catch (error) {
        console.error("Error fetching messages:", error);
        callback([]);
      }
    });

    // socket.on("sendMessage", async (data) => {
    //   try {
    //     const { chatId, senderId, text, type = "text" } = data;

    //     // Create new message
    //     const newMessage = new Message({
    //       chat: chatId,
    //       sender: senderId,
    //       text,
    //       type,
    //       createdAt: new Date(),
    //       read: false,
    //     });

    //     await newMessage.save();
    //     await newMessage.populate("sender", "name image");

    //     // Update chat's last message and updatedAt
    //     await Chat.findByIdAndUpdate(chatId, {
    //       lastMessage: newMessage._id,
    //       updatedAt: new Date(),
    //     });

    //     // Get chat participants to emit to specific users
    //     const chat = await Chat.findById(chatId).populate(
    //       "participants",
    //       "_id"
    //     );
    //     const participantIds = chat.participants.map((p) => p._id.toString());

    //     // Emit to all participants
    //     participantIds.forEach((participantId) => {
    //       const participantSockets = connectedUsers.filter(
    //         (u) => u._id === participantId
    //       );
    //       participantSockets.forEach((user) => {
    //         io.to(user.socketId).emit("newMessage", newMessage);
    //       });
    //     });

    //     console.log(`💬 Message sent in chat ${chatId}: ${text}`);
    //   } catch (error) {
    //     console.error("Error sending message:", error);
    //   }
    // });

   socket.on("sendMessage", async (data) => {
  try {
    const { chatId, senderId, text, type = "text", participants } = data;

    let chat;
    if (!chatId && participants?.length) {
      // Create new chat
      chat = new Chat({
        participants,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      await chat.save();
      await chat.populate("participants");

      // Emit new chat to all participants
      participants.forEach((participantId) => {
        const participantSockets = connectedUsers.filter(
          (u) => u._id === participantId
        );
        participantSockets.forEach((user) => {
          io.to(user.socketId).emit("chatCreated", chat);
        });
      });
    } else {
      chat = await Chat.findById(chatId).populate("participants");
      if (!chat) {
        throw new Error("Chat not found");
      }
    }

    // Create the message - ensure read is false for new messages
    const newMessage = new Message({
      chat: chat._id,
      sender: senderId,
      text,
      type,
      createdAt: new Date(),
      read: false 
    });

    await newMessage.save();
    await newMessage.populate("sender", "name image");

    // Update last message
    chat.lastMessage = newMessage._id;
    chat.updatedAt = new Date();
    await chat.save();

    // Emit new message to all participants
    const messageToEmit = {
      ...newMessage.toObject(),
      // Ensure read status is false when emitting
      read: false
    };

    chat.participants.forEach((p) => {
      const sockets = connectedUsers.filter(
        (u) => u._id === p._id.toString()
      );
      sockets.forEach((u) => {
        io.to(u.socketId).emit("newMessage", messageToEmit);
      });
    });

  } catch (error) {
    console.error("Error sending message:", error);
  }
});

    socket.on("markMessagesRead", async (data) => {
      try {
        const { chatId, userId } = data;

        const result = await Message.updateMany(
          {
            chat: chatId,
            sender: { $ne: userId },
            read: false,
          },
          { read: true }
        );

        const chat = await Chat.findById(chatId).populate(
          "participants",
          "_id"
        );
        if (chat) {
          const participantIds = chat.participants.map((p) => p._id.toString());

          participantIds.forEach((participantId) => {
            const participantSockets = connectedUsers.filter(
              (u) => u._id === participantId
            );
            participantSockets.forEach((user) => {
              io.to(user.socketId).emit("messagesMarkedRead", {
                chatId,
                userId,
              });
            });
          });
        }

        console.log(
          `✅ ${result.modifiedCount} messages marked as read in chat ${chatId} by user ${userId}`
        );
      } catch (error) {
        console.error("Error marking messages as read:", error);
      }
    });

    socket.on("deleteChat", async (data) => {
      try {
        const { chatId, userId } = data;

        // Delete all messages in the chat
        await Message.deleteMany({ chat: chatId });

        // Delete the chat
        await Chat.findByIdAndDelete(chatId);

        // Get chat participants to emit deletion
        const chat = await Chat.findById(chatId).populate(
          "participants",
          "_id"
        );
        if (chat) {
          const participantIds = chat.participants.map((p) => p._id.toString());

          participantIds.forEach((participantId) => {
            const participantSockets = connectedUsers.filter(
              (u) => u._id === participantId
            );
            participantSockets.forEach((user) => {
              io.to(user.socketId).emit("chatDeleted", { chatId });
            });
          });
        }

        console.log(`🗑️ Chat ${chatId} deleted by user ${userId}`);
      } catch (error) {
        console.error("Error deleting chat:", error);
      }
    });

    socket.on("typing", (data) => {
      const { chatId, userId, isTyping } = data;

      // Emit typing status to other participants
      const chat = connectedUsers.filter((u) => u._id !== userId);
      chat.forEach((user) => {
        io.to(user.socketId).emit("userTyping", {
          chatId,
          userId,
          isTyping,
        });
      });
    });

    // In your socket.io backend
    socket.on("checkExistingChat", async (data, callback) => {
      try {
        const { participants } = data;

        const existingChat = await Chat.findOne({
          participants: { $all: participants, $size: participants.length },
        }).populate("participants");

        callback({
          exists: !!existingChat,
          chat: existingChat || null,
        });
      } catch (error) {
        console.error("Error checking existing chat:", error);
        callback({ exists: false });
      }
    });

    // Disconnect
    socket.on("disconnect", () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
      availableDrivers = availableDrivers.filter(
        (d) => d.socketId !== socket.id
      );

      connectedClients = connectedClients.filter(
        (c) => c.socketId !== socket.id
      );
    });

    return io;
  });
}

module.exports = {
  setupSocket,
  emitSocketEvent,
  getIo: () => io,
};
