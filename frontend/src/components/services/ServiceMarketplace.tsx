import React, { useState, useEffect } from 'react';
import { getServiceCatalog, bookService, ServiceItem } from '../../api/serviceApi';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Modal from '../ui/Modal';
import { ShoppingBag, Clock, CheckCircle, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const ServiceMarketplace: React.FC = () => {
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [bookingDate, setBookingDate] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        loadServices();
    }, []);

    const loadServices = async () => {
        const data = await getServiceCatalog();
        setServices(data);
    };

    const handleBookClick = (service: ServiceItem) => {
        setSelectedService(service);
        setIsModalOpen(true);
    };

    const confirmBooking = async () => {
        if (!selectedService || !bookingDate) {
            toast.error('Veuillez choisir une date');
            return;
        }

        try {
            await bookService({
                service_id: selectedService.id,
                lot_id: 1, // TODO: Get actual user's lot ID dynamically
                booking_date: bookingDate,
                notes: notes
            });
            toast.success('Service réservé avec succès !');
            setIsModalOpen(false);
            setBookingDate('');
            setNotes('');
        } catch (error) {
            toast.error('Erreur lors de la réservation');
        }
    };

    const categories = {
        cleaning: { label: 'Nettoyage', color: 'bg-blue-100 text-blue-700' },
        security: { label: 'Sécurité', color: 'bg-red-100 text-red-700' },
        childcare: { label: 'Nounou', color: 'bg-pink-100 text-pink-700' },
        transport: { label: 'Transport', color: 'bg-yellow-100 text-yellow-700' },
        other: { label: 'Autre', color: 'bg-gray-100 text-gray-700' },
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <ShoppingBag className="text-primary" /> Services Connexes
                </h2>
                <span className="text-sm text-gray-500">Commandez vos services en un clic</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((service) => (
                    <motion.div
                        key={service.id}
                        whileHover={{ y: -5 }}
                        className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden flex flex-col"
                    >
                        <div className="h-32 bg-gray-200 relative">
                            {/* Placeholder Image */}
                            <div className="absolute inset-0 flex items-center justify-center text-gray-400 font-bold text-xl bg-gray-100">
                                {service.name.charAt(0)}
                            </div>
                            <span className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold ${categories[service.category]?.color || 'bg-gray-100'}`}>
                                {categories[service.category]?.label || service.category}
                            </span>
                        </div>
                        <div className="p-5 flex-1 flex flex-col">
                            <h3 className="font-bold text-lg text-gray-900 mb-1">{service.name}</h3>
                            <p className="text-gray-500 text-sm mb-4 flex-1">{service.description}</p>

                            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                                <div>
                                    <span className="text-xl font-bold text-primary">{service.price_base.toLocaleString()} F</span>
                                    <span className="text-xs text-gray-400 ml-1">/ {service.unit}</span>
                                </div>
                                <Button size="sm" variant="primary" onClick={() => handleBookClick(service)}>
                                    Réserver
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Réserver un service">
                <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-bold text-lg">{selectedService?.name}</h4>
                        <p className="text-primary font-bold">{selectedService?.price_base.toLocaleString()} FCFA / {selectedService?.unit}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date souhaitée</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-3 text-gray-400 h-5 w-5" />
                            <input
                                type="datetime-local"
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                                value={bookingDate}
                                onChange={(e) => setBookingDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Instructions</label>
                        <textarea
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none h-24 resize-none"
                            placeholder="Ex: Clé sous le paillasson, chien gentil..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        ></textarea>
                    </div>

                    <div className="flex justify-end gap-3 mt-4">
                        <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Annuler</Button>
                        <Button variant="primary" onClick={confirmBooking}>Confirmer la réservation</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ServiceMarketplace;
