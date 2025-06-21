import { Request, Response } from 'express';
import Event, { AdminStatus } from '../../models/Event';
import { createChannel, createChatRoom } from '../../services/ivsService';


class EventController {
  async publishEvent(req: Request, res: Response) {
        const { id } = req.params;

        try {
            const event = await Event.findById(id);
            if (!event) {
                return res.status(404).json({ message: 'Event not found' });
            }
            if(event.published) {
                return res.status(404).json({ message: 'Event has is already published' });
            }

            const channel = await createChannel(event.name);
            if (!channel || !channel.arn) {
               return res.status(500).json({ message: 'Failed to create event' });
            }
            const chat = await createChatRoom(event.name);
            if(!chat || !chat.arn) {
               return res.status(500).json({ message: 'Failed to create event' });
            }

            event.published = true;
            event.adminStatus = AdminStatus.APPROVED
            event.publishedBy = req.admin.id
            event.ivsChannelArn = channel && channel.arn,
            event.ivsPlaybackUrl = channel && channel.playbackUrl ? channel.playbackUrl : "", 
            event.ivsChatRoomArn = chat.arn,
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
  }

  export default new EventController();