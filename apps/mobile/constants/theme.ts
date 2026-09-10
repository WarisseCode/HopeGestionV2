/**
 * Thème Hope Gestion — couleurs, polices, espacements
 * Synchronisé avec tailwind.config.js (palette émeraude + ardoise)
 */

export const Colors = {
  // Primaire — Vert émeraude
  primary: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#12D897', // Principal
    600: '#0ebe84', // Hover
    700: '#047857',
    800: '#064e3b',
    900: '#022c22',
  },

  // Secondaire — Ardoise
  secondary: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1E293B', // Ardoise moderne
    900: '#0F172A',
  },

  // Accent — Corail
  accent: {
    500: '#FF6B4A',
    600: '#f04e28',
  },

  // Statuts
  success: '#12D897',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // UI
  background: '#F8FAFC',
  backgroundDark: '#0F172A',
  card: '#FFFFFF',
  cardDark: '#1E293B',
  border: '#E2E8F0',
  borderDark: '#334155',
  text: '#0F172A',
  textMuted: '#64748b',
  textLight: '#FFFFFF',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const Typography = {
  fontSizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 30,
  },
  fontWeights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;
