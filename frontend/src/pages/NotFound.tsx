import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const NotFound: React.FC = () => {
    return (
        <div className="min-h-screen bg-base-200 flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="text-center max-w-md"
            >
                <div className="text-9xl font-extrabold text-primary/20 select-none leading-none mb-2">
                    404
                </div>
                <h1 className="text-3xl font-extrabold text-base-content tracking-tight mb-3">
                    Page introuvable
                </h1>
                <p className="text-base-content/60 mb-8">
                    La page que vous cherchez n'existe pas ou a été déplacée.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        type="button"
                        onClick={() => window.history.back()}
                        className="btn btn-ghost gap-2"
                    >
                        <ArrowLeft size={18} /> Retour
                    </button>
                    <Link to="/" className="btn btn-primary rounded-full px-6 gap-2">
                        <Home size={18} /> Accueil
                    </Link>
                </div>
            </motion.div>
        </div>
    );
};

export default NotFound;
