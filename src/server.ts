import express from 'express';
import bodyParser from 'body-parser';
import connectDB from './config/db';
import authRoutes from './routes/auth';
import eventRoutes from './routes/event';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(cors());
// Connect Database
connectDB();

// Middleware
app.use(bodyParser.json());

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/events', eventRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));