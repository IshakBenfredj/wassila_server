const express = require("express");
const router = express.Router();
const {
  createOrder,
  getOrders,
  deleteOrder,
  getOrdersForArtisan,
  getOrderById,
  rejectOrder,
  cancelOrder,
  acceptOffer,
} = require("../controllers/orderController");
const { protect } = require("../middlewares/authMiddleware");

router.post("/", protect, createOrder);
router.get("/", protect, getOrders);
router.get("/artisan", protect, getOrdersForArtisan);
router.get("/:id", protect, getOrderById);
router.delete("/:id", protect, deleteOrder);
router.put("/:id/reject", protect, rejectOrder);
router.put("/:id/cancel", protect, cancelOrder);
router.put("/:id/accept", protect, acceptOffer);

module.exports = router;
