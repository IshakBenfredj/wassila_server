const { Server } = require("socket.io");

let availableDrivers = [];

function setupSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`🚗 Socket connected: ${socket.id}`);

    socket.on("driverAvailable", (data) => {
      const { driverId, name, isAvailable, coords } = data;

      // Remove previous instance
      availableDrivers = availableDrivers.filter(d => d.driverId !== driverId);

      if (isAvailable && coords?.lat && coords?.lon) {
        availableDrivers.push({
          driverId,
          name,
          location: coords,
          updatedAt: new Date().toISOString(),
          socketId: socket.id,
        });
        console.log(`✅ Driver available: ${name} (${driverId}) at`, coords);
      } else {
        console.log(`⛔️ Driver marked unavailable: ${name} (${driverId})`);
      }
    });

    socket.on("updateLocation", (data) => {
      const { driverId, coords } = data;

      const driverIndex = availableDrivers.findIndex(
        (d) => d.driverId === driverId
      );
      if (driverIndex !== -1) {
        availableDrivers[driverIndex].location = coords;
        availableDrivers[driverIndex].updatedAt = new Date().toISOString();
      }
    });

    socket.on("disconnect", () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
      availableDrivers = availableDrivers.filter(d => d.socketId !== socket.id);
    });
  });
}

module.exports = {
  setupSocket,
  getAvailableDrivers: () => availableDrivers,
};
