const pool = require("../config/db");
const { getDistance } = require("geolib");

exports.batchUpdateLocation = async (req, res) => {

    console.log("========== BATCH HIT ==========");
    console.log("Headers:", req.headers);
    console.log("Body:", req.body);

    const client = await pool.connect();

    try {
        const { records } = req.body;
        const stationId = req.stationId;

        console.log("Decoded stationId from middleware:", stationId);
        console.log("Records length:", Array.isArray(records) ? records.length : "NOT ARRAY");

        if (!stationId) {
            return res.status(401).json({ message: "stationId missing in token" });
        }

        if (!Array.isArray(records) || records.length === 0) {
            return res.status(400).json({ message: "Records array required" });
        }

        if (records.length > 100) {
            return res.status(400).json({ message: "Batch size too large" });
        }

        const stationResult = await client.query(
            `SELECT assigned_latitude, assigned_longitude, allowed_radius_meters
             FROM tracking.stations 
             WHERE station_id = $1`,
            [stationId]
        );

        if (!stationResult.rows.length) {
            return res.status(404).json({ message: "Station not found in DB" });
        }

        const station = stationResult.rows[0];

        await client.query("BEGIN");

        const lastLogResult = await client.query(
            `SELECT status, recorded_at
     FROM tracking.location_logs
     WHERE station_id = $1
     ORDER BY recorded_at DESC
     LIMIT 1`,
            [stationId]
        );

        let previousStatus = lastLogResult.rows[0]?.status || null;
        let previousTime = lastLogResult.rows[0]?.recorded_at || null;

        const insertValues = [];
        const insertParams = [];

        let paramIndex = 1;
        let lastStatus = "INSIDE";
        let lastDistance = 0;
        let lastLat = null;
        let lastLng = null;

        for (const record of records) {

            const lat = Number(record.latitude);
            const lng = Number(record.longitude);

            if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
                continue;
            }

            const distance = getDistance(
                {
                    latitude: station.assigned_latitude,
                    longitude: station.assigned_longitude
                },
                { latitude: lat, longitude: lng }
            );

            const status =
                distance > station.allowed_radius_meters
                    ? "OUTSIDE"
                    : "INSIDE";

            let shouldInsert = false;

            // 🔴 ALWAYS store OUTSIDE
            if (status === "OUTSIDE") {
                shouldInsert = true;
            } else {
                // 🟢 INSIDE logic control

                const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

                if (!previousStatus) {
                    shouldInsert = true;
                } else if (previousStatus === "OUTSIDE") {
                    // OUTSIDE → INSIDE transition
                    shouldInsert = true;
                } else if (previousTime && previousTime < tenMinutesAgo) {
                    // heartbeat after 10 mins
                    shouldInsert = true;
                }
            }

            if (shouldInsert) {
                insertValues.push(
                    `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`
                );

                insertParams.push(
                    stationId,
                    lat,
                    lng,
                    distance,
                    status
                );

                // update memory state
                previousStatus = status;
                previousTime = new Date();
            }

            lastStatus = status;
            lastDistance = distance;
            lastLat = lat;
            lastLng = lng;
        }

        if (insertValues.length > 0) {
            await client.query(
                `INSERT INTO tracking.location_logs
                 (station_id, latitude, longitude, distance_meters, status)
                 VALUES ${insertValues.join(",")}`,
                insertParams
            );
        }

        // 🔥 DO NOT TOUCH BELOW (production logic intact)

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
            [stationId, lastLat, lastLng, lastDistance, lastStatus]
        );

        await client.query(
            `UPDATE tracking.stations
             SET status = $1, updated_at = NOW()
             WHERE station_id = $2`,
            [lastStatus, stationId]
        );

        await client.query("COMMIT");

        const io = req.app.get("io");
        if (io) {
            io.emit("locationUpdate", {
                stationId,
                latitude: lastLat,
                longitude: lastLng,
                distance: lastDistance,
                status: lastStatus
            });
        }

        res.json({
            message: "Batch sync successful",
            count: insertValues.length
        });

    } catch (error) {

        await client.query("ROLLBACK");

        console.error("❌ Batch Location Error FULL:", error);

        res.status(500).json({
            message: "Server error during batch sync",
            error: error.message
        });

    } finally {
        client.release();
        console.log("========== BATCH END ==========");
    }
};