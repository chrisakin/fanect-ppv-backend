import { Request, Response, NextFunction } from 'express';

// Extend the Request interface to include the 'user' and 'admin' properties
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