const { formatError } = require('../utils/helpers');
const { HTTP_STATUS } = require('../utils/constants');

const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(e => e.message);
        const { response, statusCode } = formatError('Validation Error', HTTP_STATUS.BAD_REQUEST, errors);
        return res.status(statusCode).json(response);
    }

    // Duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        const { response, statusCode } = formatError(`${field} already exists`, HTTP_STATUS.CONFLICT);
        return res.status(statusCode).json(response);
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        const { response, statusCode } = formatError('Invalid token', HTTP_STATUS.UNAUTHORIZED);
        return res.status(statusCode).json(response);
    }

    if (err.name === 'TokenExpiredError') {
        const { response, statusCode } = formatError('Token expired', HTTP_STATUS.UNAUTHORIZED);
        return res.status(statusCode).json(response);
    }

    // SQLite errors
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        const { response, statusCode } = formatError('Duplicate entry', HTTP_STATUS.CONFLICT);
        return res.status(statusCode).json(response);
    }

    if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
        const { response, statusCode } = formatError('Invalid reference', HTTP_STATUS.BAD_REQUEST);
        return res.status(statusCode).json(response);
    }

    // Default error
    const { response, statusCode } = formatError(
        err.message || 'Internal server error',
        err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
    
    res.status(statusCode).json(response);
};

module.exports = errorHandler;