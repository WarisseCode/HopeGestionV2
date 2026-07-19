// frontend/src/pages/MonCompte.tsx
import React, { useState } from 'react';
import { Users, Shield } from 'lucide-react';
import CompteUtilisateurs from "../components/CompteUtilisateurs";
import Permissions from '../components/Permissions';
import { motion, AnimatePresence } from 'framer-motion';

import { useUser } from '../contexts/UserContext';

const MonCompte: React.FC = () => {
  const { user } = useUser(); // Use context

  // Onglets d'administration du compte. Le profil personnel est dans « Paramètres ».
  // La gestion des propriétaires a sa propre page (« Propriétaires ») → retirée d'ici.
  const [activeTab, setActiveTab] = useState<'utilisateurs' | 'autorisation'>('utilisateurs');

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

  // Check permission for Users tab
  const showUsersTab = user?.permissions?.users_read || ['admin', 'gestionnaire', 'proprietaire', 'owner'].includes(user?.role || '');

  return (
    <motion.div
      className="space-y-8 max-w-[1600px] mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ... Header ... */}

      {/* Tabs */}
     <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-center bg-base-100 rounded-2xl p-2 shadow-sm border border-base-200">
        <div className="flex p-1 bg-base-300/50 rounded-xl overflow-x-auto">
            {showUsersTab && (
                <button
                    onClick={() => setActiveTab('utilisateurs')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'utilisateurs' ? 'bg-base-100 text-primary shadow-md' : 'text-base-content/60 hover:text-base-content/80'
                    }`}
                >
                    <Users size={18} />
                    Utilisateurs
                </button>
            )}
            <button
                onClick={() => setActiveTab('autorisation')}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'autorisation' ? 'bg-base-100 text-primary shadow-md' : 'text-base-content/60 hover:text-base-content/80'
                }`}
            >
                <Shield size={18} />
                Permissions
            </button>
        </div>
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
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
      </AnimatePresence>
    </motion.div>
  );
};

export default MonCompte;
