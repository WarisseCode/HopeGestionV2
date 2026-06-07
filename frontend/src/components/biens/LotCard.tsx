// frontend/src/components/biens/LotCard.tsx
import React from 'react';
import { Building2, Edit3 } from 'lucide-react';
import type { Lot } from '../../api/bienApi';
import { getPlaceholderImage, getLotStatut } from '../../utils/bienUtils';

interface Props {
  lot: Lot;
  canWrite: boolean;
  onEdit: (e: React.MouseEvent) => void;
  onDetail: () => void;
}

const LotCard: React.FC<Props> = ({ lot, canWrite, onEdit, onDetail }) => {
  const s = getLotStatut(lot.statut);

  return (
    <div
      className="bg-base-100 rounded-2xl shadow-lg border border-base-200 overflow-hidden hover:shadow-xl transition-all group flex flex-col cursor-pointer"
      onClick={onDetail}
    >
      {/* Image */}
      <div className="h-40 bg-base-300 relative overflow-hidden shrink-0">
        <img
          src={lot.photos && lot.photos.length > 0 ? lot.photos[0] : getPlaceholderImage(lot.id)}
          alt={`${lot.reference} — ${lot.immeuble || ''}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <span className={`absolute top-3 right-3 z-20 badge border-none text-white font-bold ${s.badge}`}>
          {s.label}
        </span>
      </div>

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-bold text-base-content/90 text-lg truncate mb-1">{lot.reference}</h3>
        <p className="text-base-content/60 text-sm flex items-center gap-1 mb-3">
          <Building2 size={14} /> {lot.immeuble}
        </p>

        <div className="mt-auto">
          <div className="flex items-center justify-between pt-3 border-t border-base-200">
            <span className="font-mono font-bold text-base-content">
              {lot.loyer?.toLocaleString()} <small>FCFA</small>
            </span>
            {canWrite && (
              <button
                onClick={e => { e.stopPropagation(); onEdit(e); }}
                className="btn btn-ghost btn-xs btn-square"
                title="Modifier"
              >
                <Edit3 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LotCard;
