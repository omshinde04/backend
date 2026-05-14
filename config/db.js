const { Pool } = require("pg");

const isProduction = process.env.NODE_ENV === "production";

console.log("NODE_ENV:", process.env.NODE_ENV);

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,

    ssl: isProduction
        ? {
            rejectUnauthorized: false
        }
        : false
});

pool.connect()
    .then(() => console.log("✅ PostgreSQL Connected"))
    .catch(err => console.error("❌ PostgreSQL Error:", err.message));

module.exports = pool;