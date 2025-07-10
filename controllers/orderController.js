const { uploadMultipleImages } = require("../lib/cloudinary");
const Order = require("../models/Order");

exports.createOrder = async (req, res) => {
  try {
    const {
      artisan,
      professions,
      wilaya,
      address,
      description,
      maxPrice,
      images,
    } = req.body;

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

    let imageUrls = [];
    if (images && images.length > 0) {
      try {
        imageUrls = await uploadMultipleImages(images, "orders");
      } catch (uploadError) {
        console.error("Error uploading images:", uploadError);
        return res.status(500).json({ message: "حدث خطأ أثناء رفع الصور" });
      }
    }

    const newOrder = await Order.create({
      client: req.user._id,
      artisan: artisan || null,
      professions,
      wilaya,
      address,
      description,
      maxPrice,
      images: imageUrls,
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

// exports.createOrder = async (req, res) => {
//   try {
//     const { artisan, professions, wilaya, address, description } = req.body;

//     if (
//       !professions ||
//       !Array.isArray(professions) ||
//       professions.length === 0
//     ) {
//       return res.status(400).json({ message: "يرجى تحديد المهن المطلوبة" });
//     }

//     if (!wilaya || !address || !description) {
//       return res
//         .status(400)
//         .json({ message: "الرجاء ملء جميع الحقول المطلوبة" });
//     }

//     const newOrder = await Order.create({
//       client: req.user._id,
//       artisan: artisan || null,
//       professions,
//       wilaya,
//       address,
//       description,
//     });

//     res.status(201).json({
//       success: true,
//       message: "تم إنشاء الطلب بنجاح",
//       data: newOrder,
//     });
//   } catch (error) {
//     console.error("خطأ أثناء إنشاء الطلب:", error);
//     res.status(500).json({
//       success: false,
//       message: "حدث خطأ أثناء إنشاء الطلب",
//       error: error.message,
//     });
//   }
// };

exports.getOrders = async (req, res) => {
  try {
    const userId = req.user._id;

    const orders = await Order.find({ client: userId })
      .sort({ createdAt: -1 })
      .populate("artisan")
      .exec();

    res.status(200).json(orders);
  } catch (error) {
    console.error("خطأ أثناء جلب الطلبات:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء جلب الطلبات",
      error: error.message,
    });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.user._id;

    const order = await Order.findOne({ _id: orderId, client: userId });

    if (!order) {
      return res
        .status(404)
        .json({ message: "الطلب غير موجود أو لا تملك الصلاحية" });
    }

    await Order.findByIdAndDelete(orderId);

    res.status(200).json({
      success: true,
      message: "تم حذف الطلب بنجاح",
    });
  } catch (error) {
    console.error("خطأ أثناء حذف الطلب:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء حذف الطلب",
      error: error.message,
    });
  }
};
