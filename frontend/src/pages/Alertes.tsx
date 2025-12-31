// frontend/src/pages/Alertes.tsx
import React, { useState } from 'react';
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
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import { KPICard } from '../components/dashboard';

const Alertes: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'alertes' | 'notifications' | 'parametres'>('alertes');
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'alerte' | 'notification' | 'parametre'>('alerte');

  // Données de démonstration
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
    },
    {
      id: 3,
      reference: 'ALT-2025-003',
      titre: 'Contrat expirant',
      description: 'Le contrat du lot B01 expire dans 30 jours',
      destinataire: 'Propriétaire',
      type: 'Contrat',
      priorite: 'Moyenne',
      dateCreation: '2025-01-17',
      statut: 'Active',
      frequence: 'Mensuelle',
      dateEcheance: '2025-02-17'
    }
  ]);

  const [notifications] = useState([
    {
      id: 1,
      titre: 'Nouveau paiement reçu',
      message: 'Paiement de 150 000 FCFA reçu de KOFFI Jean pour le lot A01',
      date: '2025-01-15 10:30',
      statut: 'Non lu',
      type: 'Finance',
      destinataire: 'Gestionnaire'
    },
    {
      id: 2,
      titre: 'Intervention terminée',
      message: 'L\'intervention sur le lot A02 a été terminée avec succès',
      date: '2025-01-16 14:15',
      statut: 'Lu',
      type: 'Intervention',
      destinataire: 'Locataire'
    },
    {
      id: 3,
      titre: 'Demande d\'intervention',
      message: 'Nouvelle demande d\'intervention pour le lot A01',
      date: '2025-01-17 09:45',
      statut: 'Non lu',
      type: 'Intervention',
      destinataire: 'Technicien'
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
    },
    {
      id: 3,
      nom: 'Échéance contrat',
      description: 'Alerte 30 jours avant l\'expiration d\'un contrat',
      type: 'Contrat',
      actif: false,
      canal: ['Email']
    }
  ]);

  const [alerteForm, setAlerteForm] = useState({
    reference: '',
    titre: '',
    description: '',
    destinataire: 'Gestionnaire',
    type: 'Paiement',
    priorite: 'Moyenne',
    frequence: 'Mensuelle',
    dateEcheance: '',
    canal: ['Email']
  });

  const [notificationForm, setNotificationForm] = useState({
    titre: '',
    message: '',
    destinataire: 'Gestionnaire',
    type: 'Général',
    canal: ['Email', 'WhatsApp']
  });

  const [parametreForm, setParametreForm] = useState({
    nom: '',
    description: '',
    type: 'Général',
    actif: true,
    canal: ['Email']
  });

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
            Centre de Notifications <span className="text-primary">.</span>
          </h1>
          <p className="text-base-content/60 font-medium mt-1">
            Gérez vos alertes, notifications et configurez vos préférences de communication.
          </p>
        </div>
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
      </motion.div>

       {/* Tabs */}
     <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-center bg-base-100 rounded-2xl p-2 shadow-sm border border-base-200">
        <div className="flex p-1 bg-base-200/50 rounded-xl overflow-x-auto w-full sm:w-auto">
             <button
                onClick={() => setActiveTab('alertes')}
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === 'alertes' ? 'bg-base-100 text-primary shadow-md' : 'text-base-content/60 hover:text-base-content'
                }`}
            >
                <Bell size={18} />
                Alertes
            </button>
            <button
                onClick={() => setActiveTab('notifications')}
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === 'notifications' ? 'bg-base-100 text-primary shadow-md' : 'text-base-content/60 hover:text-base-content'
                }`}
            >
                <MessageCircle size={18} />
                Notifications
            </button>
             <button
                onClick={() => setActiveTab('parametres')}
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === 'parametres' ? 'bg-base-100 text-primary shadow-md' : 'text-base-content/60 hover:text-base-content'
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
            <Card className="border-none shadow-xl bg-base-100/80 backdrop-blur-sm">
                <div className="flex justify-between items-center mb-6 pb-6 border-b border-base-200">
                    <h2 className="text-xl font-bold text-base-content">
                      {formType === 'alerte' ? 'Configuration d\'une Alerte' :
                       formType === 'notification' ? 'Envoyer une Notification' :
                       'Paramètre de Notification'}
                    </h2>
                    <Button variant="ghost" onClick={() => setShowForm(false)} className="btn-circle btn-sm">
                        <XCircle size={24} className="text-base-content/40" />
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Form content based on type (simplified for brevity but keeping structure) */}
                 {formType === 'alerte' && (
                     <>
                        <Input label="Titre" value={alerteForm.titre} onChange={(e) => setAlerteForm({...alerteForm, titre: e.target.value})} placeholder="Ex: Retard de Loyer" />
                        <div>
                            <label className="block text-sm font-bold text-base-content/70 mb-2">Priorité</label>
                            <select className="select select-bordered w-full bg-base-200/50" value={alerteForm.priorite} onChange={(e) => setAlerteForm({...alerteForm, priorite: e.target.value})}>
                                <option>Haute</option><option>Moyenne</option><option>Basse</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                             <Input label="Description" value={alerteForm.description} onChange={(e) => setAlerteForm({...alerteForm, description: e.target.value})} />
                        </div>
                     </>
                 )}
                 {/* ... other form types ... */}
                </div>
                
                <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-base-200">
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
            {/* KPIs */}
            {activeTab === 'alertes' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <KPICard icon={Bell} label="Alertes Actives" value="3" color="blue" />
                    <KPICard icon={AlertTriangle} label="Haute Priorité" value="2" color="orange" trend={{value: 1, isPositive: false}} />
                    <KPICard icon={CheckCircle} label="Résolues (Mois)" value="12" color="green" />
                </div>
            )}
            {activeTab === 'notifications' && (
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <KPICard icon={MessageCircle} label="Total Notifications" value="24" color="purple" />
                    <KPICard icon={Mail} label="Non Lues" value="5" color="red" />
                    <KPICard icon={Smartphone} label="SMS Envoyés" value="145" color="blue" />
                </div>
            )}

            {/* Content Lists */}
            {activeTab === 'alertes' && (
                <Card className="border-none shadow-xl bg-base-100 p-0 overflow-hidden">
                     <div className="overflow-x-auto">
                    <table className="table w-full">
                        <thead className="bg-base-200/50">
                            <tr>
                                <th className="py-4 pl-6 text-base-content/60 font-semibold">Référence</th>
                                <th className="text-base-content/60 font-semibold">Alerte</th>
                                <th className="text-base-content/60 font-semibold">Type</th>
                                <th className="text-base-content/60 font-semibold">Priorité</th>
                                <th className="text-base-content/60 font-semibold">Statut</th>
                                <th className="pr-6 text-right text-base-content/60 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-base-200">
                            {alertes.map(alerte => (
                                <tr key={alerte.id} className="hover:bg-base-200/50 transition-colors">
                                    <td className="pl-6 font-medium text-base-content">{alerte.reference}</td>
                                    <td>
                                        <div className="font-bold text-base-content">{alerte.titre}</div>
                                        <div className="text-xs text-base-content/60">{alerte.description}</div>
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
                                        <Button variant="ghost" size="sm" className="btn-square btn-xs text-base-content/40 hover:text-primary"><Edit3 size={16}/></Button>
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
                     {notifications.map(notif => (
                        <Card key={notif.id} className={`border-l-4 ${notif.statut === 'Non lu' ? 'border-l-primary bg-primary/5' : 'border-l-base-200 bg-base-100'} hover:shadow-md transition-all cursor-pointer`}>
                            <div className="flex flex-col md:flex-row justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-full ${notif.type === 'Finance' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                        {notif.type === 'Finance' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className={`font-bold ${notif.statut === 'Non lu' ? 'text-base-content' : 'text-base-content/70'}`}>{notif.titre}</h3>
                                            {notif.statut === 'Non lu' && <span className="badge badge-primary badge-xs">Nouveau</span>}
                                        </div>
                                        <p className="text-sm text-base-content/70">{notif.message}</p>
                                        <div className="flex items-center gap-4 mt-2 text-xs text-base-content/40">
                                            <span className="flex items-center gap-1"><Clock size={12}/> {notif.date}</span>
                                            <span className="flex items-center gap-1"><Users size={12}/> {notif.destinataire}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 self-end md:self-center">
                                    <Button variant="ghost" size="sm" className="text-base-content/40 hover:text-primary">Marquer comme lu</Button>
                                </div>
                            </div>
                        </Card>
                     ))}
                </div>
            )}

            {activeTab === 'parametres' && (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {parametres.map(param => (
                        <Card key={param.id} className="hover:shadow-lg transition-all border border-base-200">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-base-200 rounded-lg">
                                    <Settings size={20} className="text-base-content/70"/>
                                </div>
                                <input type="checkbox" className="toggle toggle-primary" checked={param.actif} readOnly />
                            </div>
                            <h3 className="font-bold text-lg text-base-content mb-2">{param.nom}</h3>
                            <p className="text-sm text-base-content/60 mb-4 h-10">{param.description}</p>
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
