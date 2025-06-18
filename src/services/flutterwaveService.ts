import axios from 'axios';
import { IEvent, IPrice } from '../models/Event';

const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;

export async function verifyFlutterwavePayment(reference: string): Promise<any> {
    try {
        const response = await axios.get(
            `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${reference}`,
            {
                headers: {
                    Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
                },
            }
        );

        const data = response.data;

        // Check if the payment was successful and the amount matches
        if (
            data.status === 'success' &&
            data.data &&
            data.data.status === 'successful'
        ) {
            const meta = data.data.meta;
            const eventId = meta?.eventId;
            const userId = meta?.userId;
            const amount = Number(data.data.amount)
            const friends = JSON.parse(meta?.friends)
            const currency = meta?.currency
            return { success: true, eventId, userId, amount, friends, currency };
        }

        return { success: false };
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Flutterwave verification error:', error.response?.data || error.message);
        } else if (error instanceof Error) {
            console.error('Flutterwave verification error:', error.message);
        } else {
            console.error('Flutterwave verification error:', error);
        }
        return { success: false };
    }
}

export function generateTxRef(prefix = "FANECT"): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
}

export async function flutterwaveInitialization(event: any, currency: string, user: any, friends: [], price: IPrice) {
    const response = await axios.post('https://api.flutterwave.com/v3/payments', {
        tx_ref: generateTxRef(),
        amount: friends.length > 1 ? price.amount * friends.length : price.amount,
        currency: currency,
        redirect_url: `${process.env.FRONTEND_URL}/flutterwave/payment-success`,
        customer: {
          email: user.email,
          name: user.name,
        },
        meta: {
            userId: user.id,
            eventId: event._id.toString(),
            friends: JSON.stringify(friends),
            currency: currency
        }
          }, {
        headers: { Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}` }
    });
    return response
}

export async function getAllBanks(country: string = 'NG') {
    try {
        const response = await axios.get(
            `https://api.flutterwave.com/v3/banks/${country}`,
            {
                headers: {
                    Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
                },
            }
        );
        return response.data; // Contains array of banks
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Flutterwave getAllBanks error:', error.response?.data || error.message);
        } else {
            console.error('Flutterwave getAllBanks error:', error);
        }
        throw new Error('Unable to fetch banks');
    }
}

export async function resolveBankAccount(account_number: string, bank_code: string) {
    try {
        const response = await axios.get(
            `https://api.flutterwave.com/v3/accounts/resolve`,
            {
                params: {
                    account_number,
                    account_bank: bank_code,
                },
                headers: {
                    Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
                },
            }
        );
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Flutterwave resolveBankAccount error:', error.response?.data || error.message);
        } else {
            console.error('Flutterwave resolveBankAccount error:', error);
        }
        throw new Error('Unable to resolve bank account');
    }
}