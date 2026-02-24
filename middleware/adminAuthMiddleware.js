const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            message: "No token provided"
        });
    }

    try {
        // Expecting: Bearer TOKEN
        const token = authHeader.startsWith("Bearer ")
            ? authHeader.split(" ")[1]
            : authHeader;

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = decoded;   // 👈 attach full user object
        next();

    } catch (error) {

        console.error("Admin JWT Error:", error);

        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
};