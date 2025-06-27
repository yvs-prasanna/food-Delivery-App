const express = require('express');
const addressController = require('../controllers/addressController');
const authMiddleware = require('../middleware/auth');
const { validateAddress } = require('../middleware/validation');

const router = express.Router();

// All address routes require authentication
router.use(authMiddleware);

router.post('/', validateAddress, addressController.addAddress);
router.get('/', addressController.getAddresses);
router.put('/:id/set-default', addressController.setDefaultAddress);
router.put('/:id', validateAddress, addressController.updateAddress);
router.delete('/:id', addressController.deleteAddress);

module.exports = router;