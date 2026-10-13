import express from 'express';
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
import materialRoute from './routes/materialRoutes.js';
import expenseRoute from './routes/expenseRoutes.js';
import reportRoute from './routes/reportRoutes.js';
import MaterialPurchase from './models/material_purchase.js';

const app = express();
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
  }),
);

// Parse JSON request body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Parse cookies (required for auth middleware to read JWT token)
app.use(cookieParser());

// Initialize DB (sync models)
(async () => {
  try {
    await db.authenticate();
    await db.sync(); // sync all defined models
    const purchaseColumns = await db.getQueryInterface().describeTable('material_purchases');
    if (!purchaseColumns.supplier_name) {
      await db.getQueryInterface().addColumn('material_purchases', 'supplier_name', {
        type: MaterialPurchase.rawAttributes.supplier_name.type,
        allowNull: true,
      });
    }
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
app.use('/api', materialRoute);
app.use('/api', expenseRoute);
app.use('/api', reportRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
