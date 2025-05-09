import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { validationResult } from 'express-validator';
import * as path from 'path';
import * as fs from 'fs';
import multer from 'multer';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// Configurazione per il caricamento delle immagini di profilo
const UPLOAD_DIR = path.join(__dirname, '../../public/uploads/profiles');

// Assicurati che la directory esista
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Ottiene il profilo dell'utente
export const getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        
        if (!userId) {
            res.status(401).json({ message: 'Utente non autenticato' });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                email: true,
                profileImage: true,
                bio: true,
                createdAt: true
            }
        });

        if (!user) {
            res.status(404).json({ message: 'Utente non trovato' });
            return;
        }

        res.status(200).json(user);
    } catch (error) {
        console.error('Errore durante il recupero del profilo:', error);
        res.status(500).json({ message: 'Errore interno del server' });
    }
};

// Aggiorna il profilo dell'utente
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }

        const userId = req.user?.id;
        
        if (!userId) {
            res.status(401).json({ message: 'Utente non autenticato' });
            return;
        }

        const { username, bio } = req.body;
        
        // Verifica che il nome utente non sia già utilizzato (se viene modificato)
        if (username) {
            const existingUser = await prisma.user.findFirst({
                where: {
                    username,
                    id: { not: userId }
                }
            });

            if (existingUser) {
                res.status(409).json({ message: 'Username già in uso' });
                return;
            }
        }

        // Aggiorna il profilo utente
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                username: username || undefined,
                bio: bio !== undefined ? bio : undefined,
                updatedAt: new Date()
            },
            select: {
                id: true,
                username: true,
                email: true,
                profileImage: true,
                bio: true
            }
        });

        res.status(200).json(updatedUser);
    } catch (error) {
        console.error('Errore durante l\'aggiornamento del profilo:', error);
        res.status(500).json({ message: 'Errore interno del server' });
    }
};

// Carica un'immagine del profilo
export const uploadProfileImage = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        
        if (!userId) {
            res.status(401).json({ message: 'Utente non autenticato' });
            return;
        }

        if (!req.file) {
            res.status(400).json({ message: 'Nessun file caricato' });
            return;
        }

        // Genera un nome file univoco per l'immagine del profilo
        const uniqueId = crypto.randomBytes(8).toString('hex');
        const fileExtension = path.extname(req.file.originalname);
        const fileName = `profile_${userId}_${uniqueId}${fileExtension}`;
        const filePath = path.join(UPLOAD_DIR, fileName);
        
        // Crea uno stream di scrittura
        const writeStream = fs.createWriteStream(filePath);
        
        // Scrivi il file
        writeStream.write(req.file.buffer);
        writeStream.end();
        
        // Attendi che il file sia scritto
        await new Promise<void>((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });
        
        // URL relativo per l'immagine del profilo
        const profileImageUrl = `/uploads/profiles/${fileName}`;

        // Aggiorna l'utente con la nuova immagine del profilo
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { 
                profileImage: profileImageUrl,
                updatedAt: new Date()
            },
            select: {
                id: true,
                username: true,
                email: true,
                profileImage: true,
                bio: true
            }
        });

        res.status(200).json(updatedUser);
    } catch (error) {
        console.error('Errore durante il caricamento dell\'immagine del profilo:', error);
        res.status(500).json({ message: 'Errore interno del server' });
    }
};

// Elimina l'immagine del profilo
export const deleteProfileImage = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        
        if (!userId) {
            res.status(401).json({ message: 'Utente non autenticato' });
            return;
        }

        // Recupera l'utente per ottenere l'immagine attuale
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { profileImage: true }
        });

        if (!user || !user.profileImage) {
            res.status(404).json({ message: 'Immagine del profilo non trovata' });
            return;
        }

        // Costruisci il percorso completo dell'immagine
        const imagePath = path.join(__dirname, '../../public', user.profileImage);

        // Verifica se il file esiste
        if (fs.existsSync(imagePath)) {
            // Elimina il file
            fs.unlinkSync(imagePath);
        }

        // Aggiorna l'utente rimuovendo il riferimento all'immagine
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { 
                profileImage: null,
                updatedAt: new Date()
            },
            select: {
                id: true,
                username: true,
                email: true,
                profileImage: true,
                bio: true
            }
        });

        res.status(200).json(updatedUser);
    } catch (error) {
        console.error('Errore durante l\'eliminazione dell\'immagine del profilo:', error);
        res.status(500).json({ message: 'Errore interno del server' });
    }
};