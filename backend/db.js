import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the root .env file
// Only load .env in development (Docker uses environment variables from docker-compose)
if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: resolve(__dirname, '../.env') });
}

const { Pool } = pg;

// Create a connection pool using environment variables
const pool = new Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432', 10),
});

// Test the connection
pool.on('connect', () => {
    console.log(`✓ Connected to PostgreSQL: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`);
});

pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle client', err);
    process.exit(-1);
});

export default pool;
