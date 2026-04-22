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
import NotificationBell from '../components/NotificationBell';
import type { Activity } from '../components/dashboard/ActivityFeed';
import type { UpcomingEvent } from '../components/dashboard/UpcomingEvents';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import toast from 'react-hot-toast';

import { getToken } from '../api/authApi';
import { API_URL } from '../config';

const LocataireDashboard: React.FC = () => {
  const { user, stats, loading } = useUser();
  const navigate = useNavigate();
  const [activities, setActivities] = React.useState<Activity[]>([]);

  React.useEffect(() => {
    const fetchActivities = async () => {
        const token = getToken();
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/dashboard/activity`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.activities) {
                const mapped = data.activities.map((a: any) => ({
                     id: a.id,
                     type: a.type,
                     title: a.title,
                     description: a.description,
                     time: new Date(a.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                }));
                setActivities(mapped);
            }
        } catch (e) {
            console.error("Error fetching activities", e);
        }
    };
    fetchActivities();
  }, []);

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

  // Mes événements à venir
  const upcomingEvents: UpcomingEvent[] = [
    { id: 1, type: 'rent', title: 'Prochain loyer', description: 'Loyer à venir', date: '05 du mois', daysUntil: 8 },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  if (loading) {
    return <DashboardSkeleton type="locataire" />;
  }

  // Stats spécifiques au locataire
  const nomLogement = (stats as any)?.nomLogement || 'Aucun logement';
  const loyerMensuel = (stats as any)?.loyerMensuel || 0;
  const statutContrat = (stats as any)?.statutContrat || 'inactif';
  // Calculate days until next payment
  const nextPaymentDate = (stats as any)?.prochainPaiement ? new Date((stats as any).prochainPaiement) : new Date();
  const diffTime = nextPaymentDate.getTime() - new Date().getTime();
  const joursAvantEcheance = Math.ceil(diffTime / (1000 * 60 * 60 * 24));


  const recentPayments = (stats as any)?.recentPayments || [];

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
             <NotificationBell />
             <div className="text-right hidden md:block">
                <p className="text-xs text-base-content/50 font-semibold uppercase tracking-wider">Mon Logement</p>
                <p className="font-bold text-base-content/90">{nomLogement}</p>
             </div>
        </div>
      </motion.div>


      {/* Next Payment Alert Banner */}
      <motion.div variants={itemVariants}>
        <div className={`rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
          joursAvantEcheance <= 5 ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gradient-to-r from-primary to-primary-focus'
        } text-white`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-base-100/20 flex items-center justify-center">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-white/80 text-sm font-medium">Prochain paiement</p>
              <p className="text-2xl font-bold">{formatCurrency(loyerMensuel)}</p>
              <p className="text-white/70 text-sm">
                {joursAvantEcheance < 0
                  ? `En retard de ${Math.abs(joursAvantEcheance)} jour(s)`
                  : joursAvantEcheance === 0
                  ? "Échéance aujourd'hui"
                  : `Échéance dans ${joursAvantEcheance} jours`}
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="bg-base-100 text-primary hover:bg-base-100/90 font-semibold shadow-lg"
            onClick={() => navigate('/dashboard/mobile-money')}
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
          color="purple"
          trend={{ value: joursAvantEcheance.toString(), label: `jours avant échéance`, positive: true }}
        />
        <KPICard 
          icon={FileText} 
          label="Statut du Bail" 
          value={statutContrat === 'actif' ? 'Actif' : 'Inactif'} 
          color="green" 
          trend={{ value: "Valide", label: "Contrat en cours", positive: true }}
        />
        <KPICard 
          icon={Calendar} 
          label="Prochaine Échéance" 
          value={new Date(nextPaymentDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
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
                <div className="bg-base-100 rounded-2xl p-6 shadow-lg border border-base-200 flex flex-col md:flex-row gap-6 items-start">
                     <div className="w-full md:w-1/3 rounded-xl overflow-hidden shadow-inner bg-gradient-to-br from-primary/5 to-primary/10 aspect-video md:aspect-square relative">
                        {(stats as any)?.photoLogement ? (
                            <img
                                src={(stats as any).photoLogement}
                                alt={nomLogement}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Home size={48} className="text-primary/30" />
                            </div>
                        )}
                     </div>
                     <div className="flex-1 w-full space-y-4">
                         <div className="flex justify-between items-start">
                             <div>
                                <h3 className="text-xl font-bold text-base-content">{nomLogement}</h3>
                                <p className="text-base-content/60">{(stats as any)?.dateDebut ? `Depuis le ${new Date((stats as any).dateDebut).toLocaleDateString()}` : ''}</p>
                             </div>
                             <span className={`px-3 py-1 text-sm font-bold rounded-full ${statutContrat === 'actif' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                 {statutContrat === 'actif' ? 'En règle' : 'Inactif'}
                             </span>
                         </div>
                         
                         <div className="grid grid-cols-2 gap-4 pt-4 border-t border-base-200">
                             <div>
                                 <p className="text-xs text-base-content/50 font-semibold uppercase">Bailleur</p>
                                 <p className="font-medium">Hope Immobilier</p>
                             </div>
                              <div>
                                 <p className="text-xs text-base-content/50 font-semibold uppercase">Début du contrat</p>
                                 <p className="font-medium">{(stats as any)?.dateDebut ? new Date((stats as any).dateDebut).toLocaleDateString() : 'N/A'}</p>
                             </div>
                              <div>
                                 <p className="text-xs text-base-content/50 font-semibold uppercase">Caution Déposée</p>
                                 <p className="font-medium">{formatCurrency(loyerMensuel * 3)}</p>
                             </div>
                              <div>
                                 <p className="text-xs text-base-content/50 font-semibold uppercase">Gestionnaire</p>
                                 <p className="font-medium">{(stats as any)?.gestionnaire || 'Non assigné'}</p>
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
                <div className="bg-base-100 rounded-2xl shadow-lg border border-base-200 overflow-hidden">
                    <div className="p-6 border-b border-base-200 flex justify-between items-center">
                        <h3 className="font-bold text-base-content/90">Historique des Paiements</h3>
                        <Button variant="ghost" className="btn-sm text-primary" onClick={() => navigate('/dashboard/finances')}>
                          Tout voir
                        </Button>
                    </div>
                    <div className="p-0">
                        {recentPayments.length > 0 ? recentPayments.map((paiement: any, idx: number) => (
                             <div key={idx} className="flex items-center justify-between p-4 px-6 hover:bg-base-200 border-b border-base-200 last:border-0 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                      paiement.status === 'paid' ? 'bg-green-50' : 'bg-orange-50'
                                    }`}>
                                        <CheckCircle2 size={18} className={
                                          paiement.status === 'paid' ? 'text-green-600' : 'text-orange-600'
                                        } />
                                    </div>
                                    <div>
                                        <p className="font-bold text-base-content/90">Loyer {paiement.month}</p>
                                        <p className="text-xs text-base-content/50">{new Date(paiement.date).toLocaleDateString()} • {paiement.method || 'Virement'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-base-content">{formatCurrency(paiement.amount)}</p>
                                    <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wide ${
                                      paiement.status === 'paid' 
                                        ? 'bg-green-100 text-green-700' 
                                        : 'bg-orange-100 text-orange-700'
                                    }`}>
                                      {paiement.status === 'paid' ? 'Payé' : 'En attente'}
                                    </span>
                                </div>
                            </div>
                        )) : (
                            <p className="text-center py-8 text-base-content/60">Aucun paiement récent.</p>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
            
             {/* Quick Actions */}
             <motion.div variants={itemVariants}>
                <div className="bg-base-100 rounded-2xl p-6 shadow-lg border border-base-200">
                    <h3 className="font-bold text-base-content/90 mb-4">Mes Démarches</h3>
                    <QuickActions userType="locataire" />
                </div>
            </motion.div>

             {/* Upcoming Events */}
            <motion.div variants={itemVariants}>
                <div className="bg-base-100 rounded-2xl p-6 shadow-lg border border-base-200">
                    <h3 className="font-bold text-base-content/90 mb-4">À Venir</h3>
                    <UpcomingEvents events={upcomingEvents} userType="locataire" />
                </div>
            </motion.div>

            {/* Recent Activity Timeline */}
             <motion.div variants={itemVariants}>
                <div className="bg-base-100 rounded-2xl p-6 shadow-lg border border-base-200">
                    <h3 className="font-bold text-base-content/90 mb-4">Journal</h3>
                    <ActivityFeed activities={activities} />
                </div>
            </motion.div>

        </div>

      </div>
    </motion.div>
  );
};

export default LocataireDashboard;