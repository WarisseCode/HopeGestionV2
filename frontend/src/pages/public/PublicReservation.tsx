import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Calendar, Clock, ArrowRight, User, Phone, Mail, CheckCircle, Info } from 'lucide-react';
import { motion } from 'framer-motion';
// @ts-ignore
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { API_URL } from '../../config';

const PublicReservation: React.FC = () => {
    const { lotId } = useParams();
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [reference, setReference] = useState('');
    const [lot, setLot] = useState<any>(null);

    const [formData, setFormData] = useState({
        lot_id: lotId || '0',
        nom: '',
        prenoms: '',
        email: '',
        telephone: '',
        date_debut: '',
        type_projet: 'location',
        message: ''
    });



    useEffect(() => {
        if (lotId) {
            // Fetch real lot data from public API
            const fetchLot = async () => {
                try {
                    const res = await fetch(`${API_URL}/public/lots/${lotId}`);
                    if (res.ok) {
                        const data = await res.json();
                        setLot({
                            id: data.id,
                            ref_lot: data.ref_lot,
                            type: data.type,
                            description: data.description,
                            surface: data.surface,
                            loyer_actuel: data.loyer,
                            adresse: `${data.quartier}, ${data.ville}`,
                            images: [data.image],
                            coords: [data.latitude, data.longitude]
                        });
                    } else {
                        // Fallback to mock data if lot not found
                        setLot({
                            id: lotId,
                            ref_lot: 'DEMO-001',
                            type: 'Appartement',
                            description: 'Bien en prévisualisation',
                            surface: 0,
                            loyer_actuel: 0,
                            adresse: 'Adresse non disponible',
                            images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80'],
                            coords: [5.345, -4.024]
                        });
                    }
                } catch (err) {
                    console.error('Error fetching lot:', err);
                }
            };
            fetchLot();
        }
    }, [lotId]);

    const submitReservation = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/reservations/public`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            
            setReference(data.reference);
            setSuccess(true);
        } catch (err: any) {
            alert(err.message || 'Erreur lors de la demande');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-base-100 rounded-3xl shadow-xl p-8 max-w-md w-full text-center"
                >
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="text-green-600" size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-base-content mb-2">Demande Reçue !</h2>
                    <p className="text-base-content/60 mb-6">
                        Votre référence : <span className="font-mono font-bold text-base-content bg-base-300 px-2 py-1 rounded">{reference}</span><br/>
                        Un gestionnaire va vous recontacter sur WhatsApp très rapidement.
                    </p>
                    <button onClick={() => window.location.href = '/'} className="btn btn-primary text-white w-full justify-center">
                        Retour à l'accueil
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-base-300 flex flex-col md:flex-row">
            {/* LEFT: Property & Map */}
            <div className="w-full md:w-1/2 lg:w-3/5 h-[300px] md:h-auto relative bg-gray-900 text-white overflow-hidden">
                {lot && (
                    <>
                        <img src={lot.images[0]} alt="Bien" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-gray-900 to-transparent p-8">
                            <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2 inline-block">
                                {lot.type}
                            </span>
                            <h1 className="text-3xl font-bold mb-2">{lot.description}</h1>
                            <div className="flex items-center gap-4 text-gray-300">
                                <span className="flex items-center gap-1"><MapPin size={16}/> {lot.adresse}</span>
                                <span className="font-bold text-white text-xl">{lot.loyer_actuel.toLocaleString()} FCFA / mois</span>
                            </div>
                        </div>
                        {/* Map Overlay Preview */}
                        <div className="absolute top-4 right-4 w-32 h-32 bg-base-100 rounded-xl shadow-lg border-2 border-white overflow-hidden opacity-90 hover:opacity-100 transition">
                            <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-900 text-xs font-bold p-2 text-center">
                                <MapPin className="mx-auto mb-1" size={16} />
                                Voir sur la carte
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* RIGHT: Form */}
            <div className="w-full md:w-1/2 lg:w-2/5 md:overflow-y-auto bg-base-100 p-6 md:p-12 shadow-2xl z-10">
                <div className="max-w-md mx-auto">
                    <div className="mb-8">
                        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Réservation en ligne</h2>
                        <h3 className="text-3xl font-bold text-base-content">Sécurisez ce bien</h3>
                        <div className="h-1 w-20 bg-blue-600 mt-4 rounded-full"></div>
                    </div>

                    <form onSubmit={submitReservation} className="space-y-6">
                        {step === 0 && (
                            <motion.div initial={{x: 20, opacity:0}} animate={{x:0, opacity:1}} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-base-content/60 uppercase">Nom</label>
                                        <div className="relative">
                                            <input required type="text" className="w-full pl-10 pr-4 py-3 bg-base-200 text-base-content placeholder-base-content/50 border-none rounded-xl focus:ring-2 focus:ring-primary" placeholder="Nom"
                                                value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} />
                                            <User size={18} className="absolute left-3 top-3.5 text-base-content/40" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-base-content/60 uppercase">Prénoms</label>
                                        <input required type="text" className="w-full px-4 py-3 bg-base-200 text-base-content placeholder-base-content/50 border-none rounded-xl focus:ring-2 focus:ring-primary" placeholder="Prénoms"
                                            value={formData.prenoms} onChange={e => setFormData({...formData, prenoms: e.target.value})} />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-base-content/60 uppercase">Téléphone (WhatsApp)</label>
                                    <div className="relative">
                                        <input required type="tel" className="w-full pl-10 pr-4 py-3 bg-base-200 text-base-content placeholder-base-content/50 border-none rounded-xl focus:ring-2 focus:ring-primary" placeholder="+229 01..."
                                            value={formData.telephone} onChange={e => setFormData({...formData, telephone: e.target.value})} />
                                        <Phone size={18} className="absolute left-3 top-3.5 text-base-content/40" />
                                    </div>
                                    <p className="text-xs text-primary flex items-center gap-1"><Info size={12}/> Important pour validation rapide</p>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-base-content/60 uppercase">Email (Optionnel)</label>
                                    <div className="relative">
                                        <input type="email" className="w-full pl-10 pr-4 py-3 bg-base-200 text-base-content placeholder-base-content/50 border-none rounded-xl focus:ring-2 focus:ring-primary" placeholder="exemple@email.com"
                                            value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                                        <Mail size={18} className="absolute left-3 top-3.5 text-base-content/40" />
                                    </div>
                                </div>
                                
                                <button type="button" onClick={() => setStep(1)} className="btn btn-primary text-white w-full py-4 text-lg justify-center mt-4">
                                    Suivant <ArrowRight size={20} className="ml-2" />
                                </button>
                            </motion.div>
                        )}

                        {step === 1 && (
                            <motion.div initial={{x: 20, opacity:0}} animate={{x:0, opacity:1}} className="space-y-4">
                                <button type="button" onClick={() => setStep(0)} className="text-sm font-bold text-base-content/50 hover:text-base-content mb-2 transition-colors">← Retour</button>
                                
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-base-content/60 uppercase">Type de Projet</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button type="button" 
                                            onClick={() => setFormData({...formData, type_projet: 'location'})}
                                            className={`p-3 rounded-xl border-2 font-bold transition flex items-center justify-center ${formData.type_projet === 'location' ? 'border-primary bg-primary/10 text-primary' : 'border-base-300 text-base-content/50 hover:border-base-content/30 hover:bg-base-200/50'}`}>
                                            Location Simple
                                        </button>
                                        <button type="button" 
                                            onClick={() => setFormData({...formData, type_projet: 'achat'})}
                                            className={`p-3 rounded-xl border-2 font-bold transition flex items-center justify-center ${formData.type_projet === 'achat' ? 'border-primary bg-primary/10 text-primary' : 'border-base-300 text-base-content/50 hover:border-base-content/30 hover:bg-base-200/50'}`}>
                                            Achat / Vente
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-base-content/60 uppercase">Date souhaitée</label>
                                    <div className="relative">
                                        <input required type="date" className="w-full pl-10 pr-4 py-3 bg-base-200 text-base-content border-none rounded-xl focus:ring-2 focus:ring-primary"
                                            value={formData.date_debut} onChange={e => setFormData({...formData, date_debut: e.target.value})} />
                                        <Calendar size={18} className="absolute left-3 top-3.5 text-base-content/40" />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-base-content/60 uppercase">Message (Optionnel)</label>
                                    <textarea className="w-full px-4 py-3 bg-base-200 text-base-content placeholder-base-content/50 border-none rounded-xl focus:ring-2 focus:ring-primary h-24" 
                                        placeholder="Précisions sur votre demande..."
                                        value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} />
                                </div>

                                <div className="bg-warning/10 p-4 rounded-xl border border-warning/20">
                                    <div className="flex gap-3">
                                        <Clock className="text-warning shrink-0" size={24} />
                                        <p className="text-xs font-medium text-warning-content leading-relaxed">
                                            Cette réservation est valable <span className="font-bold">24 heures</span> en attente de validation. Un acompte pourra être demandé.
                                        </p>
                                    </div>
                                </div>

                                <button type="submit" disabled={loading} className="btn btn-primary text-white w-full py-4 text-lg justify-center shadow-primary/30 shadow-lg hover:shadow-xl transition-all">
                                    {loading ? <span className="loading loading-spinner"></span> : 'Confirmer la Demande'}
                                </button>
                            </motion.div>
                        )}
                    </form>
                </div>
                
                {/* Footer safe area */}
                <div className="mt-8 pt-8 border-t border-base-200 flex items-center justify-between text-xs text-gray-400 font-medium">
                    <span>🔒 Sécurisé par HopeGestion</span>
                    <span>v2.0</span>
                </div>
            </div>
        </div>
    );
};

export default PublicReservation;
