const { Server } = require("socket.io");

let availableDrivers = [];
let trips = [];
let connectedClients = [];
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
    socket.on("sendMessage", async (data, callback) => {
      try {
        const { chatId, senderId, receiverId, text } = data;

        // 1️⃣ Create or get chat
        let chat = chatId
          ? await Chat.findById(chatId)
          : await Chat.findOne({ members: { $all: [senderId, receiverId] } });

        if (!chat) {
          chat = await Chat.create({ members: [senderId, receiverId] });
        }

        // 2️⃣ Create message
        const message = await Message.create({
          chatId: chat._id,
          senderId,
          receiverId,
          text,
          read: false,
        });

        // 3️⃣ Update last message in chat
        await Chat.findByIdAndUpdate(chat._id, {
          lastMessage: {
            text,
            senderId,
            createdAt: message.createdAt,
            read: false,
          },
        });

        // 4️⃣ Emit to sender and receiver
        const receiver = connectedClients.find((c) => c._id === receiverId);
        const sender = connectedClients.find((c) => c._id === senderId);

        if (receiver) {
          io.to(receiver.socketId).emit("newMessage", message);
        }
        if (sender) {
          io.to(sender.socketId).emit("newMessage", message);
        }

        console.log(
          `💬 Message sent from ${senderId} to ${receiverId}: ${text}`
        );

        if (typeof callback === "function") {
          callback({
            success: true,
            data: message,
            message: "تم إرسال الرسالة",
          });
        }
      } catch (err) {
        console.error(err);
        if (typeof callback === "function") {
          callback({ success: false, message: "خطأ أثناء إرسال الرسالة" });
        }
      }
    });

    /* =============== ✅ DELETE MESSAGE =============== */
    socket.on("deleteMessage", async ({ messageId, userId }, callback) => {
      try {
        const msg = await Message.findById(messageId);
        if (!msg)
          return callback({ success: false, message: "الرسالة غير موجودة" });

        if (msg.senderId.toString() !== userId) {
          return callback({
            success: false,
            message: "غير مسموح بحذف الرسالة",
          });
        }

        await Message.findByIdAndDelete(messageId);

        io.emit("messageDeleted", { messageId, chatId: msg.chatId });

        callback({ success: true, message: "تم حذف الرسالة" });
        console.log(`🗑️ Message deleted by ${userId}`);
      } catch (err) {
        callback({ success: false, message: "خطأ أثناء حذف الرسالة" });
      }
    });

    /* =============== ✅ MARK MESSAGES READ =============== */
    socket.on("markRead", async ({ chatId, userId }) => {
      await Message.updateMany(
        { chatId, receiverId: userId, read: false },
        { $set: { read: true } }
      );
      await Chat.findByIdAndUpdate(chatId, { "lastMessage.read": true });

      io.emit("messagesRead", { chatId, userId });
      console.log(`👁️ Messages marked as read in chat ${chatId}`);
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
