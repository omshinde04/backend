const pool = require("../config/db");

exports.getLogs = async (req, res) => {
    try {
        let {
            stationId,
            page = 1,
            limit = 50,
            from,
            to,
            status
        } = req.query;

        page = parseInt(page);
        limit = parseInt(limit);

        if (!stationId) {
            return res.status(400).json({
                success: false,
                message: "stationId is required"
            });
        }

        const offset = (page - 1) * limit;

        let conditions = ["station_id = $1"];
        let values = [stationId];
        let index = 2;

        if (from) {
            conditions.push(`recorded_at >= $${index++}`);
            values.push(from);
        }

        if (to) {
            conditions.push(`recorded_at <= $${index++}`);
            values.push(to);
        }

        if (status) {
            conditions.push(`status = $${index++}`);
            values.push(status);
        }

        const whereClause = conditions.length
            ? `WHERE ${conditions.join(" AND ")}`
            : "";

        const logsQuery = `
            SELECT 
                id,
                station_id,
                latitude,
                longitude,
                distance_meters,
                status,
                recorded_at
            FROM tracking.location_logs
            ${whereClause}
            ORDER BY recorded_at DESC
            LIMIT $${index++} OFFSET $${index}
        `;

        values.push(limit);
        values.push(offset);

        const logs = await pool.query(logsQuery, values);

        const countQuery = `
            SELECT COUNT(*) 
            FROM tracking.location_logs
            ${whereClause}
        `;

        const countResult = await pool.query(countQuery, values.slice(0, index - 2));

        return res.json({
            success: true,
            page,
            limit,
            total: parseInt(countResult.rows[0].count),
            totalPages: Math.ceil(countResult.rows[0].count / limit),
            data: logs.rows
        });

    } catch (error) {
        console.error("Logs Fetch Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch logs"
        });
    }
};