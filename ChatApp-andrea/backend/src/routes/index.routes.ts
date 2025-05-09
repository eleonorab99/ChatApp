import express from 'express';
import authRoutes from './auth.routes';
import usersRoutes from './users.routes';
import chatRoutes from './chat.routes';
import profileRoutes from './profile.routes'; // Importa le rotte del profilo

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/chat', chatRoutes);
router.use('/profile', profileRoutes); // Aggiungi le rotte del profilo

export default router;