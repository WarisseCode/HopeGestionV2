import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Filter, Home, DollarSign } from 'lucide-react';
import { getPublicBiens } from '../../api/publicApi';
import Button from '../../components/ui/Button';
import SearchInput from '../../components/ui/SearchInput';
import Card from '../../components/ui/Card';
import { motion } from 'framer-motion';

// Fix Leaflet icons
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const Catalogue: React.FC = () => {
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
    const [biens, setBiens] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        ville: '',
        type: '',
        budgetMax: ''
    });

    useEffect(() => {
        loadBiens();
    }, [filters]);

    const loadBiens = async () => {
        setLoading(true);
        // Mock data if API fails or is empty initially
        try {
            const data = await getPublicBiens(filters);
            if (data && data.length > 0) {
                setBiens(data);
            } else {
                // Fallback Mock Data for demo
                setBiens([
                    { id: 1, type: 'Appartement', ville: 'Cotonou', quartier: 'Haie Vive', loyer: 150000, pieces: 3, lat: 6.355, lng: 2.415, photo: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2' },
                    { id: 2, type: 'Villa', ville: 'Calavi', quartier: 'Arconville', loyer: 250000, pieces: 5, lat: 6.455, lng: 2.355, photo: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c' },
                    { id: 3, type: 'Studio', ville: 'Cotonou', quartier: 'Fidjrossè', loyer: 60000, pieces: 1, lat: 6.365, lng: 2.385, photo: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267' },
                ]);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header / Navbar (Simplified) */}
            <header className="bg-white shadow-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Home className="text-primary h-8 w-8" />
                        <span className="text-xl font-bold text-gray-900">Hope Immo</span>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => window.location.href='/login'}>Se connecter</Button>
                        <Button variant="primary">Déposer un dossier</Button>
                    </div>
                </div>
            </header>

            {/* Hero Search Section */}
            <div className="bg-primary/5 py-8 md:py-12">
                <div className="max-w-5xl mx-auto px-4 text-center">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-6">
                        Trouvez votre futur chez-vous au Bénin
                    </h1>

                    <div className="bg-white p-4 rounded-2xl shadow-lg max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3.5 text-gray-400 h-5 w-5" />
                            <input
                                type="text"
                                placeholder="Ville ou Quartier"
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                                value={filters.ville}
                                onChange={(e) => setFilters({...filters, ville: e.target.value})}
                            />
                        </div>
                        <div className="relative">
                            <Home className="absolute left-3 top-3.5 text-gray-400 h-5 w-5" />
                            <select
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none appearance-none bg-transparent"
                                value={filters.type}
                                onChange={(e) => setFilters({...filters, type: e.target.value})}
                            >
                                <option value="">Type de bien</option>
                                <option value="Appartement">Appartement</option>
                                <option value="Maison">Maison</option>
                                <option value="Villa">Villa</option>
                                <option value="Bureau">Bureau</option>
                            </select>
                        </div>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-3.5 text-gray-400 h-5 w-5" />
                            <input
                                type="number"
                                placeholder="Budget Max (FCFA)"
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                                value={filters.budgetMax}
                                onChange={(e) => setFilters({...filters, budgetMax: e.target.value})}
                            />
                        </div>
                        <Button variant="primary" className="h-full w-full rounded-xl text-lg font-bold" onClick={loadBiens}>
                            <Search className="mr-2 h-5 w-5" /> Rechercher
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content: Map & List Toggle */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800">{biens.length} biens trouvés</h2>
                    <div className="flex bg-gray-200 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-white shadow text-primary' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            Liste
                        </button>
                        <button
                            onClick={() => setViewMode('map')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'map' ? 'bg-white shadow text-primary' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            Carte
                        </button>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6 h-[600px]">
                    {/* List View */}
                    <div className={`flex-1 overflow-y-auto pr-2 ${viewMode === 'map' ? 'hidden lg:block lg:w-1/3' : 'w-full'}`}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-6">
                            {biens.map((bien) => (
                                <motion.div
                                    key={bien.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all cursor-pointer group"
                                >
                                    <div className="h-48 overflow-hidden relative">
                                        <img src={bien.photo} alt={bien.type} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        <span className="absolute top-3 right-3 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
                                            {bien.type}
                                        </span>
                                    </div>
                                    <div className="p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="font-bold text-lg text-gray-900">{bien.quartier}, {bien.ville}</h3>
                                                <p className="text-gray-500 text-sm">{bien.pieces} pièces • Non meublé</p>
                                            </div>
                                            <p className="text-primary font-bold text-lg">{bien.loyer.toLocaleString()} F</p>
                                        </div>
                                        <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
                                            <Button variant="outline" size="sm" className="flex-1">Détails</Button>
                                            <Button variant="primary" size="sm" className="flex-1">Réserver</Button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Map View */}
                    <div className={`bg-gray-200 rounded-2xl overflow-hidden shadow-inner border border-gray-300 ${viewMode === 'list' ? 'hidden lg:block lg:w-1/2' : 'flex-1 h-full'}`}>
                        <MapContainer center={[6.37, 2.39]} zoom={12} style={{ height: '100%', width: '100%' }}>
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            {biens.map((bien) => (
                                bien.lat && bien.lng && (
                                    <Marker key={bien.id} position={[bien.lat, bien.lng]}>
                                        <Popup>
                                            <div className="w-48">
                                                <img src={bien.photo} className="w-full h-24 object-cover rounded-lg mb-2"/>
                                                <h3 className="font-bold">{bien.type} - {bien.quartier}</h3>
                                                <p className="text-primary font-bold">{bien.loyer.toLocaleString()} FCFA</p>
                                                <button className="btn btn-xs btn-primary w-full mt-2">Voir</button>
                                            </div>
                                        </Popup>
                                    </Marker>
                                )
                            ))}
                        </MapContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Catalogue;
