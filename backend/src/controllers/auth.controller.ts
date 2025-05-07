import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import * as expressSession from 'express-session';

// Extend the Request interface to include session
interface RequestWithSession extends Request {
    session: expressSession.Session & Partial<expressSession.SessionData>;
}

const prisma = new PrismaClient();
const saltRounds = 10;

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('Ricevuta richiesta di registrazione:', JSON.stringify(req.body));
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('Errori di validazione:', errors.array());
            res.status(400).json({ errors: errors.array() });
            return;
        }

        const { email, password, username } = req.body;
        
        // Verifica che i campi obbligatori siano presenti
        if (!email || !password || !username) {
            console.log('Campi obbligatori mancanti:', { email: !!email, password: !!password, username: !!username });
            res.status(400).json({ message: 'Tutti i campi sono obbligatori' });
            return;
        }

        console.log('Verifica se l\'utente esiste già');
        const existingUser = await prisma.user.findFirst({
            where: { OR: [{ email }, { username }] },
        });

        console.log('Utente esistente:', existingUser ? 'Sì' : 'No');
        if (existingUser) {
            res.status(409).json({ message: 'Email or username already exists' });
            return;
        }

        console.log('Hashing della password');
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        console.log('Creazione utente nel database');
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                username,
                updatedAt: new Date() // Assicuriamoci che updatedAt sia impostato
            },
        });
        console.log('Utente creato con successo, ID:', user.id);

        console.log('Generazione token JWT');
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });
        
        console.log('Invio risposta di successo');
        res.status(201).json({ token, user: { id: user.id, email: user.email, username: user.username } });
    } catch (error) {
        console.error('ERRORE DETTAGLIATO DURANTE LA REGISTRAZIONE:', error);
        // Aggiungiamo dettagli sull'errore per il debug
        if (error instanceof Error) {
            console.error('Nome errore:', error.name);
            console.error('Messaggio errore:', error.message);
            console.error('Stack trace:', error.stack);
            
            // Se è un errore Prisma, stampiamo ulteriori dettagli
            if (error.name === 'PrismaClientKnownRequestError' || 
                error.name === 'PrismaClientUnknownRequestError' ||
                error.name === 'PrismaClientValidationError') {
                console.error('Errore Prisma:', JSON.stringify(error));
            }
            
            // Invia un messaggio di errore più specifico al client
            res.status(500).json({ 
                message: 'Internal Server Error', 
                error: error.message, 
                errorType: error.name 
            });
        } else {
            res.status(500).json({ message: 'Unknown error during registration' });
        }
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('Ricevuta richiesta di login:', { email: req.body.email });
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('Errori di validazione:', errors.array());
            res.status(400).json({ errors: errors.array() });
            return;
        }

        const { email, password } = req.body;

        console.log('Ricerca utente con email:', email);
        const user = await prisma.user.findUnique({ where: { email } });
        
        if (!user) {
            console.log('Utente non trovato');
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }
        console.log('Utente trovato, ID:', user.id);

        console.log('Verifica password');
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            console.log('Password non valida');
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }
        console.log('Password verificata con successo');

        console.log('Generazione token JWT');
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });
        
        console.log('Invio risposta di successo');
        res.status(200).json({ token, user: { id: user.id, email: user.email, username: user.username } });
    } catch (error) {
        console.error('Errore durante il login:', error);
        
        if (error instanceof Error) {
            console.error('Nome errore:', error.name);
            console.error('Messaggio errore:', error.message);
            console.error('Stack trace:', error.stack);
            
            res.status(500).json({ 
                message: 'Internal Server Error', 
                error: error.message,
                errorType: error.name
            });
        } else {
            res.status(500).json({ message: 'Unknown error during login' });
        }
    }
};

export const logout = (req: RequestWithSession, res: Response): void => {
    try {
        console.log('Ricevuta richiesta di logout');
        
        // Verifica se req.session esiste
        if (!req.session) {
            console.log('Sessione non disponibile, invio risposta di successo comunque');
            res.status(200).send('Logged out successfully.');
            return;
        }
        
        req.session.destroy((err) => {
            if (err) {
                console.error('Errore durante la distruzione della sessione:', err);
                res.status(500).send('Could not log out.');
            } else {
                console.log('Logout completato con successo');
                res.status(200).send('Logged out successfully.');
            }
        });
    } catch (error) {
        console.error('Errore durante il logout:', error);
        res.status(500).json({ message: 'Internal Server Error durante il logout' });
    }
};