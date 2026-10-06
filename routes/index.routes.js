import express from 'express';
import * as authController from '../controller/auth.controller.js';
import * as userController from '../controller/user.controller.js';
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
router.put('/profile/edit', authMiddleware, userController.editProfileSelf);

export default router;