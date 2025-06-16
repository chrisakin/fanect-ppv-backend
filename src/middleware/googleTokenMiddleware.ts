import axios from 'axios';
import { Request, Response, NextFunction } from 'express';

export const exchangeAuthCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { code, platform } = req.body; // Extract the authorization code from the request body
        if (!code) {
            return res.status(400).json({ message: 'Authorization code is required' });
        }

        const getGoogleClientId = (platform: string) => {
    if (platform === 'android') return process.env.ANDROID_GOOGLE_LOGIN_CLIENT_ID;
    if (platform === 'ios') return process.env.IOS_GOOGLE_LOGIN_CLIENT_ID;
    return process.env.GOOGLE_LOGIN_CLIENT_ID; // web
        };

        const payload: any = {
        code,
        client_id: getGoogleClientId(platform),
        redirect_uri: 'postmessage',
        grant_type: 'authorization_code',
        };
       if (platform !== 'android' && platform !== 'ios') {
            payload.client_secret = process.env.GOOGLE_LOGIN_CLIENT_SECRET;
        }
        // Exchange the authorization code for tokens
        const { data } = await axios.post('https://oauth2.googleapis.com/token', payload);

        // Attach the tokens to the request object for further processing
        req.body.googleauth = data; // Contains access_token, id_token, etc.
        next(); // Pass control to the next middleware or route handler
    } catch (error: any) {
        console.error('Error exchanging authorization code:', error);
        res.status(500).json({ message: 'Failed to exchange authorization code', error: error.message });
    }
};