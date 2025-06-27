const express = require('express');
const restaurantController = require('../controllers/restaurantController');

const router = express.Router();

router.get('/', restaurantController.getNearbyRestaurants);
router.get('/search', restaurantController.search);
router.get('/:id', restaurantController.getRestaurantDetails);

module.exports = router;