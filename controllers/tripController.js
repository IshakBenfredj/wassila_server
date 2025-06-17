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

/**
 * @desc    الحصول على رحلة بواسطة المعرف
 * @route   GET /api/trips/:tripId
 * @access  Private
 */
exports.getTripById = async (req, res) => {
  try {
    const { tripId } = req.params;
    const trip = await Trip.findById(tripId)
      .populate("client")
      .populate("driver");

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "الرحلة غير موجودة",
      });
    }

    res.status(200).json({
      success: true,
      data: trip,
    });
  } catch (err) {
    console.error("خطأ في جلب الرحلة:", err);
    res.status(400).json({
      success: false,
      message: "حدث خطأ أثناء جلب الرحلة",
      error: err.message,
    });
  }
};

/**
 * @desc    الحصول على الرحلة النشطة للسائق الحالي
 * @route   GET /api/trips/active
 * @access  Private
 */
exports.getActiveTripByDriver = async (req, res) => {
  try {
    const driverId = req.user._id;
    const trip = await Trip.findOne({
      driver: driverId,
      status: { $nin: ["pending", "completed", "cancelled"] },
    })
      .populate("client")
      .populate("driver");

    if (!trip) {
      return res.json({
        success: false,
      });
    }

    res.status(200).json({
      success: true,
      data: trip,
    });
  } catch (err) {
    console.error("خطأ في جلب الرحلة النشطة:", err);
    res.status(400).json({
      success: false,
      message: "حدث خطأ أثناء جلب الرحلة النشطة",
      error: err.message,
    });
  }
};

// @desc    تغيير حالة الرحلة وتحديث السائق إذا لزم الأمر
// @route   PUT /api/trips/:tripId/status
// @access  Private
exports.changeStatus = async (req, res) => {
  console.log("start change status");

  try {
    const { tripId } = req.params;
    const { status, driver } = req.body;

    // Prepare update object
    const update = { status };
    if (driver !== undefined) {
      update.driver = driver;
    }

    const trip = await Trip.findByIdAndUpdate(tripId, update, {
      new: true,
      runValidators: true,
    })
      .populate("client")
      .populate("driver");

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
