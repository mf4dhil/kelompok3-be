import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import db from './config/dababase.js';
import userRoutes from './routes/index.routes.js';

dotenv.config();

const app = express();
app.use(
  cors({
    origin: 'http://localhost:5173',
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
