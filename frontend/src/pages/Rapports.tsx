// frontend/src/pages/Rapports.tsx
import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  Users,
  Home,
  Wallet,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Table,
  Filter,
  Eye,
  Settings,
  Edit3,
  Trash2
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Alert from '../components/ui/Alert';

const Rapports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'rapports' | 'modeles' | 'programmes'>('rapports');
  const [selectedPeriod, setSelectedPeriod] = useState<'jour' | 'semaine' | 'mois' | 'trimestre' | 'annee'>('mois');

  // Données de démonstration pour les rapports
  const [rapportsDisponibles] = useState([
    {
      id: 1,
      nom: 'Rapport des loyers',
      description: 'Recouvrement des loyers par période',
      type: 'Financier',
      dateDerniereGeneration: '2025-01-15',
      statut: 'Mis à jour'
    },
    {
      id: 2,
      nom: 'Rapport des occupants',
      description: 'Taux d\'occupation des lots',
      type: 'Occupation',
      dateDerniereGeneration: '2025-01-15',
      statut: 'Mis à jour'
    },
    {
      id: 3,
      nom: 'Rapport des dépenses',
      description: 'Dépenses par catégorie',
      type: 'Financier',
      dateDerniereGeneration: '2025-01-15',
      statut: 'Mis à jour'
    },
    {
      id: 4,
      nom: 'Rapport des interventions',
      description: 'Interventions par fournisseur',
      type: 'Intervention',
      dateDerniereGeneration: '2025-01-15',
      statut: 'Mis à jour'
    },
    {
      id: 5,
      nom: 'Rapport des contrats',
      description: 'Contrats expirant dans les 30 jours',
      type: 'Contrat',
      dateDerniereGeneration: '2025-01-15',
      statut: 'Mis à jour'
    },
    {
      id: 6,
      nom: 'Rapport des propriétaires',
      description: 'Liste des propriétaires et leurs biens',
      type: 'Propriétaire',
      dateDerniereGeneration: '2025-01-15',
      statut: 'Mis à jour'
    }
  ]);

  // Données pour les graphiques
  const loyerData = [
    { mois: 'Jan', montant: 1200000 },
    { mois: 'Fév', montant: 1500000 },
    { mois: 'Mar', montant: 1300000 },
    { mois: 'Avr', montant: 1600000 },
    { mois: 'Mai', montant: 1400000 },
    { mois: 'Jun', montant: 1700000 }
  ];

  const occupationData = [
    { lot: 'A01', occupation: 95 },
    { lot: 'A02', occupation: 85 },
    { lot: 'B01', occupation: 100 },
    { lot: 'B02', occupation: 70 },
    { lot: 'C01', occupation: 100 }
  ];

  const depensesData = [
    { categorie: 'Électricité', montant: 300000 },
    { categorie: 'Eau', montant: 150000 },
    { categorie: 'Plomberie', montant: 250000 },
    { categorie: 'Nettoyage', montant: 100000 },
    { categorie: 'Sécurité', montant: 200000 }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-base-content">Rapports et Analyses</h1>
          <p className="text-base-content/70">Génération et consultation des rapports</p>
        </div>
        <Button variant="primary">
          <Download size={18} className="mr-2" />
          Exporter tous les rapports
        </Button>
      </div>

      {/* Navigation par onglets */}
      <div className="flex border-b border-base-200">
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
            Rapports disponibles
          </div>
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'modeles'
              ? 'text-primary border-b-2 border-primary'
              : 'text-base-content/60 hover:text-base-content'
          }`}
          onClick={() => setActiveTab('modeles')}
        >
          <div className="flex items-center gap-2">
            <Table size={18} />
            Modèles de rapports
          </div>
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'programmes'
              ? 'text-primary border-b-2 border-primary'
              : 'text-base-content/60 hover:text-base-content'
          }`}
          onClick={() => setActiveTab('programmes')}
        >
          <div className="flex items-center gap-2">
            <Settings size={18} />
            Programmes de génération
          </div>
        </button>
      </div>

      {/* Contenu des onglets */}
      {activeTab === 'rapports' && (
        <div className="space-y-6">
          {/* Filtres et options */}
          <Card>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex flex-wrap gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Période</label>
                  <select 
                    className="p-2 border border-base-200 rounded-lg bg-base-100"
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value as any)}
                  >
                    <option value="jour">Aujourd'hui</option>
                    <option value="semaine">Cette semaine</option>
                    <option value="mois">Ce mois</option>
                    <option value="trimestre">Ce trimestre</option>
                    <option value="annee">Cette année</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select className="p-2 border border-base-200 rounded-lg bg-base-100">
                    <option value="tous">Tous les types</option>
                    <option value="financier">Financier</option>
                    <option value="occupation">Occupation</option>
                    <option value="intervention">Intervention</option>
                    <option value="contrat">Contrat</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Format</label>
                  <select className="p-2 border border-base-200 rounded-lg bg-base-100">
                    <option value="pdf">PDF</option>
                    <option value="excel">Excel</option>
                    <option value="csv">CSV</option>
                  </select>
                </div>
              </div>
              
              <Button variant="primary">
                <Filter size={18} className="mr-2" />
                Filtrer
              </Button>
            </div>
          </Card>
          
          {/* Graphiques principaux */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Évolution des loyers perçus">
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 size={48} className="mx-auto text-primary mb-2" />
                  <p className="text-base-content/60">Graphique des loyers</p>
                </div>
              </div>
            </Card>
            
            <Card title="Taux d'occupation par lot">
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <PieChart size={48} className="mx-auto text-primary mb-2" />
                  <p className="text-base-content/60">Graphique d'occupation</p>
                </div>
              </div>
            </Card>
          </div>
          
          {/* Liste des rapports disponibles */}
          <Card title="Rapports disponibles">
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Description</th>
                    <th>Type</th>
                    <th>Dernière génération</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rapportsDisponibles.map((rapport) => (
                    <tr key={rapport.id}>
                      <td>
                        <div className="font-medium">{rapport.nom}</div>
                      </td>
                      <td>
                        <div className="text-sm text-base-content/60">{rapport.description}</div>
                      </td>
                      <td>
                        <span className="badge badge-primary">{rapport.type}</span>
                      </td>
                      <td>{new Date(rapport.dateDerniereGeneration).toLocaleDateString()}</td>
                      <td>
                        <span className="badge badge-success">{rapport.statut}</span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye size={16} />
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

      {activeTab === 'modeles' && (
        <div className="space-y-6">
          {/* Modèles de rapports */}
          <Card title="Modèles de rapports prédéfinis">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="avatar placeholder">
                    <div className="bg-primary/10 text-primary rounded-full w-10 flex items-center justify-center">
                      <FileText size={20} />
                    </div>
                  </div>
                  <h3 className="font-semibold">Rapport des loyers</h3>
                </div>
                <p className="text-sm text-base-content/60 mb-4">Détail des loyers perçus par période</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs badge badge-primary">Financier</span>
                  <Button variant="ghost" size="sm">Utiliser</Button>
                </div>
              </Card>
              
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="avatar placeholder">
                    <div className="bg-success/10 text-success rounded-full w-10 flex items-center justify-center">
                      <Home size={20} />
                    </div>
                  </div>
                  <h3 className="font-semibold">Rapport d'occupation</h3>
                </div>
                <p className="text-sm text-base-content/60 mb-4">Taux d'occupation des lots par immeuble</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs badge badge-success">Occupation</span>
                  <Button variant="ghost" size="sm">Utiliser</Button>
                </div>
              </Card>
              
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="avatar placeholder">
                    <div className="bg-warning/10 text-warning rounded-full w-10 flex items-center justify-center">
                      <Wallet size={20} />
                    </div>
                  </div>
                  <h3 className="font-semibold">Rapport des dépenses</h3>
                </div>
                <p className="text-sm text-base-content/60 mb-4">Dépenses par catégorie et fournisseur</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs badge badge-warning">Financier</span>
                  <Button variant="ghost" size="sm">Utiliser</Button>
                </div>
              </Card>
              
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="avatar placeholder">
                    <div className="bg-info/10 text-info rounded-full w-10 flex items-center justify-center">
                      <TrendingUp size={20} />
                    </div>
                  </div>
                  <h3 className="font-semibold">Rapport des interventions</h3>
                </div>
                <p className="text-sm text-base-content/60 mb-4">Interventions par fournisseur et coût</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs badge badge-info">Intervention</span>
                  <Button variant="ghost" size="sm">Utiliser</Button>
                </div>
              </Card>
              
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="avatar placeholder">
                    <div className="bg-error/10 text-error rounded-full w-10 flex items-center justify-center">
                      <Users size={20} />
                    </div>
                  </div>
                  <h3 className="font-semibold">Rapport des locataires</h3>
                </div>
                <p className="text-sm text-base-content/60 mb-4">Statut des locataires et contrats</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs badge badge-error">Locataire</span>
                  <Button variant="ghost" size="sm">Utiliser</Button>
                </div>
              </Card>
              
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="avatar placeholder">
                    <div className="bg-secondary/10 text-secondary rounded-full w-10 flex items-center justify-center">
                      <Settings size={20} />
                    </div>
                  </div>
                  <h3 className="font-semibold">Rapport personnalisé</h3>
                </div>
                <p className="text-sm text-base-content/60 mb-4">Créer un rapport selon vos besoins</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs badge badge-secondary">Personnalisé</span>
                  <Button variant="ghost" size="sm">Créer</Button>
                </div>
              </Card>
            </div>
          </Card>
          
          {/* Création de rapport personnalisé */}
          <Card title="Création de rapport personnalisé">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Input 
                  label="Nom du rapport" 
                  placeholder="Entrez un nom pour votre rapport" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Type de rapport</label>
                <select className="w-full p-3 border border-base-200 rounded-lg bg-base-100">
                  <option value="financier">Financier</option>
                  <option value="occupation">Occupation</option>
                  <option value="intervention">Intervention</option>
                  <option value="contrat">Contrat</option>
                  <option value="locataire">Locataire</option>
                  <option value="proprietaire">Propriétaire</option>
                </select>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Champs à inclure</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="checkbox" defaultChecked />
                    <span>Nom</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="checkbox" defaultChecked />
                    <span>Date</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="checkbox" defaultChecked />
                    <span>Montant</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="checkbox" />
                    <span>Statut</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="checkbox" />
                    <span>Propriétaire</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="checkbox" />
                    <span>Lot</span>
                  </label>
                </div>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Filtres</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Période de début</label>
                    <input type="date" className="w-full p-3 border border-base-200 rounded-lg bg-base-100" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Période de fin</label>
                    <input type="date" className="w-full p-3 border border-base-200 rounded-lg bg-base-100" />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost">Annuler</Button>
              <Button variant="primary">Prévisualiser</Button>
              <Button variant="primary">Générer le rapport</Button>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'programmes' && (
        <div className="space-y-6">
          {/* Programme de génération de rapports */}
          <Card title="Programmes de génération automatique">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Input 
                  label="Nom du programme" 
                  placeholder="Entrez un nom pour le programme" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Rapport à générer</label>
                <select className="w-full p-3 border border-base-200 rounded-lg bg-base-100">
                  <option value="">Sélectionnez un rapport</option>
                  {rapportsDisponibles.map(rapport => (
                    <option key={rapport.id} value={rapport.id}>{rapport.nom}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Fréquence</label>
                <select className="w-full p-3 border border-base-200 rounded-lg bg-base-100">
                  <option value="quotidien">Quotidien</option>
                  <option value="hebdomadaire">Hebdomadaire</option>
                  <option value="mensuel">Mensuel</option>
                  <option value="trimestriel">Trimestriel</option>
                  <option value="annuel">Annuel</option>
                </select>
              </div>
              
              <div>
                <Input 
                  label="Heure d'exécution" 
                  type="time"
                  placeholder="Sélectionnez l'heure" 
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Destinataires</label>
                <select className="w-full p-3 border border-base-200 rounded-lg bg-base-100 mb-2">
                  <option value="">Sélectionnez les destinataires</option>
                  <option value="gestionnaire">Gestionnaire</option>
                  <option value="proprietaire">Propriétaire</option>
                  <option value="comptable">Comptable</option>
                </select>
                <p className="text-sm text-base-content/60">Sélectionnez les utilisateurs qui recevront le rapport automatiquement</p>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Format</label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="checkbox" defaultChecked />
                    <span>PDF</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="checkbox" />
                    <span>Excel</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="checkbox" />
                    <span>Email</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost">Annuler</Button>
              <Button variant="primary">Enregistrer le programme</Button>
            </div>
          </Card>
          
          {/* Liste des programmes */}
          <Card title="Programmes actifs">
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Rapport</th>
                    <th>Fréquence</th>
                    <th>Prochaine exécution</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Rapport mensuel des loyers</td>
                    <td>Rapport des loyers</td>
                    <td>Mensuel</td>
                    <td>2025-02-01</td>
                    <td>
                      <span className="badge badge-success">Actif</span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye size={16} />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit3 size={16} />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-error">
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td>Rapport hebdomadaire des interventions</td>
                    <td>Rapport des interventions</td>
                    <td>Hebdomadaire</td>
                    <td>2025-01-20</td>
                    <td>
                      <span className="badge badge-success">Actif</span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye size={16} />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit3 size={16} />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-error">
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Rapports;
