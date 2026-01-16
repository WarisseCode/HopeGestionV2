// frontend/src/pages/MonCompte.tsx
import React, { useState } from 'react';
import { 
  Users, 
  Shield, 
  Building2, 
} from 'lucide-react';
import Alert from '../components/ui/Alert';
import CompteUtilisateurs from "../components/CompteUtilisateurs";
import CompteProprietaires from "../components/CompteProprietaires";
import CompteProfil from "../components/CompteProfil";
import Permissions from '../components/Permissions';
import { getRole } from '../api/authApi';
import { motion, AnimatePresence } from 'framer-motion';

import { useUser } from '../contexts/UserContext';
// ... existing imports ...

const MonCompte: React.FC = () => {
  const { user } = useUser(); // Use context
  const [activeTab, setActiveTab] = useState<'proprietaires' | 'utilisateurs' | 'autorisation' | 'profile'>('proprietaires');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };
  
  // Check permission for Users tab
  // Admin/Owner/Gestionnaire usually have full access, but we rely on the backend permissions object which is now standardized for all.
  // Fallback to role check if permissions object is missing (e.g. legacy or loading issue), but prefer permissions.
  const showUsersTab = user?.permissions?.users_read || ['admin', 'gestionnaire', 'proprietaire'].includes(user?.role || '');

  return (
    <motion.div 
      className="p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ... Header ... */}

      {/* Tabs */}
     <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-center bg-white rounded-2xl p-2 shadow-sm border border-gray-100">
        <div className="flex p-1 bg-gray-100/50 rounded-xl overflow-x-auto">
             <button
                onClick={() => setActiveTab('proprietaires')}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'proprietaires' ? 'bg-white text-primary shadow-md' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
                <Building2 size={18} />
                Propriétaires
            </button>
            {showUsersTab && (
                <button
                    onClick={() => setActiveTab('utilisateurs')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'utilisateurs' ? 'bg-white text-primary shadow-md' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <Users size={18} />
                    Utilisateurs
                </button>
            )}
            <button
                onClick={() => setActiveTab('autorisation')}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'autorisation' ? 'bg-white text-primary shadow-md' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
                <Shield size={18} />
                Permissions
            </button>
             <button
                onClick={() => setActiveTab('profile')}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'profile' ? 'bg-white text-primary shadow-md' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
                <Users size={18} />
                Mon Profil
            </button>
        </div>
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'proprietaires' && (
            <motion.div 
            key="proprietaires"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            >
                <CompteProprietaires />
            </motion.div>
        )}

        {activeTab === 'utilisateurs' && (
             <motion.div 
             key="utilisateurs"
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             >
                <CompteUtilisateurs />
             </motion.div>
        )}

        {activeTab === 'autorisation' && (
             <motion.div 
             key="autorisation"
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             >
                <Permissions />
             </motion.div>
        )}

        {activeTab === 'profile' && (
             <motion.div 
             key="profile"
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             >
                <CompteProfil />
             </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MonCompte;
