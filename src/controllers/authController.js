const db = require('../config/database');
const { hashPassword, comparePassword, generateToken, formatResponse, formatError, isValidEmail } = require('../utils/helpers');
const { HTTP_STATUS } = require('../utils/constants');

class AuthController {
    
    async register(req, res) {
        try {
            const { name, email, password, phone } = req.body;

            // Check if user already exists
            const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);
            if (existingUser) {
                const { response, statusCode } = formatError('User already exists with this email', HTTP_STATUS.CONFLICT);
                return res.status(statusCode).json(response);
            }

            // Hash password
            const passwordHash = await hashPassword(password);

            // Create user
            const result = await db.run(
                'INSERT INTO users (name, email, password_hash, phone) VALUES (?, ?, ?, ?)',
                [name, email, passwordHash, phone]
            );

            const { response, statusCode } = formatResponse(
                true,
                { userId: result.id },
                'User registered successfully',
                HTTP_STATUS.CREATED
            );
            
            res.status(statusCode).json(response);
        } catch (error) {
            console.error('Registration error:', error);
            const { response, statusCode } = formatError('Registration failed', HTTP_STATUS.INTERNAL_SERVER_ERROR);
            res.status(statusCode).json(response);
        }
    }

    // User login
    async login(req, res) {
        try {
            const { email, password } = req.body;

            // Find user
            const user = await db.get(
                'SELECT id, name, email, password_hash, is_active FROM users WHERE email = ?',
                [email]
            );

            if (!user) {
                const { response, statusCode } = formatError('Invalid credentials', HTTP_STATUS.UNAUTHORIZED);
                return res.status(statusCode).json(response);
            }

            if (!user.is_active) {
                const { response, statusCode } = formatError('Account is deactivated', HTTP_STATUS.UNAUTHORIZED);
                return res.status(statusCode).json(response);
            }

            // Check password
            const isPasswordValid = await comparePassword(password, user.password_hash);
            if (!isPasswordValid) {
                const { response, statusCode } = formatError('Invalid credentials', HTTP_STATUS.UNAUTHORIZED);
                return res.status(statusCode).json(response);
            }

            // Generate token
            const token = generateToken({
                id: user.id,
                email: user.email,
                name: user.name
            });

            const { response, statusCode } = formatResponse(true, {
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email
                }
            }, 'Login successful');

            res.status(statusCode).json(response);
        } catch (error) {
            console.error('Login error:', error);
            const { response, statusCode } = formatError('Login failed', HTTP_STATUS.INTERNAL_SERVER_ERROR);
            res.status(statusCode).json(response);
        }
    }

    // Get current user profile
    async getProfile(req, res) {
        try {
            const user = await db.get(
                'SELECT id, name, email, phone, created_at FROM users WHERE id = ?',
                [req.user.id]
            );

            if (!user) {
                const { response, statusCode } = formatError('User not found', HTTP_STATUS.NOT_FOUND);
                return res.status(statusCode).json(response);
            }

            const { response, statusCode } = formatResponse(true, { user });
            res.status(statusCode).json(response);
        } catch (error) {
            console.error('Get profile error:', error);
            const { response, statusCode } = formatError('Failed to get profile', HTTP_STATUS.INTERNAL_SERVER_ERROR);
            res.status(statusCode).json(response);
        }
    }

    // Update user profile
    async updateProfile(req, res) {
        try {
            const { name, phone } = req.body;
            const userId = req.user.id;

            await db.run(
                'UPDATE users SET name = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [name, phone, userId]
            );

            const { response, statusCode } = formatResponse(true, null, 'Profile updated successfully');
            res.status(statusCode).json(response);
        } catch (error) {
            console.error('Update profile error:', error);
            const { response, statusCode } = formatError('Failed to update profile', HTTP_STATUS.INTERNAL_SERVER_ERROR);
            res.status(statusCode).json(response);
        }
    }
}

module.exports = new AuthController();