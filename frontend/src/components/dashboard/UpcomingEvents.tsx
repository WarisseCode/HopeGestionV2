// frontend/src/components/dashboard/UpcomingEvents.tsx
import React from 'react';
import { 
  Calendar, 
  Wallet, 
  FileText, 
  Wrench, 
  AlertTriangle,
  Clock,
  ArrowRight
} from 'lucide-react';

export interface UpcomingEvent {
  id: number;
  type: 'rent' | 'contract' | 'intervention' | 'alert';
  title: string;
  description: string;
  date: string;
  daysUntil: number;
}

interface UpcomingEventsProps {
  events: UpcomingEvent[];
  maxItems?: number;
  userType?: 'gestionnaire' | 'proprietaire' | 'locataire';
}

const getEventIcon = (type: UpcomingEvent['type']) => {
  switch (type) {
    case 'rent':
      return { icon: Wallet, bgClass: 'bg-blue-100', textClass: 'text-blue-600' };
    case 'contract':
      return { icon: FileText, bgClass: 'bg-purple-100', textClass: 'text-purple-600' };
    case 'intervention':
      return { icon: Wrench, bgClass: 'bg-orange-100', textClass: 'text-orange-600' };
    case 'alert':
      return { icon: AlertTriangle, bgClass: 'bg-red-100', textClass: 'text-red-600' };
    default:
      return { icon: Calendar, bgClass: 'bg-gray-100', textClass: 'text-gray-600' };
  }
};

const getUrgencyClass = (daysUntil: number) => {
  if (daysUntil <= 0) return 'text-error font-bold';
  if (daysUntil <= 3) return 'text-warning font-semibold';
  if (daysUntil <= 7) return 'text-info';
  return 'text-base-content/60';
};

const formatDaysUntil = (days: number) => {
  if (days < 0) return `En retard de ${Math.abs(days)}j`;
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Demain';
  return `Dans ${days} jours`;
};

const UpcomingEvents: React.FC<UpcomingEventsProps> = ({ events, maxItems = 5, userType }) => {
  // Sort by date (closest first)
  const sortedEvents = [...events]
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, maxItems);

  if (sortedEvents.length === 0) {
    return (
      <div className="bg-base-100 rounded-2xl p-6 border border-base-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Calendar className="text-primary" size={20} />
          </div>
          <h3 className="font-bold text-lg">Événements à venir</h3>
        </div>
        <div className="text-center py-8 text-base-content/60">
          <Calendar size={40} className="mx-auto mb-3 opacity-30" />
          <p>Aucun événement à venir</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-base-100 rounded-2xl p-6 border border-base-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Calendar className="text-primary" size={20} />
          </div>
          <h3 className="font-bold text-lg">Événements à venir</h3>
        </div>
        <span className="text-sm text-base-content/60">{events.length} total</span>
      </div>

      <div className="space-y-3">
        {sortedEvents.map((event) => {
          const { icon: Icon, bgClass, textClass } = getEventIcon(event.type);
          const urgencyClass = getUrgencyClass(event.daysUntil);

          return (
            <div 
              key={event.id} 
              className="flex items-center gap-4 p-3 bg-base-50 rounded-xl hover:bg-base-100 transition-colors cursor-pointer border border-transparent hover:border-base-200"
            >
              <div className={`p-2.5 rounded-lg ${bgClass}`}>
                <Icon size={18} className={textClass} />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{event.title}</p>
                <p className="text-xs text-base-content/60 truncate">{event.description}</p>
              </div>

              <div className="text-right shrink-0">
                <p className={`text-xs ${urgencyClass}`}>
                  {formatDaysUntil(event.daysUntil)}
                </p>
                <p className="text-xs text-base-content/50">{event.date}</p>
              </div>
            </div>
          );
        })}
      </div>

      {events.length > maxItems && (
        <button className="w-full mt-4 btn btn-ghost btn-sm text-primary">
          Voir tous les événements <ArrowRight size={16} className="ml-1" />
        </button>
      )}
    </div>
  );
};

export default UpcomingEvents;
