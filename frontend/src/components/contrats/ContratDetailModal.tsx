import React from 'react';
import { User, Building2, Home, CalendarDays, Banknote, Phone, Download, ExternalLink } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { statutBadge } from '../../utils/contratUtils';
import type { Location } from '../../api/locationApi';

interface Props {
  lease: Location | null;
  onClose: () => void;
}

const ContratDetailModal: React.FC<Props> = ({ lease, onClose }) => (
  <Modal
    isOpen={!!lease}
    onClose={onClose}
    title={lease?.reference_bail ?? ''}
    size="lg"
    footer={
      <>
        <Button variant="ghost" onClick={onClose}>Fermer</Button>
        <Button variant="primary" onClick={() => window.open(`/dashboard/locations/${lease?.id}`, '_blank')}>
          <ExternalLink size={16} className="mr-2" />
          Fiche complète
        </Button>
      </>
    }
  >
    {lease && (
      <div className="space-y-6">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="badge badge-outline badge-lg capitalize">
            {lease.type_contrat === 'vente' ? 'Vente' : 'Location'}
          </span>
          <span className={`badge badge-lg ${statutBadge(lease.statut)}`}>
            {lease.statut?.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-base-content/50 uppercase tracking-wider flex items-center gap-2">
              <User size={14} /> {lease.type_contrat === 'vente' ? 'Acheteur' : 'Locataire'}
            </h3>
            <div className="bg-base-200/50 rounded-xl p-4 space-y-2">
              <p className="font-bold text-base-content text-lg">
                {[lease.locataire_nom, lease.locataire_prenoms].filter(Boolean).join(' ') || '—'}
              </p>
              {lease.locataire_telephone && (
                <p className="text-sm text-base-content/60 flex items-center gap-2">
                  <Phone size={14} /> {lease.locataire_telephone}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-base-content/50 uppercase tracking-wider flex items-center gap-2">
              <Building2 size={14} /> Bien immobilier
            </h3>
            <div className="bg-base-200/50 rounded-xl p-4 space-y-2">
              <p className="font-bold text-base-content">{lease.immeuble_nom || '—'}</p>
              <p className="text-sm text-base-content/60 flex items-center gap-2">
                <Home size={14} />
                {[lease.ref_lot, lease.lot_type].filter(Boolean).join(' · ') || '—'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-base-content/50 uppercase tracking-wider flex items-center gap-2">
              <CalendarDays size={14} /> Période
            </h3>
            <div className="bg-base-200/50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-base-content/60">Début</span>
                <span className="font-semibold">{new Date(lease.date_debut).toLocaleDateString('fr-FR')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-base-content/60">Fin</span>
                <span className="font-semibold">
                  {lease.date_fin ? new Date(lease.date_fin).toLocaleDateString('fr-FR') : 'Indéterminée'}
                </span>
              </div>
              {lease.duree_contrat && (
                <div className="flex justify-between text-sm">
                  <span className="text-base-content/60">Durée</span>
                  <span className="font-semibold">{lease.duree_contrat} mois</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-base-content/50 uppercase tracking-wider flex items-center gap-2">
              <Banknote size={14} /> Financier
            </h3>
            <div className="bg-base-200/50 rounded-xl p-4 space-y-2">
              {lease.type_contrat === 'vente' ? (
                <div className="flex justify-between text-sm">
                  <span className="text-base-content/60">Prix de vente</span>
                  <span className="font-bold text-success text-base">{Number(lease.prix_vente ?? 0).toLocaleString()} F</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-base-content/60">Loyer mensuel</span>
                    <span className="font-bold text-primary text-base">{Number(lease.loyer_mensuel ?? 0).toLocaleString()} F</span>
                  </div>
                  {Number(lease.charges_mensuelles) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-base-content/60">Charges</span>
                      <span className="font-semibold">{Number(lease.charges_mensuelles).toLocaleString()} F</span>
                    </div>
                  )}
                </>
              )}
              {Number(lease.caution) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-base-content/60">Caution</span>
                  <span className="font-semibold">{Number(lease.caution).toLocaleString()} F</span>
                </div>
              )}
              {Number(lease.avance) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-base-content/60">Avance</span>
                  <span className="font-semibold">{Number(lease.avance).toLocaleString()} F</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-base-content/60">Devise</span>
                <span className="font-semibold">{lease.devise || 'XOF'}</span>
              </div>
            </div>
          </div>
        </div>

        {lease.proprietaire_nom && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
            <span className="text-sm text-base-content/60">Propriétaire</span>
            <span className="font-semibold text-primary">{lease.proprietaire_nom}</span>
          </div>
        )}

        {lease.signature_url && (
          <div className="bg-success/10 border border-success/20 rounded-xl p-4 flex items-center justify-between">
            <span className="text-sm text-success font-medium">✍️ Contrat signé électroniquement</span>
            <Button variant="ghost" size="sm" onClick={() => window.open(lease.signature_url, '_blank')}>
              <Download size={16} className="mr-1" /> Télécharger
            </Button>
          </div>
        )}
      </div>
    )}
  </Modal>
);

export default ContratDetailModal;
