const mongoose = require("mongoose");
const { uploadMultipleImages } = require("../lib/cloudinary");
const Order = require("../models/Order");
const Artisan = require("../models/Artisan");
const Offer = require("../models/Offer");

exports.createOrder = async (req, res) => {
  console.log("🚀 Creating new order...");

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

    console.log("📦 Request Body:", {
      artisan,
      professions,
      wilaya,
      address,
      description,
      maxPrice,
      imageCount: images?.length || 0,
    });

    // ✅ Validation
    if (
      !professions ||
      !Array.isArray(professions) ||
      professions.length === 0
    ) {
      console.warn("❌ Missing professions");
      return res.status(400).json({ message: "يرجى تحديد المهن المطلوبة" });
    }

    if (!wilaya || !address || !description) {
      console.warn("❌ Missing required fields");
      return res
        .status(400)
        .json({ message: "الرجاء ملء جميع الحقول المطلوبة" });
    }

    // ✅ Upload images
    let imageUrls = [];
    if (images && images.length > 0) {
      console.log("🖼 Uploading images...");
      try {
        imageUrls = await uploadMultipleImages(images, "orders");
        console.log("✅ Images uploaded:", imageUrls.length);
      } catch (uploadError) {
        console.error("❌ Error uploading images:", uploadError);
        return res.status(500).json({ message: "حدث خطأ أثناء رفع الصور" });
      }
    }

    // ✅ Create order
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

    console.log("✅ Order created successfully:", newOrder._id);

    res.status(201).json({
      success: true,
      message: "تم إنشاء الطلب بنجاح",
      data: newOrder,
    });
  } catch (error) {
    console.error("❌ خطأ أثناء إنشاء الطلب:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء إنشاء الطلب",
      error: error.message,
    });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id)
      .populate("artisan")
      .populate("client")
      .lean();

    if (!order) {
      return res.status(404).json({ message: "الطلب غير موجود" });
    }

    const offers = await Offer.find({ order: id })
      .populate("artisan")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ ...order, offers });
  } catch (error) {
    console.error("خطأ أثناء جلب الطلب:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء جلب الطلب",
      error: error.message,
    });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const userId = req.user._id;

    const orders = await Order.aggregate([
      { $match: { client: new mongoose.Types.ObjectId(userId) } },
      {
        $lookup: {
          from: "offers",
          localField: "_id",
          foreignField: "order",
          as: "offers",
        },
      },
      {
        $addFields: {
          offersCount: { $size: "$offers" },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $lookup: {
          from: "users",
          localField: "artisan",
          foreignField: "_id",
          as: "artisan",
        },
      },
      {
        $unwind: {
          path: "$artisan",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          offers: 0, // exclude full offers array
        },
      },
    ]);

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

exports.getOrdersForArtisan = async (req, res) => {
  try {
    const artisanUserId = req.user._id;

    const artisan = await Artisan.findOne({ user: artisanUserId });
    if (!artisan) {
      return res
        .status(404)
        .json({ message: "لم يتم العثور على بيانات الحرفي" });
    }

    const artisanProfessions = artisan.professions;
    const artisanWilayat = artisan.wilayat;

    const orders = await Order.aggregate([
      {
        $match: {
          $or: [
            { artisan: new mongoose.Types.ObjectId(artisanUserId) },
            {
              artisan: null,
              professions: { $in: artisanProfessions },
              wilaya: { $in: artisanWilayat },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "offers",
          localField: "_id",
          foreignField: "order",
          as: "offers",
        },
      },
      {
        $addFields: {
          offersCount: { $size: "$offers" },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $lookup: {
          from: "users",
          localField: "client",
          foreignField: "_id",
          as: "client",
        },
      },
      {
        $unwind: "$client",
      },
      {
        $project: {
          offers: 0,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error("خطأ أثناء جلب الطلبات للحرفي:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء جلب الطلبات للحرفي",
      error: error.message,
    });
  }
};

exports.acceptOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const { artisan } = req.body;
    const userId = req.user._id;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: "الطلب غير موجود" });
    }

    if (order.client.toString() !== userId.toString()) {
      return res.status(403).json({ message: "لا يمكنك تعديل هذا الطلب" });
    }

    if (
      ["accepted", "rejected", "canceled", "completed"].includes(order.status)
    ) {
      return res
        .status(400)
        .json({ message: "لا يمكن تعديل حالة الطلب الحالية" });
    }

    if (!order.artisan && !artisan) {
      return res.status(400).json({ message: "يرجى تحديد الحرفي" });
    }

    order.status = "accepted";
    if (!order.artisan && artisan) {
      order.artisan = artisan;
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: "تم قبول العرض بنجاح",
      data: order,
    });
  } catch (error) {
    console.error("خطأ أثناء قبول العرض:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء قبول العرض",
      error: error.message,
    });
  }
};

