/**
 * Configuration centralisée du Branding et de l'Identité Visuelle.
 * Conforme à la Charte Graphique (Palette 2 — Tech immobilier moderne).
 */

export interface BrandingConfig {
  name: string;
  shortName: string;
  legalName: string;
  tagline: string;
  description: string;
  logos: {
    main: string;
    light: string;
    dark: string;
    monoWhite: string;
    monoDark: string;
    icon: string;
    favicon: string;
  };
  contact: {
    address: string;
    phone: string;
    phoneFormatted: string;
    email: string;
    supportEmail: string;
  };
  social: {
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    instagram?: string;
  };
  theme: {
    fontSans: string;
    fontHeading: string;
    defaultTheme: string;
    primaryColorName: string;
  };
}

export const BRANDING: BrandingConfig = {
  name: 'Hope Gestion',
  shortName: 'Hope Gestion',
  legalName: 'SKILLEXIE S.E.P',
  tagline: 'La plateforme de gestion immobilière moderne pour les agences et gestionnaires.',
  description: 'Simplifiez vos locations, sécurisez vos revenus et gérez vos biens en toute sérénité.',
  logos: {
    main: '/files/logo-recolore-couleur.svg',
    light: '/files/logo-recolore-couleur.svg',
    dark: '/files/logo-recolore-darkmode.svg',
    monoWhite: '/files/logo-mono-white.svg',
    monoDark: '/files/logo-mono-dark.svg',
    icon: '/files/logo-couleur-512.png',
    favicon: '/files/favicon-32.png',
  },
  contact: {
    address: 'Haie Vive, Cotonou, Bénin',
    phone: '+2290196291361',
    phoneFormatted: '+229 01 96 29 13 61',
    email: 'contact@hopegestion.com',
    supportEmail: 'support@hopegestion.com',
  },
  social: {
    facebook: 'https://facebook.com',
    twitter: 'https://twitter.com',
    linkedin: 'https://linkedin.com',
    instagram: 'https://instagram.com',
  },
  theme: {
    fontSans: 'Inter',
    fontHeading: 'Inter',
    defaultTheme: 'hopegestion',
    primaryColorName: 'Émeraude',
  },
};

export default BRANDING;
