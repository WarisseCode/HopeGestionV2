import * as dotenv from 'dotenv';
import path from 'path';

// Charger les variables d'environnement
dotenv.config({ path: path.join(__dirname, '../.env') });

import pool from '../db/database';

const VILLES_BENIN = [
  { ville: 'Cotonou', quartiers: ['Haie Vive', 'Cadjehoun', 'Fidjrossè', 'Akpakpa', 'Zongo', 'Agla', 'Mènontin'] },
  { ville: 'Abomey-Calavi', quartiers: ['Arsat', 'Zoca', 'Tankpè', 'Godomey', 'Akassato'] },
  { ville: 'Porto-Novo', quartiers: ['Ouando', 'Dodji', 'Catchi', 'Adjarra Docodji'] },
  { ville: 'Parakou', quartiers: ['Albarika', 'Banikanni', 'Camp Adoua', 'Zongo'] },
  { ville: 'Ouidah', quartiers: ['Kpasse', 'Agbangnizoun', 'Gbenan'] }
];

const TYPES_BIENS = ['Appartement', 'Villa', 'Boutique', 'Bureau', 'Magasin'];

// Liste sélecte d'images Unsplash pour l'immobilier générique
const PICS = [
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1628015081036-0747ec8f077a?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1600566753086-00f18efc2291?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1512915922686-57c11dde9b6b?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1599427303058-fcd0cb3c2ec2?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1481277542470-605612bd2d61?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80'
];

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomArrayElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

import bcrypt from 'bcrypt';

async function seedData() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Find or create user john@hope.com
    let userId;
    const userResult = await client.query('SELECT id FROM users WHERE email = $1', ['john@hope.com']);
    if (userResult.rows.length === 0) {
      console.log("Création de l'utilisateur john@hope.com...");
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('password123', salt);
      const newUser = await client.query(
        'INSERT INTO users (email, nom, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
        ['john@hope.com', 'John Doe', hash, 'gestionnaire']
      );
      userId = newUser.rows[0].id;
    } else {
      userId = userResult.rows[0].id;
    }

    // 2. Find or create an owner linked to john@hope.com
    let ownerId;
    const ownerUserResult = await client.query('SELECT owner_id FROM owner_user WHERE user_id = $1 LIMIT 1', [userId]);
    if (ownerUserResult.rows.length > 0) {
      ownerId = ownerUserResult.rows[0].owner_id;
    } else {
      console.log('Création d\'un compte propriétaire pour John...');
      const managerCode = `AG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const newOwner = await client.query(`
        INSERT INTO owners (name, email, phone, address, management_mode, id_number, company_name, manager_code)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, ['John Doe', 'john@hope.com', '+229 90000000', 'Cotonou', 'delegated', 'ID123456', 'Hope Immobilier Bénin', managerCode]);
      ownerId = newOwner.rows[0].id;

      await client.query(
        `INSERT INTO owner_user (user_id, owner_id, role, is_active, start_date) VALUES ($1, $2, 'owner', true, CURRENT_DATE)`,
        [userId, ownerId]
      );
    }

    // 3. Create 10 buildings in different cities
    console.log('Création de 10 immeubles professionnels...');
    const buildingsIds = [];
    for (let i = 1; i <= 10; i++) {
      const cityData = getRandomArrayElement(VILLES_BENIN);
      const quartier = getRandomArrayElement(cityData.quartiers);
      
      const res = await client.query(`
        INSERT INTO buildings (nom, type, adresse, ville, quartier, pays, statut, latitude, longitude, owner_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `, [
        `Résidence ${quartier} ${i}`,
        'Immeuble',
        `Lot ${getRandomInt(100, 999)}`,
        cityData.ville,
        quartier,
        'Bénin',
        'actif',
        (6.36536 + (Math.random() - 0.5) * 0.1).toFixed(6), // coordinates loosely around Cotonou
        (2.41833 + (Math.random() - 0.5) * 0.1).toFixed(6),
        ownerId
      ]);
      buildingsIds.push(res.rows[0].id);
    }

    // 4. Generate 50 lots across these buildings
    console.log('Création de 50 biens (lots)...');
    for (let i = 1; i <= 50; i++) {
      const buildingId = getRandomArrayElement(buildingsIds);
      const type = getRandomArrayElement(TYPES_BIENS);
      const nbPieces = getRandomInt(1, 6);
      const isStudio = type === 'Appartement' && nbPieces === 1 ? 'Studio' : type;
      
      const surface = getRandomInt(20, 300);
      let loyer = 0;
      
      // Determine logical prices for Benin (in FCFA)
      if (isStudio === 'Studio') loyer = getRandomInt(3, 8) * 10000;
      else if (type === 'Appartement') loyer = getRandomInt(8, 25) * 10000;
      else if (type === 'Villa') loyer = getRandomInt(25, 150) * 10000;
      else loyer = getRandomInt(10, 80) * 10000;

      // Pick 2-4 random photos
      const numPhotos = getRandomInt(2, 4);
      const photosArray = [];
      for(let p=0; p<numPhotos; p++) {
        photosArray.push(getRandomArrayElement(PICS));
      }

      const description = `Superbe ${isStudio.toLowerCase()} situé dans une zone calme et sécurisée de la ville. Proche de toutes les commodités (marchés, écoles, pharmacies). Idéal pour vivre ou travailler. Finitions modernes et espace optimisé. Eau de la SONEB et compteur SBEE personnel.`;

      await client.query(`
        INSERT INTO lots (
          building_id, ref_lot, type, description, surface, loyer_mensuel, 
          charges_mensuelles, nb_pieces, etage, statut, photos, date_disponibilite
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_DATE)
      `, [
        buildingId,
        `LOT-BN-${i.toString().padStart(3, '0')}`,
        isStudio,
        description,
        surface,
        loyer,
        getRandomInt(0, 5) * 5000,
        nbPieces,
        getRandomInt(0, 5),
        'libre', // all free to be displayed on public page
        photosArray
      ]);
    }

    await client.query('COMMIT');
    console.log('✅ 50 Biens avec images ont été générés avec succès !');

  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Erreur lors du seeding:', e);
  } finally {
    client.release();
    pool.end();
  }
}

seedData();
