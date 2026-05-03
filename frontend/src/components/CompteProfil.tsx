import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Camera, Globe, DollarSign, Clock, Save, Lock, MessageCircle, X, Eye, EyeOff, Shield, ShieldCheck, Smartphone, Monitor, ChevronRight, Moon, Sun } from 'lucide-react';
import { accountApi } from '../api/accountApi';
import { API_BASE, API_URL } from '../config';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface UserProfile {
    id: number;
    nom: string;
    prenom: string;
    email: string;
    telephone?: string;
    role: string;
    photo_url?: string;
    preferences?: {
        language: string;
        currency: string;
        timezone: string;
        theme?: string;
        notifications: {
            email: boolean;
            whatsapp: boolean;
        };
    };
}

const CompteProfil: React.FC = () => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [initialDataStr, setInitialDataStr] = useState<string>('');

    // Form State
    const [formData, setFormData] = useState({
        nom: '',
        prenom: '',
        email: '',
        telephone: '',
        language: 'fr',
        currency: 'XOF',
        timezone: 'GMT+1',
        theme: 'light',
        notifEmail: true,
        notifWhatsApp: false
    });

    // Password Modal State
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const data = await accountApi.getProfile();
            setProfile(data);
            const loadedData = {
                nom: data.nom || '',
                prenom: data.prenom || '',
                email: data.email || '',
                telephone: data.telephone || '',
                language: data.preferences?.language || 'fr',
                currency: data.preferences?.currency || 'XOF',
                timezone: data.preferences?.timezone || 'GMT+1',
                theme: data.preferences?.theme || 'light',
                notifEmail: data.preferences?.notifications?.email ?? true,
                notifWhatsApp: data.preferences?.notifications?.whatsapp ?? false
            };
            setFormData(loadedData);
            setInitialDataStr(JSON.stringify(loadedData));
        } catch (error) {
            console.error('Erreur chargement profil:', error);
            toast.error('Erreur lors du chargement du profil.');
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        formDataUpload.append('type', 'avatar');

        const loadingToast = toast.loading('Téléchargement de la photo...');
        
        try {
            const response = await fetch(`${API_URL}/upload`, {
                method: 'POST',
                body: formDataUpload,
            });
            const data = await response.json();
            
            if (response.ok && data.files?.[0]) {
                const photoUrl = `${API_BASE}${data.files[0].path}`;
                
                // Immediately update backend profile
                await accountApi.updateProfile({ ...formData, photo_url: photoUrl });
                
                // Update local state
                if (profile) setProfile({ ...profile, photo_url: photoUrl });
                toast.success('Photo de profil mise à jour !', { id: loadingToast });
            } else {
                throw new Error(data.message || 'Erreur inconnue');
            }
        } catch (err) {
            console.error('Upload error:', err);
            toast.error("Erreur lors de l'upload de la photo.", { id: loadingToast });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const saveToast = toast.loading('Enregistrement des modifications...');

        try {
            const preferences = {
                language: formData.language,
                currency: formData.currency,
                timezone: formData.timezone,
                theme: formData.theme,
                notifications: {
                    email: formData.notifEmail,
                    whatsapp: formData.notifWhatsApp
                }
            };

            const payload = {
                nom: formData.nom,
                prenom: formData.prenom,
                email: formData.email,
                telephone: formData.telephone,
                photo_url: profile?.photo_url || '',
                preferences: preferences
            };

            await accountApi.updateProfile(payload);
            toast.success('Profil mis à jour avec succès !', { id: saveToast });
            
            // Reload to ensure sync
            const updated = await accountApi.getProfile();
            setProfile(updated);
            setInitialDataStr(JSON.stringify(formData));

        } catch (error) {
            toast.error('Erreur lors de la mise à jour.', { id: saveToast });
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error("Les nouveaux mots de passe ne correspondent pas.");
            return;
        }

        const passToast = toast.loading('Modification du mot de passe...');
        try {
            await accountApi.changePassword({ 
                currentPassword: passwordData.oldPassword, 
                newPassword: passwordData.newPassword 
            });
            toast.success("Mot de passe modifié avec succès !", { id: passToast });
            setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
            setShowPasswordModal(false);
        } catch (err: any) {
            toast.error(err.message || "Erreur lors du changement de mot de passe.", { id: passToast });
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    );

    // Animation variants
    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-12">
            
            {/* Header: Photo + Identity (Glassmorphism inspired) */}
            <motion.div 
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="bg-base-100 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl p-8 shadow-sm border border-base-200 dark:border-slate-700/50 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden"
            >
                {/* Decorative background blur */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-blue-100/40 rounded-full blur-3xl pointer-events-none"></div>

                {/* Photo Section */}
                <div className="relative group z-10 w-32 h-32">
                    <div className="w-full h-full rounded-full overflow-hidden border-4 border-white shadow-xl bg-base-200 dark:bg-slate-900/50 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                        {profile?.photo_url ? (
                            <img src={profile.photo_url} alt="Profil" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-4xl font-bold text-base-content/40">
                                {formData.prenom.charAt(0)}{formData.nom.charAt(0)}
                            </span>
                        )}
                    </div>
                    
                    <label className="absolute inset-0 cursor-pointer rounded-full bg-black/0 hover:bg-black/30 transition-all flex items-center justify-center backdrop-blur-[2px] opacity-0 hover:opacity-100">
                        <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden"
                            onChange={handlePhotoUpload}
                        />
                        <span className="text-white text-xs font-medium flex flex-col items-center gap-1">
                            <Camera size={20} />
                            Modifier
                        </span>
                    </label>
                    <div className="absolute bottom-1 right-1 bg-primary text-white p-2 rounded-full pointer-events-none shadow-lg border-2 border-white transition-transform group-hover:scale-110">
                        <Camera size={14} />
                    </div>
                </div>

                {/* Info Essentielle */}
                <div className="text-center md:text-left flex-1 z-10">
                    <h2 className="text-3xl font-extrabold text-base-content dark:text-white mb-2 tracking-tight">
                        {formData.prenom} {formData.nom}
                    </h2>
                    <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                            <User size={12} className="mr-1.5" />
                            {profile?.role === 'admin' ? 'Administrateur' : profile?.role === 'owner' ? 'Propriétaire' : profile?.role}
                        </span>
                        <div className="flex items-center gap-2 bg-base-200 dark:bg-slate-900/50 px-3 py-1 rounded-full border border-base-300 dark:border-slate-600 text-sm text-base-content/70 dark:text-base-content/40 shadow-sm">
                            <Mail size={14} className="text-base-content/50" />
                            {formData.email}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Main Content Grid */}
            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Column: Personal Info & Appearance */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* Information Personnelles Card */}
                    <motion.div variants={cardVariants} initial="hidden" animate="visible" className="bg-base-100 dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-base-200 dark:border-slate-700 transition-shadow hover:shadow-md">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-50 dark:border-slate-800">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                                <User size={20} />
                            </div>
                            <h3 className="text-xl font-bold text-base-content/90 dark:text-gray-100">Informations Personnelles</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-base-content/70 dark:text-base-content/40">Prénom</label>
                                <input
                                    type="text"
                                    value={formData.prenom}
                                    onChange={(e) => setFormData({...formData, prenom: e.target.value})}
                                    className="w-full px-4 py-3 rounded-xl border border-base-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-base-200/50 dark:bg-slate-900/50"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-base-content/70 dark:text-base-content/40">Nom</label>
                                <input
                                    type="text"
                                    value={formData.nom}
                                    onChange={(e) => setFormData({...formData, nom: e.target.value})}
                                    className="w-full px-4 py-3 rounded-xl border border-base-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-base-200/50 dark:bg-slate-900/50"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-base-content/70 dark:text-base-content/40">Email professionnel</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail size={16} className="text-base-content/50" />
                                    </div>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-base-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-base-200/50 dark:bg-slate-900/50"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-base-content/70 dark:text-base-content/40">Téléphone de contact</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Phone size={16} className="text-base-content/50" />
                                    </div>
                                    <input
                                        type="tel"
                                        value={formData.telephone}
                                        onChange={(e) => setFormData({...formData, telephone: e.target.value})}
                                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-base-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-base-200/50 dark:bg-slate-900/50"
                                        placeholder="+229 XX XX XX XX"
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Security Card */}
                    <motion.div variants={cardVariants} initial="hidden" animate="visible" className="bg-base-100 dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-base-200 dark:border-slate-700 transition-shadow hover:shadow-md">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-50 dark:border-slate-800">
                            <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                                <Shield size={20} />
                            </div>
                            <h3 className="text-xl font-bold text-base-content/90 dark:text-gray-100">Sécurité & Connexion</h3>
                        </div>

                        <div className="space-y-4">
                            {/* Password Section */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 rounded-2xl border border-base-200 dark:border-slate-700 bg-base-200/50 dark:bg-slate-900/50 hover:bg-base-200 dark:bg-slate-900/50 transition-colors">
                                <div className="flex items-center gap-4 mb-4 sm:mb-0">
                                    <div className="p-3 bg-base-100 dark:bg-slate-800 rounded-xl shadow-sm border border-base-200 dark:border-slate-700">
                                        <Lock className="text-base-content/60 dark:text-base-content/50" size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-base-content/90 dark:text-gray-100">Mot de passe</h4>
                                        <p className="text-sm text-base-content/60 dark:text-base-content/50 mt-0.5">Renforcez la sécurité de votre compte</p>
                                    </div>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => setShowPasswordModal(true)}
                                    className="w-full sm:w-auto px-5 py-2.5 bg-base-100 dark:bg-slate-800 text-base-content/80 dark:text-gray-200 rounded-xl text-sm font-semibold shadow-sm border border-base-300 dark:border-slate-600 hover:border-base-300 hover:bg-base-200 dark:bg-slate-900/50 transition-all"
                                >
                                    Modifier
                                </button>
                            </div>

                            {/* 2FA Mock */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 rounded-2xl border border-base-200 dark:border-slate-700 bg-base-200/50 dark:bg-slate-900/50 opacity-75">
                                <div className="flex items-center gap-4 mb-4 sm:mb-0">
                                    <div className="p-3 bg-base-100 dark:bg-slate-800 rounded-xl shadow-sm border border-base-200 dark:border-slate-700">
                                        <ShieldCheck className="text-emerald-500" size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-base-content/90 dark:text-gray-100 flex items-center gap-2">
                                            Double Authentification (A2F)
                                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wide">Bientôt</span>
                                        </h4>
                                        <p className="text-sm text-base-content/60 dark:text-base-content/50 mt-0.5">Protégez votre compte avec un code SMS/App</p>
                                    </div>
                                </div>
                                <button type="button" disabled className="w-full sm:w-auto px-5 py-2.5 bg-base-300 dark:bg-slate-700 text-base-content/50 rounded-xl text-sm font-semibold border border-transparent cursor-not-allowed">
                                    Activer
                                </button>
                            </div>

                            {/* Sessions Mock */}
                            <div className="mt-8 pt-6 border-t border-base-200 dark:border-slate-700">
                                <h4 className="font-semibold text-base-content/90 dark:text-gray-100 mb-4 flex items-center gap-2">
                                    Appareils connectés <span className="text-xs font-normal text-base-content/60 dark:text-base-content/50">(1 session active)</span>
                                </h4>
                                <div className="flex items-center justify-between p-4 rounded-xl border border-blue-100 bg-blue-50/30">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2.5 bg-blue-100 text-blue-600 rounded-lg">
                                            <Monitor size={20} />
                                        </div>
                                        <div>
                                            <p className="font-medium text-base-content/90 dark:text-gray-100 text-sm">Windows • Chrome</p>
                                            <p className="text-xs text-base-content/60 dark:text-base-content/50">Cotonou, Bénin • Actif en ce moment</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded-md">Cet appareil</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Right Column: Preferences */}
                <div className="space-y-8">
                    
                    {/* Appearance & Theme */}
                    <motion.div variants={cardVariants} initial="hidden" animate="visible" className="bg-base-100 dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-base-200 dark:border-slate-700 transition-shadow hover:shadow-md">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-50 dark:border-slate-800">
                            <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                                <Sun size={20} />
                            </div>
                            <h3 className="text-xl font-bold text-base-content/90 dark:text-gray-100">Apparence</h3>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setFormData({...formData, theme: 'light'});
                                    document.documentElement.setAttribute('data-theme', 'hopegestion');
                                    document.documentElement.classList.remove('dark');
                                }}
                                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2
                                    ${formData.theme === 'light' ? 'border-teal-500 bg-teal-50/30 shadow-sm dark:bg-slate-800' : 'border-base-200 dark:border-slate-700 bg-base-100 dark:bg-slate-800 dark:border-slate-700 hover:border-base-300 dark:border-slate-600'}
                                `}
                            >
                                <div className="p-3 rounded-full bg-base-300 dark:bg-slate-700 text-base-content/70 dark:text-base-content/40">
                                    <Sun size={20} />
                                </div>
                                <span className="font-medium text-sm text-base-content/80 dark:text-gray-200">Clair</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setFormData({...formData, theme: 'dark'});
                                    document.documentElement.setAttribute('data-theme', 'dark');
                                    document.documentElement.classList.add('dark');
                                }}
                                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2
                                    ${formData.theme === 'dark' ? 'border-teal-500 bg-teal-50/30 shadow-sm dark:bg-slate-700' : 'border-base-200 dark:border-slate-700 bg-base-100 dark:bg-slate-800 dark:border-slate-700 hover:border-base-300 dark:border-slate-600'}
                                `}
                            >
                                <div className="p-3 rounded-full bg-gray-800 text-base-content/40">
                                    <Moon size={20} />
                                </div>
                                <span className="font-medium text-sm text-base-content/80 dark:text-gray-200">Sombre</span>
                            </button>
                        </div>
                    </motion.div>

                    {/* General Preferences */}
                    <motion.div variants={cardVariants} initial="hidden" animate="visible" className="bg-base-100 dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-base-200 dark:border-slate-700 transition-shadow hover:shadow-md">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-50 dark:border-slate-800">
                            <div className="p-2 bg-pink-50 text-pink-600 rounded-xl">
                                <Globe size={20} />
                            </div>
                            <h3 className="text-xl font-bold text-base-content/90 dark:text-gray-100">Préférences</h3>
                        </div>
                        
                        <div className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-base-content/70 dark:text-base-content/40 flex items-center gap-2">
                                    Langue de l'interface
                                </label>
                                <select 
                                    value={formData.language} 
                                    onChange={(e) => setFormData({...formData, language: e.target.value})}
                                    className="w-full px-4 py-3 rounded-xl border border-base-300 dark:border-slate-600 focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all bg-base-200/50 dark:bg-slate-900/50"
                                >
                                    <option value="fr">Français (France)</option>
                                    <option value="en">English (US)</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-base-content/70 dark:text-base-content/40 flex items-center gap-2">
                                    Devise par défaut
                                </label>
                                <select 
                                    value={formData.currency}
                                    onChange={(e) => setFormData({...formData, currency: e.target.value})}
                                    className="w-full px-4 py-3 rounded-xl border border-base-300 dark:border-slate-600 focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all bg-base-200/50 dark:bg-slate-900/50"
                                >
                                    <option value="XOF">FCFA (XOF)</option>
                                    <option value="EUR">Euro (€)</option>
                                    <option value="USD">Dollar ($)</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-base-content/70 dark:text-base-content/40 flex items-center gap-2">
                                    Fuseau Horaire
                                </label>
                                <select 
                                    value={formData.timezone}
                                    onChange={(e) => setFormData({...formData, timezone: e.target.value})}
                                    className="w-full px-4 py-3 rounded-xl border border-base-300 dark:border-slate-600 focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all bg-base-200/50 dark:bg-slate-900/50"
                                >
                                    <option value="GMT">GMT (Abidjan, Dakar)</option>
                                    <option value="GMT+1">GMT+1 (Cotonou, Lagos, Paris)</option>
                                </select>
                            </div>

                            {/* Notifications */}
                            <div className="pt-6 mt-6 border-t border-base-200 dark:border-slate-700 space-y-4">
                                <h4 className="font-semibold text-base-content/90 dark:text-gray-100 text-sm">Canaux de notification</h4>
                                
                                <label className="flex items-center justify-between cursor-pointer p-4 rounded-xl border border-base-200 dark:border-slate-700 hover:border-base-300 dark:border-slate-600 hover:bg-base-200/50 dark:bg-slate-900/50 transition-all group">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-base-300 dark:bg-slate-700 text-base-content/70 dark:text-base-content/40 rounded-lg group-hover:bg-base-100 dark:bg-slate-800 group-hover:shadow-sm transition-all">
                                            <Mail size={16} />
                                        </div>
                                        <span className="text-sm font-medium text-base-content/80 dark:text-gray-200">Emails système</span>
                                    </div>
                                    <div className={`w-10 h-5.5 rounded-full relative transition-colors duration-300 ease-in-out ${formData.notifEmail ? 'bg-primary' : 'bg-base-300'}`}>
                                        <div className={`absolute top-0.5 left-0.5 bg-base-100 dark:bg-slate-800 w-4.5 h-4.5 rounded-full shadow-sm transition-transform duration-300 ease-in-out ${formData.notifEmail ? 'transform translate-x-4.5' : ''}`}></div>
                                        <input 
                                            type="checkbox" 
                                            className="hidden"
                                            checked={formData.notifEmail}
                                            onChange={(e) => setFormData({...formData, notifEmail: e.target.checked})}
                                        />
                                    </div>
                                </label>

                                <label className="flex items-center justify-between cursor-pointer p-4 rounded-xl border border-base-200 dark:border-slate-700 hover:border-base-300 dark:border-slate-600 hover:bg-base-200/50 dark:bg-slate-900/50 transition-all group">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-green-50 text-green-600 rounded-lg group-hover:bg-base-100 dark:bg-slate-800 group-hover:shadow-sm transition-all">
                                            <MessageCircle size={16} />
                                        </div>
                                        <div>
                                            <span className="text-sm font-medium text-base-content/80 dark:text-gray-200 block">WhatsApp</span>
                                            <span className="text-[10px] text-base-content/50">Alertes importantes</span>
                                        </div>
                                    </div>
                                    <div className={`w-10 h-5.5 rounded-full relative transition-colors duration-300 ease-in-out ${formData.notifWhatsApp ? 'bg-green-500' : 'bg-base-300'}`}>
                                        <div className={`absolute top-0.5 left-0.5 bg-base-100 dark:bg-slate-800 w-4.5 h-4.5 rounded-full shadow-sm transition-transform duration-300 ease-in-out ${formData.notifWhatsApp ? 'transform translate-x-4.5' : ''}`}></div>
                                        <input 
                                            type="checkbox" 
                                            className="hidden"
                                            checked={formData.notifWhatsApp}
                                            onChange={(e) => setFormData({...formData, notifWhatsApp: e.target.checked})}
                                        />
                                    </div>
                                </label>
                            </div>

                        </div>
                    </motion.div>
                </div>

                {/* Floating Save Button */}
                <AnimatePresence>
                    {JSON.stringify(formData) !== initialDataStr && (
                        <motion.div 
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 50 }}
                            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40"
                        >
                            <button
                                type="submit"
                                disabled={saving}
                                className={`flex items-center gap-2 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white px-8 py-3.5 rounded-full font-bold shadow-lg shadow-teal-500/30 transition-all transform hover:scale-105 active:scale-95 ${saving ? 'opacity-75 cursor-not-allowed' : ''}`}
                            >
                                <Save size={18} />
                                {saving ? 'Enregistrement en cours...' : 'Enregistrer les modifications'}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

            </form>

            {/* Password Modal (Refined) */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-base-100 dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative"
                    >
                        <div className="p-6 border-b border-base-200 dark:border-slate-700 flex justify-between items-center bg-base-200/50 dark:bg-slate-900/50">
                            <h3 className="text-xl font-bold flex items-center gap-2 text-base-content/90 dark:text-gray-100">
                                <div className="p-2 bg-teal-100 text-teal-600 rounded-lg">
                                    <Lock size={20} />
                                </div>
                                Changer de mot de passe
                            </h3>
                            <button 
                                onClick={() => setShowPasswordModal(false)}
                                className="p-2 text-base-content/50 hover:text-base-content/70 dark:text-base-content/40 hover:bg-base-300 dark:bg-slate-700 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        <form onSubmit={handlePasswordChange} className="p-6 space-y-5">
                            {[
                                { label: 'Mot de passe actuel', value: passwordData.oldPassword, key: 'oldPassword' },
                                { label: 'Nouveau mot de passe', value: passwordData.newPassword, key: 'newPassword' },
                                { label: 'Confirmer le nouveau', value: passwordData.confirmPassword, key: 'confirmPassword' }
                            ].map((field) => (
                                <div key={field.key} className="space-y-1.5">
                                    <label className="block text-sm font-semibold text-base-content/80 dark:text-gray-200">{field.label}</label>
                                    <div className="relative">
                                        <input 
                                            type={showPassword ? "text" : "password"}
                                            className="w-full px-4 py-3 rounded-xl border border-base-300 dark:border-slate-600 pr-12 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all bg-base-200/50 dark:bg-slate-900/50"
                                            value={field.value}
                                            onChange={e => setPasswordData({...passwordData, [field.key]: e.target.value})}
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-base-content/50 hover:text-base-content/70 dark:text-base-content/40 rounded-lg transition-colors"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                            ))}
                            
                            <div className="pt-4 flex gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setShowPasswordModal(false)}
                                    className="flex-1 px-4 py-3 text-base-content/80 dark:text-gray-200 bg-base-300 dark:bg-slate-700 hover:bg-base-300 font-semibold rounded-xl transition-colors"
                                >
                                    Annuler
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 px-4 py-3 bg-teal-600 text-white font-semibold rounded-xl shadow-md shadow-teal-500/20 hover:bg-teal-700 transition-all"
                                >
                                    Valider
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default CompteProfil;

