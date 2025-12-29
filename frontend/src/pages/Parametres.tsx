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
  Mail
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';

const Parametres: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profil' | 'notifications' | 'securite' | 'integrations'>('profil');

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-base-content">Paramètres</h1>
          <p className="text-base-content/70">Gérez vos préférences et la configuration de votre compte</p>
        </div>
        <Button variant="primary">
          <Save size={18} className="mr-2" />
          Enregistrer les modifications
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar de navigation */}
        <div className="md:w-64 flex-shrink-0 space-y-2">
            <button 
                onClick={() => setActiveTab('profil')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${activeTab === 'profil' ? 'bg-primary text-primary-content' : 'hover:bg-base-200 text-base-content'}`}
            >
                <User size={18} />
                <span>Mon Profil</span>
            </button>
            <button 
                onClick={() => setActiveTab('notifications')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${activeTab === 'notifications' ? 'bg-primary text-primary-content' : 'hover:bg-base-200 text-base-content'}`}
            >
                <Bell size={18} />
                <span>Notifications</span>
            </button>
            <button 
                onClick={() => setActiveTab('securite')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${activeTab === 'securite' ? 'bg-primary text-primary-content' : 'hover:bg-base-200 text-base-content'}`}
            >
                <Lock size={18} />
                <span>Sécurité</span>
            </button>
            <button 
                onClick={() => setActiveTab('integrations')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${activeTab === 'integrations' ? 'bg-primary text-primary-content' : 'hover:bg-base-200 text-base-content'}`}
            >
                <Globe size={18} />
                <span>Intégrations</span>
            </button>
        </div>

        {/* Contenu principal */}
        <div className="flex-1">
            {activeTab === 'profil' && (
                <div className="space-y-6">
                    <Card title="Informations Personnelles">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <Input label="Nom complet" placeholder="Votre nom" defaultValue="Waris Gestion" />
                            </div>
                            <div>
                                <Input label="Email" placeholder="votre@email.com" defaultValue="contact@waris.com" />
                            </div>
                            <div>
                                <Input label="Téléphone" placeholder="+229..." defaultValue="+229 97 00 00 00" />
                            </div>
                            <div>
                                <Input label="Ville" placeholder="Cotonou" defaultValue="Cotonou" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-2">Bio / Description</label>
                                <textarea className="textarea textarea-bordered w-full h-24" placeholder="Description de votre agence..."></textarea>
                            </div>
                        </div>
                    </Card>
                    <Card title="Préférences d'affichage">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Moon size={20} />
                                <div>
                                    <p className="font-medium">Mode Sombre</p>
                                    <p className="text-sm opacity-60">Activer le thème sombre pour l'interface</p>
                                </div>
                            </div>
                            <input type="checkbox" className="toggle toggle-primary" />
                        </div>
                    </Card>
                </div>
            )}

            {activeTab === 'notifications' && (
                <Card title="Préférences de Notifications">
                    <div className="space-y-6">
                        <div className="flex items-center justify-between border-b border-base-200 pb-4">
                            <div className="flex items-center gap-3">
                                <CreditCard size={20} className="text-primary" />
                                <div>
                                    <p className="font-medium">Paiements de loyer</p>
                                    <p className="text-sm opacity-60">Recevoir une alerte quand un loyer est payé</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <label className="label cursor-pointer gap-2">
                                    <span className="label-text">Email</span>
                                    <input type="checkbox" className="checkbox checkbox-primary" defaultChecked />
                                </label>
                                <label className="label cursor-pointer gap-2">
                                    <span className="label-text">SMS</span>
                                    <input type="checkbox" className="checkbox checkbox-primary" />
                                </label>
                            </div>
                        </div>

                        <div className="flex items-center justify-between border-b border-base-200 pb-4">
                            <div className="flex items-center gap-3">
                                <Smartphone size={20} className="text-secondary" />
                                <div>
                                    <p className="font-medium">Nouveaux messages</p>
                                    <p className="text-sm opacity-60">Alertes pour les messages des locataires</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <label className="label cursor-pointer gap-2">
                                    <span className="label-text">Email</span>
                                    <input type="checkbox" className="checkbox checkbox-primary" />
                                </label>
                                <label className="label cursor-pointer gap-2">
                                    <span className="label-text">Push</span>
                                    <input type="checkbox" className="checkbox checkbox-primary" defaultChecked />
                                </label>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Mail size={20} className="text-accent" />
                                <div>
                                    <p className="font-medium">Rapports mensuels</p>
                                    <p className="text-sm opacity-60">Recevoir le récapitulatif financier par mail</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <label className="label cursor-pointer gap-2">
                                    <span className="label-text">Email</span>
                                    <input type="checkbox" className="checkbox checkbox-primary" defaultChecked />
                                </label>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {activeTab === 'securite' && (
                <Card title="Sécurité du compte">
                    <div className="space-y-6">
                         <div>
                            <h3 className="font-medium mb-4">Changer de mot de passe</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="Mot de passe actuel" type="password" />
                                <div></div>
                                <Input label="Nouveau mot de passe" type="password" />
                                <Input label="Confirmer le nouveau mot de passe" type="password" />
                            </div>
                            <div className="mt-4">
                                <Button variant="ghost" className="border border-base-300">Mettre à jour le mot de passe</Button>
                            </div>
                         </div>
                         <div className="divider"></div>
                         <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-error">Zone de danger</p>
                                <p className="text-sm opacity-60">Supprimer définitivement votre compte et toutes ses données</p>
                            </div>
                            <Button variant="ghost" className="bg-error/10 text-error hover:bg-error/20">Supprimer mon compte</Button>
                         </div>
                    </div>
                </Card>
            )}

            {activeTab === 'integrations' && (
                <Card title="Intégrations & API">
                    <div className="grid grid-cols-1 gap-4">
                        <div className="border border-base-200 rounded-xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-yellow-400 rounded-lg flex items-center justify-center font-bold text-black text-xl">
                                    MTN
                                </div>
                                <div>
                                    <h4 className="font-bold">MTN Mobile Money</h4>
                                    <p className="text-sm opacity-60">Connecté • Compte principal</p>
                                </div>
                            </div>
                            <Button variant="ghost" className="text-success">Configuré</Button>
                        </div>

                        <div className="border border-base-200 rounded-xl p-4 flex items-center justify-between">
                             <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-xl">
                                    Moov
                                </div>
                                <div>
                                    <h4 className="font-bold">Moov Money</h4>
                                    <p className="text-sm opacity-60">Non connecté</p>
                                </div>
                            </div>
                            <Button variant="ghost" className="border border-base-300">Connecter</Button>
                        </div>
                    </div>
                </Card>
            )}
        </div>
      </div>
    </div>
  );
};

export default Parametres;
