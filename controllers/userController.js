const { default: mongoose } = require("mongoose");
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
    console.log(
      "start change password ==============############################"
    );
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

// @desc    Get full user profile data
// @route   GET /api/users/profile
// @access  Private
exports.getClientProfileData = async (req, res) => {
  try {
    const userId = req.params.userId || req.user._id;
    const objectId = new mongoose.Types.ObjectId(userId);

    const [userData] = await User.aggregate([
      { $match: { _id: objectId } },
      {
        $lookup: {
          from: "trips",
          localField: "_id",
          foreignField: "client",
          as: "trips",
        },
      },
      {
        $lookup: {
          from: "orders",
          localField: "_id",
          foreignField: "client",
          as: "orders",
        },
      },
      {
        $lookup: {
          from: "reviews",
          let: { userId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$reviewedUser", "$$userId"] } } },
            {
              $lookup: {
                from: "users",
                localField: "reviewer",
                foreignField: "_id",
                as: "reviewer",
              },
            },
            {
              $unwind: "$reviewer",
            },
            {
              $project: {
                stars: 1,
                reviewText: 1,
                createdAt: 1,
                reviewer: {
                  name: "$reviewer.name",
                  image: "$reviewer.image",
                },
              },
            },
          ],
          as: "reviewList",
        },
      },
      {
        $addFields: {
          rating: { $avg: "$reviewList.stars" },
          reviews: { $size: "$reviewList" },
        },
      },
      {
        $project: {
          name: 1,
          email: 1,
          phone: 1,
          address: 1,
          gender: 1,
          nationalId: 1,
          image: 1,
          tripCount: { $size: "$trips" },
          orderCount: { $size: "$orders" },
          rating: { $ifNull: ["$rating", 0] },
          reviews: { $ifNull: ["$reviews", 0] },
          reviewList: 1,
        },
      },
    ]);

    if (!userData) {
      return res
        .status(404)
        .json({ success: false, message: "المستخدم غير موجود" });
    }

    res.status(200).json({ success: true, data: userData });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({
      success: false,
      message: "فشل تحميل البيانات",
      error: error.message,
    });
  }
};

exports.getDriverProfileData = async (req, res) => {
  try {
    const userId = req.params.userId || req.user._id;
    const objectId = new mongoose.Types.ObjectId(userId);

    const [userData] = await User.aggregate([
      { $match: { _id: objectId } },
      {
        $lookup: {
          from: "drivers",
          localField: "_id",
          foreignField: "user",
          as: "driver",
        },
      },
      { $unwind: "$driver" }, // We expect exactly one driver per user
      {
        $lookup: {
          from: "trips",
          localField: "driver._id",
          foreignField: "driver",
          as: "trips",
        },
      },
      // Calculate total passengers (sum of placesNumber for all trips)
      {
        $lookup: {
          from: "trips",
          let: { driverId: "$driver._id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$driver", "$$driverId"] } } },
            { 
              $group: { 
                _id: null, 
                totalPassengers: { $sum: "$placesNumber" } 
              } 
            }
          ],
          as: "passengerSum",
        },
      },
      {
        $lookup: {
          from: "reviews",
          let: { userId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$reviewedUser", "$$userId"] } } },
            {
              $lookup: {
                from: "users",
                localField: "reviewer",
                foreignField: "_id",
                as: "reviewer",
              },
            },
            {
              $unwind: "$reviewer",
            },
            {
              $project: {
                stars: 1,
                reviewText: 1,
                createdAt: 1,
                reviewer: {
                  name: "$reviewer.name",
                  image: "$reviewer.image",
                },
              },
            },
          ],
          as: "reviewList",
        },
      },
      {
        $addFields: {
          rating: { $avg: "$reviewList.stars" },
          reviews: { $size: "$reviewList" },
          tripCount: { $size: "$trips" },
          passengerCount: {
            $ifNull: [{ $arrayElemAt: ["$passengerSum.totalPassengers", 0] }, 0],
          },
        },
      },
      {
        $project: {
          name: 1,
          email: 1,
          phone: 1,
          address: 1,
          gender: 1,
          nationalId: 1,
          image: 1,
          driver: {
            vehicleName: "$driver.vehicleName",
            vehicleType: "$driver.vehicleType",
            placesNumber: "$driver.placesNumber",
            transportTypes: "$driver.transportType",
          },
          tripCount: 1,
          passengerCount: 1,
          rating: { $ifNull: ["$rating", 0] },
          reviews: { $ifNull: ["$reviews", 0] },
          reviewList: 1,
        },
      },
    ]);

    if (!userData) {
      return res
        .status(404)
        .json({ success: false, message: "المستخدم غير موجود" });
    }

    res.status(200).json({ success: true, data: userData });
  } catch (error) {
    console.error("Error fetching driver profile:", error);
    res.status(500).json({
      success: false,
      message: "فشل تحميل البيانات",
      error: error.message,
    });
  }
};

exports.getArtisanProfileData = async (req, res) => {
  try {
    const userId = req.params.userId || req.user._id;
    const objectId = new mongoose.Types.ObjectId(userId);

    const [userData] = await User.aggregate([
      { $match: { _id: objectId } },
      {
        $lookup: {
          from: "artisans",
          localField: "_id",
          foreignField: "user",
          as: "artisan",
        },
      },
      { $unwind: { path: "$artisan", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "orders",
          localField: "_id",
          foreignField: "artisan",
          as: "orders",
        },
      },
      {
        $lookup: {
          from: "reviews",
          let: { userId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$reviewedUser", "$$userId"] } } },
            {
              $lookup: {
                from: "users",
                localField: "reviewer",
                foreignField: "_id",
                as: "reviewer",
              },
            },
            {
              $unwind: "$reviewer",
            },
            {
              $project: {
                stars: 1,
                reviewText: 1,
                createdAt: 1,
                reviewer: {
                  name: "$reviewer.name",
                  image: "$reviewer.image",
                },
              },
            },
          ],
          as: "reviewList",
        },
      },
      {
        $addFields: {
          rating: { $avg: "$reviewList.stars" },
          reviews: { $size: "$reviewList" },
          orderCount: { $size: "$orders" },
        },
      },
      {
        $project: {
          name: 1,
          email: 1,
          phone: 1,
          address: 1,
          gender: 1,
          nationalId: 1,
          image: 1,
          artisan: {
            professions: 1,
            wilayat: 1,
            startYear: 1,
          },
          orderCount: 1,
          rating: { $ifNull: ["$rating", 0] },
          reviews: { $ifNull: ["$reviews", 0] },
          reviewList: 1,
        },
      },
    ]);

    if (!userData) {
      return res
        .status(404)
        .json({ success: false, message: "المستخدم غير موجود" });
    }

    res.status(200).json({ success: true, data: userData });
  } catch (error) {
    console.error("Error fetching artisan profile:", error);
    res.status(500).json({
      success: false,
      message: "فشل تحميل البيانات",
      error: error.message,
    });
  }
};