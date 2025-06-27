const db = require('../config/database');
const { formatResponse, formatError, calculateDistance, parseJSON, isRestaurantOpen } = require('../utils/helpers');
const { HTTP_STATUS } = require('../utils/constants');

class RestaurantController {
    // Get restaurants near user location
    async getNearbyRestaurants(req, res) {
        try {
            const { lat, lng, radius = 10, cuisine, search, veg_only, rating } = req.query;

            if (!lat || !lng) {
                const { response, statusCode } = formatError('Latitude and longitude are required', HTTP_STATUS.BAD_REQUEST);
                return res.status(statusCode).json(response);
            }

            const userLat = parseFloat(lat);
            const userLng = parseFloat(lng);
            const searchRadius = parseFloat(radius);

            let query = `
                SELECT r.*, 
                    CASE WHEN r.is_open = 1 THEN 'Open' ELSE 'Closed' END as status
                FROM restaurants r 
                WHERE r.is_active = 1
            `;

            const queryParams = [];

            // Add cuisine filter
            if (cuisine) {
                query += ' AND r.cuisine_types LIKE ?';
                queryParams.push(`%${cuisine}%`);
            }

            // Add search filter
            if (search) {
                query += ' AND (r.name LIKE ? OR r.description LIKE ?)';
                queryParams.push(`%${search}%`, `%${search}%`);
            }

            // Add rating filter
            if (rating) {
                query += ' AND r.rating >= ?';
                queryParams.push(parseFloat(rating));
            }

            query += ' ORDER BY r.rating DESC';

            const restaurants = await db.query(query, queryParams);

            // Filter by distance and add distance info
            const nearbyRestaurants = restaurants
                .map(restaurant => {
                    const distance = calculateDistance(userLat, userLng, restaurant.latitude, restaurant.longitude);
                    return {
                        ...restaurant,
                        distance: Math.round(distance * 10) / 10, // Round to 1 decimal place
                        distanceText: `${Math.round(distance * 10) / 10} km`
                    };
                })
                .filter(restaurant => restaurant.distance <= searchRadius)
                .sort((a, b) => a.distance - b.distance);

            // Filter veg-only restaurants if requested
            let filteredRestaurants = nearbyRestaurants;
            if (veg_only === 'true') {
                // This would require checking menu items, for now we'll return all
                filteredRestaurants = nearbyRestaurants;
            }

            // Format response
            const formattedRestaurants = filteredRestaurants.map(restaurant => ({
                id: restaurant.id,
                name: restaurant.name,
                cuisine: parseJSON(restaurant.cuisine_types, []),
                rating: restaurant.rating,
                totalReviews: restaurant.total_reviews,
                avgDeliveryTime: `${restaurant.avg_preparation_time}-${restaurant.avg_preparation_time + 10} mins`,
                minOrder: restaurant.min_order_amount,
                deliveryFee: restaurant.delivery_fee,
                image: restaurant.image_url,
                isOpen: restaurant.is_open === 1,
                distance: restaurant.distanceText,
                description: restaurant.description
            }));

            const { response, statusCode } = formatResponse(true, {
                count: formattedRestaurants.length,
                restaurants: formattedRestaurants
            });

            res.status(statusCode).json(response);
        } catch (error) {
            console.error('Get nearby restaurants error:', error);
            const { response, statusCode } = formatError('Failed to get restaurants', HTTP_STATUS.INTERNAL_SERVER_ERROR);
            res.status(statusCode).json(response);
        }
    }

