// backend/routes/publicRoutes.ts
// Public routes accessible without authentication
import { Router, Request, Response } from 'express';
import pool from '../db/database';

const router = Router();

// GET /api/public/lots - Get all available lots for public display
router.get('/lots', async (req: Request, res: Response) => {
    try {
        const result = await pool.query(`
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
            WHERE l.statut = 'libre'
            ORDER BY l.id DESC
        `);
        
        // Transform data to match frontend expectations
        const lots = result.rows.map(lot => {
            // Parse photos array from PostgreSQL format
            let imageUrl = 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80';
            if (lot.photos && lot.photos.length > 0) {
                imageUrl = lot.photos[0];
            }
            
            return {
                id: lot.id,
                ref_lot: lot.ref_lot,
                type: lot.type || 'Appartement',
                titre: `${lot.type || 'Bien'} - ${lot.ref_lot}`,
                description: lot.description || `${lot.type} de ${lot.surface}m² avec ${lot.nb_pieces} pièces`,
                surface: lot.surface || 0,
                loyer: lot.loyer_mensuel || 0,
                pieces: lot.nb_pieces || 0,
                chambres: 0,
                sallesBain: 0,
                etage: lot.etage,
                ville: lot.ville || 'Abidjan',
                quartier: lot.quartier || '',
                adresse: lot.immeuble_adresse || '',
                immeuble: lot.immeuble_nom,
                latitude: parseFloat(lot.latitude) || 5.345,
                longitude: parseFloat(lot.longitude) || -4.024,
                image: imageUrl,
                photos: lot.photos || [],
                disponible: true,
                amenities: []
            };
        });

        res.json(lots);
    } catch (error) {
        console.error('Error fetching public lots:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/public/lots/:id - Get single lot details for reservation page
router.get('/lots/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(`
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
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Lot introuvable' });
        }
        
        const lot = result.rows[0];
        let imageUrl = 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80';
        if (lot.photos && lot.photos.length > 0) {
            imageUrl = lot.photos[0];
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
    }
});

export default router;
