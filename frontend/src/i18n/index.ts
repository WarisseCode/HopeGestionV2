// frontend/src/i18n/index.ts
// Configuration centrale de l'internationalisation (react-i18next).
//
// Stratégie de langue :
//  1. Au démarrage, le détecteur lit la langue depuis localStorage ('lang'),
//     sinon celle du navigateur, sinon le repli français.
//  2. Une fois le profil chargé, UserContext appelle i18n.changeLanguage avec
//     preferences.language → la préférence enregistrée côté serveur prime.
//  3. Le sélecteur de la page Paramètres appelle aussi changeLanguage pour un
//     basculement instantané (les composants utilisant useTranslation se
//     re-rendent automatiquement).

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import fr from './locales/fr.json';
import en from './locales/en.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
    },
    fallbackLng: 'fr',
    supportedLngs: ['fr', 'en'],
    interpolation: { escapeValue: false }, // React échappe déjà le XSS
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'lang',
      caches: ['localStorage'],
    },
  });

export default i18n;
