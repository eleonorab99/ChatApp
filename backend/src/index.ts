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

// Carica le variabili d'ambiente (con path esplicito)
const envPath = path.resolve(__dirname, "../.env");
console.log("Tentativo di caricare .env da:", envPath);
dotenv.config({ path: envPath });

// Verifica la presenza delle variabili d'ambiente essenziali
if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL non trovato nel file .env! Utilizzando il valore di default."
  );
  process.env.DATABASE_URL =
    "mysql://root:password@localhost:3306/chat_app_progetto_finale";
}

// Log di informazioni iniziali
console.log(
  "DATABASE_URL configurato:",
  process.env.DATABASE_URL.replace(/:.+@/, ":****@")
);
console.log("JWT_SECRET configurato:", process.env.JWT_SECRET ? "✓" : "✗");

// Verifica connessione al database (test iniziale)
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
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
const port = process.env.PORT || 3000;

// Middleware CORS personalizzato
app.use((req: Request, res: Response, next: NextFunction): void => {
  const allowedOrigins = ["http://localhost:5173", "https://localhost:5173"];
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
  res.status(500).json({
    message: "Internal Server Error",
    error: err.message,
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret") as {
      userId: number;
    };
    req.user = { id: decoded.userId }; // Aggiungi l'ID dell'utente alla richiesta
    next(); // Passa al prossimo middleware/route handler
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

// Endpoint per i contatti
app.get("/api/contacts", authenticate, async (req: Request, res: Response): Promise<void> => {
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

const upload = multer({ storage });

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
      const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${
        req.file.filename
      }`;
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
    setupWebSocketServer(server);

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
        `URL Database: ${process.env.DATABASE_URL?.replace(/:.+@/, ":****@")}`
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
        "https://localhost:5173",
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
  const onlineUsers = new Map<number, { userId: number; username: string }>();

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
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || "secret"
        ) as { userId: number };
        const userId = decoded.userId;
        extWs.userId = userId;

        // Ottieni le informazioni dell'utente dal database
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, username: true },
        });

        if (!user) {
          console.error("Utente non trovato:", userId);
          ws.close(4001, "User not found");
          return;
        }

        extWs.username = user.username;
        console.log("Utente connesso:", user.username, "(ID:", userId, ")");

        // Aggiungi l'utente alla mappa degli utenti online
        onlineUsers.set(userId, { userId: user.id, username: user.username });

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