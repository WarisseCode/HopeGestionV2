import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Camera, Globe, DollarSign, Clock, Save, Lock, MessageCircle } from 'lucide-react';
import { accountApi } from '../api/accountApi';
import { motion } from 'framer-motion';

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
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // États pour le formulaire
    const [formData, setFormData] = useState({
        nom: '',
        prenom: '',
        email: '',
        telephone: '',
        language: 'fr',
        currency: 'XOF',
        timezone: 'GMT+1'
    });

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const data = await accountApi.getProfile();
            setProfile(data);
            setFormData({
                nom: data.nom || '',
                prenom: data.prenom || '',
                email: data.email || '',
                telephone: data.telephone || '',
                language: data.preferences?.language || 'fr',
                currency: data.preferences?.currency || 'XOF',
                timezone: data.preferences?.timezone || 'GMT+1'
            });
        } catch (error) {
            console.error('Erreur chargement profil:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                // Update local state immediately for preview
                if (profile) {
                    setProfile({ ...profile, photo_url: base64String });
                }
                // Trigger save strictly for photo? Or wait for global save?
                // Let's autosave photo for better UX
                savePhoto(base64String);
            };
            reader.readAsDataURL(file);
        }
    };

    const savePhoto = async (photoUrl: string) => {
        try {
            await accountApi.updateProfile({ ...formData, photo_url: photoUrl });
            setMessage({ type: 'success', text: 'Photo mise à jour !' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Erreur lors de l\'upload de la photo.' });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            const preferences = {
                language: formData.language,
                currency: formData.currency,
                timezone: formData.timezone,
                notifications: profile?.preferences?.notifications || { email: true, whatsapp: false }
            };

            const payload = {
                nom: formData.nom,
                prenom: formData.prenom,
                email: formData.email,
                telephone: formData.telephone,
                preferences: preferences
            };

            await accountApi.updateProfile(payload);
            setMessage({ type: 'success', text: 'Profil mis à jour avec succès !' });
            
            // Recharger pour être sûr de la synchro
            const updated = await accountApi.getProfile();
            setProfile(updated);

        } catch (error) {
            setMessage({ type: 'error', text: 'Erreur lors de la mise à jour.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Chargement du profil...</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
            
            {/* Header: Photo + Identité rapide (Style Page 10 PDF) */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-8">
                
                {/* Photo Section */}
                <div className="relative group">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-100">
                        {profile?.photo_url ? (
                            <img src={profile.photo_url} alt="Profil" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                                <User size={48} />
                            </div>
                        )}
                    </div>
                    <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors shadow-md">
                        <Camera size={18} />
                        <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                    </label>
                </div>

                {/* Info Essentielle */}
                <div className="text-center md:text-left flex-1">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                        {formData.prenom} {formData.nom}
                    </h2>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4 text-gray-600 text-sm">
                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full border border-gray-200">
                            <Phone size={14} className="text-blue-500" />
                            {formData.telephone || "Non renseigné"}
                        </div>
                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full border border-gray-200">
                            <Mail size={14} className="text-blue-500" />
                            <span className="truncate max-w-[200px]">{formData.email}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full border border-green-200 text-green-700">
                            <MessageCircle size={14} />
                            WhatsApp {profile?.preferences?.notifications.whatsapp ? 'Actif' : 'Inactif'}
                        </div>
                    </div>
                </div>

                {/* Badge Rôle */}
                <div className="hidden md:block">
                     <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-semibold border border-blue-200 capitalize">
                        {profile?.role || 'Utilisateur'}
                     </span>
                </div>
            </div>

            {/* Formulaire Principal (Grille) */}
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-8">
                
                {/* Colonne Gauche : Infos Personnelles */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2 border-b pb-2">
                            <User size={20} className="text-blue-600" /> Information Personnelles
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                                <input
                                    type="text"
                                    value={formData.nom}
                                    onChange={(e) => setFormData({...formData, nom: e.target.value})}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                                <input
                                    type="text"
                                    value={formData.prenom}
                                    onChange={(e) => setFormData({...formData, prenom: e.target.value})}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                                <input
                                    type="text"
                                    value={formData.telephone}
                                    onChange={(e) => setFormData({...formData, telephone: e.target.value})}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2 border-b pb-2">
                            <Lock size={20} className="text-blue-600" /> Sécurité
                        </h3>
                        <div className="bg-blue-50 text-blue-800 p-4 rounded-lg flex justify-between items-center">
                            <div>
                                <p className="font-medium">Mot de passe</p>
                                <p className="text-sm opacity-80">Dernière modification il y a 3 mois</p>
                            </div>
                            <button type="button" className="px-4 py-2 bg-white text-blue-600 rounded-lg text-sm font-medium shadow-sm hover:bg-gray-50 border border-blue-100 transition-colors">
                                Changer
                            </button>
                        </div>
                    </div>
                </div>

                {/* Colonne Droite : Préférences */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full">
                        <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2 border-b pb-2">
                            <Globe size={20} className="text-pink-600" /> Préférences
                        </h3>
                        
                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                    <Globe size={16} className="text-gray-400" /> Langue
                                </label>
                                <select 
                                    value={formData.language} 
                                    onChange={(e) => setFormData({...formData, language: e.target.value})}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white"
                                >
                                    <option value="fr">Français</option>
                                    <option value="en">English</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                    <DollarSign size={16} className="text-gray-400" /> Devise
                                </label>
                                <select 
                                    value={formData.currency}
                                    onChange={(e) => setFormData({...formData, currency: e.target.value})}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white"
                                >
                                    <option value="XOF">XOF (CFA)</option>
                                    <option value="EUR">EUR (€)</option>
                                    <option value="USD">USD ($)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                    <Clock size={16} className="text-gray-400" /> Fuseau Horaire
                                </label>
                                <select 
                                    value={formData.timezone}
                                    onChange={(e) => setFormData({...formData, timezone: e.target.value})}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white"
                                >
                                    <option value="GMT">GMT</option>
                                    <option value="GMT+1">GMT+1 (Benin, Nigeria)</option>
                                    <option value="GMT+2">GMT+2</option>
                                </select>
                            </div>

                            <div className="pt-4 mt-4 border-t border-gray-100">
                                <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-colors">
                                    <span className="text-sm font-medium text-gray-700">Notifications Email</span>
                                    <input type="checkbox" defaultChecked={true} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                                </label>
                                <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-colors">
                                    <span className="text-sm font-medium text-gray-700">Notifications WhatsApp</span>
                                    <input type="checkbox" defaultChecked={profile?.preferences?.notifications.whatsapp} className="w-4 h-4 text-green-600 rounded focus:ring-green-500" />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions globales */}
                <div className="md:col-span-3 flex justify-end gap-4 pt-4">
                    {message && (
                        <div className={`px-4 py-2 rounded-lg text-sm flex items-center ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {message.text}
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={saving}
                        className={`flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold shadow-md transition-all transform hover:translate-y-[-1px] ${saving ? 'opacity-75 cursor-not-allowed' : ''}`}
                    >
                        <Save size={18} />
                        {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                    </button>
                </div>

            </form>
        </div>
    );
};

export default CompteProfil;
