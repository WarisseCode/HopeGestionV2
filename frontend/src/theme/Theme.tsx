// frontend/src/theme/Theme.tsx

import React from 'react';
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';

// Définition de la couleur primaire basée sur l'esthétique du site (Bleu Indigo fort)
const primaryColor = '#3f51b5'; // Un Indigo classique et professionnel

const theme = createTheme({
    // --- Palette de Couleurs ---
    palette: {
        primary: {
            main: primaryColor,
            light: '#6573c3',
            dark: '#002984',
            contrastText: '#fff',
        },
        secondary: {
            main: '#f50057', // Un accent rouge/rose standard pour les éléments secondaires
        },
        background: {
            default: '#f4f6f8', // Un gris très clair pour le fond (moins agressif que le blanc pur)
            paper: '#ffffff', // Blanc pour les cartes et conteneurs
        },
    },

    // --- Typographie ---
    typography: {
        fontFamily: ['"Roboto"', '"Helvetica"', 'Arial', 'sans-serif'].join(','),
        h4: {
            fontWeight: 700, // Les titres sont souvent très gras sur le site
        },
        button: {
            textTransform: 'none', // Conserve les boutons en casse normale, plus moderne
            fontWeight: 600,
        }
    },

    // --- Ajustements de Composants (pour un look plus plat/moderne) ---
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8, // Boutons légèrement plus arrondis que le standard MUI
                    boxShadow: 'none', // Enlève l'ombre standard pour un look plus plat
                    '&:hover': {
                        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)', // Ombre légère au survol
                    }
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 12, // Cartes avec coins plus arrondis
                    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.05)', // Ombre très subtile
                }
            }
        },
    },
});

// Le composant wrapper pour appliquer le thème
const CustomThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <ThemeProvider theme={theme}>
            {/* CssBaseline réinitialise le CSS pour correspondre aux normes Material Design */}
            <CssBaseline />
            {children}
        </ThemeProvider>
    );
};

export default CustomThemeProvider;