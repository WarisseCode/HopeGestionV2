// frontend/src/pages/public/BiensPublicsPage.tsx
import React, { useState, useMemo } from 'react';
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
  Share2
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import PublicLayout from '../../layout/PublicLayout';
import Button from '../../components/ui/Button';
import { mockProperties, getPropertyTypes, getCities, filterProperties } from '../../data/mockProperties';
import type { PublicProperty } from '../../data/mockProperties';

const BiensPublicsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<PublicProperty | null>(null);
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'recent'>('recent');

  const types = getPropertyTypes();
  const cities = getCities();

  // Filter and sort properties
  const filteredProperties = useMemo(() => {
    let result = mockProperties.filter(p => {
      if (selectedType && p.type !== selectedType) return false;
      if (selectedCity && p.ville !== selectedCity) return false;
      if (p.loyer < priceRange[0] || p.loyer > priceRange[1]) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return p.titre.toLowerCase().includes(query) || 
               p.quartier.toLowerCase().includes(query) ||
               p.ville.toLowerCase().includes(query);
      }
      return p.disponible;
    });

    // Sort
    if (sortBy === 'price-asc') {
      result.sort((a, b) => a.loyer - b.loyer);
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => b.loyer - a.loyer);
    }

    return result;
  }, [selectedType, selectedCity, priceRange, searchQuery, sortBy]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price);
  };

  const clearFilters = () => {
    setSelectedType('');
    setSelectedCity('');
    setPriceRange([0, 1000000]);
    setSearchQuery('');
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

                {/* City */}
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
                  </select>
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
                variants={itemVariants}
                className={`bg-base-100 rounded-2xl overflow-hidden shadow-lg border border-base-200 hover:shadow-2xl transition-all duration-300 group ${
                  viewMode === 'list' ? 'flex' : ''
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
                  
                  {/* Actions */}
                  <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors">
                      <Heart size={16} className="text-gray-600" />
                    </button>
                    <button className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors">
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
              className="bg-base-100 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
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

                {/* Contact */}
                <div className="flex gap-3">
                  <Button variant="primary" className="flex-1 rounded-xl py-3">
                    <Phone size={18} className="mr-2" />
                    Appeler maintenant
                  </Button>
                  <Button variant="ghost" className="flex-1 rounded-xl py-3 border border-base-300">
                    <Mail size={18} className="mr-2" />
                    Envoyer un message
                  </Button>
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
