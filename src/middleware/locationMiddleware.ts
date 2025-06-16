import { Request, Response, NextFunction } from 'express';

// Extend Express Request interface to include 'country'
declare module 'express-serve-static-core' {
    interface Request {
        country?: string;
    }
}

const getUsersCountry = (req: Request, res: Response, next: NextFunction) => {
    const country = req.headers['X-User-Country'];

    try {
        if (typeof country === 'string' || typeof country === 'undefined') {
            req.country = country;
        } else if (Array.isArray(country)) {
            req.country = country[0];
        }
    } catch (err) {
        return res.status(401).send('Invalid X-User-Country');
    }
    return next();
};

export default getUsersCountry;