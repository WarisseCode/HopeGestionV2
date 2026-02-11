const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'hope_gestion',
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
});

async function inspect() {
    try {
        console.log("Checking 'tickets' table...");
        const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tickets'");
        console.log(res.rows);

        console.log("Checking 'providers' table...");
        const res2 = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'providers'");
        console.log(res2.rows);

        console.log("Checking 'service_contracts' table...");
        const res3 = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'service_contracts'");
        console.log(res3.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

inspect();
