const Review = require("../models/Review");
const User = require("../models/User");

// @desc    إنشاء تقييم جديد
// @route   POST /api/reviews
// @access  Private
exports.createReview = async (req, res) => {
  try {
    const { stars, reviewText, reviewedUser } = req.body;

    if (req.user._id.equals(reviewedUser)) {
      return res.status(400).json({
        success: false,
        message: "لا يمكنك تقييم نفسك",
      });
    }

    const existingReview = await Review.findOne({
      reviewer: req.user._id,
      reviewedUser,
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "لقد قمت بتقييم هذا المستخدم من قبل",
      });
    }

    const review = new Review({
      stars,
      reviewText,
      reviewer: req.user._id,
      reviewedUser,
    });

    await review.save();

    await review.populate("reviewer");
    await review.populate("reviewedUser");

    res.status(201).json({
      success: true,
      message: "تم إنشاء التقييم بنجاح",
      data: review,
    });
  } catch (err) {
    console.error("خطأ في إنشاء التقييم:", err);
    res.status(400).json({
      success: false,
      message: "حدث خطأ أثناء إنشاء التقييم",
      error: err.message,
    });
  }
};

// @desc    الحصول على جميع التقييمات لمستخدم معين
// @route   GET /api/reviews/user/:userId
// @access  Public
exports.getUserReviews = async (req, res) => {
  try {
    const { userId } = req.params;

    const reviews = await Review.find({ reviewedUser: userId })
      .populate("reviewer", "name profilePicture")
      .populate("reviewedUser", "name");

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  } catch (err) {
    console.error("خطأ في جلب التقييمات:", err);
    res.status(400).json({
      success: false,
      message: "حدث خطأ أثناء جلب التقييمات",
      error: err.message,
    });
  }
};

// @desc    الحصول على متوسط تقييمات مستخدم معين
// @route   GET /api/reviews/user/:userId/average
// @access  Public
exports.getUserAverageRating = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await Review.aggregate([
      {
        $match: { reviewedUser: mongoose.Types.ObjectId(userId) }
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$stars" },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    const averageRating = result[0]?.averageRating || 0;
    const totalReviews = result[0]?.totalReviews || 0;

    res.status(200).json({
      success: true,
      data: {
        averageRating: parseFloat(averageRating.toFixed(1)),
        totalReviews
      }
    });
  } catch (err) {
    console.error("خطأ في حساب متوسط التقييم:", err);
    res.status(400).json({
      success: false,
      message: "حدث خطأ أثناء حساب متوسط التقييم",
      error: err.message,
    });
  }
};

// @desc    تحديث تقييم
// @route   PUT /api/reviews/:reviewId
// @access  Private
exports.updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { stars, reviewText } = req.body;

    const review = await Review.findOneAndUpdate(
      { _id: reviewId, reviewer: req.user._id },
      { stars, reviewText },
      { new: true, runValidators: true }
    )
      .populate("reviewer")
      .populate("reviewedUser");

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "التقييم غير موجود أو ليس لديك صلاحية تعديله",
      });
    }

    res.status(200).json({
      success: true,
      message: "تم تحديث التقييم بنجاح",
      data: review,
    });
  } catch (err) {
    console.error("خطأ في تحديث التقييم:", err);
    res.status(400).json({
      success: false,
      message: "حدث خطأ أثناء تحديث التقييم",
      error: err.message,
    });
  }
};

// @desc    حذف تقييم
// @route   DELETE /api/reviews/:reviewId
// @access  Private
exports.deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findOneAndDelete({
      _id: reviewId,
      reviewer: req.user._id,
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "التقييم غير موجود أو ليس لديك صلاحية حذفه",
      });
    }

    res.status(200).json({
      success: true,
      message: "تم حذف التقييم بنجاح",
      data: {},
    });
  } catch (err) {
    console.error("خطأ في حذف التقييم:", err);
    res.status(400).json({
      success: false,
      message: "حدث خطأ أثناء حذف التقييم",
      error: err.message,
    });
  }
};