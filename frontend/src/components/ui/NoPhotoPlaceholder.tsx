// src/components/ui/NoPhotoPlaceholder.tsx
// Visuel neutre affiché à la place d'une photo de bien absente.
// Remplace les anciennes photos Unsplash génériques : on n'affiche jamais
// une image qui pourrait passer pour une vraie photo du bien.
import React from 'react';
import { ImageOff } from 'lucide-react';

interface NoPhotoPlaceholderProps {
  /** Classes de dimension/positionnement, identiques à celles de l'<img> remplacée. */
  className?: string;
  /** Texte affiché sous l'icône et lu par les lecteurs d'écran. */
  label?: string;
  /** Masque le texte visible (vignettes trop petites) ; le label reste accessible. */
  showLabel?: boolean;
  iconSize?: number;
}

const NoPhotoPlaceholder: React.FC<NoPhotoPlaceholderProps> = ({
  className = '',
  label = 'Aucune photo',
  showLabel = true,
  iconSize = 32,
}) => (
  <div
    role="img"
    aria-label={label}
    className={`flex flex-col items-center justify-center gap-1.5 bg-base-200 text-base-content/40 select-none ${className}`}
  >
    <ImageOff size={iconSize} strokeWidth={1.5} aria-hidden="true" />
    {showLabel && <span className="text-xs font-medium" aria-hidden="true">{label}</span>}
  </div>
);

export default NoPhotoPlaceholder;
