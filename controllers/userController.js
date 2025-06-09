const User = require("../models/User");
const bcrypt = require("bcryptjs");

// @desc    Update user profile
// @route   PUT /api/users/me
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, phone, address, nationalId, gender } = req.body;
    const updates = {};

    // Validate and prepare updates
    if (name) updates.name = name;
    if (email) {
      const existingUser = await User.findOne({ email });
      console.log("existingUser", existingUser._id);
      console.log("req.user", req.user._id);
      console.log("========", !existingUser._id.equals(req.user._id));
      if (existingUser && !existingUser._id.equals(req.user._id)) {
        return res.status(400).json({
          success: false,
          message: "البريد الإلكتروني مسجل مسبقاً",
        });
      }
      updates.email = email;
    }
    if (phone) updates.phone = phone;
    if (address) updates.address = address;
    if (nationalId) updates.nationalId = nationalId;
    if (gender) updates.gender = gender;

    const updatedUser = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    res.status(200).json({
      success: true,
      message: "تم تحديث البيانات بنجاح",
      data: updatedUser,
    });
  } catch (error) {
    console.error("خطأ في تحديث البيانات:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحديث البيانات",
      error: error.message,
    });
  }
};

// @desc    Change password
// @route   PUT /api/users/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    console.log("start change password ==============############################");
    // 1) Get user
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "المستخدم غير موجود",
      });
    }

    // 2) Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(500).json({
        success: false,
        message: "كلمة المرور الحالية غير صحيحة",
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "تم تغيير كلمة المرور بنجاح",
    });
  } catch (error) {
    console.error("خطأ في تغيير كلمة المرور:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تغيير كلمة المرور",
      error: error.message,
    });
  }
};

// @desc    Delete user account
// @route   DELETE /api/users/me
// @access  Private
exports.deleteAccount = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.id);

    res.status(200).json({
      success: true,
      message: "تم حذف الحساب بنجاح",
    });
  } catch (error) {
    console.error("خطأ في حذف الحساب:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء حذف الحساب",
      error: error.message,
    });
  }
};
