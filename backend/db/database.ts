import { Pool, PoolConfig } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

/**
 * Database configuration with SSL support for production
 */
const getDbConfig = (): PoolConfig => {
    // If DATABASE_URL is provided (Digital Ocean format)
    if (process.env.DATABASE_URL) {
        return {
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? {
                rejectUnauthorized: false // Digital Ocean requires this
            } : false
        };
    }

    // Fallback to individual environment variables
    const config: PoolConfig = {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'hopegestion',
        password: process.env.DB_PASSWORD || '',
        port: parseInt(process.env.DB_PORT || '5432'),
    };

    // Add SSL for production
    if (process.env.NODE_ENV === 'production') {
        config.ssl = {
            rejectUnauthorized: false
        };
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
        console.log('✅ Database connected successfully at:', res.rows[0].now);
    }
});

export default pool;
