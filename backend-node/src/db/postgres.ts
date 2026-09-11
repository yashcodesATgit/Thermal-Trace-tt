import { Pool } from 'pg';
import { env } from '../config/env';

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20, // Max number of clients in the pool
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

export const db = {
  query: (text: string, params?: any[]) => pool.query(text, params),
  connect: () => pool.connect(),
  close: () => pool.end(),
};

/**
 * Validates connectivity to the PostgreSQL database and checks if PostGIS is enabled.
 */
export async function checkDatabaseHealth(): Promise<{ status: string; postgis?: string; error?: string }> {
  try {
    const res = await pool.query('SELECT PostGIS_Version() as version');
    return { status: 'healthy', postgis: res.rows[0].version };
  } catch (error: any) {
    return { status: 'unhealthy', error: error.message };
  }
}
