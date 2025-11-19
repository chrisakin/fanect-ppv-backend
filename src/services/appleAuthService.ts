import appleSigninAuth from 'apple-signin-auth';

/**
 * Verify an Apple ID token (JWT) issued by Sign in with Apple.
 * - Uses the `apple-signin-auth` library and validates the token audience against
 *   `process.env.APPLE_SERVICE_ID`.
 * - On success returns the decoded Apple user payload (e.g., `sub`, `email`).
 * - On failure throws an Error indicating an invalid token.
 *
 * @param idToken The Apple ID JWT (id_token) to verify.
 * @returns Decoded payload from Apple on successful verification.
 */
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