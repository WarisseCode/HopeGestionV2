import React from 'react';
import { Phone, Mail, Home, Wallet, MessageCircle, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Locataire } from '../../api/locataireApi';
import { getAvatarColor, getPaymentStatus } from '../../utils/locataireUtils';
import PaymentStatusBadge from './PaymentStatusBadge';

interface Props {
  person: Locataire;
  onWhatsApp: (phone: string, name: string) => void;
  onCall: (phone: string) => void;
  onView: (id: number) => void;
}

const LocataireCard: React.FC<Props> = ({ person, onWhatsApp, onCall, onView }) => {
  const paymentStatus = getPaymentStatus(person);
  const loyer = person.loyer_actuel || person.loyer;

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="bg-base-100 rounded-2xl shadow-lg border border-base-200 p-6 hover:shadow-xl transition-all group relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary" />

      <div className="flex justify-between items-start mb-4">
        {person.photo_profil_url ? (
          <img src={person.photo_profil_url} alt={person.nom}
            className="w-14 h-14 rounded-full object-cover ring-4 ring-base-100 shadow-sm" />
        ) : (
          <div className={`w-14 h-14 ${getAvatarColor(person.nom)} rounded-full flex items-center justify-center text-white text-xl font-bold ring-4 ring-base-100 shadow-sm`}>
            {person.nom?.charAt(0)}{person.prenoms?.charAt(0)}
          </div>
        )}
        <div className={`flex items-center gap-1.5 text-xs font-bold ${person.statut === 'Actif' ? 'text-green-600' : 'text-orange-600'} py-2 h-auto`}>
          <div className={`w-2 h-2 rounded-full ${person.statut === 'Actif' ? 'bg-green-500' : 'bg-orange-500'}`} />
          {person.statut}
        </div>
      </div>

      <h3 className="text-lg font-bold text-base-content leading-tight mb-1">{person.prenoms} {person.nom}</h3>
      <p className="text-sm text-base-content/60 mb-1 flex items-center gap-1.5">
        <Phone size={12} /> {person.telephone_principal}
      </p>
      {person.email && (
        <p className="text-xs text-base-content/60 mb-3 flex items-center gap-1.5 truncate">
          <Mail size={12} /> {person.email}
        </p>
      )}

      <div className="space-y-2 pt-4 border-t border-base-200">
        <div className="flex justify-between items-center text-sm">
          <span className="text-base-content/50 flex items-center gap-1.5"><Home size={14} /> Logement</span>
          <span className="font-semibold text-base-content/90">{person.lot_nom || person.lot || '-'}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-base-content/50 flex items-center gap-1.5"><Wallet size={14} /> Loyer</span>
          <span className="font-semibold text-primary">{loyer ? `${loyer.toLocaleString()} F` : '-'}</span>
        </div>
        {loyer && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-base-content/50">Paiement</span>
            <PaymentStatusBadge status={paymentStatus} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-base-200">
        <button type="button" title="WhatsApp"
          onClick={() => onWhatsApp(person.telephone_principal, person.prenoms)}
          className="btn btn-sm btn-ghost bg-green-100/50 hover:bg-green-100 text-green-600">
          <MessageCircle size={16} />
        </button>
        <button type="button" title="Appeler"
          onClick={() => onCall(person.telephone_principal)}
          className="btn btn-sm btn-ghost bg-teal-100/50 hover:bg-teal-100 text-teal-600">
          <Phone size={16} />
        </button>
        <button type="button" title="Détails"
          onClick={() => onView(person.id)}
          className="btn btn-sm btn-ghost bg-teal-100/50 hover:bg-teal-100 text-teal-600">
          <Eye size={16} />
        </button>
      </div>
    </motion.div>
  );
};

export default LocataireCard;
