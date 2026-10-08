import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import db from './config/dababase.js';
import './models/index.models.js'; // Ensure all models are registered
import userRoutes from './routes/index.routes.js';
import shapeRoute from './routes/shapeRoute.js';
import sizeRoute from './routes/sizeRoute.js';
import flavorRoute from './routes/flavorRoute.js';
import typeRoute from './routes/typeRoute.js';
import categoriesRoute from './routes/categoriesRoute.js';
import customerRoute from './routes/customerRoutes.js';
import rekeningRoute from './routes/rekeningRoutes.js';
import orderRoute from './routes/orderRoutes.js';

dotenv.config();

const app = express();
app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true
  }),
);

// Parse JSON request body
app.use(express.json());

// Parse cookies (required for auth middleware to read JWT token)
app.use(cookieParser());

// Initialize DB (sync models)
(async () => {
  try {
    await db.authenticate();
    await db.sync(); // sync all defined models
    console.log('Database connected and synced');
  } catch (err) {
    console.error('Database connection error:', err);
  }
})();

// Serve static files (uploaded images)
app.use('/uploads', express.static('uploads'));

app.use('/api', userRoutes);
app.use('/api', shapeRoute);
app.use('/api', sizeRoute);
app.use('/api', flavorRoute);
app.use('/api', typeRoute);
app.use('/api', categoriesRoute);
app.use('/api', customerRoute);
app.use('/api', rekeningRoute);
app.use('/api', orderRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});