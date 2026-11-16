// frontend/src/components/ui/RowMenu.tsx
// Menu « ⋯ » des lignes de liste (T-060, partagé avec T-062) : regroupe les actions secondaires
// (modifier, supprimer…) hors de portée d'un clic accidentel.
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';

// Bouton secondaire des pages refondues (Parc immobilier, Locataires)
export const OUTLINE_BTN = 'inline-flex items-center justify-center gap-1.5 rounded-xl border border-base-300 bg-base-100 text-sm font-semibold text-base-content hover:bg-base-200 transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

export interface RowMenuItem { label: string; onSelect: () => void; danger?: boolean }

// Marge gardée entre le menu et le bord de l'écran (px), et écart avec le bouton.
const EDGE = 8;
const GAP = 6;

/**
 * Position du menu, en coordonnées d'écran (position: fixed).
 *
 * Pourquoi un menu « au-dessus de la page » (portail dans <body>) : les listes sont dans
 * des cartes en `overflow-hidden` (coins arrondis). Un menu positionné dans la ligne était
 * coupé dès qu'il dépassait de la carte : à gauche quand la liste se resserre (T-095,
 * « odifier »), et en hauteur quand la liste est courte et le menu long (Baux &
 * Locations : 7 actions, ~300 px). Hors de la carte, seul l'écran limite le menu.
 */
type Pos = { style: React.CSSProperties };

const RowMenu: React.FC<{ label: string; items: RowMenuItem[] }> = ({ label, items }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos>({ style: {} });
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Menu ouvert : clic à l'extérieur (bouton ET menu, ce dernier étant dans <body>) et Échap
  // le referment. En position fixe, il ne suit pas la ligne tout seul : au défilement ou au
  // redimensionnement, on le replace contre son bouton (une fois par image), et on le ferme
  // seulement si le bouton sort de l'écran.
  useEffect(() => {
    if (!open) return;
    const inside = (t: EventTarget | null) =>
      !!t && (rootRef.current?.contains(t as Node) || menuRef.current?.contains(t as Node));
    const onDown = (e: MouseEvent) => { if (!inside(e.target)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    let frame = 0;
    const follow = (e?: Event) => {
      if (e && menuRef.current?.contains(e.target as Node)) return; // défilement interne du menu
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const btn = rootRef.current?.getBoundingClientRect();
        if (!btn || btn.bottom < 0 || btn.top > window.innerHeight) { setOpen(false); return; }
        setPos(computePos());
      });
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', follow, true); // capture : défilement de n'importe quel conteneur
    window.addEventListener('resize', follow);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', follow, true);
      window.removeEventListener('resize', follow);
    };
    // computePos ne dépend que des refs et des libellés : pas besoin de relancer l'effet
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Côté d'ouverture choisi au clic, avant l'affichage (pas de clignotement) : vers la
  // gauche et vers le bas par défaut ; vers la droite / le haut s'il manque de la place.
  const computePos = (): Pos => {
    const root = rootRef.current;
    if (!root) return { style: {} };
    const btn = root.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    // Taille estimée sans afficher le menu : min-w-44 (176 px) ou libellé le plus long
    // (≈ 7,5 px par caractère + marges) ; 40 px par action + bordures et marges internes.
    const longest = Math.max(0, ...items.map(i => i.label.length));
    const width = Math.max(176, Math.ceil(longest * 7.5) + 30);
    const height = items.length * 40 + 14;

    const style: React.CSSProperties = {};
    // Horizontal : bord droit du menu sur le bord droit du bouton (s'étend vers la gauche)…
    if (btn.right - width >= EDGE) style.right = vw - btn.right;
    // … sinon bord gauche sur le bord gauche du bouton (s'étend vers la droite)…
    else if (btn.left + width <= vw - EDGE) style.left = btn.left;
    // … sinon collé au bord gauche de l'écran (très petit écran).
    else style.left = EDGE;

    // Vertical : en dessous si possible, sinon au-dessus, sinon le côté le plus spacieux
    // avec défilement interne (maxHeight).
    const roomBelow = vh - btn.bottom - GAP - EDGE;
    const roomAbove = btn.top - GAP - EDGE;
    if (height <= roomBelow || roomBelow >= roomAbove) {
      style.top = btn.bottom + GAP;
      if (height > roomBelow) style.maxHeight = Math.max(roomBelow, 120);
    } else {
      style.bottom = vh - btn.top + GAP;
      if (height > roomAbove) style.maxHeight = Math.max(roomAbove, 120);
    }
    return { style };
  };

  const toggle = () => {
    if (!open) setPos(computePos());
    setOpen(o => !o);
  };

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
      {open && createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label={label}
          style={{ position: 'fixed', ...pos.style }}
          className="z-[70] min-w-44 py-1.5 overflow-y-auto rounded-xl border border-base-300 bg-base-100 shadow-lg"
        >
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
        </div>,
        document.body
      )}
    </div>
  );
};

export default RowMenu;
