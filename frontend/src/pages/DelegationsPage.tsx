// frontend/src/pages/DelegationsPage.tsx
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Shield, 
  CheckCircle, 
  XCircle,
  AlertTriangle
} from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { getTeam, addTeamMember, removeTeamMember } from '../api/delegationApi';
import type { TeamMember, Permissions } from '../api/delegationApi';

const DelegationsPage: React.FC = () => {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('manager');
  const [targetPermissions, setTargetPermissions] = useState<Permissions>({
    can_view_finances: false,
    can_edit_properties: false,
    can_manage_tenants: false
  });

  const fetchTeam = async () => {
    try {
      setLoading(true);
      setError('');
      const members = await getTeam();
      setTeam(members);
    } catch (err: any) {
      setError(err.message || 'Erreur chargement équipe');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handleAddMember = async () => {
    try {
      setError('');
      setSuccess('');
      await addTeamMember(newEmail, newRole, targetPermissions);
      setSuccess('Membre ajouté avec succès !');
      setShowAddModal(false);
      setNewEmail('');
      fetchTeam();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'ajout");
    }
  };

  const handleRemoveMember = async (id: number, name: string) => {
    if (!window.confirm(`Voulez-vous retirer ${name} de votre équipe ?`)) return;
    try {
      setError('');
      await removeTeamMember(id);
      setSuccess(`${name} retiré de l'équipe.`);
      fetchTeam();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la suppression");
    }
  };

  const handlePermissionChange = (key: keyof Permissions) => {
    setTargetPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Mon Équipe</h1>
          <p className="text-sm text-base-content/60">Gérez les accès de vos collaborateurs</p>
        </div>
        <Button variant="primary" onClick={() => setShowAddModal(true)}>
          <UserPlus size={18} className="mr-2" />
          Ajouter un membre
        </Button>
      </div>

      {/* Messages */}
      {error && (
        <div className="alert alert-error text-sm">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="alert alert-success text-sm">
          <CheckCircle size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* Team List */}
      <div className="bg-base-100 rounded-xl border border-base-200 overflow-hidden shadow-sm">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Collaborateur</th>
              <th>Rôle</th>
              <th>Permissions</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8">Chargement...</td></tr>
            ) : team.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 opacity-50">Aucun membre dans votre équipe pour le moment.</td></tr>
            ) : (
              team.map(member => (
                <tr key={member.id} className="hover:bg-base-200/50">
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="avatar placeholder">
                        <div className="bg-neutral-focus text-neutral-content rounded-full w-8">
                          <span className="text-xs">{member.nom.substring(0, 2).toUpperCase()}</span>
                        </div>
                      </div>
                      <div>
                        <div className="font-bold">{member.nom}</div>
                        <div className="text-xs opacity-50">{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${member.role === 'owner' ? 'badge-primary' : 'badge-ghost'}`}>
                      {member.role === 'owner' ? 'Propriétaire' : member.role === 'manager' ? 'Gestionnaire' : 'Comptable'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                       {member.permissions?.can_view_finances && <span className="badge badge-xs badge-success" title="Voir Finances">€</span>}
                       {member.permissions?.can_edit_properties && <span className="badge badge-xs badge-info" title="Éditer Biens">🏠</span>}
                       {member.permissions?.can_manage_tenants && <span className="badge badge-xs badge-warning" title="Gérer Locataires">👥</span>}
                       {/* Note: API returns booleans directly in member object as per query, mapping required or direct access */}
                       {member.can_view_finances && <span className="badge badge-xs badge-outline badge-success" title="Voir Finances">Finances</span>}
                       {member.can_manage_tenants && <span className="badge badge-xs badge-outline badge-warning" title="Gérer Locataires">Locataires</span>}
                    </div>
                  </td>
                  <td>
                    {member.is_active ? (
                      <span className="text-success text-xs flex items-center gap-1"><CheckCircle size={12}/> Actif</span>
                    ) : (
                      <span className="text-error text-xs flex items-center gap-1"><XCircle size={12}/> Inactif</span>
                    )}
                  </td>
                  <td>
                    {member.role !== 'owner' && (
                      <button 
                        onClick={() => handleRemoveMember(member.id, member.nom)} 
                        className="btn btn-ghost btn-sm btn-square text-error"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Inviter un collaborateur"
        footer={
          <Button variant="primary" className="w-full" onClick={handleAddMember}>
            Envoyer l'invitation
          </Button>
        }
      >
        <div className="space-y-4">
          <Input 
            label="Email du collaborateur" 
            value={newEmail} 
            onChange={(e) => setNewEmail(e.target.value)} 
            placeholder="email@exemple.com"
          />
          
          <div>
            <label className="block text-sm font-medium mb-1">Rôle</label>
            <select 
              className="select select-bordered w-full"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
            >
              <option value="manager">Gestionnaire</option>
              <option value="accountant">Comptable</option>
              <option value="viewer">Observateur</option>
            </select>
          </div>

          <div className="bg-base-200 p-4 rounded-lg space-y-2">
             <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Shield size={14}/> Permissions</h4>
             
             <label className="flex items-center gap-2 cursor-pointer">
               <input type="checkbox" className="checkbox checkbox-xs" 
                 checked={targetPermissions.can_view_finances} 
                 onChange={() => handlePermissionChange('can_view_finances')}
               />
               <span className="text-sm">Voir les finances</span>
             </label>

             <label className="flex items-center gap-2 cursor-pointer">
               <input type="checkbox" className="checkbox checkbox-xs" 
                 checked={targetPermissions.can_edit_properties} 
                 onChange={() => handlePermissionChange('can_edit_properties')}
               />
               <span className="text-sm">Modifier les biens</span>
             </label>

             <label className="flex items-center gap-2 cursor-pointer">
               <input type="checkbox" className="checkbox checkbox-xs" 
                 checked={targetPermissions.can_manage_tenants} 
                 onChange={() => handlePermissionChange('can_manage_tenants')}
               />
               <span className="text-sm">Gérer les locataires</span>
             </label>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DelegationsPage;
