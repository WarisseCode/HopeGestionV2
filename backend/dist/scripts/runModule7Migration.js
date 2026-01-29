"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Run Module VII migration - Inventories
const database_1 = __importDefault(require("../db/database"));
const statements = [
    // Inventories table
    `CREATE TABLE IF NOT EXISTS inventories (
        id SERIAL PRIMARY KEY,
        entity_type VARCHAR(20) NOT NULL, -- 'lot' or 'building'
        entity_id INTEGER NOT NULL,
        date_realisation DATE NOT NULL DEFAULT CURRENT_DATE,
        type_inventaire VARCHAR(50), -- 'entree', 'sortie', 'mobilier', 'technique', 'autre'
        agent_id INTEGER REFERENCES users(id), -- User performing the inventory
        agent_name VARCHAR(100), -- Fallback name
        statut VARCHAR(20) DEFAULT 'brouillon', -- 'brouillon', 'valide', 'archive'
        commentaires TEXT,
        signature_locataire TEXT, -- Base64/URL of signature
        signature_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    // Inventory Items table
    `CREATE TABLE IF NOT EXISTS inventory_items (
        id SERIAL PRIMARY KEY,
        inventory_id INTEGER REFERENCES inventories(id) ON DELETE CASCADE,
        categorie VARCHAR(50), -- 'menuiserie', 'electricite', 'plomberie', 'mobilier', 'electromenager'
        nom VARCHAR(100) NOT NULL,
        etat VARCHAR(20), -- 'neuf', 'bon', 'usager', 'mauvais', 'hs'
        quantite INTEGER DEFAULT 1,
        description TEXT,
        observation TEXT,
        photos JSONB DEFAULT '[]', -- Array of image URLs
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    // Indexes
    `CREATE INDEX IF NOT EXISTS idx_inventories_entity ON inventories(entity_type, entity_id)`,
    `CREATE INDEX IF NOT EXISTS idx_inventory_items_inventory ON inventory_items(inventory_id)`
];
async function runMigration() {
    console.log('🔌 Connecting to database...');
    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        if (!stmt)
            continue;
        try {
            await database_1.default.query(stmt);
            console.log(`✅ [${i + 1}/${statements.length}] Success`);
        }
        catch (error) {
            const e = error;
            console.log(`⚠️ [${i + 1}/${statements.length}] Skipped (${e.code || e.message})`);
        }
    }
    console.log('🎉 Module VII Migration completed!');
    process.exit(0);
}
runMigration().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
//# sourceMappingURL=runModule7Migration.js.map