
import pool from '../db/database';

async function test() {
    try {
        console.log("Testing user_id column...");

        // 1. Create a dummy user (Issuer & Target for simplicity)
        // We need a unique email
        const email = `test_invite_${Date.now()}@example.com`;
        const phone = `+000${Date.now()}`; // dummy phone

        const res = await pool.query(
            "INSERT INTO users (email, password_hash, nom, user_type, role, telephone) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
            [email, 'hash', 'Test User', 'gestionnaire', 'gestionnaire', phone]
        );
        const userId = res.rows[0].id;
        console.log(`Created test user with ID: ${userId}`);

        // 2. Create invitation with user_id
        // This query matches the structure used in authRoutes.ts
        const token = `token_${Date.now()}`;
        await pool.query(
            "INSERT INTO user_invitations (token, email, role, issuer_id, permissions, expires_at, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            [token, email, 'viewer', userId, {}, new Date(Date.now() + 10000), userId]
        );
        console.log(`Created invitation with token: ${token}`);

        // 3. Verify
        const inviteRes = await pool.query("SELECT user_id FROM user_invitations WHERE token = $1", [token]);

        if (inviteRes.rows.length === 0) {
            throw new Error("Invitation not found!");
        }

        const storedUserId = inviteRes.rows[0].user_id;
        console.log(`Retrieved user_id from invitation: ${storedUserId}`);

        if (storedUserId === userId) {
            console.log("✅ SUCCESS: user_id column works and stores the ID correctly!");
        } else {
            console.error(`❌ FAILURE: user_id mismatch. Expected ${userId}, got ${storedUserId}`);
            process.exit(1);
        }

        // Cleanup
        await pool.query("DELETE FROM user_invitations WHERE token = $1", [token]);
        await pool.query("DELETE FROM users WHERE id = $1", [userId]);
        console.log("Cleanup complete.");

    } catch (e) {
        console.error("❌ Error during test:", e);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

test();
