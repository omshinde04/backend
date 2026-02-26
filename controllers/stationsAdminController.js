const pool = require("../config/db");

/* =====================================================
   GET STATIONS (Search + District Filter + Pagination)
===================================================== */
exports.getStations = async (req, res) => {
    try {
        let {
            search = "",
            district = "",
            page = 1,
            limit = 50
        } = req.query;

        page = parseInt(page) || 1;
        limit = Math.min(parseInt(limit) || 50, 200);
        const offset = (page - 1) * limit;

        let conditions = [];
        let values = [];
        let index = 1;

        // Search by station_id (partial match)
        if (search) {
            conditions.push(`station_id ILIKE $${index++}`);
            values.push(`%${search.trim()}%`);
        }

        // Filter by district code (first 2 digits)
        if (district) {
            conditions.push(`LEFT(station_id, 2) = $${index++}`);
            values.push(district);
        }

        const whereClause =
            conditions.length > 0
                ? `WHERE ${conditions.join(" AND ")}`
                : "";

        const query = `
            SELECT *
            FROM tracking.stations
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${index++}
            OFFSET $${index}
        `;

        values.push(limit, offset);

        const result = await pool.query(query, values);

        return res.status(200).json({
            success: true,
            page,
            limit,
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {
        console.error("Get Stations Error:", error.message);

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

        // Validate station_id format (2 district digits + 3 numbers)
        if (!/^\d{5}$/.test(station_id)) {
            return res.status(400).json({
                success: false,
                message: "Station ID must be 5 digits (e.g. 85003)"
            });
        }

        const lat = parseFloat(assigned_latitude);
        const lng = parseFloat(assigned_longitude);
        const radius = parseInt(allowed_radius_meters) || 300;

        if (isNaN(lat) || isNaN(lng)) {
            return res.status(400).json({
                success: false,
                message: "Latitude and Longitude must be valid numbers"
            });
        }

        await pool.query(`
            INSERT INTO tracking.stations (
                station_id,
                assigned_latitude,
                assigned_longitude,
                allowed_radius_meters,
                status
            )
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

        console.error("Create Station Error:", error.message);

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

        let {
            assigned_latitude,
            assigned_longitude,
            allowed_radius_meters,
            status
        } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Station ID required"
            });
        }

        const lat = parseFloat(assigned_latitude);
        const lng = parseFloat(assigned_longitude);
        const radius = parseInt(allowed_radius_meters);

        if (isNaN(lat) || isNaN(lng) || isNaN(radius)) {
            return res.status(400).json({
                success: false,
                message: "Invalid numeric values"
            });
        }

        const validStatuses = ["INSIDE", "OUTSIDE", "OFFLINE"];

        if (status && !validStatuses.includes(status)) {
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

        console.error("Update Station Error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to update station"
        });
    }
};