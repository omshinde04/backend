const pool = require("../config/db");

exports.heartbeat = async (req, res) => {
    try {
        const stationId = req.stationId;

        await pool.query(
            `UPDATE tracking.stations
             SET status = 'INSIDE',
                 updated_at = NOW()
             WHERE station_id = $1`,
            [stationId]
        );

        const io = req.app.get("io");

        if (io) {
            io.emit("statusUpdate", {
                stationId,
                status: "INSIDE"
            });
        }

        res.json({ message: "Heartbeat received" });

    } catch (error) {
        console.error("Heartbeat Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
