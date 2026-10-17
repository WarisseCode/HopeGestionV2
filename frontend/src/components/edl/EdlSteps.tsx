// frontend/src/components/edl/EdlSteps.tsx
// Barre d'étapes d'un état des lieux : Brouillon → Signé → Clôturé → Archivé (T-072).
// Orange tant que le document est en brouillon, couleur primaire ensuite.
import React from 'react';
import { EDL_STEPS, stepIndex } from '../../utils/edlStatus';

const EdlSteps: React.FC<{ statut: string; withHints?: boolean; className?: string }> = ({ statut, withHints, className = '' }) => {
    const idx = stepIndex(statut);
    return (
        <ol aria-label={`Étape : ${EDL_STEPS[idx].label}`} className={`grid grid-cols-4 gap-1.5 ${className}`}>
            {EDL_STEPS.map((s, i) => (
                <li key={s.key} aria-current={i === idx ? 'step' : undefined} className="min-w-0 space-y-1.5">
                    <span aria-hidden="true" className={`block h-1.5 rounded-full ${i <= idx ? (idx === 0 ? 'bg-orange-500' : 'bg-primary') : 'bg-base-300'}`} />
                    <span className={`block text-xs truncate ${i === idx ? 'font-bold text-base-content' : 'font-medium text-base-content/70'}`}>{s.label}</span>
                    {withHints && <span className="block text-xs text-base-content/70 truncate">{s.hint}</span>}
                </li>
            ))}
        </ol>
    );
};

export default EdlSteps;
