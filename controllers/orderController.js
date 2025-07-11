const mongoose = require("mongoose");
const { uploadMultipleImages } = require("../lib/cloudinary");
const Order = require("../models/Order");
const Artisan = require("../models/Artisan");
const Offer = require("../models/Offer");

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
