const db = require('../config/database');
const { formatResponse, formatError } = require('../utils/helpers');
const { HTTP_STATUS, PAYMENT_STATUS, ORDER_STATUS } = require('../utils/constants');

class PaymentController {
    // Process payment for order
    async processPayment(req, res) {
        try {
            const { orderId, paymentMethod, paymentDetails } = req.body;

            // Get order details
            const order = await db.get(
                'SELECT id, total_amount, payment_status, order_status FROM orders WHERE order_id = ?',
                [orderId]
            );

            if (!order) {
                const { response, statusCode } = formatError('Order not found', HTTP_STATUS.NOT_FOUND);
                return res.status(statusCode).json(response);
            }

            if (order.payment_status === PAYMENT_STATUS.COMPLETED) {
                const { response, statusCode } = formatError('Payment already completed', HTTP_STATUS.CONFLICT);
                return res.status(statusCode).json(response);
            }

            // Simulate payment processing
            let paymentStatus = PAYMENT_STATUS.COMPLETED;
            let transactionId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
            let gatewayResponse = {};

            if (paymentMethod === 'cash') {
                // Cash payment will be completed on delivery
                paymentStatus = PAYMENT_STATUS.PENDING;
                transactionId = null;
                gatewayResponse = { method: 'cash', status: 'pending' };
            } else if (paymentMethod === 'card') {
                // Simulate card payment
                if (paymentDetails && paymentDetails.cardNumber) {
                    // Simple validation
                    if (paymentDetails.cardNumber.length < 16) {
                        paymentStatus = PAYMENT_STATUS.FAILED;
                        gatewayResponse = { error: 'Invalid card number' };
                    } else {
                        gatewayResponse = {
                            cardLast4: paymentDetails.cardNumber.slice(-4),
                            authCode: `AUTH${Math.random().toString(36).substr(2, 6).toUpperCase()}`
                        };
                    }
                }
            } else if (paymentMethod === 'upi') {
                // Simulate UPI payment
                gatewayResponse = {
                    upiId: paymentDetails.upiId || 'user@paytm',
                    referenceId: `UPI${Date.now()}`
                };
            } else if (paymentMethod === 'wallet') {
                // Simulate wallet payment
                gatewayResponse = {
                    walletType: 'paytm',
                    walletTxnId: `WALLET${Date.now()}`
                };
            }

            // Create payment record
            await db.run(
                'INSERT INTO payments (order_id, amount, payment_method, transaction_id, gateway_response, status) VALUES (?, ?, ?, ?, ?, ?)',
                [order.id, order.total_amount, paymentMethod, transactionId, JSON.stringify(gatewayResponse), paymentStatus]
            );

            // Update order payment status
            await db.run(
                'UPDATE orders SET payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [paymentStatus, order.id]
            );

            // If payment successful and order is placed, confirm the order
            if (paymentStatus === PAYMENT_STATUS.COMPLETED && order.order_status === ORDER_STATUS.PLACED) {
                await db.run(
                    'UPDATE orders SET order_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [ORDER_STATUS.CONFIRMED, order.id]
                );

                // Add tracking entry
                await db.run(
                    'INSERT INTO order_tracking (order_id, status, notes) VALUES (?, ?, ?)',
                    [order.id, ORDER_STATUS.CONFIRMED, 'Order confirmed and payment completed']
                );
            }

            const responseData = {
                paymentStatus,
                transactionId,
                amount: order.total_amount
            };

            if (paymentStatus === PAYMENT_STATUS.FAILED) {
                responseData.error = gatewayResponse.error;
            }

            const { response, statusCode } = formatResponse(
                paymentStatus !== PAYMENT_STATUS.FAILED,
                responseData,
                paymentStatus === PAYMENT_STATUS.COMPLETED ? 'Payment processed successfully' : 
                paymentStatus === PAYMENT_STATUS.PENDING ? 'Payment pending' : 'Payment failed'
            );

            res.status(statusCode).json(response);
        } catch (error) {
            console.error('Process payment error:', error);
            const { response, statusCode } = formatError('Payment processing failed', HTTP_STATUS.INTERNAL_SERVER_ERROR);
            res.status(statusCode).json(response);
        }
    }

    // Get payment history
    async getPaymentHistory(req, res) {
        try {
            const userId = req.user.id;
            const { limit = 20, offset = 0 } = req.query;

            const payments = await db.query(
                `SELECT p.*, o.order_id, r.name as restaurant_name
                FROM payments p
                JOIN orders o ON p.order_id = o.id
                JOIN restaurants r ON o.restaurant_id = r.id
                WHERE o.user_id = ?
                ORDER BY p.created_at DESC
                LIMIT ? OFFSET ?`,
                [userId, parseInt(limit), parseInt(offset)]
            );

            const formattedPayments = payments.map(payment => ({
                id: payment.id,
                orderId: payment.order_id,
                restaurantName: payment.restaurant_name,
                amount: payment.amount,
                paymentMethod: payment.payment_method,
                transactionId: payment.transaction_id,
                status: payment.status,
                createdAt: payment.created_at
            }));

            const { response, statusCode } = formatResponse(true, { payments: formattedPayments });
            res.status(statusCode).json(response);
        } catch (error) {
            console.error('Get payment history error:', error);
            const { response, statusCode } = formatError('Failed to get payment history', HTTP_STATUS.INTERNAL_SERVER_ERROR);
            res.status(statusCode).json(response);
        }
    }
}

module.exports = new PaymentController();