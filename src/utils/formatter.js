/**
 * Cleans the raw listing data from scraper
 */
exports.formatListing = (rawListing) => {
    // Basic sanitization
    const sanitizeString = (str) => {
        if (!str) return null;
        const cleaned = String(str).trim();
        return cleaned.length > 0 ? cleaned : null;
    };

    return {
        name: sanitizeString(rawListing.name),
        rating: rawListing.rating ? parseFloat(rawListing.rating) : null,
        reviews: rawListing.reviews
            ? (typeof rawListing.reviews === 'number' ? rawListing.reviews : parseInt(rawListing.reviews.replace(/[^0-9]/g, '')))
            : 0,
        address: sanitizeString(rawListing.address),
        phone: sanitizeString(rawListing.phone),
        website: sanitizeString(rawListing.website),
        latitude: rawListing.latitude ? parseFloat(rawListing.latitude) : null,
        longitude: rawListing.longitude ? parseFloat(rawListing.longitude) : null,
        image: rawListing.image ? String(rawListing.image) : null
    };
};
