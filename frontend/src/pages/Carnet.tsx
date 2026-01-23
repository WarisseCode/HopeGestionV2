import React, { useState } from 'react';
import { StickyNote, Users, MapPin, Notebook } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../components/ui/Button';
import CarnetNotes from '../components/notebook/CarnetNotes';
import CarnetContacts from '../components/notebook/CarnetContacts';
import CarnetField from '../components/notebook/CarnetField';

const Carnet: React.FC = () => {
    const [viewMode, setViewMode] = useState<'notes' | 'contacts' | 'field'>('notes');

    return (
        <div className="max-w-[1600px] mx-auto p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                         <Notebook className="text-brand-600"/> Carnet Opérationnel
                    </h1>
                    <p className="text-gray-500">Mémoire terrain, contacts et notes</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm p-1 inline-flex gap-1">
                <button
                    onClick={() => setViewMode('notes')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                        viewMode === 'notes' ? 'bg-brand-50 text-brand-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                >
                    <StickyNote size={18} /> Notes
                </button>
                <button
                    onClick={() => setViewMode('contacts')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                        viewMode === 'contacts' ? 'bg-brand-50 text-brand-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                >
                    <Users size={18} /> Contacts
                </button>
                <button
                    onClick={() => setViewMode('field')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                        viewMode === 'field' ? 'bg-brand-50 text-brand-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                >
                    <MapPin size={18} /> Suivi Terrain
                </button>
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={viewMode}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {viewMode === 'notes' && <CarnetNotes />}
                    {viewMode === 'contacts' && <CarnetContacts />}
                    {viewMode === 'field' && <CarnetField />}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default Carnet;
