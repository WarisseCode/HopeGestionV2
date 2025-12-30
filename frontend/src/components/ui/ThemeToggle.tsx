import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../theme/Theme';

const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
    const { mode, toggleTheme } = useTheme();

    return (
        <button 
            onClick={toggleTheme}
            className={`btn btn-ghost btn-circle btn-sm transition-transform hover:scale-105 ${className}`}
            title={`Passer en mode ${mode === 'light' ? 'sombre' : 'clair'}`}
            aria-label="Toggle theme"
        >
            {mode === 'light' ? (
                <Moon size={20} className="text-neutral-600" />
            ) : (
                <Sun size={20} className="text-yellow-400" />
            )}
        </button>
    );
};

export default ThemeToggle;
