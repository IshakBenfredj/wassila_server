const Offer = require("../models/Offer");
const Order = require("../models/Order");

exports.createOffer = async (req, res) => {
  try {
    const { order, price, description } = req.body;
    const artisan = req.user._id;

    if (!order || !price) {
      return res.status(400).json({ message: "الطلب والسعر مطلوبان" });
    }

    const existingOffer = await Offer.findOne({ artisan, order });
    if (existingOffer) {
      return res
        .status(400)
        .json({ message: "لقد قمت بإرسال عرض مسبقاً لهذا الطلب" });
    }

    const offer = await Offer.create({
      artisan,
      order,
      price,
      description,
    });

    res.status(201).json({
      success: true,
      message: "تم إرسال العرض بنجاح",
      data: offer,
    });
  } catch (error) {
    console.error("Error creating offer:", error);
    res.status(500).json({ message: "حدث خطأ أثناء إرسال العرض" });
  }
};

exports.getOffersForOrder = async (req, res) => {
  try {
    const orderId = req.params.orderId;

    const offers = await Offer.find({ order: orderId })
      .populate("artisan", "name avatar")
      .sort({ createdAt: -1 });

    res.status(200).json(offers);
  } catch (error) {
    console.error("Error fetching offers:", error);
    res.status(500).json({ message: "حدث خطأ أثناء جلب العروض" });
  }
};

exports.getOffersByArtisan = async (req, res) => {
  try {
    const artisanId = req.user._id;

    const offers = await Offer.find({ artisan: artisanId })
      .populate("order")
      .sort({ createdAt: -1 });

    res.status(200).json(offers);
  } catch (error) {
    console.error("Error fetching artisan offers:", error);
    res.status(500).json({ message: "حدث خطأ أثناء جلب العروض" });
  }
};

exports.updateOfferStatus = async (req, res) => {
  try {
    const { offerId } = req.params;
    const { status } = req.body;

    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ message: "حالة غير صالحة" });
    }

    const updated = await Offer.findByIdAndUpdate(
      offerId,
      { status },
      { new: true }
    ).populate("artisan order");

    res.status(200).json({
      success: true,
      message: "تم تحديث حالة العرض",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating offer status:", error);
    res.status(500).json({ message: "حدث خطأ أثناء تحديث حالة العرض" });
  }
};
