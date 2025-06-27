const db = require('../config/database');
const { formatResponse, formatError, generateOrderId, calculateEstimatedDeliveryTime } = require('../utils/helpers');
const { HTTP_STATUS, ORDER_STATUS, PAYMENT_STATUS } = require('../utils/constants');

class OrderController {
    // Create order from cart
    async createOrder(req, res) {
        try {
            const { addressId, paymentMethod, specialInstructions } = req.body;
            const userId = req.user.id;

            // Get cart items
            const cartItems = await db.query(
                `SELECT ci.*, mi.name, mi.price, r.name as restaurant_name, r.delivery_fee, r.min_order_amount
                FROM cart_items ci
                JOIN menu_items mi ON ci.menu_item_id = mi.id
                JOIN restaurants r ON ci.restaurant_id = r.id
                WHERE ci.user_id = ?`,
                [userId]
            );

            if (cartItems.length === 0) {
                const { response, statusCode } = formatError('Cart is empty', HTTP_STATUS.BAD_REQUEST);
                return res.status(statusCode).json(response);
            }

            // Verify address belongs to user
            const address = await db.get(
                'SELECT * FROM addresses WHERE id = ? AND user_id = ?',
                [addressId, userId]
            );

            if (!address) {
                const { response, statusCode } = formatError('Address not found', HTTP_STATUS.NOT_FOUND);
                return res.status(statusCode).json(response);
            }

            // Calculate totals
            const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const deliveryFee = cartItems[0].delivery_fee;
            const taxAmount = Math.round(subtotal * 0.05 * 100) / 100; // 5% tax
            const totalAmount = subtotal + deliveryFee + taxAmount;

            // Check minimum order amount
            if (subtotal < cartItems[0].min_order_amount) {
                const { response, statusCode } = formatError(
                    `Minimum order amount is ₹${cartItems[0].min_order_amount}`,
                    HTTP_STATUS.BAD_REQUEST
                );
                return res.status(statusCode).json(response);
            }

            // Generate order ID
            const orderId = generateOrderId();

            // Calculate estimated delivery time
            const estimatedDeliveryTime = calculateEstimatedDeliveryTime(5, 30); // Assume 5km distance

            // Create order
            const orderResult = await db.run(
                `INSERT INTO orders (order_id, user_id, restaurant_id, address_id, subtotal, delivery_fee, tax_amount, total_amount, payment_method, special_instructions, estimated_delivery_time, order_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [orderId, userId, cartItems[0].restaurant_id, addressId, subtotal, deliveryFee, taxAmount, totalAmount, paymentMethod, specialInstructions, estimatedDeliveryTime, ORDER_STATUS.PLACED]
            );

            // Create order items
            for (const item of cartItems) {
                await db.run(
                    'INSERT INTO order_items (order_id, menu_item_id, quantity, price, special_instructions) VALUES (?, ?, ?, ?, ?)',
                    [orderResult.id, item.menu_item_id, item.quantity, item.price, item.special_instructions]
                );
            }

            // Add order tracking
            await db.run(
                'INSERT INTO order_tracking (order_id, status, notes) VALUES (?, ?, ?)',
                [orderResult.id, ORDER_STATUS.PLACED, 'Order placed successfully']
            );

            // Clear cart
            await db.run('DELETE FROM cart_items WHERE user_id = ?', [userId]);

            const { response, statusCode } = formatResponse(true, {
                orderId,
                totalAmount,
                estimatedDeliveryTime: `${estimatedDeliveryTime-5}-${estimatedDeliveryTime} minutes`,
                status: ORDER_STATUS.PLACED
            }, 'Order placed successfully', HTTP_STATUS.CREATED);

            res.status(statusCode).json(response);
        } catch (error) {
            console.error('Create order error:', error);
            const { response, statusCode } = formatError('Failed to create order', HTTP_STATUS.INTERNAL_SERVER_ERROR);
            res.status(statusCode).json(response);
        }
    }

    // Get user's orders
    async getOrders(req, res) {
        try {
            const userId = req.user.id;
            const { status, limit = 20, offset = 0 } = req.query;

            let query = `
                SELECT o.*, r.name as restaurant_name, r.image_url as restaurant_image,
                       COUNT(oi.id) as item_count
                FROM orders o
                JOIN restaurants r ON o.restaurant_id = r.id
                LEFT JOIN order_items oi ON o.id = oi.order_id
                WHERE o.user_id = ?
            `;

            const queryParams = [userId];

            if (status) {
                query += ' AND o.order_status = ?';
                queryParams.push(status);
            }

            query += ' GROUP BY o.id ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
            queryParams.push(parseInt(limit), parseInt(offset));

            const orders = await db.query(query, queryParams);

            const formattedOrders = orders.map(order => ({
                orderId: order.order_id,
                restaurantName: order.restaurant_name,
                restaurantImage: order.restaurant_image,
                items: order.item_count,
                totalAmount: order.total_amount,
                status: order.order_status,
                paymentMethod: order.payment_method,
                paymentStatus: order.payment_status,
                orderedAt: order.created_at,
                estimatedDeliveryTime: order.estimated_delivery_time
            }));

            const { response, statusCode } = formatResponse(true, { orders: formattedOrders });
            res.status(statusCode).json(response);
        } catch (error) {
            console.error('Get orders error:', error);
            const { response, statusCode } = formatError('Failed to get orders', HTTP_STATUS.INTERNAL_SERVER_ERROR);
            res.status(statusCode).json(response);
        }
    }

    // Get order details with tracking
    async getOrderDetails(req, res) {
        try {
            const { orderId } = req.params;
            const userId = req.user.id;

            // Get order details
            const order = await db.get(
                `SELECT o.*, r.name as restaurant_name, r.phone as restaurant_phone, r.image_url as restaurant_image,
                        a.address_line1, a.address_line2, a.city, a.state, a.pincode,
                        dp.name as delivery_partner_name, dp.phone as delivery_partner_phone
                FROM orders o
                JOIN restaurants r ON o.restaurant_id = r.id
                JOIN addresses a ON o.address_id = a.id
                LEFT JOIN delivery_partners dp ON o.delivery_partner_id = dp.id
                WHERE o.order_id = ? AND o.user_id = ?`,
                [orderId, userId]
            );

            if (!order) {
                const { response, statusCode } = formatError('Order not found', HTTP_STATUS.NOT_FOUND);
                return res.status(statusCode).json(response);
            }

            // Get order items
            const orderItems = await db.query(
                `SELECT oi.*, mi.name, mi.image_url, mi.is_veg
                FROM order_items oi
                JOIN menu_items mi ON oi.menu_item_id = mi.id
                WHERE oi.order_id = ?`,
                [order.id]
            );

            // Get order tracking
            const tracking = await db.query(
                'SELECT status, timestamp, notes FROM order_tracking WHERE order_id = ? ORDER BY timestamp',
                [order.id]
            );

            // Format response
            const deliveryAddress = `${order.address_line1}${order.address_line2 ? ', ' + order.address_line2 : ''}, ${order.city}, ${order.state} - ${order.pincode}`;

            const formattedOrder = {
                orderId: order.order_id,
                restaurant: {
                    name: order.restaurant_name,
                    phone: order.restaurant_phone,
                    image: order.restaurant_image
                },
                items: orderItems.map(item => ({
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                    total: item.quantity * item.price,
                    image: item.image_url,
                    isVeg: item.is_veg === 1,
                    specialInstructions: item.special_instructions
                })),
                deliveryAddress,
                subtotal: order.subtotal,
                deliveryFee: order.delivery_fee,
                taxAmount: order.tax_amount,
                totalAmount: order.total_amount,
                paymentMethod: order.payment_method,
                paymentStatus: order.payment_status,
                status: order.order_status,
                specialInstructions: order.special_instructions,
                estimatedDeliveryTime: order.estimated_delivery_time,
                orderedAt: order.created_at,
                tracking: tracking.map(t => ({
                    status: t.status,
                    timestamp: t.timestamp,
                    notes: t.notes
                }))
            };

            if (order.delivery_partner_name) {
                formattedOrder.deliveryPartner = {
                    name: order.delivery_partner_name,
                    phone: order.delivery_partner_phone
                };
            }

            const { response, statusCode } = formatResponse(true, { order: formattedOrder });
            res.status(statusCode).json(response);
        } catch (error) {
            console.error('Get order details error:', error);
            const { response, statusCode } = formatError('Failed to get order details', HTTP_STATUS.INTERNAL_SERVER_ERROR);
            res.status(statusCode).json(response);
        }
    }

    // Cancel order
    async cancelOrder(req, res) {
        try {
            const { orderId } = req.params;
            const userId = req.user.id;

            const order = await db.get(
                'SELECT id, order_status FROM orders WHERE order_id = ? AND user_id = ?',
                [orderId, userId]
            );

            if (!order) {
                const { response, statusCode } = formatError('Order not found', HTTP_STATUS.NOT_FOUND);
                return res.status(statusCode).json(response);
            }

            // Check if order can be cancelled
            if ([ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED].includes(order.order_status)) {
                const { response, statusCode } = formatError('Order cannot be cancelled', HTTP_STATUS.CONFLICT);
                return res.status(statusCode).json(response);
            }

            // Update order status
            await db.run(
                'UPDATE orders SET order_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [ORDER_STATUS.CANCELLED, order.id]
            );

            // Add tracking entry
            await db.run(
                'INSERT INTO order_tracking (order_id, status, notes) VALUES (?, ?, ?)',
                [order.id, ORDER_STATUS.CANCELLED, 'Order cancelled by customer']
            );

            const { response, statusCode } = formatResponse(true, null, 'Order cancelled successfully');
            res.status(statusCode).json(response);
        } catch (error) {
            console.error('Cancel order error:', error);
            const { response, statusCode } = formatError('Failed to cancel order', HTTP_STATUS.INTERNAL_SERVER_ERROR);
            res.status(statusCode).json(response);
        }
    }
}

module.exports = new OrderController();