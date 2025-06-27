const db = require('../config/database');
const { formatResponse, formatError } = require('../utils/helpers');
const { HTTP_STATUS } = require('../utils/constants');

class CartController {
    async getCartSummary(userId) {
        const cartItems = await db.query(
            `SELECT ci.quantity, mi.price, r.delivery_fee
            FROM cart_items ci
            JOIN menu_items mi ON ci.menu_item_id = mi.id
            JOIN restaurants r ON ci.restaurant_id = r.id
            WHERE ci.user_id = ?`,
            [userId]
        );

        if (cartItems.length === 0) {
            return { total: 0, itemCount: 0, subtotal: 0, deliveryFee: 0 };
        }

        const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const deliveryFee = cartItems[0].delivery_fee;
        const total = subtotal + deliveryFee;
        const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

        return { total, itemCount, subtotal, deliveryFee };
    }

    // Add item to cart
    async addToCart(req, res) {
        try {
            const { restaurantId, itemId, quantity, specialInstructions } = req.body;
            const userId = req.user.id;

            // Check if restaurant exists and is active
            const restaurant = await db.get(
                'SELECT id, name, is_open, is_active FROM restaurants WHERE id = ?',
                [restaurantId]
            );

            if (!restaurant) {
                const { response, statusCode } = formatError('Restaurant not found', HTTP_STATUS.NOT_FOUND);
                return res.status(statusCode).json(response);
            }

            if (!restaurant.is_active || !restaurant.is_open) {
                const { response, statusCode } = formatError('Restaurant is currently closed', HTTP_STATUS.CONFLICT);
                return res.status(statusCode).json(response);
            }

            // Check if menu item exists and is available
            const menuItem = await db.get(
                'SELECT id, name, price, is_available FROM menu_items WHERE id = ? AND restaurant_id = ?',
                [itemId, restaurantId]
            );

            if (!menuItem) {
                const { response, statusCode } = formatError('Menu item not found', HTTP_STATUS.NOT_FOUND);
                return res.status(statusCode).json(response);
            }

            if (!menuItem.is_available) {
                const { response, statusCode } = formatError('Menu item is currently unavailable', HTTP_STATUS.CONFLICT);
                return res.status(statusCode).json(response);
            }

            // Check if user has items from different restaurant in cart
            const existingCartItems = await db.query(
                'SELECT DISTINCT restaurant_id FROM cart_items WHERE user_id = ?',
                [userId]
            );

            if (existingCartItems.length > 0 && existingCartItems[0].restaurant_id !== restaurantId) {
                const { response, statusCode } = formatError(
                    'You can only order from one restaurant at a time. Please clear your cart first.',
                    HTTP_STATUS.CONFLICT
                );
                return res.status(statusCode).json(response);
            }

            // Check if item already exists in cart
            const existingItem = await db.get(
                'SELECT id, quantity FROM cart_items WHERE user_id = ? AND menu_item_id = ?',
                [userId, itemId]
            );

            if (existingItem) {
                // Update quantity
                const newQuantity = existingItem.quantity + quantity;
                await db.run(
                    'UPDATE cart_items SET quantity = ?, special_instructions = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [newQuantity, specialInstructions || null, existingItem.id]
                );
            } else {
                // Add new item
                await db.run(
                    'INSERT INTO cart_items (user_id, restaurant_id, menu_item_id, quantity, special_instructions) VALUES (?, ?, ?, ?, ?)',
                    [userId, restaurantId, itemId, quantity, specialInstructions || null]
                );
            }

            // Get updated cart totals
            const cartSummary = await this.getCartSummary(userId);

            const { response, statusCode } = formatResponse(true, {
                message: 'Item added to cart',
                cartTotal: cartSummary.total,
                itemCount: cartSummary.itemCount
            });

            res.status(statusCode).json(response);
        } catch (error) {
            console.error('Add to cart error:', error);
            const { response, statusCode } = formatError('Failed to add item to cart', HTTP_STATUS.INTERNAL_SERVER_ERROR);
            res.status(statusCode).json(response);
        }
    }

