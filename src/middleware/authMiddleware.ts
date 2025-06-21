import { Request, Response, NextFunction } from 'express';

// Extend the Request interface to include the 'user' property
declare global {
    namespace Express {
        interface Request {
            user?: any;
            admin?: any;
        }
    }
}
import jwt from 'jsonwebtoken';

const verifyToken = (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(403).send('A token is required for authentication');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
        req['user'] = decoded;
    } catch (err) {
        console.log('token expired', err)
        return res.status(401).send('Invalid Token');
    }

    return next();
};

export default verifyToken;