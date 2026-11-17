/**
 * Filtre d'isolation par propriétaire (utils/ownerScope.ts).
 *
 * Ce module remplace 16 copies locales dans les routes : ces tests verrouillent son
 * comportement (admin contourné, liste vide = aucune ligne, numérotation $n correcte,
 * refus des noms de colonne qui ne sont pas des identifiants SQL).
 */
import {
    scopeByOwner,
    scopeExpenseByOwner,
    getEffectiveOwnerIds,
    getValidOwnerIds,
} from '../../utils/ownerScope';
import type { AuthenticatedRequest } from '../../middleware/authMiddleware';

const req = (ctx: Record<string, unknown>) => ctx as unknown as AuthenticatedRequest;

describe('scopeByOwner', () => {
    it('ajoute la clause et pousse la liste des propriétaires en dernier paramètre', () => {
        const params: unknown[] = [42, 'x'];
        const clause = scopeByOwner(req({ userRole: 'gestionnaire', validOwnerIds: [3, 7] }), params);
        expect(clause).toBe(' AND owner_id = ANY($3::int[])');
        expect(params).toEqual([42, 'x', [3, 7]]);
    });

    it('accepte une colonne préfixée par un alias', () => {
        const params: unknown[] = [];
        expect(scopeByOwner(req({ userRole: 'proprietaire', validOwnerIds: [1] }), params, 'l.owner_id'))
            .toBe(' AND l.owner_id = ANY($1::int[])');
    });

    it("ne filtre pas pour l'admin et ne touche pas aux paramètres", () => {
        const params: unknown[] = [1];
        expect(scopeByOwner(req({ userRole: 'admin', validOwnerIds: [9] }), params)).toBe('');
        expect(params).toEqual([1]);
    });

    it('sans propriétaire posé : liste vide (ANY sur un tableau vide → aucune ligne)', () => {
        const params: unknown[] = [];
        expect(scopeByOwner(req({ userRole: 'gestionnaire' }), params)).toBe(' AND owner_id = ANY($1::int[])');
        expect(params).toEqual([[]]);
    });

    it.each(["owner_id; DROP TABLE users", 'owner_id OR 1=1', "l.owner_id'", 'a.b.c', ''])(
        'refuse un nom de colonne non identifiant : %p',
        (col) => {
            expect(() => scopeByOwner(req({ userRole: 'admin' }), [], col)).toThrow(/identifiant SQL invalide/);
        },
    );
});

describe('scopeExpenseByOwner', () => {
    it("filtre sur owner_id ou, à défaut, sur le propriétaire de l'immeuble (même paramètre)", () => {
        const params: unknown[] = ['a'];
        const clause = scopeExpenseByOwner(req({ userRole: 'gestionnaire', validOwnerIds: [5] }), params, 'expenses');
        expect(params).toEqual(['a', [5]]);
        expect(clause).toContain('expenses.owner_id = ANY($2::int[])');
        expect(clause).toContain('expenses.owner_id IS NULL');
        expect(clause).toContain('bx.owner_id = ANY($2::int[])');
    });

    it("ne filtre pas pour l'admin", () => {
        expect(scopeExpenseByOwner(req({ userRole: 'admin' }), [])).toBe('');
    });

    it('refuse un alias non identifiant', () => {
        expect(() => scopeExpenseByOwner(req({ userRole: 'gestionnaire' }), [], 'e) OR (1=1')).toThrow();
    });
});

describe('getEffectiveOwnerIds / getValidOwnerIds', () => {
    it('privilégie le propriétaire choisi dans le sélecteur', () => {
        expect(getEffectiveOwnerIds(req({ resolvedOwnerId: 4, validOwnerIds: [4, 8] }))).toEqual([4]);
    });

    it('sinon renvoie tous les propriétaires du compte', () => {
        expect(getEffectiveOwnerIds(req({ resolvedOwnerId: null, validOwnerIds: [4, 8] }))).toEqual([4, 8]);
    });

    it('accepte le propriétaire 0 comme un choix (pas de test de vérité)', () => {
        expect(getEffectiveOwnerIds(req({ resolvedOwnerId: 0, validOwnerIds: [1] }))).toEqual([0]);
    });

    it('renvoie une liste vide si rien n’est posé', () => {
        expect(getEffectiveOwnerIds(req({}))).toEqual([]);
        expect(getValidOwnerIds(req({}))).toEqual([]);
    });
});