    // Get user's cart
    async getCart(req, res) {
        try {
            const userId = req.user.id;

            const cartItems = await db.query(
                `SELECT ci.*, mi.name, mi.description, mi.price, mi.image_url, mi.is_veg,
                        r.name as restaurant_name, r.delivery_fee, r.min_order_amount
                FROM cart_items ci
                JOIN menu_items mi ON ci.menu_item_id = mi.id
                JOIN restaurants r ON ci.restaurant_id = r.id
                WHERE ci.user_id = ?
                ORDER BY ci.created_at DESC`,
                [userId]
            );

            if (cartItems.length === 0) {
                const { response, statusCode } = formatResponse(true, {
                    items: [],
                    subtotal: 0,
                    deliveryFee: 0,
                    total: 0,
                    itemCount: 0,
                    restaurant: null
                });
                return res.status(statusCode).json(response);
            }

            const restaurant = {
                id: cartItems[0].restaurant_id,
                name: cartItems[0].restaurant_name,
                deliveryFee: cartItems[0].delivery_fee,
                minOrderAmount: cartItems[0].min_order_amount
            };

            const items = cartItems.map(item => ({
                id: item.id,
                menuItemId: item.menu_item_id,
                name: item.name,
                description: item.description,
                price: item.price,
                quantity: item.quantity,
                total: item.price * item.quantity,
                specialInstructions: item.special_instructions,
                image: item.image_url,
                isVeg: item.is_veg === 1
            }));

            const subtotal = items.reduce((sum, item) => sum + item.total, 0);
            const deliveryFee = restaurant.deliveryFee;
            const total = subtotal + deliveryFee;
            const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

            const { response, statusCode } = formatResponse(true, {
                items,
                subtotal,
                deliveryFee,
                total,
                itemCount,
                restaurant,
                minOrderAmount: restaurant.minOrderAmount
            });

            res.status(statusCode).json(response);
        } catch (error) {
            console.error('Get cart error:', error);
            const { response, statusCode } = formatError('Failed to get cart', HTTP_STATUS.INTERNAL_SERVER_ERROR);
            res.status(statusCode).json(response);
        }
    }

    // Update cart item quantity
    async updateCartItem(req, res) {
        try {
            const { itemId } = req.params;
            const { quantity } = req.body;
            const userId = req.user.id;

            if (quantity < 1 || quantity > 10) {
                const { response, statusCode } = formatError('Quantity must be between 1 and 10', HTTP_STATUS.BAD_REQUEST);
                return res.status(statusCode).json(response);
            }

            const cartItem = await db.get(
                'SELECT id FROM cart_items WHERE id = ? AND user_id = ?',
                [itemId, userId]
            );

            if (!cartItem) {
                const { response, statusCode } = formatError('Cart item not found', HTTP_STATUS.NOT_FOUND);
                return res.status(statusCode).json(response);
            }

            await db.run(
                'UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [quantity, itemId]
            );

            const cartSummary = await this.getCartSummary(userId);

            const { response, statusCode } = formatResponse(true, {
                message: 'Cart item updated',
                cartTotal: cartSummary.total,
                itemCount: cartSummary.itemCount
            });

            res.status(statusCode).json(response);
        } catch (error) {
            console.error('Update cart item error:', error);
            const { response, statusCode } = formatError('Failed to update cart item', HTTP_STATUS.INTERNAL_SERVER_ERROR);
            res.status(statusCode).json(response);
        }
    }

    // Remove item from cart
    async removeFromCart(req, res) {
        try {
            const { itemId } = req.params;
            const userId = req.user.id;

            const cartItem = await db.get(
                'SELECT id FROM cart_items WHERE id = ? AND user_id = ?',
                [itemId, userId]
            );

            if (!cartItem) {
                const { response, statusCode } = formatError('Cart item not found', HTTP_STATUS.NOT_FOUND);
                return res.status(statusCode).json(response);
            }

            await db.run('DELETE FROM cart_items WHERE id = ?', [itemId]);

            const cartSummary = await this.getCartSummary(userId);

            const { response, statusCode } = formatResponse(true, {
                message: 'Item removed from cart',
                cartTotal: cartSummary.total,
                itemCount: cartSummary.itemCount
            });

            res.status(statusCode).json(response);
        } catch (error) {
            console.error('Remove from cart error:', error);
            const { response, statusCode } = formatError('Failed to remove item from cart', HTTP_STATUS.INTERNAL_SERVER_ERROR);
            res.status(statusCode).json(response);
        }
    }

    // Clear cart
    async clearCart(req, res) {
        try {
            const userId = req.user.id;

            await db.run('DELETE FROM cart_items WHERE user_id = ?', [userId]);

            const { response, statusCode } = formatResponse(true, null, 'Cart cleared successfully');
            res.status(statusCode).json(response);
        } catch (error) {
            console.error('Clear cart error:', error);
            const { response, statusCode } = formatError('Failed to clear cart', HTTP_STATUS.INTERNAL_SERVER_ERROR);
            res.status(statusCode).json(response);
        }
    }
}

module.exports = new CartController();