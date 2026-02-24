const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const pool = require("../config/db");

exports.login = async (req, res) => {
    try {
        console.log("REQ BODY:", req.body); // 🔥 debug log

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password required"
            });
        }

        const result = await pool.query(
            "SELECT * FROM users WHERE email=$1 AND is_active=true",
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        const user = result.rows[0];

        // 🔐 Compare bcrypt hash
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        // 🔐 Generate JWT
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