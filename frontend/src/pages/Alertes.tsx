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
                        <thead className="bg-base-200/80 text-base-content/70 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="py-5 pl-6 font-bold rounded-tl-xl">Référence</th>
                                <th className="font-bold">Alerte</th>
                                <th className="font-bold">Type</th>
                                <th className="font-bold">Priorité</th>
                                <th className="font-bold">Date</th>
                                <th className="pr-6 text-right font-bold rounded-tr-xl">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={6} className="text-center py-12"><span className="loading loading-spinner loading-lg text-primary"></span></td></tr>
                            ) : alertes.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-24 px-6 bg-base-100/30">
                                        <div className="flex flex-col items-center justify-center space-y-5">
                                            <div className="relative">
                                                <div className="w-24 h-24 bg-success/10 rounded-full flex items-center justify-center text-success mb-2 shadow-inner ring-4 ring-success/5">
                                                    <CheckCircle size={48} strokeWidth={1.5} />
                                                </div>
                                                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-base-100 rounded-full flex items-center justify-center shadow-md">
                                                    <div className="w-6 h-6 bg-success/20 rounded-full animate-ping absolute"></div>
                                                    <div className="w-4 h-4 bg-success rounded-full"></div>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <h3 className="text-2xl font-bold text-base-content">L'esprit tranquille</h3>
                                                <p className="text-base-content/60 max-w-md mx-auto text-sm leading-relaxed">
                                                    Votre parc immobilier est sous contrôle. Aucun événement ne requiert votre attention immédiate pour le moment !
                                                </p>
                                            </div>
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
                         <div className="flex justify-center items-center py-32 bg-base-100 rounded-2xl border border-base-200/50 shadow-sm">
                             <div className="flex flex-col items-center justify-center space-y-5 text-center">
                                 <div className="w-24 h-24 bg-gradient-to-tr from-base-200 to-base-300 rounded-3xl rotate-3 flex items-center justify-center text-base-content/30 mb-2 shadow-inner border border-base-100">
                                     <div className="-rotate-3">
                                         <Bell size={44} strokeWidth={1.5} />
                                     </div>
                                 </div>
                                 <div className="space-y-1">
                                    <h3 className="text-2xl font-bold text-base-content">Boîte de réception vide</h3>
                                    <p className="text-base-content/50 max-w-md mx-auto text-sm">
                                        Vous êtes parfaitement à jour. Les confirmations, rapports et rappels du système apparaîtront ici.
                                    </p>
                                 </div>
                             </div>
                         </div>
                     ) : (
                         notifications.map(notif => (
                             <Card key={notif.id} className={`border-none ${!notif.is_read ? 'bg-primary/5 ring-1 ring-primary/20' : 'bg-base-100/60 backdrop-blur-sm border border-base-200'} hover:shadow-xl hover:shadow-base-content/5 transition-all duration-300 hover:-translate-y-1 cursor-pointer group`}
                                onClick={async () => {
                                    if (!notif.is_read) await handleMarkAsRead(notif.id);
                                    if (notif.link) navigate(notif.link);
                                }}
                             >
                                 <div className="flex flex-col md:flex-row justify-between gap-5">
                                     <div className="flex items-start gap-5">
                                         <div className={`p-3.5 rounded-2xl ${notif.type === 'success' ? 'bg-green-100/80 text-green-600 dark:bg-green-900/30' : notif.type === 'error' ? 'bg-red-100/80 text-red-600 dark:bg-red-900/30' : 'bg-blue-100/80 text-blue-600 dark:bg-blue-900/30'} flex-shrink-0 shadow-sm`}>
                                             {notif.type === 'success' ? <CheckCircle size={22} /> : <AlertTriangle size={22} />}
                                         </div>
                                         <div className="pt-1">
                                             <div className="flex items-center gap-3 mb-1.5">
                                                 <h3 className={`text-[15px] font-bold ${!notif.is_read ? 'text-base-content' : 'text-base-content/70 group-hover:text-base-content transition-colors'}`}>{notif.title}</h3>
                                                 {!notif.is_read && <span className="badge badge-primary badge-sm px-2 py-2 text-[10px] font-bold tracking-wider text-white shadow-sm ring-1 ring-primary/20">NOUVEAU</span>}
                                             </div>
                                             <p className="text-sm text-base-content/60 leading-relaxed max-w-2xl">{notif.message}</p>
                                             <div className="flex items-center gap-4 mt-3 text-xs font-medium text-base-content/40">
                                                 <span className="flex items-center gap-1.5 bg-base-200/50 px-2.5 py-1 rounded-md"><Clock size={12}/> {new Date(notif.created_at).toLocaleString()}</span>
                                             </div>
                                         </div>
                                     </div>
                                     <div className="flex items-center gap-3 self-end md:self-center">
                                         {notif.link && (
                                             <Button variant="primary" size="sm" className="h-9 px-4 gap-2 text-white shadow-md shadow-primary/20 hover:shadow-primary/40 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); if (!notif.is_read) handleMarkAsRead(notif.id); navigate(notif.link!); }}>
                                                 Consulter
                                             </Button>
                                         )}
                                         {!notif.is_read && (
                                             <button className="btn btn-ghost btn-circle btn-sm text-base-content/40 hover:text-primary hover:bg-primary/10 transition-colors tooltip tooltip-left" data-tip="Marquer comme lu" onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notif.id); }}>
                                                 <CheckCircle size={18} />
                                             </button>
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
