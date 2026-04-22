// backend/scripts/seed_codeman_data.ts
// Seed 20 immeubles + lots pour le gestionnaire codeman2codeman@gmail.com
// Adapté au marché immobilier béninois (Cotonou, Porto-Novo, etc.)

import pool from '../db/database';

// Peut être surchargé via: ts-node seed_codeman_data.ts -- mon@email.com
const GESTIONNAIRE_EMAIL = process.argv[2] || 'codeman2codeman@gmail.com';

const quartiersParVille: Record<string, string[]> = {
    'Cotonou': [
        'Akpakpa', 'Cadjèhoun', 'Fidjrossè', 'Haie Vive', 'Tokpa',
        'Vèdoko', 'Gbègamey', 'Zogbo', 'Agla', 'Dantokpa', 'Midombo'
    ],
    'Porto-Novo': [
        'Ouando', 'Missérété', 'Djassin', 'Gbéto', 'Houffon'
    ],
    'Parakou': [
        'Banikanni', 'Albarika', 'Madina', 'Zongo', 'Tourou'
    ],
    'Abomey-Calavi': [
        'Godomey', 'Togoudo', 'Kpanroun', 'Zinvié'
    ],
    'Bohicon': ['Centre', 'Sowé', 'Lissèzoun']
};

const nomsImmeubles = [
    'Résidence Les Cocotiers', 'Immeuble Étoile du Sud', 'Résidence Bénin Palace',
    'Immeuble Kourouma', 'Résidence La Baie', 'Immeuble Les Flamboyants',
    'Résidence Atlantique', 'Immeuble Fidjrossè Heights', 'Résidence Haie Vive',
    'Immeuble Cadjèhoun Premium', 'Résidence Akpakpa Center', 'Immeuble Les Palmiers',
    'Résidence Dahoma', 'Immeuble Ouando Business', 'Résidence Porto Star',
    'Immeuble Parakou Tower', 'Résidence Calavi Gardens', 'Immeuble Bohicon Plaza',
    'Résidence Vèdoko Green', 'Immeuble Agla Prestige'
];

const typesImmeubles = ['Immeuble', 'Résidence', 'Villa', 'Appartements'];

const typesLots = ['Appartement', 'Studio', 'Duplex', 'Bureau', 'Magasin', 'Villa'];

const descriptions = [
    'Spacieux et bien ventilé, proche des commodités',
    'Vue sur lagune, standing élevé, gardiennage 24h/24',
    'Idéal pour famille, quartier calme et résidentiel',
    'Moderne et récent, finitions haut de gamme',
    'Excellent emplacement commercial, fort passage',
    'Résidence sécurisée avec parking couvert',
    'Climatisation, eau, électricité inclus',
    'Jardin aménagé, terrasse, balcon',
    'Proche marchés et transports en commun',
    'Entièrement rénové, prêt à habiter dès maintenant'
];

const nomsProprios = [
    { name: 'AHOUANSOU', first_name: 'Rodrigue', type: 'individual', phone: '+22997112233' },
    { name: 'KPOSSOU', first_name: 'Estelle', type: 'individual', phone: '+22996223344' },
    { name: 'Société Immobilière BÉNIN INVEST', first_name: null, type: 'company', phone: '+22921345678' },
    { name: 'ADANDE', first_name: 'Martial', type: 'individual', phone: '+22990334455' },
    { name: 'KINNOUVOU', first_name: 'Honorine', type: 'individual', phone: '+22997445566' }
];

function random<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)] as T;
}

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomVille(): { ville: string; quartier: string } {
    const villes = Object.keys(quartiersParVille);
    // 60% chances Cotonou pour réalisme
    const ville = Math.random() < 0.6 ? 'Cotonou' : random(villes);
    const quartier = random(quartiersParVille[ville]!);
    return { ville, quartier };
}

