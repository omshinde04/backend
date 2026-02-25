const pool = require("../config/db");

/* =========================================
   1️⃣ Live Status Distribution (ONLY ONLINE)
========================================= */
exports.getStatusDistribution = async (req, res) => {
    try {

        const result = await pool.query(`
            SELECT 
                COUNT(*) FILTER (WHERE status = 'INSIDE')::int AS inside,
                COUNT(*) FILTER (WHERE status = 'OUTSIDE')::int AS outside,
                COUNT(*) FILTER (WHERE status = 'OFFLINE')::int AS offline
            FROM tracking.stations
        `);

        const row = result.rows[0] || {};

        return res.status(200).json({
            success: true,
            data: {
                INSIDE: row.inside || 0,
                OUTSIDE: row.outside || 0,
                OFFLINE: row.offline || 0,
                TOTAL: (row.inside || 0) + (row.outside || 0)
            }
        });

    } catch (error) {
        console.error("Status Analytics Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch status analytics"
        });
    }
};


/* =========================================
   2️⃣ Daily Violation Trend
   ?days=7 (max 90)
========================================= */
exports.getDailyViolations = async (req, res) => {
    try {

        const days = Math.min(
            Math.max(parseInt(req.query.days) || 7, 1),
            90
        );

        const result = await pool.query(`
            SELECT 
                DATE(recorded_at) AS day,
                COUNT(*)::int AS count
            FROM tracking.location_logs
            WHERE recorded_at >= NOW() - ($1 || ' days')::interval
            GROUP BY day
            ORDER BY day ASC
        `, [days]);

        return res.status(200).json({
            success: true,
            days,
            data: result.rows
        });

    } catch (error) {
        console.error("Daily Analytics Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch daily analytics"
        });
    }
};


/* =========================================
   3️⃣ Top Violating Stations
   ?limit=5 (max 20)
========================================= */
exports.getTopViolators = async (req, res) => {
    try {

        const limit = Math.min(
            Math.max(parseInt(req.query.limit) || 5, 1),
            20
        );

        const result = await pool.query(`
            SELECT 
                station_id,
                COUNT(*)::int AS violations
            FROM tracking.location_logs
            GROUP BY station_id
            ORDER BY violations DESC
            LIMIT $1
        `, [limit]);

        return res.status(200).json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error("Top Violators Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch top violators"
        });
    }
};