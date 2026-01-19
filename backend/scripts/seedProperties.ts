// backend/scripts/seedProperties.ts
// Script to create sample buildings and lots for demo purposes
import pool from '../db/database';

const quartiers = [
    'Cocody Riviera 3', 'Cocody Angré', 'Cocody Deux Plateaux', 'Cocody Riviera Faya',
    'Marcory Zone 4', 'Marcory Résidentiel', 'Plateau Centre', 'Yopougon Académie',
    'Yopougon Maroc', 'Treichville', 'Adjamé', 'Abobo Avocatier', 
    'Bingerville', 'Bassam', 'Assinie'
];

const villes = ['Abidjan', 'Abidjan', 'Abidjan', 'Grand-Bassam', 'Bingerville'];

const typesLots = ['Appartement', 'Villa', 'Studio', 'Duplex', 'Bureau', 'Magasin'];

const descriptions = [
    'Spacieux et lumineux, proche commodités',
    'Vue imprenable, standing haut de gamme',
    'Idéal pour famille, quartier calme',
    'Moderne et récent, finitions soignées',
    'Excellent emplacement commercial',
    'Résidence sécurisée 24h/24',
    'Climatisation centrale, parking inclus',
    'Jardin privatif, piscine collective',
    'Proche écoles et transports',
    'Entièrement rénové, prêt à habiter'
];

const images = [
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80'
];

function random<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)] as T;
}

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seedProperties() {
    try {
        console.log('🌱 Démarrage du seeding des propriétés...');

        // 1. Get existing owners
        const ownersResult = await pool.query('SELECT id, name FROM owners WHERE is_active = TRUE');
        const owners = ownersResult.rows;

        if (owners.length === 0) {
            console.log('❌ Aucun propriétaire trouvé. Créez d\'abord des propriétaires.');
            process.exit(1);
        }

        console.log(`📋 ${owners.length} propriétaires trouvés`);

        // 2. Create ~10 buildings, then 30 lots spread across them
        const buildingsToCreate = 10;
        const lotsToCreate = 30;
        const createdBuildings: number[] = [];

        for (let i = 0; i < buildingsToCreate; i++) {
            const owner = random(owners);
            const quartier = random(quartiers);
            const ville = random(villes);
            const nom = `Résidence ${['Les Palmiers', 'Le Soleil', 'Les Jardins', 'La Perle', 'L\'Oasis', 'Le Diamant', 'Les Cocotiers', 'L\'Émeraude', 'Le Prestige', 'Les Acacias'][i]}`;
            
            // Abidjan coords with slight randomization
            const lat = 5.32 + (Math.random() * 0.1);
            const lng = -4.02 + (Math.random() * 0.08);

            const result = await pool.query(`
                INSERT INTO buildings (
                    owner_id, nom, type, adresse, ville, pays, description,
                    quartier, latitude, longitude, statut, nombre_etages
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING id
            `, [
                owner.id,
                nom,
                random(['Immeuble', 'Villa', 'Résidence']),
                `${randomInt(1, 500)} Rue ${randomInt(10, 99)}`,
                ville,
                'Côte d\'Ivoire',
                `${random(['Belle', 'Magnifique', 'Superbe'])} résidence dans le quartier ${quartier}`,
                quartier,
                lat.toFixed(6),
                lng.toFixed(6),
                'actif',
                randomInt(2, 8)
            ]);

            createdBuildings.push(result.rows[0].id);
            console.log(`🏢 Immeuble créé: ${nom} (ID: ${result.rows[0].id})`);
        }

        // 3. Create lots
        for (let i = 0; i < lotsToCreate; i++) {
            const buildingId = random(createdBuildings);
            const type = random(typesLots);
            const surface = type === 'Studio' ? randomInt(20, 40) : 
                           type === 'Appartement' ? randomInt(50, 120) :
                           type === 'Villa' ? randomInt(150, 400) :
                           type === 'Duplex' ? randomInt(100, 200) :
                           randomInt(30, 100);

            const loyer = type === 'Studio' ? randomInt(50000, 100000) :
                         type === 'Appartement' ? randomInt(100000, 350000) :
                         type === 'Villa' ? randomInt(400000, 1500000) :
                         type === 'Duplex' ? randomInt(250000, 600000) :
                         randomInt(80000, 300000);

            const refLot = `${type.substring(0, 3).toUpperCase()}-${String(i + 1).padStart(3, '0')}`;

            await pool.query(`
                INSERT INTO lots (
                    building_id, ref_lot, type, description, surface,
                    loyer_mensuel, nb_pieces, etage, statut, photos
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [
                buildingId,
                refLot,
                type,
                random(descriptions),
                surface,
                loyer,
                type === 'Studio' ? 1 : randomInt(2, 6),
                randomInt(0, 6),
                'libre',
                `{${random(images)}}`
            ]);

            console.log(`🏠 Lot créé: ${refLot} (${type}) - ${loyer.toLocaleString()} FCFA`);
        }

        console.log('\n✅ Seeding terminé avec succès!');
        console.log(`   📊 ${buildingsToCreate} immeubles créés`);
        console.log(`   🏠 ${lotsToCreate} lots créés`);
        console.log('\n🔗 Visitez /biens-disponibles pour voir les propriétés');

        process.exit(0);
    } catch (error) {
        console.error('❌ Erreur lors du seeding:', error);
        process.exit(1);
    }
}

seedProperties();
