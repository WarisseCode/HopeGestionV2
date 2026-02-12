import pool from '../db/database';
import fs from 'fs';

async function check() {
    const results: any = {};
    try {
        results.user = (await pool.query("SELECT id, email, role FROM users WHERE email = 'manager@test.com'")).rows[0];
        results.owner_user_for_76 = (await pool.query("SELECT * FROM owner_user WHERE user_id = 76")).rows;
        results.all_owner_user = (await pool.query("SELECT * FROM owner_user")).rows;
        results.owners = (await pool.query("SELECT id, name FROM owners")).rows;
        results.lease_sample = (await pool.query("SELECT id, owner_id, statut FROM leases WHERE statut = 'actif' LIMIT 5")).rows;
        results.lease_columns = (await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'leases'")).rows.map((r:any)=>r.column_name);
        results.ps_columns = (await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'payment_schedules'")).rows.map((r:any)=>r.column_name);
        
        fs.writeFileSync('diag.json', JSON.stringify(results, null, 2));
        console.log('DONE');
        process.exit(0);
    } catch (e: any) {
        results.error = e.message;
        fs.writeFileSync('diag.json', JSON.stringify(results, null, 2));
        console.log('ERROR');
        process.exit(1);
    }
}
check();
