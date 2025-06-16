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
      NG: 'NGN',
      US: 'USD',
      Canada: 'CAD',
      Germany: 'EUR',
      UK: 'GBP',
    };