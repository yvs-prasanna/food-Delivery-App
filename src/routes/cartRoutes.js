const express = require('express');
const cartController = require('../controllers/cartController');
const authMiddleware = require('../middleware/auth');
const { validateCartItem } = require('../middleware/validation');

const router = express.Router();

// All cart routes require authentication
router.use(authMiddleware);

router.post('/add', validateCartItem, cartController.addToCart.bind(cartController));
router.get('/', cartController.getCart);
router.put('/update/:itemId', cartController.updateCartItem.bind(cartController));
router.delete('/remove/:itemId', cartController.removeFromCart.bind(cartController));
router.delete('/clear', cartController.clearCart);

module.exports = router;