import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import db from './config/dababase.js';
import userRoutes from './routes/index.routes.js';
import productRoute from './routes/productRoute.js';
import categoriesRoute from './routes/categoriesRoute.js';
import typeRoute from './routes/typeRoute.js';
import shapeRoute from './routes/shapeRoute.js';
import sizeRoute from './routes/sizeRoute.js';
import flavorRoute from './routes/flavorRoute.js';
import productvariantRoute from './routes/productvariantRoute.js';

dotenv.config();

const app = express();
app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  }),
);
app.use(express.json());
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

app.use('/api', userRoutes);
app.use('/api', productRoute);
app.use('/api', categoriesRoute);
app.use('/api', typeRoute);
app.use('/api', shapeRoute);
app.use('/api', sizeRoute);
app.use('/api', flavorRoute);
app.use('/api', productvariantRoute);

app.get('/', (req, res) => {
  res.json({
    message: 'API Product PO Kue aktif',
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
