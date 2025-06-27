const express = require('express');
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middleware/auth');
const { validateReview } = require('../middleware/validation');

const router = express.Router();

router.post('/restaurant', authMiddleware, validateReview, reviewController.addReview);
router.get('/restaurant/:restaurantId', reviewController.getRestaurantReviews);

module.exports = router;