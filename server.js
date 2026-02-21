//require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const cron = require("node-cron");
const { Pool } = require("pg");

const app = express();

/* =============================
   MIDDLEWARE
============================= */
app.use(cors({
    origin: "*",
    methods: ["GET", "POST"]
}));
app.use(express.json());

/* =============================
   POSTGRES CONNECTION
============================= */
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL);

pool.connect()
    .then(() => console.log("✅ PostgreSQL Connected"))
    .catch(err => console.error("❌ PostgreSQL Error:", err));

app.set("db", pool);

/* =============================
   ROUTES
============================= */
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

const locationRoutes = require("./routes/locationRoutes");
app.use("/api/location", locationRoutes);

const batchRoutes = require("./routes/batchRoutes");
app.use("/api/location", batchRoutes);

const heartbeatRoutes = require("./routes/heartbeatRoutes");
app.use("/api/heartbeat", heartbeatRoutes);

/* ✅ IMPORTANT — ADD THIS */
const stationRoutes = require("./routes/stationRoutes");
app.use("/api/stations", stationRoutes);

/* =============================
   HTTP + SOCKET.IO
============================= */
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
});

app.set("io", io);

/* =============================
   OFFLINE DETECTION CRON
   Runs every minute
============================= */
cron.schedule("* * * * *", async () => {
    try {

        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

        const result = await pool.query(`
            UPDATE tracking.stations
            SET status = 'OFFLINE'
            WHERE updated_at < $1
            AND status != 'OFFLINE'
            RETURNING station_id
        `, [twoMinutesAgo]);

        result.rows.forEach(row => {
            io.emit("statusUpdate", {
                stationId: row.station_id,
                status: "OFFLINE"
            });

            console.log(`Station ${row.station_id} marked OFFLINE`);
        });

    } catch (error) {
        console.error("Cron Error:", error.message);
    }
});

/* =============================
   ROOT TEST ROUTE
============================= */
app.get("/", (req, res) => {
    res.send("Station Tracker Backend Running 🚀 (PostgreSQL)");
});

/* =============================
   SOCKET CONNECTION
============================= */
io.on("connection", (socket) => {
    console.log("🟢 Client Connected:", socket.id);

    socket.on("disconnect", () => {
        console.log("🔴 Client Disconnected:", socket.id);
    });
});

/* =============================
   START SERVER
============================= */
const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});