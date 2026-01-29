// frontend/src/pages/ForgotPassword.tsx

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { API_URL } from '../config';

const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok) {
                setSubmitted(true);
            } else {
                setError(data.message || 'Une erreur est survenue');
            }
        } catch (err) {
            setError('Impossible de contacter le serveur. Vérifiez votre connexion.');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
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
                        
                        <h2 className="card-title text-2xl mb-2">Email en envoyé !</h2>
                        
                        <p className="text-base-content/70 mb-6">
                            Si un compte existe avec l'adresse <strong>{email}</strong>, 
                            vous recevrez un email contenant un lien de réinitialisation dans quelques minutes.
                        </p>

                        <div className="alert alert-info">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <div>
                                <p className="text-sm">Le lien expire dans <strong>15 minutes</strong></p>
                                <p className="text-xs mt-1">Vérifiez également vos spams</p>
                            </div>
                        </div>

                        <Link to="/login" className="btn btn-primary btn-block mt-6">
                            <ArrowLeft className="w-4 h-4" />
                            Retour à la connexion
                        </Link>
                    </div>
                </motion.div>
            </div>
        );
    }

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
                            <Mail className="w-8 h-8 text-primary" />
                        </div>
                        <h2 className="card-title text-2xl justify-center mb-2">
                            Mot de passe oublié ?
                        </h2>
                        <p className="text-base-content/60 text-sm">
                            Entrez votre email et nous vous enverrons un lien pour réinitialiser votre mot de passe
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-medium">Adresse email</span>
                            </label>
                            <input
                                type="email"
                                placeholder="votre.email@exemple.com"
                                className="input input-bordered w-full"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
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
                                    Envoi en cours...
                                </>
                            ) : (
                                'Envoyer le lien de réinitialisation'
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

export default ForgotPassword;
