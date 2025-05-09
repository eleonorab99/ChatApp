import express, { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import * as http from "http";
import * as https from "https";
import * as fs from "fs";
import * as path from "path";
import { WebSocketServer } from "ws";
import WebSocket from "ws";
import { Session, SessionData } from "express-session";

import multer from "multer";
import dotenv from "dotenv";
import { upload as uploadMiddleware } from "./middleware/uploadMiddleware";
import testRoutes from "./routes/test.routes";
import authRoutes from "./routes/auth.routes";
import usersRoutes from "./routes/users.routes";
import chatRoutes from "./routes/chat.routes";
import profileRoutes from "./routes/profile.routes";

// Carica le variabili d'ambiente (con path esplicito)
const envPath = path.resolve(__dirname, "../.env");
console.log("Tentativo di caricare .env da:", envPath);
dotenv.config({ path: envPath });

// Verifica la presenza delle variabili d'ambiente essenziali
const requiredEnvVars = {
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  PORT: process.env.PORT || "3000"
};

// Validazione delle variabili d'ambiente critiche
if (!requiredEnvVars.DATABASE_URL) {
  console.error("ERRORE: DATABASE_URL non configurato!");
  process.exit(1);
}

if (!requiredEnvVars.JWT_SECRET) {
  console.error("ERRORE: JWT_SECRET non configurato!");
  process.exit(1);
}

// Log di informazioni iniziali (senza esporre dati sensibili)
console.log("Configurazione ambiente:", {
  DATABASE_URL: requiredEnvVars.DATABASE_URL ? "✓ Configurato" : "✗ Mancante",
  JWT_SECRET: requiredEnvVars.JWT_SECRET ? "✓ Configurato" : "✗ Mancante",
  PORT: requiredEnvVars.PORT
});

// Verifica connessione al database (test iniziale)
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: requiredEnvVars.DATABASE_URL,
    },
  },
  log: ["query", "error", "warn"],
});

// Test di connessione al database all'avvio
async function testDatabaseConnection() {
  try {
    console.log("Test connessione al database...");
    const result = await prisma.$queryRaw`SELECT 1+1 as result`;
    console.log("Connessione al database stabilita con successo:", result);
    return true;
  } catch (error) {
    console.error("ERRORE connessione al database:", error);
    return false;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
      };
      session: Session & Partial<SessionData>; // Corretto il tipo per session
    }
  }
}

// Estendi l'interfaccia WebSocket per includere proprietà aggiuntive
interface ExtendedWebSocket extends WebSocket {
  url: string;
  userId?: number;
  username?: string;
  isAlive?: boolean;
}

const app = express();
const port = requiredEnvVars.PORT;

// Middleware CORS personalizzato
app.use((req: Request, res: Response, next: NextFunction): void => {
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174", // Aggiungiamo la nuova porta 5174
    "https://localhost:5173",
    "https://localhost:5174", // Anche la versione HTTPS
    process.env.FRONTEND_URL, // URL del frontend in produzione
    process.env.FRONTEND_DEV_URL // URL del frontend in sviluppo
  ].filter(Boolean); // Rimuove i valori undefined

  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }

  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Max-Age", "86400"); // 24 ore

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  next();
});

// Middleware per parsare JSON
app.use(express.json());

// Middleware per gestire gli errori
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Errore:", err);

  // Gestione errori specifici
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: "Errore di validazione",
      error: err.message
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      message: "Non autorizzato",
      error: err.message
    });
  }

  if (err.name === 'PrismaClientKnownRequestError') {
    return res.status(400).json({
      message: "Errore nel database",
      error: err.message
    });
  }

  // Errore generico
  res.status(500).json({
    message: "Internal Server Error",
    error: process.env.NODE_ENV === 'development' ? err.message : 'Si è verificato un errore'
  });
});

// Middleware di autenticazione
function authenticate(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return void res
      .status(401)
      .json({ message: "Unauthorized: Missing token" });
  }
  try {
    if (!requiredEnvVars.JWT_SECRET) {
      throw new Error("JWT_SECRET non configurato");
    }
    const decoded = jwt.verify(token, requiredEnvVars.JWT_SECRET) as { userId: number };
    req.user = { id: decoded.userId };
    next();
  } catch (error) {
    return void res
      .status(401)
      .json({ message: "Unauthorized: Invalid token" });
  }
}

