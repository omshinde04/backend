const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            message: "No token provided"
        });
    }

    try {
        const token = authHeader.startsWith("Bearer ")
            ? authHeader.split(" ")[1]
            : authHeader;

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.stationId = decoded.stationId;

        next();

    } catch (error) {

        console.error("JWT Error:", error.message);

        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
};
