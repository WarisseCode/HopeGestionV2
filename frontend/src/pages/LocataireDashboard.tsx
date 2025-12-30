// frontend/src/pages/LocataireDashboard.tsx
import React from 'react';
import { 
  Home, 
  FileText, 
  Wallet, 
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  MoreVertical,
  Bell
} from 'lucide-react';
import Card from '../components/ui/Card';
import { motion } from 'framer-motion';
import { useUser } from '../contexts/UserContext';
import { KPICard, QuickActions, ActivityFeed, UpcomingEvents } from '../components/dashboard';
import type { Activity } from '../components/dashboard/ActivityFeed';
import type { UpcomingEvent } from '../components/dashboard/UpcomingEvents';
import Button from '../components/ui/Button';

const LocataireDashboard: React.FC = () => {
  const { user, stats, loading } = useUser();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1, 
      transition: { staggerChildren: 0.05 } 
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  // Activités récentes
  const activities: Activity[] = [
    { id: 1, type: 'payment', title: 'Paiement effectué', description: 'Loyer décembre via Mobile Money', time: 'Il y a 2 jours' },
    { id: 2, type: 'intervention', title: 'Plomberie', description: 'Réparation fuite terminée', time: 'Il y a 1 semaine' },
  ];

  // Mes événements à venir
  const upcomingEvents: UpcomingEvent[] = [
    { id: 1, type: 'rent', title: 'Prochain loyer', description: 'Loyer janvier 2025', date: '05 Jan', daysUntil: 8 },
    { id: 2, type: 'contract', title: 'Renouvellement', description: 'Expiration du bail', date: '28 Mar', daysUntil: 90 },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Non défini';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-base-100">
        <div className="loading loading-spinner text-primary"></div>
      </div>
    );
  }

  // Stats spécifiques au locataire
  const nomLogement = (stats as any)?.nomLogement || 'Apt A01 - Résidence La Paix';
  const loyerMensuel = (stats as any)?.loyerMensuel || 80000;
  const prochainPaiement = (stats as any)?.prochainPaiement;
  const statutContrat = (stats as any)?.statutContrat || 'actif';

  return (
    <motion.div 
      className="p-4 md:p-8 space-y-8 max-w-[1600px] mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Section */}
      <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-base-content tracking-tight">
            Mon Espace <span className="text-primary">.</span>
          </h1>
          <p className="text-base-content/60 font-medium mt-1">
            Bonjour {user?.nom || 'Locataire'}, bienvenue chez vous.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
             <Button variant="ghost" className="btn-circle relative">
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
             </Button>
             <div className="text-right hidden md:block">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Mon Logement</p>
                <p className="font-bold text-gray-800">{nomLogement}</p>
             </div>
        </div>
      </motion.div>

      {/* KPI Grid */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={itemVariants}
      >
        <KPICard 
          icon={Wallet} 
          label="Loyer Mensuel" 
          value={formatCurrency(loyerMensuel)} 
          color="blue" 
          trend={{ value: "Payé", label: "Décembre 2024", positive: true }}

        />
        <KPICard 
          icon={FileText} 
          label="Statut du Bail" 
          value={statutContrat === 'actif' ? 'Actif' : 'Inactif'} 
          color="green" 
          trend={{ value: "90j", label: "restants", positive: true }}
        />
        <KPICard 
          icon={Calendar} 
          label="Prochaine Échéance" 
          value="05 Jan"
          // value={formatDate(prochainPaiement)} 
          color="purple" 
          trend={{ value: "J-8", label: "avant retard", positive: true }}
        />
         <KPICard 
          icon={AlertCircle} 
          label="Incidents" 
          value="0" 
          color="pink" 
          trend={{ value: "R.A.S.", label: "Tout est calme", positive: true }}
        />
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Column (Info & History) */}
        <div className="xl:col-span-2 space-y-8">
             {/* Info Logement Card */}
             <motion.div variants={itemVariants}>
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 flex flex-col md:flex-row gap-6 items-start">
                     <div className="w-full md:w-1/3 rounded-xl overflow-hidden shadow-inner bg-gray-100 aspect-video md:aspect-square relative">
                        {/* Placeholder image for apartment */}
                         <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                             <Home size={48} />
                         </div>
                     </div>
                     <div className="flex-1 w-full space-y-4">
                         <div className="flex justify-between items-start">
                             <div>
                                <h3 className="text-xl font-bold text-gray-900">{nomLogement}</h3>
                                <p className="text-gray-500">Haie vive, Cotonou • 2ème Étage</p>
                             </div>
                             <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-bold rounded-full">En règle</span>
                         </div>
                         
                         <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                             <div>
                                 <p className="text-xs text-gray-400 font-semibold uppercase">Bailleur</p>
                                 <p className="font-medium">Hope Immobilier</p>
                             </div>
                              <div>
                                 <p className="text-xs text-gray-400 font-semibold uppercase">Début du contrat</p>
                                 <p className="font-medium">01 Jan 2024</p>
                             </div>
                              <div>
                                 <p className="text-xs text-gray-400 font-semibold uppercase">Caution Déposée</p>
                                 <p className="font-medium">{formatCurrency(loyerMensuel * 3)}</p>
                             </div>
                              <div>
                                 <p className="text-xs text-gray-400 font-semibold uppercase">Gestionnaire</p>
                                 <p className="font-medium">M. Paul</p>
                             </div>
                         </div>
                     </div>
                </div>
             </motion.div>

            {/* Payment History Card (Styled as list) */}
            <motion.div variants={itemVariants}>
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-gray-800">Historique des Paiements</h3>
                        <Button variant="ghost" className="btn-sm text-primary">Tout voir</Button>
                    </div>
                    <div className="p-0">
                         {/* Mock Payment List */}
                        {[1, 2, 3].map((_, idx) => (
                             <div key={idx} className="flex items-center justify-between p-4 px-6 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                                        <CheckCircle2 size={18} className="text-green-600" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800">Loyer {['Décembre', 'Novembre', 'Octobre'][idx]}</p>
                                        <p className="text-xs text-gray-400">05/{12-idx}/2024 • Mobile Money</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-gray-900">{formatCurrency(loyerMensuel)}</p>
                                    <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-md uppercase tracking-wide">Payé</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
            
             {/* Quick Actions */}
             <motion.div variants={itemVariants}>
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4">Mes Démarches</h3>
                    <QuickActions userType="locataire" />
                </div>
            </motion.div>

             {/* Upcoming Events */}
            <motion.div variants={itemVariants}>
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4">À Venir</h3>
                    <UpcomingEvents events={upcomingEvents} userType="locataire" />
                </div>
            </motion.div>

            {/* Recent Activity Timeline */}
             <motion.div variants={itemVariants}>
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4">Journal</h3>
                    <ActivityFeed activities={activities} />
                </div>
            </motion.div>

        </div>

      </div>
    </motion.div>
  );
};

export default LocataireDashboard;