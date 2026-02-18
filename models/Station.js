const mongoose = require("mongoose");

const stationSchema = new mongoose.Schema(
    {
        stationId: {
            type: String,
            required: true,
            unique: true
        },

        password: {
            type: String,
            required: true
        },

        assignedLocation: {
            type: {
                type: String,
                enum: ["Point"]
            },
            coordinates: {
                type: [Number],
                index: "2dsphere"
            }
        },

        allowedRadiusMeters: {
            type: Number,
            default: 300
        },

        status: {
            type: String,
            enum: ["INSIDE", "OUTSIDE", "OFFLINE"],
            default: "OFFLINE"
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Station", stationSchema);
