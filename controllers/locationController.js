const Station = require("../models/Station");
const { getDistance } = require("geolib");

exports.updateLocation = async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        const stationId = req.stationId;

        if (!latitude || !longitude) {
            return res.status(400).json({ message: "Latitude and Longitude required" });
        }

        const station = await Station.findOne({ stationId });

        if (!station) {
            return res.status(404).json({ message: "Station not found" });
        }

        // SAFETY CHECK
        if (
            !station.assignedLocation ||
            !station.assignedLocation.coordinates ||
            station.assignedLocation.coordinates.length !== 2
        ) {
            return res.status(400).json({
                message: "Assigned location not configured for this station"
            });
        }

        const assignedLat = station.assignedLocation.coordinates[1];
        const assignedLng = station.assignedLocation.coordinates[0];

        const distance = getDistance(
            { latitude: assignedLat, longitude: assignedLng },
            { latitude, longitude }
        );

        const status =
            distance > station.allowedRadiusMeters ? "OUTSIDE" : "INSIDE";

        station.lastHeartbeat = new Date();
        station.status = status;

        await station.save();

        const io = req.app.get("io");

        if (io) {
            io.emit("locationUpdate", {
                stationId,
                latitude,
                longitude,
                status,
                distance
            });
        }

        res.json({
            message: "Location updated successfully",
            status,
            distance
        });

    } catch (error) {
        console.error("Location Update Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
