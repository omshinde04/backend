const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            success: false,
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

        // ✅ ALLOW MULTIPLE ADMIN ROLES
        const allowedRoles = ["ADMIN", "SUPER_ADMIN"];

        if (!decoded || !allowedRoles.includes(decoded.role)) {
            return res.status(403).json({
                success: false,
                message: "Admin access required"
            });
        }

        req.user = decoded;
        next();

    } catch (error) {

        console.error("Admin JWT Error:", error.message);

        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
};