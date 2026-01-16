import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432', 10),
});

async function resetPassword() {
    try {
        const hashedPassword = await bcrypt.hash('password123', 10);
        await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hashedPassword, 'okerosacharde2005@gmail.com']);
        console.log('Password updated for okerosacharde2005@gmail.com');
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

resetPassword();
