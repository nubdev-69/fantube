import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Creates a connection pool to PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',        // localhost
  port: process.env.DB_PORT || 5432,        // 5432
  database: process.env.DB_NAME,    // youtube_db
  user: process.env.DB_USER,        // postgres
  password: process.env.DB_PASSWORD || '', // your password
  max: 20,  // Keep 20 connections open
});

// Helper to run queries
export const query = async (text, params) => {
  const res = await pool.query(text, params);
  return res;
};

export default pool;