// frontend/src/contexts/UserContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getProfile, getToken } from '../api/authApi';

// Types
export interface UserProfile {
  id: number;
  nom: string;
  email: string;
  userType: 'gestionnaire' | 'proprietaire' | 'locataire' | 'admin';
  role: string;
}

export interface DashboardStats {
  totalBiens: number;
  tauxOccupation: number;
  revenusMois: number;
  impayesEnCours: number;
  locatairesActifs?: number;
  // Pour locataire
  loyerMensuel?: number;
  prochainPaiement?: string;
  nomLogement?: string;
}

interface UserContextType {
  user: UserProfile | null;
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  refreshStats: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// Provider
interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    try {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const profile = await getProfile();
      setUser(profile.user);
    } catch (err) {
      console.error('Erreur lors de la récupération du profil:', err);
      setError('Impossible de récupérer le profil utilisateur');
    }
  };

  const fetchStats = async () => {
    if (!user) return;
    
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`http://localhost:5000/api/dashboard/stats/${user.userType}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Erreur lors de la récupération des stats:', err);
    }
  };

  const refreshUser = async () => {
    setLoading(true);
    await fetchUser();
    setLoading(false);
  };

  const refreshStats = async () => {
    await fetchStats();
  };

  useEffect(() => {
    const init = async () => {
      await fetchUser();
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  return (
    <UserContext.Provider value={{ user, stats, loading, error, refreshUser, refreshStats }}>
      {children}
    </UserContext.Provider>
  );
};

// Hook
export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export default UserContext;
