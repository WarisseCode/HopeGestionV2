import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Edit3, 
  Eye, 
  Trash2, 
  Calendar, 
  Users,
  Home,
  FileText,
  Mail,
  Settings,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Filter,
  Smartphone,

  ArrowRight,
  TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { playNotificationSound } from '../utils/sound';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { motion, AnimatePresence } from 'framer-motion';
import { KPICard } from '../components/dashboard';
import { getNotifications, markAsRead, markAllAsRead } from '../api/notificationApi';
import type { AppNotification } from '../api/notificationApi';
import { getAlerts, dismissAlert, resetDismissedAlerts } from '../api/alertApi';
import type { Alert } from '../api/alertApi';
import { getNotificationSettings, updateNotificationSettings } from '../api/notificationApi';
import type { NotificationSetting } from '../api/notificationApi';

const Alertes: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'alertes' | 'notifications' | 'parametres'>('alertes');
  
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const [alertes, setAlertes] = useState<Alert[]>([]);
  const [dismissedCount, setDismissedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  const [parametres, setParametres] = useState<NotificationSetting[]>([]);
  const [savingSettingId, setSavingSettingId] = useState<string | null>(null);

  const ALERT_TYPE_LABELS: Record<string, { label: string, desc: string }> = {
    'PAYMENT_REMINDER': { label: 'Rappel de loyer', desc: 'Notification avant la date d\'échéance' },
    'LEASE_EXPIRY': { label: 'Fin de bail', desc: 'Alerte quand un contrat arrive à terme' },
    'INTERVENTION': { label: 'Interventions', desc: 'Nouvelles demandes ou mises à jour' },
    'DOCUMENT_SIGNED': { label: 'Documents signés', desc: 'Confirmation de signature électronique' }
  };

  const DEFAULT_SETTINGS: NotificationSetting[] = [
    { alert_type: 'PAYMENT_REMINDER', channel_email: true, channel_whatsapp: false, channel_sms: false },
    { alert_type: 'LEASE_EXPIRY', channel_email: true, channel_whatsapp: false, channel_sms: false },
    { alert_type: 'INTERVENTION', channel_email: true, channel_whatsapp: false, channel_sms: false },
    { alert_type: 'DOCUMENT_SIGNED', channel_email: true, channel_whatsapp: false, channel_sms: false }
  ];

  const [alerteForm, setAlerteForm] = useState({
    reference: '', titre: '', description: '', destinataire: 'Gestionnaire', type: 'Paiement', priorite: 'Moyenne', frequence: 'Mensuelle', dateEcheance: '', canal: ['Email']
  });

  useEffect(() => {
      fetchData();
  }, []);

  const fetchData = async () => {
      setLoading(true);
      
      // Independent fetches to prevent one blocking others
      const fetchNotifications = async () => {
          try {
              const notifsData = await getNotifications();
              setNotifications(notifsData.notifications || []);
              setUnreadCount(notifsData.unreadCount || 0);
          } catch (error) {
              console.error("Erreur notifications", error);
          }
      };

      const fetchAlerts = async () => {
          try {
              const alertsData = await getAlerts();
              setAlertes(alertsData.alerts);
              setDismissedCount(alertsData.dismissedCount);
          } catch (error) {
              console.error("Erreur alertes", error);
          }
      };

      const fetchSettings = async () => {
          try {
              const settingsData = await getNotificationSettings();
              if (!settingsData || settingsData.length === 0) {
                  setParametres(DEFAULT_SETTINGS);
              } else {
                  setParametres(settingsData);
              }
          } catch (error) {
              console.error("Erreur paramètres", error);
              setParametres(DEFAULT_SETTINGS); // Fallback to default on error
          }
      };

      try {
          await Promise.allSettled([
              fetchNotifications(),
              fetchAlerts(),
              fetchSettings()
          ]);
      } catch (error) {
          console.error("Erreur globale fetchData", error);
          toast.error("Erreur lors du chargement des données");
      } finally {
          setLoading(false);
      }
  };

  const handleToggleSetting = async (alertType: string, channel: 'email' | 'whatsapp' | 'sms') => {
      const updated = parametres.map(p => {
          if (p.alert_type === alertType) {
              return { 
                  ...p, 
                  [`channel_${channel}`]: !p[`channel_${channel}` as keyof NotificationSetting] 
              };
          }
          return p;
      });
      setParametres(updated);
      
      try {
          setSavingSettingId(alertType);
          await updateNotificationSettings(updated);
          toast.success('Paramètres mis à jour');
      } catch (error) {
          toast.error('Erreur lors de la sauvegarde');
      } finally {
          setSavingSettingId(null);
      }
  };

  const handleMarkAsRead = async (id: number) => {
      try {
      await markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      playNotificationSound();
      toast.success('Notification marquée comme lue');
    } catch (err: any) {
      console.error(err);
      toast.error('Erreur lors de la mise à jour');
    }  };

  const handleMarkAllRead = async () => {
      try {
          await markAllAsRead();
          fetchData();
          toast.success("Toutes les notifications marquées comme lues");
      } catch (error) {
          console.error("Erreur marquage tout lu", error);
      }
  };

  const handleDismiss = async (alertId: string) => {
      try {
          setDismissingId(alertId);
          await dismissAlert(alertId);
          setAlertes(prev => prev.filter(a => a.id !== alertId));
          setDismissedCount(prev => prev + 1);
          toast.success('Alerte ignorée');
      } catch (err: any) {
          toast.error(err.message || 'Erreur lors de l\'ignorance');
      } finally {
          setDismissingId(null);
      }
  };

  const handleResetDismissed = async () => {
      try {
          await resetDismissedAlerts();
          toast.success('Alertes ignorées réinitialisées');
          fetchData();
      } catch (err: any) {
          toast.error(err.message || 'Erreur');
      }
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
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-base-content tracking-tight">
            Centre d'Alertes <span className="text-primary">.</span>
          </h1>
          <p className="text-base-content/60 font-medium mt-1">
            Actions requises et notifications système.
          </p>
        </div>
        <div className="flex gap-2">
            {activeTab === 'notifications' && (
                <Button variant="ghost" onClick={handleMarkAllRead} className="text-sm">Tout marquer comme lu</Button>
            )}
        </div>
      </motion.div>

       {/* Tabs */}
     <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-center bg-base-100 rounded-2xl p-2 shadow-sm border border-base-200">
        <div className="flex p-1 bg-base-300/50 rounded-xl overflow-x-auto w-full sm:w-auto">
             <button
                onClick={() => setActiveTab('alertes')}
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === 'alertes' ? 'bg-base-100 text-primary shadow-md' : 'text-base-content/60 hover:text-base-content/80'
                }`}
            >
                <AlertTriangle size={18} />
                Alertes
                <span className="badge badge-neutral badge-xs ml-1">{alertes.length}</span>
            </button>
            <button
                onClick={() => setActiveTab('notifications')}
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === 'notifications' ? 'bg-base-100 text-primary shadow-md' : 'text-base-content/60 hover:text-base-content/80'
                }`}
            >
                <Bell size={18} />
                Notifications
                {unreadCount > 0 && <span className="badge badge-error badge-xs ml-1 text-white">{unreadCount}</span>}
            </button>
             <button
                onClick={() => setActiveTab('parametres')}
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === 'parametres' ? 'bg-base-100 text-primary shadow-md' : 'text-base-content/60 hover:text-base-content/80'
                }`}
            >
                <Settings size={18} />
                Paramètres
            </button>
        </div>
      </motion.div>

      {/* Contenu principal */}
      <AnimatePresence mode="wait">
        <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
        >
            {/* KPIs */}
            {activeTab === 'alertes' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <KPICard icon={AlertTriangle} label="Action Requise" value={alertes.length.toString()} color="orange" />
                    <KPICard icon={TrendingUp} label="Priorité Haute" value={alertes.filter(a => a.priorite === 'Urgente' || a.priorite === 'Haute').length.toString()} color="pink" />
                    <KPICard icon={CheckCircle} label="Ignorées" value={dismissedCount.toString()} color="green" />
                </div>
            )}
            
            {/* ALERTES LIST */}
            {activeTab === 'alertes' && (
                <Card className="border-none shadow-xl bg-base-100 p-0 overflow-hidden">
                    {dismissedCount > 0 && (
                        <div className="px-6 pt-4 flex justify-end">
                            <button onClick={handleResetDismissed} className="text-xs text-base-content/50 hover:text-primary underline transition-colors">
                                Réafficher les alertes ignorées ({dismissedCount})
                            </button>
                        </div>
                    )}
                     <div className="overflow-x-auto">
                    <table className="table w-full">
                        <thead className="bg-base-200/50">
                            <tr>
                                <th className="py-4 pl-6 text-base-content/60 font-semibold">Référence</th>
                                <th className="text-base-content/60 font-semibold">Alerte</th>
                                <th className="text-base-content/60 font-semibold">Type</th>
                                <th className="text-base-content/60 font-semibold">Priorité</th>
                                <th className="text-base-content/60 font-semibold">Date</th>
                                <th className="pr-6 text-right text-base-content/60 font-semibold">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={6} className="text-center py-12"><span className="loading loading-spinner loading-lg text-primary"></span></td></tr>
                            ) : alertes.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-20 px-6">
                                        <div className="flex flex-col items-center justify-center space-y-4">
                                            <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center text-success mb-2">
                                                <CheckCircle size={40} />
                                            </div>
                                            <h3 className="text-xl font-bold text-base-content/90">Aucune alerte active</h3>
                                            <p className="text-base-content/60 max-w-sm mx-auto">Votre parc immobilier est fluide, aucun événement ne requiert votre attention immédiate pour le moment !</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                alertes.map(alerte => (
                                    <tr key={alerte.id} className="hover:bg-base-200/50 transition-colors group cursor-pointer">
                                        <td className="pl-6 font-medium text-base-content/90">{alerte.reference}</td>
                                        <td>
                                            <div className="font-bold text-base-content/90">{alerte.titre}</div>
                                            <div className="text-xs text-base-content/60">{alerte.description}</div>
                                        </td>
                                        <td><span className="badge badge-ghost badge-sm">{alerte.type}</span></td>
                                        <td>
                                             <span className={`badge ${
                                                alerte.priorite === 'Urgente' ? 'badge-error text-white' : 
                                                alerte.priorite === 'Haute' ? 'badge-warning text-white' : 
                                                'badge-info text-white'
                                                } gap-1`}>
                                                {alerte.priorite}
                                            </span>
                                        </td>
                                        <td className="text-sm font-mono text-base-content/60">
                                            {new Date(alerte.dateCreation).toLocaleDateString()}
                                        </td>
                                        <td className="pr-6 text-right">
                                            <div className="flex items-center gap-2 justify-end">
                                                {alerte.link && (
                                                    <Button 
                                                        variant="secondary" 
                                                        size="sm" 
                                                        className="btn-xs gap-1"
                                                        onClick={() => navigate(alerte.link!)}
                                                    >
                                                        Traiter <ArrowRight size={12}/>
                                                    </Button>
                                                )}
                                                <button
                                                    className="btn btn-xs btn-ghost text-base-content/40 hover:text-error hover:bg-error/10 transition-all"
                                                    onClick={() => handleDismiss(alerte.id)}
                                                    disabled={dismissingId === alerte.id}
                                                    title="Ignorer cette alerte"
                                                >
                                                    {dismissingId === alerte.id 
                                                        ? <span className="loading loading-spinner loading-xs"></span>
                                                        : <XCircle size={14} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    </div>
                </Card>
            )}

            {/* NOTIFICATIONS LIST */}
            {activeTab === 'notifications' && (
                <div className="grid gap-4">
                     {loading ? (
                         <div className="text-center py-12"><span className="loading loading-spinner loading-lg text-primary"></span></div>
                     ) : notifications.length === 0 ? (
                         <div className="flex justify-center items-center py-24">
                             <div className="flex flex-col items-center justify-center space-y-4 text-center">
                                 <div className="w-20 h-20 bg-base-200 rounded-full flex items-center justify-center text-base-content/40 mb-2 shadow-inner">
                                     <Bell size={40} />
                                 </div>
                                 <h3 className="text-xl font-bold text-base-content/90">Aucune notification</h3>
                                 <p className="text-base-content/60 max-w-sm mx-auto">Vous êtes à jour. Vous recevrez ici les confirmations et rappels divers du système.</p>
                             </div>
                         </div>
                     ) : (
                         notifications.map(notif => (
                             <Card key={notif.id} className={`border-l-4 ${!notif.is_read ? 'border-l-primary bg-primary/5' : 'border-l-base-200 bg-base-100/60 backdrop-blur-sm'} hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer`}
                                onClick={async () => {
                                    if (!notif.is_read) await handleMarkAsRead(notif.id);
                                    if (notif.link) navigate(notif.link);
                                }}
                             >
                                 <div className="flex flex-col md:flex-row justify-between gap-4">
                                     <div className="flex items-start gap-4">
                                         <div className={`p-3 rounded-full ${notif.type === 'success' ? 'bg-green-100 text-green-600' : notif.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                             {notif.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                                         </div>
                                         <div>
                                             <div className="flex items-center gap-2 mb-1">
                                                 <h3 className={`font-bold ${!notif.is_read ? 'text-base-content' : 'text-base-content/60'}`}>{notif.title}</h3>
                                                 {!notif.is_read && <span className="badge badge-primary badge-xs text-white">Nouveau</span>}
                                             </div>
                                             <p className="text-sm text-base-content/70">{notif.message}</p>
                                             <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                                                 <span className="flex items-center gap-1"><Clock size={12}/> {new Date(notif.created_at).toLocaleString()}</span>
                                             </div>
                                         </div>
                                     </div>
                                     <div className="flex items-center gap-2 self-end md:self-center">
                                         {notif.link && (
                                             <Button variant="primary" size="sm" className="btn-xs gap-1 text-white" onClick={(e) => { e.stopPropagation(); if (!notif.is_read) handleMarkAsRead(notif.id); navigate(notif.link!); }}>
                                                 Voir <ArrowRight size={12}/>
                                             </Button>
                                         )}
                                         {!notif.is_read && (
                                             <Button variant="ghost" size="sm" className="text-gray-400 hover:text-primary" onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notif.id); }}>Marquer comme lu</Button>
                                         )}
                                     </div>
                                 </div>
                             </Card>
                         ))
                     )}
                </div>
            )}

            {/* PARAMETRES */}
            {activeTab === 'parametres' && (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {parametres.map(param => (
                        <Card key={param.alert_type} className="hover:shadow-xl transition-all duration-300 border border-base-200 hover:border-primary/30">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                                    <Bell size={22} />
                                </div>
                                {savingSettingId === param.alert_type && <span className="loading loading-spinner loading-xs text-primary"></span>}
                            </div>
                            <h3 className="font-bold text-lg text-base-content/90 mb-1">
                                {ALERT_TYPE_LABELS[param.alert_type]?.label || param.alert_type}
                            </h3>
                            <p className="text-sm text-base-content/60 mb-6 h-10 leading-relaxed">
                                {ALERT_TYPE_LABELS[param.alert_type]?.desc || 'Paramètres de notification'}
                            </p>
                            
                            <div className="space-y-4 pt-5 border-t border-base-200">
                                <div className="flex justify-between items-center text-sm group">
                                    <span className="font-medium text-base-content/80 group-hover:text-base-content transition-colors">Email</span>
                                    <input 
                                        type="checkbox" 
                                        className="toggle toggle-primary toggle-sm" 
                                        checked={param.channel_email}
                                        onChange={() => handleToggleSetting(param.alert_type, 'email')}
                                    />
                                </div>
                                <div className="flex justify-between items-center text-sm group">
                                    <span className="font-medium text-base-content/80 group-hover:text-base-content transition-colors">WhatsApp</span>
                                    <input 
                                        type="checkbox" 
                                        className="toggle toggle-success toggle-sm group-hover:shadow-[0_0_8px_rgba(34,197,94,0.4)] transition-all" 
                                        checked={param.channel_whatsapp}
                                        onChange={() => handleToggleSetting(param.alert_type, 'whatsapp')}
                                    />
                                </div>
                                <div className="flex justify-between items-center text-sm opacity-50 cursor-not-allowed group">
                                    <span className="font-medium text-base-content/80">SMS (Bientôt)</span>
                                    <input 
                                        type="checkbox" 
                                        className="toggle toggle-sm" 
                                        checked={param.channel_sms}
                                        disabled
                                    />
                                </div>
                            </div>
                        </Card>
                    ))}
                 </div>
            )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};

export default Alertes;
