interface AuditLogEntry {
    userId?: string;
    userName?: string;
    action: string;
    entityType?: string;
    entityId?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
}
export declare class AuditService {
    private static isValidUUID;
    /**
     * Records an action in the audit log.
     * This method is "fire and forget" to avoid blocking the main request flow,
     * but purely critical logs should be awaited if data consistency is paramount.
     */
    static log(entry: AuditLogEntry): Promise<void>;
    /**
     * Retrieves audit logs with pagination and filtering
     */
    static getLogs(filters: {
        userId?: string;
        action?: string;
        limit?: number;
        offset?: number;
    }): Promise<any[]>;
}
export {};
//# sourceMappingURL=AuditService.d.ts.map