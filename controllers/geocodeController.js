const axios = require("axios");

exports.reverseGeocode = async (req, res) => {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
        return res.status(400).json({
            message: "Latitude and longitude required"
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
                }
            }
        );

        res.json(response.data);

    } catch (error) {
        console.error("Geocode error:", error.message);

        res.status(500).json({
            message: "Geocoding failed"
        });
    }
};