const pool = require("../config/db");

/* =========================================
   1️⃣ Live Status Distribution
   ========================================= */
exports.getStatusDistribution = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT status, COUNT(*)::int AS count
            FROM tracking.current_location
            GROUP BY status
        `);

        const formatted = {
            INSIDE: 0,
            OUTSIDE: 0
        };

        result.rows.forEach(row => {
            formatted[row.status] = row.count;
        });

        return res.status(200).json({
            success: true,
            data: formatted
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
   ?days=7 (default 7 days)
   ========================================= */
exports.getDailyViolations = async (req, res) => {
    try {
        const days = Math.min(
            parseInt(req.query.days) || 7,
            90
        );

        const result = await pool.query(`
            SELECT 
                DATE(recorded_at) AS day,
                COUNT(*)::int AS count
            FROM tracking.location_logs
            WHERE recorded_at >= NOW() - INTERVAL '${days} days'
            GROUP BY day
            ORDER BY day ASC
        `);

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
   ?limit=5
   ========================================= */
exports.getTopViolators = async (req, res) => {
    try {
        const limit = Math.min(
            parseInt(req.query.limit) || 5,
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