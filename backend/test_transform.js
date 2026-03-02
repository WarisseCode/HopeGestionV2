const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool();

async function run() {
  try {
    const id = 1064; // Remplace avec l'ID valide de test
    
    // 1. Get the reservation
    const reservationResult = await pool.query(`
        SELECT l.*, 
                COALESCE(lot.loyer_mensuel, l.loyer_actuel) as loyer_mensuel, 
                COALESCE(lot.building_id, l.lot_id /* which is null */) as building_id
        FROM leases l
        LEFT JOIN lots lot ON l.lot_id = lot.id
        WHERE l.id = $1 AND l.type_contrat = 'reservation' AND l.statut = 'actif'
    `, [id]);

    if (reservationResult.rows.length === 0) {
        console.log('Réservation non trouvée ou non validée');
        return;
    }
    const reservation = reservationResult.rows[0];
    console.log("Reservation trouvée:", reservation);

    // 2. Reference
    const count = 1000;
    const newReference = `BAIL-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;

    console.log("Mise à jour avec l'id:", id, "loyer:", reservation.loyer_mensuel);

    // 3. Update (simulation)
    await pool.query('BEGIN');
    await pool.query(`
        UPDATE leases SET 
            type_contrat = 'location',
            reference_bail = $1,
            date_fin = $2,
            caution = $3,
            avance = $4,
            periodicite = $5,
            loyer_actuel = $6,
            statut = 'actif',
            conditions_particulieres = CONCAT(conditions_particulieres, E'\n[Transformé depuis réservation le ', NOW()::date, ']'),
            updated_at = NOW()
        WHERE id = $7
    `, [
        newReference,
        null,
        150000,
        1,
        'mensuel',
        reservation.loyer_mensuel || reservation.loyer_actuel || 0,
        id
    ]);
    console.log("Update OK !");
    await pool.query('ROLLBACK');

  } catch (error) {
    console.error('Erreur SQL:', error);
  } finally {
    pool.end();
  }
}

run();
