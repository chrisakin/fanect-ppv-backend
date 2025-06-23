import Stripe from 'stripe';
import { IPrice } from '../models/Event';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2025-04-30.basil',
});

export async function verifyStripePayment(reference: string): Promise<any> {
    try {
        const session = await stripe.checkout.sessions.retrieve(reference);
        const paymentIntentId = session.payment_intent as string;
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (
            paymentIntent &&
            paymentIntent.status === 'succeeded' 
        ) {
            const meta = session.metadata;
            const eventId = meta?.eventId;
            const userId = meta?.userId;
            const amount = paymentIntent.amount_received / 100
            const friends = meta?.friends && JSON.parse(meta?.friends)
            const currency = meta?.currency
            return { success: true, eventId, userId, amount, friends, currency};
        }

        return { success: false };
    } catch (error) {
        if (error instanceof Error) {
            console.error('Stripe verification error:', error.message);
        } else {
            console.error('Stripe verification error:', error);
        }
        return { success: false };
    }
}

export async function createStripeCheckoutSession(currency: string, event: any, user: any, friends: any, price: IPrice) {
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
            mode: 'payment',
                line_items: [
                    {
                        price_data: {
                            currency: currency.toLowerCase(),
                            product_data: {
                                name: event.name,
                                description: event.description,
                            },
                            unit_amount: Math.round(Number(friends && friends.length > 1 ? price.amount * friends.length : price.amount) * 100), // price in cents
                        },
                        quantity: 1,
                    },
                ],
                metadata: {
                    eventId: event._id.toString(),
                    userId: user.id,
                    friends: friends && JSON.stringify(friends),
                    currency: currency
                },
                success_url: `${process.env.FRONTEND_URL}/stripe/payment-success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.FRONTEND_URL}/stripe/payment-success`,
                customer_email: user.email, // optional, if you have the user's email
            });
        return session
}