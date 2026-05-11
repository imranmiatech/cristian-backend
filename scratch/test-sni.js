import pkg from 'pg';
const { Client } = pkg;
import 'dotenv/config';

async function test() {
  const connectionString = process.env.DATABASE_URL;
  const host = connectionString.split('@')[1].split('/')[0].split(':')[0];
  console.log('Testing with explicit SNI (servername):', host);
  
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
      servername: host,
    },
  });

  try {
    console.log('Connecting...');
    await client.connect();
    console.log('Connected successfully!');
    client.end();
  } catch (err) {
    console.error('Connection failed:', err.message);
    client.end();
  }
}

test();
