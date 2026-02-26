const pool = require("../config/db");
const { Parser } = require("json2csv");

/* =====================================================
   GET LOGS (Cursor Pagination - Production Ready)
===================================================== */
exports.getLogs = async (req, res) => {
    try {
        let {
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

        // Normalize
        stationId = stationId.trim();

        const safeLimit = Math.min(parseInt(limit) || 20, 100);

        let conditions = ["station_id = $1"];
        let values = [stationId];
        let index = 2;

        // Validate ISO date inputs
        if (from) {
            const fromDate = new Date(from);
            if (isNaN(fromDate)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid 'from' date"
                });
            }
            conditions.push(`recorded_at >= $${index++}`);
            values.push(fromDate.toISOString());
        }

        if (to) {
            const toDate = new Date(to);
            if (isNaN(toDate)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid 'to' date"
                });
            }
            conditions.push(`recorded_at <= $${index++}`);
            values.push(toDate.toISOString());
        }

        if (status) {
            conditions.push(`status = $${index++}`);
            values.push(status);
        }

        if (lastTime) {
            const cursorDate = new Date(lastTime);
            if (!isNaN(cursorDate)) {
                conditions.push(`recorded_at < $${index++}`);
                values.push(cursorDate.toISOString());
            }
        }

        const whereClause = `WHERE ${conditions.join(" AND ")}`;

        const query = `
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
            LIMIT ${safeLimit}
        `;

        const result = await pool.query(query, values);

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            hasMore: result.rows.length === safeLimit,
            data: result.rows
        });

    } catch (error) {
        console.error("Logs Fetch Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch logs"
        });
    }
};



/* =====================================================
   EXPORT LOGS AS CSV (Optimized & Safe)
===================================================== */
exports.exportLogsCSV = async (req, res) => {
    try {
        let { stationId, from, to, status } = req.query;

        if (!stationId) {
            return res.status(400).json({
                success: false,
                message: "stationId required"
            });
        }

        stationId = stationId.trim();

        let conditions = ["station_id = $1"];
        let values = [stationId];
        let index = 2;

        if (from) {
            conditions.push(`recorded_at >= $${index++}`);
            values.push(new Date(from).toISOString());
        }

        if (to) {
            conditions.push(`recorded_at <= $${index++}`);
            values.push(new Date(to).toISOString());
        }

        if (status) {
            conditions.push(`status = $${index++}`);
            values.push(status);
        }

        const whereClause = `WHERE ${conditions.join(" AND ")}`;

        const query = `
            SELECT
                station_id,
                latitude,
                longitude,
                distance_meters,
                status,
                recorded_at
            FROM tracking.location_logs
            ${whereClause}
            ORDER BY recorded_at DESC
            LIMIT 50000
        `;

        const result = await pool.query(query, values);

        const fields = [
            "station_id",
            "latitude",
            "longitude",
            "distance_meters",
            "status",
            "recorded_at"
        ];

        const parser = new Parser({ fields });
        const csv = parser.parse(result.rows);

        res.header("Content-Type", "text/csv");
        res.attachment(`logs-${stationId}-${Date.now()}.csv`);

        return res.send(csv);

    } catch (error) {
        console.error("CSV Export Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to export logs"
        });
    }
};