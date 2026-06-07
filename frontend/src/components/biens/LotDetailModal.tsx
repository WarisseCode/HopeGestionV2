// frontend/src/components/biens/LotDetailModal.tsx
import React from 'react';
import { Building2, Edit3, User, Users, Phone, Info, UserPlus } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import type { Lot } from '../../api/bienApi';
import type { Location as BailLocation } from '../../api/locationApi';
import { getPlaceholderImage, getLotStatut } from '../../utils/bienUtils';

interface Props {
  lot: Lot | null;
  locations: BailLocation[];
  canWrite: boolean;
  onClose: () => void;
  onEdit: () => void;
  onAssign: () => void;
}

const LotDetailModal: React.FC<Props> = ({ lot, locations, canWrite, onClose, onEdit, onAssign }) => {
  if (!lot) return null;

  const s    = getLotStatut(lot.statut);
  const bail = locations.find(l => l.lot_id === lot.id && ['actif', 'signe'].includes(l.statut));

  return (
    <Modal isOpen={!!lot} onClose={onClose} title="" size="md">
      <div className="space-y-0 -mt-6 -mx-1">
        {/* Hero */}
        <div className="relative h-48 rounded-t-2xl overflow-hidden mb-5">
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-10" />
          <img
            src={lot.photos && lot.photos.length > 0 ? lot.photos[0] : getPlaceholderImage(lot.id)}
            alt={lot.reference}
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-4 left-5 z-20 text-white">
            <div className="flex items-center gap-2 mb-1">
              <span className={`badge border-none text-white text-xs font-bold ${s.badge}`}>{s.label}</span>
              <span className="badge badge-ghost bg-white/20 text-white border-none text-xs">{lot.type}</span>
            </div>
            <h2 className="text-xl font-extrabold">{lot.reference}</h2>
            <p className="text-sm opacity-80 flex items-center gap-1 mt-0.5">
              <Building2 size={13} /> {lot.immeuble}
              {lot.etage && <span className="opacity-60"> · Étage {lot.etage}</span>}
              {lot.bloc  && <span className="opacity-60"> · Bloc {lot.bloc}</span>}
            </p>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-3 mb-5 px-1">
          {[
            { label: 'Surface',  value: lot.superficie ? `${lot.superficie} m²`                : '—' },
            { label: 'Pièces',   value: lot.nbPieces || '—' },
            { label: 'Loyer',    value: lot.loyer    ? `${lot.loyer.toLocaleString()} FCFA`    : '—' },
            { label: 'Charges',  value: lot.charges  ? `${lot.charges.toLocaleString()} FCFA`  : '—' },
            { label: 'Caution',  value: lot.caution  ? `${lot.caution.toLocaleString()} FCFA`  : '—' },
            { label: 'Avance',   value: lot.avance   ? `${lot.avance} mois`                    : '—' },
          ].map(m => (
            <div key={m.label} className="bg-base-200/60 rounded-xl p-3 text-center">
              <p className="text-xs font-semibold text-base-content/50 uppercase mb-1">{m.label}</p>
              <p className="font-bold text-base-content/90 text-sm">{m.value}</p>
            </div>
          ))}
        </div>

        {/* Current tenant */}
        <div className="px-1 mb-5">
          <p className="text-xs font-bold text-base-content/50 uppercase mb-2 flex items-center gap-1.5">
            <Users size={13} /> Locataire
          </p>
          {bail ? (
            <div className="flex items-center gap-4 p-4 bg-base-200/60 rounded-xl">
              <div className="avatar w-12 h-12 rounded-full overflow-hidden shrink-0 bg-base-300">
                {bail.locataire_photo
                  ? <img src={bail.locataire_photo} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-base-content/40"><User size={22} /></div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base-content/90 truncate">{bail.locataire_nom} {bail.locataire_prenoms}</p>
                {bail.locataire_telephone && (
                  <p className="text-sm text-base-content/60 flex items-center gap-1 mt-0.5">
                    <Phone size={12} /> {bail.locataire_telephone}
                  </p>
                )}
                <p className="text-xs text-base-content/40 mt-1">
                  Depuis le {new Date(bail.date_debut).toLocaleDateString('fr-FR')}
                  {bail.date_fin && ` · jusqu'au ${new Date(bail.date_fin).toLocaleDateString('fr-FR')}`}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-base-200/40 rounded-xl text-base-content/40">
              <User size={20} />
              <span className="text-sm">Aucun locataire actuellement</span>
            </div>
          )}
        </div>

        {/* Description */}
        {lot.description && (
          <div className="px-1 mb-5">
            <p className="text-xs font-bold text-base-content/50 uppercase mb-2 flex items-center gap-1.5">
              <Info size={13} /> Description
            </p>
            <p className="text-sm text-base-content/70 leading-relaxed bg-base-200/40 rounded-xl p-3">
              {lot.description}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-5 px-1 border-t border-base-200">
          <Button variant="ghost" onClick={onClose}>Fermer</Button>
          {canWrite && (
            <div className="flex gap-2">
              {lot.statut === 'libre' && (
                <Button variant="ghost" size="sm" onClick={onAssign}>
                  <UserPlus size={14} className="mr-1.5" /> Affecter
                </Button>
              )}
              <Button variant="primary" onClick={onEdit}>
                <Edit3 size={14} className="mr-1.5" /> Modifier
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default LotDetailModal;
