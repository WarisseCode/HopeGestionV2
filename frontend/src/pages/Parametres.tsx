// frontend/src/pages/Parametres.tsx
// Page de réglages du compte (source unique). Regroupe ce qui était auparavant
// éclaté entre « Mon Compte › Mon Profil » (CompteProfil) et l'ancienne page
// Paramètres décorative : identité + photo, préférences (thème/langue),
// notifications réelles, sécurité (mot de passe).
//
// Tout est câblé sur accountApi (endpoints /auth/profile + /auth/change-password),
// et on appelle refreshUser() après sauvegarde pour resynchroniser le contexte
// global. Les textes passent par i18n (useTranslation).

import React, { useState, useEffect } from 'react';
import {
  User, Bell, Lock, Globe, Moon, Sun, Save, Smartphone, Mail,
  ChevronRight, Shield, Loader2, Check, Camera, MessageCircle, SlidersHorizontal
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import { useUser } from '../contexts/UserContext';
import { accountApi } from '../api/accountApi';
import { API_BASE, API_URL } from '../config';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

type Tab = 'profil' | 'preferences' | 'notifications' | 'securite';

const Parametres: React.FC = () => {
  const { refreshUser } = useUser();
  const { t, i18n } = useTranslation();

  const [activeTab, setActiveTab] = useState<Tab>('profil');
  const [loading, setLoading] = useState(true);
  const [savingAll, setSavingAll] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // photo_url est géré à part (upload immédiat) : on ne le met pas dans formData.
  const [photoUrl, setPhotoUrl] = useState<string>('');

  // État unique du formulaire : profil + préférences + notifications.
  const [form, setForm] = useState({
    nom: '', prenom: '', email: '', telephone: '',
    language: 'fr', currency: 'XOF', timezone: 'GMT+1', theme: 'light',
    notifEmail: true, notifWhatsApp: false,
  });

  const [pwdForm, setPwdForm] = useState({ current: '', next: '', confirm: '' });

  // ── Chargement initial depuis l'API réelle ──
  useEffect(() => {
    (async () => {
      try {
        const data: any = await accountApi.getProfile();
        setPhotoUrl(data.photo_url || '');
        setForm({
          nom: data.nom || '',
          prenom: data.prenom || '',
          email: data.email || '',
          telephone: data.telephone || '',
          language: data.preferences?.language || 'fr',
          currency: data.preferences?.currency || 'XOF',
          timezone: data.preferences?.timezone || 'GMT+1',
          theme: data.preferences?.theme || 'light',
          notifEmail: data.preferences?.notifications?.email ?? true,
          notifWhatsApp: data.preferences?.notifications?.whatsapp ?? false,
        });
      } catch {
        toast.error(t('settings.loadError'));
      } finally {
        setLoading(false);
      }
    })();
  }, [t]);

  const initials = (() => {
    const a = form.prenom?.charAt(0) || '';
    const b = form.nom?.charAt(0) || '';
    return (a + b).toUpperCase() || 'U';
  })();

  // Construit le payload complet attendu par /auth/profile.
  const buildPayload = () => ({
    nom: form.nom,
    prenom: form.prenom,
    email: form.email,
    telephone: form.telephone,
    photo_url: photoUrl,
    preferences: {
      language: form.language,
      currency: form.currency,
      timezone: form.timezone,
      theme: form.theme,
      notifications: { email: form.notifEmail, whatsapp: form.notifWhatsApp },
    },
  });

  // Applique le thème au DOM + localStorage immédiatement (aperçu instantané).
  const applyTheme = (theme: 'light' | 'dark') => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'hopegestion');
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
    setForm(f => ({ ...f, theme }));
  };

  // Bascule la langue instantanément (re-rendu via i18n) ; persistée au save.
  const handleLanguageChange = (lang: string) => {
    setForm(f => ({ ...f, language: lang }));
    i18n.changeLanguage(lang);
  };

  const handleSaveAll = async () => {
    if (!form.email) { toast.error(t('settings.emailRequired')); return; }
    setSavingAll(true);
    try {
      await accountApi.updateProfile(buildPayload());
      await refreshUser();
      toast.success(t('settings.saved'));
    } catch (err: any) {
      toast.error(err.message || t('settings.updateError'));
    } finally {
      setSavingAll(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', 'avatar');
    const tid = toast.loading(t('settings.photoUploading'));
    try {
      const res = await fetch(`${API_URL}/upload`, { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok && data.files?.[0]) {
        const url = `${API_BASE}${data.files[0].path}`;
        setPhotoUrl(url);
        // Persistance immédiate de la photo (UX : pas besoin de cliquer Enregistrer).
        await accountApi.updateProfile({ ...buildPayload(), photo_url: url });
        await refreshUser();
        toast.success(t('settings.photoUpdated'), { id: tid });
      } else {
        throw new Error(data.message || 'Erreur inconnue');
      }
    } catch {
      toast.error(t('settings.photoError'), { id: tid });
    }
  };

  const handleChangePassword = async () => {
    if (!pwdForm.current || !pwdForm.next || !pwdForm.confirm) {
      toast.error(t('settings.pwdFillAll')); return;
    }
    if (pwdForm.next !== pwdForm.confirm) {
      toast.error(t('settings.pwdMismatch')); return;
    }
    if (pwdForm.next.length < 6) {
      toast.error(t('settings.pwdTooShort')); return;
    }
    setSavingPassword(true);
    try {
      await accountApi.changePassword({ currentPassword: pwdForm.current, newPassword: pwdForm.next });
      setPwdForm({ current: '', next: '', confirm: '' });
      toast.success(t('settings.pwdChanged'));
    } catch (err: any) {
      toast.error(err.message || t('settings.pwdError'));
    } finally {
      setSavingPassword(false);
    }
  };

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );

  // Le bouton « Enregistrer » global ne concerne pas l'onglet Sécurité
  // (qui a son propre bouton de validation du mot de passe).
  const showSaveButton = activeTab !== 'securite';

  return (
    <motion.div
      className="space-y-8 max-w-[1600px] mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-base-content tracking-tight">
            {t('settings.title')} <span className="text-primary">.</span>
          </h1>
          <p className="text-base-content/60 font-medium mt-1">
            {t('settings.subtitle')}
          </p>
        </div>
        {showSaveButton && (
          <Button
            variant="primary"
            onClick={handleSaveAll}
            disabled={savingAll}
            className="rounded-full px-6 h-10 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all font-semibold"
          >
            {savingAll ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Save size={18} className="mr-2" />}
            {savingAll ? t('common.saving') : t('common.save')}
          </Button>
        )}
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar des onglets */}
        <motion.div variants={itemVariants} className="lg:w-72 flex-shrink-0">
          <Card className="p-2 border-none shadow-lg bg-base-100 sticky top-6">
            <nav className="space-y-1">
              {([
                { id: 'profil', icon: User, label: t('settings.tabs.profile') },
                { id: 'preferences', icon: SlidersHorizontal, label: t('settings.tabs.preferences') },
                { id: 'notifications', icon: Bell, label: t('settings.tabs.notifications') },
                { id: 'securite', icon: Shield, label: t('settings.tabs.security') },
              ] as { id: Tab; icon: any; label: string }[]).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
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
              <motion.div key="profil" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <Card title={t('settings.personalInfo')} className="border-none shadow-xl bg-base-100/80 backdrop-blur-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Avatar + upload */}
                    <div className="md:col-span-2 flex justify-center mb-4">
                      <div className="relative group w-24 h-24">
                        <div className="w-full h-full rounded-full overflow-hidden border-4 border-base-100 shadow-xl bg-primary text-white flex items-center justify-center text-3xl font-bold">
                          {photoUrl
                            ? <img src={photoUrl} alt="Profil" className="w-full h-full object-cover" />
                            : initials}
                        </div>
                        <label className="absolute inset-0 cursor-pointer rounded-full bg-black/0 hover:bg-black/30 transition-all flex items-center justify-center opacity-0 hover:opacity-100">
                          <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                          <span className="text-white text-xs font-medium flex flex-col items-center gap-1">
                            <Camera size={18} />
                            {t('settings.modify')}
                          </span>
                        </label>
                        <div className="absolute bottom-0 right-0 bg-primary text-white p-1.5 rounded-full pointer-events-none shadow-lg border-2 border-base-100">
                          <Camera size={12} />
                        </div>
                      </div>
                    </div>

                    <Input label={t('settings.name')} placeholder={t('settings.namePlaceholder')}
                      value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} />
                    <Input label={t('settings.firstName')} placeholder={t('settings.firstNamePlaceholder')}
                      value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} />
                    <Input label={t('settings.email')} type="email" placeholder="votre@email.com" startIcon={<Mail size={16} />}
                      value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                    <Input label={t('settings.phone')} placeholder="+229..." startIcon={<Smartphone size={16} />}
                      value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} />
                  </div>
                </Card>
              </motion.div>
            )}

            {/* ── PRÉFÉRENCES ── */}
            {activeTab === 'preferences' && (
              <motion.div key="preferences" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <Card title={t('settings.appearance')} className="border-none shadow-xl bg-base-100">
                  <div className="grid grid-cols-2 gap-4 max-w-md">
                    <button type="button" onClick={() => applyTheme('light')}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${form.theme === 'light' ? 'border-primary bg-primary/5 shadow-sm' : 'border-base-200 hover:border-base-300'}`}>
                      <div className="p-3 rounded-full bg-base-300 text-base-content/70"><Sun size={20} /></div>
                      <span className="font-medium text-sm">{t('settings.themeLight')}</span>
                    </button>
                    <button type="button" onClick={() => applyTheme('dark')}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${form.theme === 'dark' ? 'border-primary bg-primary/5 shadow-sm' : 'border-base-200 hover:border-base-300'}`}>
                      <div className="p-3 rounded-full bg-gray-800 text-white"><Moon size={20} /></div>
                      <span className="font-medium text-sm">{t('settings.themeDark')}</span>
                    </button>
                  </div>
                </Card>

                <Card title={t('settings.language')} className="border-none shadow-xl bg-base-100">
                  <div className="max-w-sm space-y-1.5">
                    <label className="text-sm font-bold text-base-content/80 flex items-center gap-2"><Globe size={15} /> {t('settings.languageLabel')}</label>
                    <select aria-label={t('settings.languageLabel')} value={form.language} onChange={e => handleLanguageChange(e.target.value)}
                      className="select select-bordered w-full bg-base-200 focus:bg-base-100">
                      <option value="fr">Français (France)</option>
                      <option value="en">English (US)</option>
                    </select>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* ── NOTIFICATIONS ── */}
            {activeTab === 'notifications' && (
              <motion.div key="notifications" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <Card title={t('settings.notifChannels')} className="border-none shadow-xl bg-base-100">
                  <div className="space-y-4">
                    {/* Email — réellement persisté dans preferences.notifications.email */}
                    <label className="flex items-center justify-between gap-4 p-4 rounded-xl border border-base-200 hover:bg-base-200 transition-colors cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 text-primary rounded-xl"><Mail size={22} /></div>
                        <div>
                          <p className="font-bold text-base-content/90">{t('settings.emailSystem')}</p>
                          <p className="text-sm text-base-content/60">{t('settings.emailSystemDesc')}</p>
                        </div>
                      </div>
                      <input type="checkbox" className="toggle toggle-primary toggle-lg"
                        checked={form.notifEmail} onChange={e => setForm({ ...form, notifEmail: e.target.checked })} />
                    </label>

                    {/* WhatsApp — réellement persisté dans preferences.notifications.whatsapp */}
                    <label className="flex items-center justify-between gap-4 p-4 rounded-xl border border-base-200 hover:bg-base-200 transition-colors cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-100 text-green-600 rounded-xl"><MessageCircle size={22} /></div>
                        <div>
                          <p className="font-bold text-base-content/90">{t('settings.whatsapp')}</p>
                          <p className="text-sm text-base-content/60">{t('settings.whatsappDesc')}</p>
                        </div>
                      </div>
                      <input type="checkbox" className="toggle toggle-success toggle-lg"
                        checked={form.notifWhatsApp} onChange={e => setForm({ ...form, notifWhatsApp: e.target.checked })} />
                    </label>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* ── SÉCURITÉ ── */}
            {activeTab === 'securite' && (
              <motion.div key="securite" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <Card title={t('settings.accountSecurity')} className="border-none shadow-xl bg-base-100">
                  <div>
                    <h3 className="font-bold text-base-content/90 mb-6 flex items-center gap-2">
                      <Lock className="text-primary" size={20} /> {t('settings.changePassword')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-base-200 rounded-2xl border border-base-200">
                      <Input label={t('settings.currentPassword')} type="password"
                        value={pwdForm.current} onChange={e => setPwdForm({ ...pwdForm, current: e.target.value })} />
                      <div className="hidden md:block" />
                      <Input label={t('settings.newPassword')} type="password"
                        value={pwdForm.next} onChange={e => setPwdForm({ ...pwdForm, next: e.target.value })} />
                      <Input label={t('settings.confirmPassword')} type="password"
                        value={pwdForm.confirm} onChange={e => setPwdForm({ ...pwdForm, confirm: e.target.value })} />
                      <div className="md:col-span-2 flex justify-end">
                        <Button variant="ghost" onClick={handleChangePassword} disabled={savingPassword}
                          className="bg-base-100 shadow-sm border border-base-300">
                          {savingPassword
                            ? <><Loader2 size={16} className="mr-2 animate-spin" />{t('common.updating')}</>
                            : <><Check size={16} className="mr-2" />{t('common.update')}</>}
                        </Button>
                      </div>
                    </div>
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
