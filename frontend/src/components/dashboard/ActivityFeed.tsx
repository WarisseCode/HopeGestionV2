// frontend/src/components/dashboard/ActivityFeed.tsx
import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Wallet,
  FileText,
  Home
} from 'lucide-react';

export interface Activity {
  id: number;
  type: 'payment' | 'reminder' | 'alert' | 'contract' | 'property';
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
      return { icon: CheckCircle2, bgClass: 'bg-success/10', textClass: 'text-success' };
    case 'reminder':
      return { icon: Clock, bgClass: 'bg-warning/10', textClass: 'text-warning' };
    case 'alert':
      return { icon: AlertCircle, bgClass: 'bg-info/10', textClass: 'text-info' };
    case 'contract':
      return { icon: FileText, bgClass: 'bg-primary/10', textClass: 'text-primary' };
    case 'property':
      return { icon: Home, bgClass: 'bg-secondary/10', textClass: 'text-secondary' };
    default:
      return { icon: AlertCircle, bgClass: 'bg-base-200', textClass: 'text-base-content' };
  }
};

const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities, maxItems = 5 }) => {
  const displayedActivities = activities.slice(0, maxItems);

  if (displayedActivities.length === 0) {
    return (
      <div className="text-center text-base-content/60 py-4">
        Aucune activité récente
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {displayedActivities.map((activity, index) => {
        const { icon: Icon, bgClass, textClass } = getActivityIcon(activity.type);
        const isLast = index === displayedActivities.length - 1;
        
        return (
          <div 
            key={activity.id} 
            className={`flex gap-3 ${!isLast ? 'pb-3 border-b border-base-200' : ''}`}
          >
            <div className={`mt-1 ${bgClass} p-2 rounded-full`}>
              <Icon size={16} className={textClass} />
            </div>
            <div>
              <p className="font-medium">{activity.title}</p>
              <p className="text-sm text-base-content/60">{activity.description}</p>
              <p className="text-xs text-base-content/50">{activity.time}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ActivityFeed;
