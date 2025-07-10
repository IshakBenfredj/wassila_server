const Artisan = require("../models/Artisan");
const { artisanTypes } = require("../constants/enum");

// @desc    Update artisan profile
// @route   PUT /api/artisans/me
// @access  Private/Artisan
exports.updateArtisanProfile = async (req, res) => {
  try {
    const { professions, wilayat, startYear } = req.body;

    if (professions) {
      const invalidProfessions = professions.filter(
        (type) => !artisanTypes.includes(type)
      );
      if (invalidProfessions.length > 0) {
        return res.status(400).json({
          success: false,
          message: `المهن غير صالحة: ${invalidProfessions.join(", ")}`,
        });
      }
    }

    if (wilayat) {
      if (!Array.isArray(wilayat)) {
        return res.status(400).json({
          success: false,
          message: "الولايات يجب أن تكون مصفوفة",
        });
      }
    }

    const updates = {};
    if (professions) updates.professions = professions;
    if (wilayat) updates.wilayat = wilayat;
    if (startYear !== undefined) updates.startYear = parseInt(startYear);

    const updatedArtisan = await Artisan.findOneAndUpdate(
      { user: req.user._id },
      updates,
      { new: true, runValidators: true }
    ).populate("user", "name email phone image");

    if (!updatedArtisan) {
      return res.status(404).json({
        success: false,
        message: "لم يتم العثور على بيانات الحرفي",
      });
    }

    res.status(200).json({
      success: true,
      message: "تم تحديث بيانات الحرفي بنجاح",
      data: updatedArtisan,
    });
  } catch (error) {
    console.error("خطأ في تحديث بيانات الحرفي:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحديث بيانات الحرفي",
      error: error.message,
    });
  }
};

exports.getArtisanById = async (req, res) => {
  try {
    const { id } = req.params;
    const artisan = await Artisan.findOne({ user: id }).populate("user");
    if (!artisan) {
      return res.status(404).json({
        success: false,
        message: "لم يتم العثور على الحرفي",
      });
    }
    res.status(200).json({
      success: true,
      data: artisan,
    });
  } catch (error) {
    console.error("خطأ أثناء جلب بيانات الحرفي:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء جلب بيانات الحرفي",
      error: error.message,
    });
  }
};

exports.searchArtisans = async (req, res) => {
  try {
    const { wilaya, professions } = req.body;

    if (!wilaya || !Array.isArray(professions) || professions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "يرجى تحديد الولاية والمهن المطلوبة",
      });
    }

    const artisans = await Artisan.find({
      wilayat: wilaya,
      professions: { $all: professions },
    }).populate("user", "name phone email image");

    res.status(200).json({ data: artisans });
  } catch (error) {
    console.error("خطأ أثناء البحث عن الحرفيين:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء جلب الحرفيين",
      error: error.message,
    });
  }
};
