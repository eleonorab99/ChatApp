import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();
const prisma = new PrismaClient();

// Endpoint per ottenere tutti i contatti per l'utente corrente
// Un contatto è definito come un utente con cui hai scambiato almeno un messaggio
router.get('/contacts', authMiddleware, async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(400).json({ message: 'ID utente mancante' });
            return;
        }

        // Trova tutti gli utenti con cui l'utente corrente ha scambiato messaggi
        const contacts = await prisma.$queryRaw`
            SELECT DISTINCT u.id as userId, u.username, u.email
            FROM User u
            WHERE u.id IN (
                SELECT DISTINCT m.senderId 
                FROM messages m 
                WHERE m.receiverId = ${userId}
                UNION
                SELECT DISTINCT m.receiverId 
                FROM messages m 
                WHERE m.senderId = ${userId} AND m.receiverId IS NOT NULL
            )
            AND u.id != ${userId}
        `;

        // Se non ci sono contatti, restituisci un array vuoto
        if (!contacts || (Array.isArray(contacts) && contacts.length === 0)) {
            // Ottieni tutti gli altri utenti come fallback
            const allUsers = await prisma.user.findMany({
                where: {
                    id: {
                        not: userId
                    }
                },
                select: {
                    id: true,
                    username: true,
                    email: true
                }
            });

            // Formatta i dati per il frontend
            const formattedUsers = allUsers.map(user => ({
                userId: user.id,
                username: user.username,
                isOnline: false
            }));

            res.json(formattedUsers);
            return;
        }

        // Formatta i contatti per il frontend
        const formattedContacts = Array.isArray(contacts) 
            ? contacts.map((contact: any) => ({
                userId: contact.userId,
                username: contact.username,
                isOnline: false, // Questo verrà aggiornato dal frontend
            }))
            : [];

        res.json(formattedContacts);
    } catch (error) {
        console.error('Errore nel recupero dei contatti:', error);
        res.status(500).json({ message: 'Errore interno del server' });
    }
});

export default router;