import { Client } from 'pg';

const connectionString = 'postgresql://hope_user:WdkMyAjL4LawZOCoRFJC9JHls2VLgOBE@dpg-d58ur1juibrs73avi6sg-a.oregon-postgres.render.com/hopegestion';

async function testQuery508() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    query_timeout: 10000 // 10 secondes timeout
  });

  try {
    await client.connect();
    const tenantId = 508;
    
    console.log("Testing tenant 508...");
    const tenantCheck = await client.query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
    console.log(`Tenant logic found: ${tenantCheck.rows.length}`);

    console.log("Testing leases...");
    const leasesResult = await client.query(`
        SELECT l.*, b.nom as building_name, lot.ref_lot, lot.type as lot_type
        FROM leases l
        JOIN lots lot ON l.lot_id = lot.id
        JOIN buildings b ON lot.building_id = b.id
        WHERE l.tenant_id = $1
        ORDER BY l.date_debut DESC
    `, [tenantId]);
    console.log(`Leases found: ${leasesResult.rows.length}`);

    console.log("Testing payments...");
    const paymentsResult = await client.query(`
        SELECT p.*, l.lot_id 
        FROM payments p
        JOIN leases l ON p.lease_id = l.id
        WHERE l.tenant_id = $1
        ORDER BY p.date_paiement DESC
        LIMIT 10
    `, [tenantId]);
    console.log(`Payments found: ${paymentsResult.rows.length}`);

    console.log("Success!");
  } catch (err) {
    console.error("Error detected:");
    console.error(err);
  } finally {
    await client.end();
  }
}

testQuery508();
