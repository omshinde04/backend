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
}, 1000 * 60 * 30); // every 30 minutes


/* ===============================
   REVERSE GEOCODE API
================================= */

exports.reverseGeocode = async (req, res) => {

    const { lat, lng } = req.query;

    if (!lat || !lng) {
        return res.status(400).json({
            message: "Latitude and longitude required"
        });
    }

    /* ===============================
       NORMALIZE COORDINATES
       (avoid cache duplicates)
    ================================= */

    const key = `${Number(lat).toFixed(4)}-${Number(lng).toFixed(4)}`;

    /* ===============================
       CACHE HIT
    ================================= */

    if (geoCache.has(key)) {
        return res.json({
            display_name: geoCache.get(key).address,
            cached: true
        });
    }

    try {

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
           STORE IN CACHE
        ================================= */

        geoCache.set(key, {
            address,
            timestamp: Date.now()
        });

        res.json({
            display_name: address,
            cached: false
        });

    } catch (error) {

        console.error("Geocode error:", error.message);

        res.status(500).json({
            message: "Geocoding failed"
        });
    }
};