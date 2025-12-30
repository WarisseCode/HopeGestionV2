// frontend/src/pages/Finances.tsx
import React, { useState } from 'react';
import { 
  Wallet, 
  Plus, 
  Edit3, 
  Eye, 
  Trash2, 
  Calendar, 
  Home,
  Users,
  TrendingUp,
  TrendingDown,
  FileText,
  Download,
  Filter,
  BarChart3,
  PieChart
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Alert from '../components/ui/Alert';

const Finances: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'paiements' | 'depenses' | 'rapports'>('paiements');
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'paiement' | 'depense'>('paiement');

  // Données de démonstration
  const [paiements] = useState([
    {
      id: 1,
      reference: 'PMT-2025-001',
      locataire: 'KOFFI Jean',
      lot: 'A01 - Résidence La Paix',
      date: '2025-01-15',
      type: 'Loyer',
      montant: 150000,
      modePaiement: 'Mobile Money',
      statut: 'Validé',
      fichier: 'reçu_001.pdf'
    },
    {
      id: 2,
      reference: 'PMT-2025-002',
      locataire: 'DOSSOU Marie',
      lot: 'A02 - Résidence La Paix',
      date: '2025-01-16',
      type: 'Charges',
      montant: 10000,
      modePaiement: 'Espèces',
      statut: 'Validé',
      fichier: 'reçu_002.pdf'
    },
    {
      id: 3,
      reference: 'PMT-2025-003',
      locataire: 'ADJINON Sébastien',
      lot: 'B01 - Immeuble Le Destin',
      date: '2025-01-17',
      type: 'Acompte',
      montant: 200000,
      modePaiement: 'Virement',
      statut: 'En attente',
      fichier: 'reçu_003.pdf'
    }
  ]);

  const [depenses] = useState([
    {
      id: 1,
      reference: 'DEP-2025-001',
      fournisseur: 'SARL Electricité Pro',
      type: 'Électricité',
      date: '2025-01-10',
      montant: 50000,
      statut: 'Payé',
      fichier: 'facture_001.pdf'
    },
    {
      id: 2,
      reference: 'DEP-2025-002',
      fournisseur: 'SARL Plomberie Expert',
      type: 'Plomberie',
      date: '2025-01-12',
      montant: 75000,
      statut: 'Payé',
      fichier: 'facture_002.pdf'
    },
    {
      id: 3,
      reference: 'DEP-2025-003',
      fournisseur: 'SARL Nettoyage Clean',
      type: 'Nettoyage',
      date: '2025-01-15',
      montant: 30000,
      statut: 'En attente',
      fichier: 'facture_003.pdf'
    }
  ]);

  const [paiementForm, setPaiementForm] = useState({
    reference: '',
    locataire: '',
    lot: '',
    date: '',
    type: 'Loyer',
    montant: 0,
    modePaiement: 'Mobile Money',
    statut: 'En attente',
    fichier: null
  });

  const [depenseForm, setDepenseForm] = useState({
    reference: '',
    fournisseur: '',
    type: 'Électricité',
    date: '',
    montant: 0,
    statut: 'En attente',
    fichier: null
  });

  // Données pour les graphiques
  const revenusData = [
    { mois: 'Jan', montant: 1200000 },
    { mois: 'Fév', montant: 1500000 },
    { mois: 'Mar', montant: 1300000 },
    { mois: 'Avr', montant: 1600000 },
    { mois: 'Mai', montant: 1400000 },
    { mois: 'Jun', montant: 1700000 }
  ];

  const depensesData = [
    { mois: 'Jan', montant: 300000 },
    { mois: 'Fév', montant: 250000 },
    { mois: 'Mar', montant: 350000 },
    { mois: 'Avr', montant: 280000 },
    { mois: 'Mai', montant: 320000 },
    { mois: 'Jun', montant: 310000 }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-base-content">Gestion des Finances</h1>
          <p className="text-base-content/70">Paiements, dépenses et rapports</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="primary" 
            onClick={() => {
              setFormType(activeTab === 'paiements' ? 'paiement' : 'depense');
              setShowForm(true);
            }}
          >
            <Plus size={18} className="mr-2" />
            {activeTab === 'paiements' ? 'Ajouter un paiement' : 'Ajouter une dépense'}
          </Button>
          <Button variant="ghost">
            <Filter size={18} className="mr-2" />
            Filtres
          </Button>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="flex border-b border-base-200">
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'paiements'
              ? 'text-primary border-b-2 border-primary'
              : 'text-base-content/60 hover:text-base-content'
          }`}
          onClick={() => setActiveTab('paiements')}
        >
          <div className="flex items-center gap-2">
            <Wallet size={18} />
            Paiements
          </div>
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'depenses'
              ? 'text-primary border-b-2 border-primary'
              : 'text-base-content/60 hover:text-base-content'
          }`}
          onClick={() => setActiveTab('depenses')}
        >
          <div className="flex items-center gap-2">
            <TrendingDown size={18} />
            Dépenses
          </div>
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'rapports'
              ? 'text-primary border-b-2 border-primary'
              : 'text-base-content/60 hover:text-base-content'
          }`}
          onClick={() => setActiveTab('rapports')}
        >
          <div className="flex items-center gap-2">
            <BarChart3 size={18} />
            Rapports
          </div>
        </button>
      </div>

      {/* Formulaire pour ajouter/modifier */}
      {showForm && (
        <Card title={
          formType === 'paiement' ? 'Création / Modification d\'un paiement' : 'Création / Modification d\'une dépense'
        }>
          {formType === 'paiement' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Input 
                  label="Référence du paiement" 
                  placeholder="Ex: PMT-2025-001" 
                  value={paiementForm.reference}
                  onChange={(e) => setPaiementForm({...paiementForm, reference: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Locataire</label>
                <select 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                  value={paiementForm.locataire}
                  onChange={(e) => setPaiementForm({...paiementForm, locataire: e.target.value})}
                >
                  <option value="">Sélectionnez un locataire</option>
                  <option value="KOFFI Jean">KOFFI Jean</option>
                  <option value="DOSSOU Marie">DOSSOU Marie</option>
                  <option value="ADJINON Sébastien">ADJINON Sébastien</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Lot concerné</label>
                <select 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                  value={paiementForm.lot}
                  onChange={(e) => setPaiementForm({...paiementForm, lot: e.target.value})}
                >
                  <option value="">Sélectionnez un lot</option>
                  <option value="A01 - Résidence La Paix">A01 - Résidence La Paix</option>
                  <option value="A02 - Résidence La Paix">A02 - Résidence La Paix</option>
                  <option value="B01 - Immeuble Le Destin">B01 - Immeuble Le Destin</option>
                </select>
              </div>
              
              <div>
                <Input 
                  label="Date" 
                  type="date"
                  value={paiementForm.date}
                  onChange={(e) => setPaiementForm({...paiementForm, date: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Type de paiement</label>
                <select 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                  value={paiementForm.type}
                  onChange={(e) => setPaiementForm({...paiementForm, type: e.target.value})}
                >
                  <option value="Loyer">Loyer</option>
                  <option value="Charges">Charges</option>
                  <option value="Acompte">Acompte</option>
                  <option value="Avance">Avance</option>
                  <option value="Caution">Caution</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
              
              <div>
                <Input 
                  label="Montant (FCFA)" 
                  type="number"
                  placeholder="Entrez le montant" 
                  value={paiementForm.montant}
                  onChange={(e) => setPaiementForm({...paiementForm, montant: parseFloat(e.target.value) || 0})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Mode de paiement</label>
                <select 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                  value={paiementForm.modePaiement}
                  onChange={(e) => setPaiementForm({...paiementForm, modePaiement: e.target.value})}
                >
                  <option value="Mobile Money">Mobile Money</option>
                  <option value="Espèces">Espèces</option>
                  <option value="Virement">Virement</option>
                  <option value="Chèque">Chèque</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Statut</label>
                <select 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                  value={paiementForm.statut}
                  onChange={(e) => setPaiementForm({...paiementForm, statut: e.target.value})}
                >
                  <option value="En attente">En attente</option>
                  <option value="Validé">Validé</option>
                  <option value="Rejeté">Rejeté</option>
                </select>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Téléversement du reçu</label>
                <div className="flex items-center gap-4">
                  <div className="avatar placeholder">
                    <div className="bg-neutral text-neutral-content rounded-full w-16 flex items-center justify-center">
                      <span className="text-xs">PDF</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <FileText size={16} className="mr-2" />
                    Télécharger
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Input 
                  label="Référence de la dépense" 
                  placeholder="Ex: DEP-2025-001" 
                  value={depenseForm.reference}
                  onChange={(e) => setDepenseForm({...depenseForm, reference: e.target.value})}
                />
              </div>
              
              <div>
                <Input 
                  label="Fournisseur" 
                  placeholder="Entrez le nom du fournisseur" 
                  value={depenseForm.fournisseur}
                  onChange={(e) => setDepenseForm({...depenseForm, fournisseur: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Type de dépense</label>
                <select 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                  value={depenseForm.type}
                  onChange={(e) => setDepenseForm({...depenseForm, type: e.target.value})}
                >
                  <option value="Électricité">Électricité</option>
                  <option value="Eau">Eau</option>
                  <option value="Plomberie">Plomberie</option>
                  <option value="Nettoyage">Nettoyage</option>
                  <option value="Sécurité">Sécurité</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
              
              <div>
                <Input 
                  label="Date" 
                  type="date"
                  value={depenseForm.date}
                  onChange={(e) => setDepenseForm({...depenseForm, date: e.target.value})}
                />
              </div>
              
              <div>
                <Input 
                  label="Montant (FCFA)" 
                  type="number"
                  placeholder="Entrez le montant" 
                  value={depenseForm.montant}
                  onChange={(e) => setDepenseForm({...depenseForm, montant: parseFloat(e.target.value) || 0})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Statut</label>
                <select 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                  value={depenseForm.statut}
                  onChange={(e) => setDepenseForm({...depenseForm, statut: e.target.value})}
                >
                  <option value="En attente">En attente</option>
                  <option value="Payé">Payé</option>
                  <option value="Rejeté">Rejeté</option>
                </select>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Téléversement de la facture</label>
                <div className="flex items-center gap-4">
                  <div className="avatar placeholder">
                    <div className="bg-neutral text-neutral-content rounded-full w-16 flex items-center justify-center">
                      <span className="text-xs">PDF</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <FileText size={16} className="mr-2" />
                    Télécharger
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end gap-3 mt-6">
            <Button 
              variant="ghost" 
              onClick={() => setShowForm(false)}
            >
              Annuler
            </Button>
            <Button 
              variant="primary"
              onClick={() => {
                // Traitement de la soumission du formulaire
                setShowForm(false);
              }}
            >
              {formType === 'paiement' ? 'Enregistrer le paiement' : 'Enregistrer la dépense'}
            </Button>
          </div>
        </Card>
      )}

      {/* Contenu des onglets */}
      {activeTab === 'paiements' && (
        <div className="space-y-6">
          {/* Résumé des paiements */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <div className="flex items-center gap-4">
                <div className="avatar placeholder">
                  <div className="bg-success/10 text-success rounded-full w-12 flex items-center justify-center">
                    <TrendingUp size={24} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-base-content/60">Total reçu</p>
                  <p className="text-2xl font-bold">2,800,000 FCFA</p>
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="flex items-center gap-4">
                <div className="avatar placeholder">
                  <div className="bg-warning/10 text-warning rounded-full w-12 flex items-center justify-center">
                    <TrendingDown size={24} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-base-content/60">En attente</p>
                  <p className="text-2xl font-bold">200,000 FCFA</p>
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="flex items-center gap-4">
                <div className="avatar placeholder">
                  <div className="bg-primary/10 text-primary rounded-full w-12 flex items-center justify-center">
                    <Wallet size={24} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-base-content/60">Taux de recouvrement</p>
                  <p className="text-2xl font-bold">93.3%</p>
                </div>
              </div>
            </Card>
          </div>
          
          {/* Liste des paiements */}
          <Card title="Liste des paiements">
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Référence</th>
                    <th>Locataire</th>
                    <th>Lot</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Montant</th>
                    <th>Mode</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paiements.map((paiement) => (
                    <tr key={paiement.id}>
                      <td>
                        <div className="font-medium">{paiement.reference}</div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Users size={14} />
                          {paiement.locataire}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Home size={14} />
                          {paiement.lot}
                        </div>
                      </td>
                      <td>{new Date(paiement.date).toLocaleDateString()}</td>
                      <td>
                        <span className="badge badge-primary">{paiement.type}</span>
                      </td>
                      <td>{paiement.montant.toLocaleString()} FCFA</td>
                      <td>
                        <span className="badge badge-secondary">{paiement.modePaiement}</span>
                      </td>
                      <td>
                        <span className={`badge ${
                          paiement.statut === 'Validé' ? 'badge-success' : 
                          paiement.statut === 'En attente' ? 'badge-warning' : 
                          'badge-error'
                        }`}>
                          {paiement.statut}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye size={16} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setFormType('paiement');
                              setPaiementForm({
                                reference: paiement.reference,
                                locataire: paiement.locataire,
                                lot: paiement.lot,
                                date: paiement.date,
                                type: paiement.type,
                                montant: paiement.montant,
                                modePaiement: paiement.modePaiement,
                                statut: paiement.statut,
                                fichier: null
                              });
                              setShowForm(true);
                            }}
                          >
                            <Edit3 size={16} />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-error">
                            <Trash2 size={16} />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Download size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'depenses' && (
        <div className="space-y-6">
          {/* Résumé des dépenses */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <div className="flex items-center gap-4">
                <div className="avatar placeholder">
                  <div className="bg-error/10 text-error rounded-full w-12 flex items-center justify-center">
                    <TrendingDown size={24} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-base-content/60">Total dépensé</p>
                  <p className="text-2xl font-bold">155,000 FCFA</p>
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="flex items-center gap-4">
                <div className="avatar placeholder">
                  <div className="bg-warning/10 text-warning rounded-full w-12 flex items-center justify-center">
                    <TrendingUp size={24} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-base-content/60">En attente</p>
                  <p className="text-2xl font-bold">30,000 FCFA</p>
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="flex items-center gap-4">
                <div className="avatar placeholder">
                  <div className="bg-primary/10 text-primary rounded-full w-12 flex items-center justify-center">
                    <Wallet size={24} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-base-content/60">Type principal</p>
                  <p className="text-2xl font-bold">Électricité</p>
                </div>
              </div>
            </Card>
          </div>
          
          {/* Liste des dépenses */}
          <Card title="Liste des dépenses">
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Référence</th>
                    <th>Fournisseur</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Montant</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {depenses.map((depense) => (
                    <tr key={depense.id}>
                      <td>
                        <div className="font-medium">{depense.reference}</div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Users size={14} />
                          {depense.fournisseur}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-secondary">{depense.type}</span>
                      </td>
                      <td>{new Date(depense.date).toLocaleDateString()}</td>
                      <td>{depense.montant.toLocaleString()} FCFA</td>
                      <td>
                        <span className={`badge ${
                          depense.statut === 'Payé' ? 'badge-success' : 
                          depense.statut === 'En attente' ? 'badge-warning' : 
                          'badge-error'
                        }`}>
                          {depense.statut}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye size={16} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setFormType('depense');
                              setDepenseForm({
                                reference: depense.reference,
                                fournisseur: depense.fournisseur,
                                type: depense.type,
                                date: depense.date,
                                montant: depense.montant,
                                statut: depense.statut,
                                fichier: null
                              });
                              setShowForm(true);
                            }}
                          >
                            <Edit3 size={16} />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-error">
                            <Trash2 size={16} />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Download size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'rapports' && (
        <div className="space-y-6">
          {/* Filtres pour les rapports */}
          <Card title="Filtres de rapport">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Période de début</label>
                <input type="date" className="w-full p-3 border border-base-200 rounded-lg bg-base-100" />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Période de fin</label>
                <input type="date" className="w-full p-3 border border-base-200 rounded-lg bg-base-100" />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Type de rapport</label>
                <select className="w-full p-3 border border-base-200 rounded-lg bg-base-100">
                  <option value="mensuel">Mensuel</option>
                  <option value="trimestriel">Trimestriel</option>
                  <option value="annuel">Annuel</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <Button variant="primary" className="w-full">
                  Générer le rapport
                </Button>
              </div>
            </div>
          </Card>
          
          {/* Graphiques */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Évolution des revenus">
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 size={48} className="mx-auto text-primary mb-2" />
                  <p className="text-base-content/60">Graphique des revenus</p>
                </div>
              </div>
            </Card>
            
            <Card title="Répartition des dépenses">
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <PieChart size={48} className="mx-auto text-primary mb-2" />
                  <p className="text-base-content/60">Graphique des dépenses</p>
                </div>
              </div>
            </Card>
          </div>
          
          {/* Résumé financier */}
          <Card title="Résumé financier">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-success">2,800,000</p>
                <p className="text-sm text-base-content/60">Revenus</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-error">155,000</p>
                <p className="text-sm text-base-content/60">Dépenses</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">2,645,000</p>
                <p className="text-sm text-base-content/60">Bénéfice net</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-warning">93.3%</p>
                <p className="text-sm text-base-content/60">Taux de recouvrement</p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Finances;