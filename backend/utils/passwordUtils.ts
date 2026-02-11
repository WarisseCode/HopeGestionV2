export const WEAK_PASSWORDS = [
    'password123',
    '12345678',
    'azerty123',
    'qwerty123',
    'admin123'
];

export interface ValidationResult {
    isValid: boolean;
    message?: string;
}

/**
 * Validates a password against complexity rules and a list of weak passwords.
 * Rules:
 * - At least 8 characters long
 * - Contains at least one uppercase letter
 * - Contains at least one lowercase letter
 * - Contains at least one number
 * - Is not in the list of common weak passwords
 *
 * @param password The password to validate
 * @returns An object indicating validity and an optional error message
 */
export function validatePassword(password: string): ValidationResult {
    // 1. Check length
    if (password.length < 8) {
        return {
            isValid: false,
            message: 'Le mot de passe doit contenir au moins 8 caractères.'
        };
    }

    // 2. Check complexity
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
        return {
            isValid: false,
            message: 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre.'
        };
    }

    // 3. Check for weak passwords
    if (WEAK_PASSWORDS.includes(password.toLowerCase())) {
        return {
            isValid: false,
            message: 'Ce mot de passe est trop commun. Choisissez un mot de passe plus sécurisé.'
        };
    }

    return { isValid: true };
}
