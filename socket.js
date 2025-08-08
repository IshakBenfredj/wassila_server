const { Server } = require("socket.io");
const Chat = require("./models/Chat");
const Message = require("./models/Message");

let availableDrivers = [];
let trips = [];
let connectedClients = [];
let connectedUsers = [];
let notifications = [];

function setupSocket(server) {
  const io = new Server(server, {
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

    /* =============== ✅ SEND MESSAGE =============== */
    socket.on("sendMessage", async (messageData) => {
      const { receiverId, senderId } = messageData;
      console.log('messageData', messageData);
      const receiver = connectedUsers.find((c) => c._id === receiverId);
      const sender = connectedUsers.find((c) => c._id === senderId);

      if (receiver) {
        io.to(receiver.socketId).emit("newMessage", messageData);
        io.to(receiver.socketId).emit("refreshChats");
        console.log(`💬 Message sent to receiver: ${receiverId}`);
      }

      if (sender && sender.socketId !== receiver?.socketId) {
        io.to(sender.socketId).emit("newMessage", messageData);
        io.to(sender.socketId).emit("refreshChats");
        console.log(`💬 Message echoed to sender: ${senderId}`);
      }
    });

    /* =============== ✅ DELETE MESSAGE =============== */
    socket.on("deleteMessage", async ({ messageId, userId }, callback) => {
      try {
        const msg = await Message.findById(messageId);
        if (!msg) {
          return callback({ success: false, message: "الرسالة غير موجودة" });
        }

        if (msg.senderId !== userId) {
          return callback({
            success: false,
            message: "غير مسموح بحذف الرسالة",
          });
        }

        await Message.findByIdAndDelete(messageId);

        // Notify only relevant users (sender + receiver)
        const chat = await Chat.findById(msg.chatId);
        const chatParticipants = [chat.members[0], chat.user2.members[1]];

        connectedUsers.forEach((client) => {
          if (chatParticipants.includes(client._id)) {
            io.to(client.socketId).emit("messageDeleted", {
              messageId,
              chatId: msg.chatId,
            });
            io.to(client.socketId).emit("refreshChats");
          }
        });

        callback({ success: true, message: "تم حذف الرسالة" });
        console.log(`🗑️ Message ${messageId} deleted by user ${userId}`);
      } catch (err) {
        callback({ success: false, message: "خطأ أثناء حذف الرسالة" });
      }
    });

    /* =============== ✅ MARK MESSAGES READ =============== */
    socket.on("markRead", async ({ chatId, userId }) => {
      try {
        // Update all unread messages in this chat for this user
        await Message.updateMany(
          {
            chatId,
            receiverId: userId,
            read: false,
          },
          { $set: { read: true } }
        );

        // Update the last message read status in the chat
        const chat = await Chat.findById(chatId);
        if (
          chat?.lastMessage &&
          chat.lastMessage.senderId.toString() !== userId
        ) {
          await Chat.findByIdAndUpdate(chatId, {
            "lastMessage.read": true,
          });
        }

        // Notify both participants
        const participants = chat.members.map((m) => m.toString());

        // Find connected clients who are participants
        const clientsToNotify = connectedUsers.filter((client) =>
          participants.includes(client._id)
        );

        // Emit events to all relevant clients
        clientsToNotify.forEach((client) => {
          io.to(client.socketId).emit("messagesRead", { chatId });
          io.to(client.socketId).emit("refreshChats");
        });
      } catch (error) {
        console.error("Error marking messages as read:", error);
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
  });
}

module.exports = {
  setupSocket,
};
