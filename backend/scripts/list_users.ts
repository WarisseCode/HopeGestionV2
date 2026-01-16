
import { pool } from '../index'; // Adjust path if needed, might need register TS or run with ts-node
// Actually importing from index might start server. Better to import pool from db/database.
import pool from '../db/database';

async function listUsers() {
    try {
        const res = await pool.query('SELECT id, email, role, user_type FROM users ORDER BY id DESC');
        console.log('USERS LIST:');
        console.table(res.rows);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

listUsers();
