const db = require('../config/database');
const { formatResponse, formatError } = require('../utils/helpers');
const { HTTP_STATUS } = require('../utils/constants');

class ReviewController {
    // Add restaurant review
    async addReview(req, res) {
        try {
            const { orderId, restaurantRating, foodRating, deliveryRating, comment } = req.body;
            const userId = req.user.id;

            // Verify order exists and belongs to user
            const order = await db.get(
                'SELECT id, restaurant_id, order_status FROM orders WHERE order_id = ? AND user_id = ?',
                [orderId, userId]
            );

            if (!order) {
                const { response, statusCode } = formatError('Order not found', HTTP_STATUS.NOT_FOUND);
                return res.status(statusCode).json(response);
            }

            // Check if order is delivered
            if (order.order_status !== 'delivered') {
                const { response, statusCode } = formatError('You can only review delivered orders', HTTP_STATUS.BAD_REQUEST);
                return res.status(statusCode).json(response);
            }

            // Check if review already exists
            const existingReview = await db.get(
                'SELECT id FROM reviews WHERE order_id = ? AND user_id = ?',
                [order.id, userId]
            );

            if (existingReview) {
                const { response, statusCode } = formatError('You have already reviewed this order', HTTP_STATUS.CONFLICT);
                return res.status(statusCode).json(response);
            }

            // Add review
            await db.run(
                'INSERT INTO reviews (user_id, restaurant_id, order_id, restaurant_rating, food_rating, delivery_rating, comment) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [userId, order.restaurant_id, order.id, restaurantRating, foodRating, deliveryRating, comment]
            );

            // Update restaurant rating
            await this.updateRestaurantRating(order.restaurant_id);

            const { response, statusCode } = formatResponse(true, null, 'Review added successfully', HTTP_STATUS.CREATED);
            res.status(statusCode).json(response);
        } catch (error) {
            console.error('Add review error:', error);
            const { response, statusCode } = formatError('Failed to add review', HTTP_STATUS.INTERNAL_SERVER_ERROR);
            res.status(statusCode).json(response);
        }
    }

    // Get restaurant reviews
    async getRestaurantReviews(req, res) {
        try {
            const { restaurantId } = req.params;
            const { limit = 10, offset = 0 } = req.query;

            // Check if restaurant exists
            const restaurant = await db.get('SELECT id, name FROM restaurants WHERE id = ?', [restaurantId]);
            if (!restaurant) {
                const { response, statusCode } = formatError('Restaurant not found', HTTP_STATUS.NOT_FOUND);
                return res.status(statusCode).json(response);
            }

            // Get reviews
            const reviews = await db.query(
                `SELECT r.*, u.name as user_name, o.order_id
                FROM reviews r
                JOIN users u ON r.user_id = u.id
                JOIN orders o ON r.order_id = o.id
                WHERE r.restaurant_id = ?
                ORDER BY r.created_at DESC
                LIMIT ? OFFSET ?`,
                [restaurantId, parseInt(limit), parseInt(offset)]
            );

            // Get review statistics
            const stats = await db.get(
                `SELECT 
                    COUNT(*) as total_reviews,
                    AVG(restaurant_rating) as avg_restaurant_rating,
                    AVG(food_rating) as avg_food_rating,
                    AVG(delivery_rating) as avg_delivery_rating,
                    COUNT(CASE WHEN restaurant_rating = 5 THEN 1 END) as five_star,
                    COUNT(CASE WHEN restaurant_rating = 4 THEN 1 END) as four_star,
                    COUNT(CASE WHEN restaurant_rating = 3 THEN 1 END) as three_star,
                    COUNT(CASE WHEN restaurant_rating = 2 THEN 1 END) as two_star,
                    COUNT(CASE WHEN restaurant_rating = 1 THEN 1 END) as one_star
                FROM reviews WHERE restaurant_id = ?`,
                [restaurantId]
            );

            const formattedReviews = reviews.map(review => ({
                id: review.id,
                orderId: review.order_id,
                userName: review.user_name,
                restaurantRating: review.restaurant_rating,
                foodRating: review.food_rating,
                deliveryRating: review.delivery_rating,
                comment: review.comment,
                createdAt: review.created_at
            }));

            const { response, statusCode } = formatResponse(true, {
                reviews: formattedReviews,
                statistics: {
                    totalReviews: stats.total_reviews,
                    averageRating: {
                        restaurant: Math.round(stats.avg_restaurant_rating * 10) / 10,
                        food: Math.round(stats.avg_food_rating * 10) / 10,
                        delivery: Math.round(stats.avg_delivery_rating * 10) / 10
                    },
                    ratingDistribution: {
                        5: stats.five_star,
                        4: stats.four_star,
                        3: stats.three_star,
                        2: stats.two_star,
                        1: stats.one_star
                    }
                }
            });

            res.status(statusCode).json(response);
        } catch (error) {
            console.error('Get restaurant reviews error:', error);
            const { response, statusCode } = formatError('Failed to get reviews', HTTP_STATUS.INTERNAL_SERVER_ERROR);
            res.status(statusCode).json(response);
        }
    }

    // Update restaurant rating
    async updateRestaurantRating(restaurantId) {
        try {
            const stats = await db.get(
                'SELECT COUNT(*) as total_reviews, AVG(restaurant_rating) as avg_rating FROM reviews WHERE restaurant_id = ?',
                [restaurantId]
            );

            if (stats.total_reviews > 0) {
                await db.run(
                    'UPDATE restaurants SET rating = ?, total_reviews = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [Math.round(stats.avg_rating * 10) / 10, stats.total_reviews, restaurantId]
                );
            }
        } catch (error) {
            console.error('Update restaurant rating error:', error);
        }
    }
}

module.exports = new ReviewController();