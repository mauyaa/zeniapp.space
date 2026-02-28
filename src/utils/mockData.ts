export interface Property {
  id: string;
  title: string;
  category?: string;
  description?: string;
  price: number;
  currency: string;
  purpose: 'rent' | 'buy';
  type: 'House' | 'Apartment' | 'Land' | 'Commercial';
  agentId?: string;
  location: {
    neighborhood: string;
    city: string;
    lat: number;
    lng: number;
  };
  features: {
    bedrooms: number;
    bathrooms: number;
    sqm: number;
  };
  floorPlans?: Array<{
    label: string;
    url: string;
    size?: string;
  }>;
  amenities?: string[];
  catalogueUrl?: string;
  isVerified: boolean;
  imageUrl: string;
  agent: {
    name: string;
    image: string;
  };
}

export const properties: Property[] = [
{
  id: '1',
  title: 'Modern 3-Bedroom Apartment with City View',
  price: 25000000,
  currency: 'KES',
  purpose: 'buy',
  type: 'Apartment',
  location: {
    neighborhood: 'Westlands',
    city: 'Kenya',
    lat: -1.2683,
    lng: 36.8111
  },
  features: {
    bedrooms: 3,
    bathrooms: 3,
    sqm: 180
  },
  floorPlans: [
    {
      label: 'Type A - 3BR Layout',
      url: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80',
      size: '1.2 MB'
    }
  ],
  catalogueUrl: 'https://example.com/catalogues/riverside-suites.pdf',
  isVerified: true,
  imageUrl:
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=1000',
  agent: {
    name: 'Sarah Kamau',
    image:
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200'
  }
},
{
  id: '2',
  title: 'Luxury Villa in Gated Community',
  price: 85000000,
  currency: 'KES',
  purpose: 'buy',
  type: 'House',
  location: {
    neighborhood: 'Karen',
    city: 'Kenya',
    lat: -1.3192,
    lng: 36.7065
  },
  features: {
    bedrooms: 5,
    bathrooms: 6,
    sqm: 450
  },
  floorPlans: [
    {
      label: 'Ground & First Floor',
      url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
      size: '1.8 MB'
    },
    {
      label: 'Site Plan',
      url: 'https://images.unsplash.com/photo-1479839672679-a46483c0e7c8?auto=format&fit=crop&w=1200&q=80',
      size: '950 KB'
    }
  ],
  catalogueUrl: 'https://example.com/catalogues/karen-villa.pdf',
  isVerified: true,
  imageUrl:
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&q=80&w=1000',
  agent: {
    name: 'David Ochieng',
    image:
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200'
  }
},
{
  id: '3',
  title: 'Cozy 2-Bedroom Apartment near Yaya',
  price: 85000,
  currency: 'KES/mo',
  purpose: 'rent',
  type: 'Apartment',
  location: {
    neighborhood: 'Kilimani',
    city: 'Kenya',
    lat: -1.2921,
    lng: 36.7889
  },
  features: {
    bedrooms: 2,
    bathrooms: 2,
    sqm: 120
  },
  floorPlans: [
    {
      label: 'Typical 2BR Plan',
      url: 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80'
    }
  ],
  isVerified: true,
  imageUrl:
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=1000',
  agent: {
    name: 'Grace Wanjiku',
    image:
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200'
  }
},
{
  id: '4',
  title: 'Prime Commercial Space',
  price: 150000,
  currency: 'KES/mo',
  purpose: 'rent',
  type: 'Commercial',
  location: {
    neighborhood: 'Upper Hill',
    city: 'Kenya',
    lat: -1.2985,
    lng: 36.8167
  },
  features: {
    bedrooms: 0,
    bathrooms: 2,
    sqm: 200
  },
  isVerified: false,
  imageUrl:
  'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1000',
  agent: {
    name: 'James Mwangi',
    image:
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200'
  }
},
{
  id: '5',
  title: 'Spacious Family Home with Garden',
  price: 45000000,
  currency: 'KES',
  purpose: 'buy',
  type: 'House',
  location: {
    neighborhood: 'Lavington',
    city: 'Kenya',
    lat: -1.2756,
    lng: 36.7654
  },
  features: {
    bedrooms: 4,
    bathrooms: 4,
    sqm: 320
  },
  isVerified: true,
  imageUrl:
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=1000',
  agent: {
    name: 'Faith Mutua',
    image:
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'
  }
},
{
  id: '6',
  title: 'Half Acre Prime Land',
  price: 65000000,
  currency: 'KES',
  purpose: 'buy',
  type: 'Land',
  location: {
    neighborhood: 'Runda',
    city: 'Kenya',
    lat: -1.2185,
    lng: 36.8045
  },
  features: {
    bedrooms: 0,
    bathrooms: 0,
    sqm: 2023
  },
  isVerified: true,
  imageUrl:
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=1000',
  agent: {
    name: 'Peter Kimani',
    image:
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200'
  }
},
{
  id: '7',
  title: 'Serviced Apartment for Short Stay',
  price: 12000,
  currency: 'KES/night',
  purpose: 'rent',
  type: 'Apartment',
  location: {
    neighborhood: 'Parklands',
    city: 'Kenya',
    lat: -1.2635,
    lng: 36.8241
  },
  features: {
    bedrooms: 1,
    bathrooms: 1,
    sqm: 65
  },
  isVerified: true,
  imageUrl:
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=1000',
  agent: {
    name: 'Alice Njoroge',
    image:
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200'
  }
},
{
  id: '8',
  title: 'Modern Townhouse in Gated Estate',
  price: 120000,
  currency: 'KES/mo',
  purpose: 'rent',
  type: 'House',
  location: {
    neighborhood: 'Langata',
    city: 'Kenya',
    lat: -1.3411,
    lng: 36.7824
  },
  features: {
    bedrooms: 3,
    bathrooms: 3,
    sqm: 150
  },
  isVerified: false,
  imageUrl:
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=1000',
  agent: {
    name: 'John Kariuki',
    image:
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200'
  }
}];
