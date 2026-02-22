exports.clientLog = async (req, res) => {

    try {

        const { stationId, level, message } = req.body;

        if (!stationId || !level || !message) {
            return res.status(400).json({
                message: "stationId, level and message required"
            });
        }

        const safeLevel = level.toUpperCase();

        // This is what will appear in Render logs
        console.log(
            `[CLIENT LOG] Station: ${stationId} | ${safeLevel} | ${message}`
        );

        res.json({ success: true });

    } catch (error) {

        console.error("Client Log Error:", error);

        res.status(500).json({
            message: "Failed to log message"
        });
    }
};