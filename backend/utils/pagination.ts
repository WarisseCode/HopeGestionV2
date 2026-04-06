// backend/utils/pagination.ts
// Utilitaire de pagination réutilisable sur toutes les routes GET de liste.

export interface PaginationParams {
    page:  number;
    limit: number;
    offset: number;
}

export interface PaginatedResponse<T> {
    data:       T[];
    total:      number;
    page:       number;
    limit:      number;
    totalPages: number;
}

/**
 * Extrait et valide les paramètres de pagination depuis la query string.
 * Valeurs par défaut : page=1, limit=20. Limite max : 100.
 */
export function parsePagination(query: Record<string, any>): PaginationParams {
    const page  = Math.max(1, parseInt(query.page  as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit as string) || 20));
    return { page, limit, offset: (page - 1) * limit };
}

/**
 * Construit la réponse paginée standard.
 */
export function paginate<T>(rows: T[], total: number, params: PaginationParams): PaginatedResponse<T> {
    return {
        data:       rows,
        total,
        page:       params.page,
        limit:      params.limit,
        totalPages: Math.ceil(total / params.limit),
    };
}
