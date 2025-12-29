import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const PublicNavbar: React.FC = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const location = useLocation();

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { name: 'Fonctionnalités', path: '/fonctionnalites' },
        { name: 'Qui sommes-nous', path: '/a-propos' },
        { name: 'Tarifs', path: '/#tarifs' },
        { name: 'FAQ', path: '/#faq' },
        { name: 'Contact', path: '/#contact' },
    ];

    return (
        <motion.div 
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className={`navbar fixed top-0 z-50 transition-all duration-300 px-4 md:px-8 
                ${scrolled ? 'bg-base-100/90 backdrop-blur-md shadow-sm' : 'bg-transparent'}`}
        >
            <div className="navbar-start">
                <div className="dropdown">
                    <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden" onClick={toggleMenu}>
                        {isMenuOpen ? <X /> : <Menu />}
                    </div>
                </div>
                <Link to="/" className="hover:opacity-80 transition-opacity flex items-center gap-2">
                    <img src="/logo.png" alt="Hope Gestion" className="h-10 md:h-12 w-auto" />
                    <span className="font-bold text-xl hidden sm:inline">Hope Gestion</span>
                </Link>
            </div>

            <div className="navbar-center hidden lg:flex">
                <ul className="menu menu-horizontal px-1 font-medium">
                    {navLinks.map((link) => (
                        <li key={link.name}>
                            {link.path.startsWith('/#') && location.pathname === '/' ? (
                                <a href={link.path.substring(1)}>{link.name}</a>
                            ) : (
                                <Link to={link.path}>{link.name}</Link>
                            )}
                        </li>
                    ))}
                </ul>
            </div>

            <div className="navbar-end gap-2">
                <Link to="/login" className="btn btn-ghost btn-sm md:btn-md hidden sm:inline-flex">
                    Connexion
                </Link>
                <Link to="/signup" className="btn btn-primary btn-sm md:btn-md rounded-full px-6">
                    Commencer
                </Link>
            </div>

            {/* Mobile Menu Overlay */}
            {isMenuOpen && (
                <div className="absolute top-full left-0 w-full bg-base-100 shadow-lg p-4 flex flex-col gap-2 lg:hidden">
                    {navLinks.map((link) => (
                        <Link 
                            key={link.name} 
                            to={link.path} 
                            className="btn btn-ghost justify-start"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            {link.name}
                        </Link>
                    ))}
                    <div className="divider my-1"></div>
                    <Link to="/login" className="btn btn-ghost w-full" onClick={() => setIsMenuOpen(false)}>
                        Connexion
                    </Link>
                    <Link to="/signup" className="btn btn-primary w-full" onClick={() => setIsMenuOpen(false)}>
                        Inscription
                    </Link>
                </div>
            )}
        </motion.div>
    );
};

export default PublicNavbar;
