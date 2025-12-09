// frontend/src/components/LoginForm.tsx

import React, { useState } from 'react';
import { Button, TextField, Container, Typography, Box, Alert, CircularProgress } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { loginUser } from '../api/authApi';

// 1. Définition des nouvelles props pour la navigation
interface LoginFormProps {
    onLoginSuccess: () => void;
    onGoBackToHome: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess, onGoBackToHome }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await loginUser(email, password);
            
            // 2. Appelle la fonction de succès pour que App.tsx bascule vers le Dashboard
            onLoginSuccess();
            alert(`Connexion réussie !`); // Alerte pour feedback immédiat

        } catch (err: any) {
            setError(err.message || 'Échec de la connexion. Veuillez vérifier vos identifiants.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container component="main" maxWidth="xs">
            <Box
                sx={{
                    marginTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: 4,
                    boxShadow: 3,
                    borderRadius: 2,
                    bgcolor: 'background.paper'
                }}
            >
                <LockOutlinedIcon color="primary" sx={{ m: 1 }} />
                <Typography component="h1" variant="h5" sx={{ mb: 2 }}>
                    Connexion Gestion Locative
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                        {error}
                    </Alert>
                )}

                <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="email"
                        label="Adresse Email"
                        name="email"
                        autoComplete="email"
                        autoFocus
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="password"
                        label="Mot de passe"
                        type="password"
                        id="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2 }}
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={24} color="inherit" /> : 'Se connecter'}
                    </Button>
                    
                    {/* 3. Bouton pour revenir à l'accueil */}
                    <Button
                        fullWidth
                        variant="text"
                        color="secondary"
                        onClick={onGoBackToHome}
                        sx={{ mt: 1, mb: 1 }}
                    >
                        ← Retour à l'accueil
                    </Button>
                </Box>
            </Box>
        </Container>
    );
};

export default LoginForm;