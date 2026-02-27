// frontend/src/components/dashboard/QuickActions.tsx
import React from 'react';
import { 
  Building2, 
  Users, 
  Wallet, 
  FileText, 
  AlertCircle,
  Eye,
  Plus,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ActionButton {
  icon: React.ElementType;
  label: string;
  description?: string;
  colorClass: string;
  iconColor: string;
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
      icon: Plus, 
      label: 'Nouveau Bien',
      description: 'Ajouter',
      colorClass: 'bg-primary/5 hover:bg-primary/10 border-primary/20',
      iconColor: 'text-primary',
      path: '/dashboard/biens'
    },
    { 
      icon: Users, 
      label: 'Locataire', 
      description: 'Nouveau',
      colorClass: 'bg-secondary/5 hover:bg-secondary/10 border-secondary/20',
      iconColor: 'text-secondary',
      path: '/dashboard/locataires'
    },
    { 
      icon: Wallet, 
      label: 'Paiement', 
      description: 'Saisir',
      colorClass: 'bg-success/5 hover:bg-success/10 border-success/20',
      iconColor: 'text-success',
      path: '/dashboard/finances'
    },
    { 
      icon: FileText, 
      label: 'Contrat', 
      description: 'Créer',
      colorClass: 'bg-warning/5 hover:bg-warning/10 border-warning/20',
      iconColor: 'text-warning',
      path: '/dashboard/contrats'
    }
  ];

  const proprietaireActions: ActionButton[] = [
    { 
      icon: Eye, 
      label: 'Mes Biens', 
      description: 'Consulter',
      colorClass: 'bg-primary/5 hover:bg-primary/10 border-primary/20',
      iconColor: 'text-primary',
      path: '/dashboard/biens'
    },
    { 
      icon: Wallet, 
      label: 'Finances', 
      description: 'Suivi',
      colorClass: 'bg-success/5 hover:bg-success/10 border-success/20',
      iconColor: 'text-success',
      path: '/dashboard/finances'
    }
  ];

  const locataireActions: ActionButton[] = [
    { 
      icon: Wallet, 
      label: 'Payer Loyer', 
      description: 'Mobile Money',
      colorClass: 'bg-primary/5 hover:bg-primary/10 border-primary/20',
      iconColor: 'text-primary',
      path: '/dashboard/finances'
    },
    { 
      icon: AlertCircle, 
      label: 'Signaler', 
      description: 'Incident',
      colorClass: 'bg-error/5 hover:bg-error/10 border-error/20',
      iconColor: 'text-error',
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
    <div className="grid grid-cols-2 gap-3">
      {actions.map((action, index) => {
        const Icon = action.icon;
        return (
          <button 
            key={index}
            onClick={() => handleClick(action)}
            className={`
              relative group flex flex-col items-center justify-center p-4 rounded-xl 
              border transition-all duration-300 ${action.colorClass}
              hover:shadow-md hover:-translate-y-1
            `}
          >
            <div className={`p-3 rounded-full bg-white shadow-sm mb-3 group-hover:scale-110 transition-transform`}>
              <Icon className={action.iconColor} size={20} />
            </div>
            <div className="text-center">
              <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{action.description}</span>
              <span className="block font-bold text-gray-700">{action.label}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default QuickActions;
