// backend/scripts/updateLotsToLibre.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function updateLots() {
  const result = await pool.query("UPDATE lots SET statut = 'libre' WHERE ref_lot LIKE 'LOT-TEST-%' RETURNING ref_lot");
  console.log(result.rowCount + ' lots mis à jour en statut libre');
  
  // Also create new ones if needed
  const countResult = await pool.query("SELECT COUNT(*) FROM lots WHERE statut = 'libre'");
  console.log('Total lots libres: ' + countResult.rows[0].count);
  
  await pool.end();
}

updateLots();
