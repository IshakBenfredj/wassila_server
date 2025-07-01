const express = require("express");
const router = express.Router();
const Address = require("../models/Address");
const { protect } = require("../middlewares/authMiddleware");

// Address Routes
// POST /api/addresses - Create a new address
router.post("/", protect, async (req, res) => {
  try {
    const { name, icon, latitude, longitude } = req.body;
    if (!name || !latitude || !longitude) {
      return res.status(400).json({ message: "بيانات ناقصة" });
    }

    const address = await Address.create({
      user: req.user._id,
      name,
      icon,
      latitude,
      longitude,
    });

    res
      .status(201)
      .json({
        message: "تم إضافة العنوان بنجاح",
        data: address,
        success: true,
      });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "حدث خطأ داخلي", success: false });
  }
});

// GET /api/addresses - Get all addresses for the authenticated user
router.get("/", protect, async (req, res) => {
  try {
    const addresses = await Address.find({ user: req.user._id });
    res.json(addresses);
  } catch (err) {
    res.status(500).json({ message: "فشل في جلب العناوين" });
  }
});

// DELETE /api/addresses/:id - Delete an address by ID
router.delete("/:id", protect, async (req, res) => {
  try {
    await Address.findByIdAndDelete(req.params.id);
    res.json({ message: "تم الحذف", success: true });
  } catch (err) {
    res.status(500).json({ message: "فشل في الحذف" });
  }
});

module.exports = router;
