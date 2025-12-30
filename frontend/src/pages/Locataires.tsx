// frontend/src/pages/Locataires.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLocataires, createLocataire, deleteLocataire, updateLocataire } from '../api/locataireApi';
import type { Locataire } from '../api/locataireApi';
import { 
  Users, 
  UserPlus, 
  Phone, 
  Mail, 
  FileText, 
  Edit3, 
  Eye, 
  Trash2, 
  Home,
  Wallet,
  Calendar,
  User,
  Shield,
  Key
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Alert from '../components/ui/Alert';
import Select from '../components/ui/Select';

const Locataires: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'locataires' | 'acheteurs' | 'affectation'>('locataires');
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'creation' | 'affectation'>('creation');

  const navigate = useNavigate();
  const [locataires, setLocataires] = useState<Locataire[]>([]);
  const [acheteurs, setAcheteurs] = useState<Locataire[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLocatairesData = async () => {
    try {
      setLoading(true);
      const locs = await getLocataires('Locataire');
      setLocataires(locs);
      
      const achs = await getLocataires('Acheteur');
      setAcheteurs(achs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocatairesData();
  }, []);

  const [locataireForm, setLocataireForm] = useState({
    typeProfil: 'Locataire',
    nom: '',
    prenoms: '',
    telephonePrincipal: '',
    telephoneSecondaire: '',
    email: '',
    nationalite: 'Béninoise',
    typePiece: 'CNI',
    numeroPiece: '',
    dateExpiration: '',
    photoPiece: null,
    photoProfil: null,
    modePaiement: 'Mobile Money',
    acompte: 0,
    avance: 0,
    paiementEcheance: false
  });

  const [affectationForm, setAffectationForm] = useState({
    locataire: '',
    lot: '',
    typeAffectation: 'Location',
    dateDebut: '',
    dateFin: '',
    conditions: ''
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-base-content">Gestion des Locataires / Acheteurs</h1>
          <p className="text-base-content/70">Création, gestion et affectation</p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => {
            setFormType('creation');
            setShowForm(true);
          }}
        >
          <UserPlus size={18} className="mr-2" />
          Ajouter un locataire
        </Button>
      </div>

      {/* Navigation par onglets */}
      <div className="flex border-b border-base-200">
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'locataires'
              ? 'text-primary border-b-2 border-primary'
              : 'text-base-content/60 hover:text-base-content'
          }`}
          onClick={() => setActiveTab('locataires')}
        >
          <div className="flex items-center gap-2">
            <Users size={18} />
            Locataires
          </div>
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'acheteurs'
              ? 'text-primary border-b-2 border-primary'
              : 'text-base-content/60 hover:text-base-content'
          }`}
          onClick={() => setActiveTab('acheteurs')}
        >
          <div className="flex items-center gap-2">
            <Wallet size={18} />
            Acheteurs
          </div>
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'affectation'
              ? 'text-primary border-b-2 border-primary'
              : 'text-base-content/60 hover:text-base-content'
          }`}
          onClick={() => setActiveTab('affectation')}
        >
          <div className="flex items-center gap-2">
            <Home size={18} />
            Affectation
          </div>
        </button>
      </div>

      {/* Formulaire pour ajouter/modifier */}
      {showForm && (
        <Card title={formType === 'creation' ? 
          (activeTab === 'acheteurs' ? 'Création / Modification d\'un acheteur' : 'Création / Modification d\'un locataire') : 
          'Affectation d\'un lot'
        }>
          {formType === 'creation' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select
                label="Type de profil"
                value={locataireForm.typeProfil}
                onChange={(e) => setLocataireForm({...locataireForm, typeProfil: e.target.value})}
                options={[
                  { value: 'Locataire', label: 'Locataire' },
                  { value: 'Acheteur', label: 'Acheteur' }
                ]}
              />
              
              <div>
                <Input 
                  label="Nom" 
                  placeholder="Entrez le nom" 
                  value={locataireForm.nom}
                  onChange={(e) => setLocataireForm({...locataireForm, nom: e.target.value})}
                  startIcon={<User size={16} />}
                />
              </div>
              
              <div>
                <Input 
                  label="Prénoms" 
                  placeholder="Entrez les prénoms" 
                  value={locataireForm.prenoms}
                  onChange={(e) => setLocataireForm({...locataireForm, prenoms: e.target.value})}
                  startIcon={<User size={16} />}
                />
              </div>
              
              <div>
                <Input 
                  label="Téléphone principal (WhatsApp)" 
                  placeholder="Entrez le numéro WhatsApp" 
                  value={locataireForm.telephonePrincipal}
                  onChange={(e) => setLocataireForm({...locataireForm, telephonePrincipal: e.target.value})}
                  startIcon={<Phone size={16} />}
                />
              </div>
              
              <div>
                <Input 
                  label="Téléphone secondaire" 
                  placeholder="Entrez le numéro secondaire" 
                  value={locataireForm.telephoneSecondaire}
                  onChange={(e) => setLocataireForm({...locataireForm, telephoneSecondaire: e.target.value})}
                  startIcon={<Phone size={16} />}
                />
              </div>
              
              <div>
                <Input 
                  label="Email" 
                  placeholder="Entrez l'email" 
                  value={locataireForm.email}
                  onChange={(e) => setLocataireForm({...locataireForm, email: e.target.value})}
                  startIcon={<Mail size={16} />}
                />
              </div>
              
              <div>
                <Input 
                  label="Nationalité" 
                  placeholder="Entrez la nationalité" 
                  value={locataireForm.nationalite}
                  onChange={(e) => setLocataireForm({...locataireForm, nationalite: e.target.value})}
                />
              </div>
              
              <Select
                label="Type de pièce d'identité"
                value={locataireForm.typePiece}
                onChange={(e) => setLocataireForm({...locataireForm, typePiece: e.target.value})}
                options={[
                  { value: 'CNI', label: "Carte Nationale d'Identité" },
                  { value: 'Passeport', label: 'Passeport' },
                  { value: 'CIP', label: "Carte d'Identité Provisoire" }
                ]}
              />
              
              <div>
                <Input 
                  label="Numéro de pièce" 
                  placeholder="Entrez le numéro de pièce" 
                  value={locataireForm.numeroPiece}
                  onChange={(e) => setLocataireForm({...locataireForm, numeroPiece: e.target.value})}
                />
              </div>
              
              <div>
                <Input 
                  label="Date d'expiration" 
                  type="date"
                  value={locataireForm.dateExpiration}
                  onChange={(e) => setLocataireForm({...locataireForm, dateExpiration: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Téléversement pièce d'identité</label>
                <div className="flex items-center gap-4">
                  <div className="avatar placeholder">
                    <div className="bg-neutral text-neutral-content rounded-full w-16 flex items-center justify-center">
                      <span className="text-xs">ID</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    Télécharger
                  </Button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Photo du locataire</label>
                <div className="flex items-center gap-4">
                  <div className="avatar placeholder">
                    <div className="bg-neutral text-neutral-content rounded-full w-16 flex items-center justify-center">
                      <span className="text-xs">PJ</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    Télécharger
                  </Button>
                </div>
              </div>
              
              {locataireForm.typeProfil === 'Locataire' && (
                <>
                  <Select
                    label="Mode de paiement"
                    value={locataireForm.modePaiement}
                    onChange={(e) => setLocataireForm({...locataireForm, modePaiement: e.target.value})}
                    options={[
                      { value: 'Mobile Money', label: 'Mobile Money' },
                      { value: 'Espèces', label: 'Espèces' },
                      { value: 'Virement', label: 'Virement' }
                    ]}
                  />
                  
                  <div>
                    <Input 
                      label="Acompte / Caution (FCFA)" 
                      type="number"
                      placeholder="Entrez le montant de la caution" 
                      value={locataireForm.acompte}
                      onChange={(e) => setLocataireForm({...locataireForm, acompte: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  
                  <div>
                    <Input 
                      label="Avance (FCFA)" 
                      type="number"
                      placeholder="Entrez le montant de l'avance" 
                      value={locataireForm.avance}
                      onChange={(e) => setLocataireForm({...locataireForm, avance: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </>
              )}
              
              {locataireForm.typeProfil === 'Acheteur' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Paiement échelonné</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      className="toggle"
                      checked={locataireForm.paiementEcheance}
                      onChange={(e) => setLocataireForm({...locataireForm, paiementEcheance: e.target.checked})}
                    />
                    <span>Oui</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select
                label="Locataire / Acheteur"
                value={affectationForm.locataire}
                onChange={(e) => setAffectationForm({...affectationForm, locataire: e.target.value})}
                placeholder="Sélectionnez un locataire"
                options={locataires.map(locataire => ({
                  value: locataire.id,
                  label: `${locataire.nom} ${locataire.prenoms}`
                }))}
              />
              
              <Select
                label="Lot concerné"
                value={affectationForm.lot}
                onChange={(e) => setAffectationForm({...affectationForm, lot: e.target.value})}
                placeholder="Sélectionnez un lot"
                options={[
                  { value: 'A01', label: 'A01 - Résidence La Paix' },
                  { value: 'A02', label: 'A02 - Résidence La Paix' },
                  { value: 'B01', label: 'B01 - Immeuble Le Destin' }
                ]}
              />
              
              <Select
                label="Type d'affectation"
                value={affectationForm.typeAffectation}
                onChange={(e) => setAffectationForm({...affectationForm, typeAffectation: e.target.value})}
                options={[
                  { value: 'Location', label: 'Location' },
                  { value: 'Vente', label: 'Vente' },
                  { value: 'Réservation', label: 'Réservation' }
                ]}
              />
              
              <div>
                <Input 
                  label="Date de début" 
                  type="date"
                  value={affectationForm.dateDebut}
                  onChange={(e) => setAffectationForm({...affectationForm, dateDebut: e.target.value})}
                />
              </div>
              
              <div>
                <Input 
                  label="Date de fin (si location)" 
                  type="date"
                  value={affectationForm.dateFin}
                  onChange={(e) => setAffectationForm({...affectationForm, dateFin: e.target.value})}
                />
              </div>
              
              <div className="md:col-span-2">
                <Input 
                  label="Conditions particulières" 
                  placeholder="Entrez les conditions particulières"
                  value={affectationForm.conditions}
                  onChange={(e) => setAffectationForm({...affectationForm, conditions: e.target.value})}
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
              onClick={async () => {
                 try {
                   // Adapter les données pour API (mapper typeProfil vers type)
                   const dataToSave: any = { ...locataireForm, type: locataireForm.typeProfil }; 
                   // TODO: Gérer l'update si ID existe
                   await createLocataire(dataToSave);
                   alert('Enregistré avec succès');
                   setShowForm(false);
                   fetchLocatairesData();
                 } catch(err) {
                   alert('Erreur sauvegarde');
                 }
              }}
            >
              {formType === 'creation' ? 
                (activeTab === 'acheteurs' ? 'Enregistrer l\'acheteur' : 'Enregistrer le locataire') : 
                'Affecter le lot'
              }
            </Button>
          </div>
        </Card>
      )}

      {/* Contenu des onglets */}
      {activeTab === 'locataires' && (
        <div className="space-y-6">
          {/* Liste des locataires */}
          <Card title="Liste des locataires">
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Photo</th>
                    <th>Nom</th>
                    <th>Type</th>
                    <th>Lot</th>
                    <th>Statut</th>
                    <th>Paiement</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {locataires.map((locataire) => (
                    <tr key={locataire.id}>
                      <td>
                        <div className="avatar placeholder">
                          <div className="bg-neutral text-neutral-content rounded-full w-10 flex items-center justify-center">
                            <span className="text-xs">{locataire.nom.charAt(0)}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="font-medium">{locataire.nom} {locataire.prenoms}</div>
                        <div className="text-sm text-base-content/60">{locataire.telephone_principal}</div>
                      </td>
                      <td>
                        <span className="badge badge-primary">{locataire.type}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Home size={14} />
                          {locataire.lot || '-'}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${locataire.statut === 'Actif' ? 'badge-success' : 'badge-warning'}`}>
                          {locataire.statut}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Wallet size={14} />
                          {locataire.loyer ? locataire.loyer.toLocaleString() : 'N/A'} FCFA
                        </div>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/dashboard/locataires/${locataire.id}`)}>
                            <Eye size={16} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              // TODO: Pré-remplir form pour edit et avoir ID
                              alert('Modification à implémenter complètement');
                            }}
                          >
                            <Edit3 size={16} />
                          </Button>
                          <Button 
                             variant="ghost" 
                             size="sm" 
                             className="text-error"
                             onClick={async () => {
                               if(window.confirm('Supprimer ?')) {
                                  await deleteLocataire(locataire.id);
                                  fetchLocatairesData();
                               }
                             }}
                          >
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

      {activeTab === 'acheteurs' && (
        <div className="space-y-6">
          {/* Liste des acheteurs */}
          <Card title="Liste des acheteurs">
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Photo</th>
                    <th>Nom</th>
                    <th>Type</th>
                    <th>Lot</th>
                    <th>Statut</th>
                    <th>Paiement échelonné</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {acheteurs.map((acheteur) => (
                    <tr key={acheteur.id}>
                      <td>
                        <div className="avatar placeholder">
                          <div className="bg-neutral text-neutral-content rounded-full w-10 flex items-center justify-center">
                            <span className="text-xs">{acheteur.nom.charAt(0)}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="font-medium">{acheteur.nom} {acheteur.prenoms}</div>
                        <div className="text-sm text-base-content/60">{acheteur.telephone_principal}</div>
                      </td>
                      <td>
                        <span className="badge badge-secondary">{acheteur.type}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Home size={14} />
                          {acheteur.lot || '-'}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${acheteur.statut === 'Actif' ? 'badge-success' : 'badge-warning'}`}>
                          {acheteur.statut}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${acheteur.paiementEcheance ? 'badge-primary' : 'badge-neutral'}`}>
                          {acheteur.paiementEcheance ? 'Oui' : 'Non'}
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
                              setFormType('creation');
                              setLocataireForm({
                                typeProfil: acheteur.type,
                                nom: acheteur.nom,
                                prenoms: acheteur.prenoms,
                                telephonePrincipal: acheteur.telephone_principal,
                                telephoneSecondaire: acheteur.telephone_secondaire || '',
                                email: acheteur.email || '',
                                nationalite: acheteur.nationalite || 'Béninoise',
                                typePiece: acheteur.type_piece || 'CNI',
                                numeroPiece: acheteur.numero_piece || '',
                                dateExpiration: '', // Manquant dans l'interface API pour l'instant
                                photoPiece: null,
                                photoProfil: null,
                                modePaiement: 'Mobile Money',
                                acompte: 0,
                                avance: 0,
                                paiementEcheance: acheteur.paiementEcheance || false
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

      {activeTab === 'affectation' && (
        <div className="space-y-6">
          <Card title="Affectation d'un lot">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select
                label="Lot concerné"
                placeholder="Sélectionnez un lot"
                options={[
                  { value: 'A01', label: 'A01 - Résidence La Paix' },
                  { value: 'A02', label: 'A02 - Résidence La Paix' },
                  { value: 'B01', label: 'B01 - Immeuble Le Destin' }
                ]}
              />
              
              <Select
                label="Locataire / Acheteur"
                placeholder="Sélectionnez un locataire"
                options={locataires.map(locataire => ({
                  value: locataire.id,
                  label: `${locataire.nom} ${locataire.prenoms}`
                }))}
              />
              
              <Select
                label="Type d'affectation"
                options={[
                  { value: 'Location', label: 'Location' },
                  { value: 'Vente', label: 'Vente' },
                  { value: 'Réservation', label: 'Réservation' }
                ]}
              />
              
              <div>
                <Input 
                  label="Date de début" 
                  type="date"
                />
              </div>
              
              <div>
                <Input 
                  label="Date de fin (si location)" 
                  type="date"
                />
              </div>
              
              <div className="md:col-span-2">
                <Input 
                  label="Conditions particulières" 
                  placeholder="Entrez les conditions particulières"
                  className="h-24"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost">Annuler</Button>
              <Button variant="primary">Affecter</Button>
              <Button variant="ghost">Générer contrat</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Locataires;