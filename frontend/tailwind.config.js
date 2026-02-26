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
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5', // Make sure this is the main primary
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        secondary: { // Keeping Pink/Rose as secondary for alerts/accents or switching to Sky? 
                     // Let's use Sky as "Accent" and keep Pink as Secondary for variety
          50: '#f0f9ff',
          100: '#e0f2fe', // The user liked this Sky
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        slate: {
          50: '#f8fafc', // Main background
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b', 
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
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
          500: '#f59e0b',
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
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
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
          "primary": "#4f46e5", // Indigo 600
          "secondary": "#0ea5e9", // Sky 500
          "accent": "#8b5cf6", // Violet
          "neutral": "#1e293b", // Slate 800
          "base-100": "#ffffff",
          "base-200": "#f8fafc", // Slate 50
          "info": "#3b82f6",
          "success": "#22c55e",
          "warning": "#f59e0b",
          "error": "#ef4444",
          "--rounded-box": "1rem", // rounded-2xl
          "--rounded-btn": "0.5rem", // rounded-lg
        },
      },
      {
        dark: {
          "primary": "#6366f1", // Indigo 500 (lighter for dark mode)
          "secondary": "#38bdf8", // Sky 400
          "accent": "#a78bfa", // Violet 400
          "neutral": "#94a3b8", // Slate 400
          "base-100": "#0f172a", // Slate 900 (Main BG)
          "base-200": "#1e293b", // Slate 800 (Secondary BG)
          "base-300": "#334155", // Slate 700 (Borders)
          "info": "#60a5fa",
          "success": "#4ade80",
          "warning": "#fbbf24",
          "error": "#f87171",
          "--rounded-box": "1rem", 
          "--rounded-btn": "0.5rem", 
        },
      },
    ],
  },
}