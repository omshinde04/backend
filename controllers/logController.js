exports.clientLog = async (req, res) => {
    try {

        const {
            stationId,
            level,
            message,
            timestamp
        } = req.body;

        if (!stationId || !level || !message) {
            return res.status(400).json({
                message: "stationId, level and message required"
            });
        }

        const safeLevel = level.toUpperCase();
        const clientIP =
            req.headers["x-forwarded-for"] ||
            req.socket.remoteAddress ||
            "UNKNOWN";

        const userAgent = req.headers["user-agent"] || "UNKNOWN";

        const serverTime = new Date().toISOString();
        const clientTime = timestamp || "NOT_PROVIDED";

        const logObject = {
            stationId,
            level: safeLevel,
            message,
            clientTime,
            serverTime,
            clientIP,
            userAgent
        };

        // Structured logging (best practice)
        console.log("[CLIENT_LOG]", JSON.stringify(logObject));

        // Optional: Pretty readable version
        console.log(
            `[CLIENT LOG] ${serverTime} | Station: ${stationId} | ${safeLevel} | ${message}`
        );

        return res.json({ success: true });

    } catch (error) {

        console.error("Client Log Error:", error);

        return res.status(500).json({
            message: "Failed to log message"
        });
    }
};