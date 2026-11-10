// src/components/ui/Input.tsx
import React, { useState, useEffect, useId } from 'react';
import { AlertCircle } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  showErrorIcon?: boolean;
  /** Champ numérique : afficher « 0 » quand la valeur vaut 0 (ex. étages, 0 = plain-pied). Par défaut le 0 est masqué. */
  showZero?: boolean;
  /**
   * Champ de montant : affiche le nombre groupé par milliers pendant la saisie (« 80 000 »).
   * Le onChange reçoit toujours le nombre brut dans e.target.value (« 80000 »), donc les
   * parseFloat / Number des formulaires existants fonctionnent sans changement.
   */
  amount?: boolean;
}

const Input: React.FC<InputProps> = ({
  label,
  required,
  error,
  helperText,
  startIcon,
  endIcon,
  showErrorIcon = true,
  showZero = false,
  amount = false,
  className = '',
  id,
  ...props
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = error ? `${inputId}-error` : undefined;
  const helperId = helperText ? `${inputId}-helper` : undefined;

  const hasError = !!error;

  // Champs numériques : un montant initialisé à 0 s'affichait « 0 », qu'il fallait
  // effacer avant de taper (sinon « 080000 »). On affiche un champ vide à la place.
  // Seul l'affichage change : la valeur du formulaire (0) et le onChange sont intacts.
  // NaN (champ vidé puis parseFloat('')) est aussi affiché vide.
  const isZeroLike = props.value === 0 || props.value === '0'
    || (typeof props.value === 'number' && Number.isNaN(props.value));
  const displayValue = (props.type === 'number' || amount) && !showZero && isZeroLike ? '' : props.value;

  // Montant : affichage groupé par milliers (espace insécable), saisie limitée aux chiffres.
  const amountProps = amount ? {
    type: 'text',
    inputMode: 'numeric' as const,
    value: displayValue === '' || displayValue == null
      ? ''
      // Valeur lue comme un nombre (la base renvoie souvent « 80000.00 ») puis arrondie : FCFA sans centimes.
      : (Math.round(Number(String(displayValue).replace(/[\s\u00A0\u202F]/g, '').replace(',', '.'))) || 0)
          .toLocaleString('fr-FR').replace(/[\u202F\u00A0\s]/g, '\u00A0'),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const digits = e.target.value.replace(/\D/g, '');
      // On renvoie un événement dont target.value est le nombre brut (sans espaces).
      props.onChange?.({ ...e, target: { ...e.target, name: e.target.name, value: digits }, currentTarget: { ...e.currentTarget, name: e.target.name, value: digits } } as unknown as React.ChangeEvent<HTMLInputElement>);
    },
  } : {};
  const [shake, setShake] = useState(false);

  // Déclenche l'animation shake quand une nouvelle erreur apparaît
  useEffect(() => {
    if (hasError) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShake(true);
      const timer = setTimeout(() => setShake(false), 500);
      return () => clearTimeout(timer);
    }
  }, [error, hasError]);
  
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-semibold text-base-content/80 mb-1.5">
          {label} {required && <span className="text-error">*</span>}
        </label>
      )}
      <div 
        className={`
          relative rounded-xl 
          ${hasError ? 'border-error' : 'border-base-300'} 
          border-2
          ${hasError ? 'focus-within:border-error' : 'focus-within:border-primary'} 
          focus-within:ring-2 
          ${hasError ? 'focus-within:ring-error/20' : 'focus-within:ring-primary/20'} 
          transition-all duration-200
          bg-base-100
          ${shake ? 'animate-shake' : ''}
        `}
      >
        {startIcon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-base-content/60">
            {startIcon}
          </div>
        )}
        <input
          id={inputId}
          aria-invalid={hasError ? "true" : "false"}
          aria-describedby={[errorId, helperId].filter(Boolean).join(' ') || undefined}
          {...props}
          {...('value' in props ? { value: displayValue } : {})}
          {...amountProps}
          className={`
            w-full py-3 px-4 
            ${startIcon ? 'pl-11' : ''} 
            ${endIcon || (hasError && showErrorIcon) ? 'pr-11' : ''} 
            bg-transparent border-0 
            focus:ring-0 focus:outline-none 
            text-base-content 
            placeholder:text-base-content/50
            text-sm
            ${className}
          `}
        />
        {endIcon ? (
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-base-content/60">
            {endIcon}
          </div>
        ) : hasError && showErrorIcon ? (
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-error">
            <AlertCircle size={18} />
          </div>
        ) : null}
      </div>
      {helperText && !hasError && (
        <p id={helperId} className="mt-1.5 text-sm text-base-content/60">{helperText}</p>
      )}
      {hasError && (
        <p id={errorId} className="mt-1.5 text-sm text-error flex items-center gap-1.5 font-medium">
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
