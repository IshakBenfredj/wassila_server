const { Server } = require("socket.io");

let availableDrivers = [];
let trips = [];

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

    socket.on("updateLocation", (data) => {
      const { driverId, coords } = data;

      const driverIndex = availableDrivers.findIndex((d) => d._id === driverId);
      if (driverIndex !== -1) {
        availableDrivers[driverIndex].location = coords;
        availableDrivers[driverIndex].updatedAt = new Date().toISOString();
      }
    });

    // Trip
    socket.on("newTrip", (tripData) => {
      trips = trips.filter((t) => t._id !== tripData._id);

      const newTrip = {
      ...tripData,
      socketId: socket.id,
      };

      trips.push(newTrip);
      console.log("🆕 New trip created:", newTrip);
    });

    socket.on("getTrips", (callback) => {
      callback(trips);
    });

    socket.on("updateTrip", (data) => {
      const tripIndex = trips.findIndex((t) => t._id === data._id);
      if (tripIndex !== -1) {
      trips[tripIndex] = { ...trips[tripIndex], ...data };
      // console.log(`🔄 Trip updated:`, trips[tripIndex]);
      }
    });

    socket.on("disconnect", () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
      // availableDrivers = availableDrivers.filter(
      //   (d) => d.socketId !== socket.id
      // );
    });
  });
}

module.exports = {
  setupSocket,
};
