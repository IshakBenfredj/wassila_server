const express = require('express');
const { check } = require('express-validator');
const authController = require('../controllers/authController');
const router = express.Router();

router.post("/send-code", authController.sendVerificationCode);
router.post("/verify-code", authController.verifyCode);

// Register
router.post(
    '/register',
    [
        check('name', 'الاسم مطلوب').notEmpty(),
        check('password', 'يجب أن تكون كلمة المرور 6 أحرف أو أكثر').isLength({ min: 6 })
    ],
    authController.register
);

// Login
router.post(
    '/login',
    [
        check('email', 'يرجى إدخال بريد إلكتروني صحيح').isEmail(),
        check('password', 'كلمة المرور مطلوبة').exists()
    ],
    authController.login
);

// Get profile
router.get('/me', authController.getMe);

module.exports = router;