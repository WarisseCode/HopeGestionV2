import React from 'react';
import { createTheme, ThemeProvider as MUIThemeProvider, CssBaseline } from '@mui/material';

// --- MUI Theme Definition (Light Mode Only) ---
const lightTheme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#4f46e5', // Indigo 600
            light: '#818cf8', 
            dark: '#3730a3',
            contrastText: '#fff',
        },
        secondary: {
            main: '#0ea5e9', // Sky 500
        },
        background: {
            default: '#f8fafc', // Slate 50
            paper: '#ffffff',
        },
        text: {
            primary: '#1e293b', // Slate 800
            secondary: '#64748b', // Slate 500
        },
        divider: 'rgba(0, 0, 0, 0.08)',
    },
    typography: {
        fontFamily: ['"Inter"', '"Plus Jakarta Sans"', 'sans-serif'].join(','),
        h1: { fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 800 },
        h2: { fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 700 },
        h3: { fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 700 },
        h4: { fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 700 },
        h5: { fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 600 },
        h6: { fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 600 },
        button: {
            textTransform: 'none',
            fontWeight: 600,
            fontFamily: '"Plus Jakarta Sans", sans-serif',
        }
    },
    shape: {
        borderRadius: 16,
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    boxShadow: 'none',
                    padding: '8px 24px',
                    '&:hover': {
                        boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)',
                    }
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 16,
                    border: '1px solid rgba(226, 232, 240, 0.8)',
                    boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
                    backgroundImage: 'none',
                }
            }
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                }
            }
        }
    },
});

// --- Provider (Simplified - No Theme Toggle) ---
const CustomThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <MUIThemeProvider theme={lightTheme}>
            <CssBaseline />
            {children}
        </MUIThemeProvider>
    );
};

export default CustomThemeProvider;