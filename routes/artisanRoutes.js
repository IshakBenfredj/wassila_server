const express = require("express");
const artisanController = require("../controllers/artisanController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.put("/me", protect, artisanController.updateArtisanProfile);

module.exports = router;
