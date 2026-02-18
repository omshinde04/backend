const Station = require("../models/Station");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");


// ==========================
// REGISTER STATION
// ==========================
exports.registerStation = async (req, res) => {
    try {
        const { stationId, password, latitude, longitude } = req.body;

        if (!stationId || !password || !latitude || !longitude) {
            return res.status(400).json({
                message: "Station ID, Password and Location required"
            });
        }

        const existing = await Station.findOne({ stationId });
        if (existing) {
            return res.status(400).json({
                message: "Station already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const station = new Station({
            stationId,
            password: hashedPassword,
            assignedLocation: {
                type: "Point",
                coordinates: [longitude, latitude]
            },
            status: "OFFLINE"
        });

        await station.save();

        res.status(201).json({
            message: "Station registered successfully"
        });

    } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({
            message: "Server error"
        });
    }
};


// ==========================
// LOGIN STATION
// ==========================
exports.loginStation = async (req, res) => {
    try {
        const { stationId, password } = req.body;

        if (!stationId || !password) {
            return res.status(400).json({
                message: "Station ID and Password are required"
            });
        }

        const station = await Station.findOne({ stationId });

        if (!station) {
            return res.status(400).json({
                message: "Invalid credentials"
            });
        }

        const isMatch = await bcrypt.compare(password, station.password);

        if (!isMatch) {
            return res.status(400).json({
                message: "Invalid credentials"
            });
        }

        const token = jwt.sign(
            {
                stationId: station.stationId
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        res.json({
            token,
            stationId: station.stationId
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({
            message: "Server error"
        });
    }
};
