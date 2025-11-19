import { Request, Response, NextFunction } from 'express';

// Extend Express Request interface to include optional `country` set by this middleware
declare module 'express-serve-static-core' {
    interface Request {
        country?: string;
    }
}

/**
 * Middleware that reads the `x-user-country` header and attaches a normalized
 * `country` string to `req.country`.
 *
 * Behavior:
 * - If the header is a string, it is assigned directly.
 * - If the header is an array, the first element is used.
 * - If the header is missing it leaves `req.country` undefined.
 * - On unexpected types it responds with 401 and message 'Invalid X-User-Country'.
 *
 * This middleware does not perform country format validation — it only normalizes
 * the header into a single string for downstream handlers.
 *
 * @param req Express request; after this middleware `req.country` may be set.
 * @param res Express response used to return 401 on invalid header types.
 * @param next Next function to continue request processing.
 */
const getUsersCountry = (req: Request, res: Response, next: NextFunction) => {
    const country = req.headers['x-user-country'];
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