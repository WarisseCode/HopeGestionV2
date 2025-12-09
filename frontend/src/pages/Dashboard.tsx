// frontend/src/pages/Dashboard.tsx

import React, { useState, useEffect } from 'react';
import { Container, Typography, Grid, Card, CardContent, CircularProgress, Alert } from '@mui/material';
import { getToken } from '../api/authApi'; // Assurez-vous que ce chemin est correct

interface DashboardStats {
    totalBiens: number;
    locatairesActifs: number;
    totalRevenus: string;
    totalDepenses: string;
    margeNette: string;
    rentabilitePourcentage: string;
}

const Dashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            const token = getToken();
            if (!token) {
                setError("Non authentifié. Veuillez vous reconnecter.");
                setLoading(false);
                return;
            }

            try {
                // Assurez-vous que le port est 5000 et la route est correcte
                const response = await fetch('http://localhost:5000/api/dashboard/stats', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Erreur lors de la récupération des statistiques.');
                }

                // IMPORTANT: Nous assumons que le backend renvoie un objet { stats: {...} }
                setStats(data.stats);
            } catch (err: any) {
                console.error("Erreur Dashboard:", err);
                // Si l'erreur est liée à des données manquantes, nous affichons un message moins intrusif
                if (err.message.includes('stats')) {
                     setError("Aucune donnée statistique à afficher. Veuillez ajouter des biens et des transactions.");
                } else {
                     setError(err.message || "Impossible de charger les données du tableau de bord.");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <Container sx={{ mt: 5, textAlign: 'center' }}>
                <CircularProgress />
                <Typography>Chargement des statistiques...</Typography>
            </Container>
        );
    }

    if (error) {
        return (
            <Container sx={{ mt: 5 }}>
                <Alert severity="error">{error}</Alert>
            </Container>
        );
    }
    
    // Si stats est null mais pas d'erreur
    if (!stats) {
        return (
             <Container sx={{ mt: 5 }}>
                <Alert severity="warning">Aucune statistique disponible pour le moment.</Alert>
            </Container>
        );
    }


    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Tableau de Bord - Aperçu Général
            </Typography>
            <Grid container spacing={3}>
                
                {/* Carte 1: Biens et Locataires */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card elevation={3}>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Biens Gérés
                            </Typography>
                            <Typography variant="h5" component="div">
                                {stats.totalBiens}
                            </Typography>
                            <Typography color="textSecondary">
                                Locataires Actifs : {stats.locatairesActifs}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Carte 2: Revenus Totaux */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card elevation={3}>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Revenus (Net)
                            </Typography>
                            <Typography variant="h5" component="div" sx={{ color: 'success.main' }}>
                                {stats.totalRevenus} €
                            </Typography>
                            <Typography color="textSecondary">
                                (Loyer encaissé)
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Carte 3: Dépenses Totales */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card elevation={3}>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Dépenses Totales
                            </Typography>
                            <Typography variant="h5" component="div" sx={{ color: 'error.main' }}>
                                {stats.totalDepenses} €
                            </Typography>
                            <Typography color="textSecondary">
                                (Charges, travaux, etc.)
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Carte 4: Marge Nette et Rentabilité */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card elevation={3}>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Marge Nette
                            </Typography>
                            <Typography variant="h5" component="div">
                                {stats.margeNette} €
                            </Typography>
                            <Typography color="textSecondary">
                                Rentabilité : {stats.rentabilitePourcentage} %
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Container>
    );
};

export default Dashboard;