// frontend/src/components/dashboard/ActivityFeed.tsx
import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Wallet,
  FileText,
  Home,
  Wrench
} from 'lucide-react';

export interface Activity {
  id: number;
  type: 'payment' | 'reminder' | 'alert' | 'contract' | 'property' | 'intervention';
  title: string;
  description: string;
  time: string;
}

interface ActivityFeedProps {
  activities: Activity[];
  maxItems?: number;
}

const getActivityIcon = (type: Activity['type']) => {
  switch (type) {
    case 'payment':
      return { icon: Wallet, bgClass: 'bg-success', textClass: 'text-white' };
    case 'reminder':
      return { icon: Clock, bgClass: 'bg-warning', textClass: 'text-white' };
    case 'alert':
      return { icon: AlertCircle, bgClass: 'bg-error', textClass: 'text-white' };
    case 'contract':
      return { icon: FileText, bgClass: 'bg-info', textClass: 'text-white' };
    case 'property':
      return { icon: Home, bgClass: 'bg-primary', textClass: 'text-white' };
    case 'intervention':
        return { icon: Wrench, bgClass: 'bg-secondary', textClass: 'text-white' };
    default:
      return { icon: AlertCircle, bgClass: 'bg-gray-400', textClass: 'text-white' };
  }
};

const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities, maxItems = 5 }) => {
  const displayedActivities = activities.slice(0, maxItems);

  if (displayedActivities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-base-content/40">
        <Clock size={32} className="mb-2 opacity-50" />
        <p>Aucune activité récente</p>
      </div>
    );
  }

  return (
    <div className="relative pl-2">
      {/* Ligne verticale de timeline */}
      <div className="absolute top-2 bottom-6 left-[19px] w-[2px] bg-base-200"></div>

      <div className="space-y-6">
        {displayedActivities.map((activity) => {
          const { icon: Icon, bgClass } = getActivityIcon(activity.type);
          
          return (
            <div key={activity.id} className="relative flex items-start gap-4 group">
              {/* Point/Icone Timeline */}
              <div className={`
                relative z-10 flex items-center justify-center w-9 h-9 rounded-full ring-4 ring-white ${bgClass} shadow-sm
                group-hover:scale-110 transition-transform duration-300
              `}>
                <Icon size={14} className="text-white" strokeWidth={3} />
              </div>

              {/* Contenu */}
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex justify-between items-start mb-0.5">
                  <p className="text-sm font-bold text-base-content truncate pr-4">
                    {activity.title}
                  </p>
                  <span className="text-xs font-medium text-base-content/40 whitespace-nowrap bg-base-200 px-2 py-0.5 rounded-full">
                    {activity.time}
                  </span>
                </div>
                <p className="text-sm text-base-content/60 line-clamp-1">
                  {activity.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActivityFeed;
