// frontend/src/components/NotificationBell.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, X } from 'lucide-react';
import { apiCall } from '../utils/apiUtils';
import { API_URL as BASE_URL } from '../config';
import { motion, AnimatePresence } from 'framer-motion';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const data = await apiCall<{ notifications: Notification[]; unreadCount: number }>(
        `${BASE_URL}/notifications`
      );
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // Erreur silencieuse — le token expiré est géré par apiCall (refresh + redirect)
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every minute
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: number) => {
    try {
      await apiCall(`${BASE_URL}/notifications/${id}/read`, { method: 'PUT' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllRead = async () => {
    try {
      setLoading(true);
      await apiCall(`${BASE_URL}/notifications/read-all`, { method: 'PUT' });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all read:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'rent_due': return 'text-teal-500 bg-teal-50';
      case 'late_payment': return 'text-red-500 bg-red-50';
      case 'new_complaint': return 'text-orange-500 bg-orange-50';
      case 'payment_received': return 'text-green-500 bg-green-50';
      default: return 'text-base-content/60 bg-base-200';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-ghost btn-circle relative"
      >
        <Bell size={20} className="text-base-content/70" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white animate-pulse"></span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-80 md:w-96 bg-base-100 rounded-xl shadow-2xl border border-base-200 overflow-hidden z-50 origin-top-right"
          >
            <div className="p-4 border-b border-base-200 flex justify-between items-center bg-base-200/50">
              <h3 className="font-bold text-base-content/90">Notifications</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllRead} 
                  disabled={loading}
                  className="text-xs font-medium text-primary hover:text-primary-focus flex items-center gap-1"
                >
                  <Check size={12} /> Tout marquer comme lu
                </button>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-base-content/50">
                  <Bell size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Aucune notification</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {notifications.map((notification) => (
                    <div 
                      key={notification.id} 
                      className={`p-4 hover:bg-base-200 transition-colors ${!notification.is_read ? 'bg-teal-50/30' : ''}`}
                    >
                      <div className="flex gap-3">
                        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${getIconColor(notification.type)}`}>
                          <Bell size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!notification.is_read ? 'font-semibold text-base-content' : 'text-base-content/80'}`}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-base-content/60 mt-0.5 break-words">
                            {notification.message}
                          </p>
                          <p className="text-[10px] text-base-content/50 mt-2">
                            {new Date(notification.created_at).toLocaleString('fr-FR')}
                          </p>
                        </div>
                        {!notification.is_read && (
                          <button 
                            onClick={() => markAsRead(notification.id)}
                            className="flex-shrink-0 text-base-content/40 hover:text-primary transition-colors"
                            title="Marquer comme lu"
                          >
                            <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-2 border-t border-base-200 bg-base-200 text-center">
              <button 
                className="text-xs text-base-content/60 hover:text-base-content/80 font-medium w-full py-1"
                onClick={() => setIsOpen(false)}
              >
                Fermer
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
