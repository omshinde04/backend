require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const compression = require("compression");
const { Server } = require("socket.io");
const cron = require("node-cron");
const { Pool } = require("pg");

const app = express();

/* =============================
   TRUST PROXY (IMPORTANT FOR RENDER)
============================= */
app.set("trust proxy", 1);

/* =============================
   MIDDLEWARE
============================= */

// ✅ Proper CORS (PUT, DELETE supported)
app.use(cors({
    origin: "*", // You can restrict to frontend URL later
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// ❌ Removed app.options("*", cors()); (Not needed, caused crash)

// ✅ Compression
app.use(compression());

// ✅ JSON Parser
app.use(express.json({ limit: "1mb" }));

const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,

    ssl: isProduction
        ? { rejectUnauthorized: false }
        : false,

    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
});

console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL);

// DB Test
(async () => {
    try {
        await pool.query("SELECT 1");
        console.log("✅ PostgreSQL Connected");
    } catch (err) {
        console.error("❌ PostgreSQL Error:", err);
    }
})();

app.set("db", pool);

/* =============================
   ROUTES
============================= */
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/location", require("./routes/batchRoutes"));
app.use("/api/location", require("./routes/locationRoutes"));
app.use("/api/heartbeat", require("./routes/heartbeatRoutes"));
app.use("/api/stations", require("./routes/stationRoutes"));
app.use("/api/dashboard", require("./routes/loginRoute"));
app.use("/api/geocode", require("./routes/geocodeRoute"));
app.use("/api/analytics", require("./routes/analyticsRoute"));
app.use("/api/logs", require("./routes/logsRoutes"));
app.use("/api", require("./routes/logRoutes"));
app.use("/api/admin/stations", require("./routes/stationsAdminRoutes"));

/* =============================
   HTTP + SOCKET.IO
============================= */
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    },
    pingInterval: 20000,
    pingTimeout: 20000,
    transports: ["websocket", "polling"],
    allowEIO3: true
});

app.set("io", io);

/* =============================
   OFFLINE DETECTION CRON
============================= */
cron.schedule("* * * * *", async () => {
    try {
        const result = await pool.query(`
            UPDATE tracking.stations s
            SET status = 'OFFLINE'
            FROM tracking.current_location cl
            WHERE s.station_id = cl.station_id
            AND NOW() - cl.updated_at > INTERVAL '2 minutes'
            AND s.status != 'OFFLINE'
            RETURNING s.station_id
        `);

        result.rows.forEach(row => {
            io.emit("statusUpdate", {
                stationId: row.station_id,
                status: "OFFLINE"
            });

            console.log(`⚠ Station ${row.station_id} marked OFFLINE`);
        });

    } catch (error) {
        console.error("Cron Error:", error.message);
    }
});

/* =============================
   ROOT ROUTE
============================= */
app.get("/", (req, res) => {
    res.send("Station Tracker Backend Running 🚀 (PostgreSQL)");
});

/* =============================
   SOCKET EVENTS
============================= */
io.on("connection", (socket) => {
    console.log("🟢 Client Connected:", socket.id);

    socket.on("disconnect", (reason) => {
        console.log("🔴 Client Disconnected:", socket.id, "Reason:", reason);
    });

    socket.on("error", (err) => {
        console.error("Socket Error:", err);
    });
});

/* =============================
   GLOBAL ERROR HANDLER
============================= */
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (err) => {
    console.error("Unhandled Rejection:", err);
});

/* =============================
   START SERVER
============================= */
const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});