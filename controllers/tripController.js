const Trip = require("../models/Trip");
const Driver = require("../models/Driver");
const CancelledTrip = require("../models/CancelledTrip");

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
        populate: { path: "user" },
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
 * @desc
 * @route   GET /api/trips
 * @access  Private
 */
exports.getTrips = async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === "driver") {
      const driver = await Driver.findOne({ user: req.user._id });
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "السائق غير موجود",
        });
      }
      filter.driver = driver._id;
    } else {
      filter.client = req.user._id;
    }

    const trips = await Trip.find(filter)
      .populate("client")
      .populate({
        path: "driver",
        populate: { path: "user" },
      })
      .sort({ createdAt: -1 });

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
        populate: { path: "user" },
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
exports.getActiveTrip = async (req, res) => {
  try {
    let trip;
    if (req.user.role === "driver") {
      const driver = await Driver.findOne({ user: req.user._id });
      trip = await Trip.findOne({
        driver: driver._id,
        status: { $nin: ["pending", "completed", "cancelled"] },
      })
        .populate("client")
        .populate({
          path: "driver",
          populate: { path: "user" },
        });
    } else {
      trip = await Trip.findOne({
        client: req.user._id,
        status: { $nin: ["completed", "cancelled"] },
      })
        .populate("client")
        .populate({
          path: "driver",
          populate: { path: "user" },
        });
    }

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
    const { status, driver, reason } = req.body;

    const currentTrip = await Trip.findById(tripId);
    if (!currentTrip) {
      return res.status(404).json({
        success: false,
        message: "الرحلة غير موجودة",
      });
    }

    const update = { status };

    if (status === "cancelled") {
      const cancelledTrip = new CancelledTrip({
        trip: tripId,
        cancelledBy: req.user._id,
        reason: reason || "تم الإلغاء بعد بدء الرحلة",
      });
      // update.driver = null;
      // if (currentTrip.status !== "in_trip") {
      //   // update.status = "pending";
      // }
      await cancelledTrip.save();
    }

    if (driver !== undefined) {
      update.driver = driver;
    }

    let trip;
    if (update.driver) {
      trip = await Trip.findByIdAndUpdate(tripId, update, {
        new: true,
        runValidators: true,
      })
        .populate("client")
        .populate({
          path: "driver",
          populate: { path: "user" },
        });
    } else {
      trip = await Trip.findByIdAndUpdate(tripId, update, {
        new: true,
        runValidators: true,
      }).populate("client");
    }

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

/**
 * @desc    الحصول على الرحلات الملغاة الخاصة بالمستخدم الحالي (عميل أو سائق)
 * @route   GET /api/trips/cancelled-trips
 * @access  Private
 */
exports.getCancelledTrips = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find cancelled trips where the user is either the client or the driver
    const cancelledTrips = await CancelledTrip.find()
      .populate({
        path: "trip",
        populate: [
          { path: "client" },
          {
            path: "driver",
            populate: { path: "user" },
          },
        ],
      })
      .populate("cancelledBy")
      .sort({ createdAt: -1 });

    // Filter trips where the user is the client or the driver.user
    const filtered = cancelledTrips.filter((ct) => {
      if (!ct.trip) return false;
      if (ct.trip.client && ct.trip.client._id.equals(userId)) return true;
      if (
        ct.trip.driver &&
        ct.trip.driver.user &&
        ct.trip.driver.user._id.equals(userId)
      )
        return true;
      return false;
    });

    res.status(200).json({
      success: true,
      data: filtered,
    });
  } catch (err) {
    console.error("خطأ في جلب الرحلات الملغاة:", err);
    res.status(400).json({
      success: false,
      message: "حدث خطأ أثناء جلب الرحلات الملغاة",
      error: err.message,
    });
  }
};
