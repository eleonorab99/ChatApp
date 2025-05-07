import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Endpoint per testare la connessione al database
router.get('/db', async (req: Request, res: Response): Promise<void> => {
  try {
    // Prova a contare gli utenti (operazione semplice)
    const userCount = await prisma.user.count();
    
    // Controlla la connessione al database
    res.status(200).json({
      success: true,
      message: 'Database connection successful',
      userCount,
      databaseUrl: process.env.DATABASE_URL?.replace(/:.+@/, ':****@') // Nascondi la password
    });
  } catch (error) {
    console.error('Errore nel test del database:', error);
    
    let errorMessage = 'Database connection failed';
    let errorDetails = {};
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = {
        name: error.name,
        stack: error.stack,
      };
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: errorDetails
    });
  }
});

// Endpoint per verificare le variabili d'ambiente
router.get('/env', async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    message: 'Environment check',
    databaseConfigured: !!process.env.DATABASE_URL,
    jwtConfigured: !!process.env.JWT_SECRET,
    nodeEnv: process.env.NODE_ENV || 'development'
  });
});

// Endpoint per verificare il prisma schema
router.get('/schema', async (req: Request, res: Response): Promise<void> => {
  try {
    // Ottieni i modelli disponibili
    const user = await prisma.user.findFirst();
    const message = await prisma.message.findFirst();
    
    res.status(200).json({
      success: true,
      models: {
        userModel: !!prisma.user,
        messageModel: !!prisma.message,
      },
      sampleData: {
        userExists: !!user,
        messageExists: !!message
      }
    });
  } catch (error) {
    console.error('Errore nella verifica dello schema:', error);
    
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      error: error instanceof Error ? error.name : 'Unknown error type'
    });
  }
});

export default router;