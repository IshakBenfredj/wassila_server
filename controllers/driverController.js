const Driver = require("../models/Driver");
const User = require("../models/User");
const { vehicleTypes, transportTypes } = require("../constants/enum");

// @desc    Update driver profile
// @route   PUT /api/drivers/me
// @access  Private/Driver
exports.updateDriverProfile = async (req, res) => {
  try {
    const {
      vehicleType,
      transportType,
      vehicleName,
      licenseNumber,
      issueDate,
      expiryDate,
      placesNumber,
    } = req.body;

    // Validate transport types
    if (transportType) {
      const invalidTypes = transportType.filter(
        (type) => !transportTypes.includes(type)
      );
      if (invalidTypes.length > 0) {
        return res.status(400).json({
          success: false,
          message: `أنواع النقل غير صالحة: ${invalidTypes.join(", ")}`,
        });
      }
    }

    const updates = {};
    if (vehicleType) {
      if (!vehicleTypes.includes(vehicleType)) {
        return res.status(400).json({
          success: false,
          message: "نوع المركبة غير صالح",
        });
      }
      updates.vehicleType = vehicleType;
    }
    if (transportType) updates.transportType = transportType;
    if (vehicleName) updates.vehicleName = vehicleName;
    if (licenseNumber) updates.licenseNumber = licenseNumber;
    if (issueDate) updates.issueDate = new Date(issueDate);
    if (expiryDate) updates.expiryDate = new Date(expiryDate);
    if (placesNumber) updates.placesNumber = placesNumber;

    // Validate license expiry date
    if (updates.expiryDate && new Date(updates.expiryDate) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "تاريخ انتهاء الرخصة يجب أن يكون في المستقبل",
      });
    }

    const updatedDriver = await Driver.findOneAndUpdate(
      { user: req.user.id },
      updates,
      { new: true, runValidators: true }
    ).populate("user", "name email phone image");

    if (!updatedDriver) {
      return res.status(404).json({
        success: false,
        message: "لم يتم العثور على بيانات السائق",
      });
    }

    res.status(200).json({
      success: true,
      message: "تم تحديث بيانات السائق بنجاح",
      data: updatedDriver,
    });
  } catch (error) {
    console.error("خطأ في تحديث بيانات السائق:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحديث بيانات السائق",
      error: error.message,
    });
  }
};

// @desc    Update driver availability
// @route   PUT /api/drivers/me/availability
// @access  Private/Driver
exports.updateAvailability = async (req, res) => {
  try {
    const { isAvailable } = req.body;

    if (typeof isAvailable !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "حالة التوفر يجب أن تكون true أو false",
      });
    }

    const driver = await Driver.findOneAndUpdate(
      { user: req.user.id },
      { isAvailable },
      { new: true }
    );

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "لم يتم العثور على بيانات السائق",
      });
    }

    res.status(200).json({
      success: true,
      message: `تم ${isAvailable ? "تفعيل" : "تعطيل"} حالة التوفر بنجاح`,
      data: { isAvailable: driver.isAvailable },
    });
  } catch (error) {
    console.error("خطأ في تحديث حالة التوفر:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحديث حالة التوفر",
      error: error.message,
    });
  }
};

// @desc    Admin update driver license info
// @route   PUT /api/drivers/:id/license
// @access  Private/Admin
exports.adminUpdateLicense = async (req, res) => {
  try {
    const { licenseNumber, issueDate, expiryDate } = req.body;

    // Validate dates
    if (new Date(expiryDate) <= new Date(issueDate)) {
      return res.status(400).json({
        success: false,
        message: "تاريخ انتهاء الرخصة يجب أن يكون بعد تاريخ الإصدار",
      });
    }

    const updatedDriver = await Driver.findByIdAndUpdate(
      req.params.id,
      {
        licenseNumber,
        issueDate: new Date(issueDate),
        expiryDate: new Date(expiryDate),
      },
      { new: true, runValidators: true }
    ).populate("user", "name phone");

    if (!updatedDriver) {
      return res.status(404).json({
        success: false,
        message: "لم يتم العثور على بيانات السائق",
      });
    }

    res.status(200).json({
      success: true,
      message: "تم تحديث بيانات الرخصة بنجاح",
      data: {
        licenseNumber: updatedDriver.licenseNumber,
        issueDate: updatedDriver.issueDate,
        expiryDate: updatedDriver.expiryDate,
      },
    });
  } catch (error) {
    console.error("خطأ في تحديث بيانات الرخصة:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحديث بيانات الرخصة",
      error: error.message,
    });
  }
};
