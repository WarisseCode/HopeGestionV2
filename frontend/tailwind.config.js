/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#12D897', // Vert émeraude brillant & vibrant
          600: '#0ebe84', // Hover
          700: '#047857',
          800: '#064e3b',
          900: '#022c22',
        },
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
        accent: {
          50: '#fff5f2',
          100: '#ffe8e2',
          200: '#ffd4c7',
          300: '#ffb39e',
          400: '#ff8a6b',
          500: '#FF6B4A', // Corail éclatant
          600: '#f04e28',
          700: '#c93917',
          800: '#a43217',
          900: '#852e19',
        },
        slate: {
          50: '#F8FAFC', // Background principal clair & lumineux
          100: '#f1f5f9',
          200: '#E2E8F0', // Bordures
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748B', // Texte secondaire
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A', // Texte principal
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#10B981', // Succès éclatant
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#F59E0B', // Ambre lumineux
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#EF4444', // Rouge vif
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        heading: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      }
    },
  },
  plugins: [
    require('daisyui'),
  ],
  daisyui: {
    themes: [
      {
        hopegestion: {
          "primary": "#12D897",   // Vert émeraude brillant
          "secondary": "#1E293B", // Ardoise moderne
          "accent": "#FF6B4A",    // Corail éclatant
          "neutral": "#0F172A",   // Neutre élégant
          "base-100": "#FFFFFF",  // Blanc éclatant
          "base-200": "#F8FAFC",  // Fond très clair & lumineux
          "base-300": "#E2E8F0",  // Bordures délicates
          "info": "#0284C7",
          "success": "#10B981",   // Succès
          "warning": "#F59E0B",   // Alerte
          "error": "#EF4444",     // Erreur
          "--rounded-box": "1rem",
          "--rounded-btn": "0.5rem",
        },
      },
      {
        dark: {
          "primary": "#2DD4BF",   // Menthe / turquoise
          "secondary": "#38BDF8", // Ciel
          "accent": "#FB923C",    // Corail
          "neutral": "#334155",   // Neutre ardoise
          "base-100": "#1E293B",  // Surface sombre
          "base-200": "#0F172A",  // Fond profond
          "base-300": "#334155",  // Bordures
          "info": "#60A5FA",
          "success": "#34D399",
          "warning": "#FBBF24",
          "error": "#F87171",
          "--rounded-box": "1rem",
          "--rounded-btn": "0.5rem",
        },
      },
    ],
  },
}