// Database initialization script - Run this once to set up PostgreSQL tables
require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const initializeDB = async () => {
    // We use the same connection string format defined in your .env and backend.js
    const frontend = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await frontend.connect();
        console.log('✅ Connected successfully to PostgreSQL database');

        // Read the schema SQL file
        const schemaPath = path.join(__dirname, 'database-schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        
        console.log('⏳ Executing schema creation statements...');
        
        // pg can execute multiple semicolon-separated statements in a single query call
        await frontend.query(schemaSql);
        
        console.log('✅ Database schema setup complete!');
        console.log('   - Created table: users');
        console.log('   - Created table: admins');
        console.log('   - Created table: phd_applications');

    } catch (err) {
        console.error('❌ Error executing database setup:', err.message);
        process.exit(1);
    } finally {
        await frontend.end();
        process.exit(0);
    }
};

initializeDB();