import { Request, Response } from 'express';
import Event from '../models/Event';
import s3Service from '../services/s3Service';
import { paginateAggregate, paginateFind } from '../services/paginationService';

class EventController {
    async createEvent(req: Request, res: Response) {
        const { name, date, time, description } = req.body;
        const userId = req.user.id;

        try {
             const eventDateTime = new Date(`${date}T${time}`);
            if (isNaN(eventDateTime.getTime()) || eventDateTime <= new Date()) {
                return res.status(400).json({ message: 'Event date and time must be in the future' });
            }
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
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;

            const result = await paginateFind(
                Event,
                { createdBy: req.user.id },
                { page, limit },
                { __v: 0, createdBy: 0, createdAt: 0, updatedAt: 0, published: 0, status: 0 }
            );

            res.status(200).json({ message: 'Events gotten successfully', ...result });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    async getUpcomingEvents(req: Request, res: Response) {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const now = new Date();

        const pipeline = [
            {
                $addFields: {
                    eventDateTime: {
                        $dateFromString: {
                            dateString: {
                                $concat: [
                                    { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                                    "T",
                                    { $cond: [
                                        { $eq: [ { $type: "$time" }, "string" ] },
                                        "$time",
                                        { $dateToString: { format: "%H:%M", date: "$time" } }
                                    ]}
                                ]
                            }
                        }
                    }
                }
            },
            {
                $match: {
                    eventDateTime: { $gt: now },
                    published: true
                }
            },
            {
                $sort: { eventDateTime: 1 as 1 }
            },
            {
                $project: {
                    createdBy: 0,
                    createdAt: 0,
                    updatedAt: 0,
                    published: 0,
                    status: 0,
                    __v: 0
                }
            }
        ];

        const result = await paginateAggregate(Event, pipeline, { page, limit });

        res.status(200).json({ message: 'Events gotten successfully', ...result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}

   async getLiveEvents(req: Request, res: Response) {
        try {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;
            const currentDate = new Date();
            const startOfDay = new Date(currentDate.setHours(0, 0, 0, 0));
            const endOfDay = new Date(currentDate.setHours(23, 59, 59, 999));

            const result = await paginateFind(
                Event,
                { date: { $gte: startOfDay, $lte: endOfDay }, published: true },
                { page, limit },
                { __v: 0, createdBy: 0, createdAt: 0, updatedAt: 0, published: 0, status: 0 },
                { date: 1, time: 1 }
            );

            res.status(200).json({ message: 'Events gotten successfully', ...result });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    async getPastEvents(req: Request, res: Response) {
        try {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;
            const currentDate = new Date();

            const result = await paginateFind(
                Event,
                { date: { $lt: currentDate }, published: true },
                { page, limit },
                { __v: 0, createdBy: 0, createdAt: 0, updatedAt: 0, published: 0, status: 0 },
                { date: -1, time: -1 }
            );

            res.status(200).json({ message: 'Events gotten successfully', ...result });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    async getEventById(req: Request, res: Response) {
        const { id } = req.params;

        try {
            const event = await Event.findById(id).select('-createdBy -createdAt -updatedAt -published -status');
            if (!event) {
                return res.status(404).json({ message: 'Event not found' });
            }
            res.status(200).json({message: 'Events gotten successfully', event});
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

            // Only check if date or time is being updated
            const newDate = date || event.date;
            const newTime = time || event.time;
            const eventDateTime = new Date(`${newDate}T${newTime}`);
            if (isNaN(eventDateTime.getTime()) || eventDateTime <= new Date()) {
                return res.status(400).json({ message: 'Event date and time must be in the future' });
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

    async publishEvent(req: Request, res: Response) {
        const { id } = req.params;

        try {
            const event = await Event.findById(id);
            if (!event) {
                return res.status(404).json({ message: 'Event not found' });
            }

            if (event.createdBy.toString() !== req.user.id) {
                return res.status(403).json({ message: 'Unauthorized' });
            }

            event.published = true;
            await event.save();

            res.status(200).json({ message: 'Event published successfully', event });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    async unpublishEvent(req: Request, res: Response) {
        const { id } = req.params;

        try {
            const event = await Event.findById(id);
            if (!event) {
                return res.status(404).json({ message: 'Event not found' });
            }

            if (event.createdBy.toString() !== req.user.id) {
                return res.status(403).json({ message: 'Unauthorized' });
            }

            event.published = false;
            await event.save();

            res.status(200).json({ message: 'Event unpublished successfully', event });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    }

// ...existing code...

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

            await event.deleteOne();
            res.status(200).json({ message: 'Event deleted successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    }
}

export default new EventController();