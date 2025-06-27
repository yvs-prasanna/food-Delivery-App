const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'food_delivery.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to database for seeding.');
});

const seedData = async () => {
    try {
        // Hash password for demo users
        const hashedPassword = await bcrypt.hash('password123', 10);

        db.serialize(() => {
            // Seed Users
            const users = [
                ['John Doe', 'john@example.com', hashedPassword, '+91-9876543210'],
                ['Jane Smith', 'jane@example.com', hashedPassword, '+91-9876543211'],
                ['Bob Johnson', 'bob@example.com', hashedPassword, '+91-9876543212']
            ];

            const userStmt = db.prepare('INSERT INTO users (name, email, password_hash, phone) VALUES (?, ?, ?, ?)');
            users.forEach(user => userStmt.run(user));
            userStmt.finalize();

            // Seed Addresses
            const addresses = [
                [1, 'home', '123 Main Street', 'Apt 4B', 'Mumbai', 'Maharashtra', '400001', 19.0760, 72.8777, 1],
                [1, 'work', '456 Business Park', 'Floor 3', 'Mumbai', 'Maharashtra', '400002', 19.0820, 72.8820, 0],
                [2, 'home', '789 Residential Complex', 'Block A', 'Mumbai', 'Maharashtra', '400003', 19.0700, 72.8700, 1]
            ];

            const addressStmt = db.prepare('INSERT INTO addresses (user_id, type, address_line1, address_line2, city, state, pincode, latitude, longitude, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            addresses.forEach(address => addressStmt.run(address));
            addressStmt.finalize();

            // Seed Restaurants
            const restaurants = [
                ['Pizza Paradise', 'Best pizzas in town with authentic Italian flavors', '["Italian", "Fast Food"]', '123 Food Street', '', 'Mumbai', 'Maharashtra', '400001', 19.0760, 72.8777, '+91-9876543220', 'info@pizzaparadise.com', 200, 40, 30, 4.2, 1250, 1, 1, 'https://images.pexels.com/photos/315755/pexels-photo-315755.jpeg'],
                ['Burger Barn', 'Juicy burgers and crispy fries', '["American", "Fast Food"]', '456 Burger Lane', '', 'Mumbai', 'Maharashtra', '400002', 19.0820, 72.8820, '+91-9876543221', 'info@burgerbarn.com', 150, 30, 25, 4.0, 890, 1, 1, 'https://images.pexels.com/photos/1639562/pexels-photo-1639562.jpeg'],
                ['Spice Route', 'Authentic Indian cuisine with traditional spices', '["Indian", "North Indian", "South Indian"]', '789 Spice Avenue', '', 'Mumbai', 'Maharashtra', '400003', 19.0700, 72.8700, '+91-9876543222', 'info@spiceroute.com', 300, 45, 35, 4.5, 2100, 1, 1, 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg'],
                ['Sushi Station', 'Fresh sushi and Japanese delicacies', '["Japanese", "Sushi"]', '321 Sushi Street', '', 'Mumbai', 'Maharashtra', '400004', 19.0840, 72.8840, '+91-9876543223', 'info@sushistation.com', 400, 50, 40, 4.3, 750, 1, 1, 'https://images.pexels.com/photos/357756/pexels-photo-357756.jpeg'],
                ['Taco Fiesta', 'Mexican food with authentic flavors', '["Mexican", "Fast Food"]', '654 Taco Boulevard', '', 'Mumbai', 'Maharashtra', '400005', 19.0680, 72.8680, '+91-9876543224', 'info@tacofiesta.com', 180, 35, 20, 4.1, 650, 1, 1, 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg']
            ];

            const restaurantStmt = db.prepare('INSERT INTO restaurants (name, description, cuisine_types, address_line1, address_line2, city, state, pincode, latitude, longitude, phone, email, min_order_amount, delivery_fee, avg_preparation_time, rating, total_reviews, is_open, is_active, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            restaurants.forEach(restaurant => restaurantStmt.run(restaurant));
            restaurantStmt.finalize();

            // Seed Restaurant Hours (All restaurants open 11 AM to 11 PM)
            const hours = [];
            for (let restaurantId = 1; restaurantId <= 5; restaurantId++) {
                for (let day = 0; day < 7; day++) {
                    hours.push([restaurantId, day, '11:00', '23:00', 0]);
                }
            }

            const hoursStmt = db.prepare('INSERT INTO restaurant_hours (restaurant_id, day_of_week, open_time, close_time, is_closed) VALUES (?, ?, ?, ?, ?)');
            hours.forEach(hour => hoursStmt.run(hour));
            hoursStmt.finalize();

            // Seed Menu Categories
            const categories = [
                // Pizza Paradise
                [1, 'Pizzas', 'Our signature pizzas', 1, 1],
                [1, 'Starters', 'Perfect to start your meal', 2, 1],
                [1, 'Beverages', 'Refreshing drinks', 3, 1],
                // Burger Barn
                [2, 'Burgers', 'Juicy and delicious burgers', 1, 1],
                [2, 'Sides', 'Perfect accompaniments', 2, 1],
                [2, 'Milkshakes', 'Creamy and thick milkshakes', 3, 1],
                // Spice Route
                [3, 'Starters', 'Traditional Indian appetizers', 1, 1],
                [3, 'Main Course', 'Hearty Indian dishes', 2, 1],
                [3, 'Rice & Biryani', 'Aromatic rice dishes', 3, 1],
                [3, 'Breads', 'Fresh Indian breads', 4, 1],
                // Sushi Station
                [4, 'Sushi Rolls', 'Fresh sushi rolls', 1, 1],
                [4, 'Sashimi', 'Fresh fish slices', 2, 1],
                [4, 'Appetizers', 'Japanese starters', 3, 1],
                // Taco Fiesta
                [5, 'Tacos', 'Authentic Mexican tacos', 1, 1],
                [5, 'Burritos', 'Hearty Mexican burritos', 2, 1],
                [5, 'Sides', 'Mexican sides', 3, 1]
            ];

            const categoryStmt = db.prepare('INSERT INTO menu_categories (restaurant_id, name, description, display_order, is_active) VALUES (?, ?, ?, ?, ?)');
            categories.forEach(category => categoryStmt.run(category));
            categoryStmt.finalize();

            // Seed Menu Items
            const menuItems = [
                // Pizza Paradise
                [1, 1, 'Margherita Pizza', 'Classic pizza with mozzarella and basil', 299, 1, 1, 'https://images.pexels.com/photos/315755/pexels-photo-315755.jpeg', 15],
                [1, 1, 'Pepperoni Pizza', 'Spicy pepperoni with cheese', 399, 0, 1, 'https://images.pexels.com/photos/708587/pexels-photo-708587.jpeg', 15],
                [1, 1, 'Veggie Supreme', 'Loaded with fresh vegetables', 449, 1, 1, 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg', 18],
                [1, 2, 'Garlic Bread', 'Crispy garlic bread with herbs', 149, 1, 1, 'https://images.pexels.com/photos/1633525/pexels-photo-1633525.jpeg', 10],
                [1, 2, 'Chicken Wings', 'Spicy buffalo wings', 249, 0, 1, 'https://images.pexels.com/photos/1359315/pexels-photo-1359315.jpeg', 12],
                [1, 3, 'Coca Cola', 'Refreshing cola drink', 49, 1, 1, '', 2],
                [1, 3, 'Fresh Lime Soda', 'Tangy lime soda', 69, 1, 1, '', 3],

                // Burger Barn
                [2, 4, 'Classic Beef Burger', 'Juicy beef patty with lettuce and tomato', 329, 0, 1, 'https://images.pexels.com/photos/1639562/pexels-photo-1639562.jpeg', 15],
                [2, 4, 'Chicken Burger', 'Grilled chicken breast burger', 299, 0, 1, 'https://images.pexels.com/photos/1633578/pexels-photo-1633578.jpeg', 15],
                [2, 4, 'Veggie Burger', 'Plant-based patty with fresh veggies', 249, 1, 1, 'https://images.pexels.com/photos/1639565/pexels-photo-1639565.jpeg', 12],
                [2, 5, 'French Fries', 'Golden crispy fries', 99, 1, 1, 'https://images.pexels.com/photos/1893556/pexels-photo-1893556.jpeg', 8],
                [2, 5, 'Onion Rings', 'Crispy battered onion rings', 129, 1, 1, 'https://images.pexels.com/photos/1893555/pexels-photo-1893555.jpeg', 10],
                [2, 6, 'Chocolate Milkshake', 'Rich chocolate milkshake', 149, 1, 1, 'https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg', 5],
                [2, 6, 'Strawberry Milkshake', 'Fresh strawberry milkshake', 149, 1, 1, 'https://images.pexels.com/photos/1337826/pexels-photo-1337826.jpeg', 5],

                // Spice Route
                [3, 7, 'Samosa', 'Crispy pastry with spiced filling', 89, 1, 1, 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg', 8],
                [3, 7, 'Pakora', 'Mixed vegetable fritters', 129, 1, 1, 'https://images.pexels.com/photos/1640778/pexels-photo-1640778.jpeg', 10],
                [3, 8, 'Butter Chicken', 'Creamy tomato-based chicken curry', 349, 0, 1, 'https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg', 25],
                [3, 8, 'Paneer Makhani', 'Cottage cheese in rich tomato gravy', 299, 1, 1, 'https://images.pexels.com/photos/2474662/pexels-photo-2474662.jpeg', 20],
                [3, 9, 'Chicken Biryani', 'Fragrant rice with spiced chicken', 399, 0, 1, 'https://images.pexels.com/photos/2474663/pexels-photo-2474663.jpeg', 30],
                [3, 9, 'Vegetable Biryani', 'Aromatic rice with mixed vegetables', 329, 1, 1, 'https://images.pexels.com/photos/2474664/pexels-photo-2474664.jpeg', 25],
                [3, 10, 'Naan', 'Soft Indian bread', 49, 1, 1, 'https://images.pexels.com/photos/2474665/pexels-photo-2474665.jpeg', 8],
                [3, 10, 'Garlic Naan', 'Naan with garlic and herbs', 69, 1, 1, 'https://images.pexels.com/photos/2474666/pexels-photo-2474666.jpeg', 10]
            ];

            const itemStmt = db.prepare('INSERT INTO menu_items (restaurant_id, category_id, name, description, price, is_veg, is_available, image_url, prep_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
            menuItems.forEach(item => itemStmt.run(item));
            itemStmt.finalize();

            // Seed Delivery Partners
            const deliveryPartners = [
                ['Raj Kumar', '+91-9876543230', 'raj@delivery.com', 'bike', 'MH12AB1234', 'DL123456789', 19.0760, 72.8777, 'available', 4.5, 150, 1],
                ['Priya Sharma', '+91-9876543231', 'priya@delivery.com', 'scooter', 'MH12CD5678', 'DL987654321', 19.0820, 72.8820, 'available', 4.3, 120, 1],
                ['Amit Singh', '+91-9876543232', 'amit@delivery.com', 'bike', 'MH12EF9012', 'DL456789123', 19.0700, 72.8700, 'busy', 4.7, 200, 1]
            ];

            const deliveryStmt = db.prepare('INSERT INTO delivery_partners (name, phone, email, vehicle_type, vehicle_number, license_number, current_latitude, current_longitude, status, rating, total_deliveries, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            deliveryPartners.forEach(partner => deliveryStmt.run(partner));
            deliveryStmt.finalize();

            console.log('Database seeded successfully!');
        });

    } catch (error) {
        console.error('Error seeding database:', error);
    } finally {
        db.close();
    }
};

seedData();