// frontend/src/pages/public/BiensPublicsPage.tsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  Home, 
  Maximize2, 
  Filter, 
  Search, 
  X, 
  Phone, 
  Mail,
  ChevronDown,
  Grid3X3,
  List,
  Heart,
  Share2,
  Navigation,
  Locate,
  Loader2
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import PublicLayout from '../../layout/PublicLayout';
import Button from '../../components/ui/Button';
import { mockProperties, getPropertyTypes, getCities, filterProperties } from '../../data/mockProperties';
import type { PublicProperty } from '../../data/mockProperties';
import { useGeolocation } from '../../hooks/useGeolocation';

const BiensPublicsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<PublicProperty | null>(null);
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'recent'>('recent');
  const [highlightedPropertyId, setHighlightedPropertyId] = useState<number | null>(null);
  const [maxDistance, setMaxDistance] = useState<number>(0); // 0 = no distance filter
  
  const propertyRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  
  // Geolocation hook
  const { 
    latitude, 
    longitude, 
    loading: geoLoading, 
    error: geoError, 
    permissionGranted,
    requestLocation,
    calculateDistance,
    getDirectionsUrl
  } = useGeolocation();

  const types = getPropertyTypes();
  const cities = getCities();

  // Handle property URL parameter - scroll to and highlight property from carousel
  useEffect(() => {
    const propertyId = searchParams.get('property');
    if (propertyId) {
      const id = parseInt(propertyId);
      const property = mockProperties.find(p => p.id === id);
      
      if (property) {
        // Set the highlighted property for visual feedback
        setHighlightedPropertyId(id);
        
        // Wait for rendering then scroll to the property
        setTimeout(() => {
          const propertyElement = propertyRefs.current.get(id);
          if (propertyElement) {
            propertyElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Open the property modal after a short delay
            setTimeout(() => {
              setSelectedProperty(property);
            }, 500);
          }
        }, 300);
        
        // Clear the URL parameter after handling
        setSearchParams({});
        
        // Remove highlight after animation
        setTimeout(() => {
          setHighlightedPropertyId(null);
        }, 3000);
      }
    }
  }, [searchParams, setSearchParams]);

  // Filter and sort properties
  const filteredProperties = useMemo(() => {
    let result = mockProperties.filter(p => {
      if (selectedType && p.type !== selectedType) return false;
      if (selectedCity && p.ville !== selectedCity) return false;
      if (p.loyer < priceRange[0] || p.loyer > priceRange[1]) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = p.titre.toLowerCase().includes(query) || 
               p.quartier.toLowerCase().includes(query) ||
               p.ville.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      
      // Distance filter (only if geolocation is active and distance filter is set)
      if (maxDistance > 0 && permissionGranted && latitude && longitude) {
        const distance = calculateDistance(p.latitude, p.longitude);
        if (distance === null || distance > maxDistance) return false;
      }
      
      return p.disponible;
    });

    // Sort
    if (sortBy === 'price-asc') {
      result.sort((a, b) => a.loyer - b.loyer);
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => b.loyer - a.loyer);
    } else if (sortBy === 'distance' && permissionGranted) {
      result.sort((a, b) => {
        const distA = calculateDistance(a.latitude, a.longitude) || Infinity;
        const distB = calculateDistance(b.latitude, b.longitude) || Infinity;
        return distA - distB;
      });
    }

    return result;
  }, [selectedType, selectedCity, priceRange, searchQuery, sortBy, maxDistance, permissionGranted, latitude, longitude, calculateDistance]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price);
  };

  const clearFilters = () => {
    setSelectedType('');
    setSelectedCity('');
    setPriceRange([0, 1000000]);
    setSearchQuery('');
    setMaxDistance(0);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="pt-28 pb-12 bg-gradient-to-br from-primary/10 via-base-200 to-secondary/10 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5" />
        <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl md:text-6xl font-extrabold text-base-content mb-4">
              Trouvez votre <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Bien Idéal</span>
            </h1>
            <p className="text-lg text-base-content/70 max-w-2xl mx-auto mb-8">
              Explorez notre catalogue de biens immobiliers disponibles à la location. 
              Appartements, villas, studios et plus encore.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-3xl mx-auto bg-base-100 rounded-2xl shadow-xl p-2 flex gap-2">
              <div className="flex-1 flex items-center gap-3 px-4">
                <Search size={20} className="text-base-content/50" />
                <input
                  type="text"
                  placeholder="Rechercher par quartier, ville ou type de bien..."
                  className="w-full py-3 bg-transparent outline-none text-base-content"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button 
                variant="primary" 
                className="rounded-xl px-6"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter size={18} className="mr-2" />
                Filtres
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-base-100 border-b border-base-200 overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Type */}
                <div>
                  <label className="block text-sm font-medium mb-2">Type de bien</label>
                  <select 
                    className="select select-bordered w-full"
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                  >
                    <option value="">Tous les types</option>
                    {types.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* Ville */}
                <div>
                  <label className="block text-sm font-medium mb-2">Ville</label>
                  <select 
                    className="select select-bordered w-full"
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                  >
                    <option value="">Toutes les villes</option>
                    {cities.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium mb-2">Budget max.</label>
                  <select 
                    className="select select-bordered w-full"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                  >
                    <option value={1000000}>Tous les prix</option>
                    <option value={100000}>Jusqu'à 100.000 FCFA</option>
                    <option value={200000}>Jusqu'à 200.000 FCFA</option>
                    <option value={300000}>Jusqu'à 300.000 FCFA</option>
                    <option value={500000}>Jusqu'à 500.000 FCFA</option>
                  </select>
                </div>

                {/* Sort */}
                <div>
                  <label className="block text-sm font-medium mb-2">Trier par</label>
                  <select 
                    className="select select-bordered w-full"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                  >
                    <option value="recent">Plus récents</option>
                    <option value="price-asc">Prix croissant</option>
                    <option value="price-desc">Prix décroissant</option>
                    {permissionGranted && <option value="distance">Plus proches</option>}
                  </select>
                </div>
              </div>
              
              {/* Geolocation Section */}
              <div className="mt-4 p-4 bg-base-200 rounded-xl">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                  {/* Enable Location Button */}
                  <div className="flex-shrink-0">
                    {!permissionGranted ? (
                      <button
                        onClick={requestLocation}
                        disabled={geoLoading}
                        className="btn btn-primary gap-2"
                      >
                        {geoLoading ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Locate size={18} />
                        )}
                        {geoLoading ? 'Localisation...' : 'Activer ma position'}
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 text-success">
                        <Locate size={18} />
                        <span className="font-medium">Position activée</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Distance Filter (only visible when location is enabled) */}
                  {permissionGranted && (
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-2">Distance maximum</label>
                      <select 
                        className="select select-bordered w-full md:w-auto"
                        value={maxDistance}
                        onChange={(e) => setMaxDistance(parseInt(e.target.value))}
                      >
                        <option value={0}>Toutes distances</option>
                        <option value={1}>1 km</option>
                        <option value={2}>2 km</option>
                        <option value={5}>5 km</option>
                        <option value={10}>10 km</option>
                        <option value={20}>20 km</option>
                        <option value={50}>50 km</option>
                      </select>
                    </div>
                  )}
                  
                  {/* Error message */}
                  {geoError && (
                    <div className="text-sm text-error">{geoError}</div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-base-200">
                <span className="text-sm text-base-content/60">
                  {filteredProperties.length} bien(s) trouvé(s)
                </span>
                <button 
                  onClick={clearFilters}
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <X size={14} />
                  Réinitialiser les filtres
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <section className="py-12 bg-base-200 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          {/* Controls */}
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold text-base-content">
              {filteredProperties.length} biens disponibles
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-primary text-white' : 'bg-base-100'}`}
              >
                <Grid3X3 size={20} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-primary text-white' : 'bg-base-100'}`}
              >
                <List size={20} />
              </button>
            </div>
          </div>

          {/* Properties Grid */}
          <motion.div 
            className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {filteredProperties.map((property) => (
              <motion.div
                key={property.id}
                ref={(el) => {
                  if (el) propertyRefs.current.set(property.id, el);
                }}
                variants={itemVariants}
                className={`bg-base-100 rounded-2xl overflow-hidden shadow-lg border hover:shadow-2xl transition-all duration-300 group ${
                  viewMode === 'list' ? 'flex' : ''
                } ${
                  highlightedPropertyId === property.id 
                    ? 'border-primary ring-4 ring-primary/30 animate-pulse' 
                    : 'border-base-200'
                }`}
                onClick={() => setSelectedProperty(property)}
              >
                {/* Image */}
                <div className={`relative overflow-hidden ${viewMode === 'list' ? 'w-80 flex-shrink-0' : 'h-52'}`}>
                  <img
                    src={property.image}
                    alt={property.titre}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  
                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-lg
                      ${property.type === 'Villa' ? 'bg-amber-500 text-white' : 
                        property.type === 'Appartement' ? 'bg-blue-500 text-white' :
                        property.type === 'Studio' ? 'bg-purple-500 text-white' :
                        'bg-gray-500 text-white'}`}
                    >
                      {property.type}
                    </span>
                  </div>
                  
                  {/* Actions & Distance Badge */}
                  <div className="absolute top-3 right-3 flex gap-2">
                    {/* Distance Badge */}
                    {permissionGranted && calculateDistance(property.latitude, property.longitude) !== null && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary text-white shadow-lg flex items-center gap-1">
                        <Navigation size={12} />
                        {calculateDistance(property.latitude, property.longitude)?.toFixed(1)} km
                      </span>
                    )}
                    <button className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors opacity-0 group-hover:opacity-100">
                      <Heart size={16} className="text-gray-600" />
                    </button>
                    <button className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors opacity-0 group-hover:opacity-100">
                      <Share2 size={16} className="text-gray-600" />
                    </button>
                  </div>
                  
                  {/* Price */}
                  <div className="absolute bottom-3 left-3">
                    <div className="bg-white/95 backdrop-blur px-4 py-2 rounded-xl">
                      <span className="text-xl font-extrabold text-primary">{formatPrice(property.loyer)}</span>
                      <span className="text-xs text-gray-600 ml-1">FCFA/mois</span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1">
                  <h3 className="font-bold text-lg text-base-content mb-2 group-hover:text-primary transition-colors">
                    {property.titre}
                  </h3>
                  
                  <div className="flex items-center gap-1 text-base-content/60 text-sm mb-3">
                    <MapPin size={14} className="text-primary" />
                    <span>{property.quartier}, {property.ville}</span>
                  </div>
                  
                  <p className="text-sm text-base-content/70 mb-4 line-clamp-2">
                    {property.description}
                  </p>
                  
                  {/* Specs */}
                  <div className="flex items-center gap-4 text-sm text-base-content/70 mb-4">
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

                  {/* Amenities */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {property.amenities.slice(0, 4).map((amenity, idx) => (
                      <span 
                        key={idx} 
                        className="text-xs px-2 py-1 bg-base-200 rounded-full"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="flex gap-2">
                    <Button variant="primary" className="flex-1 rounded-xl">
                      <Phone size={16} className="mr-2" />
                      Contacter
                    </Button>
                    <Button variant="ghost" className="rounded-xl border border-base-300">
                      <Mail size={16} />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Empty State */}
          {filteredProperties.length === 0 && (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🏠</div>
              <h3 className="text-xl font-bold text-base-content mb-2">Aucun bien trouvé</h3>
              <p className="text-base-content/60 mb-6">
                Essayez de modifier vos critères de recherche
              </p>
              <Button variant="primary" onClick={clearFilters}>
                Réinitialiser les filtres
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Property Detail Modal */}
      <AnimatePresence>
        {selectedProperty && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedProperty(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-base-100 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header Image */}
              <div className="relative h-72">
                <img
                  src={selectedProperty.image}
                  alt={selectedProperty.titre}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <button
                  onClick={() => setSelectedProperty(null)}
                  className="absolute top-4 right-4 p-2 bg-white/90 rounded-full hover:bg-white"
                >
                  <X size={20} />
                </button>
                <div className="absolute bottom-4 left-6 text-white">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold mb-2 inline-block
                    ${selectedProperty.type === 'Villa' ? 'bg-amber-500' : 
                      selectedProperty.type === 'Appartement' ? 'bg-blue-500' :
                      'bg-gray-500'}`}
                  >
                    {selectedProperty.type}
                  </span>
                  <h2 className="text-2xl font-bold">{selectedProperty.titre}</h2>
                  <div className="flex items-center gap-1 text-white/80 mt-1">
                    <MapPin size={14} />
                    <span>{selectedProperty.quartier}, {selectedProperty.ville}</span>
                  </div>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 max-h-96 overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <span className="text-3xl font-extrabold text-primary">
                      {formatPrice(selectedProperty.loyer)}
                    </span>
                    <span className="text-base-content/60 ml-1">FCFA / mois</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn btn-circle btn-ghost">
                      <Heart size={20} />
                    </button>
                    <button className="btn btn-circle btn-ghost">
                      <Share2 size={20} />
                    </button>
                  </div>
                </div>

                {/* Specs Grid */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-base-200 rounded-xl">
                    <Maximize2 size={24} className="mx-auto mb-2 text-primary" />
                    <div className="font-bold">{selectedProperty.surface} m²</div>
                    <div className="text-xs text-base-content/60">Surface</div>
                  </div>
                  <div className="text-center p-4 bg-base-200 rounded-xl">
                    <Home size={24} className="mx-auto mb-2 text-primary" />
                    <div className="font-bold">{selectedProperty.pieces}</div>
                    <div className="text-xs text-base-content/60">Pièces</div>
                  </div>
                  <div className="text-center p-4 bg-base-200 rounded-xl">
                    <span className="text-2xl">🛏️</span>
                    <div className="font-bold">{selectedProperty.chambres}</div>
                    <div className="text-xs text-base-content/60">Chambres</div>
                  </div>
                  <div className="text-center p-4 bg-base-200 rounded-xl">
                    <span className="text-2xl">🚿</span>
                    <div className="font-bold">{selectedProperty.sallesBain}</div>
                    <div className="text-xs text-base-content/60">SDB</div>
                  </div>
                </div>

                {/* Description */}
                <div className="mb-6">
                  <h3 className="font-bold text-lg mb-2">Description</h3>
                  <p className="text-base-content/70">{selectedProperty.description}</p>
                </div>

                {/* Amenities */}
                <div className="mb-6">
                  <h3 className="font-bold text-lg mb-2">Équipements</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedProperty.amenities.map((amenity, idx) => (
                      <span 
                        key={idx} 
                        className="px-3 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium"
                      >
                        ✓ {amenity}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Contact & Directions */}
                <div className="flex flex-col gap-3">
                  {/* Directions Button - Always visible */}
                  {selectedProperty && (
                    permissionGranted ? (
                      <a
                        href={getDirectionsUrl(selectedProperty.latitude, selectedProperty.longitude)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary-fade rounded-xl py-3 gap-2"
                      >
                        <Navigation size={18} />
                        Voir l'itinéraire
                        {calculateDistance(selectedProperty.latitude, selectedProperty.longitude) !== null && (
                          <span className="badge badge-ghost ml-2">
                            {calculateDistance(selectedProperty.latitude, selectedProperty.longitude)?.toFixed(1)} km
                          </span>
                        )}
                      </a>
                    ) : (
                      <button
                        onClick={requestLocation}
                        disabled={geoLoading}
                        className="btn btn-secondary rounded-xl py-3 gap-2"
                      >
                        {geoLoading ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Navigation size={18} />
                        )}
                        {geoLoading ? 'Localisation...' : 'Activer ma position pour voir l\'itinéraire'}
                      </button>
                    )
                  )}
                  
                  <div className="flex gap-3">
                    <Button variant="primary" className="flex-1 rounded-xl py-3">
                      <Phone size={18} className="mr-2" />
                      Appeler maintenant
                    </Button>
                    <Button variant="secondary" className="flex-1 rounded-xl py-3 border border-base-300">
                      <Mail size={18} className="mr-2" />
                      Envoyer un message
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PublicLayout>
  );
};

export default BiensPublicsPage;
