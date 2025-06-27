const express = require('express');
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/auth');
const { validateOrderCreation } = require('../middleware/validation');

const router = express.Router();

// All order routes require authentication
router.use(authMiddleware);

router.post('/create', validateOrderCreation, orderController.createOrder);
router.get('/', orderController.getOrders);
router.get('/:orderId', orderController.getOrderDetails);
router.post('/:orderId/cancel', orderController.cancelOrder);

module.exports = router;