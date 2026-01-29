"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../db/database"));
const runMigration = async () => {
    try {
        console.log('Running migration: Adding type_charges to leases table...');
        // Add type_charges column if it doesn't exist
        await database_1.default.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leases' AND column_name = 'type_charges') THEN 
                    ALTER TABLE leases ADD COLUMN type_charges VARCHAR(50) DEFAULT 'forfaitaire';
                END IF;
            END $$;
        `);
        console.log('Migration completed successfully.');
    }
    catch (error) {
        console.error('Migration failed:', error);
    }
    finally {
        await database_1.default.end();
    }
};
runMigration();
//# sourceMappingURL=addTypeChargesToLeases.js.map