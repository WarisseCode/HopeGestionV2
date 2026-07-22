import React from 'react';

// Marque visuellement un champ juridique pas encore finalisé (RCCM, IFU, adresse hébergeur...)
// — cf. LEGAL_TODO.md à la racine du repo pour la liste complète à compléter avant mise en
// production définitive.
const LegalPlaceholder: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
    <span className="inline-block px-1.5 py-0.5 mx-0.5 rounded bg-yellow-200 text-yellow-900 text-xs font-semibold align-middle whitespace-nowrap">
        à compléter{children ? <> — {children}</> : null}
    </span>
);

export default LegalPlaceholder;
