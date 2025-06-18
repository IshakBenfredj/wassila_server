const Trip = require("../models/Trip");
const Driver = require("../models/Driver");

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
      await trip.populate({
      path: "driver",
      populate: { path: "user" }
      });
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
      .populate({
      path: "driver",
      populate: { path: "user" }
      });

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
      .populate({
      path: "driver",
      populate: { path: "user" }
      });

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
    const driver = await Driver.findOne({user : req.user._id})
    const trip = await Trip.findOne({
      driver: driver._id,
      status: { $nin: ["pending", "completed", "cancelled"] },
    })
      .populate("client")
      .populate({
      path: "driver",
      populate: { path: "user" }
      });

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
  try {
    const { tripId } = req.params;
    const { status, driver } = req.body;

    // Get the current trip first to check previous status
    const currentTrip = await Trip.findById(tripId);
    if (!currentTrip) {
      return res.status(404).json({
        success: false,
        message: "الرحلة غير موجودة",
      });
    }

    // Prepare update object
    const update = { status };

    // Handle driver assignment/removal based on status
    if (status === "cancelled" && currentTrip.status !== "in_trip") {
      update.driver = null;
    } else if (driver !== undefined) {
      update.driver = driver;
    }

    const trip = await Trip.findByIdAndUpdate(tripId, update, {
      new: true,
      runValidators: true,
    })
      .populate("client")
      .populate({
      path: "driver",
      populate: { path: "user" }
      });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "الرحلة غير موجودة",
      });
    }

    // Customize success message based on status
    let successMessage = "تم تحديث حالة الرحلة بنجاح";
    if (status === "completed") {
      successMessage = "تم إكمال الرحلة بنجاح";
    } else if (status === "cancelled") {
      successMessage = "تم إلغاء الرحلة بنجاح";
    }

    res.status(200).json({
      success: true,
      message: successMessage,
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