// Coordonnées GPS approximatives par ville (Bénin)
function coordsForVille(ville: string): { lat: number; lng: number } {
    const coords: Record<string, { lat: number; lng: number }> = {
        'Cotonou': { lat: 6.3654, lng: 2.4183 },
        'Porto-Novo': { lat: 6.4969, lng: 2.6289 },
        'Parakou': { lat: 9.3377, lng: 2.6277 },
        'Abomey-Calavi': { lat: 6.4487, lng: 2.3562 },
        'Bohicon': { lat: 7.1852, lng: 2.0669 }
    };
    const base = coords[ville] ?? coords['Cotonou']!;
    return {
        lat: base.lat + (Math.random() - 0.5) * 0.05,
        lng: base.lng + (Math.random() - 0.5) * 0.05
    };
}

function loyerParType(type: string): number {
    switch (type) {
        case 'Studio':      return randomInt(25000, 60000);
        case 'Appartement': return randomInt(60000, 250000);
        case 'Duplex':      return randomInt(150000, 450000);
        case 'Villa':       return randomInt(300000, 900000);
        case 'Bureau':      return randomInt(80000, 350000);
        case 'Magasin':     return randomInt(50000, 250000);
        default:            return randomInt(50000, 200000);
    }
}

function surfaceParType(type: string): number {
    switch (type) {
        case 'Studio':      return randomInt(18, 35);
        case 'Appartement': return randomInt(45, 130);
        case 'Duplex':      return randomInt(100, 220);
        case 'Villa':       return randomInt(150, 500);
        case 'Bureau':      return randomInt(25, 120);
        case 'Magasin':     return randomInt(20, 80);
        default:            return randomInt(30, 100);
    }
}

