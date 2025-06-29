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
import User from '../models/User';

const verifyToken = async(req: Request, res: Response, next: NextFunction) => {
    const token = req.headers['authorization']?.split(' ')[1];
    const sessionToken = req.headers["x-session-token"];

    if (!token) {
        return res.status(403).send('A token is required for authentication');
    }
     if (!sessionToken) {
    return res.status(405).json({ error: "No session token provided" });
  }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
        req['user'] = decoded;
        const user = await User.findOne({ sessionToken });

  if (!user) {
    return res.status(405).json({ error: "Invalid or expired session token" });
  }
    } catch (err) {
        console.log('token expired', err)
        return res.status(401).send('Invalid Token');
    }

    return next();
};

export default verifyToken;