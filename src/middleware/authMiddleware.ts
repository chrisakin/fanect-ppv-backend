import { Request, Response, NextFunction } from 'express';

// Extend the Express `Request` interface to include optional `user` and `admin` properties
// that are populated by authentication middleware.
declare global {
    namespace Express {
        interface Request {
            user?: any;
            admin?: any;
        }
    }
}
import jwt from 'jsonwebtoken';
import User from '../models/User';

/**
 * Middleware to verify a user's JWT from the `Authorization` header.
 * - Expects header `Authorization: Bearer <token>`.
 * - Verifies the JWT using `process.env.JWT_SECRET` and attaches the decoded payload to `req.user`.
 * - (Optional session-token checks are present but commented out.)
 * - On verification failure responds with 401/403; otherwise calls `next()`.
 * @param req Express request (augmented with `user` on success).
 * @param res Express response.
 * @param next Next function to pass control.
 */
const verifyToken = async(req: Request, res: Response, next: NextFunction) => {
    const token = req.headers['authorization']?.split(' ')[1];
    const sessionToken = req.headers["x-session-token"];

    if (!token) {
        return res.status(403).send('A token is required for authentication');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
        req['user'] = decoded;
        // Optional: session token validation can be implemented here if needed.
    } catch (err) {
        console.log('token expired', err)
        return res.status(401).send('Invalid Token');
    }

    return next();
};

export default verifyToken;