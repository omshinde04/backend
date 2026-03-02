const pool = require("../config/db");

exports.heartbeat = async (req, res) => {
    try {
        const stationId = req.stationId;

        // 🔍 Capture Debug Info
        const clientIP =
            req.headers["cf-connecting-ip"] ||
            req.headers["x-forwarded-for"] ||
            req.socket.remoteAddress ||
            "UNKNOWN";

        const userAgent = req.headers["user-agent"] || "UNKNOWN";

        const serverTime = new Date().toISOString();

        // 🔥 Debug Logging (Structured)
        console.log(
            `[HEARTBEAT] ${serverTime} | Station: ${stationId} | IP: ${clientIP} | UA: ${userAgent}`
        );

        await pool.query(
            `UPDATE tracking.stations
             SET updated_at = NOW()
             WHERE station_id = $1`,
            [stationId]
        );

        const io = req.app.get("io");

        if (io) {
            io.emit("statusUpdate", {
                stationId,
                status: "ONLINE"
            });
        }

        res.json({ message: "Heartbeat received" });

    } catch (error) {
        console.error("Heartbeat Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};