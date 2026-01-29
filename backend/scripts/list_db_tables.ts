
import pool from '../db/database';
import * as dotenv from 'dotenv';
dotenv.config();

async function listTables() {
    try {
        const query = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'";
        const res = await pool.query(query);
        console.log('Tables in database:');
        res.rows.forEach(r => console.log(r.table_name));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

listTables();
