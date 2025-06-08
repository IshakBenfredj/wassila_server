const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ 
      success: false,
      message: "غير مصرح، يلزم وجود توكن للوصول",
      tokenError: true 
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      let message = "رمز غير صالح";
      if (err.name === "TokenExpiredError") {
        message = "جلسة منتهية الصلاحية";
      }
      return res.status(401).json({ 
        success: false,
        message,
        tokenError: true 
      });
    }

    try {
      const user = await User.findById(decoded.id).select("-password");
      
      if (!user) {
        return res.status(401).json({ 
          success: false,
          message: "المستخدم غير موجود",
          tokenError: true 
        });
      }

      req.user = user;
      next();

    } catch (error) {
      console.error("خطأ في البحث عن المستخدم:", error);
      res.status(500).json({ 
        success: false,
        message: "خطأ في الخادم",
        tokenError: true 
      });
    }
  });
};

const admin = (req, res, next) => {
  try {
    if (req.user && req.user.role === "admin") {
      next();
    } else {
      res.status(403).json({ 
        success: false,
        message: "غير مصرح كمسؤول",
        tokenError: true 
      });
    }
  } catch (error) {
    console.error("خطأ في التحقق من الصلاحيات:", error);
    res.status(500).json({ 
      success: false,
      message: "خطأ في الخادم",
      tokenError: true 
    });
  }
};

module.exports = { protect, admin };