const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

// ==========================
// REGISTER (OPTIONAL)
// ==========================
exports.registerStation = async (req, res) => {
    try {

        const { stationId, password } = req.body;

        if (!stationId || !password) {
            return res.status(400).json({
                message: "Station ID and Password required"
            });
        }

        const existing = await pool.query(
            "SELECT station_id FROM tracking.stations WHERE station_id = $1",
            [stationId]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({
                message: "Station already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await pool.query(
            `INSERT INTO tracking.stations 
             (station_id, password_hash, status) 
             VALUES ($1, $2, 'OFFLINE')`,
            [stationId, hashedPassword]
        );

        res.status(201).json({
            message: "Station registered successfully"
        });

    } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};


// ==========================
// LOGIN (OPTIONAL)
// ==========================
exports.loginStation = async (req, res) => {
    try {

        const { stationId, password } = req.body;

        const result = await pool.query(
            "SELECT * FROM tracking.stations WHERE station_id = $1",
            [stationId]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const station = result.rows[0];

        const isMatch = await bcrypt.compare(
            password,
            station.password_hash
        );

        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
            { stationId },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({ token });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};


// ==========================
// AUTO LOGIN (PRODUCTION)
// ==========================
exports.autoLogin = async (req, res) => {
    try {

        const { stationId } = req.body;

        if (!stationId) {
            return res.status(400).json({
                message: "Station ID required"
            });
        }

        const result = await pool.query(
            "SELECT station_id FROM tracking.stations WHERE station_id = $1",
            [stationId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Station not found"
            });
        }

        const token = jwt.sign(
            { stationId },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({ token });

    } catch (error) {
        console.error("Auto Login Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
