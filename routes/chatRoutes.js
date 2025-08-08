const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const { protect } = require("../middlewares/authMiddleware");

router.use(protect);

router.post("/", chatController.createChat);
router.get("/", chatController.getUserChats);
router.get("/:chatId/messages", chatController.getChatMessages);
router.post("/send", chatController.sendMessage);
router.put("/:chatId/read", chatController.markMessagesAsRead);

module.exports = router;
