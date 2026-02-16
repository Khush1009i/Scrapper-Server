const { scrapeGoogleMaps } = require('../scraper/maps.scraper');
const { validateSearchInput } = require('../utils/validator');
const { formatListing } = require('../utils/formatter');

exports.search = async (req, res) => {
    try {
        const { q, lat, lng, location } = req.query;
        console.time('SearchRequestDuration'); // Start timer

        console.log(`Received search request: q=${q}, lat=${lat}, lng=${lng}, location=${location}`);

        // 1. Validate Input
        const validation = validateSearchInput(q, lat, lng, location);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.message });
        }

        const latitude = lat ? parseFloat(lat) : null;
        const longitude = lng ? parseFloat(lng) : null;

        // 2. Call Scraper Engine
        const rawResults = await scrapeGoogleMaps(q, latitude, longitude, location);

        // 3. Clean Data
        const cleanResults = rawResults.map(formatListing).filter(item => item.name); // Filter out empty names

        // 4. Return Response
        const responseProxy = {
            query: q,
            location: location || "Custom Coordinates",
            center: {
                lat: latitude,
                lng: longitude
            },
            results: cleanResults,
            count: cleanResults.length
        };

        console.timeEnd('SearchRequestDuration'); // End timer and log
        res.json(responseProxy);

    } catch (error) {
        console.error('Search Controller Error:', error);
        res.status(500).json({ error: error.message || 'Internal server error during search.' });
    }
};

exports.getMostSearched = (req, res) => {
    const popularCategories = [
        "Restaurants",
        "Tech",
        "IT Company",
        "Tea & Coffee"
    ];
    res.json({ categories: popularCategories });
};