// Monta le route
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/test", testRoutes);
app.use("/api/profile", profileRoutes); // Aggiungi le rotte per il profilo

// Endpoint per i contatti
app.get("/api/contacts", authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(400).json({ message: 'ID utente mancante' });
      return;
    }

    // Utilizziamo una query SQL raw per evitare problemi di tipizzazione con i nuovi campi
    const contacts = await prisma.$queryRaw`
        SELECT DISTINCT 
            u.id as userId, 
            u.username, 
            u.email, 
            u.profileImage, 
            u.bio
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
        }
      });

      // Formatta i dati per il frontend
      const formattedUsers = allUsers.map(user => ({
        userId: user.id,
        username: user.username,
        profileImage: user.profileImage,
        bio: user.bio,
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
          profileImage: contact.profileImage,
          bio: contact.bio,
          isOnline: false, // Questo verrà aggiornato dal frontend
        }))
      : [];

    res.json(formattedContacts);
  } catch (error) {
    console.error('Errore nel recupero dei contatti:', error);
    res.status(500).json({ message: 'Errore interno del server' });
  }
});

// Rotte di base per verificare che il server funzioni
app.get("/", (req: Request, res: Response) => {
  res.send("Server operativo! 👍");
});

// Configura multer per il caricamento dei file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

// Configurazione dei limiti per il caricamento
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Accetta solo immagini e documenti
    const allowedTypes = [
      'image/jpeg', 
      'image/png', 
      'image/gif', 
      'application/pdf', 
      'application/msword',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo di file non supportato'));
    }
  }
});

// Endpoint per servire i file caricati
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Endpoint per il caricamento dei file
app.post(
  "/api/upload",
  upload.single("file"),
  (req: Request, res: Response): void => {
    try {
      if (!req.file) {
        res.status(400).json({ message: "No file uploaded" });
        return;
      }

      // Crea l'URL completo per il file
      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({ fileUrl });
    } catch (error) {
      console.error("Errore durante il caricamento del file:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

// Endpoint per recuperare i messaggi precedenti
app.get(
  "/api/messages",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const { recipientId } = req.query;
    const userId = req.user?.id;
    if (!userId) {
      return void res.status(400).json({ message: "Missing userId" });
    }
    try {
      let messages;
      if (recipientId) {
        // Messaggi privati tra due utenti
        messages = await prisma.message.findMany({
          where: {
            OR: [
              { senderId: userId, receiverId: Number(recipientId) },
              { senderId: Number(recipientId), receiverId: userId },
            ],
          },
          include: {
            sender: true,
            receiver: true,
          },
          orderBy: { createdAt: "asc" },
        });
      } else {
        // Messaggi globali (chat pubblica)
        messages = await prisma.message.findMany({
          where: {
            receiverId: null,
          },
          include: {
            sender: true,
          },
          orderBy: { createdAt: "asc" },
        });
      }
      return void res.json(messages);
    } catch (error) {
      console.error("Errore durante il recupero dei messaggi:", error);
      return void res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

// Endpoint per verificare gli utenti connessi (DEBUG)
app.get("/api/debug/websocket-connections", (req: Request, res: Response) => {
  try {
    const connections: any[] = [];
    let wss: WebSocketServer | undefined;
    
    // Ottieni il server WebSocket
    if ((global as any).wss) {
      wss = (global as any).wss;
    }
    
    if (wss) {
      wss.clients.forEach((client) => {
        const extWs = client as ExtendedWebSocket;
        connections.push({
          userId: extWs.userId,
          username: extWs.username,
          readyState: extWs.readyState === WebSocket.OPEN ? 'OPEN' : 'CLOSED'
        });
      });
    }
    
    res.json({
      totalConnections: connections.length,
      connections
    });
  } catch (error) {
    console.error("Errore durante il recupero delle connessioni:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Avvia il server
async function startServer() {
  try {
    // Testa la connessione al database
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      console.error(
        "Impossibile connettersi al database. Verifica la configurazione."
      );
      process.exit(1);
    }

    let server;

    try {
      // Percorsi dei certificati
      const keyPath = path.join(__dirname, "../../certificati/domain.key");
      const certPath = path.join(__dirname, "../../certificati/domain.crt");
      console.log("Percorso della chiave:", keyPath);
      console.log("Percorso del certificato:", certPath);

      // Verifica che i certificati esistano
      if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
        throw new Error("Certificati SSL non trovati");
      }

      // Crea server HTTPS
      server = https.createServer(
        {
          key: fs.readFileSync(keyPath, "utf8"),
          cert: fs.readFileSync(certPath, "utf8"),
          passphrase: "elia",
          requestCert: false,
          rejectUnauthorized: false,
        },
        app
      );

      console.log("Server HTTPS configurato con successo");
    } catch (error) {
      console.error("Errore nella configurazione HTTPS:", error);
      console.log("Utilizzo HTTP come fallback");

      // Fallback a HTTP
      server = http.createServer(app);
    }

    // Configura il server WebSocket
    const wss = setupWebSocketServer(server);
    
    // Rendi il WSS disponibile globalmente per il debugging
    (global as any).wss = wss;

    // Middleware per servire file statici
    app.use(express.static(path.join(__dirname, "../public")));

    // Avvia il server
    server.listen(port, () => {
      console.log(
        `Server in ascolto su ${
          server instanceof https.Server ? "https" : "http"
        }://localhost:${port}`
      );
      console.log(
        `URL Database: ${requiredEnvVars.DATABASE_URL?.replace(/:.+@/, ":****@")}`
      );
      console.log(
        `Frontend URL atteso: ${
          server instanceof https.Server ? "https" : "http"
        }://localhost:5173`
      );
    });
  } catch (error) {
    console.error("Errore fatale durante l'avvio del server:", error);
    process.exit(1);
  }
}

