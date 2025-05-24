import axios from 'axios';

const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;

export async function verifyFlutterwavePayment(reference: string, amount: number): Promise<boolean> {
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
            data.data.status === 'successful' &&
            Number(data.data.amount) === Number(amount)
        ) {
            return true;
        }

        return false;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Flutterwave verification error:', error.response?.data || error.message);
        } else if (error instanceof Error) {
            console.error('Flutterwave verification error:', error.message);
        } else {
            console.error('Flutterwave verification error:', error);
        }
        return false;
    }
}