import React from 'react';

// Les couleurs du design system sont définies via les variables CSS dans index.css
// et la config DaisyUI dans tailwind.config.js.
// Ce provider ne fait plus appel à MUI — zéro overhead runtime.

const CustomThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return <>{children}</>;
};

export default CustomThemeProvider;
