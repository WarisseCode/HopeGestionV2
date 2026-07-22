import React from 'react';

interface LegalDocumentProps {
    title: string;
    subtitle?: React.ReactNode;
    children: React.ReactNode;
}

// Habillage commun aux 4 pages juridiques (CGU/CGV/Mentions Légales/Conditions de Réservation) :
// les enfants utilisent des balises sémantiques (h2, p, ul) stylées ici plutôt que de répéter
// les classes Tailwind sur chaque paragraphe des documents.
const LegalDocument: React.FC<LegalDocumentProps> = ({ title, subtitle, children }) => (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-12 md:py-16">
        <h1 className="text-3xl md:text-4xl font-bold text-base-content mb-2">{title}</h1>
        {subtitle && <p className="text-sm text-base-content/60 mb-10">{subtitle}</p>}
        <div
            className="text-base-content/80 leading-relaxed
                [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-base-content [&_h2]:mt-9 [&_h2]:mb-3 [&_h2]:first:mt-0
                [&_h3]:font-semibold [&_h3]:text-base-content [&_h3]:mt-2 [&_h3]:mb-1
                [&_p]:mb-4
                [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_ul]:mb-4
                [&_strong]:text-base-content [&_strong]:font-semibold"
        >
            {children}
        </div>
    </div>
);

export default LegalDocument;
