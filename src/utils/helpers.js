const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

/**
 * Hash password
 */
const hashPassword = async (password) => {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
};

/**
 * Compare password
 */
const comparePassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

/**
 * Generate JWT token
 */
const generateToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
};

/**
 * Verify JWT token
 */
const verifyToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
};

/**
 * Generate unique order ID
 */
const generateOrderId = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `ORD${timestamp.toUpperCase()}${random.toUpperCase()}`;
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers
    return distance;
};

const deg2rad = (deg) => {
    return deg * (Math.PI/180);
};

/**
 * Calculate delivery fee based on distance
 */
const calculateDeliveryFee = (distance, baseDeliveryFee = 40) => {
    if (distance <= 3) return baseDeliveryFee;
    if (distance <= 5) return baseDeliveryFee + 10;
    if (distance <= 10) return baseDeliveryFee + 20;
    return baseDeliveryFee + 30;
};

/**
 * Calculate estimated delivery time
 */
const calculateEstimatedDeliveryTime = (distance, prepTime = 30) => {
    const deliveryTime = Math.ceil(distance * 3); // 3 minutes per km
    return prepTime + deliveryTime;
};

/**
 * Format response
 */
const formatResponse = (success = true, data = null, message = null, statusCode = 200) => {
    const response = { success };
    
    if (message) response.message = message;
    if (data) {
        if (typeof data === 'object' && !Array.isArray(data)) {
            Object.assign(response, data);
        } else {
            response.data = data;
        }
    }
    
    return { response, statusCode };
};

/**
 * Format error response
 */
const formatError = (message, statusCode = 500, errors = null) => {
    const response = {
        success: false,
        message,
        ...(errors && { errors })
    };
    
    return { response, statusCode };
};

/**
 * Validate email format
 */
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Validate phone number format (Indian)
 */
const isValidPhone = (phone) => {
    const phoneRegex = /^(\+91[\s]?)?[0]?(91)?[789]\d{9}$/;
    return phoneRegex.test(phone.replace(/\s+/g, ''));
};

/**
 * Check if restaurant is open
 */
const isRestaurantOpen = (operatingHours) => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    
    const todayHours = operatingHours.find(h => h.day_of_week === currentDay);
    
    if (!todayHours || todayHours.is_closed) {
        return false;
    }
    
    return currentTime >= todayHours.open_time && currentTime <= todayHours.close_time;
};

/**
 * Parse JSON safely
 */
const parseJSON = (jsonString, defaultValue = null) => {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        return defaultValue;
    }
};

module.exports = {
    hashPassword,
    comparePassword,
    generateToken,
    verifyToken,
    generateOrderId,
    calculateDistance,
    calculateDeliveryFee,
    calculateEstimatedDeliveryTime,
    formatResponse,
    formatError,
    isValidEmail,
    isValidPhone,
    isRestaurantOpen,
    parseJSON
};