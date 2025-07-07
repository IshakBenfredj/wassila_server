const { uploadMultipleImages } = require("../lib/cloudinary");
const Portfolio = require("../models/Portfolio");

// @desc    إنشاء عمل جديد في المعرض
// @route   POST /api/portfolios
// @access  Private
exports.createPortfolio = async (req, res) => {
  try {
    const { title, description, professions, images } = req.body;

    if (!title || !images || !Array.isArray(images)) {
      return res.status(400).json({
        success: false,
        message: "الرجاء إدخال العنوان والصور",
      });
    }

    // Upload to Cloudinary
    const uploadedImages = await uploadMultipleImages(images);

    const portfolio = await Portfolio.create({
      title,
      description,
      professions,
      images: uploadedImages,
      user: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "تم حفظ العمل بنجاح",
      data: portfolio,
    });
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء رفع الصور أو حفظ العمل",
      error: err.message,
    });
  }
};
// @desc    جلب كل الأعمال الخاصة بالمستخدم الحالي
// @route   GET /api/portfolios
// @access  Private
exports.getPortfolios = async (req, res) => {
  try {
    const portfolios = await Portfolio.find({ user: req.params.id }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      data: portfolios,
    });
  } catch (err) {
    console.error("خطأ في جلب الأعمال:", err);
    res.status(400).json({
      success: false,
      message: "حدث خطأ أثناء جلب الأعمال",
      error: err.message,
    });
  }
};

// @desc    جلب عمل واحد بواسطة ID
// @route   GET /api/portfolios/:id
// @access  Private
exports.getPortfolioById = async (req, res) => {
  try {
    const { id } = req.params;

    const portfolio = await Portfolio.findById(id).populate("user");

    if (!portfolio) {
      return res.status(404).json({
        success: false,
        message: "العمل غير موجود",
      });
    }

    res.status(200).json({
      success: true,
      data: portfolio,
    });
  } catch (err) {
    console.error("خطأ في جلب العمل:", err);
    res.status(400).json({
      success: false,
      message: "حدث خطأ أثناء جلب العمل",
      error: err.message,
    });
  }
};

// @desc    تعديل العمل
// @route   PUT /api/portfolios/:id
// @access  Private
exports.updatePortfolio = async (req, res) => {
  try {
    const { id } = req.params;

    const portfolio = await Portfolio.findById(id);
    if (!portfolio) {
      return res.status(404).json({
        success: false,
        message: "العمل غير موجود",
      });
    }

    if (!portfolio.user.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "غير مصرح بتعديل هذا العمل",
      });
    }

    Object.assign(portfolio, req.body);
    await portfolio.save();

    res.status(200).json({
      success: true,
      message: "تم تحديث العمل بنجاح",
      data: portfolio,
    });
  } catch (err) {
    console.error("خطأ في تحديث العمل:", err);
    res.status(400).json({
      success: false,
      message: "حدث خطأ أثناء تحديث العمل",
      error: err.message,
    });
  }
};

// @desc    حذف العمل
// @route   DELETE /api/portfolios/:id
// @access  Private
exports.deletePortfolio = async (req, res) => {
  try {
    const { id } = req.params;

    const portfolio = await Portfolio.findById(id);
    if (!portfolio) {
      return res.status(404).json({
        success: false,
        message: "العمل غير موجود",
      });
    }

    if (!portfolio.user.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "غير مصرح بحذف هذا العمل",
      });
    }

    await portfolio.deleteOne();

    res.status(200).json({
      success: true,
      message: "تم حذف العمل بنجاح",
    });
  } catch (err) {
    console.error("خطأ في حذف العمل:", err);
    res.status(400).json({
      success: false,
      message: "حدث خطأ أثناء حذف العمل",
      error: err.message,
    });
  }
};
