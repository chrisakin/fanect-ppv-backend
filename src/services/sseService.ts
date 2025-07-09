// In your event routes/controller
import { Request, Response } from 'express';

const sseClients: { [eventId: string]: Response[] } = {};

export function eventStatusSSE(req: Request, res: Response) {
    const { eventId } = req.params;

    // Set headers for SSE
    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
    });
    res.flushHeaders();

    // Add client to the list
    if (!sseClients[eventId]) sseClients[eventId] = [];
    sseClients[eventId].push(res);

    // Remove client on close
    req.on('close', () => {
        sseClients[eventId] = sseClients[eventId].filter(r => r !== res);
    });
}

// Call this function when event status changes
export function broadcastEventStatus(eventId: string, data: {message: string, status: string}) {
    if (sseClients[eventId]) {
        sseClients[eventId].forEach(res => {
            res.write(`data: ${JSON.stringify({ eventId, data })}\n\n`);
        });
    }
}