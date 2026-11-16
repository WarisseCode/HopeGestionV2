// frontend/src/components/ui/RowMenu.tsx
// Menu « ⋯ » des lignes de liste (T-060, partagé avec T-062) : regroupe les actions secondaires
// (modifier, supprimer…) hors de portée d'un clic accidentel.
import React, { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';

// Bouton secondaire des pages refondues (Parc immobilier, Locataires)
export const OUTLINE_BTN = 'inline-flex items-center justify-center gap-1.5 rounded-xl border border-base-300 bg-base-100 text-sm font-semibold text-base-content hover:bg-base-200 transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

export interface RowMenuItem { label: string; onSelect: () => void; danger?: boolean }

// Marge gardée entre le menu et le bord de la zone visible (px)
const EDGE = 8;

/**
 * Zone réellement visible autour d'un élément : l'écran, rétréci par chaque parent qui
 * coupe ce qui dépasse (overflow ≠ visible). Les listes sont dans des cartes en
 * `overflow-hidden` (coins arrondis) : un menu qui en sort devient invisible.
 */
function visibleBounds(el: HTMLElement) {
  let top = 0, left = 0, right = window.innerWidth, bottom = window.innerHeight;
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const s = getComputedStyle(p);
    if (s.overflowX !== 'visible' || s.overflowY !== 'visible') {
      const r = p.getBoundingClientRect();
      top = Math.max(top, r.top); left = Math.max(left, r.left);
      right = Math.min(right, r.right); bottom = Math.min(bottom, r.bottom);
    }
  }
  return { top, left, right, bottom };
}

type Placement = { x: 'start' | 'end'; y: 'down' | 'up' };
// Par défaut : aligné sur le bord droit du bouton ('end', s'étend vers la gauche), vers le bas.
const DEFAULT_PLACEMENT: Placement = { x: 'end', y: 'down' };

const RowMenu: React.FC<{ label: string; items: RowMenuItem[] }> = ({ label, items }) => {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<Placement>(DEFAULT_PLACEMENT);
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

  // Choix du côté d'ouverture au moment du clic, avant l'affichage (pas de clignotement).
  // Quand une liste se resserre (panneau de détail ouvert, téléphone), les boutons passent
  // sous le nom, à gauche : un menu ouvert vers la gauche sortait de la carte et était
  // coupé (« odifier », « upprimer »). On l'ouvre alors vers la droite ; de même vers le
  // haut s'il manque de la place en bas (dernière ligne de la liste).
  const computePlacement = (): Placement => {
    const root = rootRef.current;
    if (!root) return DEFAULT_PLACEMENT;
    const btn = root.getBoundingClientRect();
    const zone = visibleBounds(root);
    // Taille du menu estimée sans l'afficher : min-w-44 (176 px) ou libellé le plus long
    // (≈ 7,5 px par caractère + marges), 40 px par action + bordures et marges internes.
    const longest = Math.max(0, ...items.map(i => i.label.length));
    const width = Math.max(176, Math.ceil(longest * 7.5) + 30);
    const height = items.length * 40 + 14;
    const MARGIN = 6; // mt-1.5 / mb-1.5

    const fitsLeftward = btn.right - width >= zone.left + EDGE;   // 'end' : s'étend vers la gauche
    const fitsRightward = btn.left + width <= zone.right - EDGE;  // 'start' : s'étend vers la droite
    const fitsBelow = btn.bottom + MARGIN + height <= zone.bottom - EDGE;
    const fitsAbove = btn.top - MARGIN - height >= zone.top + EDGE;
    // Ni l'un ni l'autre ne tient (ex. liste d'une seule ligne) : le côté le plus spacieux.
    const roomLeft = btn.right - zone.left, roomRight = zone.right - btn.left;
    const roomBelow = zone.bottom - btn.bottom, roomAbove = btn.top - zone.top;
    return {
      x: fitsLeftward ? 'end' : fitsRightward ? 'start' : (roomLeft >= roomRight ? 'end' : 'start'),
      y: fitsBelow ? 'down' : fitsAbove ? 'up' : (roomBelow >= roomAbove ? 'down' : 'up'),
    };
  };

  const toggle = () => {
    if (!open) setPlacement(computePlacement());
    setOpen(o => !o);
  };

  const posClass = `${placement.x === 'end' ? 'right-0' : 'left-0'} ${placement.y === 'down' ? 'top-full mt-1.5' : 'bottom-full mb-1.5'}`;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
        className={`${OUTLINE_BTN} w-10 h-10`}
      >
        <MoreHorizontal size={16} aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" className={`absolute ${posClass} z-30 min-w-44 py-1.5 rounded-xl border border-base-300 bg-base-100 shadow-lg`}>
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
