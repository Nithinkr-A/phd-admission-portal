const { Pool } = require('pg');

const db = new Pool({
    connectionString: process.env.DATABASE_URL
});

const ensureDefaultAdmin = async () => {
    try {
        const existing = await db.query('SELECT COUNT(*)::int AS count FROM admins');
        if (existing.rows[0].count === 0) {
            await db.query("INSERT INTO admins (name, email, password) VALUES ($1, $2, $3)", ['System Administrator', 'admin@iiest.ac.in', 'Admin@1234']);
            console.log('✅ Default admin account seeded.');
        }
    } catch (error) {
        console.error('⚠️ Could not seed default admin:', error.message);
    }
};

db.connect((err, frontend, release) => {
    if (err) {
        console.error('❌ Error connecting to PostgreSQL:', err.stack);
        process.exit(1);
    }
    console.log('🚀 Successfully connected to PostgreSQL Database!');
    release();
    ensureDefaultAdmin();
});

module.exports = db;