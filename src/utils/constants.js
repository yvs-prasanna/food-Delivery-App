const ORDER_STATUS = {
    PLACED: 'placed',
    CONFIRMED: 'confirmed',
    PREPARING: 'preparing',
    READY: 'ready',
    OUT_FOR_DELIVERY: 'out_for_delivery',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled'
};

const PAYMENT_STATUS = {
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed',
    REFUNDED: 'refunded'
};

const PAYMENT_METHODS = {
    CASH: 'cash',
    CARD: 'card',
    UPI: 'upi',
    WALLET: 'wallet'
};

const ADDRESS_TYPES = {
    HOME: 'home',
    WORK: 'work',
    OTHER: 'other'
};

const DELIVERY_PARTNER_STATUS = {
    OFFLINE: 'offline',
    AVAILABLE: 'available',
    BUSY: 'busy'
};

const VEHICLE_TYPES = {
    BIKE: 'bike',
    SCOOTER: 'scooter',
    CAR: 'car',
    BICYCLE: 'bicycle'
};

const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500
};

module.exports = {
    ORDER_STATUS,
    PAYMENT_STATUS,
    PAYMENT_METHODS,
    ADDRESS_TYPES,
    DELIVERY_PARTNER_STATUS,
    VEHICLE_TYPES,
    HTTP_STATUS
};