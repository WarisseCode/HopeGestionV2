// frontend/src/data/mockProperties.ts
// Données mockées pour la vitrine publique des biens disponibles

import Apartment1 from '../assets/properties/apartment-1.png';
import Apartment2 from '../assets/properties/apartment-2.png';
import Villa1 from '../assets/properties/villa-1.png';

export interface PublicProperty {
  id: number;
  titre: string;
  type: 'Appartement' | 'Villa' | 'Studio' | 'Boutique' | 'Bureau' | 'Maison';
  ville: string;
  quartier: string;
  loyer: number;
  surface: number;
  pieces: number;
  chambres: number;
  sallesBain: number;
  image: string;
  disponible: boolean;
  dateDisponibilite?: string;
  description: string;
  amenities: string[];
  latitude: number;
  longitude: number;
}

// Images placeholders pour les propriétés supplémentaires
const placeholderImages = [
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80', // Apartment
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80', // Living room
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80', // Villa
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80', // Modern house
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80', // Apartment interior
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80', // Luxury home
  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80', // Pool villa
  'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&q=80', // House exterior
];

export const mockProperties: PublicProperty[] = [
  {
    id: 1,
    titre: "Appartement F3 Moderne - Haie Vive",
    type: "Appartement",
    ville: "Cotonou",
    quartier: "Haie Vive",
    loyer: 150000,
    surface: 85,
    pieces: 3,
    chambres: 2,
    sallesBain: 1,
    image: Apartment1,
    disponible: true,
    description: "Superbe appartement F3 entièrement rénové, lumineux avec vue dégagée. Proche de toutes commodités.",
    amenities: ["Climatisation", "Parking", "Sécurité 24h"],
    latitude: 6.3654,
    longitude: 2.4183
  },
  {
    id: 2,
    titre: "Villa de Standing avec Piscine",
    type: "Villa",
    ville: "Cotonou",
    quartier: "Cocotiers",
    loyer: 450000,
    surface: 250,
    pieces: 6,
    chambres: 4,
    sallesBain: 3,
    image: Villa1,
    disponible: true,
    description: "Magnifique villa avec piscine privée, jardin tropical et terrasse. Quartier résidentiel calme.",
    amenities: ["Piscine", "Jardin", "Gardien", "Groupe électrogène"],
    latitude: 6.3712,
    longitude: 2.4089
  },
  {
    id: 3,
    titre: "Appartement F2 Luxueux",
    type: "Appartement",
    ville: "Cotonou",
    quartier: "Fidjrossè",
    loyer: 120000,
    surface: 65,
    pieces: 2,
    chambres: 1,
    sallesBain: 1,
    image: Apartment2,
    disponible: true,
    description: "Appartement moderne avec finitions haut de gamme. Cuisine équipée et balcon.",
    amenities: ["Climatisation", "Cuisine équipée", "Balcon"],
    latitude: 6.3456,
    longitude: 2.3678
  },
  {
    id: 4,
    titre: "Studio Meublé Centre-Ville",
    type: "Studio",
    ville: "Cotonou",
    quartier: "Ganhi",
    loyer: 75000,
    surface: 35,
    pieces: 1,
    chambres: 0,
    sallesBain: 1,
    image: placeholderImages[4],
    disponible: true,
    description: "Studio entièrement meublé, idéal pour jeune professionnel. Eau et électricité incluses.",
    amenities: ["Meublé", "Eau incluse", "Électricité incluse"],
    latitude: 6.3607,
    longitude: 2.4232
  },
  {
    id: 5,
    titre: "Maison F4 avec Cour",
    type: "Maison",
    ville: "Porto-Novo",
    quartier: "Ouando",
    loyer: 180000,
    surface: 120,
    pieces: 4,
    chambres: 3,
    sallesBain: 2,
    image: placeholderImages[3],
    disponible: true,
    description: "Belle maison familiale avec grande cour, parfaite pour une famille. Quartier calme.",
    amenities: ["Cour", "Parking", "Cuisine séparée"],
    latitude: 6.4969,
    longitude: 2.6289
  },
  {
    id: 6,
    titre: "Boutique Commerciale",
    type: "Boutique",
    ville: "Cotonou",
    quartier: "Tokpa",
    loyer: 200000,
    surface: 50,
    pieces: 1,
    chambres: 0,
    sallesBain: 0,
    image: placeholderImages[0],
    disponible: true,
    description: "Espace commercial bien situé près du grand marché. Fort passage clientèle.",
    amenities: ["Vitrine", "Électricité triphasée", "Rideau métallique"],
    latitude: 6.3589,
    longitude: 2.4312
  },
  {
    id: 7,
    titre: "Appartement F3 Standing",
    type: "Appartement",
    ville: "Cotonou",
    quartier: "Cadjehoun",
    loyer: 175000,
    surface: 90,
    pieces: 3,
    chambres: 2,
    sallesBain: 2,
    image: placeholderImages[1],
    disponible: true,
    description: "Appartement de standing dans résidence sécurisée. Ascenseur et parking souterrain.",
    amenities: ["Ascenseur", "Parking souterrain", "Interphone"],
    latitude: 6.3701,
    longitude: 2.3956
  },
  {
    id: 8,
    titre: "Villa Duplex Moderne",
    type: "Villa",
    ville: "Cotonou",
    quartier: "Agla",
    loyer: 350000,
    surface: 200,
    pieces: 5,
    chambres: 3,
    sallesBain: 2,
    image: placeholderImages[2],
    disponible: true,
    description: "Duplex moderne avec terrasse sur le toit. Architecture contemporaine.",
    amenities: ["Terrasse", "Garage", "Jardin"],
    latitude: 6.3823,
    longitude: 2.3745
  },
  {
    id: 9,
    titre: "Bureau Professionnel",
    type: "Bureau",
    ville: "Cotonou",
    quartier: "Akpakpa",
    loyer: 250000,
    surface: 80,
    pieces: 3,
    chambres: 0,
    sallesBain: 1,
    image: placeholderImages[0],
    disponible: true,
    description: "Espace de bureau climatisé avec salle de réunion. Fibre optique disponible.",
    amenities: ["Climatisation centrale", "Fibre optique", "Salle de réunion"],
    latitude: 6.3734,
    longitude: 2.4456
  },
  {
    id: 10,
    titre: "Appartement F2 Économique",
    type: "Appartement",
    ville: "Abomey-Calavi",
    quartier: "Tankpè",
    loyer: 65000,
    surface: 50,
    pieces: 2,
    chambres: 1,
    sallesBain: 1,
    image: placeholderImages[4],
    disponible: true,
    description: "Appartement propre et bien entretenu. Idéal pour étudiants ou jeunes couples.",
    amenities: ["Eau courante", "Proche université"],
    latitude: 6.4312,
    longitude: 2.3456
  },
  {
    id: 11,
    titre: "Maison Coloniale Rénovée",
    type: "Maison",
    ville: "Porto-Novo",
    quartier: "Centre-Ville",
    loyer: 220000,
    surface: 150,
    pieces: 5,
    chambres: 3,
    sallesBain: 2,
    image: placeholderImages[7],
    disponible: true,
    description: "Charmante maison coloniale entièrement rénovée. Caractère authentique préservé.",
    amenities: ["Jardin", "Véranda", "Cave"],
    latitude: 6.4973,
    longitude: 2.6157
  },
  {
    id: 12,
    titre: "Studio Design Neuf",
    type: "Studio",
    ville: "Cotonou",
    quartier: "Zogbo",
    loyer: 85000,
    surface: 40,
    pieces: 1,
    chambres: 0,
    sallesBain: 1,
    image: placeholderImages[1],
    disponible: true,
    description: "Studio neuf design avec kitchenette moderne. Immeuble récent.",
    amenities: ["Neuf", "Kitchenette", "Digicode"],
    latitude: 6.3645,
    longitude: 2.3789
  },
  {
    id: 13,
    titre: "Villa Bord de Mer",
    type: "Villa",
    ville: "Cotonou",
    quartier: "Fidjrossè Plage",
    loyer: 600000,
    surface: 300,
    pieces: 7,
    chambres: 4,
    sallesBain: 4,
    image: placeholderImages[6],
    disponible: true,
    description: "Exceptionnelle villa en front de mer avec accès direct à la plage.",
    amenities: ["Vue mer", "Accès plage", "Piscine", "Personnel inclus"],
    latitude: 6.3378,
    longitude: 2.3534
  },
  {
    id: 14,
    titre: "Appartement F4 Familial",
    type: "Appartement",
    ville: "Cotonou",
    quartier: "Gbèdjromèdé",
    loyer: 200000,
    surface: 110,
    pieces: 4,
    chambres: 3,
    sallesBain: 2,
    image: placeholderImages[5],
    disponible: true,
    description: "Grand appartement familial avec balcon et vue sur la ville. Très lumineux.",
    amenities: ["Balcon", "Vue dégagée", "2 places parking"],
    latitude: 6.3567,
    longitude: 2.4123
  },
  {
    id: 15,
    titre: "Local Commercial Neuf",
    type: "Boutique",
    ville: "Abomey-Calavi",
    quartier: "Godomey",
    loyer: 150000,
    surface: 70,
    pieces: 2,
    chambres: 0,
    sallesBain: 1,
    image: placeholderImages[0],
    disponible: true,
    description: "Local commercial neuf avec mezzanine. Idéal superette ou showroom.",
    amenities: ["Mezzanine", "Parking clients", "Toilettes"],
    latitude: 6.3989,
    longitude: 2.3312
  },
  {
    id: 16,
    titre: "Appartement F3 Vue Lagune",
    type: "Appartement",
    ville: "Cotonou",
    quartier: "Akpakpa PK6",
    loyer: 185000,
    surface: 95,
    pieces: 3,
    chambres: 2,
    sallesBain: 2,
    image: placeholderImages[1],
    disponible: true,
    description: "Magnifique appartement avec vue imprenable sur la lagune. Balcon spacieux.",
    amenities: ["Vue lagune", "Balcon", "Parking", "Groupe électrogène"],
    latitude: 6.3812,
    longitude: 2.4589
  },
  {
    id: 17,
    titre: "Villa Contemporaine",
    type: "Villa",
    ville: "Cotonou",
    quartier: "Calavi",
    loyer: 400000,
    surface: 220,
    pieces: 5,
    chambres: 4,
    sallesBain: 3,
    image: placeholderImages[5],
    disponible: true,
    description: "Villa contemporaine de haut standing. Finitions luxueuses, jardin paysager.",
    amenities: ["Jardin paysager", "Double garage", "Piscine", "Cuisine américaine"],
    latitude: 6.4234,
    longitude: 2.3567
  },
  {
    id: 18,
    titre: "Studio Standing Meublé",
    type: "Studio",
    ville: "Cotonou",
    quartier: "Vedoko",
    loyer: 95000,
    surface: 42,
    pieces: 1,
    chambres: 0,
    sallesBain: 1,
    image: placeholderImages[4],
    disponible: true,
    description: "Studio moderne entièrement meublé avec coin cuisine équipée. Idéal expatrié.",
    amenities: ["Meublé complet", "Wifi inclus", "Climatisation", "Sécurité 24h"],
    latitude: 6.3478,
    longitude: 2.3945
  },
  {
    id: 19,
    titre: "Appartement Duplex Standing",
    type: "Appartement",
    ville: "Porto-Novo",
    quartier: "Djègan Daho",
    loyer: 280000,
    surface: 160,
    pieces: 5,
    chambres: 3,
    sallesBain: 3,
    image: placeholderImages[2],
    disponible: true,
    description: "Superbe duplex avec terrasse privative. Architecture moderne et lumineuse.",
    amenities: ["Duplex", "Terrasse", "2 Parkings", "Interphone vidéo"],
    latitude: 6.4856,
    longitude: 2.6234
  },
  {
    id: 20,
    titre: "Maison R+1 avec Dépendance",
    type: "Maison",
    ville: "Abomey-Calavi",
    quartier: "Togba",
    loyer: 195000,
    surface: 140,
    pieces: 5,
    chambres: 4,
    sallesBain: 2,
    image: placeholderImages[7],
    disponible: true,
    description: "Grande maison familiale R+1 avec dépendance pour personnel. Terrain clôturé.",
    amenities: ["Dépendance", "Cour clôturée", "Citerne eau", "Portail automatique"],
    latitude: 6.4567,
    longitude: 2.3123
  }
];

export const getPropertyTypes = (): string[] => {
  return [...new Set(mockProperties.map(p => p.type))];
};

export const getCities = (): string[] => {
  return [...new Set(mockProperties.map(p => p.ville))];
};

export const filterProperties = (
  type?: string,
  ville?: string,
  prixMin?: number,
  prixMax?: number
): PublicProperty[] => {
  return mockProperties.filter(p => {
    if (type && p.type !== type) return false;
    if (ville && p.ville !== ville) return false;
    if (prixMin && p.loyer < prixMin) return false;
    if (prixMax && p.loyer > prixMax) return false;
    return p.disponible;
  });
};
