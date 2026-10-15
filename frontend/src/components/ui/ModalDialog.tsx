// src/components/ui/ModalDialog.tsx
// Enveloppe accessible des modales « maison » (fond div.fixed + Card) : role="dialog",
// aria-modal, aria-labelledby, Échap = Annuler, focus initial dans la modale, piège de focus
// Tab/Maj+Tab et focus rendu à l'élément d'ouverture. Apparence inchangée : le fond reprend
// les classes d'origine et le contenu (Card) est rendu tel quel (T-049).
import React, { useEffect, useRef } from 'react';

// Pile des modales ouvertes : Échap et le piège de focus ne concernent que celle du dessus
const openDialogs: HTMLElement[] = [];

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]',
  '[contenteditable]',
].join(',');

// Éléments atteignables au clavier (tabIndex >= 0) et affichés (exclut p. ex. l'input fichier en `hidden`)
const getFocusable = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    el => el.tabIndex >= 0 && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden',
  );

interface ModalDialogProps {
  /** Même effet que le bouton Annuler/Fermer de la modale (appelé sur Échap). */
  onClose: () => void;
  /** id du titre visible de la modale. */
  labelledBy: string;
  /** Classes de largeur du panneau (ex. `max-w-md`), auparavant portées par la Card. */
  className?: string;
  children: React.ReactNode;
}

const ModalDialog: React.FC<ModalDialogProps> = ({ onClose, labelledBy, className = '', children }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    openDialogs.push(panel);
    (getFocusable(panel)[0] ?? panel).focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (openDialogs[openDialogs.length - 1] !== panel || e.isComposing) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = getFocusable(panel);
      const active = document.activeElement;
      if (items.length === 0) { e.preventDefault(); panel.focus(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      if (!panel.contains(active)) {
        // Focus sorti de la modale (clic sur le fond) : on y revient
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const i = openDialogs.indexOf(panel);
      // Focus rendu à l'ouvreur seulement si c'était la modale du dessus (une modale du
      // dessous qui se ferme ne doit pas sortir le focus de celle restée ouverte au-dessus)
      const wasTop = i >= 0 && i === openDialogs.length - 1;
      if (i >= 0) openDialogs.splice(i, 1);
      if (wasTop && opener && opener.isConnected) opener.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`w-full ${className} focus:outline-none`}
      >
        {children}
      </div>
    </div>
  );
};

export default ModalDialog;
