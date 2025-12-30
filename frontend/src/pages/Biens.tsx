// frontend/src/pages/Biens.tsx
import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Home, 
  Plus, 
  Edit3, 
  Eye, 
  Trash2, 
  MapPin,
  Users,
  Wallet,
  Calendar,
  FileText,
  Image
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Alert from '../components/ui/Alert';
import { getImmeubles, getLots, saveImmeuble, saveLot, deleteImmeuble, deleteLot } from '../api/bienApi';
import type { Immeuble, Lot } from '../api/bienApi';

const Biens: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'immeubles' | 'lots'>('immeubles');
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'immeuble' | 'lot'>('immeuble');

  const [immeubles, setImmeubles] = useState<Immeuble[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [immeubleForm, setImmeubleForm] = useState({
    id: 0,
    nom: '',
    type: 'Immeuble',
    proprietaire: '',
    gestionnaire: '',
    adresse: '',
    ville: '',
    pays: 'Bénin',
    description: '',
    nbLots: 1
  });

  const [lotForm, setLotForm] = useState({
    id: 0,
    immeuble: '',
    reference: '',
    type: 'Appartement',
    etage: '',
    superficie: 0,
    nbPieces: 1,
    loyer: 0,
    charges: 0,
    prixVente: 0,
    modePaiement: 'comptant',
    description: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [immeublesData, lotsData] = await Promise.all([
          getImmeubles(),
          getLots()
        ]);
        setImmeubles(immeublesData);
        setLots(lotsData);
      } catch (err: any) {
        setError(err.message || 'Erreur lors du chargement des données');
        console.error('Erreur lors du chargement des données:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-base-content/70">Chargement des données des biens...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="error" className="mb-6">
          <div className="flex items-center gap-2">
            <span>{error}</span>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-base-content">Gestion des Biens</h1>
          <p className="text-base-content/70">Immeubles et lots</p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => {
            setFormType('immeuble');
            setShowForm(true);
          }}
        >
          <Plus size={18} className="mr-2" />
          Ajouter un bien
        </Button>
      </div>

      {/* Navigation par onglets */}
      <div className="flex border-b border-base-200">
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'immeubles'
              ? 'text-primary border-b-2 border-primary'
              : 'text-base-content/60 hover:text-base-content'
          }`}
          onClick={() => setActiveTab('immeubles')}
        >
          <div className="flex items-center gap-2">
            <Building2 size={18} />
            Immeubles
          </div>
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'lots'
              ? 'text-primary border-b-2 border-primary'
              : 'text-base-content/60 hover:text-base-content'
          }`}
          onClick={() => setActiveTab('lots')}
        >
          <div className="flex items-center gap-2">
            <Home size={18} />
            Lots
          </div>
        </button>
      </div>

      {/* Formulaire pour ajouter/modifier */}
      {showForm && (
        <Card title={formType === 'immeuble' ? 'Création / Modification d\'un immeuble' : 'Création / Modification d\'un lot'}>
          {formType === 'immeuble' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Input 
                  label="Nom de l'immeuble" 
                  placeholder="Entrez le nom de l'immeuble" 
                  value={immeubleForm.nom}
                  onChange={(e) => setImmeubleForm({...immeubleForm, nom: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Type d'immeuble</label>
                <select 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                  value={immeubleForm.type}
                  onChange={(e) => setImmeubleForm({...immeubleForm, type: e.target.value})}
                >
                  <option value="Maison">Maison</option>
                  <option value="Immeuble">Immeuble</option>
                  <option value="Résidence">Résidence</option>
                  <option value="Commerce">Commerce</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Propriétaire</label>
                <input 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                  placeholder="Propriétaire"
                  value="Propriétaire inconnu"
                  readOnly
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Gestionnaire responsable</label>
                <input 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                  placeholder="Gestionnaire"
                  value="Gestionnaire inconnu"
                  readOnly
                />
              </div>
              
              <div>
                <Input 
                  label="Adresse" 
                  placeholder="Entrez l'adresse complète" 
                  value={immeubleForm.adresse}
                  onChange={(e) => setImmeubleForm({...immeubleForm, adresse: e.target.value})}
                />
              </div>
              
              <div>
                <Input 
                  label="Ville" 
                  placeholder="Entrez la ville" 
                  value={immeubleForm.ville}
                  onChange={(e) => setImmeubleForm({...immeubleForm, ville: e.target.value})}
                />
              </div>
              
              <div>
                <Input 
                  label="Pays" 
                  placeholder="Entrez le pays" 
                  value={immeubleForm.pays}
                  onChange={(e) => setImmeubleForm({...immeubleForm, pays: e.target.value})}
                />
              </div>
              
              <div>
                <Input 
                  label="Nombre total de lots" 
                  type="number"
                  placeholder="Entrez le nombre de lots"
                  value={immeubleForm.nbLots}
                  onChange={(e) => setImmeubleForm({...immeubleForm, nbLots: parseInt(e.target.value) || 1})}
                />
              </div>
              
              <div className="md:col-span-2">
                <Input 
                  label="Description" 
                  placeholder="Entrez une description de l'immeuble"
                  value={immeubleForm.description}
                  onChange={(e) => setImmeubleForm({...immeubleForm, description: e.target.value})}
                  className="h-24"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Téléversement photos / vidéos</label>
                <div className="flex items-center gap-4">
                  <div className="avatar placeholder">
                    <div className="bg-neutral text-neutral-content rounded-full w-16 flex items-center justify-center">
                      <span className="text-xs">+</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Image size={16} className="mr-2" />
                    Télécharger
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Immeuble de rattachement</label>
                <select 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                  value={lotForm.immeuble}
                  onChange={(e) => setLotForm({...lotForm, immeuble: e.target.value})}
                >
                  <option value="">Sélectionnez un immeuble</option>
                  {immeubles.map(immeuble => (
                    <option key={immeuble.id} value={immeuble.id}>{immeuble.nom}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <Input 
                  label="Référence du lot" 
                  placeholder="Ex: A01, B02" 
                  value={lotForm.reference}
                  onChange={(e) => setLotForm({...lotForm, reference: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Type de lot</label>
                <select 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                  value={lotForm.type}
                  onChange={(e) => setLotForm({...lotForm, type: e.target.value})}
                >
                  <option value="Appartement">Appartement</option>
                  <option value="Studio">Studio</option>
                  <option value="Chambre">Chambre</option>
                  <option value="Boutique">Boutique</option>
                  <option value="Bureau">Bureau</option>
                  <option value="Dépôt">Dépôt</option>
                  <option value="Terrain nu">Terrain nu</option>
                </select>
              </div>
              
              <div>
                <Input 
                  label="Étage" 
                  placeholder="Entrez l'étage" 
                  value={lotForm.etage}
                  onChange={(e) => setLotForm({...lotForm, etage: e.target.value})}
                />
              </div>
              
              <div>
                <Input 
                  label="Superficie (m²)" 
                  type="number"
                  placeholder="Entrez la superficie" 
                  value={lotForm.superficie}
                  onChange={(e) => setLotForm({...lotForm, superficie: parseFloat(e.target.value) || 0})}
                />
              </div>
              
              <div>
                <Input 
                  label="Nombre de pièces" 
                  type="number"
                  placeholder="Entrez le nombre de pièces" 
                  value={lotForm.nbPieces}
                  onChange={(e) => setLotForm({...lotForm, nbPieces: parseInt(e.target.value) || 1})}
                />
              </div>
              
              <div>
                <Input 
                  label="Loyer (FCFA)" 
                  type="number"
                  placeholder="Entrez le loyer mensuel" 
                  value={lotForm.loyer}
                  onChange={(e) => setLotForm({...lotForm, loyer: parseFloat(e.target.value) || 0})}
                />
              </div>
              
              <div>
                <Input 
                  label="Charges (FCFA)" 
                  type="number"
                  placeholder="Entrez les charges mensuelles" 
                  value={lotForm.charges}
                  onChange={(e) => setLotForm({...lotForm, charges: parseFloat(e.target.value) || 0})}
                />
              </div>
              
              <div>
                <Input 
                  label="Prix de vente (FCFA)" 
                  type="number"
                  placeholder="Entrez le prix de vente" 
                  value={lotForm.prixVente}
                  onChange={(e) => setLotForm({...lotForm, prixVente: parseFloat(e.target.value) || 0})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Mode de paiement</label>
                <select 
                  className="w-full p-3 border border-base-200 rounded-lg bg-base-100"
                  value={lotForm.modePaiement}
                  onChange={(e) => setLotForm({...lotForm, modePaiement: e.target.value})}
                >
                  <option value="comptant">Comptant</option>
                  <option value="échelonné">Échelonné</option>
                </select>
              </div>
              
              <div className="md:col-span-2">
                <Input 
                  label="Description" 
                  placeholder="Entrez une description du lot"
                  value={lotForm.description}
                  onChange={(e) => setLotForm({...lotForm, description: e.target.value})}
                  className="h-24"
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
              {formType === 'immeuble' ? 'Enregistrer l\'immeuble' : 'Enregistrer le lot'}
            </Button>
          </div>
        </Card>
      )}

      {/* Contenu des onglets */}
      {activeTab === 'immeubles' && (
        <div className="space-y-6">
          {/* Liste des immeubles */}
          <Card title="Liste des immeubles">
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Photo</th>
                    <th>Nom</th>
                    <th>Type</th>
                    <th>Ville</th>
                    <th>Nombre de lots</th>
                    <th>Occupation</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {immeubles.map((immeuble) => (
                    <tr key={immeuble.id}>
                      <td>
                        <div className="avatar placeholder">
                          <div className="bg-neutral text-neutral-content rounded-full w-10 flex items-center justify-center">
                            <span className="text-xs">I</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="font-medium">{immeuble.nom}</div>
                        <div className="text-sm text-base-content/60">{immeuble.adresse}</div>
                      </td>
                      <td>
                        <span className="badge badge-primary">{immeuble.type}</span>
                      </td>
                      <td>{immeuble.ville}</td>
                      <td>{immeuble.nbLots}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-base-200 rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full" 
                              style={{ width: `${immeuble.occupation}%` }}
                            ></div>
                          </div>
                          <span>{immeuble.occupation}%</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${immeuble.statut === 'Actif' ? 'badge-success' : 'badge-warning'}`}>
                          {immeuble.statut}
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
                              setFormType('immeuble');
                              setImmeubleForm({
                                id: immeuble.id,
                                nom: immeuble.nom,
                                type: immeuble.type,
                                proprietaire: immeuble.proprietaire || '',
                                gestionnaire: immeuble.gestionnaire || '',
                                adresse: immeuble.adresse,
                                ville: immeuble.ville,
                                pays: immeuble.pays,
                                description: immeuble.description || '',
                                nbLots: immeuble.nbLots
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

      {activeTab === 'lots' && (
        <div className="space-y-6">
          {/* Liste des lots */}
          <Card title="Liste des lots">
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Référence</th>
                    <th>Type</th>
                    <th>Immeuble</th>
                    <th>Superficie</th>
                    <th>Pièces</th>
                    <th>Loyer</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lots.map((lot) => (
                    <tr key={lot.id}>
                      <td>
                        <div className="font-medium">{lot.reference}</div>
                        <div className="text-sm text-base-content/60">Étage {lot.etage}</div>
                      </td>
                      <td>
                        <span className="badge badge-secondary">{lot.type}</span>
                      </td>
                      <td>{lot.immeuble}</td>
                      <td>{lot.superficie} m²</td>
                      <td>{lot.nbPieces} pièces</td>
                      <td>{lot.loyer.toLocaleString()} FCFA</td>
                      <td>
                        <span className={`badge ${
                          lot.statut === 'Libre' ? 'badge-success' : 
                          lot.statut === 'Loué' ? 'badge-primary' : 
                          'badge-warning'
                        }`}>
                          {lot.statut}
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
                              setFormType('lot');
                              setLotForm({
                                id: lot.id,
                                immeuble: lot.immeuble,
                                reference: lot.reference,
                                type: lot.type,
                                etage: lot.etage,
                                superficie: lot.superficie,
                                nbPieces: lot.nbPieces,
                                loyer: lot.loyer,
                                charges: lot.charges,
                                prixVente: 0,
                                modePaiement: 'comptant',
                                description: lot.description
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

export default Biens;