const pool = require("../config/db");
const { getDistance } = require("geolib");

// ==============================
// BATCH LOCATION SYNC
// ==============================
exports.batchUpdateLocation = async (req, res) => {

    const client = await pool.connect();

    try {

        const { records } = req.body;
        const stationId = req.stationId;

        // Validation
        if (!records || !Array.isArray(records) || records.length === 0) {
            return res.status(400).json({
                message: "Records array required"
            });
        }

        // Safety limit (protect server)
        if (records.length > 100) {
            return res.status(400).json({
                message: "Batch size too large"
            });
        }

        // Get station details
        const stationResult = await client.query(
            "SELECT * FROM tracking.stations WHERE station_id = $1",
            [stationId]
        );

        if (stationResult.rows.length === 0) {
            return res.status(404).json({
                message: "Station not found"
            });
        }

        const station = stationResult.rows[0];

        await client.query("BEGIN");

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

            // Save last record info for current_location update
            lastStatus = status;
            lastDistance = distance;
            lastLat = lat;
            lastLng = lng;
        }

        // Bulk insert into history
        await client.query(
            `
            INSERT INTO tracking.location_logs
            (station_id, latitude, longitude, distance_meters, status)
            VALUES ${insertValues.join(",")}
            `,
            insertParams
        );

        // Update current location with latest record only
        await client.query(
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
            [stationId, lastLat, lastLng, lastDistance, lastStatus]
        );

        // Update station status
        await client.query(
            `
            UPDATE tracking.stations
            SET status = $1,
                updated_at = NOW()
            WHERE station_id = $2
            `,
            [lastStatus, stationId]
        );

        await client.query("COMMIT");

        res.json({
            message: "Batch sync successful",
            count: records.length
        });

    } catch (error) {

        await client.query("ROLLBACK");
        console.error("Batch Location Error:", error);

        res.status(500).json({
            message: "Server error during batch sync"
        });

    } finally {
        client.release();
    }
};