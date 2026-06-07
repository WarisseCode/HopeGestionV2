import React from 'react';
import { Phone, Mail, Home, Wallet, MessageCircle, Eye, Trash2 } from 'lucide-react';
import type { Locataire } from '../../api/locataireApi';
import { getAvatarColor, getPaymentStatus } from '../../utils/locataireUtils';
import PaymentStatusBadge from './PaymentStatusBadge';

interface Props {
  person: Locataire;
  canWrite: boolean;
  onWhatsApp: (phone: string, name: string) => void;
  onCall: (phone: string) => void;
  onView: (id: number) => void;
  onDelete: (id: number) => void;
}

const LocataireListRow: React.FC<Props> = ({ person, canWrite, onWhatsApp, onCall, onView, onDelete }) => {
  const paymentStatus = getPaymentStatus(person);
  const loyer = person.loyer_actuel || person.loyer;

  return (
    <tr className="hover:bg-base-200/50 transition-colors group">
      <td className="pl-6">
        <div className="flex items-center gap-3">
          {person.photo_profil_url ? (
            <img src={person.photo_profil_url} alt={person.nom} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className={`w-10 h-10 ${getAvatarColor(person.nom)} rounded-full flex items-center justify-center text-white text-sm font-bold`}>
              {person.nom?.charAt(0)}{person.prenoms?.charAt(0)}
            </div>
          )}
          <p className="font-bold text-base-content/90">{person.prenoms} {person.nom}</p>
        </div>
      </td>
      <td className="font-mono text-sm hidden md:table-cell">{person.telephone_principal}</td>
      <td className="text-base-content/60 text-sm hidden lg:table-cell">{person.email || '-'}</td>
      <td className="text-base-content/70">{person.lot_nom || person.lot || '-'}</td>
      <td className="font-semibold hidden sm:table-cell">{loyer ? `${loyer.toLocaleString()} F` : '-'}</td>
      <td className="hidden md:table-cell"><PaymentStatusBadge status={paymentStatus} /></td>
      <td>
        <div className={`flex items-center gap-1.5 text-sm font-semibold ${person.statut === 'Actif' ? 'text-green-600' : 'text-orange-600'}`}>
          <div className={`w-2 h-2 rounded-full ${person.statut === 'Actif' ? 'bg-green-500' : 'bg-orange-500'}`} />
          {person.statut}
        </div>
      </td>
      <td className="pr-6 text-right">
        <div className="flex justify-end gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
          <button type="button" onClick={() => onWhatsApp(person.telephone_principal, person.prenoms)}
            className="btn btn-ghost btn-xs btn-square text-green-600" title="WhatsApp">
            <MessageCircle size={14} />
          </button>
          <button type="button" onClick={() => onCall(person.telephone_principal)}
            className="btn btn-ghost btn-xs btn-square text-teal-600" title="Appeler">
            <Phone size={14} />
          </button>
          <button type="button" onClick={() => onView(person.id)}
            className="btn btn-ghost btn-xs btn-square" title="Détails">
            <Eye size={14} />
          </button>
          {canWrite && (
            <button type="button" onClick={() => onDelete(person.id)}
              className="btn btn-ghost btn-xs btn-square text-error" title="Supprimer">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

export default LocataireListRow;
