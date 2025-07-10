const express = require("express");
const router = express.Router();
const { createOrder, getOrders, deleteOrder } = require("../controllers/orderController");
const { protect } = require("../middlewares/authMiddleware");

router.post("/", protect, createOrder);
router.get("/", protect, getOrders);
router.delete("/:id", protect, deleteOrder);

module.exports = router;
