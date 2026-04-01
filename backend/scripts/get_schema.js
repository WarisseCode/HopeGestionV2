const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool(); // relies on .env

async function run() {
    const res = await pool.query(`
        SELECT table_name, column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
    `);
    
    const tables = {};
    for (const row of res.rows) {
        if (!tables[row.table_name]) tables[row.table_name] = [];
        tables[row.table_name].push(row.column_name);
    }
    
    console.log(JSON.stringify(tables, null, 2));
    pool.end();
}

run();
