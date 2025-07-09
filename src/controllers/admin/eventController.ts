import { Request, Response } from 'express';
import Event, { AdminStatus, EventStatus } from '../../models/Event';
import { createChannel, createChatRoom, createStreamKey, getSavedBroadCastUrl } from '../../services/ivsService';
import Streampass from '../../models/Streampass';
import { IUser } from '../../models/User';
import { sendNotificationToUsers } from '../../services/fcmService';
import EmailService from '../../services/emailService';
import { broadcastEventStatus } from '../../services/sseService';

class EventController {
    constructor() {
        this.updateEventSession = this.updateEventSession.bind(this)
        this.notifyEventStatus = this.notifyEventStatus.bind(this)
    }
  async publishEvent(req: Request, res: Response) {
        const { id } = req.params;

        try {
            const event = await Event.findById(id);
            if (!event) {
                return res.status(404).json({ message: 'Event not found' });
            }
            if(event.published) {
                return res.status(404).json({ message: 'Event is already published' });
            }

            const channel = await createChannel(event.name);
            if (!channel || !channel.arn) {
               return res.status(500).json({ message: 'Failed to create event' });
            }
            const streamKey = await createStreamKey(channel.arn)
            const chat = await createChatRoom(event.name);
            if(!chat || !chat.arn) {
               return res.status(500).json({ message: 'Failed to create event' });
            }

            event.published = true;
            event.adminStatus = AdminStatus.APPROVED
            event.publishedBy = req.admin.id
            event.ivsChannelArn = channel && channel.arn,
            event.ivsPlaybackUrl = channel && channel.playbackUrl ? channel.playbackUrl : undefined, 
            event.ivsChatRoomArn = chat.arn,
            event.ivsIngestEndpoint = channel && channel.ingestEndpoint ? channel.ingestEndpoint : undefined
            event.ivsIngestStreamKey = channel && streamKey ? streamKey : undefined
            await event.save();

            res.status(200).json({ message: 'Event published successfully', event });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
        }
    }

    async unpublishEvent(req: Request, res: Response) {
        const { id } = req.params;

        try {
            const event = await Event.findById(id);
            if (!event) {
                return res.status(404).json({ message: 'Event not found' });
            }

            event.published = false;
            event.unpublishedBy = req.admin.id
            await event.save();

            res.status(200).json({ message: 'Event unpublished successfully', event });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
        }
    }

       async rejectEvent(req: Request, res: Response) {
        const { id } = req.params;

        try {
            const event = await Event.findById(id);
            if (!event) {
                return res.status(404).json({ message: 'Event not found' });
            }

            event.published = false;
            event.adminStatus = AdminStatus.REJECTED
            event.rejectedBy = req.admin.id
            event.unpublishedBy = req.admin.id
            await event.save();

            res.status(200).json({ message: 'Event unpublished successfully', event });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
        }
    }

    async updateEventSession(req: Request, res: Response) {
   const { id } = req.params;
   const { session } = req.body

        try {
            const event = await Event.findById(id);
            if (!event) {
                return res.status(404).json({ message: 'Event not found' });
            }
            if(!event.published) {
                return res.status(404).json({ message: 'Event has not been approved ' });
            }

            if(!session) {
                return res.status(404).json({message: 'Session is reuired'})
            }
               if (session === 'stream-start') {
                    event.status = EventStatus.LIVE;
                    event.startedEventBy = req.admin.id
                    await event.save();
                    broadcastEventStatus(id, {message: 'Event has started', status: EventStatus.LIVE});
                     await this.notifyEventStatus(event, EventStatus.LIVE);
                } else if (session === 'stream-end') {
                    const url = await getSavedBroadCastUrl(event.ivsChannelArn)
                    if(!url) {
                        return res.status(404).json({ message: 'Broadcast url has not been saved. Retry again after 10 mins.' });
                    }
                    event.status = EventStatus.PAST;
                    event.endedEventBy = req.admin.id
                    event.ivsSavedBroadcastUrl = url
                    await event.save();
                    broadcastEventStatus(id, {message: 'Event has ended', status: EventStatus.PAST});
                    await this.notifyEventStatus(event, EventStatus.PAST);
                }
            res.status(200).json({ message: 'Event session updated successfully', event });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Something went wrong. Please try again later' });
        }
}

async notifyEventStatus(eventDoc: any, status: EventStatus) {
    // Find all users with a streampass for this event
    const streampasses = await Streampass.find({ event: eventDoc._id }).populate('user');
    const users = streampasses
        .filter(sp => sp?.user)
        .map(sp => sp.user) as unknown as IUser[];
    // Prepare notification details
    const eventName = eventDoc.name;
    const eventDate = new Date(eventDoc.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const eventTime = eventDoc.time;

    // For event started
    if (status === EventStatus.LIVE) {
        // App notifications
        const appUsers = users.filter(u => u.appNotifLiveStreamBegins);
        await sendNotificationToUsers(
            appUsers.map((u: any) => u._id.toString()),
            'Live Stream Started',
            `The event "${eventName}" has started!`,
            { eventId: eventDoc._id.toString() }
        );

        // Email notifications
        const emailUsers = users.filter(u => u.emailNotifLiveStreamBegins);
        for (const user of emailUsers) {
            await EmailService.sendEmail(
                user.email,
                'Live Stream Started',
                'eventLiveStreamBegins', // your email template
                { eventName, eventDate, eventTime, userName: user.firstName, year: new Date().getFullYear() }
            );
        }
    }

    // For event ended
    if (status === EventStatus.PAST) {
        // App notifications
        const appUsers = users.filter(u => u.appNotifLiveStreamEnds);
        await sendNotificationToUsers(
            appUsers.map((u: any) => u._id.toString()),
            'Live Stream Ended',
            `The event "${eventName}" has ended.`,
            { eventId: eventDoc._id.toString() }
        );

        // Email notifications
        const emailUsers = users.filter(u => u.emailNotifLiveStreamEnds);
        for (const user of emailUsers) {
            await EmailService.sendEmail(
                user.email,
                'Live Stream Ended',
                'eventLiveStreamEnds', // your email template
                { eventName, eventDate, eventTime, userName: user.firstName, year: new Date().getFullYear() }
            );
        }
    }
}
  }

  export default new EventController();