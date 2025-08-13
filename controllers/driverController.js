const Driver = require("../models/Driver");
const User = require("../models/User");
const { vehicleTypes, transportTypes } = require("../constants/enum");

// @desc    Update driver profile
// @route   PUT /api/drivers/me
// @access  Private/Driver
exports.updateDriverProfile = async (req, res) => {
  const log = (message, data = {}) => {
    console.log(`[DriverProfileUpdate][${new Date().toISOString()}] ${message}`, data);
  };

  try {
    log('Update request received', { userId: req.user.id, body: req.body });

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
      log('Validating transport types', { transportType });
      const invalidTypes = transportType.filter(
        (type) => !transportTypes.includes(type)
      );
      
      if (invalidTypes.length > 0) {
        log('Invalid transport types detected', { invalidTypes });
        return res.status(400).json({
          success: false,
          message: `أنواع النقل غير صالحة: ${invalidTypes.join(", ")}`,
        });
      }
    }

    const updates = {};
    
    // Validate and add vehicle type
    if (vehicleType) {
      log('Validating vehicle type', { vehicleType });
      if (!vehicleTypes.includes(vehicleType)) {
        log('Invalid vehicle type detected', { vehicleType });
        return res.status(400).json({
          success: false,
          message: "نوع المركبة غير صالح",
        });
      }
      updates.vehicleType = vehicleType;
      log('Vehicle type validated and added to updates');
    }

    // Add other fields to updates
    if (transportType) {
      updates.transportType = transportType;
      log('Transport type added to updates');
    }
    if (vehicleName) {
      updates.vehicleName = vehicleName;
      log('Vehicle name added to updates');
    }
    if (licenseNumber) {
      updates.licenseNumber = licenseNumber;
      log('License number added to updates');
    }
    if (issueDate) {
      updates.issueDate = new Date(issueDate);
      log('Issue date added to updates', { issueDate: updates.issueDate });
    }
    if (expiryDate) {
      updates.expiryDate = new Date(expiryDate);
      log('Expiry date added to updates', { expiryDate: updates.expiryDate });
    }
    if (placesNumber) {
      updates.placesNumber = placesNumber;
      log('Places number added to updates');
    }

    // Validate license expiry date
    if (updates.expiryDate) {
      log('Validating license expiry date');
      if (new Date(updates.expiryDate) <= new Date()) {
        log('Expired license detected', { expiryDate: updates.expiryDate });
        return res.status(400).json({
          success: false,
          message: "تاريخ انتهاء الرخصة يجب أن يكون في المستقبل",
        });
      }
      log('License expiry date validated');
    }

    log('Attempting to update driver profile', { updates });
    const updatedDriver = await Driver.findOneAndUpdate(
      { user: req.user.id },
      updates,
      { new: true, runValidators: true }
    ).populate("user", "name email phone image");

    if (!updatedDriver) {
      log('Driver not found', { userId: req.user.id });
      return res.status(404).json({
        success: false,
        message: "لم يتم العثور على بيانات السائق",
      });
    }

    log('Driver profile updated successfully', { driverId: updatedDriver._id });
    res.status(200).json({
      success: true,
      message: "تم تحديث بيانات السائق بنجاح",
      data: updatedDriver,
    });

  } catch (error) {
    log('Error updating driver profile', { 
      error: error.message,
      stack: error.stack 
    });
    
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحديث بيانات السائق",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
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
      { user: req.user._id },
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