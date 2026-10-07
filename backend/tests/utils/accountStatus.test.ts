import { isAccountBlocked } from '../../utils/accountStatus';

describe('isAccountBlocked', () => {
    it.each(['inactif', 'suspendu', 'Suspendu', 'SUSPENDU', ' suspendu ', 'Inactif', '\tINACTIF\n'])(
        '"%s" : bloqué', (statut) => {
            expect(isAccountBlocked(statut)).toBe(true);
        });

    it.each(['actif', 'Actif', 'en_attente', '', 'suspendu_temp'])('"%s" : non bloqué', (statut) => {
        expect(isAccountBlocked(statut)).toBe(false);
    });

    it.each([null, undefined])('%s : non bloqué', (statut) => {
        expect(isAccountBlocked(statut)).toBe(false);
    });
});
