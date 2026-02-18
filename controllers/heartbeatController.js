const Station = require("../models/Station");

exports.heartbeat = async (req, res) => {
    try {

        // 1️⃣ Validate JWT injection
        if (!req.stationId) {
            console.error("Heartbeat Error: stationId missing from token");
            return res.status(401).json({
                message: "Unauthorized - Invalid token"
            });
        }

        const station = await Station.findOne({ stationId: req.stationId });

        if (!station) {
            console.error("Heartbeat Error: Station not found:", req.stationId);
            return res.status(404).json({
                message: "Station not found"
            });
        }

        // 2️⃣ Only update if needed
        station.lastHeartbeat = new Date();

        // Do NOT override OUTSIDE status here
        // Only set ONLINE if currently OFFLINE
        if (station.status === "OFFLINE") {
            station.status = "ONLINE";
        }

        await station.save();

        const io = req.app.get("io");

        if (io) {
            io.emit("statusUpdate", {
                stationId: station.stationId,
                status: station.status,
                lastHeartbeat: station.lastHeartbeat
            });
        }

        return res.json({
            message: "Heartbeat received",
            status: station.status
        });

    } catch (error) {
        console.error("Heartbeat Server Error:", error);
        return res.status(500).json({
            message: "Server error"
        });
    }
};
