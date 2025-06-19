import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import connectDB from './config/db';
import authRoutes from './routes/auth';
import eventRoutes from './routes/event';
import giftRoutes from './routes/gift';
import streampassRoutes from './routes/streampass'
import fcmRoutes from './routes/notification';
import withdrawalRoutes from './routes/withdrawal'
import feedbackRoutes from './routes/feedback'
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import getUsersCountry from './middleware/locationMiddleware';

dotenv.config();

const app = express();
app.use(cors());
// Connect Database
connectDB();
app.use(helmet());
// Middleware
app.use(bodyParser.json());

// Routes
app.use('/api/v1/auth', getUsersCountry, authRoutes);
app.use('/api/v1/events', getUsersCountry, eventRoutes);
app.use('/api/v1/gift', getUsersCountry, giftRoutes)
app.use('/api/v1/streampass',getUsersCountry, streampassRoutes)
app.use('/api/v1/notifications', getUsersCountry, fcmRoutes);
app.use('/api/v1/withdrawal', getUsersCountry, withdrawalRoutes)
app.use('/api/v1/feedback', getUsersCountry, feedbackRoutes)

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));