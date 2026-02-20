const pool = require("../config/db");
const { getDistance } = require("geolib");

exports.updateLocation = async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        const stationId = req.stationId;

        if (!latitude || !longitude) {
            return res.status(400).json({
                message: "Latitude and Longitude required"
            });
        }

        // Get station details
        const stationResult = await pool.query(
            "SELECT * FROM tracking.stations WHERE station_id = $1",
            [stationId]
        );

        if (stationResult.rows.length === 0) {
            return res.status(404).json({
                message: "Station not found"
            });
        }

        const station = stationResult.rows[0];

        const lat = Number(latitude);
        const lng = Number(longitude);

        const distance = getDistance(
            {
                latitude: station.assigned_latitude,
                longitude: station.assigned_longitude
            },
            {
                latitude: lat,
                longitude: lng
            }
        );

        let status = "INSIDE";
        if (distance > station.allowed_radius_meters) {
            status = "OUTSIDE";
        }

        // ✅ FIXED: using updated_at instead of last_seen
        await pool.query(
            `
            INSERT INTO tracking.current_location
            (station_id, latitude, longitude, distance_meters, status, updated_at)
            VALUES ($1,$2,$3,$4,$5,NOW())
            ON CONFLICT (station_id)
            DO UPDATE SET
                latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude,
                distance_meters = EXCLUDED.distance_meters,
                status = EXCLUDED.status,
                updated_at = NOW()
            `,
            [stationId, lat, lng, distance, status]
        );

        // Insert into history
        await pool.query(
            `
            INSERT INTO tracking.location_logs
            (station_id, latitude, longitude, distance_meters, status)
            VALUES ($1,$2,$3,$4,$5)
            `,
            [stationId, lat, lng, distance, status]
        );

        // Update station table
        await pool.query(
            `
            UPDATE tracking.stations
            SET status = $1,
                updated_at = NOW()
            WHERE station_id = $2
            `,
            [status, stationId]
        );

        // 🔥 Emit socket event (LIVE UPDATE)
        const io = req.app.get("io");

        if (io) {
            io.emit("locationUpdate", {
                stationId,
                latitude: lat,
                longitude: lng,
                assignedLatitude: station.assigned_latitude,
                assignedLongitude: station.assigned_longitude,
                allowedRadiusMeters: station.allowed_radius_meters,
                status,
                distance
            });
        }

        res.json({
            message: "Location updated",
            status,
            distance
        });

    } catch (error) {
        console.error("Location Update Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};