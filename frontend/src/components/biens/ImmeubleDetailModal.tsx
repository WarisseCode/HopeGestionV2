// frontend/src/components/biens/ImmeubleDetailModal.tsx
import React from 'react';
import { MapPin, Edit3, Home, User, Users, BarChart2, Layers, Info } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import type { Immeuble, Lot } from '../../api/bienApi';
import { getPlaceholderImage, getLotStatut } from '../../utils/bienUtils';

interface Props {
  immeuble: Immeuble | null;
  lots: Lot[];
  canWrite: boolean;
  onClose: () => void;
  onEdit: () => void;
  onGallery: () => void;
}

const ImmeubleDetailModal: React.FC<Props> = ({ immeuble, lots, canWrite, onClose, onEdit, onGallery }) => {
  if (!immeuble) return null;

  const buildingLots   = lots.filter(l => l.building_id === immeuble.id);
  const lotsActifs     = buildingLots.filter(l => ['loue', 'occupe', 'reserve'].includes(l.statut?.toLowerCase() || ''));
  const lotsLibres     = buildingLots.filter(l => ['disponible', 'libre'].includes(l.statut?.toLowerCase() || ''));
  const lotsReserves   = buildingLots.filter(l => l.statut?.toLowerCase() === 'reserve');
  const totalCapacite  = immeuble.total_lots || buildingLots.length;
  const tauxOccupation = totalCapacite > 0 ? Math.round((lotsActifs.length / totalCapacite) * 100) : 0;

  return (
    <Modal isOpen={!!immeuble} onClose={onClose} title="" size="lg">
      <div className="space-y-0 -mt-6 -mx-1">
        {/* Hero image */}
        <div className="relative h-56 rounded-t-2xl overflow-hidden mb-5">
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-10" />
          <img
            src={immeuble.photo || getPlaceholderImage(immeuble.id)}
            alt={immeuble.nom}
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-4 left-5 z-20 text-white">
            <div className="flex items-center gap-2 mb-1">
              <span className="badge badge-ghost bg-white/20 text-white border-none text-xs">{immeuble.type}</span>
            </div>
            <h2 className="text-2xl font-extrabold">{immeuble.nom}</h2>
            <p className="text-sm opacity-80 flex items-center gap-1 mt-0.5">
              <MapPin size={13} /> {[immeuble.quartier, immeuble.ville, immeuble.pays].filter(Boolean).join(', ')}
            </p>
          </div>
          {immeuble.photos && immeuble.photos.length > 1 && (
            <button
              onClick={onGallery}
              className="absolute bottom-4 right-5 z-20 btn btn-xs btn-ghost bg-white/20 text-white border-none hover:bg-white/30"
            >
              +{immeuble.photos.length} photos
            </button>
          )}
        </div>

        {/* Occupation */}
        <div className="px-1 mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-semibold text-base-content/70 flex items-center gap-1.5">
              <BarChart2 size={14} /> Taux d'occupation
            </span>
            <span className="text-sm font-bold text-primary">{tauxOccupation}%</span>
          </div>
          <progress className="progress progress-primary w-full h-2" value={tauxOccupation} max={100} />
        </div>

        {/* Lot stats */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total Lots', value: totalCapacite, color: 'bg-base-200',   text: 'text-base-content' },
            { label: 'Occupés',    value: lotsActifs.length,   color: 'bg-teal-50',   text: 'text-teal-700'    },
            { label: 'Libres',     value: lotsLibres.length,   color: 'bg-green-50',  text: 'text-green-700'   },
            { label: 'Réservés',   value: lotsReserves.length, color: 'bg-orange-50', text: 'text-orange-700'  },
          ].map(stat => (
            <div key={stat.label} className={`${stat.color} rounded-xl p-3 text-center`}>
              <p className={`text-2xl font-extrabold ${stat.text}`}>{stat.value}</p>
              <p className="text-xs font-semibold text-base-content/50 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Info fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          {immeuble.proprietaire && (
            <div className="flex items-start gap-3 p-3 bg-base-100 border border-base-200 rounded-xl">
              <div className="p-2 bg-primary/10 rounded-lg"><User size={15} className="text-primary" /></div>
              <div>
                <p className="text-xs font-bold text-base-content/50 uppercase">Propriétaire</p>
                <p className="font-semibold text-base-content/90 text-sm">{immeuble.proprietaire}</p>
              </div>
            </div>
          )}
          {(immeuble.gestionnaire || immeuble.gestionnaire_name) && (
            <div className="flex items-start gap-3 p-3 bg-base-100 border border-base-200 rounded-xl">
              <div className="p-2 bg-secondary/10 rounded-lg"><Users size={15} className="text-secondary" /></div>
              <div>
                <p className="text-xs font-bold text-base-content/50 uppercase">Gestionnaire</p>
                <p className="font-semibold text-base-content/90 text-sm">{immeuble.gestionnaire_name || immeuble.gestionnaire}</p>
              </div>
            </div>
          )}
          {immeuble.adresse && (
            <div className="flex items-start gap-3 p-3 bg-base-100 border border-base-200 rounded-xl">
              <div className="p-2 bg-base-300 rounded-lg"><MapPin size={15} className="text-base-content/60" /></div>
              <div>
                <p className="text-xs font-bold text-base-content/50 uppercase">Adresse</p>
                <p className="font-semibold text-base-content/90 text-sm">{immeuble.adresse}</p>
              </div>
            </div>
          )}
          {immeuble.nombre_etages && (
            <div className="flex items-start gap-3 p-3 bg-base-100 border border-base-200 rounded-xl">
              <div className="p-2 bg-base-300 rounded-lg"><Layers size={15} className="text-base-content/60" /></div>
              <div>
                <p className="text-xs font-bold text-base-content/50 uppercase">Nombre d'étages</p>
                <p className="font-semibold text-base-content/90 text-sm">{immeuble.nombre_etages}</p>
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        {immeuble.description && (
          <div className="flex items-start gap-3 p-3 bg-base-100 border border-base-200 rounded-xl mb-5">
            <div className="p-2 bg-base-300 rounded-lg shrink-0"><Info size={15} className="text-base-content/60" /></div>
            <div>
              <p className="text-xs font-bold text-base-content/50 uppercase mb-1">Description</p>
              <p className="text-sm text-base-content/70 leading-relaxed">{immeuble.description}</p>
            </div>
          </div>
        )}

        {/* Lots list */}
        {buildingLots.length > 0 && (
          <div>
            <p className="text-xs font-bold text-base-content/50 uppercase mb-2 flex items-center gap-1.5">
              <Home size={13} /> Lots de cet immeuble
            </p>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {buildingLots.map(lot => {
                const s = getLotStatut(lot.statut);
                return (
                  <div key={lot.id} className="flex items-center justify-between p-2.5 bg-base-200/60 rounded-xl text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base-content/80">{lot.reference}</span>
                      <span className="text-base-content/50">·</span>
                      <span className="text-base-content/60">{lot.type}</span>
                      {lot.etage && <span className="text-xs text-base-content/40">Étage {lot.etage}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-base-content/60">
                        {lot.loyer ? `${lot.loyer.toLocaleString()} FCFA/mois` : lot.prix_vente ? `${lot.prix_vente.toLocaleString()} FCFA` : '—'}
                      </span>
                      <span className={`badge badge-xs border-none font-bold ${s.pill}`}>{s.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-5 mt-2 border-t border-base-200">
          <Button variant="ghost" onClick={onClose}>Fermer</Button>
          {canWrite && (
            <Button variant="primary" onClick={onEdit}>
              <Edit3 size={14} className="mr-2" /> Modifier
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ImmeubleDetailModal;
