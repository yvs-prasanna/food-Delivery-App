const { body, validationResult } = require('express-validator');
const { formatError } = require('../utils/helpers');
const { HTTP_STATUS } = require('../utils/constants');

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const { response, statusCode } = formatError(
            'Validation failed',
            HTTP_STATUS.BAD_REQUEST,
            errors.array()
        );
        return res.status(statusCode).json(response);
    }
    next();
};

// User registration validation
const validateUserRegistration = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
    body('phone')
        .isMobilePhone('en-IN')
        .withMessage('Please provide a valid phone number'),
    handleValidationErrors
];

// User login validation
const validateUserLogin = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    handleValidationErrors
];

// Address validation
const validateAddress = [
    body('type')
        .isIn(['home', 'work', 'other'])
        .withMessage('Address type must be home, work, or other'),
    body('addressLine1')
        .trim()
        .isLength({ min: 5, max: 100 })
        .withMessage('Address line 1 must be between 5 and 100 characters'),
    body('city')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('City must be between 2 and 50 characters'),
    body('state')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('State must be between 2 and 50 characters'),
    body('pincode')
        .isLength({ min: 6, max: 6 })
        .withMessage('Pincode must be exactly 6 characters'),
    body('latitude')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitude must be between -90 and 90'),
    body('longitude')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitude must be between -180 and 180'),
    handleValidationErrors
];

// Cart item validation
const validateCartItem = [
    body('restaurantId')
        .isInt({ min: 1 })
        .withMessage('Restaurant ID must be a positive integer'),
    body('itemId')
        .isInt({ min: 1 })
        .withMessage('Item ID must be a positive integer'),
    body('quantity')
        .isInt({ min: 1, max: 10 })
        .withMessage('Quantity must be between 1 and 10'),
    handleValidationErrors
];

// Order creation validation
const validateOrderCreation = [
    body('addressId')
        .isInt({ min: 1 })
        .withMessage('Address ID must be a positive integer'),
    body('paymentMethod')
        .isIn(['cash', 'card', 'upi', 'wallet'])
        .withMessage('Payment method must be cash, card, upi, or wallet'),
    handleValidationErrors
];

// Review validation
const validateReview = [
    body('orderId')
        .notEmpty()
        .withMessage('Order ID is required'),
    body('restaurantRating')
        .isInt({ min: 1, max: 5 })
        .withMessage('Restaurant rating must be between 1 and 5'),
    body('foodRating')
        .isInt({ min: 1, max: 5 })
        .withMessage('Food rating must be between 1 and 5'),
    body('deliveryRating')
        .isInt({ min: 1, max: 5 })
        .withMessage('Delivery rating must be between 1 and 5'),
    body('comment')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Comment must be less than 500 characters'),
    handleValidationErrors
];

module.exports = {
    validateUserRegistration,
    validateUserLogin,
    validateAddress,
    validateCartItem,
    validateOrderCreation,
    validateReview,
    handleValidationErrors
};