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

// export const countryToCurrency: Record<string, string> = {
//   // Nigerian Naira
//   NG: 'NGN',

//   // US Dollar
//   US: 'USD',
//   GU: 'USD', // Guam
//   AS: 'USD', // American Samoa
//   MP: 'USD', // Northern Mariana Islands
//   UM: 'USD', // U.S. Minor Outlying Islands
//   VI: 'USD', // U.S. Virgin Islands
//   PR: 'USD', // Puerto Rico
//   FM: 'USD', // Micronesia
//   PW: 'USD', // Palau
//   MH: 'USD', // Marshall Islands
//   EC: 'USD', // Ecuador
//   EL: 'USD', // El Salvador
//   TL: 'USD', // Timor-Leste
//   ZW: 'USD', // Zimbabwe (multi-currency)

//   // Canadian Dollar
//   CA: 'CAD',

//   // Euro
//   DE: 'EUR', // Germany
//   FR: 'EUR', // France
//   IT: 'EUR', // Italy
//   ES: 'EUR', // Spain
//   NL: 'EUR', // Netherlands
//   PT: 'EUR', // Portugal
//   IE: 'EUR', // Ireland
//   BE: 'EUR', // Belgium
//   AT: 'EUR', // Austria
//   FI: 'EUR', // Finland
//   GR: 'EUR', // Greece
//   CY: 'EUR', // Cyprus
//   EE: 'EUR', // Estonia
//   LV: 'EUR', // Latvia
//   LT: 'EUR', // Lithuania
//   LU: 'EUR', // Luxembourg
//   MT: 'EUR', // Malta
//   SI: 'EUR', // Slovenia
//   SK: 'EUR', // Slovakia
//   ME: 'EUR', // Montenegro
//   XK: 'EUR', // Kosovo
//   AD: 'EUR', // Andorra
//   MC: 'EUR', // Monaco
//   SM: 'EUR', // San Marino
//   VA: 'EUR', // Vatican City

//   // British Pound
//   GB: 'GBP', // United Kingdom
//   GG: 'GBP', // Guernsey
//   IM: 'GBP', // Isle of Man
//   JE: 'GBP', // Jersey

//   // Ghanaian Cedi
//   GH: 'GHS'
// };


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
  SV: 'USD', // El Salvador
  TL: 'USD', // Timor-Leste
  ZW: 'USD', // Zimbabwe (multi-currency)
  PA: 'USD', // Panama

  // Canadian Dollar
  CA: 'CAD',

  // Euro
  DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', PT: 'EUR',
  IE: 'EUR', BE: 'EUR', AT: 'EUR', FI: 'EUR', GR: 'EUR', CY: 'EUR',
  EE: 'EUR', LV: 'EUR', LT: 'EUR', LU: 'EUR', MT: 'EUR', SI: 'EUR',
  SK: 'EUR', ME: 'EUR', XK: 'EUR', AD: 'EUR', MC: 'EUR', SM: 'EUR',
  VA: 'EUR', EU: 'EUR',

  // British Pound
  GB: 'GBP', GG: 'GBP', IM: 'GBP', JE: 'GBP', UK: 'GBP',

  // Australian Dollar
  AU: 'AUD', CX: 'AUD', CC: 'AUD', NF: 'AUD',

  // Japanese Yen
  JP: 'JPY',

  // Chinese Yuan
  CN: 'CNY',

  // Indian Rupee
  IN: 'INR',

  // Brazilian Real
  BR: 'BRL',

  // Mexican Peso
  MX: 'MXN',

  // Russian Ruble
  RU: 'RUB',

  // South Korean Won
  KR: 'KRW',

  // Turkish Lira
  TR: 'TRY',

  // Argentine Peso
  AR: 'ARS',

  // Chilean Peso
  CL: 'CLP',

  // Colombian Peso
  CO: 'COP',

  // Peruvian Sol
  PE: 'PEN',

  // Philippine Peso
  PH: 'PHP',

  // Malaysian Ringgit
  MY: 'MYR',

  // Singapore Dollar
  SG: 'SGD',

  // Indonesian Rupiah
  ID: 'IDR',

  // Thai Baht
  TH: 'THB',

  // Vietnamese Dong
  VN: 'VND',

  // UAE Dirham
  AE: 'AED',

  // Saudi Riyal
  SA: 'SAR',

  // Qatari Riyal
  QA: 'QAR',

  // Kuwaiti Dinar
  KW: 'KWD',

  // Omani Rial
  OM: 'OMR',

  // Bahraini Dinar
  BH: 'BHD',

  // Jordanian Dinar
  JO: 'JOD',

  // Lebanese Pound
  LB: 'LBP',

  // Israeli New Shekel
  IL: 'ILS',

  // Pakistani Rupee
  PK: 'PKR',

  // Bangladeshi Taka
  BD: 'BDT',

  // Sri Lankan Rupee
  LK: 'LKR',

  // Mauritian Rupee
  MU: 'MUR',

  // Tunisian Dinar
  TN: 'TND',

  // Algerian Dinar
  DZ: 'DZD',

  // South African Rand
  ZA: 'ZAR',

  // Ghanaian Cedi
  GH: 'GHS',

  // Kenyan Shilling
  KE: 'KES',

  // Ugandan Shilling
  UG: 'UGX',

  // Tanzanian Shilling
  TZ: 'TZS',

  // Rwandan Franc
  RW: 'RWF',

  // Zambian Kwacha
  ZM: 'ZMW',

  // West African CFA Franc
  BJ: 'XOF', BF: 'XOF', CI: 'XOF', CIV: 'XOF', IVO: 'XOF', GW: 'XOF', ML: 'XOF', NE: 'XOF', SN: 'XOF', TG: 'XOF',

  // Central African CFA Franc
  CM: 'XAF', CF: 'XAF', TD: 'XAF', CG: 'XAF', GQ: 'XAF', GA: 'XAF',

  // Egyptian Pound
  EG: 'EGP',

  // Moroccan Dirham
  MA: 'MAD',

  // Ethiopian Birr
  ET: 'ETB',

  // Malawian Kwacha
  MW: 'MWK',

  // Sierra Leonean Leone
  SL: 'SLL',

  // Liberian Dollar
  LR: 'LRD',

  // Cape Verdean Escudo
  CV: 'CVE',

  // Gambian Dalasi
  GM: 'GMD',

  // Guinean Franc
  GN: 'GNF',

  // Mauritanian Ouguiya
  MR: 'MRU',

  // São Tomé and Príncipe Dobra
  ST: 'STN',
};