// Configura il server WebSocket
function setupWebSocketServer(server: http.Server | https.Server) {
  // Crea server WebSocket con configurazione CORS
  const wss = new WebSocketServer({
    server,
    // Aggiungi configurazione CORS per WebSocket
    verifyClient: (info, callback) => {
      const origin = info.origin || info.req.headers.origin;
      const allowedOrigins = [
        "http://localhost:5173",
        "http://localhost:5174", // Aggiungiamo anche qui la porta 5174
        "https://localhost:5173",
        "https://localhost:5174",
      ];

      if (!origin || allowedOrigins.includes(origin)) {
        callback(true);
      } else {
        console.log("WebSocket connection rejected from origin:", origin);
        callback(false, 403, "Forbidden");
      }
    },
  });

  // Mappa per tenere traccia degli utenti online
  const onlineUsers = new Map<number, { userId: number; username: string; profileImage?: string | null; bio?: string | null }>();

  // Funzione per inviare la lista degli utenti online a tutti i client
  const sendOnlineUsers = () => {
    const onlineUsersList = Array.from(onlineUsers.values());
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({ type: "online_users", data: onlineUsersList })
        );
      }
    });
  };

  // Gestisci connessioni WebSocket
  wss.on("connection", async (ws: WebSocket, req: http.IncomingMessage) => {
    console.log("Nuova connessione WebSocket da:", req.headers.origin);
    const extWs = ws as ExtendedWebSocket;
    extWs.isAlive = true;

    try {
      // Estrai il token dall'URL
      const url = req.url
        ? new URL(req.url, `http://${req.headers.host}`)
        : null;
      const token = url?.searchParams.get("token");

      if (!token) {
        console.error("Token mancante nella connessione WebSocket");
        ws.close(4001, "Unauthorized: Missing token");
        return;
      }

      try {
        if (!requiredEnvVars.JWT_SECRET) {
          throw new Error("JWT_SECRET non configurato");
        }
        const decoded = jwt.verify(token, requiredEnvVars.JWT_SECRET) as { userId: number };
        const userId = decoded.userId;
        extWs.userId = userId;

        // Ottieni le informazioni dell'utente dal database
        // Utilizziamo una query raw per evitare problemi di tipizzazione
        const userResult = await prisma.$queryRaw`
          SELECT id, username, profileImage, bio 
          FROM User 
          WHERE id = ${userId}
        `;
        
        const user = Array.isArray(userResult) && userResult.length > 0 
          ? userResult[0] as { id: number; username: string; profileImage?: string | null; bio?: string | null }
          : null;

        if (!user) {
          console.error("Utente non trovato:", userId);
          ws.close(4001, "User not found");
          return;
        }

        extWs.username = user.username;
        console.log("Utente connesso:", user.username, "(ID:", userId, ")");

        // Aggiungi l'utente alla mappa degli utenti online
        onlineUsers.set(userId, { 
          userId: user.id, 
          username: user.username,
          profileImage: user.profileImage || null,
          bio: user.bio || null 
        });

        // Invia la lista aggiornata degli utenti online a tutti i client
        sendOnlineUsers();

        // Gestisci la disconnessione
        ws.on("close", () => {
          console.log("WebSocket disconnesso per utente:", user.username);
          if (extWs.userId) {
            onlineUsers.delete(extWs.userId);
            sendOnlineUsers();
          }
        });

        // Gestisci i messaggi
        ws.on("message", async (message: string) => {
          try {
            const data = JSON.parse(message);
            console.log("Messaggio WebSocket ricevuto:", data.type);

            // INIZIO CORREZIONE CRUCIALE: Gestione avanzata dei messaggi di chiamata
            if (data.type === "call_offer" || data.type === "call_answer" || 
                data.type === "call_reject" || data.type === "call_end" ||
                data.type === "ice_candidate") {
              
              console.log("Messaggio di chiamata ricevuto:", {
                type: data.type,
                senderId: data.senderId,
                recipientId: data.recipientId,
                hasOffer: !!data.offer,
                hasAnswer: !!data.answer
              });
              
              // Verifica che il messaggio contenga il recipientId
              if (!data.recipientId) {
                console.error(`Messaggio ${data.type} senza recipientId, impossibile instradare`);
                return;
              }
              
              // Assicurati che il senderId sia sempre presente
              if (!data.senderId && extWs.userId) {
                data.senderId = extWs.userId;
                console.log(`Aggiunto automaticamente senderId (${extWs.userId}) al messaggio ${data.type}`);
              }
              
              // Invia il messaggio SOLO al destinatario specificato
              let delivered = false;
              wss.clients.forEach((client) => {
                const clientWs = client as ExtendedWebSocket;
                if (clientWs.readyState === WebSocket.OPEN && 
                    clientWs.userId === data.recipientId) {
                  console.log(`Inoltro messaggio ${data.type} da ${data.senderId} a ${data.recipientId}`);
                  clientWs.send(JSON.stringify(data)); // Invia il messaggio
                  delivered = true;
                }
              });
              
              // Log se il messaggio non è stato consegnato
              if (!delivered) {
                console.warn(`Impossibile consegnare messaggio ${data.type}: destinatario ${data.recipientId} non connesso`);
              }
              
              return; // Termina qui per i messaggi di chiamata
            }
            // FINE CORREZIONE CRUCIALE

            if (data.type === "chat_message") {
              // Gestione messaggi chat
              const savedMessage = await prisma.message.create({
                data: {
                  content: data.content,
                  senderId: userId,
                  receiverId: data.recipientId || null,
                  fileUrl: data.fileUrl || null,
                  fileSize: data.fileSize || null,
                },
                include: {
                  sender: true,
                  receiver: true,
                },
              });

              // Invia il messaggio ai destinatari appropriati
              wss.clients.forEach((client) => {
                const clientWs = client as ExtendedWebSocket;
                if (clientWs.readyState === WebSocket.OPEN) {
                  if (
                    !data.recipientId ||
                    clientWs.userId === data.recipientId ||
                    clientWs.userId === userId
                  ) {
                    clientWs.send(
                      JSON.stringify({
                        type: "new_message",
                        data: savedMessage,
                      })
                    );
                  }
                }
              });
            }
          } catch (error) {
            console.error(
              "Errore durante l'elaborazione del messaggio:",
              error
            );
          }
        });
      } catch (error) {
        console.error("Errore nella verifica del token:", error);
        ws.close(4001, "Invalid token");
      }
    } catch (error) {
      console.error(
        "Errore durante la gestione della connessione WebSocket:",
        error
      );
      ws.close(1011, "Internal server error");
    }
  });

  // Aggiungi heartbeat per mantenere le connessioni attive
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const extWs = ws as ExtendedWebSocket;
      if (extWs.isAlive === false) {
        console.log("WebSocket non risponde, chiusura connessione");
        return ws.terminate();
      }

      extWs.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(interval);
  });

  return wss;
}

// Avvia il server
startServer().catch((error) => {
  console.error("Errore fatale all'avvio del server:", error);
  process.exit(1);
});