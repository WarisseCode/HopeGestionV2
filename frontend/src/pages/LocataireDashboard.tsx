// frontend/src/pages/LocataireDashboard.tsx
import React from 'react';
import { 
  Home, 
  FileText, 
  Wallet, 
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import Card from '../components/ui/Card';
import { motion } from 'framer-motion';
import { useUser } from '../contexts/UserContext';
import { KPICard, QuickActions, ActivityFeed, UpcomingEvents } from '../components/dashboard';
import type { Activity } from '../components/dashboard/ActivityFeed';
import type { UpcomingEvent } from '../components/dashboard/UpcomingEvents';

const LocataireDashboard: React.FC = () => {
  const { user, stats, loading } = useUser();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  // Activités récentes
  const activities: Activity[] = [
    { id: 1, type: 'payment', title: 'Paiement reçu', description: 'Loyer décembre', time: 'Il y a 2 jours' },
    { id: 2, type: 'reminder', title: 'Rappel de paiement', description: 'Loyer novembre', time: 'Il y a 1 semaine' },
    { id: 3, type: 'alert', title: 'Intervention terminée', description: 'Fuite d\'eau - Salle de bain', time: 'Il y a 2 semaines' },
  ];

  // Mes événements à venir
  const upcomingEvents: UpcomingEvent[] = [
    { id: 1, type: 'rent', title: 'Prochain loyer', description: 'Loyer janvier 2025', date: '05 Jan', daysUntil: 8 },
    { id: 2, type: 'contract', title: 'Renouvellement contrat', description: 'Contrat expire dans 3 mois', date: '28 Mar', daysUntil: 90 },
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
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
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
      className="space-y-8 p-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Section de bienvenue */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-base-content">
              Bonjour, {user?.nom || 'Locataire'} 👋
            </h1>
            <p className="text-base-content/60 mt-1">Bienvenue dans votre espace locataire</p>
          </div>
          <div className="flex items-center gap-3 bg-primary/10 rounded-xl p-4">
            <div className="p-3 bg-primary rounded-lg">
              <Home className="text-primary-content" size={24} />
            </div>
            <div>
              <p className="text-sm text-base-content/60">Votre logement</p>
              <p className="font-bold text-lg text-primary">{nomLogement}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={itemVariants}
      >
        <KPICard 
          icon={Home} 
          label="Votre logement" 
          value={nomLogement} 
          color="blue" 
        />
        <KPICard 
          icon={FileText} 
          label="Contrat actif" 
          value={statutContrat === 'actif' ? 'En cours' : 'Inactif'} 
          color="green" 
        />
        <KPICard 
          icon={Wallet} 
          label="Loyer mensuel" 
          value={formatCurrency(loyerMensuel)} 
          color="purple" 
        />
        <KPICard 
          icon={Calendar} 
          label="Prochain paiement" 
          value={formatDate(prochainPaiement)} 
          color="orange" 
        />
      </motion.div>

      {/* Quick Actions et Paiements */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
        variants={itemVariants}
      >
        <Card title="Actions Rapides">
          <QuickActions userType="locataire" />
        </Card>

        {/* Derniers paiements */}
        <Card title="Vos derniers paiements">
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-base-200">
              <div>
                <p className="font-medium">Loyer Décembre</p>
                <p className="text-sm text-base-content/60">05/12/2024</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-success">{formatCurrency(loyerMensuel)}</p>
                <p className="text-xs text-success">Payé</p>
              </div>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-base-200">
              <div>
                <p className="font-medium">Loyer Novembre</p>
                <p className="text-sm text-base-content/60">05/11/2024</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-success">{formatCurrency(loyerMensuel)}</p>
                <p className="text-xs text-success">Payé</p>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Loyer Octobre</p>
                <p className="text-sm text-base-content/60">05/10/2024</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-success">{formatCurrency(loyerMensuel)}</p>
                <p className="text-xs text-success">Payé</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Activités récentes */}
        <Card title="Activités récentes">
          <ActivityFeed activities={activities} />
        </Card>

        {/* Mes échéances */}
        <UpcomingEvents events={upcomingEvents} userType="locataire" />
      </motion.div>

      {/* Détails du logement */}
      <motion.div variants={itemVariants}>
        <Card title="Détails de votre logement">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3 text-lg">Informations du logement</h3>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-base-100">
                  <span className="text-base-content/60">Adresse</span>
                  <span className="font-medium">{nomLogement}, Cotonou</span>
                </div>
                <div className="flex justify-between py-2 border-b border-base-100">
                  <span className="text-base-content/60">Type</span>
                  <span className="font-medium">Studio Américain</span>
                </div>
                <div className="flex justify-between py-2 border-b border-base-100">
                  <span className="text-base-content/60">Superficie</span>
                  <span className="font-medium">35 m²</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-base-content/60">Pièces</span>
                  <span className="font-medium">1 pièce</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-3 text-lg">Contrat</h3>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-base-100">
                  <span className="text-base-content/60">Date de début</span>
                  <span className="font-medium">01 Janvier 2024</span>
                </div>
                <div className="flex justify-between py-2 border-b border-base-100">
                  <span className="text-base-content/60">Date de fin</span>
                  <span className="font-medium">31 Décembre 2024</span>
                </div>
                <div className="flex justify-between py-2 border-b border-base-100">
                  <span className="text-base-content/60">Caution</span>
                  <span className="font-medium">{formatCurrency(loyerMensuel)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-base-content/60">Gestionnaire</span>
                  <span className="font-medium">Hope Gestion</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default LocataireDashboard;