async function seed() {
    const client = await pool.connect();
    try {
        console.log('🌱 Démarrage du seed pour', GESTIONNAIRE_EMAIL);

        // 1. Trouver le gestionnaire
        const gestRes = await client.query(
            `SELECT id, nom FROM users WHERE email = $1 AND user_type IN ('gestionnaire', 'admin')`,
            [GESTIONNAIRE_EMAIL]
        );

        if (gestRes.rows.length === 0) {
            console.error(`❌ Gestionnaire "${GESTIONNAIRE_EMAIL}" introuvable.`);
            console.error('   Comptes gestionnaires disponibles:');
            const all = await client.query(
                `SELECT email, nom FROM users WHERE user_type IN ('gestionnaire', 'admin') ORDER BY id`
            );
            all.rows.forEach(r => console.log(`   - ${r.email} (${r.nom})`));
            process.exit(1);
        }

        const gestionnaire = gestRes.rows[0];
        console.log(`✅ Gestionnaire trouvé: ${gestionnaire.nom} (ID: ${gestionnaire.id})`);

        // 2. Créer ou récupérer des propriétaires pour ce gestionnaire
        const ownerIds: number[] = [];

        for (const proprio of nomsProprios) {
            // Vérifier s'il existe déjà
            const existing = await client.query(
                `SELECT id FROM owners WHERE name = $1 AND (first_name = $2 OR first_name IS NULL) LIMIT 1`,
                [proprio.name, proprio.first_name]
            );

            if (existing.rows.length > 0) {
                ownerIds.push(existing.rows[0].id);
                console.log(`📋 Propriétaire existant: ${proprio.name} ${proprio.first_name || ''} (ID: ${existing.rows[0].id})`);
            } else {
                const ins = await client.query(
                    `INSERT INTO owners (name, first_name, type, phone, email, city, country, is_active)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE) RETURNING id`,
                    [
                        proprio.name,
                        proprio.first_name,
                        proprio.type,
                        proprio.phone,
                        `${proprio.name.toLowerCase().replace(/\s+/g, '.')}@gmail.com`,
                        'Cotonou',
                        'Bénin'
                    ]
                );
                ownerIds.push(ins.rows[0].id);
                console.log(`✅ Propriétaire créé: ${proprio.name} ${proprio.first_name || ''} (ID: ${ins.rows[0].id})`);
            }
        }

        console.log(`\n🏗️  Création de ${nomsImmeubles.length} immeubles...`);

        const createdBuildings: { id: number; ownerId: number }[] = [];

        for (let i = 0; i < nomsImmeubles.length; i++) {
            const nom = nomsImmeubles[i]!;
            const ownerId = ownerIds[i % ownerIds.length]!;
            const { ville, quartier } = randomVille();
            const { lat, lng } = coordsForVille(ville);
            const typeImm = random(typesImmeubles);
            const nbEtages = randomInt(1, 6);

            const res = await client.query(
                `INSERT INTO buildings (
                    owner_id, gestionnaire_id, nom, type, adresse, ville, pays,
                    description, quartier, latitude, longitude, statut,
                    nombre_etages, photos, total_lots
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'actif', $12, '[]', 0)
                RETURNING id`,
                [
                    ownerId,
                    gestionnaire.id,
                    nom,
                    typeImm,
                    `${randomInt(1, 999)} Rue ${randomInt(10, 99)}, ${quartier}`,
                    ville,
                    'Bénin',
                    random(descriptions),
                    quartier,
                    lat.toFixed(7),
                    lng.toFixed(7),
                    nbEtages
                ]
            );

            const buildingId = res.rows[0].id;
            createdBuildings.push({ id: buildingId, ownerId });
            console.log(`  🏢 [${i + 1}/20] ${nom} — ${ville} (ID: ${buildingId})`);
        }

        console.log(`\n🏠 Création des lots (2 à 5 par immeuble)...`);

        let totalLots = 0;
        let totalOccupes = 0;

        for (const building of createdBuildings) {
            const nbLots = randomInt(2, 5);
            let buildingOccupes = 0;

            for (let j = 0; j < nbLots; j++) {
                const type = random(typesLots);
                const loyer = loyerParType(type);
                const surface = surfaceParType(type);
                const etage = randomInt(0, 5);
                const refLot = `${type.substring(0, 3).toUpperCase()}-B${building.id}-${String(j + 1).padStart(2, '0')}`;
                // ~55% des lots occupés pour des stats réalistes
                const statut = Math.random() < 0.55 ? 'occupe' : 'libre';
                if (statut === 'occupe') buildingOccupes++;

                await client.query(
                    `INSERT INTO lots (
                        building_id, owner_id, ref_lot, type, description, surface,
                        loyer_mensuel, charges_mensuelles, nb_pieces, etage,
                        statut, caution, avance, periodicite, photos
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'mensuel', '{}')`,
                    [
                        building.id,
                        building.ownerId,
                        refLot,
                        type,
                        random(descriptions),
                        surface,
                        loyer,
                        randomInt(5000, 25000),
                        type === 'Studio' ? 1 : randomInt(2, 5),
                        String(etage),
                        statut,
                        loyer * randomInt(1, 3),
                        randomInt(1, 3)
                    ]
                );
            }

            // Mettre à jour total_lots sur le building
            await client.query(
                `UPDATE buildings SET total_lots = $1 WHERE id = $2`,
                [nbLots, building.id]
            );

            totalLots += nbLots;
            totalOccupes += buildingOccupes;
            console.log(`  🏠 Immeuble ${building.id}: ${nbLots} lots (${buildingOccupes} occupés)`);
        }

        console.log(`\n✅ Seed terminé avec succès !`);
        console.log(`   🏢 ${createdBuildings.length} immeubles créés`);
        console.log(`   🏠 ${totalLots} lots créés (${totalOccupes} occupés, ${totalLots - totalOccupes} libres)`);
        console.log(`   👤 Gestionnaire: ${gestionnaire.nom} (ID: ${gestionnaire.id})`);
        console.log(`   🔑 Propriétaires utilisés: ${ownerIds.join(', ')}`);

    } catch (err) {
        console.error('❌ Erreur:', err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
