// frontend/src/pages/LocataireDetailsPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, User, Phone, Mail, MapPin, 
  Calendar, FileText, CreditCard, Shield, 
  Download, ExternalLink 
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { getLocataireDetails } from '../api/locataireApi';
import type { LocataireDetails } from '../api/locataireApi';

const LocataireDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [details, setDetails] = useState<LocataireDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'finance' | 'documents'>('overview');

  useEffect(() => {
    if (id) {
      loadData(parseInt(id));
    }
  }, [id]);

  const loadData = async (tenantId: number) => {
    try {
      setLoading(true);
      const data = await getLocataireDetails(tenantId);
      setDetails(data);
    } catch (err) {
      console.error(err);
      alert("Erreur chargement dossier");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Chargement du dossier...</div>;
  if (!details) return <div className="p-8 text-center">Locataire introuvable</div>;

  const { locataire, baux, paiements } = details;

  return (
    <div className="space-y-6">
      {/* Header avec Navigation */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
        </Button>
        <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
                {locataire.nom} {locataire.prenoms}
                <span className={`badge ${locataire.statut === 'Actif' ? 'badge-success' : 'badge-neutral'}`}>
                    {locataire.statut}
                </span>
            </h1>
            <p className="text-sm opacity-60">Dossier #{locataire.id} • {locataire.type}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed bg-base-100 p-1 rounded-lg inline-flex">
        <a className={`tab ${activeTab === 'overview' ? 'tab-active' : ''}`} onClick={() => setActiveTab('overview')}>Vue d'ensemble</a>
        <a className={`tab ${activeTab === 'finance' ? 'tab-active' : ''}`} onClick={() => setActiveTab('finance')}>Finances</a>
        <a className={`tab ${activeTab === 'documents' ? 'tab-active' : ''}`} onClick={() => setActiveTab('documents')}>Documents</a>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Infos Personnelles */}
            <Card title="Informations Personnelles" className="lg:col-span-1">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="avatar placeholder">
                            <div className="bg-neutral-focus text-neutral-content rounded-full w-12">
                                <span className="text-xl">{locataire.nom[0]}</span>
                            </div>
                        </div>
                        <div>
                            <p className="font-bold">{locataire.nom} {locataire.prenoms}</p>
                            <p className="text-xs opacity-50">{locataire.nationalite}</p>
                        </div>
                    </div>
                    <div className="divider my-2"></div>
                    <div className="flex items-center gap-3 text-sm">
                        <Phone size={16} className="opacity-50" />
                        <div>
                            <p>{locataire.telephone_principal}</p>
                            {locataire.telephone_secondaire && <p className="text-xs text-opacity-50">{locataire.telephone_secondaire}</p>}
                        </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                        <Mail size={16} className="opacity-50" />
                        <p>{locataire.email || 'Non renseigné'}</p>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                        <Shield size={16} className="opacity-50" />
                        <p>{locataire.type_piece} - {locataire.numero_piece}</p>
                    </div>
                </div>
            </Card>

            {/* Baux Actifs */}
            <div className="lg:col-span-2 space-y-6">
                <Card title="Baux & Contrats">
                    {baux.length === 0 ? (
                        <p className="opacity-50 text-sm">Aucun bail actif.</p>
                    ) : (
                        baux.map((bail: any) => (
                            <div key={bail.id} className="border border-base-200 rounded-lg p-4 mb-4 flex justify-between items-center hover:bg-base-50 transition-colors">
                                <div>
                                    <h3 className="font-bold flex items-center gap-2">
                                        <MapPin size={16} className="text-primary"/> 
                                        {bail.building_name} - {bail.ref_lot}
                                    </h3>
                                    <p className="text-sm opacity-60">
                                        Du {new Date(bail.date_debut).toLocaleDateString()} 
                                        {bail.date_fin ? ` au ${new Date(bail.date_fin).toLocaleDateString()}` : ' (Indéterminée)'}
                                    </p>
                                    <div className="mt-2 flex gap-2">
                                        <span className="badge badge-sm badge-outline">Loyer : {bail.loyer_actuel} F</span>
                                        <span className="badge badge-sm badge-outline">Caution : {bail.caution_versee} F</span>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm">Détails</Button>
                            </div>
                        ))
                    )}
                </Card>
            </div>
        </div>
      )}

      {activeTab === 'finance' && (
        <Card title="Historique des paiements">
            <table className="table w-full">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Montant</th>
                        <th>Mode</th>
                        <th>Reference</th>
                        <th>Statut</th>
                    </tr>
                </thead>
                <tbody>
                    {paiements.map((p: any) => (
                        <tr key={p.id}>
                            <td>{new Date(p.date_paiement).toLocaleDateString()}</td>
                            <td>{p.type}</td>
                            <td className="font-mono font-bold">{p.montant} F</td>
                            <td>{p.mode_paiement}</td>
                            <td className="text-xs font-mono">{p.reference_transaction || '-'}</td>
                            <td><span className="badge badge-success badge-sm">{p.statut}</span></td>
                        </tr>
                    ))}
                    {paiements.length === 0 && <tr><td colSpan={6} className="text-center opacity-50">Aucun paiement récent</td></tr>}
                </tbody>
            </table>
        </Card>
      )}

      {activeTab === 'documents' && (
        <Card title="Documents du locataire">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Simulation de documents */}
                <div className="flex items-center justify-between p-4 border rounded-xl">
                    <div className="flex items-center gap-3">
                        <FileText className="text-secondary" />
                        <div>
                            <p className="font-medium">Pièce d'identité</p>
                            <p className="text-xs opacity-50">PDF • 2.1 MB</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm"><Download size={16} /></Button>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-xl">
                    <div className="flex items-center gap-3">
                        <FileText className="text-secondary" />
                        <div>
                            <p className="font-medium">Contrat de Bail Signé</p>
                            <p className="text-xs opacity-50">PDF • 4.5 MB</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm"><Download size={16} /></Button>
                </div>
            </div>
            <div className="mt-6">
                <Button variant="ghost" className="w-full border border-dashed border-base-300">
                    <ExternalLink size={16} className="mr-2"/> 
                    Aller au Coffre-fort numérique
                </Button>
            </div>
        </Card>
      )}
    </div>
  );
};

export default LocataireDetailsPage;
