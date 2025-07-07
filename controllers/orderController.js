const Order = require("../models/Order");

exports.createOrder = async (req, res) => {
  try {
    const { artisan, professions, wilaya, address, description } = req.body;

    if (
      !professions ||
      !Array.isArray(professions) ||
      professions.length === 0
    ) {
      return res.status(400).json({ message: "يرجى تحديد المهن المطلوبة" });
    }

    if (!wilaya || !address || !description) {
      return res
        .status(400)
        .json({ message: "الرجاء ملء جميع الحقول المطلوبة" });
    }

    const newOrder = await Order.create({
      client: req.user._id,
      artisan: artisan || null,
      professions,
      wilaya,
      address,
      description,
    });

    res.status(201).json({
      success: true,
      message: "تم إنشاء الطلب بنجاح",
      data: newOrder,
    });
  } catch (error) {
    console.error("خطأ أثناء إنشاء الطلب:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء إنشاء الطلب",
      error: error.message,
    });
  }
};
