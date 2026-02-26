const pool = require("../config/db");
const { Parser } = require("json2csv");

/* =====================================================
   GET LOGS (Timezone Safe + Cursor Pagination)
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

        stationId = stationId.trim();

        const safeLimit = Math.min(parseInt(limit) || 20, 100);

        let conditions = ["station_id = $1"];
        let values = [stationId];
        let index = 2;

        /* ========= FROM FILTER ========= */
        if (from) {
            conditions.push(`recorded_at >= $${index++}::timestamp`);
            values.push(from); // DO NOT convert to ISO
        }

        /* ========= TO FILTER ========= */
        if (to) {
            conditions.push(`recorded_at <= $${index++}::timestamp`);
            values.push(to); // DO NOT convert to ISO
        }

        /* ========= STATUS FILTER ========= */
        if (status) {
            conditions.push(`status = $${index++}`);
            values.push(status);
        }

        /* ========= CURSOR PAGINATION ========= */
        if (lastTime) {
            conditions.push(`recorded_at < $${index++}::timestamp`);
            values.push(lastTime);
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
   EXPORT LOGS AS CSV (Timezone Safe)
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
            conditions.push(`recorded_at >= $${index++}::timestamp`);
            values.push(from);
        }

        if (to) {
            conditions.push(`recorded_at <= $${index++}::timestamp`);
            values.push(to);
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

        if (!result.rows.length) {
            return res.status(200).json({
                success: true,
                message: "No logs found",
                data: []
            });
        }

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

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=logs-${stationId}-${Date.now()}.csv`
        );

        return res.status(200).send(csv);

    } catch (error) {
        console.error("CSV Export Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to export logs"
        });
    }
};