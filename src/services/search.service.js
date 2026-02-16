const { scrapeGoogleMaps } = require('../scraper/maps.scraper');
const NodeCache = require('node-cache');
const pLimit = require('p-limit');
const Joi = require('joi');
const geocoder = require('../utils/geocoder');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const { formatListing } = require('../utils/formatter');

const searchCache = new NodeCache({ stdTTL: 600, checkperiod: 120 }); // 10 minutes TTL
const limit = pLimit(5); // Limit to 5 concurrent scrapers

// Validation Schema
const searchSchema = Joi.object({
    q: Joi.string().trim().required().max(100).messages({
        'string.empty': 'Search query (q) cannot be empty.',
        'any.required': 'Search query (q) is required.'
    }),
    lat: Joi.number().min(-90).max(90),
    lng: Joi.number().min(-180).max(180),
    location: Joi.string().trim().max(100)
}).or('lat', 'location').and('lat', 'lng');

/**
 * Service to handle search logic
 */
exports.performSearch = async (queryData) => {
    // 1. Validate Input
    const { error, value } = searchSchema.validate(queryData);
    if (error) {
        throw new AppError(`Validation Error: ${error.details[0].message}`, 400);
    }

    const { q, lat, lng, location } = value;
    let latitude = lat;
    let longitude = lng;
    let locationName = location;

    // 2. Normalize Location (Geocoding)
    if (latitude && longitude) {
        // Coordinates provided, use them
    } else if (locationName) {
        try {
            logger.info(`Geocoding location: ${locationName}`);
            const geoResults = await geocoder.geocode(locationName);
            if (geoResults && geoResults.length > 0) {
                latitude = geoResults[0].latitude;
                longitude = geoResults[0].longitude;
                locationName = geoResults[0].formattedAddress || locationName;
                logger.info(`Geocoded to: ${latitude}, ${longitude}`);
            } else {
                throw new AppError(`Could not geocode location: ${locationName}`, 400);
            }
        } catch (err) {
            logger.error(`Geocoding error: ${err.message}`);
            // If geocoding fails, we could fall back to string search if we wanted, 
            // but user explicitely said "convert location -> lat/lng" is required.
            if (err instanceof AppError) throw err;
            throw new AppError('Geocoding service failed.', 500);
        }
    } else {
        throw new AppError('Location or coordinates are required.', 400);
    }

    // 3. Check Cache
    // Create a unique cache key based on query and rounded coordinates (to group nearby searches)
    // Rounding to 3 decimal places (~100m) for cache hit improvement
    const latKey = latitude.toFixed(3);
    const lngKey = longitude.toFixed(3);
    const cacheKey = `search:${q.toLowerCase()}:${latKey}:${lngKey}`;

    const cachedResult = searchCache.get(cacheKey);
    if (cachedResult) {
        logger.info(`Cache hit for key: ${cacheKey}`);
        return cachedResult;
    }

    // 4. Scrape with Retry and Timeout (Concurrecy Limited)
    const results = await limit(() => scrapeWithRetry(q, latitude, longitude));

    // 5. Clean Data
    const cleanResults = results.map(formatListing).filter(item => item.name);

    // 6. Store in Cache
    const responsePayload = {
        query: q,
        location: locationName || "Custom Coordinates",
        center: { lat: latitude, lng: longitude },
        results: cleanResults,
        count: cleanResults.length
    };

    searchCache.set(cacheKey, responsePayload);
    return responsePayload;
};

/**
 * Helper to handle scraping execution with timeout and retry
 */
const scrapeWithRetry = async (query, lat, lng, retries = 1) => {
    let attempts = 0;
    while (attempts <= retries) {
        try {
            attempts++;
            logger.info(`Scraping attempt ${attempts} for ${query} @ ${lat},${lng}`);

            // 45s timeout for the scraper
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new AppError('Scraper timeout exceeded.', 504)), 45000)
            );

            // Pass null for location string to FORCE coordinate usage in scraper
            const data = await Promise.race([
                scrapeGoogleMaps(query, lat, lng, null),
                timeoutPromise
            ]);

            return data;

        } catch (err) {
            logger.warn(`Scrape attempt ${attempts} failed: ${err.message}`);
            if (attempts > retries) {
                if (err instanceof AppError) throw err;
                throw new AppError('Scraping failed after retries.', 500);
            }
            // Optional: wait a bit before retry
            await new Promise(r => setTimeout(r, 1000));
        }
    }
};
