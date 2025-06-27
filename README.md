# Food Delivery Platform - Backend API

A complete backend API for a food delivery platform similar to Swiggy, built with Node.js, Express.js, and SQLite.

## 🚀 Features

- **User Authentication**: JWT-based authentication with registration and login
- **Restaurant Management**: Browse restaurants, view menus, and search functionality
- **Cart Management**: Add items to cart, update quantities, and manage cart state
- **Order Management**: Place orders, track status, and view order history
- **Address Management**: Multiple delivery addresses per user
- **Payment Processing**: Support for multiple payment methods (cash, card, UPI, wallet)
- **Review System**: Rate restaurants and provide feedback
- **Search Functionality**: Search restaurants and dishes
- **Real-time Order Tracking**: Track order status from placement to delivery

## 🛠 Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite3
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Express-validator
- **Security**: Helmet, CORS, Rate limiting
- **Password Hashing**: bcryptjs

## 📁 Project Structure

```
food-delivery-backend/
├── src/
│   ├── config/
│   │   └── database.js              # Database configuration
│   ├── controllers/
│   │   ├── authController.js        # Authentication logic
│   │   ├── restaurantController.js  # Restaurant operations
│   │   ├── cartController.js        # Cart management
│   │   ├── orderController.js       # Order processing
│   │   ├── addressController.js     # Address management
│   │   ├── reviewController.js      # Review system
│   │   └── paymentController.js     # Payment processing
│   ├── middleware/
│   │   ├── auth.js                  # Authentication middleware
│   │   ├── validation.js            # Input validation
│   │   └── errorHandler.js          # Error handling
│   ├── routes/
│   │   ├── authRoutes.js            # Authentication routes
│   │   ├── restaurantRoutes.js      # Restaurant routes
│   │   ├── cartRoutes.js            # Cart routes
│   │   ├── orderRoutes.js           # Order routes
│   │   ├── addressRoutes.js         # Address routes
│   │   ├── reviewRoutes.js          # Review routes
│   │   └── paymentRoutes.js         # Payment routes
│   ├── utils/
│   │   ├── helpers.js               # Utility functions
│   │   └── constants.js             # Application constants
│   └── app.js                       # Express app configuration
├── database/
│   ├── schema.sql                   # Database schema
│   ├── setup.js                     # Database setup script
│   └── seed.js                      # Seed data script
├── .env                             # Environment variables
├── .gitignore
├── package.json
└── README.md
```

## 🔧 Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yvs-prasanna/food-Delivery-App.git
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory (already provided):
   ```env
   PORT=3000
   NODE_ENV=development
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=7d
   DB_PATH=./database/food_delivery.db
   API_PREFIX=/api
   CORS_ORIGIN=*
   ```

4. **Set up the database**
   ```bash
   npm run setup
   ```

5. **Seed the database with sample data**
   ```bash
   npm run seed
   ```

6. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

The API will be available at `http://localhost:3000`

## 🗄️ Database Design

### Key Entities

1. **Users** - Customer information and authentication
2. **Addresses** - Multiple delivery addresses per user
3. **Restaurants** - Restaurant details and location
4. **Menu Categories** - Grouping of menu items
5. **Menu Items** - Food items with pricing and details
6. **Cart Items** - User's cart with selected items
7. **Orders** - Order information and status
8. **Order Items** - Individual items in an order
9. **Delivery Partners** - Delivery personnel information
10. **Order Tracking** - Status updates for orders
11. **Payments** - Payment transactions
12. **Reviews** - Restaurant and delivery ratings

### Design Decisions

- **SQLite** for simplicity and easy deployment
- **JWT tokens** for stateless authentication
- **Cart persistence** across sessions
- **Order status tracking** with timestamps
- **Price storage** at time of order to handle price changes
- **Location-based** restaurant filtering using Haversine formula
- **Rating system** for restaurants with automatic calculation

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register

{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "phone": "+91-9876543210"
}
```

#### Login User
```http
POST /api/auth/login

{
    "email": "john@example.com",
    "password": "password123"
}
```

### Restaurant Endpoints

#### Get Nearby Restaurants
```http
GET /api/restaurants?lat=19.0760&lng=72.8777&radius=10&cuisine=Italian&search=pizza&veg_only=true&rating=4
```

#### Get Restaurant Details
```http
GET /api/restaurants/1
```

### Cart Endpoints

#### Add Item to Cart
```http
POST /api/cart/add
Authorization: Bearer <token>

{
    "restaurantId": 1,
    "itemId": 1,
    "quantity": 2,
    "specialInstructions": "Extra cheese please"
}
```

#### Get Cart
```http
GET /api/cart
Authorization: Bearer <token>
```

### Order Endpoints

#### Create Order
```http
POST /api/orders/create
Authorization: Bearer <token>

{
    "addressId": 1,
    "paymentMethod": "cash",
    "specialInstructions": "Please call before delivery"
}
```

#### Get Order History
```http
GET /api/orders
Authorization: Bearer <token>
```

#### Get Order Details
```http
GET /api/orders/ORD123456
Authorization: Bearer <token>
```

### Address Endpoints

#### Add Address
```http
POST /api/addresses
Authorization: Bearer <token>

{
    "type": "home",
    "addressLine1": "123 Main Street",
    "addressLine2": "Apt 4B",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "latitude": 19.0760,
    "longitude": 72.8777
}
```

### Review Endpoints

#### Add Review
```http
POST /api/reviews/restaurant
Authorization: Bearer <token>

{
    "orderId": "ORD123456",
    "restaurantRating": 4,
    "foodRating": 5,
    "deliveryRating": 4,
    "comment": "Great food, timely delivery!"
}
```

## 🧪 Testing

Test the API using tools like:
- **Postman** - Import the collection for easy testing.....
  Post man Collection is provided in the code
  ### Food Delivery App.postman_collection.json

### Sample Test Workflow

1. Register a new user
2. Login to get JWT token
3. Add delivery address
4. Browse restaurants
5. Add items to cart
6. Create order
7. Track order status
8. Add review after delivery

## 🔒 Security Features

- **JWT Authentication** - Stateless authentication
- **Password Hashing** - bcryptjs for secure password storage
- **Input Validation** - Express-validator for request validation
- **Rate Limiting** - Prevent API abuse
- **CORS** - Cross-origin resource sharing
- **Helmet** - Security headers
- **SQL Injection Protection** - Parameterized queries

## 🚀 Production Deployment

1. **Environment Setup**
   - Set `NODE_ENV=production`
   - Use strong JWT secret
   - Configure proper CORS origins
   - Set up rate limiting

2. **Database**
   - Consider migrating to PostgreSQL/MySQL for production
   - Set up proper database backups
   - Configure connection pooling

3. **Monitoring**
   - Add logging with Winston
   - Set up health checks
   - Monitor API performance

## 🔄 Order Status Flow

1. **placed** - Order received
2. **confirmed** - Restaurant confirmed
3. **preparing** - Food being prepared
4. **ready** - Ready for pickup
5. **out_for_delivery** - Delivery partner assigned
6. **delivered** - Order completed
7. **cancelled** - Order cancelled

## 💳 Payment Methods

- **Cash** - Cash on delivery
- **Card** - Credit/Debit card
- **UPI** - Unified Payments Interface
- **Wallet** - Digital wallets

## 📊 Sample Data

The database is seeded with:
- 3 demo users (password: `password123`)
- 5 restaurants with different cuisines
- 20+ menu items per restaurant
- Sample delivery partners
- Operating hours for all restaurants

## 🤝 Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support, email support@fooddelivery.com or create an issue in the repository.

---

**Happy Coding! 🍕🚀**
