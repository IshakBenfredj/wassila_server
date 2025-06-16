const Trip = require("../models/Trip");

// @desc    إنشاء رحلة جديدة
// @route   POST /api/trips
// @access  Private
exports.createTrip = async (req, res) => {
  try {
    const trip = new Trip({
      client: req.user._id,
      ...req.body,
    });
    await trip.save();
    await trip.populate("client");
    if (trip.driver) {
      await trip.populate("driver");
    }
    res.status(201).json({
      success: true,
      message: "تم إنشاء الرحلة بنجاح",
      data: trip,
    });
  } catch (err) {
    console.error("خطأ في إنشاء الرحلة:", err);
    res.status(400).json({
      success: false,
      message: "حدث خطأ أثناء إنشاء الرحلة",
      error: err.message,
    });
  }
};

/**
 * @desc    الحصول على جميع الرحلات ذات الحالة "pending" أو الرحلات التي يكون فيها السائق هو المستخدم الحالي
 * @route   GET /api/trips
 * @access  Private
 */
exports.getTrips = async (req, res) => {
  try {
    const userId = req.user._id;
    const trips = await Trip.find({
      $or: [{ status: "pending" }, { driver: userId }],
    })
      .populate("client")
      .populate("driver");

    res.status(200).json({
      success: true,
      data: trips,
    });
  } catch (err) {
    console.error("خطأ في جلب الرحلات:", err);
    res.status(400).json({
      success: false,
      message: "حدث خطأ أثناء جلب الرحلات",
      error: err.message,
    });
  }
};

// @desc    تغيير حالة الرحلة
// @route   PUT /api/trips/:tripId/status
// @access  Private
exports.changeStatus = async (req, res) => {
  try {
    const { tripId } = req.params;
    const { status } = req.body;

    const trip = await Trip.findByIdAndUpdate(
      tripId,
      { status },
      { new: true, runValidators: true }
    );

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "الرحلة غير موجودة",
      });
    }

    res.status(200).json({
      success: true,
      message: "تم تحديث حالة الرحلة بنجاح",
      data: trip,
    });
  } catch (err) {
    console.error("خطأ في تغيير حالة الرحلة:", err);
    res.status(400).json({
      success: false,
      message: "حدث خطأ أثناء تغيير حالة الرحلة",
      error: err.message,
    });
  }
};
