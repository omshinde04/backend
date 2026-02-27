const pool = require("../config/db");
const { getDistance } = require("geolib");

exports.updateLocation = async (req, res) => {
    const client = await pool.connect();

    try {
        const { latitude, longitude } = req.body;
        const stationId = req.stationId;

        const lat = Number(latitude);
        const lng = Number(longitude);

        if (
            lat === undefined ||
            lng === undefined ||
            isNaN(lat) ||
            isNaN(lng) ||
            lat < -90 || lat > 90 ||
            lng < -180 || lng > 180
        ) {
            return res.status(400).json({
                message: "Invalid latitude or longitude range"
            });
        }

        // Fetch station configuration
        const stationResult = await client.query(
            `SELECT assigned_latitude, assigned_longitude, allowed_radius_meters
             FROM tracking.stations 
             WHERE station_id = $1`,
            [stationId]
        );

        if (!stationResult.rows.length) {
            return res.status(404).json({ message: "Station not found" });
        }

        const station = stationResult.rows[0];

        const distance = getDistance(
            {
                latitude: station.assigned_latitude,
                longitude: station.assigned_longitude
            },
            { latitude: lat, longitude: lng }
        );

        const status =
            distance > station.allowed_radius_meters ? "OUTSIDE" : "INSIDE";

        await client.query("BEGIN");

        // Always update current location
        await client.query(
            `INSERT INTO tracking.current_location
             (station_id, latitude, longitude, distance_meters, status, updated_at)
             VALUES ($1,$2,$3,$4,$5,NOW())
             ON CONFLICT (station_id)
             DO UPDATE SET
                latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude,
                distance_meters = EXCLUDED.distance_meters,
                status = EXCLUDED.status,
                updated_at = NOW()`,
            [stationId, lat, lng, distance, status]
        );

        // 🔥 Fetch last log for INSIDE throttling
        const lastLogResult = await client.query(
            `SELECT status, created_at
             FROM tracking.location_logs
             WHERE station_id = $1
             ORDER BY created_at DESC
             LIMIT 1`,
            [stationId]
        );

        let shouldLog = false;

        // Always log OUTSIDE
        if (status === "OUTSIDE") {
            shouldLog = true;
        }

        // INSIDE throttling logic
        if (status === "INSIDE") {

            if (lastLogResult.rows.length === 0) {
                shouldLog = true;
            } else {
                const lastStatus = lastLogResult.rows[0].status;
                const lastTime = new Date(lastLogResult.rows[0].created_at);
                const now = new Date();

                const tenMinutesPassed =
                    (now - lastTime) > (10 * 60 * 1000);

                const statusChanged = lastStatus !== status;

                if (statusChanged || tenMinutesPassed) {
                    shouldLog = true;
                }
            }
        }

        if (shouldLog) {
            await client.query(
                `INSERT INTO tracking.location_logs
                 (station_id, latitude, longitude, distance_meters, status)
                 VALUES ($1,$2,$3,$4,$5)`,
                [stationId, lat, lng, distance, status]
            );
        }

        await client.query(
            `UPDATE tracking.stations
             SET status = $1, updated_at = NOW()
             WHERE station_id = $2`,
            [status, stationId]
        );

        await client.query("COMMIT");

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
        await client.query("ROLLBACK");
        console.error("Location Update Error:", error);
        res.status(500).json({ message: "Server error" });
    } finally {
        client.release();
    }
};


/* =========================================
   ✅ NEW: GET ALL STATIONS
========================================= */
exports.getAllStations = async (req, res) => {
    try {

        const result = await pool.query(`
            SELECT 
                s.station_id,
                s.assigned_latitude,
                s.assigned_longitude,
                s.allowed_radius_meters,
                cl.latitude,
                cl.longitude,
                cl.distance_meters,
                cl.updated_at,
                CASE 
                    WHEN cl.updated_at IS NULL THEN 'OFFLINE'
                    WHEN NOW() - cl.updated_at > INTERVAL '2 minutes' THEN 'OFFLINE'
                    ELSE cl.status
                END AS status
            FROM tracking.stations s
            LEFT JOIN tracking.current_location cl
            ON s.station_id = cl.station_id
            ORDER BY s.station_id
        `);

        res.json({
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {
        console.error("Fetch Stations Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};