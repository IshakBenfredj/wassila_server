const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const { protect } = require("../middlewares/authMiddleware");

router.post("/", protect, chatController.createOrGetChat);
router.get("/", protect, chatController.getChats);
router.get("/:chatId/messages", protect, chatController.getMessages);
router.post("/message", protect, chatController.sendMessage);
router.delete("/message/:messageId", protect, chatController.deleteMessage);

module.exports = router;