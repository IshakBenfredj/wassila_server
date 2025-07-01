require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { StatusCodes } = require("http-status-codes");
const http = require("http");
const { setupSocket } = require("./socket");

// Import routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const driverRoutes = require("./routes/driverRoutes");
const artisanRoutes = require("./routes/artisanRoutes");
const tripRoutes = require("./routes/tripRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const addressRoutes = require("./routes/addressRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const job = require("./lib/cron");

const app = express();
// job.start();

// ======================================
// 🛡️ 1. Security & Middleware
// ======================================
app.use(helmet());
app.use(cors());
// app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting (100 requests per 15 mins per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests, please try again later.",
});
app.use(limiter);

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// ======================================
// 📦 2. Database Connection (MongoDB)
// ======================================
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/wassila";

mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    retryWrites: true,
    w: "majority",
  })
  .then(() => console.log("✅ MongoDB connected successfully!"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// ======================================
// # 🚀 4. Routes
// ======================================
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/artisans", artisanRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/addresses", addressRoutes);
app.use('/api/notifications', notificationRoutes)

// ======================================
// # 🩺 5. Health Check Endpoint
// ======================================
app.get("/health", (req, res) => {
  res.status(StatusCodes.OK).json({
    status: "UP",
    timestamp: new Date().toISOString(),
    db: mongoose.connection.readyState === 1 ? "CONNECTED" : "DISCONNECTED",
  });
});

// ======================================
// # ❌ 6. Error Handling Middleware
// ======================================
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    error: {
      message: err.message || "Something went wrong!",
      code: err.code || "INTERNAL_ERROR",
    },
  });
});

// ======================================
// # 🔥 7. Start Server
// ======================================
const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

setupSocket(server);

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err.message);
  server.close(() => process.exit(1));
});

module.exports = server;
