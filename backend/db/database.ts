import { Pool, PoolConfig } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

// Digital Ocean Basic PostgreSQL caps at 25 max_connections.
// We claim at most 10 so other processes (migrations, admin) keep headroom.
const POOL_MAX  = parseInt(process.env.DB_POOL_MAX  || '10');
const POOL_MIN  = parseInt(process.env.DB_POOL_MIN  || '2');
// Close idle connections after 30 s; abort acquire after 10 s.
const POOL_IDLE_TIMEOUT_MS    = parseInt(process.env.DB_IDLE_TIMEOUT_MS    || '30000');
const POOL_CONNECT_TIMEOUT_MS = parseInt(process.env.DB_CONNECT_TIMEOUT_MS || '10000');

const POOL_SIZING: Partial<PoolConfig> = {
    max:                    POOL_MAX,
    min:                    POOL_MIN,
    idleTimeoutMillis:      POOL_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: POOL_CONNECT_TIMEOUT_MS,
    allowExitOnIdle:        true,
};

const getDbConfig = (): PoolConfig => {
    if (process.env.DATABASE_URL) {
        return {
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
            ...POOL_SIZING,
        };
    }

    const config: PoolConfig = {
        user:     process.env.DB_USER     || 'postgres',
        host:     process.env.DB_HOST     || 'localhost',
        database: process.env.DB_NAME     || 'hopegestion',
        password: process.env.DB_PASSWORD || '',
        port:     parseInt(process.env.DB_PORT || '5432'),
        ...POOL_SIZING,
    };

    if (process.env.NODE_ENV === 'production') {
        config.ssl = { rejectUnauthorized: false };
    }

    return config;
};

const pool = new Pool(getDbConfig());

// Handle pool errors
pool.on('error', (err) => {
    console.error('Unexpected database error:', err);
});

// Test connection on startup
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
    } else {
        console.log(`✅ Database connected at ${res.rows[0].now} (pool min=${POOL_MIN} max=${POOL_MAX})`);
    }
});

export default pool;
