const express = require('express');
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All payment routes require authentication
router.use(authMiddleware);

router.post('/process', paymentController.processPayment);
router.get('/history', paymentController.getPaymentHistory);

module.exports = router;