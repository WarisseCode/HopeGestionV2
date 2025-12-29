// frontend/src/pages/Interventions.tsx
import React, { useState } from 'react';
import { 
  Wrench, 
  Plus, 
  Edit3, 
  Eye, 
  Trash2, 
  Calendar, 
  Home,
  Users,
  Phone,
  FileText,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MapPin
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Alert from '../components/ui/Alert';

const Interventions: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'demandes' | 'interventions' | 'partenaires'>('demandes');
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'demande' | 'intervention' | 'partenaire'>('demande');

  // Données de démonstration
  const [demandes] = useState([
    {
      id: 1,
      reference: 'DEM-2025-001',
      demandeur: 'KOFFI Jean',
      lot: 'A01 - Résidence La Paix',
      date: '2025-01-15',
      type: 'Plomberie',
      description: 'Fuite d\'eau dans la salle de bain',
      priorite: 'Haute',
      statut: 'En attente',
      telephone: '+229 97 00 00 00',
      adresse: 'Résidence La Paix, A01'
    },
    {
      id: 2,
      reference: 'DEM-2025-002',
      demandeur: 'DOSSOU Marie',
      lot: 'A02 - Résidence La Paix',
      date: '2025-01-16',
      type: 'Électricité',
      description: 'Court-circuit dans la cuisine',
      priorite: 'Urgente',
      statut: 'En cours',
      telephone: '+229 96 00 00 00',
      adresse: 'Résidence La Paix, A02'
    },
    {
      id: 3,
      reference: 'DEM-2025-003',
      demandeur: 'Propriétaire',
      lot: 'Résidence La Paix',
      date: '2025-01-17',
      type: 'Peinture',
      description: 'Peinture extérieure de l\'immeuble',
      priorite: 'Moyenne',
      statut: 'Planifié',
      telephone: '+229 90 00 00 00',
      adresse: 'Résidence La Paix'
    }
  ]);

  const [interventions] = useState([
    {
      id: 1,
      reference: 'INT-2025-001',
      partenaire: 'SARL Plomberie Expert',
      demandeur: 'KOFFI Jean',
      lot: 'A01 - Résidence La Paix',
      dateDebut: '2025-01-18',
      dateFin: '2025-01-19',
      type: 'Plomberie',
      description: 'Fuite d\'eau dans la salle de bain',
      cout: 25000,
      statut: 'Terminé',
      telephone: '+229 97 00 00 00'
    },
    {
      id: 2,
      reference: 'INT-2025-002',
      partenaire: 'SARL Electricité Pro',
      demandeur: 'DOSSOU Marie',
      lot: 'A02 - Résidence La Paix',
      dateDebut: '2025-01-20',
      dateFin: '2025-01-20',
      type: 'Électricité',
      description: 'Court-circuit dans la cuisine',
      cout: 45000,
      statut: 'En cours',
      telephone: '+229 96 00 00 00'
    }
  ]);

  const [partenaires] = useState([
    {
      id: 1,
      nom: 'SARL Plomberie Expert',
      contact: 'Jean Dupont',
      telephone: '+229 97 12 34 56',
      email: 'contact@plomberie-expert.bj',
      specialite: 'Plomberie',
      statut: 'Actif',
      adresse: 'Quartier Haie Vive, Cotonou'
    },
    {
      id: 2,
      nom: 'SARL Electricité Pro',
      contact: 'Marie Johnson',
      telephone: '+229 96 12 34 56',
      email: 'info@electricite-pro.bj',
      specialite: 'Électricité',
      statut: 'Actif',
      adresse: 'Fidjrossè, Cotonou'
    },
    {
      id: 3,
      nom: 'SARL Peinture Color',
      contact: 'Pierre Martin',
      telephone: '+229 95 12 34 56',
      email: 'contact@peinture-color.bj',
      specialite: 'Peinture',
      statut: 'Actif',
      adresse: 'Akpakpa, Cotonou'
    }
  ]);

  const [demandeForm, setDemandeForm] = useState({
    reference: '',
    demandeur: '',
    lot: '',
    date: '',
    type: 'Plomberie',
    description: '',
    priorite: 'Moyenne',
    telephone: '',
    adresse: ''
  });

  const [interventionForm, setInterventionForm] = useState({
    reference: '',
    partenaire: '',
    demandeur: '',
    lot: '',
    dateDebut: '',
    dateFin: '',
    type: 'Plomberie',
    description: '',
    cout: 0,
    statut: 'Planifié',
    telephone: ''
  });

  const [partenaireForm, setPartenaireForm] = useState({
    nom: '',
    contact: '',
    telephone: '',
    email: '',
    specialite: 'Plomberie',
    statut: 'Actif',
    adresse: ''
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-base-content">Gestion des Interventions</h1>
          <p className="text-base-content/70">Demandes, interventions et partenaires</p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => {
            setFormType(activeTab === 'demandes' ? 'demande' : activeTab === 'interventions' ? 'intervention' : 'partenaire');
            setShowForm(true);
          }}
        >
          <Plus size={18} className="mr-2" />
          {activeTab === 'demandes' ? 'Nouvelle demande' : 
           activeTab === 'interventions' ? 'Nouvelle intervention' : 'Nouveau partenaire'}
        </Button>
      </div>

      {/* Navigation par onglets */}
      <div className="flex border-b border-base-200">
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'demandes'
              ? 'text-primary border-b-2 border-primary'
              : 'text-base-content/60 hover:text-base-content'
          }`}
          onClick={() => setActiveTab('demandes')}
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={18} />
            Demandes
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
            <Wrench size={18} />
            Interventions
          </div>
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'partenaires'
              ? 'text-primary border-b-2 border-primary'
              : 'text-base-content/60 hover:text-base-content'
          }`}
          onClick={() => setActiveTab('partenaires')}
        >
          <div className="flex items-center gap-2">
            <Users size={18} />
            Partenaires
          </div>
        </button>
      </div>

      {/* Formulaire pour ajouter/modifier */}
      {showForm && (
        <Card title={
          formType === 'demande' ? 'Création / Modification d\'une demande' :
          formType === 'intervention' ? 'Création / Modification d\'une intervention' :
          'Création / Modification d\'un partenaire'
        }>
          {formType === 'demande' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Input 
                  label="Référence de la demande" 
                  placeholder="Ex: DEM-2025-001" 
                  value={demandeForm.reference}
                  onChange={(e) => setDemandeForm({...demandeForm, reference: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Demandeur</label>
                <select 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                  value={demandeForm.demandeur}
                  onChange={(e) => setDemandeForm({...demandeForm, demandeur: e.target.value})}
                >
                  <option value="">Sélectionnez un demandeur</option>
                  <option value="KOFFI Jean">KOFFI Jean</option>
                  <option value="DOSSOU Marie">DOSSOU Marie</option>
                  <option value="Propriétaire">Propriétaire</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Lot concerné</label>
                <select 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                  value={demandeForm.lot}
                  onChange={(e) => setDemandeForm({...demandeForm, lot: e.target.value})}
                >
                  <option value="">Sélectionnez un lot</option>
                  <option value="A01 - Résidence La Paix">A01 - Résidence La Paix</option>
                  <option value="A02 - Résidence La Paix">A02 - Résidence La Paix</option>
                  <option value="Résidence La Paix">Résidence La Paix (commun)</option>
                </select>
              </div>
              
              <div>
                <Input 
                  label="Date" 
                  type="date"
                  value={demandeForm.date}
                  onChange={(e) => setDemandeForm({...demandeForm, date: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Type d'intervention</label>
                <select 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                  value={demandeForm.type}
                  onChange={(e) => setDemandeForm({...demandeForm, type: e.target.value})}
                >
                  <option value="Plomberie">Plomberie</option>
                  <option value="Électricité">Électricité</option>
                  <option value="Peinture">Peinture</option>
                  <option value="Serrurerie">Serrurerie</option>
                  <option value="Menuiserie">Menuiserie</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Priorité</label>
                <select 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                  value={demandeForm.priorite}
                  onChange={(e) => setDemandeForm({...demandeForm, priorite: e.target.value})}
                >
                  <option value="Basse">Basse</option>
                  <option value="Moyenne">Moyenne</option>
                  <option value="Haute">Haute</option>
                  <option value="Urgente">Urgente</option>
                </select>
              </div>
              
              <div>
                <Input 
                  label="Téléphone du demandeur" 
                  placeholder="Entrez le numéro de téléphone" 
                  value={demandeForm.telephone}
                  onChange={(e) => setDemandeForm({...demandeForm, telephone: e.target.value})}
                  startIcon={<Phone size={16} />}
                />
              </div>
              
              <div>
                <Input 
                  label="Adresse du bien" 
                  placeholder="Entrez l'adresse du bien" 
                  value={demandeForm.adresse}
                  onChange={(e) => setDemandeForm({...demandeForm, adresse: e.target.value})}
                  startIcon={<MapPin size={16} />}
                />
              </div>
              
              <div className="md:col-span-2">
                <Input 
                  label="Description de la demande" 
                  placeholder="Décrivez la demande d'intervention"
                  value={demandeForm.description}
                  onChange={(e) => setDemandeForm({...demandeForm, description: e.target.value})}
                  className="h-24"
                />
              </div>
            </div>
          ) : formType === 'intervention' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Input 
                  label="Référence de l'intervention" 
                  placeholder="Ex: INT-2025-001" 
                  value={interventionForm.reference}
                  onChange={(e) => setInterventionForm({...interventionForm, reference: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Partenaire</label>
                <select 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                  value={interventionForm.partenaire}
                  onChange={(e) => setInterventionForm({...interventionForm, partenaire: e.target.value})}
                >
                  <option value="">Sélectionnez un partenaire</option>
                  <option value="SARL Plomberie Expert">SARL Plomberie Expert</option>
                  <option value="SARL Electricité Pro">SARL Electricité Pro</option>
                  <option value="SARL Peinture Color">SARL Peinture Color</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Demandeur</label>
                <select 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                  value={interventionForm.demandeur}
                  onChange={(e) => setInterventionForm({...interventionForm, demandeur: e.target.value})}
                >
                  <option value="">Sélectionnez un demandeur</option>
                  <option value="KOFFI Jean">KOFFI Jean</option>
                  <option value="DOSSOU Marie">DOSSOU Marie</option>
                  <option value="Propriétaire">Propriétaire</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Lot concerné</label>
                <select 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                  value={interventionForm.lot}
                  onChange={(e) => setInterventionForm({...interventionForm, lot: e.target.value})}
                >
                  <option value="">Sélectionnez un lot</option>
                  <option value="A01 - Résidence La Paix">A01 - Résidence La Paix</option>
                  <option value="A02 - Résidence La Paix">A02 - Résidence La Paix</option>
                  <option value="Résidence La Paix">Résidence La Paix (commun)</option>
                </select>
              </div>
              
              <div>
                <Input 
                  label="Date de début" 
                  type="date"
                  value={interventionForm.dateDebut}
                  onChange={(e) => setInterventionForm({...interventionForm, dateDebut: e.target.value})}
                />
              </div>
              
              <div>
                <Input 
                  label="Date de fin" 
                  type="date"
                  value={interventionForm.dateFin}
                  onChange={(e) => setInterventionForm({...interventionForm, dateFin: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Type d'intervention</label>
                <select 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                  value={interventionForm.type}
                  onChange={(e) => setInterventionForm({...interventionForm, type: e.target.value})}
                >
                  <option value="Plomberie">Plomberie</option>
                  <option value="Électricité">Électricité</option>
                  <option value="Peinture">Peinture</option>
                  <option value="Serrurerie">Serrurerie</option>
                  <option value="Menuiserie">Menuiserie</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
              
              <div>
                <Input 
                  label="Coût estimé (FCFA)" 
                  type="number"
                  placeholder="Entrez le coût estimé" 
                  value={interventionForm.cout}
                  onChange={(e) => setInterventionForm({...interventionForm, cout: parseFloat(e.target.value) || 0})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Statut</label>
                <select 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                  value={interventionForm.statut}
                  onChange={(e) => setInterventionForm({...interventionForm, statut: e.target.value})}
                >
                  <option value="Planifié">Planifié</option>
                  <option value="En cours">En cours</option>
                  <option value="Terminé">Terminé</option>
                  <option value="Annulé">Annulé</option>
                </select>
              </div>
              
              <div>
                <Input 
                  label="Téléphone du demandeur" 
                  placeholder="Entrez le numéro de téléphone" 
                  value={interventionForm.telephone}
                  onChange={(e) => setInterventionForm({...interventionForm, telephone: e.target.value})}
                  startIcon={<Phone size={16} />}
                />
              </div>
              
              <div className="md:col-span-2">
                <Input 
                  label="Description de l'intervention" 
                  placeholder="Décrivez l'intervention à effectuer"
                  value={interventionForm.description}
                  onChange={(e) => setInterventionForm({...interventionForm, description: e.target.value})}
                  className="h-24"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Input 
                  label="Nom de l'entreprise" 
                  placeholder="Entrez le nom de l'entreprise" 
                  value={partenaireForm.nom}
                  onChange={(e) => setPartenaireForm({...partenaireForm, nom: e.target.value})}
                />
              </div>
              
              <div>
                <Input 
                  label="Nom du contact" 
                  placeholder="Entrez le nom du contact" 
                  value={partenaireForm.contact}
                  onChange={(e) => setPartenaireForm({...partenaireForm, contact: e.target.value})}
                />
              </div>
              
              <div>
                <Input 
                  label="Téléphone" 
                  placeholder="Entrez le numéro de téléphone" 
                  value={partenaireForm.telephone}
                  onChange={(e) => setPartenaireForm({...partenaireForm, telephone: e.target.value})}
                  startIcon={<Phone size={16} />}
                />
              </div>
              
              <div>
                <Input 
                  label="Email" 
                  placeholder="Entrez l'adresse email" 
                  value={partenaireForm.email}
                  onChange={(e) => setPartenaireForm({...partenaireForm, email: e.target.value})}
                  startIcon={<FileText size={16} />}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Spécialité</label>
                <select 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                  value={partenaireForm.specialite}
                  onChange={(e) => setPartenaireForm({...partenaireForm, specialite: e.target.value})}
                >
                  <option value="Plomberie">Plomberie</option>
                  <option value="Électricité">Électricité</option>
                  <option value="Peinture">Peinture</option>
                  <option value="Serrurerie">Serrurerie</option>
                  <option value="Menuiserie">Menuiserie</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Statut</label>
                <select 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                  value={partenaireForm.statut}
                  onChange={(e) => setPartenaireForm({...partenaireForm, statut: e.target.value})}
                >
                  <option value="Actif">Actif</option>
                  <option value="Inactif">Inactif</option>
                </select>
              </div>
              
              <div className="md:col-span-2">
                <Input 
                  label="Adresse" 
                  placeholder="Entrez l'adresse de l'entreprise" 
                  value={partenaireForm.adresse}
                  onChange={(e) => setPartenaireForm({...partenaireForm, adresse: e.target.value})}
                  startIcon={<MapPin size={16} />}
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
              {formType === 'demande' ? 'Enregistrer la demande' :
               formType === 'intervention' ? 'Enregistrer l\'intervention' :
               'Enregistrer le partenaire'}
            </Button>
          </div>
        </Card>
      )}

      {/* Contenu des onglets */}
      {activeTab === 'demandes' && (
        <div className="space-y-6">
          {/* Résumé des demandes */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <div className="flex items-center gap-4">
                <div className="avatar placeholder">
                  <div className="bg-warning/10 text-warning rounded-full w-12">
                    <AlertCircle size={24} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-base-content/60">En attente</p>
                  <p className="text-2xl font-bold">2</p>
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="flex items-center gap-4">
                <div className="avatar placeholder">
                  <div className="bg-info/10 text-info rounded-full w-12">
                    <Clock size={24} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-base-content/60">En cours</p>
                  <p className="text-2xl font-bold">1</p>
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
                  <p className="text-sm text-base-content/60">Terminées</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="flex items-center gap-4">
                <div className="avatar placeholder">
                  <div className="bg-primary/10 text-primary rounded-full w-12">
                    <AlertCircle size={24} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-base-content/60">Urgentes</p>
                  <p className="text-2xl font-bold">1</p>
                </div>
              </div>
            </Card>
          </div>
          
          {/* Liste des demandes */}
          <Card title="Liste des demandes d'intervention">
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Référence</th>
                    <th>Demandeur</th>
                    <th>Lot</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Priorité</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {demandes.map((demande) => (
                    <tr key={demande.id}>
                      <td>
                        <div className="font-medium">{demande.reference}</div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Users size={14} />
                          {demande.demandeur}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Home size={14} />
                          {demande.lot}
                        </div>
                      </td>
                      <td>{new Date(demande.date).toLocaleDateString()}</td>
                      <td>
                        <span className="badge badge-secondary">{demande.type}</span>
                      </td>
                      <td>
                        <span className={`badge ${
                          demande.priorite === 'Urgente' ? 'badge-error' : 
                          demande.priorite === 'Haute' ? 'badge-warning' : 
                          'badge-info'
                        }`}>
                          {demande.priorite}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${
                          demande.statut === 'En attente' ? 'badge-warning' : 
                          demande.statut === 'En cours' ? 'badge-info' : 
                          demande.statut === 'Planifié' ? 'badge-primary' : 
                          'badge-neutral'
                        }`}>
                          {demande.statut}
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
                              setFormType('demande');
                              setDemandeForm({
                                reference: demande.reference,
                                demandeur: demande.demandeur,
                                lot: demande.lot,
                                date: demande.date,
                                type: demande.type,
                                description: demande.description,
                                priorite: demande.priorite,
                                telephone: demande.telephone,
                                adresse: demande.adresse
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

      {activeTab === 'interventions' && (
        <div className="space-y-6">
          {/* Résumé des interventions */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <div className="flex items-center gap-4">
                <div className="avatar placeholder">
                  <div className="bg-primary/10 text-primary rounded-full w-12">
                    <Wrench size={24} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-base-content/60">Total</p>
                  <p className="text-2xl font-bold">2</p>
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="flex items-center gap-4">
                <div className="avatar placeholder">
                  <div className="bg-info/10 text-info rounded-full w-12">
                    <Clock size={24} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-base-content/60">En cours</p>
                  <p className="text-2xl font-bold">1</p>
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
                  <p className="text-sm text-base-content/60">Terminées</p>
                  <p className="text-2xl font-bold">1</p>
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
                  <p className="text-sm text-base-content/60">Coût total</p>
                  <p className="text-2xl font-bold">70,000 FCFA</p>
                </div>
              </div>
            </Card>
          </div>
          
          {/* Liste des interventions */}
          <Card title="Liste des interventions">
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Référence</th>
                    <th>Partenaire</th>
                    <th>Demandeur</th>
                    <th>Lot</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Coût</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {interventions.map((intervention) => (
                    <tr key={intervention.id}>
                      <td>
                        <div className="font-medium">{intervention.reference}</div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Users size={14} />
                          {intervention.partenaire}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Users size={14} />
                          {intervention.demandeur}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Home size={14} />
                          {intervention.lot}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-secondary">{intervention.type}</span>
                      </td>
                      <td>
                        {new Date(intervention.dateDebut).toLocaleDateString()} - {new Date(intervention.dateFin).toLocaleDateString()}
                      </td>
                      <td>{intervention.cout.toLocaleString()} FCFA</td>
                      <td>
                        <span className={`badge ${
                          intervention.statut === 'En cours' ? 'badge-info' : 
                          intervention.statut === 'Terminé' ? 'badge-success' : 
                          intervention.statut === 'Planifié' ? 'badge-primary' : 
                          'badge-error'
                        }`}>
                          {intervention.statut}
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
                              setInterventionForm({
                                reference: intervention.reference,
                                partenaire: intervention.partenaire,
                                demandeur: intervention.demandeur,
                                lot: intervention.lot,
                                dateDebut: intervention.dateDebut,
                                dateFin: intervention.dateFin,
                                type: intervention.type,
                                description: intervention.description,
                                cout: intervention.cout,
                                statut: intervention.statut,
                                telephone: intervention.telephone
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

      {activeTab === 'partenaires' && (
        <div className="space-y-6">
          {/* Résumé des partenaires */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <div className="flex items-center gap-4">
                <div className="avatar placeholder">
                  <div className="bg-primary/10 text-primary rounded-full w-12">
                    <Users size={24} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-base-content/60">Total partenaires</p>
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
                  <p className="text-sm text-base-content/60">Actifs</p>
                  <p className="text-2xl font-bold">3</p>
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="flex items-center gap-4">
                <div className="avatar placeholder">
                  <div className="bg-info/10 text-info rounded-full w-12">
                    <Wrench size={24} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-base-content/60">Spécialités</p>
                  <p className="text-2xl font-bold">5</p>
                </div>
              </div>
            </Card>
          </div>
          
          {/* Liste des partenaires */}
          <Card title="Liste des partenaires de services">
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Contact</th>
                    <th>Téléphone</th>
                    <th>Spécialité</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {partenaires.map((partenaire) => (
                    <tr key={partenaire.id}>
                      <td>
                        <div className="font-medium">{partenaire.nom}</div>
                        <div className="text-sm text-base-content/60">{partenaire.adresse}</div>
                      </td>
                      <td>{partenaire.contact}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Phone size={14} />
                          {partenaire.telephone}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-primary">{partenaire.specialite}</span>
                      </td>
                      <td>
                        <span className={`badge ${partenaire.statut === 'Actif' ? 'badge-success' : 'badge-warning'}`}>
                          {partenaire.statut}
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
                              setFormType('partenaire');
                              setPartenaireForm({
                                nom: partenaire.nom,
                                contact: partenaire.contact,
                                telephone: partenaire.telephone,
                                email: partenaire.email,
                                specialite: partenaire.specialite,
                                statut: partenaire.statut,
                                adresse: partenaire.adresse
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
    </div>
  );
};

export default Interventions;