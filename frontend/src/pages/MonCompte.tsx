// frontend/src/pages/MonCompte.tsx
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Settings, 
  Building2, 
  Mail, 
  Phone,
  User,
  Edit3,
  Eye,
  EyeOff,
  Trash2
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Alert from '../components/ui/Alert';
import Select from '../components/ui/Select';
import { getProprietaires, getUtilisateurs, saveProprietaire, saveUtilisateur, saveAutorisation } from '../api/accountApi';
import { getRole } from '../api/authApi';
import { getToken } from '../api/authApi'; // Assuming getToken is also needed directly or indirectly, but getRole is the key addition

const MonCompte: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'proprietaires' | 'utilisateurs' | 'autorisation'>('proprietaires');
  const [showPassword, setShowPassword] = useState(false);
  const [proprietaires, setProprietaires] = useState<any[]>([]);
  const [utilisateurs, setUtilisateurs] = useState<any[]>([]);
  
  // State pour le formulaire propriétaire
  const [editingProp, setEditingProp] = useState<any>({
    type: 'individual',
    nom: '',
    prenom: '',
    telephone: '',
    telephoneSecondaire: '',
    email: '',
    adresse: '',
    ville: '',
    pays: 'Bénin',
    numeroPiece: '',
    modeGestion: 'direct'
  });

  // State pour le formulaire utilisateur
  const [editingUser, setEditingUser] = useState<any>({
    nom: '',
    prenoms: '',
    telephone: '',
    email: '',
    role: '',
    statut: 'Actif'
  });

  const [autorisation, setAutorisation] = useState({
    utilisateur: '',
    proprietaire: '',
    role: 'viewer',
    modules: {
      biens: false,
      finances: false,
      locataires: false,
      paiements: false,
      contrats: false,
      interventions: false
    },
    niveauAcces: {
      lecture: false,
      ecriture: false,
      suppression: false,
      validation: false
    },
    dateDebut: new Date().toISOString().split('T')[0],
    dateFin: ''
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      // Keep loading only for initial load to avoid flashing
      if (proprietaires.length === 0) setLoading(true);
      
      console.log('Fetching account data...');
      
      const userRole = getRole();
      const promises: Promise<any>[] = [getProprietaires()];
      
      if (userRole === 'admin') {
         promises.push(getUtilisateurs());
      }

      const results = await Promise.all(promises);
      const propData = results[0];
      const userData = results[1] || []; // Will be undefined if not fetched

      console.log('Propriétaires fetched:', propData);
      
      setProprietaires(propData);
      if (userRole === 'admin') {
        setUtilisateurs(userData);
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
      // Don't block the UI completely if one part fails, but here we assume critical failure if catch block is hit
      setError(err.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveProprietaire = async () => {
    try {
      setError(null);
      await saveProprietaire(editingProp);
      setSuccess('Propriétaire enregistré avec succès');
      setEditingProp({
        type: 'individual', nom: '', prenom: '', telephone: '', telephoneSecondaire: '',
        email: '', adresse: '', ville: '', pays: 'Bénin', numeroPiece: '', modeGestion: 'direct'
      });
      await fetchData(); // Wait for fetch to complete
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleSaveUtilisateur = async () => {
    try {
      setError(null);
      await saveUtilisateur(editingUser);
      setSuccess('Utilisateur enregistré avec succès');
      setEditingUser({ nom: '', prenoms: '', telephone: '', email: '', role: '', statut: 'Actif' });
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleSaveAutorisation = async () => {
    try {
      setError(null);
      if (!autorisation.utilisateur || !autorisation.proprietaire) {
        throw new Error('Veuillez sélectionner un utilisateur et un propriétaire');
      }
      await saveAutorisation(autorisation);
      setSuccess('Autorisations mises à jour avec succès');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-base-content/70">Chargement des données du compte...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-base-content">Mon Compte</h1>
          <p className="text-base-content/70">Gestion des propriétaires, utilisateurs et autorisations</p>
        </div>
      </div>

      {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* Navigation par onglets */}
      <div className="flex border-b border-base-200">
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'proprietaires'
              ? 'text-primary border-b-2 border-primary'
              : 'text-base-content/60 hover:text-base-content'
          }`}
          onClick={() => setActiveTab('proprietaires')}
        >
          <div className="flex items-center gap-2">
            <Building2 size={18} />
            Propriétaires
          </div>
        </button>
        
        {getRole() === 'admin' && (
          <>
            <button
              className={`px-4 py-2 font-medium text-sm ${
                activeTab === 'utilisateurs'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-base-content/60 hover:text-base-content'
              }`}
              onClick={() => setActiveTab('utilisateurs')}
            >
              <div className="flex items-center gap-2">
                <Users size={18} />
                Utilisateurs
              </div>
            </button>
            <button
              className={`px-4 py-2 font-medium text-sm ${
                activeTab === 'autorisation'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-base-content/60 hover:text-base-content'
              }`}
              onClick={() => setActiveTab('autorisation')}
            >
              <div className="flex items-center gap-2">
                <Shield size={18} />
                Autorisations
              </div>
            </button>
          </>
        )}
      </div>

      {/* Contenu des onglets */}
      {activeTab === 'proprietaires' && (
        <div className="space-y-6">
          <Card title={editingProp.id ? "Modifier le propriétaire" : "Créer un propriétaire"}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select
                label="Type de propriétaire"
                value={editingProp.type}
                onChange={(e) => setEditingProp({...editingProp, type: e.target.value})}
                options={[
                  { value: 'individual', label: 'Personne physique' },
                  { value: 'company', label: 'Personne morale' }
                ]}
              />
              
              <div>
                <Input 
                  label="Nom ou Raison sociale" 
                  placeholder="Entrez le nom"
                  value={editingProp.nom}
                  onChange={(e) => setEditingProp({...editingProp, nom: e.target.value})}
                />
              </div>
              
              <div>
                <Input 
                  label="Prénom (si personne physique)" 
                  placeholder="Entrez le prénom"
                  value={editingProp.prenom}
                  onChange={(e) => setEditingProp({...editingProp, prenom: e.target.value})}
                />
              </div>
              
              <div>
                <Input 
                  label="Téléphone principal (WhatsApp)" 
                  placeholder="Entrez le numéro WhatsApp" 
                  startIcon={<Phone size={16} />}
                  value={editingProp.telephone}
                  onChange={(e) => setEditingProp({...editingProp, telephone: e.target.value})}
                />
              </div>
              
              <div>
                <Input 
                  label="Téléphone secondaire" 
                  placeholder="Entrez le numéro secondaire" 
                  startIcon={<Phone size={16} />}
                  value={editingProp.telephoneSecondaire}
                  onChange={(e) => setEditingProp({...editingProp, telephoneSecondaire: e.target.value})}
                />
              </div>
              
              <div>
                <Input 
                  label="Email" 
                  placeholder="Entrez l'email" 
                  startIcon={<Mail size={16} />}
                  value={editingProp.email}
                  onChange={(e) => setEditingProp({...editingProp, email: e.target.value})}
                />
              </div>
              
              <div>
                <Input 
                  label="Adresse" 
                  placeholder="Entrez l'adresse"
                  value={editingProp.adresse}
                  onChange={(e) => setEditingProp({...editingProp, adresse: e.target.value})}
                />
              </div>
              
              <div>
                <Input 
                  label="Ville" 
                  placeholder="Entrez la ville"
                  value={editingProp.ville}
                  onChange={(e) => setEditingProp({...editingProp, ville: e.target.value})}
                />
              </div>
              
              <div>
                <Input 
                  label="Pays" 
                  placeholder="Entrez le pays"
                  value={editingProp.pays}
                  onChange={(e) => setEditingProp({...editingProp, pays: e.target.value})}
                />
              </div>
              
              <div>
                <Input 
                  label="Numéro de pièce d'identité ou RCCM" 
                  placeholder="Entrez le numéro"
                  value={editingProp.numeroPiece}
                  onChange={(e) => setEditingProp({...editingProp, numeroPiece: e.target.value})}
                />
              </div>
              
              <Select
                label="Mode de gestion"
                value={editingProp.modeGestion}
                onChange={(e) => setEditingProp({...editingProp, modeGestion: e.target.value})}
                options={[
                  { value: 'direct', label: 'Direct' },
                  { value: 'delegated', label: 'Délégué' }
                ]}
              />
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setEditingProp({ type: 'individual', nom: '', prenom: '', telephone: '', pays: 'Bénin', modeGestion: 'direct' })}>
                Réinitialiser
              </Button>
              <Button variant="primary" onClick={handleSaveProprietaire}>
                {editingProp.id ? "Modifier" : "Enregistrer"}
              </Button>
            </div>
          </Card>

          {/* Liste des propriétaires */}
          <Card title="Liste des propriétaires">
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Type</th>
                    <th>Téléphone</th>
                    <th>Email</th>
                    <th>Ville</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {proprietaires.map((prop) => (
                    <tr key={prop.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="avatar placeholder">
                            <div className="bg-neutral text-neutral-content rounded-full w-8 flex items-center justify-center">
                              <span className="text-xs">{prop.nom ? prop.nom.charAt(0) : '?'}</span>
                            </div>
                          </div>
                          <div>
                            <div className="font-medium">
                              {prop.type === 'individual' ? `${prop.nom} ${prop.prenom || ''}` : prop.nom}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-primary">{prop.type}</span>
                      </td>
                      <td>{prop.telephone}</td>
                      <td>{prop.email}</td>
                      <td>{prop.ville}</td>
                      <td>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setEditingProp(prop)}>
                            <Edit3 size={16} />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-error">
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {proprietaires.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-4 text-base-content/50">Aucun propriétaire trouvé</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'utilisateurs' && (
        <div className="space-y-6">
          <Card title={editingUser.id ? "Modifier l'utilisateur" : "Créer un utilisateur"}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Input 
                  label="Nom" 
                  placeholder="Entrez le nom" 
                  startIcon={<User size={16} />}
                  value={editingUser.nom}
                  onChange={(e) => setEditingUser({...editingUser, nom: e.target.value})}
                />
              </div>
              
              <div>
                <Input 
                  label="Prénoms" 
                  placeholder="Entrez les prénoms" 
                  value={editingUser.prenoms}
                  onChange={(e) => setEditingUser({...editingUser, prenoms: e.target.value})}
                />
              </div>
              
              <div>
                <Input 
                  label="Téléphone (identifiant)" 
                  placeholder="Entrez le numéro" 
                  startIcon={<Phone size={16} />}
                  value={editingUser.telephone}
                  onChange={(e) => setEditingUser({...editingUser, telephone: e.target.value})}
                />
              </div>
              
              <div>
                <Input 
                  label="Email" 
                  placeholder="Entrez l'email" 
                  startIcon={<Mail size={16} />}
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                />
              </div>
              
              <Select
                label="Rôle utilisateur"
                value={editingUser.role}
                onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                placeholder="Sélectionnez un rôle"
                options={[
                  { value: 'manager', label: 'Administrateur agence (Manager)' },
                  { value: 'gestionnaire', label: 'Gestionnaire interne' },
                  { value: 'external_manager', label: 'Gestionnaire externe' },
                  { value: 'recovery_agent', label: 'Agent recouvreur' },
                  { value: 'accountant', label: 'Comptable' },
                  { value: 'owner', label: 'Propriétaire' },
                  { value: 'service_partner', label: 'Partenaire de services' }
                ]}
              />

              {!editingUser.id && (
                <div>
                  <Input 
                    label="Mot de passe initial" 
                    type={showPassword ? "text" : "password"}
                    placeholder="password123"
                    endIcon={showPassword ? <EyeOff size={16} onClick={() => setShowPassword(false)} /> : <Eye size={16} onClick={() => setShowPassword(true)} />}
                    onChange={(e) => setEditingUser({...editingUser, mot_de_passe: e.target.value})}
                  />
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setEditingUser({ nom: '', prenoms: '', telephone: '', email: '', role: '', statut: 'Actif' })}>
                Annuler
              </Button>
              <Button variant="primary" onClick={handleSaveUtilisateur}>
                {editingUser.id ? "Modifier" : "Créer"}
              </Button>
            </div>
          </Card>

          {/* Liste des utilisateurs */}
          <Card title="Liste des utilisateurs">
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Rôle</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {utilisateurs.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="avatar placeholder">
                            <div className="bg-neutral text-neutral-content rounded-full w-8 flex items-center justify-center">
                              <span className="text-xs">{user.nom.charAt(0)}</span>
                            </div>
                          </div>
                          <div>{user.nom} {user.prenoms}</div>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-secondary">{user.role}</span>
                      </td>
                      <td>
                        <span className={`badge ${user.statut === 'Actif' ? 'badge-success' : 'badge-warning'}`}>
                          {user.statut}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setEditingUser(user)}>
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

      {activeTab === 'autorisation' && (
        <div className="space-y-6">
          <Card title="Délégation d'accès">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select
                label="Utilisateur concerné"
                value={autorisation.utilisateur}
                onChange={(e) => setAutorisation({...autorisation, utilisateur: e.target.value})}
                placeholder="Sélectionnez un utilisateur"
                options={utilisateurs.map(user => ({
                  value: user.id,
                  label: `${user.nom} ${user.prenoms}`
                }))}
              />
              
              <Select
                label="Propriétaire ou agence concernée"
                value={autorisation.proprietaire}
                onChange={(e) => setAutorisation({...autorisation, proprietaire: e.target.value})}
                placeholder="Sélectionnez un propriétaire"
                options={proprietaires.map(prop => ({
                  value: prop.id,
                  label: prop.type === 'individual' ? `${prop.nom} ${prop.prenom || ''}` : prop.nom
                }))}
              />

              <Select
                label="Rôle assigné"
                value={autorisation.role}
                onChange={(e) => setAutorisation({...autorisation, role: e.target.value})}
                options={[
                  { value: 'owner', label: 'Propriétaire' },
                  { value: 'manager', label: 'Gestionnaire' },
                  { value: 'accountant', label: 'Comptable' },
                  { value: 'agent', label: 'Agent' },
                  { value: 'viewer', label: 'Lecteur seul' }
                ]}
              />
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Modules autorisés</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(autorisation.modules).map(([key, value]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="checkbox checkbox-sm" 
                        checked={value}
                        onChange={(e) => setAutorisation({
                          ...autorisation,
                          modules: {...autorisation.modules, [key]: e.target.checked}
                        })}
                      />
                      <span className="capitalize">{key}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Niveau d'accès spécifique</label>
                <div className="flex gap-6">
                  {Object.entries(autorisation.niveauAcces).map(([key, value]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="checkbox checkbox-sm checkbox-secondary" 
                        checked={value}
                        onChange={(e) => setAutorisation({
                          ...autorisation,
                          niveauAcces: {...autorisation.niveauAcces, [key]: e.target.checked}
                        })}
                      />
                      <span className="capitalize">{key}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <Input 
                  label="Date de début" 
                  type="date"
                  value={autorisation.dateDebut}
                  onChange={(e) => setAutorisation({...autorisation, dateDebut: e.target.value})}
                />
              </div>
              
              <div>
                <Input 
                  label="Date de fin" 
                  type="date"
                  value={autorisation.dateFin}
                  onChange={(e) => setAutorisation({...autorisation, dateFin: e.target.value})}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="primary" onClick={handleSaveAutorisation}>
                Appliquer les autorisations
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default MonCompte;
