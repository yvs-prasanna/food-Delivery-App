const db = require('../config/database');
const { formatResponse, formatError } = require('../utils/helpers');
const { HTTP_STATUS } = require('../utils/constants');

class AddressController {
    // Add new address
    async addAddress(req, res) {
        try {
            const { type, addressLine1, addressLine2, city, state, pincode, latitude, longitude } = req.body;
            const userId = req.user.id;

            // If this is the first address, make it default
            const existingAddresses = await db.query('SELECT COUNT(*) as count FROM addresses WHERE user_id = ?', [userId]);
            const isDefault = existingAddresses[0].count === 0 ? 1 : 0;

            const result = await db.run(
                `INSERT INTO addresses (user_id, type, address_line1, address_line2, city, state, pincode, latitude, longitude, is_default) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [userId, type, addressLine1, addressLine2 || null, city, state, pincode, latitude, longitude, isDefault]
            );

            const { response, statusCode } = formatResponse(
                true,
                { addressId: result.id },
                'Address added successfully',
                HTTP_STATUS.CREATED
            );
            
            res.status(statusCode).json(response);
        } catch (error) {
            console.error('Add address error:', error);
            const { response, statusCode } = formatError('Failed to add address', HTTP_STATUS.INTERNAL_SERVER_ERROR);
            res.status(statusCode).json(response);
        }
    }

    // Get user's addresses
    async getAddresses(req, res) {
        try {
            const userId = req.user.id;

            const addresses = await db.query(
                `SELECT id, type, address_line1, address_line2, city, state, pincode, latitude, longitude, is_default, created_at
                 FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC`,
                [userId]
            );

            const { response, statusCode } = formatResponse(true, { addresses });
            res.status(statusCode).json(response);
        } catch (error) {
            console.error('Get addresses error:', error);
            const { response, statusCode } = formatError('Failed to get addresses', HTTP_STATUS.INTERNAL_SERVER_ERROR);
            res.status(statusCode).json(response);
        }
    }

    // Set default address
    async setDefaultAddress(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            // Check if address belongs to user
            const address = await db.get('SELECT id FROM addresses WHERE id = ? AND user_id = ?', [id, userId]);
            if (!address) {
                const { response, statusCode } = formatError('Address not found', HTTP_STATUS.NOT_FOUND);
                return res.status(statusCode).json(response);
            }

            // Remove default from all user's addresses
            await db.run('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [userId]);

            // Set this address as default
            await db.run('UPDATE addresses SET is_default = 1 WHERE id = ?', [id]);

            const { response, statusCode } = formatResponse(true, null, 'Default address updated successfully');
            res.status(statusCode).json(response);
        } catch (error) {
            console.error('Set default address error:', error);
            const { response, statusCode } = formatError('Failed to set default address', HTTP_STATUS.INTERNAL_SERVER_ERROR);
            res.status(statusCode).json(response);
        }
    }

    // Update address
    async updateAddress(req, res) {
        try {
            const { id } = req.params;
            const { type, addressLine1, addressLine2, city, state, pincode, latitude, longitude } = req.body;
            const userId = req.user.id;

            // Check if address belongs to user
            const address = await db.get('SELECT id FROM addresses WHERE id = ? AND user_id = ?', [id, userId]);
            if (!address) {
                const { response, statusCode } = formatError('Address not found', HTTP_STATUS.NOT_FOUND);
                return res.status(statusCode).json(response);
            }

            await db.run(
                `UPDATE addresses SET type = ?, address_line1 = ?, address_line2 = ?, city = ?, state = ?, pincode = ?, latitude = ?, longitude = ?
                 WHERE id = ?`,
                [type, addressLine1, addressLine2 || null, city, state, pincode, latitude, longitude, id]
            );

            const { response, statusCode } = formatResponse(true, null, 'Address updated successfully');
            res.status(statusCode).json(response);
        } catch (error) {
            console.error('Update address error:', error);
            const { response, statusCode } = formatError('Failed to update address', HTTP_STATUS.INTERNAL_SERVER_ERROR);
            res.status(statusCode).json(response);
        }
    }

    // Delete address
    async deleteAddress(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            // Check if address belongs to user
            const address = await db.get('SELECT id, is_default FROM addresses WHERE id = ? AND user_id = ?', [id, userId]);
            if (!address) {
                const { response, statusCode } = formatError('Address not found', HTTP_STATUS.NOT_FOUND);
                return res.status(statusCode).json(response);
            }

            // Delete the address
            await db.run('DELETE FROM addresses WHERE id = ?', [id]);

            // If this was the default address, make another one default
            if (address.is_default) {
                const otherAddress = await db.get('SELECT id FROM addresses WHERE user_id = ? LIMIT 1', [userId]);
                if (otherAddress) {
                    await db.run('UPDATE addresses SET is_default = 1 WHERE id = ?', [otherAddress.id]);
                }
            }

            const { response, statusCode } = formatResponse(true, null, 'Address deleted successfully');
            res.status(statusCode).json(response);
        } catch (error) {
            console.error('Delete address error:', error);
            const { response, statusCode } = formatError('Failed to delete address', HTTP_STATUS.INTERNAL_SERVER_ERROR);
            res.status(statusCode).json(response);
        }
    }
}

module.exports = new AddressController();