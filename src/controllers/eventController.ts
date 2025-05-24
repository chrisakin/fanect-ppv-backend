import { Request, Response } from 'express';
import Event from '../models/Event';
import s3Service from '../services/s3Service';

class EventController {
    async createEvent(req: Request, res: Response) {
        const { name, date, time, description } = req.body;
        const userId = req.user.id;

        try {
            const files = req.files as { [fieldname: string]: Express.Multer.File[] };
            const banner = files?.banner?.[0];
            const watermark = files?.watermark?.[0];

            if (!banner || !watermark) {
                return res.status(400).json({ message: 'Banner and watermark images are required' });
            }

            const bannerUrl = await s3Service.uploadFile(banner, 'event-banners');
            const watermarkUrl = await s3Service.uploadFile(watermark, 'event-watermarks');

            const event = new Event({
                name,
                date,
                time,
                description,
                bannerUrl,
                watermarkUrl,
                price:'450000',
                createdBy: userId,
            });

            await event.save();
            res.status(201).json({ message: 'Event created successfully', event });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    async getEvents(req: Request, res: Response) {
        try {
            const events = await Event.find({ createdBy: req.user.id });
            res.status(200).json(events);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    async getUpcomingEvents(req: Request, res: Response) {
        try {
            const currentDate = new Date();
    
            // Fetch events with a date greater than or equal to the current date, sorted by date and time
            const events = await Event.find({ 
                date: { $gte: currentDate } 
            }).sort({ date: 1, time: 1 });
    
            res.status(200).json(events);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    async getLiveEvents(req: Request, res: Response) {
        try {
            const currentDate = new Date();
            // Assuming "live" means events happening today
            const startOfDay = new Date(currentDate.setHours(0, 0, 0, 0));
            const endOfDay = new Date(currentDate.setHours(23, 59, 59, 999));

            const events = await Event.find({
                date: { $gte: startOfDay, $lte: endOfDay }
            }).sort({ date: 1, time: 1 });

            res.status(200).json(events);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    }

       async getPastEvents(req: Request, res: Response) {
        try {
            const currentDate = new Date();
            const events = await Event.find({
                date: { $lt: currentDate }
            }).sort({ date: -1, time: -1 });

            res.status(200).json(events);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    async getEventById(req: Request, res: Response) {
        const { id } = req.params;

        try {
            const event = await Event.findById(id);
            if (!event) {
                return res.status(404).json({ message: 'Event not found' });
            }
            res.status(200).json(event);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    async updateEvent(req: Request, res: Response) {
        const { id } = req.params;
        const { name, date, time, description, price } = req.body;

        try {
            const event = await Event.findById(id);
            if (!event) {
                return res.status(404).json({ message: 'Event not found' });
            }

            if (event.createdBy.toString() !== req.user.id) {
                return res.status(403).json({ message: 'Unauthorized' });
            }

            const files = req.files as { [fieldname: string]: Express.Multer.File[] };
            if (files?.banner) {
                event.bannerUrl = await s3Service.uploadFile(files.banner?.[0], 'event-banners');
            }

            if (files?.watermark) {
                event.watermarkUrl = await s3Service.uploadFile(files.watermark?.[0], 'event-watermarks');
            }

            event.name = name || event.name;
            event.date = date || event.date;
            event.time = time || event.time;
            event.description = description || event.description;
            event.price = price || event.price

            await event.save();
            res.status(200).json({ message: 'Event updated successfully', event });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    async deleteEvent(req: Request, res: Response) {
        const { id } = req.params;

        try {
            const event = await Event.findById(id);
            if (!event) {
                return res.status(404).json({ message: 'Event not found' });
            }

            if (event.createdBy.toString() !== req.user.id) {
                return res.status(403).json({ message: 'Unauthorized' });
            }

            await event.remove();
            res.status(200).json({ message: 'Event deleted successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    }
}

export default new EventController();