    // Get restaurant details with menu
    async getRestaurantDetails(req, res) {
        try {
            const { id } = req.params;

            // Get restaurant details
            const restaurant = await db.get(
                'SELECT * FROM restaurants WHERE id = ? AND is_active = 1',
                [id]
            );

            if (!restaurant) {
                const { response, statusCode } = formatError('Restaurant not found', HTTP_STATUS.NOT_FOUND);
                return res.status(statusCode).json(response);
            }

            // Get restaurant operating hours
            const operatingHours = await db.query(
                'SELECT * FROM restaurant_hours WHERE restaurant_id = ? ORDER BY day_of_week',
                [id]
            );

            // Get menu categories and items
            const categories = await db.query(
                `SELECT c.*, 
                    json_group_array(
                        json_object(
                            'id', mi.id,
                            'name', mi.name,
                            'description', mi.description,
                            'price', mi.price,
                            'isVeg', mi.is_veg,
                            'isAvailable', mi.is_available,
                            'image', mi.image_url,
                            'prepTime', mi.prep_time
                        )
                    ) as items
                FROM menu_categories c
                LEFT JOIN menu_items mi ON c.id = mi.category_id AND mi.is_available = 1
                WHERE c.restaurant_id = ? AND c.is_active = 1
                GROUP BY c.id
                ORDER BY c.display_order`,
                [id]
            );

            // Format operating hours
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const formattedHours = {};
            operatingHours.forEach(hour => {
                const dayName = days[hour.day_of_week].toLowerCase();
                if (hour.is_closed) {
                    formattedHours[dayName] = 'Closed';
                } else {
                    formattedHours[dayName] = `${hour.open_time} - ${hour.close_time}`;
                }
            });

            // Format menu
            const formattedMenu = categories.map(category => ({
                category: category.name,
                items: parseJSON(category.items, []).filter(item => item.id !== null)
            }));

            // Check if restaurant is currently open
            const isCurrentlyOpen = isRestaurantOpen(operatingHours);

            const { response, statusCode } = formatResponse(true, {
                restaurant: {
                    id: restaurant.id,
                    name: restaurant.name,
                    cuisine: parseJSON(restaurant.cuisine_types, []),
                    rating: restaurant.rating,
                    totalReviews: restaurant.total_reviews,
                    description: restaurant.description,
                    address: `${restaurant.address_line1}, ${restaurant.city}`,
                    phone: restaurant.phone,
                    email: restaurant.email,
                    minOrder: restaurant.min_order_amount,
                    deliveryFee: restaurant.delivery_fee,
                    avgDeliveryTime: `${restaurant.avg_preparation_time}-${restaurant.avg_preparation_time + 10} mins`,
                    image: restaurant.image_url,
                    isOpen: isCurrentlyOpen,
                    operatingHours: formattedHours,
                    menu: formattedMenu
                }
            });

            res.status(statusCode).json(response);
        } catch (error) {
            console.error('Get restaurant details error:', error);
            const { response, statusCode } = formatError('Failed to get restaurant details', HTTP_STATUS.INTERNAL_SERVER_ERROR);
            res.status(statusCode).json(response);
        }
    }

    // Search restaurants and dishes
    async search(req, res) {
        try {
            const { query: searchQuery, lat, lng } = req.query;

            if (!searchQuery) {
                const { response, statusCode } = formatError('Search query is required', HTTP_STATUS.BAD_REQUEST);
                return res.status(statusCode).json(response);
            }

            const userLat = lat ? parseFloat(lat) : null;
            const userLng = lng ? parseFloat(lng) : null;

            // Search restaurants
            const restaurants = await db.query(
                `SELECT r.*, 
                    CASE WHEN r.is_open = 1 THEN 'Open' ELSE 'Closed' END as status
                FROM restaurants r 
                WHERE r.is_active = 1 AND (r.name LIKE ? OR r.description LIKE ? OR r.cuisine_types LIKE ?)
                ORDER BY r.rating DESC`,
                [`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`]
            );

            // Search dishes
            const dishes = await db.query(
                `SELECT mi.*, r.name as restaurant_name, r.rating as restaurant_rating
                FROM menu_items mi
                JOIN restaurants r ON mi.restaurant_id = r.id
                WHERE mi.is_available = 1 AND r.is_active = 1 AND r.is_open = 1
                AND (mi.name LIKE ? OR mi.description LIKE ?)
                ORDER BY r.rating DESC`,
                [`%${searchQuery}%`, `%${searchQuery}%`]
            );

            // Format restaurants
            const formattedRestaurants = restaurants.map(restaurant => {
                let distance = null;
                let distanceText = null;

                if (userLat && userLng) {
                    distance = calculateDistance(userLat, userLng, restaurant.latitude, restaurant.longitude);
                    distanceText = `${Math.round(distance * 10) / 10} km`;
                }

                return {
                    id: restaurant.id,
                    name: restaurant.name,
                    cuisine: parseJSON(restaurant.cuisine_types, []),
                    rating: restaurant.rating,
                    totalReviews: restaurant.total_reviews,
                    avgDeliveryTime: `${restaurant.avg_preparation_time}-${restaurant.avg_preparation_time + 10} mins`,
                    minOrder: restaurant.min_order_amount,
                    deliveryFee: restaurant.delivery_fee,
                    image: restaurant.image_url,
                    isOpen: restaurant.is_open === 1,
                    distance: distanceText
                };
            });

            // Format dishes
            const formattedDishes = dishes.map(dish => ({
                itemId: dish.id,
                name: dish.name,
                description: dish.description,
                restaurantId: dish.restaurant_id,
                restaurantName: dish.restaurant_name,
                price: dish.price,
                rating: dish.restaurant_rating,
                image: dish.image_url,
                isVeg: dish.is_veg === 1
            }));

            const { response, statusCode } = formatResponse(true, {
                restaurants: formattedRestaurants,
                dishes: formattedDishes
            });

            res.status(statusCode).json(response);
        } catch (error) {
            console.error('Search error:', error);
            const { response, statusCode } = formatError('Search failed', HTTP_STATUS.INTERNAL_SERVER_ERROR);
            res.status(statusCode).json(response);
        }
    }
}

module.exports = new RestaurantController();