// frontend/src/components/MaintenanceWrapper.tsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_URL } from '../config';
import MaintenanceWarningBanner from './MaintenanceWarningBanner';
import AdminMaintenanceBanner from './AdminMaintenanceBanner';

interface MaintenanceWrapperProps {
  children: React.ReactNode;
}

export type MaintenanceState = 'idle' | 'scheduled' | 'active';

/** Routes exclues du redirect maintenance (accessibles même en maintenance active) */
const EXCLUDED_PATHS = [
  '/maintenance',
  '/maintenance/emergency',
  '/login',
];
const EXCLUDED_PREFIXES = ['/admin'];

function isExcluded(pathname: string): boolean {
  return (
    EXCLUDED_PATHS.includes(pathname) ||
    EXCLUDED_PREFIXES.some(p => pathname.startsWith(p))
  );
}

/** Décode le role depuis le JWT local (sans vérification signature — côté serveur c'est vérifié) */
function getLocalRole(): string | null {
  try {
    const token = localStorage.getItem('userToken');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
}

const POLL_INTERVAL_MS = 30_000; // 30 secondes

const MaintenanceWrapper: React.FC<MaintenanceWrapperProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [maintenanceState, setMaintenanceState] = useState<MaintenanceState>('idle');
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [message, setMessage] = useState('Site en maintenance. Merci de votre patience.');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkStatus = useCallback(async () => {
    try {
      const role = getLocalRole();
      const admin = role === 'admin';
      setIsAdmin(admin);

      const res = await fetch(`${API_URL}/public/maintenance/status`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { enabled: boolean; message: string; scheduledAt: string | null } = await res.json();

      if (data.message) setMessage(data.message);

      const now = Date.now();
      const scheduled = data.scheduledAt ? new Date(data.scheduledAt).getTime() : null;

      if (data.enabled) {
        // Maintenance active
        setMaintenanceState('active');
        setScheduledAt(null);
        if (!admin && !isExcluded(location.pathname)) {
          navigate('/maintenance', { replace: true });
        }
      } else if (scheduled && scheduled > now) {
        // Maintenance programmée dans le futur
        setMaintenanceState('scheduled');
        setScheduledAt(data.scheduledAt);
        // On ne redirige pas — juste le bandeau de countdown
      } else {
        // Aucune maintenance
        setMaintenanceState('idle');
        setScheduledAt(null);
        // Si on est sur /maintenance alors que tout est off, retourner à l'accueil
        if (location.pathname === '/maintenance') {
          navigate('/', { replace: true });
        }
      }
    } catch {
      // Fail-open : erreur réseau → laisser passer, ne pas bloquer
      setMaintenanceState('idle');
    } finally {
      setIsLoading(false);
    }
  }, [navigate, location.pathname]);

  // Vérification initiale
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Polling toutes les 30 secondes
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    intervalRef.current = setInterval(checkStatus, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [checkStatus]);

  // Pendant le chargement initial : rien (évite le flash de contenu)
  if (isLoading) return null;

  // Maintenance active, non-admin, et pas sur une route exclue → null (le redirect se fait dans checkStatus)
  if (maintenanceState === 'active' && !isAdmin && !isExcluded(location.pathname)) {
    return null;
  }

  return (
    <>
      {/* Bandeau rouge pour l'admin quand maintenance active */}
      {maintenanceState === 'active' && isAdmin && (
        <AdminMaintenanceBanner onDisabled={checkStatus} />
      )}

      {/* Bandeau orange countdown pour les users connectés quand maintenance programmée */}
      {maintenanceState === 'scheduled' && !isAdmin && scheduledAt && (
        <MaintenanceWarningBanner scheduledAt={scheduledAt} message={message} />
      )}

      {children}
    </>
  );
};

export default MaintenanceWrapper;



