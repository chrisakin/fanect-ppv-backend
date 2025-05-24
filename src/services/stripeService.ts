import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2025-04-30.basil',
});

export async function verifyStripePayment(reference: string, amount: number): Promise<boolean> {
    try {
        // The reference is assumed to be the Stripe PaymentIntent ID
        const paymentIntent = await stripe.paymentIntents.retrieve(reference);

        // Stripe amounts are in the smallest currency unit (e.g., cents)
        const expectedAmount = Math.round(Number(amount) * 100);

        if (
            paymentIntent &&
            paymentIntent.status === 'succeeded' &&
            paymentIntent.amount_received === expectedAmount
        ) {
            return true;
        }

        return false;
    } catch (error) {
        if (error instanceof Error) {
            console.error('Stripe verification error:', error.message);
        } else {
            console.error('Stripe verification error:', error);
        }
        return false;
    }
}