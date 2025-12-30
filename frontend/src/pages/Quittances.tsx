// frontend/src/pages/Quittances.tsx
import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Download, 
  Eye, 
  Trash2,
  Users,
  Home,
  Filter,
  RefreshCw,
  CheckCircle,
  Clock
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';

const Quittances: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'liste' | 'generer'>('liste');
  const [showForm, setShowForm] = useState(false);

  // Données de démonstration
  const [quittances] = useState([
    {
      id: 1,
      numero: 'QUI-2025-001',
      locataire: 'KOFFI Jean',
      bien: 'Résidence La Paix - Apt A01',
      periode: 'Janvier 2025',
      montant: 150000,
      dateEmission: '2025-01-05',
      statut: 'Payé',
      datePaiement: '2025-01-10'
    },
    {
      id: 2,
      numero: 'QUI-2025-002',
      locataire: 'DOSSOU Marie',
      bien: 'Immeuble Le Destin - Apt B02',
      periode: 'Janvier 2025',
      montant: 80000,
      dateEmission: '2025-01-05',
      statut: 'Payé',
      datePaiement: '2025-01-08'
    },
    {
      id: 3,
      numero: 'QUI-2025-003',
      locataire: 'AGBO Paul',
      bien: 'Villa Les Cocotiers',
      periode: 'Janvier 2025',
      montant: 200000,
      dateEmission: '2025-01-05',
      statut: 'En attente',
      datePaiement: null
    }
  ]);

  const [formData, setFormData] = useState({
    locataire: '',
    bien: '',
    periode: '',
    montant: 0,
    dateEmission: new Date().toISOString().split('T')[0]
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-base-content">Quittances de Loyer</h1>
          <p className="text-base-content/70">Gestion et génération des reçus de paiement</p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" className="flex items-center gap-2">
            <RefreshCw size={18} />
            Actualiser
          </Button>
          <Button 
            variant="primary" 
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2"
          >
            <Plus size={18} />
            Nouvelle quittance
          </Button>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="flex border-b border-base-200">
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'liste'
              ? 'text-primary border-b-2 border-primary'
              : 'text-base-content/60 hover:text-base-content'
          }`}
          onClick={() => setActiveTab('liste')}
        >
          <div className="flex items-center gap-2">
            <FileText size={18} />
            Liste des quittances
          </div>
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'generer'
              ? 'text-primary border-b-2 border-primary'
              : 'text-base-content/60 hover:text-base-content'
          }`}
          onClick={() => setActiveTab('generer')}
        >
          <div className="flex items-center gap-2">
            <Plus size={18} />
            Générer une quittance
          </div>
        </button>
      </div>

      {/* Formulaire de génération */}
      {(showForm || activeTab === 'generer') && (
        <Card title="Générer une nouvelle quittance">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Locataire</label>
              <select 
                className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                value={formData.locataire}
                onChange={(e) => setFormData({...formData, locataire: e.target.value})}
              >
                <option value="">Sélectionner un locataire</option>
                <option value="1">KOFFI Jean</option>
                <option value="2">DOSSOU Marie</option>
                <option value="3">AGBO Paul</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Bien</label>
              <select 
                className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                value={formData.bien}
                onChange={(e) => setFormData({...formData, bien: e.target.value})}
              >
                <option value="">Sélectionner un bien</option>
                <option value="1">Résidence La Paix - Apt A01</option>
                <option value="2">Immeuble Le Destin - Apt B02</option>
                <option value="3">Villa Les Cocotiers</option>
              </select>
            </div>

            <div>
              <Input 
                label="Période" 
                type="month"
                value={formData.periode}
                onChange={(e) => setFormData({...formData, periode: e.target.value})}
              />
            </div>

            <div>
              <Input 
                label="Montant (FCFA)" 
                type="number"
                value={formData.montant}
                onChange={(e) => setFormData({...formData, montant: parseFloat(e.target.value) || 0})}
              />
            </div>

            <div>
              <Input 
                label="Date d'émission" 
                type="date"
                value={formData.dateEmission}
                onChange={(e) => setFormData({...formData, dateEmission: e.target.value})}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button 
              variant="ghost" 
              onClick={() => setShowForm(false)}
            >
              Annuler
            </Button>
            <Button 
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Eye size={18} />
              Prévisualiser
            </Button>
            <Button 
              variant="primary"
              className="flex items-center gap-2"
            >
              <Download size={18} />
              Générer PDF
            </Button>
          </div>
        </Card>
      )}

      {/* Liste des quittances */}
      {activeTab === 'liste' && (
        <div className="space-y-6">
          {/* Filtres */}
          <Card>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Locataire</label>
                <select className="w-full p-3 border border-base-200 rounded-lg bg-base-100">
                  <option value="">Tous les locataires</option>
                  <option value="1">KOFFI Jean</option>
                  <option value="2">DOSSOU Marie</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Bien</label>
                <select className="w-full p-3 border border-base-200 rounded-lg bg-base-100">
                  <option value="">Tous les biens</option>
                  <option value="1">Résidence La Paix</option>
                  <option value="2">Immeuble Le Destin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Période</label>
                <input 
                  type="month" 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                />
              </div>

              <div className="flex items-end">
                <Button variant="primary" className="w-full flex items-center justify-center gap-2">
                  <Filter size={18} />
                  Filtrer
                </Button>
              </div>
            </div>
          </Card>

          {/* Statistiques rapides */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <div className="flex items-center gap-4">
                <div className="avatar placeholder">
                  <div className="bg-primary/10 text-primary rounded-full w-12 flex items-center justify-center">
                    <FileText size={24} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-base-content/60">Total quittances</p>
                  <p className="text-2xl font-bold">{quittances.length}</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-4">
                <div className="avatar placeholder">
                  <div className="bg-success/10 text-success rounded-full w-12 flex items-center justify-center">
                    <CheckCircle size={24} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-base-content/60">Payées</p>
                  <p className="text-2xl font-bold">{quittances.filter(q => q.statut === 'Payé').length}</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-4">
                <div className="avatar placeholder">
                  <div className="bg-warning/10 text-warning rounded-full w-12 flex items-center justify-center">
                    <Clock size={24} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-base-content/60">En attente</p>
                  <p className="text-2xl font-bold">{quittances.filter(q => q.statut === 'En attente').length}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Table des quittances */}
          <Card title="Liste des quittances émises">
            {quittances.length === 0 ? (
              <div className="text-center py-12">
                <FileText size={48} className="mx-auto text-base-content/30 mb-4" />
                <p className="text-base-content/60 mb-4">Aucune quittance pour le moment</p>
                <Button 
                  variant="primary"
                  onClick={() => setShowForm(true)}
                  className="flex items-center gap-2 mx-auto"
                >
                  <Plus size={18} />
                  Générer ma première quittance
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead>
                    <tr>
                      <th>Numéro</th>
                      <th>Locataire</th>
                      <th>Bien</th>
                      <th>Période</th>
                      <th>Montant</th>
                      <th>Date émission</th>
                      <th>Statut</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quittances.map((quittance) => (
                      <tr key={quittance.id}>
                        <td>
                          <div className="font-medium">{quittance.numero}</div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Users size={16} className="text-base-content/60" />
                            {quittance.locataire}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Home size={16} className="text-base-content/60" />
                            {quittance.bien}
                          </div>
                        </td>
                        <td>{quittance.periode}</td>
                        <td>
                          <div className="font-medium">{quittance.montant.toLocaleString()} FCFA</div>
                        </td>
                        <td>{new Date(quittance.dateEmission).toLocaleDateString()}</td>
                        <td>
                          <span className={`badge ${
                            quittance.statut === 'Payé' ? 'badge-success' : 'badge-warning'
                          }`}>
                            {quittance.statut}
                          </span>
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye size={16} />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Download size={16} />
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
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default Quittances;
