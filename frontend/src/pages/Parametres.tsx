// frontend/src/pages/Parametres.tsx
import React, { useState } from 'react';
import { 
  User, 
  Bell, 
  Lock, 
  CreditCard, 
  Globe, 
  Moon, 
  Save,
  Smartphone,
  Mail,
  ChevronRight,
  Shield,
  Zap,
  LogOut
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';

const Parametres: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profil' | 'notifications' | 'securite' | 'integrations'>('profil');

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
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Paramètres & Configuration <span className="text-primary">.</span>
          </h1>
          <p className="text-gray-500 font-medium mt-1">
            Personnalisez votre expérience et sécurisez votre compte.
          </p>
        </div>
        <Button 
            variant="primary" 
            className="rounded-full px-6 h-10 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all font-semibold"
        >
          <Save size={18} className="mr-2" />
          Enregistrer
        </Button>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar de navigation */}
        <motion.div variants={itemVariants} className="lg:w-72 flex-shrink-0 space-y-2">
            <Card className="p-2 border-none shadow-lg bg-white sticky top-6">
                <nav className="space-y-1">
                    {[
                        { id: 'profil', icon: User, label: 'Mon Profil' },
                        { id: 'notifications', icon: Bell, label: 'Notifications' },
                        { id: 'securite', icon: Shield, label: 'Sécurité' },
                        { id: 'integrations', icon: Globe, label: 'Intégrations' },
                    ].map((item) => (
                        <button 
                            key={item.id}
                            onClick={() => setActiveTab(item.id as any)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 font-medium ${
                                activeTab === item.id 
                                ? 'bg-primary text-white shadow-md shadow-primary/30' 
                                : 'text-gray-600 hover:bg-gray-50 hover:text-primary'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <item.icon size={18} />
                                <span>{item.label}</span>
                            </div>
                            {activeTab === item.id && <ChevronRight size={16} />}
                        </button>
                    ))}
                </nav>
            </Card>
        </motion.div>

        {/* Contenu principal */}
        <div className="flex-1 min-w-0">
             <AnimatePresence mode="wait">
            {activeTab === 'profil' && (
                <motion.div 
                    key="profil"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                >
                    <Card title="Informations Personnelles" className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="md:col-span-2 flex justify-center mb-4">
                                <div className="relative">
                                    <div className="avatar placeholder">
                                        <div className="bg-neutral text-neutral-content rounded-full w-24 h-24 flex items-center justify-center text-3xl font-bold">
                                            WG
                                        </div>
                                    </div>
                                    <button className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-lg border-2 border-white hover:bg-primary-focus transition-colors">
                                        <User size={16} />
                                    </button>
                                </div>
                             </div>
                            <Input label="Nom complet" placeholder="Votre nom" defaultValue="Waris Gestion" />
                            <Input label="Email" placeholder="votre@email.com" defaultValue="contact@waris.com" startIcon={<Mail size={16}/>} />
                            <Input label="Téléphone" placeholder="+229..." defaultValue="+229 97 00 00 00" startIcon={<Smartphone size={16}/>} />
                            <Input label="Ville" placeholder="Cotonou" defaultValue="Cotonou" />
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Bio / Description</label>
                                <textarea className="textarea textarea-bordered w-full h-24 bg-gray-50 focus:bg-white transition-colors" placeholder="Description de votre agence..."></textarea>
                            </div>
                        </div>
                    </Card>
                    <Card title="Apparence" className="border-none shadow-xl bg-white">
                        <div className="flex items-center justify-between p-2">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                                     <Moon size={24} />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-800">Mode Sombre</p>
                                    <p className="text-sm text-gray-500">Activer le thème sombre pour l'interface</p>
                                </div>
                            </div>
                            <input type="checkbox" className="toggle toggle-primary toggle-lg" />
                        </div>
                    </Card>
                </motion.div>
            )}

            {activeTab === 'notifications' && (
                <motion.div 
                    key="notifications"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                >
                    <Card title="Préférences de Notifications" className="border-none shadow-xl bg-white">
                        <div className="space-y-8">
                            {[
                                { icon: CreditCard, color: 'text-primary', bg: 'bg-primary/10', title: 'Paiements de loyer', desc: 'Recevoir une alerte quand un loyer est payé' },
                                { icon: Smartphone, color: 'text-secondary', bg: 'bg-secondary/10', title: 'Nouveaux messages', desc: 'Alertes pour les messages des locataires' },
                                { icon: Mail, color: 'text-accent', bg: 'bg-accent/10', title: 'Rapports mensuels', desc: 'Recevoir le récapitulatif financier par mail' }
                            ].map((item, index) => (
                                <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 ${item.bg} ${item.color} rounded-xl`}>
                                            <item.icon size={24} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800">{item.title}</p>
                                            <p className="text-sm text-gray-500">{item.desc}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-6 pl-14 sm:pl-0">
                                        <label className="label cursor-pointer gap-2 flex-col items-center">
                                            <span className="label-text text-xs font-semibold">Email</span>
                                            <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" defaultChecked />
                                        </label>
                                        <label className="label cursor-pointer gap-2 flex-col items-center">
                                            <span className="label-text text-xs font-semibold">Push</span>
                                            <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" />
                                        </label>
                                        <label className="label cursor-pointer gap-2 flex-col items-center">
                                            <span className="label-text text-xs font-semibold">SMS</span>
                                            <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" />
                                        </label>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </motion.div>
            )}

            {activeTab === 'securite' && (
                <motion.div 
                    key="securite"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                >
                    <Card title="Sécurité du compte" className="border-none shadow-xl bg-white">
                        <div className="space-y-8">
                             <div>
                                <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><Lock className="text-primary" size={20}/> Changer de mot de passe</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                                    <Input label="Mot de passe actuel" type="password" />
                                    <div className="hidden md:block"></div>
                                    <Input label="Nouveau mot de passe" type="password" />
                                    <Input label="Confirmer le nouveau mot de passe" type="password" />
                                    <div className="md:col-span-2 flex justify-end">
                                         <Button variant="ghost" className="bg-white shadow-sm border border-gray-200">Mettre à jour</Button>
                                    </div>
                                </div>
                             </div>
                             
                             <div className="border border-error/20 bg-error/5 rounded-2xl p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-error/10 text-error rounded-xl">
                                             <LogOut size={24} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-error">Zone de danger</p>
                                            <p className="text-sm text-error/70">Supprimer définitivement votre compte et toutes ses données</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" className="bg-white text-error hover:bg-error hover:text-white border border-error/20">Supprimer</Button>
                                </div>
                             </div>
                        </div>
                    </Card>
                </motion.div>
            )}

            {activeTab === 'integrations' && (
                <motion.div 
                    key="integrations"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                >
                    <Card title="Intégrations & API" className="border-none shadow-xl bg-white">
                        <div className="grid grid-cols-1 gap-6">
                            {[
                                { name: 'MTN Mobile Money', status: 'Connecté • Compte principal', connected: true, color: 'bg-yellow-400 text-black', iconText: 'MTN' },
                                { name: 'Moov Money', status: 'Non connecté', connected: false, color: 'bg-blue-600 text-white', iconText: 'Moov' },
                                { name: 'Celtiis Cash', status: 'Non connecté', connected: false, color: 'bg-indigo-600 text-white', iconText: 'Celtiis' }
                            ].map((item, index) => (
                                <div key={index} className="border border-gray-100 rounded-2xl p-6 flex items-center justify-between hover:shadow-lg transition-all duration-300 bg-white">
                                    <div className="flex items-center gap-6">
                                        <div className={`w-16 h-16 ${item.color} rounded-2xl flex items-center justify-center font-bold text-xl shadow-md`}>
                                            {item.iconText}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-lg text-gray-800">{item.name}</h4>
                                            <p className={`text-sm font-medium ${item.connected ? 'text-success' : 'text-gray-400'}`}>{item.status}</p>
                                        </div>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        className={item.connected ? "text-success bg-success/10" : "border border-gray-200"}
                                    >
                                        {item.connected ? "Configuré" : "Connecter"}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </Card>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default Parametres;
