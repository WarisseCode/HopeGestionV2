// frontend/src/components/ui/RowMenu.tsx
// Menu « ⋯ » des lignes de liste (T-060, partagé avec T-062) : regroupe les actions secondaires
// (modifier, supprimer…) hors de portée d'un clic accidentel.
import React, { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';

// Bouton secondaire des pages refondues (Parc immobilier, Locataires)
export const OUTLINE_BTN = 'inline-flex items-center justify-center gap-1.5 rounded-xl border border-base-300 bg-base-100 text-sm font-semibold text-base-content hover:bg-base-200 transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

export interface RowMenuItem { label: string; onSelect: () => void; danger?: boolean }

const RowMenu: React.FC<{ label: string; items: RowMenuItem[] }> = ({ label, items }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Écouteurs posés seulement menu ouvert : clic à l'extérieur et Échap le referment
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className={`${OUTLINE_BTN} w-10 h-10`}
      >
        <MoreHorizontal size={16} aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full mt-1.5 z-30 min-w-44 py-1.5 rounded-xl border border-base-300 bg-base-100 shadow-lg">
          {items.map(item => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => { setOpen(false); item.onSelect(); }}
              className={`w-full text-left px-3.5 min-h-10 text-sm font-medium hover:bg-base-200 focus-visible:bg-base-200 outline-none ${item.danger ? 'text-error' : 'text-base-content'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default RowMenu;
