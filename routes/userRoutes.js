const express = require('express');
const userController = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.put('/me', protect, userController.updateProfile);
router.put('/change-password', protect, userController.changePassword);
router.delete('/me', protect, userController.deleteAccount);
router.get("/profile", protect, userController.getUserProfileData);
router.get("/profile/:userId", protect, userController.getUserProfileData);

module.exports = router;