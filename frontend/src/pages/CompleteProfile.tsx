// frontend/src/pages/CompleteProfile.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Home, Key, Phone, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { API_URL } from '../config';

const CompleteProfile: React.FC = () => {
    const navigate = useNavigate();
    const [userType, setUserType] = useState<string>('');
    const [telephone, setTelephone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Get user info from token
    const token = localStorage.getItem('userToken');
    const userInfo = token ? JSON.parse(atob(token.split('.')[1])) : null;
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Read token FRESH at submit time (not at component mount)
        const freshToken = localStorage.getItem('userToken');
        if (!freshToken) {
            setError('Session expirée. Veuillez vous reconnecter.');
            setLoading(false);
            return;
        }
        
        const tokenPayload = JSON.parse(atob(freshToken.split('.')[1]));
        console.log('CompleteProfile - Using userId:', tokenPayload.id);

        try {
            const response = await fetch(`${API_URL}/auth/complete-profile`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: tokenPayload.id,
                    userType,
                    telephone
                }),
            });

            const data = await response.json();

            if (response.ok) {
                // Update token with new role
                localStorage.setItem('userToken', data.token);
                
                // Dispatch auth-change event
                window.dispatchEvent(new Event('auth-change'));

                // Force full page reload to ensure token is properly recognized
                window.location.href = '/dashboard';
            } else {
                setError(data.message || 'Erreur lors de la complétion du profil');
            }
        } catch (err) {
            setError('Impossible de contacter le serveur');
        } finally {
            setLoading(false);
        }
    };

    const accountTypes = [
        {
            value: 'gestionnaire',
            label: 'Gestionnaire Immobilier',
            icon: Building2,
            description: 'Gérez des biens pour vos clients',
            color: 'from-blue-500 to-blue-600'
        },
        {
            value: 'proprietaire',
            label: 'Propriétaire',
            icon: Home,
            description: 'Gérez vos propres biens',
            color: 'from-green-500 to-green-600'
        },
        {
            value: 'locataire',
            label: 'Locataire',
            icon: Key,
            description: 'Accédez à votre espace locataire',
            color: 'from-purple-500 to-purple-600'
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/10 via-base-100 to-secondary/10 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card w-full max-w-2xl bg-base-100 shadow-2xl"
            >
                <div className="card-body">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h2 className="card-title text-3xl justify-center mb-2">
                            Bienvenue ! 👋
                        </h2>
                        <p className="text-base-content/60">
                            Complétez votre profil pour commencer
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Account Type Selection */}
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-semibold text-lg">Je suis :</span>
                            </label>
                            
                            <div className="grid md:grid-cols-3 gap-4">
                                {accountTypes.map((type) => (
                                    <motion.button
                                        key={type.value}
                                        type="button"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setUserType(type.value)}
                                        className={`
                                            p-6 rounded-xl border-2 transition-all text-left
                                            ${userType === type.value
                                                ? 'border-primary bg-primary/10 shadow-lg'
                                                : 'border-base-300 hover:border-primary/50 bg-base-100'
                                            }
                                        `}
                                    >
                                        <div className={`
                                            w-12 h-12 rounded-full mb-4 flex items-center justify-center
                                            bg-gradient-to-br ${type.color} text-white
                                        `}>
                                            <type.icon size={24} />
                                        </div>
                                        <h3 className="font-bold text-base mb-1">{type.label}</h3>
                                        <p className="text-xs text-base-content/60">{type.description}</p>
                                        
                                        {userType === type.value && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="mt-3"
                                            >
                                                <div className="badge badge-primary gap-2">
                                                    ✓ Sélectionné
                                                </div>
                                            </motion.div>
                                        )}
                                    </motion.button>
                                ))}
                            </div>
                        </div>

                        {/* Phone Number */}
                        {userType && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="form-control"
                            >
                                <label className="label">
                                    <span className="label-text font-medium">Numéro de téléphone</span>
                                </label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/60">
                                        <Phone size={20} />
                                    </div>
                                    <input
                                        type="tel"
                                        placeholder="+229 XX XX XX XX"
                                        className="input input-bordered w-full pl-11"
                                        value={telephone}
                                        onChange={(e) => setTelephone(e.target.value)}
                                        required
                                    />
                                </div>
                                <label className="label">
                                    <span className="label-text-alt text-base-content/60">
                                        Format international recommandé (ex: +229 97 00 00 00)
                                    </span>
                                </label>
                            </motion.div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="alert alert-error">
                                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="btn btn-primary btn-block btn-lg"
                            disabled={!userType || !telephone || loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin mr-2" size={20} />
                                    Enregistrement...
                                </>
                            ) : (
                                <>
                                    Continuer
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                    </svg>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Privacy Note */}
                    <div className="text-center mt-6">
                        <p className="text-xs text-base-content/50">
                            🔒 Vos informations sont sécurisées et confidentielles
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default CompleteProfile;
