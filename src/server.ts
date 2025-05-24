import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import connectDB from './config/db';
import authRoutes from './routes/auth';
import eventRoutes from './routes/event';
import giftRoutes from './routes/gift';
import streampassRoutes from './routes/streampass'
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';

dotenv.config();

const app = express();
app.use(cors());
// Connect Database
connectDB();
app.use(helmet());
// Middleware
app.use(bodyParser.json());

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/events', eventRoutes);
// app.use('/api/v1/gift', giftRoutes)
// app.use('/api/v1/streampass', streampassRoutes)

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));