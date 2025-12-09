// frontend/src/pages/Dashboard.tsx

import React, { useState, useEffect } from 'react';
import { getToken } from '../api/authApi';
import { Home, Users, Wallet, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';

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

                setStats(data.stats);
            } catch (err: any) {
                console.error("Erreur Dashboard:", err);
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
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="mt-4 text-base-content/60">Chargement des statistiques...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8">
                <div role="alert" className="alert alert-error">
                    <AlertCircle />
                    <span>{error}</span>
                </div>
            </div>
        );
    }
    
    if (!stats) {
        return (
             <div className="p-8">
                <div role="alert" className="alert alert-warning">
                    <AlertCircle />
                    <span>Aucune statistique disponible pour le moment.</span>
                </div>
            </div>
        );
    }


    return (
        <div className="container mx-auto p-4 md:p-8">
            <h1 className="text-3xl font-bold mb-8 text-base-content">Tableau de Bord</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Carte 1: Biens et Locataires */}
                <StatsCard 
                    title="Biens Gérés" 
                    value={stats.totalBiens.toString()}
                    subValue={`Locataires Actifs: ${stats.locatairesActifs}`}
                    icon={<Home className="w-8 h-8 text-primary" />}
                    color="primary"
                />

                {/* Carte 2: Revenus Totaux */}
                <StatsCard 
                    title="Revenus (Net)" 
                    value={`${stats.totalRevenus} FCFA`}
                    subValue="(Loyer encaissé)"
                    icon={<Wallet className="w-8 h-8 text-success" />}
                    color="success"
                    valueColor="text-success"
                />

                {/* Carte 3: Dépenses Totales */}
                <StatsCard 
                    title="Dépenses Totales" 
                    value={`${stats.totalDepenses} FCFA`}
                    subValue="(Charges, travaux, etc.)"
                    icon={<TrendingUp className="w-8 h-8 text-error" />}
                    color="error"
                    valueColor="text-error"
                />

                {/* Carte 4: Marge Nette et Rentabilité */}
                <StatsCard 
                    title="Marge Nette" 
                    value={`${stats.margeNette} FCFA`}
                    subValue={`Rentabilité: ${stats.rentabilitePourcentage} %`}
                    icon={<TrendingUp className="w-8 h-8 text-info" />}
                    color="info"
                />
            </div>
        </div>
    );
};

const StatsCard = ({ title, value, subValue, icon, color, valueColor }: { title: string, value: string, subValue: string, icon: React.ReactNode, color: string, valueColor?: string }) => (
    <div className={`card bg-base-100 shadow-xl border-b-4 border-${color}`}>
        <div className="card-body">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="card-title text-base-content/60 text-sm uppercase">{title}</h2>
                    <p className={`text-2xl font-bold mt-2 ${valueColor || ''}`}>{value}</p>
                </div>
                <div className={`p-3 bg-${color}/10 rounded-lg text-${color}`}>
                    {icon}
                </div>
            </div>
            <p className="text-xs text-base-content/50 mt-2">{subValue}</p>
        </div>
    </div>
);

export default Dashboard;
