// src/components/ui/PhoneInput.tsx
import React, { useState } from 'react';
import { ChevronDown, Phone } from 'lucide-react';

interface Country {
  code: string;
  name: string;
  dialCode: string;
  nationalDigits: number; // expected national number length
}

const countries: Country[] = [
  { code: 'BJ', name: 'Bénin',        dialCode: '+229', nationalDigits: 10 }, // passage à 10 chiffres avril 2024
  { code: 'TG', name: 'Togo',         dialCode: '+228', nationalDigits: 8  },
  { code: 'CI', name: 'Côte d\'Ivoire', dialCode: '+225', nationalDigits: 10 },
  { code: 'SN', name: 'Sénégal',      dialCode: '+221', nationalDigits: 9  },
  { code: 'ML', name: 'Mali',         dialCode: '+223', nationalDigits: 8  },
  { code: 'BF', name: 'Burkina Faso', dialCode: '+226', nationalDigits: 8  },
  { code: 'NE', name: 'Niger',        dialCode: '+227', nationalDigits: 8  },
  { code: 'GN', name: 'Guinée',       dialCode: '+224', nationalDigits: 9  },
  { code: 'CM', name: 'Cameroun',     dialCode: '+237', nationalDigits: 9  },
  { code: 'GA', name: 'Gabon',        dialCode: '+241', nationalDigits: 8  },
  { code: 'CG', name: 'Congo',        dialCode: '+242', nationalDigits: 9  },
  { code: 'CD', name: 'RD Congo',     dialCode: '+243', nationalDigits: 9  },
  { code: 'MA', name: 'Maroc',        dialCode: '+212', nationalDigits: 9  },
  { code: 'DZ', name: 'Algérie',      dialCode: '+213', nationalDigits: 9  },
  { code: 'TN', name: 'Tunisie',      dialCode: '+216', nationalDigits: 8  },
  { code: 'FR', name: 'France',       dialCode: '+33',  nationalDigits: 9  },
  { code: 'BE', name: 'Belgique',     dialCode: '+32',  nationalDigits: 9  },
  { code: 'CH', name: 'Suisse',       dialCode: '+41',  nationalDigits: 9  },
  { code: 'CA', name: 'Canada',       dialCode: '+1',   nationalDigits: 10 },
  { code: 'US', name: 'États-Unis',   dialCode: '+1',   nationalDigits: 10 },
];

// Génère un placeholder groupé par 2 : 8 → "00 00 00 00", 10 → "00 00 00 00 00"
const buildPlaceholder = (digits: number): string => {
  const groups: string[] = [];
  let rem = digits;
  while (rem > 0) {
    groups.push('0'.repeat(Math.min(2, rem)));
    rem -= 2;
  }
  return groups.join(' ');
};

// Helper function to get flag image URL
const getFlagUrl = (countryCode: string) => 
  `https://flagcdn.com/24x18/${countryCode.toLowerCase()}.png`;

interface PhoneInputProps {
  label?: string;
  name?: string;
  value: string;
  onChange: (fullNumber: string, nationalNumber: string, countryCode: string) => void;
  error?: string;
  required?: boolean;
  defaultCountry?: string;
}

const PhoneInput: React.FC<PhoneInputProps> = ({
  label,
  name,
  value,
  onChange,
  error,
  required,
  defaultCountry = 'BJ'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    countries.find(c => c.code === defaultCountry) || countries[0]
  );
  
  // Extract only the national number (without country code)
  const nationalNumber = value.startsWith(selectedCountry.dialCode) 
    ? value.slice(selectedCountry.dialCode.length).trim()
    : value.replace(/^\+\d+\s*/, '');

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setIsOpen(false);
    // Update the full number with new country code
    const fullNumber = `${country.dialCode} ${nationalNumber}`;
    onChange(fullNumber, nationalNumber, country.dialCode);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value.replace(/[^\d\s]/g, ''); // Only allow digits and spaces
    const fullNumber = `${selectedCountry.dialCode} ${inputValue}`;
    onChange(fullNumber, inputValue, selectedCountry.dialCode);
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-base-content mb-1">
          {label} {required && <span className="text-error">*</span>}
        </label>
      )}
      <div className={`relative flex rounded-lg border ${error ? 'border-error' : 'border-base-300'} focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/50 transition-colors bg-base-100`}>
        {/* Country Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-3 py-2.5 border-r border-base-300 hover:bg-base-200 transition-colors rounded-l-lg min-w-[110px]"
          >
            <img 
              src={getFlagUrl(selectedCountry.code)} 
              alt={selectedCountry.name}
              className="w-6 h-4 object-cover rounded-sm shadow-sm"
            />
            <span className="text-sm font-medium text-base-content">{selectedCountry.dialCode}</span>
            <ChevronDown size={14} className={`text-base-content/60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {/* Dropdown */}
          {isOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
              <div className="absolute top-full left-0 mt-1 w-64 max-h-60 overflow-y-auto bg-base-100 border border-base-300 rounded-lg shadow-xl z-50">
                {countries.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleCountrySelect(country)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-base-200 transition-colors text-left ${
                      selectedCountry.code === country.code ? 'bg-primary/10 text-primary' : 'text-base-content'
                    }`}
                  >
                    <img 
                      src={getFlagUrl(country.code)} 
                      alt={country.name}
                      className="w-6 h-4 object-cover rounded-sm shadow-sm"
                    />
                    <span className="text-sm font-medium flex-1">{country.name}</span>
                    <span className="text-sm text-base-content/60">{country.dialCode}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        
        {/* Phone Input */}
        <div className="flex-1 flex items-center">
          <Phone size={16} className="ml-3 text-base-content/50" />
          <input
            type="tel"
            name={name}
            value={nationalNumber}
            onChange={handlePhoneChange}
            placeholder={buildPlaceholder(selectedCountry.nationalDigits)}
            className="w-full py-2.5 px-3 bg-transparent border-0 focus:ring-0 focus:outline-none text-base-content placeholder-base-content/50"
            required={required}
          />
        </div>
      </div>
      {error && (
        <p className="mt-1 text-sm text-error">{error}</p>
      )}
    </div>
  );
};

export default PhoneInput;
