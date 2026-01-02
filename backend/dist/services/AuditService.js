"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const index_1 = require("../index");
class AuditService {
    static isValidUUID(uuid) {
        if (!uuid)
            return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }
    /**
     * Records an action in the audit log.
     * This method is "fire and forget" to avoid blocking the main request flow,
     * but purely critical logs should be awaited if data consistency is paramount.
     */
    static async log(entry) {
        const query = `
            INSERT INTO audit_logs 
            (user_id, user_name, action, entity_type, entity_id, details, ip_address, user_agent)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;
        // Stocker les ID numériques dans le champ details et laisser les champs UUID NULL
        const detailsWithIds = {
            ...entry.details,
            userId: entry.userId || null,
            entityId: entry.entityId || null
        };
        const values = [
            entry.userId, // Passer l'ID utilisateur (converti en string ou int selon la DB)
            entry.userName || 'System/Unknown',
            entry.action,
            entry.entityType || null,
            entry.entityId || null, // Passer l'ID de l'entité
            JSON.stringify(detailsWithIds),
            entry.ipAddress || null,
            entry.userAgent || null
        ];
        try {
            await index_1.pool.query(query, values);
            // console.log(`[AUDIT] ${entry.action} logged.`);
        }
        catch (error) {
            console.error('[AUDIT] Failed to create audit log:', error);
            // We usually don't throw here to prevent failing the main user request 
            // just because logging failed, unless strict compliance is required.
        }
    }
    /**
     * Retrieves audit logs with pagination and filtering
     */
    static async getLogs(filters) {
        let query = `
            SELECT * FROM audit_logs 
            WHERE 1=1
        `;
        const values = [];
        let paramCount = 1;
        if (filters.userId) {
            query += ` AND user_id = $${paramCount}`;
            values.push(filters.userId);
            paramCount++;
        }
        if (filters.action) {
            query += ` AND action = $${paramCount}`;
            values.push(filters.action);
            paramCount++;
        }
        query += ` ORDER BY created_at DESC`;
        if (filters.limit) {
            query += ` LIMIT $${paramCount}`;
            values.push(filters.limit);
            paramCount++;
        }
        if (filters.offset) {
            query += ` OFFSET $${paramCount}`;
            values.push(filters.offset);
            paramCount++;
        }
        const result = await index_1.pool.query(query, values);
        return result.rows;
    }
}
exports.AuditService = AuditService;
//# sourceMappingURL=AuditService.js.map