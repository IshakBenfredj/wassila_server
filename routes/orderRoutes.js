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
  completeOrder,
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
router.put("/:id/complete", protect, completeOrder);


module.exports = router;
