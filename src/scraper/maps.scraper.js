const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

let browserInstance = null;

/**
 * Initializes or returns the existing browser instance.
 */
const getBrowser = async () => {
    if (browserInstance && browserInstance.isConnected()) {
        return browserInstance;
    }

    console.log('Launching new browser instance...');
    browserInstance = await puppeteer.launch({
        headless: true, // Run in headless mode
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--lang=en-US,en'
        ]
    });

    return browserInstance;
};

/**
 * Scrapes Google Maps for business listings.
 * @param {string} query - The search query (e.g., "salon")
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {string} location - Location string (e.g., "Bhilwara, Rajasthan")
 * @returns {Promise<Array>} - Array of business objects
 */
const scrapeGoogleMaps = async (query, lat, lng, location) => {
    let page;
    try {
        console.log(`Starting scrape for query: ${query}, location: ${location || (lat + ',' + lng)}`);

        const browser = await getBrowser();
        page = await browser.newPage();

        // Optimize: Block unnecessary resources
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const resourceType = req.resourceType();
            // Allow images to load so we can capture their URLs if needed (though often URL is in DOM even if blocked)
            // But blocking 'image' prevents actual network download, URL might still be in src.
            // Let's safe-keep blocking images for speed, usually src is present.
            // If src is a data URI or placeholder, we might need to enable it.
            // Logic update: Keep blocking images for speed. 
            // The <img> tags usually have src attributes even if the request is blocked.
            if (['font', 'media'].includes(resourceType)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // Set viewport to simulate a real generic desktop user
        await page.setViewport({ width: 1366, height: 768 });

        // Construct URL
        let url;
        if (location) {
            const searchQuery = `${query} in ${location}`;
            url = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;
        } else {
            url = `https://www.google.com/maps/search/${encodeURIComponent(query)}/@${lat},${lng},14z`; // 14z or 15z zoom
        }
        console.log(`Navigating to: ${url}`);

        // Optimize: Wait only for DOM content
        // Reduced timeout to 30s
        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        // Wait for the results feed container
        const feedSelector = 'div[role="feed"]';
        try {
            await page.waitForSelector(feedSelector, { timeout: 10000 }); // Reduced to 10s
        } catch (e) {
            console.log("Results feed not found within timeout.");
            return [];
        }

        // Auto-scroll loop to load more results
        await autoScroll(page, feedSelector);

        // Extract data
        const places = await page.evaluate((feedSelector) => {
            const results = [];
            const feed = document.querySelector(feedSelector);
            if (!feed) return [];

            const items = Array.from(feed.querySelectorAll('div[jsaction]'));

            items.forEach(item => {
                const link = item.querySelector('a[href*="/maps/place/"]');
                if (!link) return;

                const url = link.href;
                let latitude = null;
                let longitude = null;

                const coordsMatch = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
                if (coordsMatch) {
                    latitude = parseFloat(coordsMatch[1]);
                    longitude = parseFloat(coordsMatch[2]);
                }

                const nameEl = item.querySelector('div.fontHeadlineSmall') || item.querySelector('.qBF1Pd');
                const name = nameEl ? nameEl.textContent : (link.getAttribute('aria-label') || "");

                const ratingEl = item.querySelector('span[role="img"]');
                let rating = null;
                let reviews = null;
                if (ratingEl) {
                    const label = ratingEl.getAttribute('aria-label') || "";
                    const parts = label.split(" ");
                    if (parts.length > 0) rating = parseFloat(parts[0]);
                    if (parts.length > 2) reviews = parseInt(parts[2].replace(',', ''));
                }

                // Image Extraction
                // Look for an image inside the item. Usually it's the first img tag or specific class.
                // The main thumbnail often has a class like 'CIA32d' or is just an img with src starting with https://lh5.googleusercontent.com
                const imgEl = item.querySelector('img');
                let image = null;
                if (imgEl) {
                    image = imgEl.src;
                }

                const textLines = item.innerText.split('\n').filter(t => t.trim().length > 0);
                const address = textLines.find(t => t.includes(',')) || textLines[2] || "";
                const phone = textLines.find(t => t.match(/\+?\d[\d -]{8,}\d/)) || "";

                const websiteLink = item.querySelector('a[data-value="Website"]');
                const website = websiteLink ? websiteLink.href : (textLines.find(t => t.includes('.')) || "");

                results.push({
                    name,
                    rating,
                    reviews,
                    address,
                    phone,
                    website,
                    latitude,
                    longitude,
                    url,
                    image
                });
            });
            return results;
        }, feedSelector);

        console.log(`Scraped ${places.length} places.`);
        return places;

    } catch (error) {
        console.error("Scraping Logic Error:", error);
        return [];
    } finally {
        if (page) await page.close(); // Only close the page, keep browser alive
    }
};

async function autoScroll(page, selector) {
    await page.evaluate(async (selector) => {
        const wrapper = document.querySelector(selector);
        if (!wrapper) return;

        await new Promise((resolve) => {
            let totalHeight = 0;
            let distance = 300; // Increased step size
            let timer = setInterval(() => {
                const scrollHeight = wrapper.scrollHeight;
                wrapper.scrollBy(0, distance);
                totalHeight += distance;

                // Optimize: shorter scroll time
                // Scroll roughly 10-15 times (approx 3-4 screens of results)
                if (totalHeight >= 4000) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100); // Faster interval (100ms)

            // Backup timeout (reduced to 5s)
            setTimeout(() => {
                clearInterval(timer);
                resolve();
            }, 5000);
        });
    }, selector);
}

module.exports = { scrapeGoogleMaps };
