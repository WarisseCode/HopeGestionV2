// frontend/src/pages/Contrats.tsx
import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Edit3, 
  Eye, 
  Trash2, 
  Calendar, 
  Home,
  Users,
  Wallet,
  Download,
  Upload,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Alert from '../components/ui/Alert';

const Contrats: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'locations' | 'ventes' | 'interventions'>('locations');
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'location' | 'vente' | 'intervention'>('location');

  // Données de démonstration
  const [contratsLocations] = useState([
    {
      id: 1,
      reference: 'LOC-2025-001',
      locataire: 'KOFFI Jean',
      lot: 'A01 - Résidence La Paix',
      dateDebut: '2025-01-01',
      dateFin: '2025-12-31',
      loyer: 150000,
      charges: 20000,
      caution: 150000,
      statut: 'Actif',
      type: 'Location',
      fichier: 'contrat_001.pdf',
      dateSignature: '2024-12-20'
    },
    {
      id: 2,
      reference: 'LOC-2025-002',
      locataire: 'DOSSOU Marie',
      lot: 'A02 - Résidence La Paix',
      dateDebut: '2025-02-01',
      dateFin: '2026-01-31',
      loyer: 80000,
      charges: 10000,
      caution: 80000,
      statut: 'Actif',
      type: 'Location',
      fichier: 'contrat_002.pdf',
      dateSignature: '2024-12-22'
    }
  ]);

  const [contratsVentes] = useState([
    {
      id: 1,
      reference: 'VTE-2025-001',
      acheteur: 'ADJINON Sébastien',
      lot: 'B01 - Immeuble Le Destin',
      dateDebut: '2025-01-15',
      dateFin: '2025-12-15',
      prixVente: 5000000,
      avance: 1000000,
      paiementEcheance: true,
      statut: 'En cours',
      type: 'Vente',
      fichier: 'contrat_vente_001.pdf',
      dateSignature: '2024-12-21'
    }
  ]);

  const [interventions] = useState([
    {
      id: 1,
      reference: 'INT-2025-001',
      proprietaire: 'Jean Koffi',
      bien: 'Résidence La Paix',
      description: 'Réparation de la toiture',
      dateDebut: '2025-01-10',
      dateFin: '2025-01-15',
      cout: 500000,
      statut: 'En cours',
      type: 'Intervention',
      fichier: 'intervention_001.pdf',
      dateSignature: '2024-12-23'
    }
  ]);

  const [contratForm, setContratForm] = useState({
    typeContrat: 'Location',
    reference: '',
    locataire: '',
    lot: '',
    dateDebut: '',
    dateFin: '',
    loyer: 0,
    charges: 0,
    caution: 0,
    prixVente: 0,
    avance: 0,
    paiementEcheance: false,
    description: '',
    cout: 0,
    fichier: null
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-base-content">Gestion des Contrats</h1>
          <p className="text-base-content/70">Locations, ventes et interventions</p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => {
            setFormType(activeTab === 'locations' ? 'location' : activeTab === 'ventes' ? 'vente' : 'intervention');
            setShowForm(true);
          }}
        >
          <Plus size={18} className="mr-2" />
          Ajouter un contrat
        </Button>
      </div>

      {/* Navigation par onglets */}
      <div className="flex border-b border-base-200">
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'locations'
              ? 'text-primary border-b-2 border-primary'
              : 'text-base-content/60 hover:text-base-content'
          }`}
          onClick={() => setActiveTab('locations')}
        >
          <div className="flex items-center gap-2">
            <FileText size={18} />
            Contrats de location
          </div>
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'ventes'
              ? 'text-primary border-b-2 border-primary'
              : 'text-base-content/60 hover:text-base-content'
          }`}
          onClick={() => setActiveTab('ventes')}
        >
          <div className="flex items-center gap-2">
            <Wallet size={18} />
            Contrats de vente
          </div>
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'interventions'
              ? 'text-primary border-b-2 border-primary'
              : 'text-base-content/60 hover:text-base-content'
          }`}
          onClick={() => setActiveTab('interventions')}
        >
          <div className="flex items-center gap-2">
            <Clock size={18} />
            Contrats d'intervention
          </div>
        </button>
      </div>

      {/* Formulaire pour ajouter/modifier */}
      {showForm && (
        <Card title={
          formType === 'location' ? 'Création / Modification d\'un contrat de location' :
          formType === 'vente' ? 'Création / Modification d\'un contrat de vente' :
          'Création / Modification d\'un contrat d\'intervention'
        }>
          {formType === 'location' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Input 
                  label="Référence du contrat" 
                  placeholder="Ex: LOC-2025-001" 
                  value={contratForm.reference}
                  onChange={(e) => setContratForm({...contratForm, reference: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Locataire</label>
                <select 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                  value={contratForm.locataire}
                  onChange={(e) => setContratForm({...contratForm, locataire: e.target.value})}
                >
                  <option value="">Sélectionnez un locataire</option>
                  <option value="KOFFI Jean">KOFFI Jean</option>
                  <option value="DOSSOU Marie">DOSSOU Marie</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Lot concerné</label>
                <select 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                  value={contratForm.lot}
                  onChange={(e) => setContratForm({...contratForm, lot: e.target.value})}
                >
                  <option value="">Sélectionnez un lot</option>
                  <option value="A01 - Résidence La Paix">A01 - Résidence La Paix</option>
                  <option value="A02 - Résidence La Paix">A02 - Résidence La Paix</option>
                </select>
              </div>
              
              <div>
                <Input 
                  label="Date de début" 
                  type="date"
                  value={contratForm.dateDebut}
                  onChange={(e) => setContratForm({...contratForm, dateDebut: e.target.value})}
                />
              </div>
              
              <div>
                <Input 
                  label="Date de fin" 
                  type="date"
                  value={contratForm.dateFin}
                  onChange={(e) => setContratForm({...contratForm, dateFin: e.target.value})}
                />
              </div>
              
              <div>
                <Input 
                  label="Loyer mensuel (FCFA)" 
                  type="number"
                  placeholder="Entrez le loyer mensuel" 
                  value={contratForm.loyer}
                  onChange={(e) => setContratForm({...contratForm, loyer: parseFloat(e.target.value) || 0})}
                />
              </div>
              
              <div>
                <Input 
                  label="Charges mensuelles (FCFA)" 
                  type="number"
                  placeholder="Entrez les charges mensuelles" 
                  value={contratForm.charges}
                  onChange={(e) => setContratForm({...contratForm, charges: parseFloat(e.target.value) || 0})}
                />
              </div>
              
              <div>
                <Input 
                  label="Caution / Acompte (FCFA)" 
                  type="number"
                  placeholder="Entrez le montant de la caution" 
                  value={contratForm.caution}
                  onChange={(e) => setContratForm({...contratForm, caution: parseFloat(e.target.value) || 0})}
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Téléversement du contrat</label>
                <div className="flex items-center gap-4">
                  <div className="avatar placeholder">
                    <div className="bg-neutral text-neutral-content rounded-full w-16">
                      <span className="text-xs">PDF</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Upload size={16} className="mr-2" />
                    Télécharger
                  </Button>
                </div>
              </div>
            </div>
          ) : formType === 'vente' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Input 
                  label="Référence du contrat" 
                  placeholder="Ex: VTE-2025-001" 
                  value={contratForm.reference}
                  onChange={(e) => setContratForm({...contratForm, reference: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Acheteur</label>
                <select 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                  value={contratForm.locataire}
                  onChange={(e) => setContratForm({...contratForm, locataire: e.target.value})}
                >
                  <option value="">Sélectionnez un acheteur</option>
                  <option value="ADJINON Sébastien">ADJINON Sébastien</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Lot concerné</label>
                <select 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                  value={contratForm.lot}
                  onChange={(e) => setContratForm({...contratForm, lot: e.target.value})}
                >
                  <option value="">Sélectionnez un lot</option>
                  <option value="B01 - Immeuble Le Destin">B01 - Immeuble Le Destin</option>
                </select>
              </div>
              
              <div>
                <Input 
                  label="Date de début" 
                  type="date"
                  value={contratForm.dateDebut}
                  onChange={(e) => setContratForm({...contratForm, dateDebut: e.target.value})}
                />
              </div>
              
              <div>
                <Input 
                  label="Date de fin" 
                  type="date"
                  value={contratForm.dateFin}
                  onChange={(e) => setContratForm({...contratForm, dateFin: e.target.value})}
                />
              </div>
              
              <div>
                <Input 
                  label="Prix de vente (FCFA)" 
                  type="number"
                  placeholder="Entrez le prix de vente" 
                  value={contratForm.prixVente}
                  onChange={(e) => setContratForm({...contratForm, prixVente: parseFloat(e.target.value) || 0})}
                />
              </div>
              
              <div>
                <Input 
                  label="Avance (FCFA)" 
                  type="number"
                  placeholder="Entrez le montant de l'avance" 
                  value={contratForm.avance}
                  onChange={(e) => setContratForm({...contratForm, avance: parseFloat(e.target.value) || 0})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Paiement échelonné</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    className="toggle"
                    checked={contratForm.paiementEcheance}
                    onChange={(e) => setContratForm({...contratForm, paiementEcheance: e.target.checked})}
                  />
                  <span>Oui</span>
                </div>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Téléversement du contrat</label>
                <div className="flex items-center gap-4">
                  <div className="avatar placeholder">
                    <div className="bg-neutral text-neutral-content rounded-full w-16">
                      <span className="text-xs">PDF</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Upload size={16} className="mr-2" />
                    Télécharger
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Input 
                  label="Référence du contrat" 
                  placeholder="Ex: INT-2025-001" 
                  value={contratForm.reference}
                  onChange={(e) => setContratForm({...contratForm, reference: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Propriétaire</label>
                <select 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                  value={contratForm.locataire}
                  onChange={(e) => setContratForm({...contratForm, locataire: e.target.value})}
                >
                  <option value="">Sélectionnez un propriétaire</option>
                  <option value="Jean Koffi">Jean Koffi</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Bien concerné</label>
                <select 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                  value={contratForm.lot}
                  onChange={(e) => setContratForm({...contratForm, lot: e.target.value})}
                >
                  <option value="">Sélectionnez un bien</option>
                  <option value="Résidence La Paix">Résidence La Paix</option>
                </select>
              </div>
              
              <div>
                <Input 
                  label="Date de début" 
                  type="date"
                  value={contratForm.dateDebut}
                  onChange={(e) => setContratForm({...contratForm, dateDebut: e.target.value})}
                />
              </div>
              
              <div>
                <Input 
                  label="Date de fin" 
                  type="date"
                  value={contratForm.dateFin}
                  onChange={(e) => setContratForm({...contratForm, dateFin: e.target.value})}
                />
              </div>
              
              <div>
                <Input 
                  label="Coût estimé (FCFA)" 
                  type="number"
                  placeholder="Entrez le coût estimé" 
                  value={contratForm.cout}
                  onChange={(e) => setContratForm({...contratForm, cout: parseFloat(e.target.value) || 0})}
                />
              </div>
              
              <div className="md:col-span-2">
                <Input 
                  label="Description de l'intervention" 
                  placeholder="Décrivez l'intervention à effectuer"
                  value={contratForm.description}
                  onChange={(e) => setContratForm({...contratForm, description: e.target.value})}
                  className="h-24"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Téléversement du contrat</label>
                <div className="flex items-center gap-4">
                  <div className="avatar placeholder">
                    <div className="bg-neutral text-neutral-content rounded-full w-16">
                      <span className="text-xs">PDF</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Upload size={16} className="mr-2" />
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
              {formType === 'location' ? 'Enregistrer le contrat de location' :
               formType === 'vente' ? 'Enregistrer le contrat de vente' :
               'Enregistrer le contrat d\'intervention'}
            </Button>
          </div>
        </Card>
      )}

      {/* Contenu des onglets */}
      {activeTab === 'locations' && (
        <div className="space-y-6">
          {/* Liste des contrats de location */}
          <Card title="Liste des contrats de location">
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Référence</th>
                    <th>Locataire</th>
                    <th>Lot</th>
                    <th>Date début</th>
                    <th>Date fin</th>
                    <th>Loyer</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contratsLocations.map((contrat) => (
                    <tr key={contrat.id}>
                      <td>
                        <div className="font-medium">{contrat.reference}</div>
                        <div className="text-sm text-base-content/60">Signé le {contrat.dateSignature}</div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Users size={14} />
                          {contrat.locataire}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Home size={14} />
                          {contrat.lot}
                        </div>
                      </td>
                      <td>{new Date(contrat.dateDebut).toLocaleDateString()}</td>
                      <td>{new Date(contrat.dateFin).toLocaleDateString()}</td>
                      <td>{contrat.loyer.toLocaleString()} FCFA</td>
                      <td>
                        <span className={`badge ${
                          contrat.statut === 'Actif' ? 'badge-success' : 
                          contrat.statut === 'Expiré' ? 'badge-error' : 
                          'badge-warning'
                        }`}>
                          {contrat.statut}
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
                              setFormType('location');
                              setContratForm({
                                typeContrat: 'Location',
                                reference: contrat.reference,
                                locataire: contrat.locataire,
                                lot: contrat.lot,
                                dateDebut: contrat.dateDebut,
                                dateFin: contrat.dateFin,
                                loyer: contrat.loyer,
                                charges: contrat.charges,
                                caution: contrat.caution,
                                prixVente: 0,
                                avance: 0,
                                paiementEcheance: false,
                                description: '',
                                cout: 0,
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

      {activeTab === 'ventes' && (
        <div className="space-y-6">
          {/* Liste des contrats de vente */}
          <Card title="Liste des contrats de vente">
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Référence</th>
                    <th>Acheteur</th>
                    <th>Lot</th>
                    <th>Date début</th>
                    <th>Date fin</th>
                    <th>Prix vente</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contratsVentes.map((contrat) => (
                    <tr key={contrat.id}>
                      <td>
                        <div className="font-medium">{contrat.reference}</div>
                        <div className="text-sm text-base-content/60">Signé le {contrat.dateSignature}</div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Users size={14} />
                          {contrat.acheteur}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Home size={14} />
                          {contrat.lot}
                        </div>
                      </td>
                      <td>{new Date(contrat.dateDebut).toLocaleDateString()}</td>
                      <td>{new Date(contrat.dateFin).toLocaleDateString()}</td>
                      <td>{contrat.prixVente.toLocaleString()} FCFA</td>
                      <td>
                        <span className={`badge ${
                          contrat.statut === 'Actif' ? 'badge-success' : 
                          contrat.statut === 'Terminé' ? 'badge-primary' : 
                          'badge-warning'
                        }`}>
                          {contrat.statut}
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
                              setFormType('vente');
                              setContratForm({
                                typeContrat: 'Vente',
                                reference: contrat.reference,
                                locataire: contrat.acheteur,
                                lot: contrat.lot,
                                dateDebut: contrat.dateDebut,
                                dateFin: contrat.dateFin,
                                loyer: 0,
                                charges: 0,
                                caution: 0,
                                prixVente: contrat.prixVente,
                                avance: contrat.avance,
                                paiementEcheance: contrat.paiementEcheance,
                                description: '',
                                cout: 0,
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

      {activeTab === 'interventions' && (
        <div className="space-y-6">
          {/* Liste des contrats d'intervention */}
          <Card title="Liste des contrats d'intervention">
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Référence</th>
                    <th>Propriétaire</th>
                    <th>Bien</th>
                    <th>Date début</th>
                    <th>Date fin</th>
                    <th>Coût</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {interventions.map((contrat) => (
                    <tr key={contrat.id}>
                      <td>
                        <div className="font-medium">{contrat.reference}</div>
                        <div className="text-sm text-base-content/60">Signé le {contrat.dateSignature}</div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Users size={14} />
                          {contrat.proprietaire}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Home size={14} />
                          {contrat.bien}
                        </div>
                      </td>
                      <td>{new Date(contrat.dateDebut).toLocaleDateString()}</td>
                      <td>{new Date(contrat.dateFin).toLocaleDateString()}</td>
                      <td>{contrat.cout.toLocaleString()} FCFA</td>
                      <td>
                        <span className={`badge ${
                          contrat.statut === 'En cours' ? 'badge-warning' : 
                          contrat.statut === 'Terminé' ? 'badge-success' : 
                          'badge-neutral'
                        }`}>
                          {contrat.statut}
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
                              setFormType('intervention');
                              setContratForm({
                                typeContrat: 'Intervention',
                                reference: contrat.reference,
                                locataire: contrat.proprietaire,
                                lot: contrat.bien,
                                dateDebut: contrat.dateDebut,
                                dateFin: contrat.dateFin,
                                loyer: 0,
                                charges: 0,
                                caution: 0,
                                prixVente: 0,
                                avance: 0,
                                paiementEcheance: false,
                                description: 'Réparation de la toiture',
                                cout: contrat.cout,
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
    </div>
  );
};

export default Contrats;