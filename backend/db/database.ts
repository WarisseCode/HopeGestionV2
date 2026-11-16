import { Pool, PoolConfig } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

// Taille du pool : 20 par défaut (avant : 10, calibré pour l'ancienne base DigitalOcean
// limitée à 25 connexions). La base tourne désormais sur le VPS (docs/DEPLOIEMENT_VPS.md,
// PostgreSQL local, max_connections = 100 par défaut) : 20 laisse une large marge aux
// migrations et à l'administration. Chaque requête protégée garde une connexion le temps
// de son traitement (tenantGuard) : à 10, quelques utilisateurs simultanés suffisaient à
// faire attendre les requêtes. Ajustable avec DB_POOL_MAX (ex. base distante plafonnée).
const POOL_MAX  = parseInt(process.env.DB_POOL_MAX  || '20');
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
