const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/', protect, reviewController.createReview);
router.get('/user/:userId', reviewController.getUserReviews);
router.get('/user/:userId/average', reviewController.getUserAverageRating);
router.put('/:reviewId', protect, reviewController.updateReview);
router.delete('/:reviewId', protect, reviewController.deleteReview);

module.exports = router;