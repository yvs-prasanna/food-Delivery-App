const { verifyToken, formatError } = require('../utils/helpers');
const { HTTP_STATUS } = require('../utils/constants');

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            const { response, statusCode } = formatError('Access token required', HTTP_STATUS.UNAUTHORIZED);
            return res.status(statusCode).json(response);
        }
        
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        
        const decoded = verifyToken(token);
        req.user = decoded;
        
        next();
    } catch (error) {
        const { response, statusCode } = formatError('Invalid or expired token', HTTP_STATUS.UNAUTHORIZED);
        return res.status(statusCode).json(response);
    }
};

module.exports = authMiddleware;