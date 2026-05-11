const { Pool } = require('pg');
require('dotenv').config();

async function testConnection() {
    const connectionString = process.env.DATABASE_URL.replace('sslmode=require', 'sslmode=disable');
    console.log('Connecting to (SSL disabled):', connectionString.replace(/:[^:]+@/, ':****@'));
    
    const pool = new Pool({
      connectionString,
      connectionTimeoutMillis: 5000,
    });

    try {
        console.log('Attempting to connect...');
        const client = await pool.connect();
        console.log('Connected successfully!');
        client.release();
    } catch (err) {
        console.error('Connection error (expected SSL error):', err.message);
    } finally {
        await pool.end();
    }
}

testConnection();
