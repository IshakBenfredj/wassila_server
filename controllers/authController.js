const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Driver = require("../models/Driver");
const Artisan = require("../models/Artisan");
const VerificationCode = require("../models/VerificationCode");
const { validationResult } = require("express-validator");
const { sendVerificationEmail } = require("../lib/nodemailer");

const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d",
  });
};

// @desc    إرسال رمز التحقق إلى البريد
// @route   POST /api/auth/send-code
// @access  Public
exports.sendVerificationCode = async (req, res) => {
  const { email } = req.body;

  try {
    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res
        .status(400)
        .json({ success: false, message: "البريد الإلكتروني مسجل مسبقاً" });
    }

    const code = Math.floor(10000 + Math.random() * 90000).toString();

    await VerificationCode.deleteMany({ email: email.toLowerCase() });

    await VerificationCode.create({ email: email.toLowerCase(), code });

    sendVerificationEmail(email, code);

    res.status(200).json({
      success: true,
      message: "تم إرسال رمز التحقق إلى بريدك الإلكتروني",
    });
  } catch (err) {
    console.error("Error sending verification code:", err);
    res.status(500).json({
      success: false,
      message: "فشل في إرسال رمز التحقق",
      error: err.message,
    });
  }
};

// @desc    التحقق من رمز التحقق
// @route   POST /api/auth/verify-code
// @access  Public
exports.verifyCode = async (req, res) => {
  const { email, code } = req.body;

  try {
    const existingCode = await VerificationCode.findOne({
      email: email.toLowerCase(),
      code,
    });

    if (!existingCode) {
      return res.status(400).json({
        success: false,
        message: "رمز التحقق غير صحيح أو منتهي الصلاحية",
      });
    }

    await VerificationCode.deleteMany({ email: email.toLowerCase() });

    res.status(200).json({
      success: true,
      message: "تم التحقق من الرمز بنجاح",
    });
  } catch (err) {
    console.error("Error verifying code:", err);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء التحقق من الرمز",
      error: err.message,
    });
  }
};

// @desc    تسجيل مستخدم جديد
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "أخطاء في البيانات المدخلة",
        errors: errors.array(),
      });
    }

    const { name, email, password, phone, address, gender, role, nationalId } =
      req.body;

    const user = new User({
      name,
      email: email.toLowerCase(),
      password,
      phone,
      address,
      gender,
      role,
      nationalId,
    });

    await user.save();

    const userData = user.toObject();
    delete userData.password;

    if (role === "driver") { 
      const driver = new Driver({
        user: user._id,
        ...req.body.driver,
      });
      await driver.save();
      userData.driver = driver
    } else if (role === "artisan") {
      const artisan = new Artisan({
        user: user._id,
        ...req.body.artisan,
      });
      await artisan.save();
      userData.artisan = artisan
    }

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: "تم التسجيل بنجاح",
      token,
      data: userData,
    });
  } catch (err) {
    console.error("خطأ في التسجيل:", err);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء التسجيل",
      error: err.message,
    });
  }
};

// @desc    تسجيل الدخول
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const user = await User.findOne({
      email: email.toLowerCase(),
      role: { $in: Array.isArray(role) ? role : [role] },
    });
    if (!user) {
      return res.status(500).json({
        success: false,
        message: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(500).json({
        success: false,
        message: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
      });
    }

    const token = generateToken(user._id, user.role);

    let work = null;
    if (user.role === "driver") {
      work = await Driver.findOne({ user: user._id });
    } else if (user.role === "artisan") {
      work = await Artisan.findOne({ user: user._id });
    }

    const userData = user.toObject();
    delete userData.password;

    const userWithWork = {
      ...userData,
      ...(userData.role === "driver" ? { driver: work } : { artisan: work }),
    };

    console.log("userWithWork", userWithWork);

    res.status(200).json({
      success: true,
      message: "تم تسجيل الدخول بنجاح",
      token,
      data: userWithWork,
    });
  } catch (err) {
    console.error("خطأ في تسجيل الدخول:", err);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تسجيل الدخول",
      error: err.message,
    });
  }
};

// @desc    الحصول على بيانات المستخدم الحالي
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.json({
        success: false,
      });
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.json({
        success: false,
      });
    }

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "المستخدم غير موجود",
      });
    }

    let work = null;
    if (user.role === "driver") {
      work = await Driver.findOne({ user: user._id });
    } else if (user.role === "artisan") {
      work = await Artisan.findOne({ user: user._id });
    }

    const userWithWork = {
      ...user.toObject(),
      work: work ? work.toObject() : null,
    };

    res.status(200).json({
      success: true,
      data: userWithWork,
    });
  } catch (err) {
    console.error("خطأ في جلب البيانات:", err);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء جلب بيانات المستخدم",
      error: err.message,
    });
  }
};
