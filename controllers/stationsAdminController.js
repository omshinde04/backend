const pool = require("../config/db");

/* =====================================================
   UTILITIES
===================================================== */

const VALID_STATUSES = ["INSIDE", "OUTSIDE", "OFFLINE"];

function isValidStationId(id) {
    return /^\d{5}$/.test(id);
}

function isValidLatLng(lat, lng) {
    return (
        !isNaN(lat) &&
        !isNaN(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
    );
}

/* =====================================================
   GET STATIONS (Search + District + Pagination)
===================================================== */
exports.getStations = async (req, res) => {
    try {
        let { search = "", district = "", page = 1, limit = 50 } = req.query;

        page = Math.max(parseInt(page) || 1, 1);
        limit = Math.min(Math.max(parseInt(limit) || 50, 1), 200);
        const offset = (page - 1) * limit;

        let conditions = [];
        let values = [];
        let index = 1;

        if (search.trim()) {
            conditions.push(`station_id ILIKE $${index++}`);
            values.push(`%${search.trim()}%`);
        }

        if (district && district !== "ALL") {
            conditions.push(`LEFT(station_id, 2) = $${index++}`);
            values.push(district);
        }

        const whereClause =
            conditions.length > 0
                ? `WHERE ${conditions.join(" AND ")}`
                : "";

        const countQuery = `
            SELECT COUNT(*) 
            FROM tracking.stations
            ${whereClause}
        `;

        const countResult = await pool.query(countQuery, values);
        const total = parseInt(countResult.rows[0].count);

        const dataQuery = `
            SELECT *
            FROM tracking.stations
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${index++}
            OFFSET $${index}
        `;

        const dataValues = [...values, limit, offset];

        const result = await pool.query(dataQuery, dataValues);

        return res.status(200).json({
            success: true,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            data: result.rows
        });

    } catch (error) {
        console.error("Get Stations Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch stations"
        });
    }
};

/* =====================================================
   CREATE STATION
===================================================== */
exports.createStation = async (req, res) => {
    try {
        let {
            station_id,
            assigned_latitude,
            assigned_longitude,
            allowed_radius_meters
        } = req.body;

        if (!station_id || assigned_latitude === undefined || assigned_longitude === undefined) {
            return res.status(400).json({
                success: false,
                message: "station_id, latitude and longitude are required"
            });
        }

        station_id = station_id.trim();

        if (!isValidStationId(station_id)) {
            return res.status(400).json({
                success: false,
                message: "Station ID must be 5 digits (e.g. 85003)"
            });
        }

        const lat = parseFloat(assigned_latitude);
        const lng = parseFloat(assigned_longitude);
        const radius = parseInt(allowed_radius_meters) || 300;

        if (!isValidLatLng(lat, lng)) {
            return res.status(400).json({
                success: false,
                message: "Invalid latitude or longitude values"
            });
        }

        await pool.query(`
            INSERT INTO tracking.stations
            (station_id, assigned_latitude, assigned_longitude, allowed_radius_meters, status)
            VALUES ($1, $2, $3, $4, 'OFFLINE')
        `, [station_id, lat, lng, radius]);

        return res.status(201).json({
            success: true,
            message: "Station created successfully"
        });

    } catch (error) {

        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "Station ID already exists"
            });
        }

        console.error("Create Station Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create station"
        });
    }
};

/* =====================================================
   UPDATE STATION
===================================================== */
exports.updateStation = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Station ID required"
            });
        }

        const {
            assigned_latitude,
            assigned_longitude,
            allowed_radius_meters,
            status
        } = req.body;

        const lat = parseFloat(assigned_latitude);
        const lng = parseFloat(assigned_longitude);
        const radius = parseInt(allowed_radius_meters);

        if (!isValidLatLng(lat, lng) || isNaN(radius)) {
            return res.status(400).json({
                success: false,
                message: "Invalid numeric values"
            });
        }

        if (status && !VALID_STATUSES.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status value"
            });
        }

        const result = await pool.query(`
            UPDATE tracking.stations
            SET assigned_latitude = $1,
                assigned_longitude = $2,
                allowed_radius_meters = $3,
                status = COALESCE($4, status),
                updated_at = NOW()
            WHERE station_id = $5
            RETURNING *
        `, [
            lat,
            lng,
            radius,
            status || null,
            id
        ]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Station not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Station updated successfully",
            data: result.rows[0]
        });

    } catch (error) {
        console.error("Update Station Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update station"
        });
    }
};

/* =====================================================
   DELETE STATION
===================================================== */
exports.deleteStation = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
            DELETE FROM tracking.stations
            WHERE station_id = $1
            RETURNING station_id
        `, [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Station not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Station deleted successfully"
        });

    } catch (error) {
        console.error("Delete Station Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete station"
        });
    }
};

/* =====================================================
   BULK CREATE STATIONS (High Performance)
===================================================== */
exports.bulkCreateStations = async (req, res) => {
    const { stations } = req.body;

    if (!Array.isArray(stations) || stations.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Stations array is required"
        });
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const values = [];
        const placeholders = [];

        let index = 1;
        let validCount = 0;

        for (const station of stations) {
            const {
                station_id,
                assigned_latitude,
                assigned_longitude,
                allowed_radius_meters
            } = station;

            if (!isValidStationId(station_id)) continue;

            const lat = parseFloat(assigned_latitude);
            const lng = parseFloat(assigned_longitude);
            const radius = parseInt(allowed_radius_meters) || 300;

            if (!isValidLatLng(lat, lng)) continue;

            placeholders.push(
                `($${index++}, $${index++}, $${index++}, $${index++}, 'OFFLINE')`
            );

            values.push(station_id, lat, lng, radius);
            validCount++;
        }

        if (validCount === 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({
                success: false,
                message: "No valid stations found in upload"
            });
        }

        await client.query(`
            INSERT INTO tracking.stations
            (station_id, assigned_latitude, assigned_longitude, allowed_radius_meters, status)
            VALUES ${placeholders.join(",")}
            ON CONFLICT (station_id) DO NOTHING
        `, values);

        await client.query("COMMIT");

        return res.status(201).json({
            success: true,
            message: "Bulk upload completed",
            data: {
                processed: stations.length,
                inserted: validCount
            }
        });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Bulk Upload Error:", error);

        return res.status(500).json({
            success: false,
            message: "Bulk upload failed"
        });

    } finally {
        client.release();
    }
};