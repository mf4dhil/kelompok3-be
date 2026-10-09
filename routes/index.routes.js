import express from 'express';
import * as authController from '../controller/auth.controller.js';
import * as userController from '../controller/user.controller.js';
import * as productController from '../controller/productController.js';
import { authMiddleware, adminMiddleware } from '../middleware/index.middleware.js';

const router = express.Router();

// Authentication routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', authMiddleware, authController.me);
router.post('/resetPassword', authController.resetPassword);

// User routes - admin can edit any user, user can edit own profile
router.get('/users', authMiddleware, adminMiddleware, userController.getAllUsers); // maybe not needed, but for reference
router.put('/user/edit/:id', authMiddleware, adminMiddleware, userController.editUserByAdmin);
router.delete('/user/:id', authMiddleware, adminMiddleware, userController.deleteUser);
router.put('/profile/edit', authMiddleware, userController.editProfileSelf);

// Product routes - admin can manage all products
router.get('/products', productController.getProducts);
router.get('/products/:id', productController.getProductById);
router.post('/products', authMiddleware, adminMiddleware, productController.createProduct);
router.put('/products/:id', authMiddleware, adminMiddleware, productController.updateProduct);
router.patch('/products/:id/status', authMiddleware, adminMiddleware, productController.updateProductStatus);
router.delete('/products/:id', authMiddleware, adminMiddleware, productController.deleteProduct);

// Add variants to an existing product (admin)
router.put('/products/:id/variants', authMiddleware, adminMiddleware, productController.addProductVariants);

export default router;