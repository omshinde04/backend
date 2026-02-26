const pool = require("../config/db");

exports.getLogs = async (req, res) => {
    try {

        const {
            stationId,
            from,
            to,
            status,
            lastTime,
            limit = 20
        } = req.query;

        if (!stationId) {
            return res.status(400).json({
                success: false,
                message: "stationId required"
            });
        }

        const safeLimit = Math.min(parseInt(limit) || 20, 100);

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

        if (lastTime) {
            conditions.push(`recorded_at < $${index++}`);
            values.push(lastTime);
        }

        const whereClause = `WHERE ${conditions.join(" AND ")}`;

        const query = `
            SELECT id,
                   station_id,
                   latitude,
                   longitude,
                   distance_meters,
                   status,
                   recorded_at
            FROM tracking.location_logs
            ${whereClause}
            ORDER BY recorded_at DESC
            LIMIT ${safeLimit}
        `;

        const result = await pool.query(query, values);

        return res.json({
            success: true,
            data: result.rows,
            hasMore: result.rows.length === safeLimit
        });

    } catch (error) {
        console.error("Logs Fetch Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch logs"
        });
    }
};