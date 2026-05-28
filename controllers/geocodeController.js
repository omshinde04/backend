const axios = require("axios");

/* ===============================
   GEO CACHE
================================= */

const geoCache = new Map();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24h

/* ===============================
   GLOBAL RATE LIMIT
================================= */

let lastApiCall = 0;
const MIN_API_INTERVAL = 2000; // 2 seconds

/* ===============================
   CLEANUP CACHE
================================= */

setInterval(() => {

    const now = Date.now();

    for (const [key, value] of geoCache.entries()) {

        if (now - value.timestamp > CACHE_TTL) {
            geoCache.delete(key);
        }
    }

}, 1000 * 60 * 30);

/* ===============================
   REVERSE GEOCODE
================================= */

exports.reverseGeocode = async (req, res) => {

    try {

        const { lat, lng } = req.query;

        /* ===============================
           VALIDATION
        ================================= */

        if (!lat || !lng) {

            return res.status(400).json({
                message: "Latitude and longitude required"
            });
        }

        /* ===============================
           NORMALIZE COORDINATES
        ================================= */

        const key =
            `${Number(lat).toFixed(2)}-${Number(lng).toFixed(2)}`;

        /* ===============================
           CACHE HIT
        ================================= */

        if (geoCache.has(key)) {

            return res.json({
                display_name: geoCache.get(key).address,
                cached: true
            });
        }

        /* ===============================
           GLOBAL RATE LIMIT
        ================================= */

        const now = Date.now();

        if (now - lastApiCall < MIN_API_INTERVAL) {

            return res.json({
                display_name: "Loading location...",
                cached: true
            });
        }

        lastApiCall = now;

        /* ===============================
           NOMINATIM REQUEST
        ================================= */

        const response = await axios.get(
            "https://nominatim.openstreetmap.org/reverse",
            {
                params: {
                    format: "json",
                    lat,
                    lon: lng
                },

                headers: {
                    "User-Agent": "Railtail-Monitoring-System"
                },

                timeout: 5000
            }
        );

        const address =
            response.data.display_name || "Unknown location";

        /* ===============================
           SAVE CACHE
        ================================= */

        geoCache.set(key, {
            address,
            timestamp: Date.now()
        });

        return res.json({
            display_name: address,
            cached: false
        });

    } catch (error) {

        console.error("Geocode error:", error.message);

        /* ===============================
           429 HANDLING
        ================================= */

        if (error.response?.status === 429) {

            return res.json({
                display_name:
                    "Location temporarily unavailable",
                cached: true
            });
        }

        return res.status(500).json({
            message: "Geocoding failed"
        });
    }

};