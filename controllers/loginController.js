const jwt = require("jsonwebtoken");
const pool = require("../config/db"); // adjust path if needed

exports.login = async (req, res) => {

    const { email, password } = req.body;

    try {

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

        // 🔥 TEMP plain password check
        if (password !== user.password) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: "8h" }
        );

        res.json({
            message: "Login successful",
            token
        });

    } catch (error) {

        console.error("Login Error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
};