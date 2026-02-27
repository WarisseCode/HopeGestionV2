// frontend/src/pages/LocataireDetails.tsx
// Detailed tenant profile page with tabs (Module IV.5)

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLocataireDetails, updateLocataire, type Locataire, type LocataireDetails as LocataireDetailsType } from '../api/locataireApi';
import {
  User, FileText, Wallet, Key, Home, 
  Phone, Mail, MessageCircle, ArrowLeft,
  Calendar, CreditCard, CheckCircle2, AlertCircle, Clock,
  Edit3, Download, ExternalLink
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import LocataireForm from '../components/locataires/LocataireForm';
import { motion } from 'framer-motion';

const tabs = [
  { id: 'profil', label: 'Profil', icon: User },
  { id: 'contrat', label: 'Contrat', icon: FileText },
  { id: 'paiements', label: 'Paiements', icon: Wallet },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'acces', label: 'Accès', icon: Key },
];

const LocataireDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profil');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LocataireDetailsType | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const details = await getLocataireDetails(parseInt(id));
        setData(details);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  const handleSave = async (formData: Partial<Locataire>) => {
    if (!id) return;
    try {
      setSaving(true);
      await updateLocataire(parseInt(id), formData);
      // Refresh data
      const details = await getLocataireDetails(parseInt(id));
      setData(details);
      setShowEditModal(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleWhatsApp = () => {
    if (!data?.locataire.telephone_principal) return;
    const message = encodeURIComponent(`Bonjour ${data.locataire.prenoms}, `);
    window.open(`https://wa.me/${data.locataire.telephone_principal.replace(/\D/g, '')}?text=${message}`, '_blank');
  };

  const handleCall = () => {
    if (!data?.locataire.telephone_principal) return;
    window.location.href = `tel:${data.locataire.telephone_principal}`;
  };

  const handleEmail = () => {
    if (!data?.locataire.email) return;
    window.location.href = `mailto:${data.locataire.email}`;
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[400px]">
        <div className="loading loading-spinner loading-lg text-primary"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <span>{error || 'Locataire non trouvé'}</span>
        </div>
        <Button variant="ghost" onClick={() => navigate(-1)} className="mt-4">
          <ArrowLeft size={16} className="mr-2" /> Retour
        </Button>
      </div>
    );
  }

  const { locataire, baux, paiements } = data;
  const activeBail = baux.find(b => b.statut === 'actif');

  return (
    <motion.div 
      className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2">
        <ArrowLeft size={16} className="mr-2" /> Retour à la liste
      </Button>

      {/* Header Card */}
      <Card className="border-none shadow-xl bg-gradient-to-r from-primary/5 to-secondary/5 p-6">
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-primary text-white flex items-center justify-center text-2xl font-bold ring-4 ring-white shadow-lg">
            {locataire.photo_profil_url ? (
              <img src={locataire.photo_profil_url} alt={locataire.nom} className="w-full h-full rounded-full object-cover" />
            ) : (
              `${locataire.nom?.charAt(0) || ''}${locataire.prenoms?.charAt(0) || ''}`
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-extrabold text-gray-900">
                {locataire.prenoms} {locataire.nom}
              </h1>
              <div className={`flex items-center gap-1.5 font-bold ${locataire.statut === 'Actif' ? 'text-green-600' : 'text-orange-600'}`}>
                <div className={`w-2.5 h-2.5 rounded-full ${locataire.statut === 'Actif' ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                {locataire.statut}
              </div>
              <span className="badge badge-outline">{locataire.type}</span>
            </div>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
              <span className="flex items-center gap-1"><Phone size={14} /> {locataire.telephone_principal}</span>
              {locataire.email && <span className="flex items-center gap-1"><Mail size={14} /> {locataire.email}</span>}
              {activeBail && <span className="flex items-center gap-1"><Home size={14} /> {activeBail.ref_lot}</span>}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button variant="ghost" size="sm" onClick={handleWhatsApp} className="bg-green-50 text-green-600 hover:bg-green-100">
              <MessageCircle size={16} className="mr-1" /> WhatsApp
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCall} className="bg-blue-50 text-blue-600 hover:bg-blue-100">
              <Phone size={16} className="mr-1" /> Appeler
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowEditModal(true)}>
              <Edit3 size={16} className="mr-1" /> Modifier
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {/* Profil Tab */}
        {activeTab === 'profil' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><User size={18} /> Identité</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Nom complet</span><span className="font-medium">{locataire.prenoms} {locataire.nom}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="font-medium">{locataire.type}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Nationalité</span><span className="font-medium">{locataire.nationalite || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Adresse</span><span className="font-medium">{locataire.adresse_actuelle || '-'}</span></div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><CreditCard size={18} /> Pièce d'identité</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="font-medium">{locataire.type_piece || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Numéro</span><span className="font-medium">{locataire.numero_piece || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Expiration</span><span className="font-medium">{locataire.date_expiration_piece ? new Date(locataire.date_expiration_piece).toLocaleDateString('fr-FR') : '-'}</span></div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Wallet size={18} /> Finances</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Mode paiement</span><span className="font-medium">{locataire.mode_paiement_preferentiel || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Caution</span><span className="font-medium">{locataire.caution ? `${locataire.caution.toLocaleString()} F` : '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Avance</span><span className="font-medium">{locataire.avance ? `${locataire.avance.toLocaleString()} F` : '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Échelonné</span><span className="font-medium">{locataire.paiement_echelonne ? 'Oui' : 'Non'}</span></div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Home size={18} /> Logement Actuel</h3>
              {activeBail ? (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Lot</span><span className="font-medium">{activeBail.ref_lot}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Immeuble</span><span className="font-medium">{activeBail.building_name}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Loyer</span><span className="font-semibold text-primary">{activeBail.loyer_actuel?.toLocaleString()} F/mois</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Depuis</span><span className="font-medium">{new Date(activeBail.date_debut).toLocaleDateString('fr-FR')}</span></div>
                </div>
              ) : (
                <p className="text-gray-400 text-sm">Aucun logement actif</p>
              )}
            </Card>
          </div>
        )}

        {/* Contrat Tab */}
        {activeTab === 'contrat' && (
          <div className="space-y-4">
            <h3 className="font-bold text-gray-800 text-lg">Historique des Contrats</h3>
            {baux.length === 0 ? (
              <Card className="p-8 text-center text-gray-400">
                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                <p>Aucun contrat enregistré</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {baux.map((bail: any) => (
                  <Card key={bail.id} className={`p-4 ${bail.statut === 'actif' ? 'border-l-4 border-l-green-500' : ''}`}>
                    <div className="flex flex-wrap justify-between items-center gap-4">
                      <div>
                        <p className="font-bold text-gray-800">{bail.ref_lot} - {bail.building_name}</p>
                        <p className="text-sm text-gray-500">{bail.lot_type}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary">{bail.loyer_actuel?.toLocaleString()} F/mois</p>
                        <p className="text-xs text-gray-400">
                          {new Date(bail.date_debut).toLocaleDateString('fr-FR')} 
                          {bail.date_fin && ` - ${new Date(bail.date_fin).toLocaleDateString('fr-FR')}`}
                        </p>
                      </div>
                      <span className={`badge ${bail.statut === 'actif' ? 'badge-success' : 'badge-ghost'}`}>
                        {bail.statut}
                      </span>
                      {bail.contrat_url && (
                        <Button variant="ghost" size="sm" onClick={() => window.open(bail.contrat_url, '_blank')}>
                          <Download size={14} className="mr-1" /> PDF
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Paiements Tab */}
        {activeTab === 'paiements' && (
          <div className="space-y-4">
            <h3 className="font-bold text-gray-800 text-lg">Derniers Paiements</h3>
            {paiements.length === 0 ? (
              <Card className="p-8 text-center text-gray-400">
                <Wallet size={48} className="mx-auto mb-4 opacity-50" />
                <p>Aucun paiement enregistré</p>
              </Card>
            ) : (
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Montant</th>
                      <th>Type</th>
                      <th>Mode</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paiements.map((p: any) => (
                      <tr key={p.id}>
                        <td>{new Date(p.date_paiement).toLocaleDateString('fr-FR')}</td>
                        <td className="font-semibold">{p.montant?.toLocaleString()} F</td>
                        <td>{p.type_paiement || 'Loyer'}</td>
                        <td>{p.mode_paiement || '-'}</td>
                        <td>
                          <span className={`badge ${p.statut === 'validé' ? 'badge-success' : p.statut === 'en_attente' ? 'badge-warning' : 'badge-ghost'}`}>
                            {p.statut}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            <h3 className="font-bold text-gray-800 text-lg">Documents</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {locataire.photo_piece_url && (
                <Card className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                    <CreditCard size={24} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Pièce d'identité</p>
                    <p className="text-xs text-gray-400">{locataire.type_piece}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => window.open(locataire.photo_piece_url, '_blank')}>
                    <ExternalLink size={14} />
                  </Button>
                </Card>
              )}
              {locataire.photo_profil_url && (
                <Card className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
                    <User size={24} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Photo profil</p>
                    <p className="text-xs text-gray-400">Portrait</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => window.open(locataire.photo_profil_url, '_blank')}>
                    <ExternalLink size={14} />
                  </Button>
                </Card>
              )}
              {!locataire.photo_piece_url && !locataire.photo_profil_url && (
                <Card className="p-8 text-center text-gray-400 col-span-full">
                  <FileText size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Aucun document téléversé</p>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Accès Tab */}
        {activeTab === 'acces' && (
          <div className="space-y-4">
            <h3 className="font-bold text-gray-800 text-lg">Accès Portail Locataire</h3>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                    <Key size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">Portail Locataire</p>
                    <p className="text-sm text-gray-500">Configuration d'accès au portail numérique</p>
                  </div>
                </div>
                <span className="badge badge-ghost">Non configuré</span>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                L'activation du portail permettra au locataire de consulter son contrat, ses paiements et de déposer des plaintes.
              </p>
              <div className="flex gap-2">
                <Button variant="primary" size="sm">
                  <Key size={14} className="mr-1" /> Activer l'accès
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Modifier le profil"
        size="xl"
      >
        <LocataireForm
          locataire={locataire}
          onSave={handleSave}
          onCancel={() => setShowEditModal(false)}
          loading={saving}
        />
      </Modal>
    </motion.div>
  );
};

export default LocataireDetails;
