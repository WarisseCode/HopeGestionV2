import React, { useEffect, useState } from 'react';
import { Home, Wallet, Building2, CalendarClock } from 'lucide-react';
import Modal from '../ui/Modal';
import PaymentStatusBadge from './PaymentStatusBadge';
import { getLocataireDetails } from '../../api/locataireApi';
import type { BailSummary } from '@hopegestion/shared-types';
import type { PaymentStatus } from '../../utils/locataireUtils';

interface Props {
  locataireId: number;
  locataireName: string;
  isOpen: boolean;
  onClose: () => void;
}

// PostgreSQL renvoie les numeric en chaîne → on convertit avant tout calcul/affichage,
// sinon « 0 + "45000" » concatène au lieu d'additionner.
const formatF = (n?: number | string) => {
  const v = Number(n);
  return Number.isFinite(v) && n != null && n !== '' ? `${v.toLocaleString()} F` : '-';
};
const formatDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

/**
 * Modal « zoom financier » d'un locataire : liste de tous ses baux actifs/inactifs
 * avec loyer, statut du bail et statut de paiement par logement.
 *
 * Chargement paresseux : on n'appelle getLocataireDetails qu'à l'ouverture (isOpen),
 * pour ne pas alourdir la liste des locataires avec un tableau de baux par carte.
 */
const LoyerDetailsModal: React.FC<Props> = ({ locataireId, locataireName, isOpen, onClose }) => {
  const [baux, setBaux] = useState<BailSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getLocataireDetails(locataireId)
      .then((data) => { if (!cancelled) setBaux(data.baux || []); })
      .catch((e) => { if (!cancelled) setError(e.message || 'Erreur de chargement'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen, locataireId]);

  // Agrégats affichés dans l'en-tête (recalculés côté client à partir des baux actifs)
  const actifs = baux.filter((b) => b.statut === 'actif');
  const loyerTotal = actifs.reduce((sum, b) => sum + (Number(b.loyer_actuel) || 0), 0);
  const paidCount = actifs.filter((b) => b.payment_status === 'paid').length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Loyers — ${locataireName}`} size="md">
      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-base-200 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-red-600 py-4">{error}</p>
      ) : baux.length === 0 ? (
        <p className="text-sm text-base-content/60 py-4">Aucun logement associé à ce locataire.</p>
      ) : (
        <>
          {/* En-tête récapitulatif (baux actifs uniquement) */}
          {actifs.length > 0 && (
            <div className="flex flex-wrap gap-4 mb-5 pb-4 border-b border-base-200">
              <div>
                <p className="text-xs text-base-content/50">Logements actifs</p>
                <p className="text-lg font-bold">{actifs.length}</p>
              </div>
              <div>
                <p className="text-xs text-base-content/50">Loyer total</p>
                <p className="text-lg font-bold text-primary">{formatF(loyerTotal)}</p>
              </div>
              <div>
                <p className="text-xs text-base-content/50">À jour</p>
                <p className="text-lg font-bold">{paidCount}/{actifs.length}</p>
              </div>
            </div>
          )}

          {/* Une carte par bail */}
          <div className="space-y-3">
            {baux.map((b) => (
              <div key={b.id} className="rounded-xl border border-base-200 p-4 bg-base-100">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <Home size={16} className="text-primary" />
                    <span className="font-bold text-base-content">{b.ref_lot || 'Logement'}</span>
                    {b.lot_type && (
                      <span className="text-xs text-base-content/50">· {b.lot_type}</span>
                    )}
                  </div>
                  {/* Statut du bail (actif/résilié…) distinct du statut de paiement */}
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    b.statut === 'actif' ? 'bg-green-100 text-green-700' : 'bg-base-300 text-base-content/60'
                  }`}>
                    {b.statut}
                  </span>
                </div>

                {b.building_name && (
                  <p className="text-xs text-base-content/60 mb-3 flex items-center gap-1.5">
                    <Building2 size={12} /> {b.building_name}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <span className="text-base-content/50 flex items-center gap-1.5"><Wallet size={14} /> Loyer</span>
                  <span className="font-semibold text-right">{formatF(b.loyer_actuel)}</span>

                  <span className="text-base-content/50">Paiement</span>
                  <span className="text-right">
                    <PaymentStatusBadge status={(b.payment_status as PaymentStatus) || 'unknown'} />
                  </span>

                  <span className="text-base-content/50 flex items-center gap-1.5"><CalendarClock size={14} /> Dernier paiement</span>
                  <span className="font-semibold text-right">{formatDate(b.last_payment_date)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
};

export default LoyerDetailsModal;
