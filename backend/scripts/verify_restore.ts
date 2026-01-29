
// @ts-nocheck
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function check() {
    try {
        const buildings = await pool.query(`
            SELECT b.id, b.nom, o.email as owner_email 
            FROM buildings b 
            JOIN owners o ON b.owner_id = o.id
        `);
        console.log('Buildings in DB:', buildings.rows);

        const lots = await pool.query('SELECT COUNT(*) FROM lots');
        console.log('Total Lots:', lots.rows[0].count);
    } catch(e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
check();
