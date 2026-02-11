"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Quick script to run assignments migration
const database_1 = __importDefault(require("../db/database"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function runAssignmentsMigration() {
    const sqlPath = path_1.default.join(__dirname, '../db/migrations/migration_assignments.sql');
    const sql = fs_1.default.readFileSync(sqlPath, 'utf8');
    try {
        console.log('Running assignments migration...');
        await database_1.default.query(sql);
        console.log('✅ Assignments migration completed!');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}
runAssignmentsMigration();
