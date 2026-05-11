
import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

async function test() {
  const connectionString = process.env.DATABASE_URL;
  console.log('Testing connection to:', connectionString);
  
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    const client = await pool.connect();
    console.log('Connected successfully!');
    const res = await client.query('SELECT 1');
    console.log('Query result:', res.rows);
    client.release();
  } catch (err) {
    console.error('Connection failed:', err);
  } finally {
    await pool.end();
  }
}

test();
