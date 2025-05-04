import axios from 'axios';
import { Request, Response, NextFunction } from 'express';

export const exchangeAuthCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { code } = req.body; // Extract the authorization code from the request body
        if (!code) {
            return res.status(400).json({ message: 'Authorization code is required' });
        }

        // Exchange the authorization code for tokens
        const { data } = await axios.post('https://oauth2.googleapis.com/token', {
            code,
            client_id: process.env.GOOGLE_LOGIN_CLIENT_ID,
            client_secret: process.env.GOOGLE_LOGIN_CLIENT_SECRET,
            redirect_uri: 'postmessage',
            grant_type: 'authorization_code',
        });

        // Attach the tokens to the request object for further processing
        req.body.googleauth = data; // Contains access_token, id_token, etc.
        next(); // Pass control to the next middleware or route handler
    } catch (error: any) {
        console.error('Error exchanging authorization code:', error);
        res.status(500).json({ message: 'Failed to exchange authorization code', error: error.message });
    }
};