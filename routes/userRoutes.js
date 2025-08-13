const express = require('express');
const userController = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.put('/me', protect, userController.updateProfile);
router.put('/change-password', protect, userController.changePassword);
router.delete('/me', protect, userController.deleteAccount);
router.put('/me/image', protect, userController.updateProfilePhoto);
router.get("/profile", protect, userController.getClientProfileData);
router.get("/profile/:userId", protect, userController.getClientProfileData);
router.get("/driver-profile", protect, userController.getDriverProfileData);
router.get("/driver-profile/:userId", protect, userController.getDriverProfileData);
router.get("/artisan-profile/", protect, userController.getArtisanProfileData);
router.get("/artisan-profile/:userId", protect, userController.getArtisanProfileData);
module.exports = router;