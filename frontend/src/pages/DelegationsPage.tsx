// frontend/src/pages/DelegationsPage.tsx
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Shield, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Search
} from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import ConfirmModal from '../components/ui/ConfirmModal';
import { getTeam, addTeamMember, removeTeamMember } from '../api/delegationApi';
import type { TeamMember, Permissions } from '../api/delegationApi';
import { motion, AnimatePresence } from 'framer-motion';

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
  
  const [tempPassword, setTempPassword] = useState('');
  const [createdEmail, setCreatedEmail] = useState('');
  
  // State for delete confirmation modal
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; memberId: number | null; memberName: string }>({
    isOpen: false,
    memberId: null,
    memberName: ''
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
      const response = await addTeamMember(newEmail, newRole, targetPermissions);
      
      if (response.isNewUser && response.tempPassword) {
          setCreatedEmail(newEmail);
          setTempPassword(response.tempPassword);
          setSuccess('Compte créé et membre ajouté !');
      } else {
          setSuccess('Membre ajouté avec succès !');
      }
      
      setShowAddModal(false);
      setNewEmail(''); 
      fetchTeam();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'ajout");
    }
  };


  const confirmRemoveMember = (id: number, name: string) => {
    setDeleteConfirm({ isOpen: true, memberId: id, memberName: name });
  };

  const handleRemoveMember = async () => {
    if (deleteConfirm.memberId === null) return;
    
    try {
      setError('');
      await removeTeamMember(deleteConfirm.memberId);
      setSuccess(`${deleteConfirm.memberName} retiré de l'équipe.`);
      fetchTeam();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la suppression");
    } finally {
      setDeleteConfirm({ isOpen: false, memberId: null, memberName: '' });
    }
  };

  const handlePermissionChange = (key: keyof Permissions) => {
    setTargetPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <motion.div 
      className="p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-base-content tracking-tight">
            Mon Équipe <span className="text-primary">.</span>
          </h1>
          <p className="text-base-content/60 font-medium mt-1">
            Gérez les accès et les permissions de vos collaborateurs.
          </p>
        </div>
        <Button 
            variant="primary" 
            className="rounded-full px-6 h-10 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all font-semibold"
            onClick={() => setShowAddModal(true)}
        >
          <UserPlus size={18} className="mr-2" />
          Ajouter un membre
        </Button>
      </motion.div>

      {/* Messages */}
      <AnimatePresence>
      {error && (
        <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} exit={{opacity:0}} className="alert alert-error shadow-lg">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </motion.div>
      )}
      {success && (
        <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} exit={{opacity:0}} className="alert alert-success shadow-lg text-white">
          <CheckCircle size={18} />
          <span>{success}</span>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Team List */}
      <motion.div variants={itemVariants}>
      <Card className="border-none shadow-xl bg-base-100 p-0 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr className="bg-base-200/50">
              <th className="py-4 pl-6 text-base-content/60 font-semibold">Collaborateur</th>
              <th className="text-base-content/60 font-semibold">Rôle</th>
              <th className="text-base-content/60 font-semibold">Permissions</th>
              <th className="text-base-content/60 font-semibold">Statut</th>
              <th className="pr-6 text-right text-base-content/60 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8"><span className="loading loading-spinner text-primary"></span></td></tr>
            ) : team.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">Aucun membre dans votre équipe pour le moment.</td></tr>
            ) : (
              team.map(member => (
                <tr key={member.id} className="hover:bg-base-200/50 transition-colors">
                  <td className="pl-6">
                    <div className="flex items-center gap-3">
                      <div className="avatar placeholder">
                        <div className={`rounded-full w-10 h-10 flex items-center justify-center font-bold text-white shadow-md ${member.role === 'owner' ? 'bg-primary' : 'bg-gray-400'}`}>
                          <span className="text-sm">{member.nom.substring(0, 2).toUpperCase()}</span>
                        </div>
                      </div>
                      <div>
                        <div className="font-bold text-base-content/90">{member.nom}</div>
                        <div className="text-xs text-gray-400 font-medium">{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${member.role === 'owner' ? 'badge-primary' : 'badge-ghost text-base-content/60'} font-medium`}>
                      {member.role === 'owner' ? 'Propriétaire' : member.role === 'manager' ? 'Gestionnaire' : 'Comptable'}
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                       {member.can_view_finances && <span className="badge badge-xs badge-success gap-1 py-2 px-3 text-white">Finances</span>}
                       {member.can_edit_properties && <span className="badge badge-xs badge-info gap-1 py-2 px-3 text-white">Biens</span>}
                       {member.can_manage_tenants && <span className="badge badge-xs badge-warning gap-1 py-2 px-3 text-white">Locataires</span>}
                    </div>
                  </td>
                  <td>
                    {member.is_active ? (
                      <span className="text-success text-xs font-bold flex items-center gap-1"><CheckCircle size={14}/> ACTIF</span>
                    ) : (
                      <span className="text-error text-xs font-bold flex items-center gap-1"><XCircle size={14}/> INACTIF</span>
                    )}
                  </td>
                  <td className="pr-6 text-right">
                    {member.role !== 'owner' && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="btn-square btn-xs text-gray-400 hover:text-error hover:bg-error/10 transition-colors"
                        onClick={() => confirmRemoveMember(member.id, member.nom)} 
                      >
                        <Trash2 size={16} />
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </Card>
      </motion.div>

      {/* Add Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Inviter un collaborateur"
        // footer prop removed or handled inside component if using newer Modal
      >
        <div className="space-y-6 pt-4">
          <Input 
            label="Email du collaborateur" 
            value={newEmail} 
            onChange={(e) => setNewEmail(e.target.value)} 
            placeholder="email@exemple.com"
          />
          
          <div>
            <label className="block text-sm font-bold text-base-content/80 mb-2">Rôle</label>
            <select 
              className="select select-bordered w-full bg-base-200 focus:bg-base-100 transition-colors"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
            >
              <option value="manager">Gestionnaire</option>
              <option value="accountant">Comptable</option>
              <option value="viewer">Observateur</option>
            </select>
          </div>

          <div className="bg-base-200 p-4 rounded-xl border border-base-200 space-y-3">
             <h4 className="font-bold text-sm text-base-content/80 flex items-center gap-2"><Shield size={16} className="text-primary"/> Permissions Spécifiques</h4>
             
             <div className="space-y-2">
             <label className="flex items-center gap-3 cursor-pointer hover:bg-base-100 p-2 rounded-lg transition-colors">
               <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" 
                 checked={targetPermissions.can_view_finances} 
                 onChange={() => handlePermissionChange('can_view_finances')}
               />
               <span className="text-sm font-medium text-base-content/70">Voir les finances</span>
             </label>

             <label className="flex items-center gap-3 cursor-pointer hover:bg-base-100 p-2 rounded-lg transition-colors">
               <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" 
                 checked={targetPermissions.can_edit_properties} 
                 onChange={() => handlePermissionChange('can_edit_properties')}
               />
               <span className="text-sm font-medium text-base-content/70">Modifier les biens</span>
             </label>

             <label className="flex items-center gap-3 cursor-pointer hover:bg-base-100 p-2 rounded-lg transition-colors">
               <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" 
                 checked={targetPermissions.can_manage_tenants} 
                 onChange={() => handlePermissionChange('can_manage_tenants')}
               />
               <span className="text-sm font-medium text-base-content/70">Gérer les locataires</span>
             </label>
             </div>
          </div>


          <div className="flex justify-end gap-3 pt-4">
             <Button variant="ghost" onClick={() => setShowAddModal(false)}>Annuler</Button>
             <Button variant="primary" onClick={handleAddMember}>Envoyer l'invitation</Button>
          </div>
        </div>
      </Modal>

      {/* Credentials Modal (For new users) */}
      <Modal
        isOpen={!!tempPassword}
        onClose={() => setTempPassword('')}
        title="Compte créé avec succès"
      >
        <div className="space-y-4 pt-2">
            <div className="alert alert-success shadow-sm">
                <CheckCircle size={20} />
                <span>Le collaborateur a été ajouté à votre équipe.</span>
            </div>

            <p className="text-base-content/70">
                L'utilisateur n'avait pas de compte. Un compte a été créé automatiquement.
                <br/>
                <strong>Veuillez lui transmettre ses identifiants :</strong>
            </p>

            <div className="bg-base-300 p-4 rounded-xl border border-base-300 select-all">
                <div className="grid grid-cols-[80px_1fr] gap-2">
                    <span className="font-bold text-base-content/60">Email :</span>
                    <span className="font-mono text-base-content">{createdEmail}</span>
                    
                    <span className="font-bold text-base-content/60">Mot de passe :</span>
                    <span className="font-mono text-primary font-bold text-lg">{tempPassword}</span>
                </div>
            </div>

            <p className="text-xs text-base-content/60 flex items-center gap-1">
                <AlertTriangle size={12} />
                Il devra changer ce mot de passe dès sa première connexion.
            </p>

            <div className="flex justify-end pt-2">
                <Button variant="primary" onClick={() => setTempPassword('')}>J'ai noté les informations</Button>
            </div>
        </div>
      </Modal>

      {/* Confirmation Modal for Member Deletion */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="Retirer le collaborateur"
        message={`Voulez-vous vraiment retirer "${deleteConfirm.memberName}" de votre équipe ? Cette action révoquera immédiatement tous ses accès.`}
        confirmLabel="Retirer"
        cancelLabel="Annuler"
        onConfirm={handleRemoveMember}
        onClose={() => setDeleteConfirm({ isOpen: false, memberId: null, memberName: '' })}
        type="danger"
      />
    </motion.div>
  );
};


export default DelegationsPage;
