require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const addressRoutes = require('./src/routes/addressRoutes');
const restaurantRoutes = require('./src/routes/restaurantRoutes');
const cartRoutes = require('./src/routes/cartRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const reviewRoutes = require('./src/routes/reviewRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');

// Import middleware
const errorHandler = require('./src/middleware/errorHandler');

const app = express();

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*'
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.'
    }
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
}


// API routes
const apiPrefix = process.env.API_PREFIX || '/api';

app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/addresses`, addressRoutes);
app.use(`${apiPrefix}/restaurants`, restaurantRoutes);
app.use(`${apiPrefix}/cart`, cartRoutes);
app.use(`${apiPrefix}/orders`, orderRoutes);
app.use(`${apiPrefix}/reviews`, reviewRoutes);
app.use(`${apiPrefix}/payments`, paymentRoutes);

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        path: req.originalUrl
    });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`🚀 Food Delivery API server is running on port ${PORT}`);
    });
}

module.exports = app;