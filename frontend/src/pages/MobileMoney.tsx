// frontend/src/pages/MobileMoney.tsx
import React, { useState } from 'react';
import { 
  CreditCard, 
  Plus, 
  Edit3, 
  Eye, 
  Trash2, 
  Calendar, 
  Users,
  Wallet,
  FileText,
  CheckCircle,
  XCircle,
  Settings,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Alert from '../components/ui/Alert';

const MobileMoney: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'transactions' | 'configurations' | 'rapports'>('transactions');
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'transaction' | 'configuration'>('transaction');

  // Données de démonstration
  const [transactions] = useState([
    {
      id: 1,
      reference: 'MM-2025-001',
      type: 'Réception',
      expediteur: '+229 97 00 00 00',
      destinataire: 'Hope Gestion',
      montant: 150000,
      frais: 1500,
      statut: 'Validé',
      date: '2025-01-15',
      description: 'Paiement loyer - KOFFI Jean - Lot A01',
      operateur: 'Moov Money'
    },
    {
      id: 2,
      reference: 'MM-2025-002',
      type: 'Réception',
      expediteur: '+229 96 00 00 00',
      destinataire: 'Hope Gestion',
      montant: 80000,
      frais: 800,
      statut: 'Validé',
      date: '2025-01-16',
      description: 'Paiement loyer - DOSSOU Marie - Lot A02',
      operateur: 'MTN Money'
    },
    {
      id: 3,
      reference: 'MM-2025-003',
      type: 'Envoi',
      expediteur: 'Hope Gestion',
      destinataire: '+229 97 12 34 56',
      montant: 50000,
      frais: 500,
      statut: 'En attente',
      date: '2025-01-17',
      description: 'Paiement fournisseur - SARL Plomberie Expert',
      operateur: 'Moov Money'
    }
  ]);

  const [configurations] = useState([
    {
      id: 1,
      nom: 'Compte Moov Money',
      operateur: 'Moov Money',
      numero: '+229 97 00 00 00',
      statut: 'Actif',
      seuil: 500000,
      frais: 1
    },
    {
      id: 2,
      nom: 'Compte MTN Money',
      operateur: 'MTN Money',
      numero: '+229 96 00 00 00',
      statut: 'Actif',
      seuil: 500000,
      frais: 1
    },
    {
      id: 3,
      nom: 'Compte MTN ONATEL',
      operateur: 'MTN ONATEL',
      numero: '+229 95 00 00 00',
      statut: 'Inactif',
      seuil: 500000,
      frais: 1
    }
  ]);

  const [transactionForm, setTransactionForm] = useState({
    reference: '',
    type: 'Réception',
    expediteur: '',
    destinataire: '',
    montant: 0,
    frais: 0,
    operateur: 'Moov Money',
    description: ''
  });

  const [configurationForm, setConfigurationForm] = useState({
    nom: '',
    operateur: 'Moov Money',
    numero: '',
    statut: 'Actif',
    seuil: 500000,
    frais: 1
  });

  // Données pour les graphiques
  const transactionsData = [
    { mois: 'Jan', reception: 1200000, envoi: 300000 },
    { mois: 'Fév', reception: 1500000, envoi: 250000 },
    { mois: 'Mar', reception: 1300000, envoi: 350000 },
    { mois: 'Avr', reception: 1600000, envoi: 280000 },
    { mois: 'Mai', reception: 1400000, envoi: 320000 },
    { mois: 'Jun', reception: 1700000, envoi: 310000 }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-base-content">Mobile Money</h1>
          <p className="text-base-content/70">Gestion des transactions et configurations</p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => {
            setFormType(activeTab === 'transactions' ? 'transaction' : 'configuration');
            setShowForm(true);
          }}
        >
          <Plus size={18} className="mr-2" />
          {activeTab === 'transactions' ? 'Nouvelle transaction' : 'Nouvelle configuration'}
        </Button>
      </div>

      {/* Navigation par onglets */}
      <div className="flex border-b border-base-200">
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'transactions'
              ? 'text-primary border-b-2 border-primary'
              : 'text-base-content/60 hover:text-base-content'
          }`}
          onClick={() => setActiveTab('transactions')}
        >
          <div className="flex items-center gap-2">
            <CreditCard size={18} />
            Transactions
          </div>
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'configurations'
              ? 'text-primary border-b-2 border-primary'
              : 'text-base-content/60 hover:text-base-content'
          }`}
          onClick={() => setActiveTab('configurations')}
        >
          <div className="flex items-center gap-2">
            <Settings size={18} />
            Configurations
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
            <FileText size={18} />
            Rapports
          </div>
        </button>
      </div>

      {/* Formulaire pour ajouter/modifier */}
      {showForm && (
        <Card title={
          formType === 'transaction' ? 'Création / Modification d\'une transaction' : 'Création / Modification d\'une configuration'
        }>
          {formType === 'transaction' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Input 
                  label="Référence de la transaction" 
                  placeholder="Ex: MM-2025-001" 
                  value={transactionForm.reference}
                  onChange={(e) => setTransactionForm({...transactionForm, reference: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Type de transaction</label>
                <select 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                  value={transactionForm.type}
                  onChange={(e) => setTransactionForm({...transactionForm, type: e.target.value})}
                >
                  <option value="Réception">Réception</option>
                  <option value="Envoi">Envoi</option>
                </select>
              </div>
              
              <div>
                <Input 
                  label="Numéro expéditeur" 
                  placeholder="Entrez le numéro expéditeur" 
                  value={transactionForm.expediteur}
                  onChange={(e) => setTransactionForm({...transactionForm, expediteur: e.target.value})}
                />
              </div>
              
              <div>
                <Input 
                  label="Numéro destinataire" 
                  placeholder="Entrez le numéro destinataire" 
                  value={transactionForm.destinataire}
                  onChange={(e) => setTransactionForm({...transactionForm, destinataire: e.target.value})}
                />
              </div>
              
              <div>
                <Input 
                  label="Montant (FCFA)" 
                  type="number"
                  placeholder="Entrez le montant" 
                  value={transactionForm.montant}
                  onChange={(e) => setTransactionForm({...transactionForm, montant: parseFloat(e.target.value) || 0})}
                />
              </div>
              
              <div>
                <Input 
                  label="Frais (FCFA)" 
                  type="number"
                  placeholder="Entrez les frais" 
                  value={transactionForm.frais}
                  onChange={(e) => setTransactionForm({...transactionForm, frais: parseFloat(e.target.value) || 0})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Opérateur</label>
                <select 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                  value={transactionForm.operateur}
                  onChange={(e) => setTransactionForm({...transactionForm, operateur: e.target.value})}
                >
                  <option value="Moov Money">Moov Money</option>
                  <option value="MTN Money">MTN Money</option>
                  <option value="MTN ONATEL">MTN ONATEL</option>
                </select>
              </div>
              
              <div className="md:col-span-2">
                <Input 
                  label="Description" 
                  placeholder="Décrivez la transaction"
                  value={transactionForm.description}
                  onChange={(e) => setTransactionForm({...transactionForm, description: e.target.value})}
                  className="h-24"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Input 
                  label="Nom de la configuration" 
                  placeholder="Entrez le nom de la configuration" 
                  value={configurationForm.nom}
                  onChange={(e) => setConfigurationForm({...configurationForm, nom: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Opérateur</label>
                <select 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                  value={configurationForm.operateur}
                  onChange={(e) => setConfigurationForm({...configurationForm, operateur: e.target.value})}
                >
                  <option value="Moov Money">Moov Money</option>
                  <option value="MTN Money">MTN Money</option>
                  <option value="MTN ONATEL">MTN ONATEL</option>
                </select>
              </div>
              
              <div>
                <Input 
                  label="Numéro de compte" 
                  placeholder="Entrez le numéro de compte" 
                  value={configurationForm.numero}
                  onChange={(e) => setConfigurationForm({...configurationForm, numero: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Statut</label>
                <select 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                  value={configurationForm.statut}
                  onChange={(e) => setConfigurationForm({...configurationForm, statut: e.target.value})}
                >
                  <option value="Actif">Actif</option>
                  <option value="Inactif">Inactif</option>
                </select>
              </div>
              
              <div>
                <Input 
                  label="Seuil de notification (FCFA)" 
                  type="number"
                  placeholder="Entrez le seuil" 
                  value={configurationForm.seuil}
                  onChange={(e) => setConfigurationForm({...configurationForm, seuil: parseFloat(e.target.value) || 500000})}
                />
              </div>
              
              <div>
                <Input 
                  label="Frais de transaction (%)" 
                  type="number"
                  placeholder="Entrez les frais" 
                  value={configurationForm.frais}
                  onChange={(e) => setConfigurationForm({...configurationForm, frais: parseFloat(e.target.value) || 1})}
                />
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
              {formType === 'transaction' ? 'Enregistrer la transaction' : 'Enregistrer la configuration'}
            </Button>
          </div>
        </Card>
      )}

      {/* Contenu des onglets */}
      {activeTab === 'transactions' && (
        <div className="space-y-6">
          {/* Résumé des transactions */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <div className="flex items-center gap-4">
                <div className="avatar placeholder">
                  <div className="bg-success/10 text-success rounded-full w-12">
                    <TrendingUp size={24} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-base-content/60">Total reçu</p>
                  <p className="text-2xl font-bold">2,300,000 FCFA</p>
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="flex items-center gap-4">
                <div className="avatar placeholder">
                  <div className="bg-error/10 text-error rounded-full w-12">
                    <TrendingDown size={24} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-base-content/60">Total envoyé</p>
                  <p className="text-2xl font-bold">500,000 FCFA</p>
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="flex items-center gap-4">
                <div className="avatar placeholder">
                  <div className="bg-primary/10 text-primary rounded-full w-12">
                    <CreditCard size={24} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-base-content/60">Transactions</p>
                  <p className="text-2xl font-bold">3</p>
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="flex items-center gap-4">
                <div className="avatar placeholder">
                  <div className="bg-info/10 text-info rounded-full w-12">
                    <CheckCircle size={24} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-base-content/60">Validées</p>
                  <p className="text-2xl font-bold">2</p>
                </div>
              </div>
            </Card>
          </div>
          
          {/* Liste des transactions */}
          <Card title="Liste des transactions">
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Référence</th>
                    <th>Type</th>
                    <th>Montant</th>
                    <th>Opérateur</th>
                    <th>Date</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>
                        <div className="font-medium">{transaction.reference}</div>
                        <div className="text-sm text-base-content/60">{transaction.description}</div>
                      </td>
                      <td>
                        <span className={`badge ${transaction.type === 'Réception' ? 'badge-success' : 'badge-error'}`}>
                          {transaction.type}
                        </span>
                      </td>
                      <td>
                        <div className="font-medium">{transaction.montant.toLocaleString()} FCFA</div>
                        <div className="text-sm text-base-content/60">Frais: {transaction.frais.toLocaleString()} FCFA</div>
                      </td>
                      <td>
                        <span className="badge badge-primary">{transaction.operateur}</span>
                      </td>
                      <td>{new Date(transaction.date).toLocaleDateString()}</td>
                      <td>
                        <span className={`badge ${
                          transaction.statut === 'Validé' ? 'badge-success' : 
                          transaction.statut === 'En attente' ? 'badge-warning' : 
                          'badge-error'
                        }`}>
                          {transaction.statut}
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
                              setFormType('transaction');
                              setTransactionForm({
                                reference: transaction.reference,
                                type: transaction.type,
                                expediteur: transaction.expediteur,
                                destinataire: transaction.destinataire,
                                montant: transaction.montant,
                                frais: transaction.frais,
                                operateur: transaction.operateur,
                                description: transaction.description
                              });
                              setShowForm(true);
                            }}
                          >
                            <Edit3 size={16} />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-error">
                            <Trash2 size={16} />
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

      {activeTab === 'configurations' && (
        <div className="space-y-6">
          {/* Résumé des configurations */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <div className="flex items-center gap-4">
                <div className="avatar placeholder">
                  <div className="bg-primary/10 text-primary rounded-full w-12">
                    <CreditCard size={24} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-base-content/60">Total configurations</p>
                  <p className="text-2xl font-bold">3</p>
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="flex items-center gap-4">
                <div className="avatar placeholder">
                  <div className="bg-success/10 text-success rounded-full w-12">
                    <CheckCircle size={24} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-base-content/60">Actives</p>
                  <p className="text-2xl font-bold">2</p>
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="flex items-center gap-4">
                <div className="avatar placeholder">
                  <div className="bg-error/10 text-error rounded-full w-12">
                    <XCircle size={24} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-base-content/60">Inactives</p>
                  <p className="text-2xl font-bold">1</p>
                </div>
              </div>
            </Card>
          </div>
          
          {/* Liste des configurations */}
          <Card title="Liste des configurations">
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Opérateur</th>
                    <th>Numéro</th>
                    <th>Statut</th>
                    <th>Seuil</th>
                    <th>Frais</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {configurations.map((config) => (
                    <tr key={config.id}>
                      <td>
                        <div className="font-medium">{config.nom}</div>
                      </td>
                      <td>
                        <span className="badge badge-secondary">{config.operateur}</span>
                      </td>
                      <td>
                        <div className="font-mono">{config.numero}</div>
                      </td>
                      <td>
                        <span className={`badge ${config.statut === 'Actif' ? 'badge-success' : 'badge-warning'}`}>
                          {config.statut}
                        </span>
                      </td>
                      <td>{config.seuil.toLocaleString()} FCFA</td>
                      <td>{config.frais}%</td>
                      <td>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setFormType('configuration');
                              setConfigurationForm({
                                nom: config.nom,
                                operateur: config.operateur,
                                numero: config.numero,
                                statut: config.statut,
                                seuil: config.seuil,
                                frais: config.frais
                              });
                              setShowForm(true);
                            }}
                          >
                            <Edit3 size={16} />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-error">
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          
          {/* Configuration des API */}
          <Card title="Configuration des API Mobile Money">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 border rounded-lg">
                <div className="avatar placeholder">
                  <div className="bg-success/10 text-success rounded-full w-16 mx-auto mb-3">
                    <span className="text-xl">M</span>
                  </div>
                </div>
                <h3 className="font-semibold">Moov Money</h3>
                <p className="text-sm text-base-content/60 mb-2">API Configuration</p>
                <div className="form-control">
                  <label className="label cursor-pointer justify-start gap-2">
                    <input type="checkbox" className="toggle" defaultChecked />
                    <span className="label-text">Activé</span>
                  </label>
                </div>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <div className="avatar placeholder">
                  <div className="bg-primary/10 text-primary rounded-full w-16 mx-auto mb-3">
                    <span className="text-xl">M</span>
                  </div>
                </div>
                <h3 className="font-semibold">MTN Money</h3>
                <p className="text-sm text-base-content/60 mb-2">API Configuration</p>
                <div className="form-control">
                  <label className="label cursor-pointer justify-start gap-2">
                    <input type="checkbox" className="toggle" defaultChecked />
                    <span className="label-text">Activé</span>
                  </label>
                </div>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <div className="avatar placeholder">
                  <div className="bg-warning/10 text-warning rounded-full w-16 mx-auto mb-3">
                    <span className="text-xl">O</span>
                  </div>
                </div>
                <h3 className="font-semibold">MTN ONATEL</h3>
                <p className="text-sm text-base-content/60 mb-2">API Configuration</p>
                <div className="form-control">
                  <label className="label cursor-pointer justify-start gap-2">
                    <input type="checkbox" className="toggle" />
                    <span className="label-text">Activé</span>
                  </label>
                </div>
              </div>
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
                <label className="block text-sm font-medium mb-2">Opérateur</label>
                <select className="w-full p-3 border border-base-200 rounded-lg bg-base-100">
                  <option value="tous">Tous les opérateurs</option>
                  <option value="Moov Money">Moov Money</option>
                  <option value="MTN Money">MTN Money</option>
                  <option value="MTN ONATEL">MTN ONATEL</option>
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
            <Card title="Évolution des transactions">
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <TrendingUp size={48} className="mx-auto text-primary mb-2" />
                  <p className="text-base-content/60">Graphique des transactions</p>
                </div>
              </div>
            </Card>
            
            <Card title="Répartition par opérateur">
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <Wallet size={48} className="mx-auto text-primary mb-2" />
                  <p className="text-base-content/60">Graphique par opérateur</p>
                </div>
              </div>
            </Card>
          </div>
          
          {/* Résumé financier */}
          <Card title="Résumé des transactions">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-success">2,300,000</p>
                <p className="text-sm text-base-content/60">Reçus</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-error">500,000</p>
                <p className="text-sm text-base-content/60">Envoyés</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">1,800,000</p>
                <p className="text-sm text-base-content/60">Solde net</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-info">18,000</p>
                <p className="text-sm text-base-content/60">Frais totaux</p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default MobileMoney;