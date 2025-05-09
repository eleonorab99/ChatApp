import express from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import { authMiddleware } from '../middleware/authMiddleware';
import {
    getProfile,
    updateProfile,
    uploadProfileImage,
    deleteProfileImage
} from '../controllers/profile.controller';

const router = express.Router();

// Configurazione multer per gestire i file in memoria
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 2 * 1024 * 1024, // 2MB
    },
    fileFilter: (req, file, cb) => {
        // Accetta solo immagini
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Il file deve essere un\'immagine'));
        }
    }
});

// Ottieni profilo utente corrente
router.get('/', authMiddleware, getProfile);

// Aggiorna profilo utente
router.put(
    '/',
    authMiddleware,
    [
        body('username').optional().isLength({ min: 3, max: 30 }),
        body('bio').optional().isString().isLength({ max: 500 }),
    ],
    updateProfile
);

// Carica immagine del profilo
router.post(
    '/image',
    authMiddleware,
    upload.single('image'),
    uploadProfileImage
);

// Elimina immagine del profilo
router.delete('/image', authMiddleware, deleteProfileImage);

export default router;