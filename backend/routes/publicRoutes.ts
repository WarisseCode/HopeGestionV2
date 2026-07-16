// backend/routes/publicRoutes.ts
// Public routes accessible without authentication
import { Router, Request, Response } from 'express';
import pool from '../db/database';
import { getMaintenanceStatus } from '../middleware/maintenanceMiddleware';

const router = Router();

// GET /api/public/lots - Get all available lots AND buildings for public display
router.get('/lots', async (req: Request, res: Response) => {
    // Utiliser un client dédié pour définir le contexte RLS sentinel (-1 = aucun owner réel).
    // Les policies PERMISSIVE public_read_libre_lots / public_read_actif_buildings autorisent
    // la lecture publique des données libres/actives sans exposer les données privées.
    const client = await pool.connect();
    try {
        await client.query("SELECT set_config('app.current_owner_id', '-1', true)");

        // 1. Récupérer les lots libres de tous les immeubles non inactifs
        const lotsResult = await client.query(`
            SELECT
                l.id,
                l.ref_lot,
                l.type,
                l.description,
                l.surface,
                l.loyer_mensuel,
                l.nb_pieces,
                l.etage,
                l.statut,
                l.photos,
                b.nom as immeuble_nom,
                b.adresse as immeuble_adresse,
                b.ville,
                b.quartier,
                b.latitude,
                b.longitude
            FROM lots l
            JOIN buildings b ON l.building_id = b.id
            WHERE LOWER(l.statut) IN ('libre', 'vacant', 'disponible')
            ORDER BY l.id DESC
        `);

        // 2. Récupérer les immeubles actifs ou libres (entiers à louer/visiter)
        // surface = somme des surfaces des lots libres ; loyer = loyer minimum non nul
        const buildingsResult = await client.query(`
            SELECT
                b.id,
                b.nom as titre,
                b.type,
                b.description,
                COALESCE(SUM(l.surface), 0) as surface,
                COALESCE(MIN(CASE WHEN l.loyer_mensuel > 0 THEN l.loyer_mensuel END), 0) as loyer_mensuel,
                b.total_lots as nb_pieces,
                'entier' as etage,
                b.statut,
                b.photos,
                b.nom as immeuble_nom,
                b.adresse as immeuble_adresse,
                b.ville,
                b.quartier,
                b.latitude,
                b.longitude
            FROM buildings b
            LEFT JOIN lots l ON l.building_id = b.id
                AND LOWER(l.statut) IN ('libre', 'vacant', 'disponible')
            GROUP BY b.id, b.nom, b.type, b.description, b.total_lots,
                     b.statut, b.photos, b.adresse, b.ville, b.quartier,
                     b.latitude, b.longitude
            ORDER BY b.id DESC
        `);
        
        // Transform lots data to match frontend expectations
        const formatItem = (item: any, isBuilding: boolean = false) => {
            let photos: string[] = [];
            if (item.photos && item.photos.length > 0) {
                photos = Array.isArray(item.photos) ? item.photos : [item.photos];
            }
            const imageUrl = photos[0] || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80';

            const typeLabel = item.type || (isBuilding ? 'Immeuble' : 'Appartement');
            const location = item.quartier ? `à ${item.quartier}` : (item.ville ? `à ${item.ville}` : '');
            
            const titre = isBuilding 
                ? (item.titre || `${typeLabel} ${location}`) 
                : (item.description && item.description.length > 10 ? `${typeLabel} ${location}` : `${typeLabel} ${item.surface ? `${item.surface}m²` : ''} ${location}`);

            const amenitiesByType: Record<string, string[]> = {
                'Villa': ['Parking', 'Jardin', 'Gardien', 'Eau courante', 'Groupe électrogène'],
                'Appartement': ['Eau courante', 'Électricité', 'Sécurité bâtiment'],
                'Studio': ['Eau courante', 'Électricité'],
                'Bureau': ['Climatisation', 'Parking', 'Électricité', 'Internet'],
                'Entrepôt': ['Électricité', 'Gardien'],
                'Commerce': ['Eau courante', 'Électricité', 'Accès facile'],
                'Immeuble': ['Parking', 'Sécurité bâtiment', 'Eau courante', 'Électricité'],
            };
            const amenities = amenitiesByType[item.type] || ['Eau courante', 'Électricité'];

            return {
                id: isBuilding ? `b-${item.id}` : item.id, // Prevent duplicate IDs between lots and buildings in React lists
                originalId: item.id,
                isBuilding,
                ref_lot: item.ref_lot || `B-${item.id}`,
                type: typeLabel,
                titre: titre.trim(),
                description: item.description || `${typeLabel} ${isBuilding ? "entier" : `de ${item.surface || 0}m²`} situé ${location}`,
                surface: item.surface || 0,
                loyer: item.loyer_mensuel || 0,
                pieces: item.nb_pieces || 0,
                chambres: 0,
                sallesBain: 0,
                etage: item.etage,
                ville: item.ville || 'Abidjan',
                quartier: item.quartier || '',
                adresse: item.immeuble_adresse || '',
                immeuble: item.immeuble_nom,
                latitude: parseFloat(item.latitude) || 5.345,
                longitude: parseFloat(item.longitude) || -4.024,
                image: imageUrl,
                photos,
                disponible: true,
                amenities
            };
        };

        const formattedLots = lotsResult.rows.map(l => formatItem(l, false));
        const formattedBuildings = buildingsResult.rows.map(b => formatItem(b, true));

        // Combiner les deux listes
        const allItems = [...formattedBuildings, ...formattedLots];

        res.json(allItems);
    } catch (error) {
        console.error('Error fetching public lots:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    } finally {
        client.release();
    }
});

// GET /api/public/lots/:id - Get single lot details for reservation page
router.get('/lots/:id', async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        await client.query("SELECT set_config('app.current_owner_id', '-1', true)");

        const id = req.params.id || '';

        if (!id) {
            return res.status(400).json({ message: 'ID requis' });
        }

        const isBuilding = id.startsWith('b-');
        const dbId = isBuilding ? parseInt(id.replace('b-', '')) : parseInt(id);

        if (isNaN(dbId)) {
            return res.status(400).json({ message: 'ID invalide' });
        }

        if (isBuilding) {
            const buildingResult = await client.query(`
                SELECT b.*, o.name as proprietaire_nom
                FROM buildings b
                LEFT JOIN owners o ON b.owner_id = o.id
                WHERE b.id = $1
            `, [dbId]);

            if (buildingResult.rows.length === 0) {
                return res.status(404).json({ message: 'Immeuble introuvable' });
            }

            const building = buildingResult.rows[0];
            let imageUrl = 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80';
            if (building.photos && building.photos.length > 0) {
                const photos = Array.isArray(building.photos) ? building.photos : [building.photos];
                if (photos[0]) imageUrl = photos[0];
            }

            return res.json({
                id: `b-${building.id}`,
                ref_lot: `B-${building.id}`,
                type: building.type || 'Immeuble',
                description: building.nom || building.description || 'Immeuble complet',
                surface: 0,
                loyer: 0,
                ville: building.ville || 'Abidjan',
                quartier: building.quartier || '',
                adresse: building.adresse || '',
                immeuble: building.nom,
                latitude: parseFloat(building.latitude) || 5.345,
                longitude: parseFloat(building.longitude) || -4.024,
                image: imageUrl,
                statut: building.statut,
                proprietaire: building.proprietaire_nom
            });
        }

        // --- LOT EXISTANT ---
        const result = await client.query(`
            SELECT
                l.id,
                l.ref_lot,
                l.type,
                l.description,
                l.surface,
                l.loyer_mensuel,
                l.nb_pieces,
                l.etage,
                l.statut,
                l.photos,
                b.nom as immeuble_nom,
                b.adresse as immeuble_adresse,
                b.ville,
                b.quartier,
                b.latitude,
                b.longitude,
                o.name as proprietaire_nom
            FROM lots l
            JOIN buildings b ON l.building_id = b.id
            LEFT JOIN owners o ON b.owner_id = o.id
            WHERE l.id = $1
        `, [dbId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Lot introuvable' });
        }

        const lot = result.rows[0];
        let imageUrl = 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80';
        if (lot.photos && lot.photos.length > 0) {
            const photos = Array.isArray(lot.photos) ? lot.photos : [lot.photos];
            if (photos[0]) imageUrl = photos[0];
        }

        res.json({
            id: lot.id,
            ref_lot: lot.ref_lot,
            type: lot.type || 'Appartement',
            description: lot.description || `${lot.type} de ${lot.surface}m²`,
            surface: lot.surface || 0,
            loyer: lot.loyer_mensuel || 0,
            ville: lot.ville || 'Abidjan',
            quartier: lot.quartier || '',
            adresse: lot.immeuble_adresse || '',
            immeuble: lot.immeuble_nom,
            latitude: parseFloat(lot.latitude) || 5.345,
            longitude: parseFloat(lot.longitude) || -4.024,
            image: imageUrl,
            statut: lot.statut,
            proprietaire: lot.proprietaire_nom
        });
    } catch (error) {
        console.error('Error fetching public lot:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    } finally {
        client.release();
    }
});

// GET /api/public/maintenance/status - Endpoint public pour vérifier le statut de maintenance
router.get('/maintenance/status', getMaintenanceStatus);

export default router;
