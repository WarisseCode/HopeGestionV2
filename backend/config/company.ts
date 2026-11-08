// backend/config/company.ts
// Coordonnées de HopeGestion utilisées dans les PDF générés par le serveur
// (quittances, états des lieux, reçus de don). Fichier sans effet de bord
// (contrairement à config.ts) : importable partout, y compris dans les tests.
// Pendant côté site : frontend/src/config/branding.ts (à garder synchronisé).
export const COMPANY = {
    city: 'Bohicon',
    address: 'Quartier Hêzonho, Bohicon, Bénin',
    phone: '+229 01 90 67 31 28',
    email: 'contact@hopegestion.com',
} as const;
