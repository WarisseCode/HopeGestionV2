import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, PartyPopper, Sparkles } from 'lucide-react';

export interface OnboardingStep {
  target: string; // CSS selector for the target element
  title: string;
  description: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface OnboardingTourProps {
  steps: OnboardingStep[];
  onComplete: () => void;
  onSkip: () => void;
  isOpen: boolean;
}

interface Position {
  top: number;
  left: number;
  width: number;
  height: number;
}

const STORAGE_KEY = 'hopegestion_onboarding_completed';
const TOOLTIP_OFFSET = 16;

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  steps,
  onComplete,
  onSkip,
  isOpen,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetPosition, setTargetPosition] = useState<Position | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;
  const isCenterPlacement = currentStepData?.placement === 'center';

  // Calculate target element position
  const updateTargetPosition = useCallback(() => {
    if (!currentStepData || isCenterPlacement) {
      setTargetPosition(null);
      return;
    }

    const targetElement = document.querySelector(currentStepData.target);
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      setTargetPosition({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    } else {
      setTargetPosition(null);
    }
  }, [currentStepData, isCenterPlacement]);

  // Calculate tooltip position based on target and placement
  useEffect(() => {
    if (!targetPosition || !tooltipRef.current || isCenterPlacement) {
      // Center placement
      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      });
      return;
    }

    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const placement = currentStepData?.placement || 'bottom';
    let top = 0;
    let left = 0;

    switch (placement) {
      case 'top':
        top = targetPosition.top - tooltipRect.height - TOOLTIP_OFFSET;
        left = targetPosition.left + targetPosition.width / 2 - tooltipRect.width / 2;
        break;
      case 'bottom':
        top = targetPosition.top + targetPosition.height + TOOLTIP_OFFSET;
        left = targetPosition.left + targetPosition.width / 2 - tooltipRect.width / 2;
        break;
      case 'left':
        top = targetPosition.top + targetPosition.height / 2 - tooltipRect.height / 2;
        left = targetPosition.left - tooltipRect.width - TOOLTIP_OFFSET;
        break;
      case 'right':
        top = targetPosition.top + targetPosition.height / 2 - tooltipRect.height / 2;
        left = targetPosition.left + targetPosition.width + TOOLTIP_OFFSET;
        break;
    }

    // Keep tooltip within viewport
    const padding = 16;
    top = Math.max(padding, Math.min(top, window.innerHeight - tooltipRect.height - padding));
    left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding));

    setTooltipStyle({
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
    });
  }, [targetPosition, currentStepData?.placement, isCenterPlacement, currentStep]);

  // Update position on resize and step change
  useEffect(() => {
    updateTargetPosition();
    window.addEventListener('resize', updateTargetPosition);
    window.addEventListener('scroll', updateTargetPosition, true);
    
    return () => {
      window.removeEventListener('resize', updateTargetPosition);
      window.removeEventListener('scroll', updateTargetPosition, true);
    };
  }, [updateTargetPosition]);

  // Reset to first step when tour opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  if (!isOpen || !currentStepData) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[9998]"
            style={{
              background: isCenterPlacement 
                ? 'rgba(0, 0, 0, 0.75)' 
                : 'transparent',
            }}
          >
            {/* Spotlight effect for non-center placements */}
            {targetPosition && !isCenterPlacement && (
              <svg
                className="absolute inset-0 w-full h-full"
                style={{ pointerEvents: 'none' }}
              >
                <defs>
                  <mask id="spotlight-mask">
                    <rect x="0" y="0" width="100%" height="100%" fill="white" />
                    <motion.rect
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      x={targetPosition.left - 8}
                      y={targetPosition.top - 8}
                      width={targetPosition.width + 16}
                      height={targetPosition.height + 16}
                      rx="12"
                      ry="12"
                      fill="black"
                    />
                  </mask>
                </defs>
                <rect
                  x="0"
                  y="0"
                  width="100%"
                  height="100%"
                  fill="rgba(0, 0, 0, 0.65)"
                  mask="url(#spotlight-mask)"
                />
              </svg>
            )}

            {/* Highlight ring animation */}
            {targetPosition && !isCenterPlacement && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ 
                  opacity: [0.4, 0.8, 0.4],
                  scale: [1, 1.03, 1],
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute pointer-events-none"
                style={{
                  top: targetPosition.top - 12,
                  left: targetPosition.left - 12,
                  width: targetPosition.width + 24,
                  height: targetPosition.height + 24,
                  borderRadius: '16px',
                  border: '3px solid',
                  borderColor: 'hsl(var(--p) / 0.6)',
                  boxShadow: '0 0 30px hsl(var(--p) / 0.3)',
                }}
              />
            )}
          </motion.div>

          {/* Tooltip Card */}
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={tooltipStyle}
            className="z-[9999] w-[90vw] max-w-md"
          >
            <div className="bg-base-100 rounded-2xl shadow-2xl border border-base-300/50 overflow-hidden backdrop-blur-sm">
              {/* Header with gradient accent */}
              <div className="relative bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 px-6 pt-5 pb-4">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent" />
                
                {/* Skip button */}
                <button
                  onClick={handleSkip}
                  className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-base-300/50 transition-colors text-base-content/50 hover:text-base-content"
                  aria-label="Passer le tour"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Step indicator */}
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-base-content/60">
                    Étape {currentStep + 1} sur {steps.length}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-base-content pr-8">
                  {currentStepData.title}
                </h3>
              </div>

              {/* Content */}
              <div className="px-6 py-4">
                <p className="text-base-content/70 text-sm leading-relaxed">
                  {currentStepData.description}
                </p>
              </div>

              {/* Progress dots */}
              <div className="flex justify-center gap-1.5 px-6 pb-4">
                {steps.map((_, index) => (
                  <motion.div
                    key={index}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      index === currentStep
                        ? 'w-6 bg-primary'
                        : index < currentStep
                        ? 'w-1.5 bg-primary/50'
                        : 'w-1.5 bg-base-300'
                    }`}
                    initial={false}
                    animate={{
                      scale: index === currentStep ? 1 : 0.9,
                    }}
                  />
                ))}
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between gap-3 px-6 pb-5">
                <button
                  onClick={handlePrev}
                  disabled={isFirstStep}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${isFirstStep 
                      ? 'text-base-content/30 cursor-not-allowed' 
                      : 'text-base-content/70 hover:text-base-content hover:bg-base-200'
                    }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Précédent
                </button>

                <button
                  onClick={handleNext}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg
                    ${isLastStep
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600'
                      : 'bg-gradient-to-r from-primary to-secondary text-primary-content hover:opacity-90'
                    }`}
                >
                  {isLastStep ? (
                    <>
                      <PartyPopper className="w-4 h-4" />
                      Terminer
                    </>
                  ) : (
                    <>
                      Suivant
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Helper hook to manage onboarding state
export const useOnboarding = () => {
  const [showTour, setShowTour] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  useEffect(() => {
    // Only show tour on first visit and after a small delay for layout to settle
    if (!hasCompleted) {
      const timer = setTimeout(() => {
        setShowTour(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [hasCompleted]);

  const completeTour = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setHasCompleted(true);
    setShowTour(false);
  }, []);

  const skipTour = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setHasCompleted(true);
    setShowTour(false);
  }, []);

  const restartTour = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHasCompleted(false);
    setShowTour(true);
  }, []);

  return {
    showTour,
    hasCompleted,
    completeTour,
    skipTour,
    restartTour,
  };
};

export default OnboardingTour;
