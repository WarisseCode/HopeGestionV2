import React from 'react';
import CompteProprietaires from '../components/CompteProprietaires';

const Proprietaires: React.FC = () => {
  return (
    <div className="p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto">
      <CompteProprietaires 
        showStats={true} 
        title="Liste des Propriétaires" 
        subtitle="Suivez et gérez l'ensemble des propriétaires de votre parc immobilier" 
      />
    </div>
  );
};

export default Proprietaires;
