# Hope Gestion — Application Mobile

Application React Native (Expo) pour les gestionnaires immobiliers.

## Stack

- **Framework** : React Native + Expo SDK 57
- **Navigation** : Expo Router (file-based)
- **État** : Zustand + expo-secure-store (JWT)
- **Data** : @tanstack/react-query
- **API** : @hopegestion/api-client (package partagé monorepo)
- **Types** : @hopegestion/shared-types (package partagé)
- **Utils** : @hopegestion/utils (formatage, dates, liens)
- **Platform cible** : Android (MVP)

## Structure

```
app/
  _layout.tsx          ← Root layout (auth redirect + React Query)
  (auth)/
    _layout.tsx        ← Stack navigator auth
    login.tsx          ← Connexion
    forgot-password.tsx← Mot de passe oublié
  (app)/
    _layout.tsx        ← Bottom Tab Navigator (5 onglets)
    index.tsx          ← Dashboard gestionnaire
    biens/index.tsx    ← Liste des biens
    locataires/index.tsx ← Liste des locataires
    interventions/index.tsx ← Tickets/interventions
    alertes/index.tsx  ← Centre de notifications
    finances/index.tsx ← Finances & paiements
    profil/index.tsx   ← Profil & déconnexion

components/            ← Composants réutilisables
store/
  authStore.ts         ← Zustand auth (SecureStore)
constants/
  theme.ts             ← Tokens design (couleurs, spacing, typo)
```

## Démarrage

```bash
# Depuis la racine du monorepo
cd apps/mobile

# Installer les dépendances
npm install

# Installer les modules natifs Expo (versions compatibles)
npx expo install expo-router expo-secure-store expo-camera expo-notifications \
  expo-image-picker expo-splash-screen expo-print expo-sharing \
  react-native-gesture-handler react-native-reanimated \
  react-native-safe-area-context react-native-screens \
  @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs \
  babel-plugin-module-resolver

# Démarrer en mode développement (Android)
npm run android
```

## Variables d'environnement

Créer `.env.local` :

```env
EXPO_PUBLIC_API_URL=http://localhost:5001
```

En production :

```env
EXPO_PUBLIC_API_URL=https://api.hopegestion.com
```

## MVP — Scope Gestionnaire

- [x] Login / Logout sécurisé (JWT + SecureStore)
- [x] Dashboard : KPIs, alertes critiques, accès rapides
- [x] Biens : liste avec recherche et taux d'occupation
- [x] Locataires : liste avec appel direct et WhatsApp
- [x] Interventions : tickets avec filtres par statut
- [x] Alertes : centre de notifications avec mark-as-read
- [x] Finances : stats mensuelles + historique paiements
- [x] Profil : infos utilisateur + déconnexion

## Build Android (Production)

```bash
# Installer EAS CLI
npm install -g eas-cli

# Configurer EAS
eas build:configure

# Build APK Android
eas build --platform android --profile preview
```
