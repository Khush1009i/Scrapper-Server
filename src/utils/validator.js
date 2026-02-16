/**
 * Validates search parameters
 * @param {string} q - Search query
 * @param {string|number} lat - Latitude
 * @param {string|number} lng - Longitude
 * @returns {object} - { valid: boolean, message: string }
 */
exports.validateSearchInput = (q, lat, lng, location) => {
    if (!q || typeof q !== 'string' || q.trim().length === 0) {
        return { valid: false, message: 'Query (q) is required and cannot be empty.' };
    }

    // Check if location string is provided
    if (location && typeof location === 'string' && location.trim().length > 0) {
        return { valid: true };
    }

    // Fallback to lat/lng validation if no location string
    if (!lat || !lng) {
        return { valid: false, message: 'Either a "location" string OR "lat" and "lng" coordinates are required.' };
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
        return { valid: false, message: 'Invalid latitude. Must be between -90 and 90.' };
    }

    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
        return { valid: false, message: 'Invalid longitude. Must be between -180 and 180.' };
    }

    return { valid: true };
};

exports.validateRegistration = (email, password) => {
    if (!email || !password) {
        return { valid: false, message: 'Email and password are required.' };
    }
    // Simple email regex for basic validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { valid: false, message: 'Invalid email format.' };
    }
    if (password.length < 6) {
        return { valid: false, message: 'Password must be at least 6 characters long.' };
    }
    return { valid: true };
};
