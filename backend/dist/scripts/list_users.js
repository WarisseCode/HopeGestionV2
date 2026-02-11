"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../db/database"));
async function listUsers() {
    try {
        const res = await database_1.default.query('SELECT id, email, role, user_type FROM users ORDER BY id DESC');
        console.log('USERS LIST:');
        console.table(res.rows);
        process.exit(0);
    }
    catch (e) {
        console.error(e);
        process.exit(1);
    }
}
listUsers();
