import React, { createContext, useState, useEffect, useContext } from 'react';
import { createTheme, ThemeProvider as MUIThemeProvider, CssBaseline } from '@mui/material';

// --- Types ---
type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
    mode: ThemeMode;
    toggleTheme: () => void;
}

// --- Context ---
const ThemeContext = createContext<ThemeContextType>({
    mode: 'light',
    toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

// --- MUI Theme Definitions ---
const getMuiTheme = (mode: ThemeMode) => createTheme({
    palette: {
        mode,
        primary: {
            main: '#3f51b5',
            light: '#6573c3',
            dark: '#002984',
            contrastText: '#fff',
        },
        secondary: {
            main: '#f50057',
        },
        background: {
            default: mode === 'light' ? '#f9fafb' : '#0f172a', 
            paper: mode === 'light' ? '#ffffff' : '#1e293b',
        },
    },
    typography: {
        fontFamily: ['"Inter"', '"Plus Jakarta Sans"', 'sans-serif'].join(','),
        h1: { fontFamily: '"Plus Jakarta Sans", sans-serif' },
        h2: { fontFamily: '"Plus Jakarta Sans", sans-serif' },
        h3: { fontFamily: '"Plus Jakarta Sans", sans-serif' },
        h4: { fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 700 },
        h5: { fontFamily: '"Plus Jakarta Sans", sans-serif' },
        h6: { fontFamily: '"Plus Jakarta Sans", sans-serif' },
        button: {
            textTransform: 'none',
            fontWeight: 600,
        }
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    boxShadow: 'none',
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    boxShadow: mode === 'light' ? '0 4px 10px rgba(0, 0, 0, 0.05)' : '0 4px 10px rgba(0, 0, 0, 0.3)',
                }
            }
        },
    },
});

// --- Provider ---
const CustomThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // 1. Initialize state from localStorage or system preference
    const [mode, setMode] = useState<ThemeMode>(() => {
        const savedMode = localStorage.getItem('theme') as ThemeMode;
        if (savedMode) return savedMode;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    // 2. Sync with localStorage and HTML/Body attributes for Tailwind/DaisyUI
    useEffect(() => {
        localStorage.setItem('theme', mode);
        document.documentElement.setAttribute('data-theme', mode === 'light' ? 'hopegestion' : 'dark');
        
        if (mode === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [mode]);

    const toggleTheme = () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
    };

    const muiTheme = getMuiTheme(mode);

    return (
        <ThemeContext.Provider value={{ mode, toggleTheme }}>
            <MUIThemeProvider theme={muiTheme}>
                <CssBaseline />
                {children}
            </MUIThemeProvider>
        </ThemeContext.Provider>
    );
};

export default CustomThemeProvider;