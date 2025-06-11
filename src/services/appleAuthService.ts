import appleSigninAuth from 'apple-signin-auth';

export async function verifyAppleIdToken(idToken: string) {
    try {
        const appleUser = await appleSigninAuth.verifyIdToken(idToken, {
            audience: process.env.APPLE_SERVICE_ID, // e.g. com.your.bundle.id
            ignoreExpiration: false,
        });
        return appleUser; // Contains sub (user id), email, etc.
    } catch (error) {
        throw new Error('Invalid Apple ID token');
    }
}