exports.rejectOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const artisanId = req.user._id;

    if (!reason) {
      return res.status(400).json({ message: "يرجى تقديم سبب الرفض" });
    }

    const order = await Order.findById(id);

    if (
      !order ||
      !order.artisan ||
      order.artisan.toString() !== artisanId.toString()
    ) {
      return res.status(403).json({ message: "لا يمكنك رفض هذا الطلب" });
    }

    if (["rejected", "canceled", "completed"].includes(order.status)) {
      return res
        .status(400)
        .json({ message: "لا يمكن تعديل حالة الطلب الحالية" });
    }

    order.status = "rejected";
    order.cancellation = {
      reason,
      cancelledBy: "artisan",
      type: "rejected",
      date: new Date(),
    };

    await order.save();

    res.status(200).json({
      success: true,
      message: "تم رفض الطلب بنجاح",
      data: order,
    });
  } catch (error) {
    console.error("خطأ أثناء رفض الطلب:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء رفض الطلب",
      error: error.message,
    });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;

    if (!reason) {
      return res.status(400).json({ message: "يرجى تقديم سبب الإلغاء" });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: "الطلب غير موجود" });
    }

    const isClient = order.client.toString() === userId.toString();
    const isArtisan =
      order.artisan && order.artisan.toString() === userId.toString();

    if (!isClient && !isArtisan) {
      return res
        .status(403)
        .json({ message: "لا تملك صلاحية إلغاء هذا الطلب" });
    }

    if (["rejected", "canceled", "completed"].includes(order.status)) {
      return res
        .status(400)
        .json({ message: "لا يمكن تعديل حالة الطلب الحالية" });
    }

    order.status = "canceled";
    order.cancellation = {
      reason,
      cancelledBy: isClient ? "client" : "artisan",
      type: "canceled",
      date: new Date(),
    };

    await order.save();

    res.status(200).json({
      success: true,
      message: "تم إلغاء الطلب بنجاح",
      data: order,
    });
  } catch (error) {
    console.error("خطأ أثناء إلغاء الطلب:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء إلغاء الطلب",
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

exports.completeOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: "الطلب غير موجود" });
    }

    if (!order.artisan) {
      return res.status(400).json({ message: "لا يمكن إكمال الطلب بدون حرفي" });
    }

    if (order.status !== "accepted") {
      return res
        .status(400)
        .json({ message: "فقط الطلبات النشطة يمكن إكمالها" });
    }

    const isClient = order.client.toString() === userId.toString();
    const isArtisan = order.artisan.toString() === userId.toString();

    if (!isClient && !isArtisan) {
      return res
        .status(403)
        .json({ message: "ليس لديك صلاحية لإكمال هذا الطلب" });
    }

    order.status = "completed";
    await order.save();

    res.status(200).json({
      success: true,
      message: "تم إكمال الطلب بنجاح",
      data: order,
    });
  } catch (error) {
    console.error("خطأ أثناء إكمال الطلب:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء إكمال الطلب",
      error: error.message,
    });
  }
};
