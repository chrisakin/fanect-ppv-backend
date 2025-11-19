// In your event routes/controller
import { Request, Response } from 'express';

const sseClients: { [eventId: string]: Response[] } = {};

/**
 * Handles a new SSE (Server-Sent Events) connection for a specific event.
 * Adds the client to the list for the event and sets up headers for SSE.
 * @param {Request} req - Express request object (expects req.params.eventId).
 * @param {Response} res - Express response object.
 */
export function eventStatusSSE(req: Request, res: Response) {
    const { eventId } = req.params;

    // Set headers for SSE
    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
    });
    res.flushHeaders();
      res.write(`data: ${JSON.stringify({
    message: 'connected',
    status: 'ACTIVE'
  })}\n\n`);
    // Add client to the list
    if (!sseClients[eventId]) sseClients[eventId] = [];
    sseClients[eventId].push(res);

    // Remove client on close
    req.on('close', () => {
        sseClients[eventId] = sseClients[eventId].filter(r => r !== res);
    });
}

// Call this function when event status changes
/**
 * Broadcasts an event status update to all connected SSE clients for a given event.
 * @param {string} eventId - The event ID to broadcast to.
 * @param {{message: string, status: string}} data - The status data to send.
 */
export function broadcastEventStatus(eventId: string, data: {message: string, status: string}) {
    if (sseClients[eventId]) {
        sseClients[eventId].forEach(res => {
            res.write(`data: ${JSON.stringify({ eventId, data })}\n\n`);
        });
    }
}