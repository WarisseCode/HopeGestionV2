import React, { useState, useEffect } from 'react';
import { Shield, Save, Check, X, AlertTriangle, UserCog, LayoutGrid } from 'lucide-react';
import { accountApi } from '../api/accountApi';
import { getRole } from '../api/authApi';
import Alert from './ui/Alert';
import { motion, AnimatePresence } from 'framer-motion';

interface PermissionRow {
    role: string;
    module: string;
    can_read: boolean;
    can_write: boolean;
    can_delete: boolean;
    can_validate: boolean;
}

const MODULES = ['biens', 'locataires', 'owners', 'finance', 'contrats', 'documents', 'users'];
const ROLES = ['gestionnaire', 'manager', 'comptable', 'agent_recouvreur']; 

const Permissions: React.FC = () => {
    const [permissions, setPermissions] = useState<PermissionRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [activeRole, setActiveRole] = useState('gestionnaire');
    
    const userRole = getRole();
    const isAdmin = userRole === 'admin';

    useEffect(() => {
        loadPermissions();
    }, []);

    const loadPermissions = async () => {
        try {
            const data = await accountApi.getPermissionsMatrix();
            setPermissions(data);
        } catch (err) {
            console.error(err);
            setError("Impossible de charger la matrice des permissions.");
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (role: string, module: string, field: keyof PermissionRow) => {
        if (!isAdmin) return;

        // Find current state
        const current = permissions.find(p => p.role === role && p.module === module);
        
        // Optimistic update
        const updatedPermissions = permissions.map(p => {
            if (p.role === role && p.module === module) {
                return { ...p, [field]: !p[field] }; // Toggle boolean
            }
            return p;
        });

        // Insert default layout if row missing
        let rowToUpdate = updatedPermissions.find(p => p.role === role && p.module === module);
        if (!rowToUpdate) {
            rowToUpdate = { 
                role, module, 
                can_read: false, can_write: false, can_delete: false, can_validate: false,
                [field]: true 
            };
            updatedPermissions.push(rowToUpdate);
        }

        setPermissions(updatedPermissions);

        try {
            await accountApi.updatePermission(rowToUpdate);
        } catch (err) {
            setError("Erreur lors de la sauvegarde.");
            loadPermissions(); // Revert
        }
    };

    const getPermission = (role: string, module: string) => {
        return permissions.find(p => p.role === role && p.module === module) || {
            role, module, can_read: false, can_write: false, can_delete: false, can_validate: false
        };
    };

    const getModuleLabel = (module: string) => {
        switch(module) {
            case 'owners': return 'Propriétaires';
            case 'users': return 'Utilisateurs';
            case 'biens': return 'Biens Immobiliers';
            case 'locataires': return 'Locataires';
            case 'finance': return 'Comptabilité';
            case 'contrats': return 'Contrats';
            case 'documents': return 'Documents';
            default: return module.charAt(0).toUpperCase() + module.slice(1);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Chargement des permissions...</div>;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-2">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <UserCog className="text-primary" /> Rôles & Permissions
                    </h2>
                    <p className="text-gray-500 text-sm">Définissez ce que chaque rôle peut faire dans l'application.</p>
                </div>
                {!isAdmin && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-full flex items-center gap-1 self-start md:self-auto">
                        <AlertTriangle size={12} /> Lecture seule
                    </span>
                )}
            </div>

            {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}

            {/* Role Tabs */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl overflow-x-auto scrollbar-hide">
                {ROLES.map(role => (
                    <button
                        key={role}
                        onClick={() => setActiveRole(role)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize whitespace-nowrap transition-all ${
                            activeRole === role 
                            ? 'bg-white text-primary shadow-sm ring-1 ring-gray-200' 
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                        }`}
                    >
                        {role.replace('_', ' ')}
                    </button>
                ))}
            </div>

            {/* Permissions List for Active Role */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                    {MODULES.map(module => {
                        const perm = getPermission(activeRole, module);
                        return (
                            <motion.div 
                                key={module}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-center gap-3 mb-4 border-b border-gray-50 pb-3">
                                    <div className={`p-2 rounded-lg ${perm.can_read ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'}`}>
                                        <LayoutGrid size={18} />
                                    </div>
                                    <h3 className="font-semibold text-gray-800">{getModuleLabel(module)}</h3>
                                </div>

                                <div className="space-y-3">
                                    <PermissionToggle 
                                        label="Lecture" 
                                        desc="Voir les données"
                                        checked={perm.can_read} 
                                        onChange={() => handleToggle(activeRole, module, 'can_read')}
                                        disabled={!isAdmin}
                                    />
                                    <PermissionToggle 
                                        label="Écriture" 
                                        desc="Créer et modifier"
                                        checked={perm.can_write} 
                                        onChange={() => handleToggle(activeRole, module, 'can_write')}
                                        disabled={!isAdmin}
                                    />
                                    <PermissionToggle 
                                        label="Validation" 
                                        desc="Approver des actions"
                                        checked={perm.can_validate} 
                                        onChange={() => handleToggle(activeRole, module, 'can_validate')}
                                        disabled={!isAdmin}
                                    />
                                    <PermissionToggle 
                                        label="Suppression" 
                                        desc="Supprimer des enregistrements"
                                        checked={perm.can_delete} 
                                        onChange={() => handleToggle(activeRole, module, 'can_delete')}
                                        disabled={!isAdmin}
                                        danger
                                    />
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
            
            <div className="mt-6 text-center">
                 <p className="text-xs text-gray-400">
                    * Les modifications sont enregistrées automatiquement.
                </p>
            </div>
        </div>
    );
};

const PermissionToggle = ({ label, desc, checked, onChange, disabled, danger }: any) => {
    return (
        <label className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
            disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-50'
        }`}>
            <div>
                <div className={`text-sm font-medium ${danger ? 'text-red-600' : 'text-gray-700'}`}>{label}</div>
                <div className="text-[10px] text-gray-400">{desc}</div>
            </div>
            <div className="relative">
                <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={checked} 
                    onChange={onChange}
                    disabled={disabled}
                />
                <div className={`w-9 h-5 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-300 transition-colors ${
                    checked 
                        ? (danger ? 'bg-red-500' : 'bg-green-500') 
                        : 'bg-gray-200'
                }`}></div>
                <div className={`absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-4 w-4 transition-all ${
                    checked ? 'translate-x-full border-white' : ''
                }`}></div>
            </div>
        </label>
    );
};

export default Permissions;
