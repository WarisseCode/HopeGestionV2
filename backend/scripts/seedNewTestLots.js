// backend/scripts/seedNewTestLots.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const lotTypes = ['Appartement', 'Studio', 'Bureau', 'Magasin', 'Duplex'];
const etages = ['RDC', '1er', '2ème', '3ème', '4ème'];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seed() {
  const client = await pool.connect();
  try {
    // Get first building
    const bRes = await client.query('SELECT id, nom FROM buildings LIMIT 1');
    if (bRes.rows.length === 0) {
      console.log('No building found!');
      return;
    }
    const buildingId = bRes.rows[0].id;
    console.log('Using building:', bRes.rows[0].nom);

    const timestamp = Date.now().toString().slice(-6);
    
    for (let i = 1; i <= 8; i++) {
      const type = randomChoice(lotTypes);
      const etage = randomChoice(etages);
      const surface = randomInt(25, 120);
      const loyer = randomInt(75000, 350000);
      const ref = `DISPO-${timestamp}-${String(i).padStart(2, '0')}`;

      // Correct column names: surface, loyer_mensuel
      await client.query(`
        INSERT INTO lots (ref_lot, type, building_id, etage, surface, nb_pieces, loyer_mensuel, charges_mensuelles, statut, description)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'libre', $9)
      `, [ref, type, buildingId, etage, surface, randomInt(1, 4), loyer, randomInt(5000, 15000), `${type} de ${surface}m²`]);
      
      console.log(`✅ Created: ${ref} (${type}, ${loyer} FCFA, ${etage})`);
    }

    console.log('\n🎉 8 lots libres créés !');
    
    const count = await client.query("SELECT COUNT(*) FROM lots WHERE statut = 'libre'");
    console.log('Total lots libres maintenant:', count.rows[0].count);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
