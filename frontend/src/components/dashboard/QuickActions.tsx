// frontend/src/components/dashboard/QuickActions.tsx
import React from 'react';
import { 
  Building2, 
  Users, 
  Wallet, 
  FileText, 
  AlertCircle,
  Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ActionButton {
  icon: React.ElementType;
  label: string;
  colorClass: string;
  path?: string;
  onClick?: () => void;
}

interface QuickActionsProps {
  userType: 'gestionnaire' | 'proprietaire' | 'locataire';
}

const QuickActions: React.FC<QuickActionsProps> = ({ userType }) => {
  const navigate = useNavigate();

  const gestionnaireActions: ActionButton[] = [
    { 
      icon: Building2, 
      label: 'Ajouter un bien', 
      colorClass: 'from-primary/10 to-primary/5 border-primary/20',
      path: '/dashboard/biens'
    },
    { 
      icon: Users, 
      label: 'Ajouter un locataire', 
      colorClass: 'from-success/10 to-success/5 border-success/20',
      path: '/dashboard/locataires'
    },
    { 
      icon: Wallet, 
      label: 'Enregistrer un paiement', 
      colorClass: 'from-info/10 to-info/5 border-info/20',
      path: '/dashboard/finances'
    }
  ];

  const proprietaireActions: ActionButton[] = [
    { 
      icon: Eye, 
      label: 'Voir mes biens', 
      colorClass: 'from-primary/10 to-primary/5 border-primary/20',
      path: '/dashboard/biens'
    },
    { 
      icon: Users, 
      label: 'Voir mes locataires', 
      colorClass: 'from-success/10 to-success/5 border-success/20',
      path: '/dashboard/locataires'
    },
    { 
      icon: Wallet, 
      label: 'Consulter mes finances', 
      colorClass: 'from-info/10 to-info/5 border-info/20',
      path: '/dashboard/finances'
    }
  ];

  const locataireActions: ActionButton[] = [
    { 
      icon: Wallet, 
      label: 'Payer mon loyer', 
      colorClass: 'from-primary/10 to-primary/5 border-primary/20',
      path: '/dashboard/finances'
    },
    { 
      icon: FileText, 
      label: 'Voir mon contrat', 
      colorClass: 'from-success/10 to-success/5 border-success/20',
      path: '/dashboard/contrats'
    },
    { 
      icon: AlertCircle, 
      label: 'Signaler un problème', 
      colorClass: 'from-info/10 to-info/5 border-info/20',
      path: '/dashboard/interventions'
    }
  ];

  const actions = userType === 'gestionnaire' 
    ? gestionnaireActions 
    : userType === 'proprietaire' 
      ? proprietaireActions 
      : locataireActions;

  const handleClick = (action: ActionButton) => {
    if (action.onClick) {
      action.onClick();
    } else if (action.path) {
      navigate(action.path);
    }
  };

  return (
    <div className="space-y-3">
      {actions.map((action, index) => {
        const Icon = action.icon;
        return (
          <button 
            key={index}
            onClick={() => handleClick(action)}
            className={`w-full text-left p-4 rounded-xl bg-gradient-to-r ${action.colorClass} hover:opacity-80 transition-all duration-300 border`}
          >
            <div className="flex items-center gap-3">
              <Icon className="text-current" size={20} />
              <span className="font-medium">{action.label}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default QuickActions;
