import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const pool = new Pool({ connectionString: process.env.PROD_DATABASE_URL || process.env.DATABASE_URL });

pool.query('SELECT statut, COUNT(*) FROM lots GROUP BY statut ORDER BY statut', (err, res) => {
    if (err) {
        console.error(err);
        pool.end();
        return;
    }
    console.log(res?.rows);
    pool.end();
});
