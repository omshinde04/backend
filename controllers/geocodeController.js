const axios = require("axios");

/* ===============================
   GEO CACHE (In-Memory)
================================= */

const geoCache = new Map();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

/* ===============================
   CLEANUP CACHE (Memory Safety)
================================= */

setInterval(() => {

    const now = Date.now();

    for (const [key, value] of geoCache.entries()) {

        if (now - value.timestamp > CACHE_TTL) {
            geoCache.delete(key);
        }
    }

}, 1000 * 60 * 30); // every 30 mins


/* ===============================
   REVERSE GEOCODE API
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
           (Huge cache optimization)
        ================================= */

        const key =
            `${Number(lat).toFixed(3)}-${Number(lng).toFixed(3)}`;

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
           CALL NOMINATIM API
        ================================= */

        const response = await axios.get(
            "https://nominatim.openstreetmap.org/reverse",
            {
                params: {
                    format: "json",
                    lat,
                    lon: lng,
                    zoom: 18,
                    addressdetails: 1
                },

                headers: {
                    "User-Agent": "Railtail-Monitoring-System",
                    "Accept-Language": "en"
                },

                timeout: 8000
            }
        );

        /* ===============================
           EXTRACT ADDRESS
        ================================= */

        const address =
            response.data.display_name || "Unknown location";

        /* ===============================
           SAVE TO CACHE
        ================================= */

        geoCache.set(key, {
            address,
            timestamp: Date.now()
        });

        /* ===============================
           SUCCESS RESPONSE
        ================================= */

        return res.json({
            display_name: address,
            cached: false
        });

    } catch (error) {

        console.error("Geocode error:", error.message);

        /* ===============================
           RATE LIMIT HANDLING
        ================================= */

        if (error.response?.status === 429) {

            return res.status(429).json({
                message:
                    "Too many geocoding requests. Please wait a few seconds."
            });
        }

        /* ===============================
           TIMEOUT HANDLING
        ================================= */

        if (error.code === "ECONNABORTED") {

            return res.status(504).json({
                message: "Geocoding request timeout"
            });
        }

        /* ===============================
           GENERIC ERROR
        ================================= */

        return res.status(500).json({
            message: "Geocoding failed"
        });
    }
};