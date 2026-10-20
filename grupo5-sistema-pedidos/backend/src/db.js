import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pg;

const required = [
  'LOCAL_DB_HOST', 'LOCAL_DB_NAME', 'LOCAL_DB_USER', 'LOCAL_DB_PASSWORD',
  'PRODUCER_DB_HOST', 'PRODUCER_DB_NAME', 'PRODUCER_DB_USER', 'PRODUCER_DB_PASSWORD'
];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.warn(`Configuração ausente no .env: ${missing.join(', ')}`);
}

export const localPool = new Pool({
  host: process.env.LOCAL_DB_HOST,
  port: Number(process.env.LOCAL_DB_PORT || 5432),
  database: process.env.LOCAL_DB_NAME,
  user: process.env.LOCAL_DB_USER,
  password: process.env.LOCAL_DB_PASSWORD,
  max: 10,
  connectionTimeoutMillis: 5000
});

export const producerPool = new Pool({
  host: process.env.PRODUCER_DB_HOST,
  port: Number(process.env.PRODUCER_DB_PORT || 5432),
  database: process.env.PRODUCER_DB_NAME,
  user: process.env.PRODUCER_DB_USER,
  password: process.env.PRODUCER_DB_PASSWORD,
  ssl: String(process.env.PRODUCER_DB_SSL).toLowerCase() === 'true'
    ? { rejectUnauthorized: true }
    : false,
  max: 3,
  connectionTimeoutMillis: 5000,
  statement_timeout: 15000
});
