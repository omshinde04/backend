const pool = require("../config/db");

/* =========================================================
   1️⃣ STATUS OVERVIEW (SaaS-Level KPI Ready)
   Returns:
   - inside
   - outside
   - offline
   - online
   - total
   - complianceRate
========================================================= */
exports.getStatusDistribution = async (req, res) => {
    try {

        const result = await pool.query(`
            SELECT 
                COUNT(*) FILTER (WHERE status = 'INSIDE')::int  AS inside,
                COUNT(*) FILTER (WHERE status = 'OUTSIDE')::int AS outside,
                COUNT(*) FILTER (WHERE status = 'OFFLINE')::int AS offline,
                COUNT(*)::int AS total
            FROM tracking.stations
        `);

        const row = result.rows[0] || {};

        const inside = row.inside || 0;
        const outside = row.outside || 0;
        const offline = row.offline || 0;
        const total = row.total || 0;
        const online = inside + outside;

        const complianceRate =
            online === 0 ? 0 : Math.round((inside / online) * 100);

        return res.status(200).json({
            success: true,
            data: {
                INSIDE: inside,
                OUTSIDE: outside,
                OFFLINE: offline,
                ONLINE: online,
                TOTAL: total,
                COMPLIANCE_RATE: complianceRate
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


/* =========================================================
   2️⃣ DAILY VIOLATION TREND
   ?days=7 (max 90)
   Includes zero-fill for missing days (SaaS quality)
========================================================= */
exports.getDailyViolations = async (req, res) => {
    try {

        const days = Math.min(
            Math.max(parseInt(req.query.days) || 7, 1),
            90
        );

        const result = await pool.query(`
            WITH date_series AS (
                SELECT generate_series(
                    CURRENT_DATE - ($1 || ' days')::interval,
                    CURRENT_DATE,
                    '1 day'
                )::date AS day
            )
            SELECT 
                d.day,
                COALESCE(COUNT(l.station_id), 0)::int AS count
            FROM date_series d
            LEFT JOIN tracking.location_logs l
                ON DATE(l.recorded_at) = d.day
                AND l.status = 'OUTSIDE'
            GROUP BY d.day
            ORDER BY d.day ASC
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


/* =========================================================
   3️⃣ TOP VIOLATING STATIONS
   ?limit=5 (max 20)
   Only counts OUTSIDE violations
========================================================= */
exports.getTopViolators = async (req, res) => {
    try {

        const limit = Math.min(
            Math.max(parseInt(req.query.limit) || 5, 1),
            20
        );

        const result = await pool.query(`
            SELECT 
                station_id,
                COUNT(*) FILTER (WHERE status = 'OUTSIDE')::int AS violations
            FROM tracking.location_logs
            GROUP BY station_id
            HAVING COUNT(*) FILTER (WHERE status = 'OUTSIDE') > 0
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