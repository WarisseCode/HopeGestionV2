// backend/scripts/seedTestLots.js
// Script to add random available lots for testing

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const lotTypes = ['Appartement', 'Studio', 'Bureau', 'Magasin', 'Entrepôt', 'Duplex'];
const etages = ['RDC', '1er', '2ème', '3ème', '4ème', '5ème'];
const blocs = ['A', 'B', 'C', 'D', null];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seedTestLots() {
  const client = await pool.connect();
  try {
    console.log('🏢 Seeding test lots...');

    // Get a building to attach lots to
    const buildingResult = await client.query('SELECT id, nom FROM buildings LIMIT 1');
    if (buildingResult.rows.length === 0) {
      console.log('❌ No building found. Creating a test building first...');
      
      // Get an owner
      const ownerResult = await client.query('SELECT id FROM owners LIMIT 1');
      if (ownerResult.rows.length === 0) {
        console.log('❌ No owner found. Please create an owner first.');
        return;
      }
      const ownerId = ownerResult.rows[0].id;

      // Create a test building
      const newBuilding = await client.query(`
        INSERT INTO buildings (nom, adresse, ville, pays, type, owner_id, statut)
        VALUES ('Immeuble Test', '123 Rue du Test', 'Abidjan', 'Côte d''Ivoire', 'Résidentiel', $1, 'actif')
        RETURNING id, nom
      `, [ownerId]);
      
      buildingResult.rows = newBuilding.rows;
      console.log(`✅ Created test building: ${newBuilding.rows[0].nom}`);
    }

    const buildingId = buildingResult.rows[0].id;
    const buildingName = buildingResult.rows[0].nom;

    console.log(`📍 Adding lots to building: ${buildingName} (ID: ${buildingId})`);

    // Create 10 random lots
    const lotsToCreate = 10;
    let created = 0;

    for (let i = 1; i <= lotsToCreate; i++) {
      const type = randomChoice(lotTypes);
      const etage = randomChoice(etages);
      const bloc = randomChoice(blocs);
      const superficie = randomInt(20, 150);
      const nbPieces = type === 'Studio' ? 1 : randomInt(1, 5);
      const loyer = randomInt(50000, 500000);
      const charges = randomInt(5000, 30000);
      const refLot = `LOT-TEST-${String(i).padStart(3, '0')}`;

      try {
        await client.query(`
          INSERT INTO lots (ref_lot, type, building_id, etage, bloc, superficie, nb_pieces, loyer, charges, statut, description)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'libre', $10)
          ON CONFLICT (ref_lot) DO NOTHING
        `, [refLot, type, buildingId, etage, bloc, superficie, nbPieces, loyer, charges, `${type} de test - ${superficie}m²`]);
        
        console.log(`  ✅ Created: ${refLot} (${type}, ${etage}, ${loyer} FCFA)`);
        created++;
      } catch (err) {
        console.log(`  ⚠️ Skipped: ${refLot} (may already exist)`);
      }
    }

    console.log(`\n🎉 Done! Created ${created} test lots with status 'libre'.`);

  } catch (error) {
    console.error('❌ Error seeding lots:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

seedTestLots();
