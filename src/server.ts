import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import connectDB from './config/db';
import authRoutes from './routes/auth';
import adminAuthRoutes from './routes/admin/admin-auth'
import adminEventRoutes from './routes/admin/event'
import adminUsersRoutes from './routes/admin/users';
import adminOrganisersRoutes from './routes/admin/organisers'
import adminTransactionRoutes from './routes/admin/transactions'
import eventRoutes from './routes/event';
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
app.use('/api/v1/streampass',getUsersCountry, streampassRoutes)
app.use('/api/v1/notifications', getUsersCountry, fcmRoutes);
app.use('/api/v1/withdrawal', getUsersCountry, withdrawalRoutes)
app.use('/api/v1/feedback', getUsersCountry, feedbackRoutes)

//Admin Routes
app.use('/api/v1/admin/auth', adminAuthRoutes);
app.use('/api/v1/admin/events', adminEventRoutes);
app.use('/api/v1/admin/users', adminUsersRoutes);
app.use('/api/v1/admin/organisers', adminOrganisersRoutes);
app.use('/api/v1/admin/transactions', adminTransactionRoutes)

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));