const { Pool } = require('pg');
require('dotenv').config();

async function testConnection() {
    const connectionString = process.env.DATABASE_URL;
    console.log('Connecting to:', connectionString.replace(/:[^:]+@/, ':****@'));
    
    const isSSL = connectionString?.includes('sslmode=require') || connectionString?.includes('.neon.tech');

    const pool = new Pool({
      connectionString,
      ...(isSSL && { ssl: { rejectUnauthorized: false } }),
      connectionTimeoutMillis: 10000,
    });

    try {
        console.log('Attempting to connect...');
        const client = await pool.connect();
        console.log('Connected successfully!');
        const res = await client.query('SELECT NOW()');
        console.log('Query result:', res.rows[0]);
        client.release();
    } catch (err) {
        console.error('Connection error:', err);
    } finally {
        await pool.end();
    }
}

testConnection();
