const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const { protect } = require("../middlewares/authMiddleware");

router.post("/", chatController.createOrGetChat);
router.get("/",protect, chatController.getChats);
router.get("/:chatId/messages", protect, chatController.getMessages);

router.post("/message", chatController.sendMessage);

router.delete("/message", chatController.deleteMessage);

module.exports = router;
