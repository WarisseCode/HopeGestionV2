// frontend/src/pages/ResetPassword.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { API_URL } from '../config';

const ResetPassword: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [validating, setValidating] = useState(true);
    const [tokenValid, setTokenValid] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Validate token on mount
    useEffect(() => {
        const validateToken = async () => {
            try {
                const response = await fetch(`${API_URL}/auth/validate-reset-token/${token}`);
                const data = await response.json();
                
                setTokenValid(data.valid);
                if (!data.valid) {
                    setError(data.message || 'Token invalide');
                }
            } catch (err) {
                setError('Impossible de valider le token');
                setTokenValid(false);
            } finally {
                setValidating(false);
            }
        };

        if (token) {
            validateToken();
        } else {
            setValidating(false);
            setTokenValid(false);
            setError('Token manquant');
        }
    }, [token]);

    const validatePassword = (password: string): string | null => {
        if (password.length < 8) {
            return 'Le mot de passe doit contenir au moins 8 caractères';
        }
        if (!/[A-Z]/.test(password)) {
            return 'Le mot de passe doit contenir au moins une majuscule';
        }
        if (!/[a-z]/.test(password)) {
            return 'Le mot de passe doit contenir au moins une minuscule';
        }
        if (!/\d/.test(password)) {
            return 'Le mot de passe doit contenir au moins un chiffre';
        }
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validate passwords match
        if (newPassword !== confirmPassword) {
            setError('Les mots de passe ne correspondent pas');
            return;
        }

        // Validate password strength
        const passwordError = validatePassword(newPassword);
        if (passwordError) {
            setError(passwordError);
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(true);
                setTimeout(() => navigate('/login'), 3000);
            } else {
                setError(data.message || 'Erreur lors de la réinitialisation');
            }
        } catch (err) {
            setError('Impossible de contacter le serveur');
        } finally {
            setLoading(false);
        }
    };

    // Loading state
    if (validating) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-primary/10 via-base-100 to-secondary/10 flex items-center justify-center">
                <div className="text-center">
                    <span className="loading loading-spinner loading-lg text-primary"></span>
                    <p className="mt-4 text-base-content/60">Validation du lien...</p>
                </div>
            </div>
        );
    }

    // Invalid token state
    if (!tokenValid) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-primary/10 via-base-100 to-secondary/10 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="card w-full max-w-md bg-base-100 shadow-2xl"
                >
                    <div className="card-body items-center text-center">
                        <div className="bg-error/20 p-4 rounded-full mb-4">
                            <AlertCircle className="w-16 h-16 text-error" />
                        </div>
                        
                        <h2 className="card-title text-2xl mb-2">Lien invalide ou expiré</h2>
                        
                        <p className="text-base-content/70 mb-6">
                            {error || 'Ce lien de réinitialisation est invalide, a expiré ou a déjà été utilisé.'}
                        </p>

                        <Link to="/forgot-password" className="btn btn-primary btn-block">
                            Demander un nouveau lien
                        </Link>

                        <Link to="/login" className="link link-primary text-sm mt-4">
                            Retour à la connexion
                        </Link>
                    </div>
                </motion.div>
            </div>
        );
    }

    // Success state
    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-primary/10 via-base-100 to-secondary/10 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="card w-full max-w-md bg-base-100 shadow-2xl"
                >
                    <div className="card-body items-center text-center">
                        <div className="bg-success/20 p-4 rounded-full mb-4">
                            <CheckCircle className="w-16 h-16 text-success" />
                        </div>
                        
                        <h2 className="card-title text-2xl mb-2">Mot de passe réinitialisé !</h2>
                        
                        <p className="text-base-content/70 mb-6">
                            Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter.
                        </p>

                        <p className="text-sm text-base-content/50">
                            Redirection vers la page de connexion...
                        </p>
                    </div>
                </motion.div>
            </div>
        );
    }

    // Reset password form
    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/10 via-base-100 to-secondary/10 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card w-full max-w-md bg-base-100 shadow-2xl"
            >
                <div className="card-body">
                    {/* Header */}
                    <div className="text-center mb-6">
                        <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Lock className="w-8 h-8 text-primary" />
                        </div>
                        <h2 className="card-title text-2xl justify-center mb-2">
                            Nouveau mot de passe
                        </h2>
                        <p className="text-base-content/60 text-sm">
                            Choisissez un mot de passe fort et sécurisé
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* New Password */}
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-medium">Nouveau mot de passe</span>
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    className="input input-bordered w-full pr-10"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            <label className="label">
                                <span className="label-text-alt text-base-content/60">
                                    Min. 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre
                                </span>
                            </label>
                        </div>

                        {/* Confirm Password */}
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-medium">Confirmer le mot de passe</span>
                            </label>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                className="input input-bordered w-full"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>

                        {error && (
                            <div className="alert alert-error">
                                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{error}</span>
                            </div>
                        )}

                        <button 
                            type="submit" 
                            className="btn btn-primary btn-block"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="loading loading-spinner"></span>
                                    Réinitialisation...
                                </>
                            ) : (
                                'Réinitialiser le mot de passe'
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="divider"></div>
                    <div className="text-center">
                        <Link to="/login" className="link link-primary text-sm inline-flex items-center gap-1">
                            <ArrowLeft className="w-4 h-4" />
                            Retour à la connexion
                        </Link>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default ResetPassword;
