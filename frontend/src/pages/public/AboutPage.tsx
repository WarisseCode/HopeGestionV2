import React from 'react';
import { Users, Target, Shield, Award } from 'lucide-react';
import PublicLayout from '../../layout/PublicLayout';
import ThomasImage from '../../assets/images/thomas_ceo.png';
import SarahImage from '../../assets/images/sarah_pm.png';
import WarisseImage from '../../assets/images/warisse_dev.png';

const AboutPage: React.FC = () => {
  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="py-20 px-4 md:px-8 bg-base-200 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-6">Notre Mission</h1>
        <p className="text-xl max-w-2xl mx-auto opacity-70">
          Révolutionner la gestion immobilière en Afrique grâce à la technologie, 
          en apportant transparence, sécurité et simplicité.
        </p>
      </section>

      {/* Values Section */}
      <section className="py-16 px-4 md:px-8 bg-base-100">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="text-primary" size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">Simplicité</h3>
              <p className="opacity-70">
                Nous concevons des outils intuitifs que tout le monde peut utiliser, 
                sans formation complexe.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="bg-secondary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="text-secondary" size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">Confiance</h3>
              <p className="opacity-70">
                La sécurité de vos données et de vos transactions est notre priorité absolue.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="bg-accent/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="text-accent" size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">Innovation</h3>
              <p className="opacity-70">
                Nous anticipons les besoins du marché pour offrir des solutions d'avant-garde.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 px-4 md:px-8 bg-base-200">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-12">L'équipe derrière Hope Gestion</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <TeamMember 
              name="Thomas DEGBO"
              role="Fondateur & CEO"
              image={ThomasImage}
            />
            <TeamMember 
              name="Sarah K."
              role="Responsable Produit"
              image={SarahImage} 
            />
            <TeamMember 
              name="Warisse OTCHADE"
              role="Lead Developpeur"
              image={WarisseImage}
            />
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

const TeamMember = ({ name, role, image }: { name: string, role: string, image: string }) => (
  <div className="bg-base-100 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow">
    <div className="h-64 bg-neutral-200 flex items-center justify-center relative">
        {image ? (
             <img src={image} alt={name} className="w-full h-full object-cover object-top" />
        ) : (
             <Users size={48} className="opacity-20" /> 
        )}
    </div>
    <div className="p-6">
      <h3 className="text-xl font-bold">{name}</h3>
      <p className="text-primary font-medium">{role}</p>
    </div>
  </div>
);

export default AboutPage;
