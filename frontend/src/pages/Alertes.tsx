import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Plus, 
  Edit3, 
  Eye, 
  Trash2, 
  Calendar, 
  Users,
  Home,
  FileText,
  Mail,
  MessageCircle,
  Settings,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Filter,
  Smartphone
} from 'lucide-react';
import toast from 'react-hot-toast';
import { playNotificationSound } from '../utils/sound';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import { KPICard } from '../components/dashboard';
import { getNotifications, markAsRead, markAllAsRead } from '../api/notificationApi';
import type { AppNotification } from '../api/notificationApi';

const Alertes: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'alertes' | 'notifications' | 'parametres'>('alertes');
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'alerte' | 'notification' | 'parametre'>('alerte');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Données de démonstration pour Alertes et Paramètres (Pas encore en base)
  const [alertes] = useState([
    {
      id: 1,
      reference: 'ALT-2025-001',
      titre: 'Loyer en retard',
      description: 'Le loyer du lot A01 est en retard de 5 jours',
      destinataire: 'Gestionnaire',
      type: 'Paiement',
      priorite: 'Haute',
      dateCreation: '2025-01-15',
      statut: 'Active',
      frequence: 'Quotidienne',
      dateEcheance: '2025-01-20'
    },
     {
      id: 2,
      reference: 'ALT-2025-002',
      titre: 'Intervention requise',
      description: 'Fuite d\'eau détectée dans le lot A02',
      destinataire: 'Technicien',
      type: 'Intervention',
      priorite: 'Urgente',
      dateCreation: '2025-01-16',
      statut: 'Active',
      frequence: 'Hebdomadaire',
      dateEcheance: '2025-01-18'
    }
  ]);

  const [parametres] = useState([
    {
        id: 1,
        nom: 'Rappel de loyer',
        description: 'Rappel automatique 3 jours avant la date d\'échéance',
        type: 'Paiement',
        actif: true,
        canal: ['Email', 'WhatsApp']
      },
      {
        id: 2,
        nom: 'Alerte intervention',
        description: 'Notification en cas de panne ou besoin d\'intervention',
        type: 'Intervention',
        actif: true,
        canal: ['Email', 'SMS', 'WhatsApp']
      }
  ]);

  const [alerteForm, setAlerteForm] = useState({
    reference: '', titre: '', description: '', destinataire: 'Gestionnaire', type: 'Paiement', priorite: 'Moyenne', frequence: 'Mensuelle', dateEcheance: '', canal: ['Email']
  });

  useEffect(() => {
      fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
      try {
          const data = await getNotifications();
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount);
      } catch (error) {
          console.error("Erreur chargement notifs", error);
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
          fetchNotifications();
      } catch (error) {
          console.error("Erreur marquage tout lu", error);
      }
  };

  // ... (Keep existing variants)
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
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Centre de Notifications <span className="text-primary">.</span>
          </h1>
          <p className="text-gray-500 font-medium mt-1">
            Gérez vos alertes et notifications système.
          </p>
        </div>
        <div className="flex gap-2">
            {activeTab === 'notifications' && (
                <Button variant="ghost" onClick={handleMarkAllRead} className="text-sm">Tout marquer comme lu</Button>
            )}
            <Button 
            variant="primary" 
            className="rounded-full px-6 h-10 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all font-semibold"
            onClick={() => {
                setFormType(activeTab === 'alertes' ? 'alerte' : activeTab === 'notifications' ? 'notification' : 'parametre');
                setShowForm(true);
            }}
            >
            <Plus size={18} className="mr-2" />
            {activeTab === 'alertes' ? 'Nouvelle Alerte' : 
            activeTab === 'notifications' ? 'Envoyer Notification' : 'Nouveau Paramètre'}
            </Button>
        </div>
      </motion.div>

       {/* Tabs */}
     <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-center bg-white rounded-2xl p-2 shadow-sm border border-gray-100">
        <div className="flex p-1 bg-gray-100/50 rounded-xl overflow-x-auto w-full sm:w-auto">
             <button
                onClick={() => setActiveTab('alertes')}
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === 'alertes' ? 'bg-white text-primary shadow-md' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
                <Bell size={18} />
                Alertes
            </button>
            <button
                onClick={() => setActiveTab('notifications')}
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === 'notifications' ? 'bg-white text-primary shadow-md' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
                <MessageCircle size={18} />
                Notifications
                {unreadCount > 0 && <span className="badge badge-error badge-xs ml-1 text-white">{unreadCount}</span>}
            </button>
             <button
                onClick={() => setActiveTab('parametres')}
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === 'parametres' ? 'bg-white text-primary shadow-md' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
                <Settings size={18} />
                Paramètres
            </button>
        </div>
      </motion.div>

      {/* Contenu principal */}
      <AnimatePresence mode="wait">
      {showForm ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
                <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800">
                      {formType === 'alerte' ? 'Configuration d\'une Alerte' :
                       formType === 'notification' ? 'Envoyer une Notification' :
                       'Paramètre de Notification'}
                    </h2>
                    <Button variant="ghost" onClick={() => setShowForm(false)} className="btn-circle btn-sm">
                        <XCircle size={24} className="text-gray-400" />
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {formType === 'alerte' && (
                     <>
                        <Input label="Titre" value={alerteForm.titre} onChange={(e) => setAlerteForm({...alerteForm, titre: e.target.value})} placeholder="Ex: Retard de Loyer" />
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Priorité</label>
                            <select className="select select-bordered w-full bg-gray-50" value={alerteForm.priorite} onChange={(e) => setAlerteForm({...alerteForm, priorite: e.target.value})}>
                                <option>Haute</option><option>Moyenne</option><option>Basse</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                             <Input label="Description" value={alerteForm.description} onChange={(e) => setAlerteForm({...alerteForm, description: e.target.value})} />
                        </div>
                     </>
                 )}
                </div>
                
                <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
                    <Button variant="ghost" onClick={() => setShowForm(false)}>Annuler</Button>
                    <Button variant="primary" onClick={() => setShowForm(false)}>Enregistrer</Button>
                </div>
            </Card>
          </motion.div>
      ) : (
        <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
        >
            {/* KPIs - Updated to rely on activeTab or general stats if available */}
            {activeTab === 'alertes' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <KPICard icon={Bell} label="Alertes Actives" value={alertes.length.toString()} color="blue" />
                    <KPICard icon={AlertTriangle} label="Haute Priorité" value="0" color="orange" />
                    <KPICard icon={CheckCircle} label="Résolues (Mois)" value="12" color="green" />
                </div>
            )}
            {activeTab === 'notifications' && (
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <KPICard icon={MessageCircle} label="Total" value={notifications.length.toString()} color="purple" />
                    <KPICard icon={Mail} label="Non Lues" value={unreadCount.toString()} color="orange" />
                    <KPICard icon={Smartphone} label="SMS Envoyés" value="0" color="blue" />
                </div>
            )}

            {/* Content Lists */}
            {activeTab === 'alertes' && (
                <Card className="border-none shadow-xl bg-white p-0 overflow-hidden">
                     <div className="overflow-x-auto">
                    <table className="table w-full">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="py-4 pl-6 text-gray-500 font-semibold">Référence</th>
                                <th className="text-gray-500 font-semibold">Alerte</th>
                                <th className="text-gray-500 font-semibold">Type</th>
                                <th className="text-gray-500 font-semibold">Priorité</th>
                                <th className="text-gray-500 font-semibold">Statut</th>
                                <th className="pr-6 text-right text-gray-500 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {alertes.map(alerte => (
                                <tr key={alerte.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="pl-6 font-medium text-gray-800">{alerte.reference}</td>
                                    <td>
                                        <div className="font-bold text-gray-800">{alerte.titre}</div>
                                        <div className="text-xs text-gray-500">{alerte.description}</div>
                                    </td>
                                    <td><span className="badge badge-ghost badge-sm">{alerte.type}</span></td>
                                    <td>
                                         <span className={`badge ${
                                            alerte.priorite === 'Urgente' ? 'badge-error' : 
                                            alerte.priorite === 'Haute' ? 'badge-warning' : 
                                            'badge-info'
                                            } gap-1 text-white`}>
                                            {alerte.priorite}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge ${alerte.statut === 'Active' ? 'badge-success' : 'badge-neutral'} badge-xs gap-1 py-2 px-3 text-white`}>
                                            {alerte.statut}
                                        </span>
                                    </td>
                                    <td className="pr-6 text-right">
                                        <Button variant="ghost" size="sm" className="btn-square btn-xs text-gray-400 hover:text-primary"><Edit3 size={16}/></Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>
                </Card>
            )}

            {activeTab === 'notifications' && (
                <div className="grid gap-4">
                     {notifications.length === 0 ? (
                         <div className="text-center py-10 text-gray-400">Aucune notification pour le moment.</div>
                     ) : (
                         notifications.map(notif => (
                            <Card key={notif.id} className={`border-l-4 ${!notif.is_read ? 'border-l-primary bg-primary/5' : 'border-l-gray-200 bg-white'} hover:shadow-md transition-all cursor-pointer`}>
                                <div className="flex flex-col md:flex-row justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className={`p-3 rounded-full ${notif.type === 'success' ? 'bg-green-100 text-green-600' : notif.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                            {notif.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className={`font-bold ${!notif.is_read ? 'text-gray-900' : 'text-gray-500'}`}>{notif.title}</h3>
                                                {!notif.is_read && <span className="badge badge-primary badge-xs text-white">Nouveau</span>}
                                            </div>
                                            <p className="text-sm text-gray-600">{notif.message}</p>
                                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                                                <span className="flex items-center gap-1"><Clock size={12}/> {new Date(notif.created_at).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 self-end md:self-center">
                                        {!notif.is_read && (
                                            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-primary" onClick={() => handleMarkAsRead(notif.id)}>Marquer comme lu</Button>
                                        )}
                                    </div>
                                </div>
                            </Card>
                         ))
                     )}
                </div>
            )}

            {activeTab === 'parametres' && (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {parametres.map(param => (
                        <Card key={param.id} className="hover:shadow-lg transition-all border border-gray-200">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-gray-100 rounded-lg">
                                    <Settings size={20} className="text-gray-600"/>
                                </div>
                                <input type="checkbox" className="toggle toggle-primary" checked={param.actif} readOnly />
                            </div>
                            <h3 className="font-bold text-lg text-gray-800 mb-2">{param.nom}</h3>
                            <p className="text-sm text-gray-500 mb-4 h-10">{param.description}</p>
                            <div className="flex flex-wrap gap-2">
                                {param.canal.map(c => (
                                    <span key={c} className="badge badge-ghost badge-sm">{c}</span>
                                ))}
                            </div>
                        </Card>
                    ))}
                 </div>
            )}
        </motion.div>
      )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Alertes;
