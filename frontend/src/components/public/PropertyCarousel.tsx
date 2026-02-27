// frontend/src/components/public/PropertyCarousel.tsx
import React, { useRef, useState, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { MapPin, Home, Maximize2, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { mockProperties } from '../../data/mockProperties';
import type { PublicProperty } from '../../data/mockProperties';
import Button from '../ui/Button';

interface PropertyCardProps {
  property: PublicProperty;
  onViewDetails: (id: number) => void;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property, onViewDetails }) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price);
  };

  return (
    <div
      className="flex-shrink-0 w-[340px] bg-base-100 rounded-2xl overflow-hidden shadow-lg border border-base-200 group cursor-pointer property-card-glow transition-shadow duration-300"
      onClick={() => onViewDetails(property.id)}
    >
      {/* Image Container */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={property.image}
          alt={property.titre}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        <div className="absolute top-3 left-3">
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg
            ${property.type === 'Villa' ? 'bg-amber-500 text-white' : 
              property.type === 'Appartement' ? 'bg-blue-500 text-white' :
              property.type === 'Studio' ? 'bg-purple-500 text-white' :
              property.type === 'Boutique' ? 'bg-green-500 text-white' :
              'bg-gray-500 text-white'}`}
          >
            {property.type}
          </span>
        </div>
        
        <div className="absolute top-3 right-3">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-lg flex items-center gap-1">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            Disponible
          </span>
        </div>
        
        <div className="absolute bottom-3 left-3">
          <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-xl shadow-lg">
            <span className="text-lg font-extrabold text-primary">
              {formatPrice(property.loyer)}
            </span>
            <span className="text-xs text-gray-600 ml-1">FCFA/mois</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-bold text-base-content text-lg mb-2 line-clamp-1 group-hover:text-primary transition-colors">
          {property.titre}
        </h3>
        
        <div className="flex items-center gap-1 text-base-content/60 text-sm mb-3">
          <MapPin size={14} className="text-primary" />
          <span>{property.quartier}, {property.ville}</span>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-base-content/70">
          <div className="flex items-center gap-1">
            <Maximize2 size={14} />
            <span>{property.surface} m²</span>
          </div>
          <div className="flex items-center gap-1">
            <Home size={14} />
            <span>{property.pieces} pièces</span>
          </div>
          {property.chambres > 0 && (
            <div className="flex items-center gap-1">
              <span>🛏️</span>
              <span>{property.chambres} ch.</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1 mt-3">
          {property.amenities.slice(0, 3).map((amenity, idx) => (
            <span 
              key={idx} 
              className="text-xs px-2 py-1 bg-base-200 rounded-full text-base-content/70"
            >
              {amenity}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const PropertyCarousel: React.FC = () => {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  // Create a triple set of properties to ensure smooth infinite scrolling in both directions
  // [Set 1 (Clone)] [Set 2 (Real)] [Set 3 (Clone)]
  const items = [...mockProperties, ...mockProperties, ...mockProperties];
  const realLength = mockProperties.length;
  // Start at the middle set
  const startIndex = realLength;
  
  const CARD_WIDTH = 340 + 32; // card + gap
  const controls = useAnimation();
  
  // Initialize index at the start of the middle set
  useEffect(() => {
    setIndex(startIndex);
  }, []);

  // Handle auto-scroll
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      handleNext();
    }, 3000);

    return () => clearInterval(timer);
  }, [index, isPaused]);

  // Handle Infinite Loop Logic
  useEffect(() => {
    // If we reach the end of the 3rd set, jump back to start of 2nd set
    if (index >= realLength * 2) {
      const resetIndex = index - realLength;
      controls.set({ x: -resetIndex * CARD_WIDTH });
      setIndex(resetIndex);
    }
    // If we reach the start of the 1st set, jump forward to start of 2nd set
    else if (index < realLength) {
      const resetIndex = index + realLength;
      controls.set({ x: -resetIndex * CARD_WIDTH });
      setIndex(resetIndex);
    }
    else {
      // Normal animation
      controls.start({
        x: -index * CARD_WIDTH,
        transition: { duration: 0.5, ease: "easeInOut" }
      });
    }
  }, [index, controls, realLength]);

  const handleNext = () => {
    setIndex(prev => prev + 1);
  };

  const handlePrev = () => {
    setIndex(prev => prev - 1);
  };

  const handleViewDetails = (id: number) => {
    navigate(`/biens-disponibles?property=${id}`);
  };

  return (
    <section className="py-20 bg-gradient-to-b from-base-200 to-base-100 overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
      
      <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            Nouveautés
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-base-content mb-4">
            Biens <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Disponibles</span>
          </h2>
          <p className="text-lg text-base-content/60 max-w-2xl mx-auto">
            Découvrez notre sélection de propriétés soigneusement choisies pour vous. 
            Appartements, villas, studios... Trouvez votre futur chez-vous.
          </p>
        </motion.div>

        {/* Carousel Container */}
        <div 
          className="relative max-w-full overflow-hidden"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Navigation Buttons */}
          <button
            onClick={() => {
              handlePrev();
              setIsPaused(true); // Pause interacting manually
            }}
            className="absolute left-4 top-1/2 z-20 w-12 h-12 rounded-full bg-base-100/80 backdrop-blur-sm shadow-xl border border-base-200 flex items-center justify-center transition-all duration-300 hover:bg-primary hover:text-white hover:scale-110 cursor-pointer"
            style={{ transform: 'translateY(-50%)' }}
            aria-label="Previous property"
          >
            <ChevronLeft size={24} />
          </button>
          
          <button
            onClick={() => {
              handleNext();
              setIsPaused(true); // Pause interacting manually
            }}
            className="absolute right-4 top-1/2 z-20 w-12 h-12 rounded-full bg-base-100/80 backdrop-blur-sm shadow-xl border border-base-200 flex items-center justify-center transition-all duration-300 hover:bg-primary hover:text-white hover:scale-110 cursor-pointer"
            style={{ transform: 'translateY(-50%)' }}
            aria-label="Next property"
          >
            <ChevronRight size={24} />
          </button>

          {/* Draggable/Animated List */}
          <div className="py-10">
             <motion.div
                className="flex gap-8"
                animate={controls}
                initial={{ x: -startIndex * CARD_WIDTH }}
                drag="x"
                dragConstraints={{ left: -10000, right: 10000 }} // Allow free drag, we snap back
                onDragEnd={(e, { offset, velocity }) => {
                  const swipe = offset.x; // Drag distance
                  if (swipe < -50) {
                    handleNext();
                  } else if (swipe > 50) {
                    handlePrev();
                  } else {
                    // Snap back if not dragged enough
                    controls.start({ x: -index * CARD_WIDTH });
                  }
                  // Temporary pause after drag
                  setIsPaused(true);
                  setTimeout(() => setIsPaused(false), 2000);
                }}
             >
                {items.map((property, idx) => (
                  <PropertyCard
                    key={`${property.id}-${idx}`}
                    property={property}
                    onViewDetails={handleViewDetails}
                  />
                ))}
             </motion.div>
          </div>
        </div>

        {/* CTA Button */}
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <Button
            variant="primary"
            onClick={() => navigate('/biens-disponibles')}
            className="rounded-full px-8 py-4 shadow-lg hover:shadow-primary/30 transition-all group"
          >
            Voir tous les biens disponibles
            <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
          <p className="text-sm text-base-content/50 mt-4">
            Plus de {mockProperties.length} biens actuellement disponibles
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default PropertyCarousel;
