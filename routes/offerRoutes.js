const express = require("express");
const router = express.Router();
const offerController = require("../controllers/offerController");
const { protect } = require("../middlewares/authMiddleware");

router.post("/", protect, offerController.createOffer);

router.get("/order/:orderId", offerController.getOffersForOrder);

router.get("/artisan/me", protect, offerController.getOffersByArtisan);

router.put("/:offerId/status", protect, offerController.updateOfferStatus);

module.exports = router;