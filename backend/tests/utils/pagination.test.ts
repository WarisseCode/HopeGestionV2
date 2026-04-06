import { parsePagination, paginate } from '../../utils/pagination';

describe('parsePagination', () => {
    it('retourne page=1 et limit=20 par défaut', () => {
        const result = parsePagination({});
        expect(result).toEqual({ page: 1, limit: 20, offset: 0 });
    });

    it('calcule correctement l\'offset', () => {
        const result = parsePagination({ page: '3', limit: '10' });
        expect(result).toEqual({ page: 3, limit: 10, offset: 20 });
    });

    it('force page minimum à 1', () => {
        const result = parsePagination({ page: '0' });
        expect(result.page).toBe(1);
    });

    it('plafonne limit à 100', () => {
        const result = parsePagination({ limit: '500' });
        expect(result.limit).toBe(100);
    });

    it('ignore les valeurs non numériques et applique les défauts', () => {
        const result = parsePagination({ page: 'abc', limit: 'xyz' });
        expect(result).toEqual({ page: 1, limit: 20, offset: 0 });
    });
});

describe('paginate', () => {
    const rows = [{ id: 1 }, { id: 2 }];
    const params = { page: 2, limit: 10, offset: 10 };

    it('construit la réponse paginée correctement', () => {
        const result = paginate(rows, 25, params);
        expect(result).toEqual({
            data:       rows,
            total:      25,
            page:       2,
            limit:      10,
            totalPages: 3,
        });
    });

    it('calcule totalPages = 1 quand total <= limit', () => {
        const result = paginate(rows, 5, { page: 1, limit: 20, offset: 0 });
        expect(result.totalPages).toBe(1);
    });

    it('retourne totalPages = 0 quand total = 0', () => {
        const result = paginate([], 0, { page: 1, limit: 20, offset: 0 });
        expect(result.totalPages).toBe(0);
    });
});
