require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

//location routes 

const locationRoutes = require("./routes/locationRoutes");
app.use("/api/location", locationRoutes);

//heartbeat routes

const heartbeatRoutes = require("./routes/heartbeatRoutes");
app.use("/api/heartbeat", heartbeatRoutes);


// Create HTTP server
const server = http.createServer(app);

// Attach Socket.io
const io = new Server(server, {
    cors: {
        origin: "*",
    },
});

// Make io accessible inside routes/controllers
app.set("io", io);

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ MongoDB Error:", err));

//heartbeat detection
const cron = require("node-cron");
const Station = require("./models/Station");

cron.schedule("* * * * *", async () => {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    const inactiveStations = await Station.find({
        lastHeartbeat: { $lt: twoMinutesAgo },
        status: { $ne: "OFFLINE" }
    });

    for (let station of inactiveStations) {
        station.status = "OFFLINE";
        await station.save();

        io.emit("statusUpdate", {
            stationId: station.stationId,
            status: "OFFLINE"
        });

        console.log(`Station ${station.stationId} marked OFFLINE`);
    }
});


// Test route
app.get("/", (req, res) => {
    res.send("Station Tracker Backend Running 🚀");
});

// Test socket connection
io.on("connection", (socket) => {
    console.log("🟢 Client Connected:", socket.id);

    socket.on("disconnect", () => {
        console.log("🔴 Client Disconnected:", socket.id);
    });
});

// Start Server
const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
