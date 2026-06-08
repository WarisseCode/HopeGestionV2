// frontend/src/pages/ForgotPassword.tsx

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, Info, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { API_URL } from '../config';
import { apiCall } from '../utils/apiUtils';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

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
            await apiCall(`${API_URL}/auth/forgot-password`, {
                method: 'POST',
                body: JSON.stringify({ email }),
            });
            setSubmitted(true);
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
                        
                        <h2 className="card-title text-2xl mb-2">Email envoyé !</h2>
                        
                        <p className="text-base-content/70 mb-6">
                            Si un compte existe avec l'adresse <strong>{email}</strong>, 
                            vous recevrez un email contenant un lien de réinitialisation dans quelques minutes.
                        </p>

                        <div className="alert alert-info flex items-start gap-3">
                            <Info className="w-5 h-5 text-info shrink-0 mt-0.5" />
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
                        <Input
                            label="Adresse email"
                            type="email"
                            placeholder="votre.email@exemple.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            startIcon={<Mail size={16} />}
                            required
                            disabled={loading}
                        />

                        {error && (
                            <div className="alert alert-error flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-error shrink-0" />
                                <span className="text-sm">{error}</span>
                            </div>
                        )}

                        <Button
                            type="submit"
                            variant="primary"
                            className="w-full"
                            disabled={loading}
                        >
                            {loading ? 'Envoi en cours...' : 'Envoyer le lien de réinitialisation'}
                        </Button>
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
