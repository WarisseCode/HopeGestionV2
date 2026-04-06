import { validatePassword } from '../../utils/passwordUtils';

describe('validatePassword', () => {
    it('accepte un mot de passe fort', () => {
        expect(validatePassword('StrongP@ss1').isValid).toBe(true);
    });

    it('rejette un mot de passe trop court (< 8 caractères)', () => {
        const result = validatePassword('Sh0rt!');
        expect(result.isValid).toBe(false);
        expect(result.message).toContain('8 caractères');
    });

    it('rejette un mot de passe sans majuscule', () => {
        const result = validatePassword('lower123!');
        expect(result.isValid).toBe(false);
        expect(result.message).toContain('majuscule');
    });

    it('rejette un mot de passe sans minuscule', () => {
        const result = validatePassword('UPPER123!');
        expect(result.isValid).toBe(false);
        expect(result.message).toContain('minuscule');
    });

    it('rejette un mot de passe sans chiffre', () => {
        const result = validatePassword('NoNumber!');
        expect(result.isValid).toBe(false);
        expect(result.message).toContain('chiffre');
    });

    it('rejette un mot de passe de la liste noire (Admin123)', () => {
        const result = validatePassword('Admin123');
        expect(result.isValid).toBe(false);
        expect(result.message).toContain('trop commun');
    });
});
