const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});



async function describeTable(tableName) {
    const client = await pool.connect();
    try {
        const res = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = $1
            ORDER BY ordinal_position;
        `, [tableName]);
        
        let output = `Columns for table '${tableName}':\n`;
        res.rows.forEach(row => {
            output += `- ${row.column_name} (${row.data_type}, ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})\n`;
        });
        
        fs.writeFileSync(path.join(__dirname, 'schema_output.log'), output);
        console.log('Schema written to schema_output.log');
    } catch (err) {
        console.error('Error describing table:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

describeTable('owners');
