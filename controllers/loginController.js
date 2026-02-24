const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const pool = require("../config/db");

exports.login = async (req, res) => {
    try {
        // 🔥 Extract safely
        let { email, password } = req.body;

        // ✅ Basic validation
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password required"
            });
        }

        // ✅ Normalize input (VERY IMPORTANT)
        email = email.trim().toLowerCase();
        password = password.trim();

        // ✅ Case-insensitive email match
        const result = await pool.query(
            "SELECT id, email, password, role, is_active FROM users WHERE LOWER(email) = $1",
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        const user = result.rows[0];

        // ✅ Check active
        if (!user.is_active) {
            return res.status(403).json({
                message: "Account inactive"
            });
        }

        // ✅ Compare bcrypt hash
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        // ✅ Generate JWT
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: "8h" }
        );

        return res.status(200).json({
            message: "Login successful",
            token
        });

    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({
            message: "Server error"
        });
    }
};