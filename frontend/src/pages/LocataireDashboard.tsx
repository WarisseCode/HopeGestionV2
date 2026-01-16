// frontend/src/pages/LocataireDashboard.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Home, 
  FileText, 
  Wallet, 
  Calendar,
  CheckCircle2,
  AlertCircle,
  Bell,
  CreditCard,
  Download,
  Phone,
  MessageSquare
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useUser } from '../contexts/UserContext';
import { 
  KPICard, 
  QuickActions, 
  ActivityFeed, 
  UpcomingEvents,
  DashboardSkeleton
} from '../components/dashboard';
import type { Activity } from '../components/dashboard/ActivityFeed';
import type { UpcomingEvent } from '../components/dashboard/UpcomingEvents';
import Button from '../components/ui/Button';

const LocataireDashboard: React.FC = () => {
  const { user, stats, loading } = useUser();
  const navigate = useNavigate();

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

  if (loading) {
    return <DashboardSkeleton type="locataire" />;
  }

  // Stats spécifiques au locataire
  const nomLogement = (stats as any)?.nomLogement || 'Apt A01 - Résidence La Paix';
  const loyerMensuel = (stats as any)?.loyerMensuel || 80000;
  const statutContrat = (stats as any)?.statutContrat || 'actif';
  const joursAvantEcheance = 8;

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
            {user?.nom || 'Locataire'} <span className="text-primary">.</span>
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

      {/* Next Payment Alert Banner */}
      <motion.div variants={itemVariants}>
        <div className={`rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
          joursAvantEcheance <= 5 ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gradient-to-r from-primary to-primary-focus'
        } text-white`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-white/80 text-sm font-medium">Prochain paiement</p>
              <p className="text-2xl font-bold">{formatCurrency(loyerMensuel)}</p>
              <p className="text-white/70 text-sm">Échéance dans {joursAvantEcheance} jours</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="bg-white text-primary hover:bg-white/90 font-semibold shadow-lg"
            onClick={() => navigate('/dashboard/finances/mobile-money')}
          >
            <CreditCard size={18} className="mr-2" />
            Payer maintenant
          </Button>
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
          color="purple" 
          trend={{ value: `J-${joursAvantEcheance}`, label: "avant retard", positive: joursAvantEcheance > 5 }}
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
                     <div className="w-full md:w-1/3 rounded-xl overflow-hidden shadow-inner bg-gradient-to-br from-primary/5 to-primary/10 aspect-video md:aspect-square relative">
                        <div className="absolute inset-0 flex items-center justify-center">
                           <Home size={48} className="text-primary/30" />
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

                         <div className="flex gap-2 pt-4">
                           <Button variant="ghost" size="sm" className="flex-1">
                             <Phone size={16} className="mr-2" />
                             Appeler
                           </Button>
                           <Button variant="ghost" size="sm" className="flex-1">
                             <MessageSquare size={16} className="mr-2" />
                             Message
                           </Button>
                           <Button variant="ghost" size="sm" className="flex-1">
                             <Download size={16} className="mr-2" />
                             Bail PDF
                           </Button>
                         </div>
                     </div>
                </div>
             </motion.div>

            {/* Payment History Card */}
            <motion.div variants={itemVariants}>
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-gray-800">Historique des Paiements</h3>
                        <Button variant="ghost" className="btn-sm text-primary" onClick={() => navigate('/dashboard/finances')}>
                          Tout voir
                        </Button>
                    </div>
                    <div className="p-0">
                        {[
                          { mois: 'Décembre', date: '05/12/2024', statut: 'paid' },
                          { mois: 'Novembre', date: '05/11/2024', statut: 'paid' },
                          { mois: 'Octobre', date: '05/10/2024', statut: 'paid' },
                        ].map((paiement, idx) => (
                             <div key={idx} className="flex items-center justify-between p-4 px-6 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                      paiement.statut === 'paid' ? 'bg-green-50' : 'bg-orange-50'
                                    }`}>
                                        <CheckCircle2 size={18} className={
                                          paiement.statut === 'paid' ? 'text-green-600' : 'text-orange-600'
                                        } />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800">Loyer {paiement.mois}</p>
                                        <p className="text-xs text-gray-400">{paiement.date} • Mobile Money</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-gray-900">{formatCurrency(loyerMensuel)}</p>
                                    <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wide ${
                                      paiement.statut === 'paid' 
                                        ? 'bg-green-100 text-green-700' 
                                        : 'bg-orange-100 text-orange-700'
                                    }`}>
                                      {paiement.statut === 'paid' ? 'Payé' : 'En attente'}
                                    </span>
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