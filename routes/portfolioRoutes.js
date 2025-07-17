// routes/portfolio.js
const express = require("express");
const router = express.Router();
const portfolioController = require("../controllers/portfolioController");
const { protect } = require("../middlewares/authMiddleware");

router.post("/", protect, portfolioController.createPortfolio);
router.get("/user", protect, portfolioController.getPortfolios);
router.get("/user/:id", protect, portfolioController.getPortfolios);
router.get("/:id", protect, portfolioController.getPortfolioById);
router.put("/:id", protect, portfolioController.updatePortfolio);
router.delete("/:id", protect, portfolioController.deletePortfolio);

module.exports = router;
