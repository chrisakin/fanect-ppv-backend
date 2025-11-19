import { Request, Response, NextFunction } from 'express';

// Extend the Express `Request` interface used throughout the app
// to include optional `user`, `admin`, and `adminData` properties
// populated by authentication middleware.
declare global {
    namespace Express {
        interface Request {
            user?: any;
            admin?: any;
            adminData?: any;
        }
    }
}
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin';

/**
 * Middleware to verify an admin JWT token from the `Authorization` header.
 * - Expects header `Authorization: Bearer <token>`.
 * - Verifies JWT using `process.env.JWT_SECRET`, ensures payload contains an `id`,
 *   loads the corresponding `Admin` document and places it on `req.adminData`.
 * - On failure it returns an appropriate 4xx response; on success it calls `next()`.
 * @param req Express request object (may be augmented with `admin`/`adminData`).
 * @param res Express response object.
 * @param next Next function to pass control to the next middleware.
 */
const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(403).send('A token is required for authentication');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
        req['admin'] = decoded;

        let adminId: string | undefined;
        if (typeof decoded === 'object' && decoded !== null && 'id' in decoded) {
            adminId = (decoded as any).id;
        }

        if (!adminId) {
            return res.status(401).send('Invalid Token Payload');
        }
        const admin = await Admin.findById(adminId);
        if(!admin) {
            return res.status(401).send('Not Authorised');
        }
        req['adminData'] = admin;
    } catch (err) {
        return res.status(401).send('Invalid Token');
    }

    return next();
};

export default verifyToken;