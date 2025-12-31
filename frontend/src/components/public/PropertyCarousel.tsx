// frontend/src/components/public/PropertyCarousel.tsx
import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Home, ArrowRight, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { mockProperties } from '../../data/mockProperties';
import type { PublicProperty } from '../../data/mockProperties';
import Button from '../ui/Button';

// Styles CSS pour l'animation infinie
const carouselStyles = `
  @keyframes scrollLeft {
    0% {
      transform: translateX(0);
    }
    100% {
      transform: translateX(-50%);
    }
  }
  
  .animate-scroll-left {
    animation: scrollLeft 40s linear infinite;
    will-change: transform;
  }
  
  .animate-scroll-left.paused {
    animation-play-state: paused;
  }
  
  .carousel-container {
    mask-image: linear-gradient(
      to right,
      transparent,
      black 3%,
      black 97%,
      transparent
    );
    -webkit-mask-image: linear-gradient(
      to right,
      transparent,
      black 3%,
      black 97%,
      transparent
    );
  }
  
  .property-card-glow:hover {
    box-shadow: 0 20px 40px -10px rgba(var(--p), 0.3);
  }
`;

interface PropertyCardProps {
  property: PublicProperty;
  onViewDetails: (id: number) => void;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property, onViewDetails }) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price);
  };

  return (
    <motion.div
      className="flex-shrink-0 w-[340px] bg-base-100 rounded-2xl overflow-hidden shadow-lg border border-base-200 group cursor-pointer property-card-glow transition-shadow duration-300"
      whileHover={{ y: -10, scale: 1.03 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      onClick={() => onViewDetails(property.id)}
    >
      {/* Image Container */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={property.image}
          alt={property.titre}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Badge Type */}
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
        
        {/* Badge Disponible */}
        <div className="absolute top-3 right-3">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-lg flex items-center gap-1">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            Disponible
          </span>
        </div>
        
        {/* Price overlay */}
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
        
        {/* Specs */}
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

        {/* Amenities preview */}
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
    </motion.div>
  );
};

const PropertyCarousel: React.FC = () => {
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  
  // Dupliquer les propriétés pour l'effet infini
  const duplicatedProperties = [...mockProperties, ...mockProperties];
  
  const cardWidth = 340 + 32; // card width + gap

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = direction === 'left' ? -cardWidth : cardWidth;
      // Get the animated div inside
      const animatedDiv = container.querySelector('.animate-scroll-left') as HTMLElement;
      if (animatedDiv) {
        // Get current computed transform
        const style = window.getComputedStyle(animatedDiv);
        const matrix = new DOMMatrix(style.transform);
        const currentX = matrix.m41;
        
        // Temporarily pause, apply offset, then resume
        setIsPaused(true);
        animatedDiv.style.transform = `translateX(${currentX + scrollAmount}px)`;
        
        setTimeout(() => {
          setIsPaused(false);
        }, 100);
      }
    }
  };

  const handleViewDetails = (id: number) => {
    navigate(`/biens-disponibles?property=${id}`);
  };

  return (
    <section className="py-20 bg-gradient-to-b from-base-200 to-base-100 overflow-hidden relative">
      {/* Inject animation styles */}
      <style>{carouselStyles}</style>
      
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
      
      <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
        {/* Section Header */}
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
        <div className="relative">
          {/* Navigation Buttons */}
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 z-20 w-12 h-12 rounded-full bg-base-100 shadow-xl border border-base-200 flex items-center justify-center transition-all duration-300 opacity-90 hover:bg-primary hover:text-white hover:scale-110 cursor-pointer"
            style={{ transform: 'translate(-50%, -50%)' }}
          >
            <ChevronLeft size={24} />
          </button>
          
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 z-20 w-12 h-12 rounded-full bg-base-100 shadow-xl border border-base-200 flex items-center justify-center transition-all duration-300 opacity-90 hover:bg-primary hover:text-white hover:scale-110 cursor-pointer"
            style={{ transform: 'translate(50%, -50%)' }}
          >
            <ChevronRight size={24} />
          </button>

          {/* Scrolling container with infinite animation */}
          <div 
            ref={scrollContainerRef}
            className="overflow-hidden py-6 carousel-container"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div 
              className={`flex gap-8 animate-scroll-left ${isPaused ? 'paused' : ''}`}
              style={{ width: 'max-content' }}
            >
              {duplicatedProperties.map((property, index) => (
                <PropertyCard
                  key={`${property.id}-${index}`}
                  property={property}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <motion.div 
          className="text-center mt-12"
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
