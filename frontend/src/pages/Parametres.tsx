// frontend/src/pages/Parametres.tsx
import React, { useState, useEffect } from 'react';
import {
  User,
  Bell,
  Lock,
  CreditCard,
  Globe,
  Moon,
  Sun,
  Save,
  Smartphone,
  Mail,
  ChevronRight,
  Shield,
  Loader2,
  Check
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import { useUser } from '../contexts/UserContext';
import { updateProfile, changePassword } from '../api/authApi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const Parametres: React.FC = () => {
  const { user, refreshUser } = useUser();
  const canWrite = !['proprietaire', 'locataire'].includes(user?.userType || '');

  const [activeTab, setActiveTab] = useState<'profil' | 'notifications' | 'securite' | 'integrations'>('profil');
  const [savingProfil, setSavingProfil] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Profil form state — split nom into two parts
  const [profil, setProfil] = useState({ nom: '', prenom: '', email: '', telephone: '', bio: '' });
  const [darkMode, setDarkMode] = useState(false);

  // Password form state
  const [pwdForm, setPwdForm] = useState({ current: '', next: '', confirm: '' });

  // Sync form with loaded user
  useEffect(() => {
    if (!user) return;
    const parts = (user.nom || '').split(' ');
    setProfil({
      nom: parts[0] || '',
      prenom: parts.slice(1).join(' ') || '',
      email: user.email || '',
      telephone: user.telephone || '',
      bio: user.preferences?.bio || ''
    });
    setDarkMode(user.preferences?.theme === 'dark');
  }, [user]);

  const initials = (() => {
    const parts = (user?.nom || '').split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return 'U';
  })();

  const handleSaveProfil = async () => {
    if (!profil.email) { toast.error('L\'email est requis'); return; }
    setSavingProfil(true);
    try {
      await updateProfile({
        nom: profil.nom,
        prenom: profil.prenom,
        email: profil.email,
        telephone: profil.telephone,
        preferences: { ...(user?.preferences || {}), bio: profil.bio, theme: darkMode ? 'dark' : 'light' }
      });
      await refreshUser();
      toast.success('Profil mis à jour avec succès');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setSavingProfil(false);
    }
  };

  const handleThemeToggle = async (enabled: boolean) => {
    setDarkMode(enabled);
    const theme = enabled ? 'dark' : 'light';
    // Apply theme immediately to DOM
    if (enabled) {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'hopegestion');
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
    // Persist to backend silently
    try {
      await updateProfile({
        nom: profil.nom,
        prenom: profil.prenom,
        email: profil.email,
        telephone: profil.telephone,
        preferences: { ...(user?.preferences || {}), bio: profil.bio, theme }
      });
      await refreshUser();
    } catch {
      // Non-critical — theme already applied locally
    }
  };

  const handleChangePassword = async () => {
    if (!pwdForm.current || !pwdForm.next || !pwdForm.confirm) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    if (pwdForm.next !== pwdForm.confirm) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    if (pwdForm.next.length < 6) {
      toast.error('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword(pwdForm.current, pwdForm.next);
      setPwdForm({ current: '', next: '', confirm: '' });
      toast.success('Mot de passe modifié avec succès');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du changement de mot de passe');
    } finally {
      setSavingPassword(false);
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
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-base-content tracking-tight">
            Paramètres & Configuration <span className="text-primary">.</span>
          </h1>
          <p className="text-base-content/60 font-medium mt-1">
            Personnalisez votre expérience et sécurisez votre compte.
          </p>
        </div>
        {activeTab === 'profil' && (
          <Button
            variant="primary"
            onClick={handleSaveProfil}
            disabled={savingProfil}
            className="rounded-full px-6 h-10 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all font-semibold"
          >
            {savingProfil
              ? <Loader2 size={18} className="mr-2 animate-spin" />
              : <Save size={18} className="mr-2" />
            }
            {savingProfil ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        )}
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <motion.div variants={itemVariants} className="lg:w-72 flex-shrink-0">
          <Card className="p-2 border-none shadow-lg bg-base-100 sticky top-6">
            <nav className="space-y-1">
              {[
                { id: 'profil', icon: User, label: 'Mon Profil' },
                { id: 'notifications', icon: Bell, label: 'Notifications' },
                { id: 'securite', icon: Shield, label: 'Sécurité' },
                { id: 'integrations', icon: Globe, label: 'Intégrations' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 font-medium ${
                    activeTab === item.id
                      ? 'bg-primary text-white shadow-md shadow-primary/30'
                      : 'text-base-content/70 hover:bg-base-200 hover:text-primary'
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

        {/* Contenu */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">

            {/* ── PROFIL ── */}
            {activeTab === 'profil' && (
              <motion.div
                key="profil"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <Card title="Informations Personnelles" className="border-none shadow-xl bg-base-100/80 backdrop-blur-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Avatar */}
                    <div className="md:col-span-2 flex justify-center mb-4">
                      <div className="relative">
                        <div className="avatar placeholder">
                          <div className="bg-primary text-white rounded-full w-24 h-24 flex items-center justify-center text-3xl font-bold">
                            {initials}
                          </div>
                        </div>
                      </div>
                    </div>

                    <Input
                      label="Nom"
                      placeholder="Votre nom de famille"
                      value={profil.nom}
                      onChange={e => setProfil({ ...profil, nom: e.target.value })}
                    />
                    <Input
                      label="Prénom(s)"
                      placeholder="Votre prénom"
                      value={profil.prenom}
                      onChange={e => setProfil({ ...profil, prenom: e.target.value })}
                    />
                    <Input
                      label="Email"
                      type="email"
                      placeholder="votre@email.com"
                      value={profil.email}
                      onChange={e => setProfil({ ...profil, email: e.target.value })}
                      startIcon={<Mail size={16} />}
                    />
                    <Input
                      label="Téléphone"
                      placeholder="+229..."
                      value={profil.telephone}
                      onChange={e => setProfil({ ...profil, telephone: e.target.value })}
                      startIcon={<Smartphone size={16} />}
                    />
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-base-content/80 mb-2">Bio / Description</label>
                      <textarea
                        className="textarea textarea-bordered w-full h-24 bg-base-200 focus:bg-base-100 transition-colors"
                        placeholder="Description de votre agence..."
                        value={profil.bio}
                        onChange={e => setProfil({ ...profil, bio: e.target.value })}
                      />
                    </div>
                  </div>
                </Card>

                <Card title="Apparence" className="border-none shadow-xl bg-base-100">
                  <div className="flex items-center justify-between p-2">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${darkMode ? 'bg-teal-900 text-teal-300' : 'bg-teal-100 text-teal-600'}`}>
                        {darkMode ? <Moon size={24} /> : <Sun size={24} />}
                      </div>
                      <div>
                        <p className="font-bold text-base-content/90">Mode Sombre</p>
                        <p className="text-sm text-base-content/60">Activer le thème sombre pour l'interface</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      aria-label="Activer le mode sombre"
                      className="toggle toggle-primary toggle-lg"
                      checked={darkMode}
                      onChange={e => handleThemeToggle(e.target.checked)}
                    />
                  </div>
                </Card>
              </motion.div>
            )}

            {/* ── NOTIFICATIONS ── */}
            {activeTab === 'notifications' && (
              <motion.div
                key="notifications"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card title="Préférences de Notifications" className="border-none shadow-xl bg-base-100">
                  <div className="space-y-8">
                    {[
                      { icon: CreditCard, color: 'text-primary', bg: 'bg-primary/10', title: 'Paiements de loyer', desc: 'Recevoir une alerte quand un loyer est payé' },
                      { icon: Smartphone, color: 'text-secondary', bg: 'bg-secondary/10', title: 'Nouveaux messages', desc: 'Alertes pour les messages des locataires' },
                      { icon: Mail, color: 'text-accent', bg: 'bg-accent/10', title: 'Rapports mensuels', desc: 'Recevoir le récapitulatif financier par mail' }
                    ].map((item, index) => (
                      <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl hover:bg-base-200 transition-colors border border-base-200">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 ${item.bg} ${item.color} rounded-xl`}>
                            <item.icon size={24} />
                          </div>
                          <div>
                            <p className="font-bold text-base-content/90">{item.title}</p>
                            <p className="text-sm text-base-content/60">{item.desc}</p>
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

            {/* ── SÉCURITÉ ── */}
            {activeTab === 'securite' && (
              <motion.div
                key="securite"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <Card title="Sécurité du compte" className="border-none shadow-xl bg-base-100">
                  <div className="space-y-8">
                    <div>
                      <h3 className="font-bold text-base-content/90 mb-6 flex items-center gap-2">
                        <Lock className="text-primary" size={20} />
                        Changer de mot de passe
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-base-200 rounded-2xl border border-base-200">
                        <Input
                          label="Mot de passe actuel"
                          type="password"
                          value={pwdForm.current}
                          onChange={e => setPwdForm({ ...pwdForm, current: e.target.value })}
                        />
                        <div className="hidden md:block" />
                        <Input
                          label="Nouveau mot de passe"
                          type="password"
                          value={pwdForm.next}
                          onChange={e => setPwdForm({ ...pwdForm, next: e.target.value })}
                        />
                        <Input
                          label="Confirmer le nouveau mot de passe"
                          type="password"
                          value={pwdForm.confirm}
                          onChange={e => setPwdForm({ ...pwdForm, confirm: e.target.value })}
                        />
                        <div className="md:col-span-2 flex justify-end">
                          <Button
                            variant="ghost"
                            onClick={handleChangePassword}
                            disabled={savingPassword}
                            className="bg-base-100 shadow-sm border border-base-300"
                          >
                            {savingPassword
                              ? <><Loader2 size={16} className="mr-2 animate-spin" />Mise à jour...</>
                              : <><Check size={16} className="mr-2" />Mettre à jour</>
                            }
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* ── INTÉGRATIONS ── */}
            {activeTab === 'integrations' && (
              <motion.div
                key="integrations"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card title="Intégrations & API" className="border-none shadow-xl bg-base-100">
                  <div className="grid grid-cols-1 gap-6">
                    {[
                      { name: 'MTN Mobile Money', status: 'Connecté • Compte principal', connected: true, color: 'bg-yellow-400 text-black', iconText: 'MTN' },
                      { name: 'Moov Money', status: 'Non connecté', connected: false, color: 'bg-teal-600 text-white', iconText: 'Moov' },
                      { name: 'Celtiis Cash', status: 'Non connecté', connected: false, color: 'bg-teal-600 text-white', iconText: 'Celtiis' }
                    ].map((item, index) => (
                      <div key={index} className="border border-base-200 rounded-2xl p-6 flex items-center justify-between hover:shadow-lg transition-all duration-300 bg-base-100">
                        <div className="flex items-center gap-6">
                          <div className={`w-16 h-16 ${item.color} rounded-2xl flex items-center justify-center font-bold text-xl shadow-md`}>
                            {item.iconText}
                          </div>
                          <div>
                            <h4 className="font-bold text-lg text-base-content/90">{item.name}</h4>
                            <p className={`text-sm font-medium ${item.connected ? 'text-success' : 'text-base-content/50'}`}>{item.status}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          className={item.connected ? 'text-success bg-success/10' : 'border border-base-300'}
                        >
                          {item.connected ? 'Configuré' : 'Connecter'}
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
