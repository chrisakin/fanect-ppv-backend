export interface User {
    id: string;
    username: string;
    email: string;
    password: string;
}

export interface AuthRequest {
    username: string;
    password: string;
}

export interface AuthResponse {
    token: string;
    user: User;
}

export const countryToCurrency: Record<string, string> = {
  // Nigerian Naira
  NG: 'NGN',

  // US Dollar
  US: 'USD',
  GU: 'USD', // Guam
  AS: 'USD', // American Samoa
  MP: 'USD', // Northern Mariana Islands
  UM: 'USD', // U.S. Minor Outlying Islands
  VI: 'USD', // U.S. Virgin Islands
  PR: 'USD', // Puerto Rico
  FM: 'USD', // Micronesia
  PW: 'USD', // Palau
  MH: 'USD', // Marshall Islands
  EC: 'USD', // Ecuador
  EL: 'USD', // El Salvador
  TL: 'USD', // Timor-Leste
  ZW: 'USD', // Zimbabwe (multi-currency)

  // Canadian Dollar
  CA: 'CAD',

  // Euro
  DE: 'EUR', // Germany
  FR: 'EUR', // France
  IT: 'EUR', // Italy
  ES: 'EUR', // Spain
  NL: 'EUR', // Netherlands
  PT: 'EUR', // Portugal
  IE: 'EUR', // Ireland
  BE: 'EUR', // Belgium
  AT: 'EUR', // Austria
  FI: 'EUR', // Finland
  GR: 'EUR', // Greece
  CY: 'EUR', // Cyprus
  EE: 'EUR', // Estonia
  LV: 'EUR', // Latvia
  LT: 'EUR', // Lithuania
  LU: 'EUR', // Luxembourg
  MT: 'EUR', // Malta
  SI: 'EUR', // Slovenia
  SK: 'EUR', // Slovakia
  ME: 'EUR', // Montenegro
  XK: 'EUR', // Kosovo
  AD: 'EUR', // Andorra
  MC: 'EUR', // Monaco
  SM: 'EUR', // San Marino
  VA: 'EUR', // Vatican City

  // British Pound
  GB: 'GBP', // United Kingdom
  GG: 'GBP', // Guernsey
  IM: 'GBP', // Isle of Man
  JE: 'GBP', // Jersey

  // Ghanaian Cedi
  GH: 'GHS'
};
