// frontend/src/components/biens/ImmeubleCard.tsx
import React from 'react';
import { MapPin, Edit3, Trash2, ArrowRight } from 'lucide-react';
import Button from '../ui/Button';
import type { Immeuble, Lot } from '../../api/bienApi';
import { getPlaceholderImage } from '../../utils/bienUtils';

interface Props {
  immeuble: Immeuble;
  lots: Lot[];
  canWrite: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDetail: () => void;
  onGallery: () => void;
}

const ImmeubleCard: React.FC<Props> = ({ immeuble, lots, canWrite, onEdit, onDelete, onDetail, onGallery }) => {
  const buildingLots = lots.filter(l => l.building_id === immeuble.id);
  const occupied     = buildingLots.filter(l =>
    ['loue', 'occupe', 'occupé', 'vendu'].includes(l.statut?.toLowerCase() || '')
  ).length;

  return (
    <div className="bg-base-100 rounded-2xl shadow-lg border border-base-200 overflow-hidden hover:shadow-xl transition-all group">
      {/* Image */}
      <div className="h-48 bg-base-300 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
        <button
          type="button"
          className="absolute inset-0 z-30 cursor-zoom-in"
          onClick={e => { e.stopPropagation(); onGallery(); }}
          title="Ouvrir la galerie"
        />
        <img
          src={immeuble.photo || getPlaceholderImage(immeuble.id)}
          alt={`${immeuble.nom} — ${immeuble.ville}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute bottom-4 left-4 z-20 text-white">
          <h2 className="text-xl font-bold">{immeuble.nom}</h2>
          <p className="text-sm opacity-90 flex items-center gap-1">
            <MapPin size={14} /> {immeuble.ville}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-3 bg-base-200 rounded-xl">
            <p className="text-xs text-base-content/50 font-bold uppercase">Lots occupés</p>
            <p className="font-bold text-base-content/90 text-lg">
              <span className="text-primary">{occupied}</span>
              <span className="text-base-content/40 text-base font-medium">/{immeuble.nbLots || buildingLots.length || 0}</span>
            </p>
          </div>
          <div className="p-3 bg-base-200 rounded-xl">
            <p className="text-xs text-base-content/50 font-bold uppercase">Propriétaire</p>
            <p className="font-medium text-base-content/80 text-sm truncate">
              {immeuble.proprietaire || 'Non assigné'}
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-base-200">
          <div className="flex gap-1">
            {canWrite && (
              <button onClick={onEdit} className="btn btn-ghost btn-xs btn-square">
                <Edit3 size={14} />
              </button>
            )}
            {canWrite && (
              <button onClick={onDelete} className="btn btn-ghost btn-xs btn-square text-error">
                <Trash2 size={14} />
              </button>
            )}
          </div>
          <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/5" onClick={onDetail}>
            Détails <ArrowRight size={16} className="ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ImmeubleCard;
