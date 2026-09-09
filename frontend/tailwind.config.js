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
          50: '#f0f9f6',
          100: '#dcf0eb',
          200: '#bbe0d7',
          300: '#8ec9bc',
          400: '#5ba99a',
          500: '#388e7f',
          600: '#0F5D4E', // Émeraude primaire (Charte Graphique)
          700: '#0B4A3E', // Hover
          800: '#093c32',
          900: '#073029',
        },
        secondary: {
          50: '#f6f7f8',
          100: '#eceeef',
          200: '#d5d7da',
          300: '#b2b5ba',
          400: '#898e94',
          500: '#64686e',
          600: '#484b51',
          700: '#3A3D42',
          800: '#2B2D33', // Anthracite secondaire (Charte Graphique)
          900: '#1e2024',
        },
        accent: {
          50: '#fdf4f0',
          100: '#fbe6de',
          200: '#f7cfbf',
          300: '#f1b099',
          400: '#ea8d6f',
          500: '#E8724C', // Corail accent (Charte Graphique)
          600: '#d4562e',
          700: '#b2411f',
          800: '#8e351b',
          900: '#752d18',
        },
        slate: {
          50: '#F4F6F5', // Background principal charte
          100: '#f1f5f9',
          200: '#E1E4E2', // Bordures charte
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#5B5F63', // Texte secondaire charte
          600: '#475569',
          700: '#2B2D33',
          800: '#1e293b',
          900: '#1A1C1E', // Texte principal charte
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#2E7D32', // Succès charte
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
          500: '#E0A800', // Alerte charte
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
          500: '#C0392B', // Erreur charte
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
          "primary": "#0F5D4E",   // Vert émeraude
          "secondary": "#2B2D33", // Anthracite
          "accent": "#E8724C",    // Corail
          "neutral": "#2B2D33",   // Anthracite
          "base-100": "#FFFFFF",  // Surface blanche
          "base-200": "#F4F6F5",  // Background principal
          "base-300": "#E1E4E2",  // Bordures
          "info": "#2B2D33",
          "success": "#2E7D32",   // Succès
          "warning": "#E0A800",   // Alerte
          "error": "#C0392B",     // Erreur
          "--rounded-box": "1rem",
          "--rounded-btn": "0.5rem",
        },
      },
      {
        dark: {
          "primary": "#3EA88A",   // Émeraude éclaircie
          "secondary": "#3A3D42", // Anthracite adouci
          "accent": "#F08962",    // Corail éclairci
          "neutral": "#3A3D42",   // Anthracite
          "base-100": "#1E2225",  // Surface sombre
          "base-200": "#14171A",  // Background noir doux
          "base-300": "#2E3236",  // Bordures sombres
          "info": "#60a5fa",
          "success": "#4CAF50",
          "warning": "#F2C14E",
          "error": "#E57373",
          "--rounded-box": "1rem",
          "--rounded-btn": "0.5rem",
        },
      },
    ],
  },
}