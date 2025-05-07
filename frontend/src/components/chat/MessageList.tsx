import React, { useRef, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Divider,
  Link,
  CircularProgress,
} from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import useChat from "../../hooks/useChat";
import useAuth from "../../hooks/useAuth";
import { Message } from "../../types/chat.types";
import { formatTime } from "../../utils/formatters";

// Componente per visualizzare la lista dei messaggi
const MessageList: React.FC = () => {
  const { messages, loading, currentRecipient } = useChat();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll automatico verso l'ultimo messaggio
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Effettua lo scroll quando arrivano nuovi messaggi
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Determina il tipo di chat (globale o privata)
  const chatTitle = currentRecipient
    ? `Chat con ${currentRecipient.username}`
    : "Chat Globale";

  // Componente per un singolo messaggio
  const MessageItem: React.FC<{ message: Message }> = ({ message }) => {
    const isSender = user?.id === message.senderId;

    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: isSender ? "flex-end" : "flex-start",
          mb: 2,
        }}
      >
        <Paper
          elevation={1}
          sx={{
            p: 2,
            maxWidth: "70%",
            borderRadius: 2,
            backgroundColor: isSender ? "primary.light" : "background.paper",
            color: isSender ? "black" : "text.primary",
          }}
        >
          {!isSender && (
            <Typography variant="subtitle2" fontWeight="bold" component="div">
              {message.sender.username}
            </Typography>
          )}

          {message.content && (
            <Typography variant="body1" component="div">
              {message.content}
            </Typography>
          )}

          {message.fileUrl && (
            <Box
              sx={{
                mt: message.content ? 1 : 0,
                display: "flex",
                alignItems: "center",
              }}
            >
              <AttachFileIcon fontSize="small" sx={{ mr: 0.5 }} />
              <Link
                href={message.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  color: isSender ? "white" : "primary.main",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                {message.fileUrl.split("/").pop() || "File allegato"}
                {message.fileSize && ` (${formatFileSize(message.fileSize)})`}
              </Link>
            </Box>
          )}

          <Typography
            variant="caption"
            component="div"
            sx={{
              mt: 0.5,
              textAlign: "right",
              opacity: 0.8,
            }}
          >
            {formatTime(new Date(message.createdAt))}
          </Typography>
        </Paper>
      </Box>
    );
  };

  // Formatta la dimensione del file in KB o MB
  const formatFileSize = (size: number): string => {
    if (size < 1024) {
      return `${size} B`;
    } else if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    } else {
      return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }
  };

  // Visualizza una data di separazione tra i messaggi
  const DateDivider: React.FC<{ date: Date }> = ({ date }) => (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        my: 2,
      }}
    >
      <Divider sx={{ flexGrow: 1 }} />
      <Typography
        variant="caption"
        sx={{
          mx: 2,
          px: 1.5,
          py: 0.5,
          bgcolor: "grey.200",
          borderRadius: 1,
          color: "text.secondary",
        }}
      >
        {formatDate(date)}
      </Typography>
      <Divider sx={{ flexGrow: 1 }} />
    </Box>
  );

  // Formatta la data in formato esteso
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("it-IT", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Raggruppa i messaggi per data
  const messagesByDate = messages.reduce<{ [date: string]: Message[] }>(
    (acc, message) => {
      const date = new Date(message.createdAt).toDateString();

      if (!acc[date]) {
        acc[date] = [];
      }

      acc[date].push(message);
      return acc;
    },
    {}
  );

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        flex: 1,
        bgcolor: "grey.50",
      }}
    >
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Typography variant="h6">{chatTitle}</Typography>
      </Box>

      <Box
        sx={{
          p: 2,
          overflowY: "auto",
          flexGrow: 1,
        }}
      >
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        ) : messages.length === 0 ? (
          <Box sx={{ textAlign: "center", p: 4 }}>
            <Typography variant="body1" color="text.secondary">
              Nessun messaggio ancora. Inizia la conversazione!
            </Typography>
          </Box>
        ) : (
          Object.entries(messagesByDate).map(([date, dateMessages]) => (
            <React.Fragment key={date}>
              <DateDivider date={new Date(date)} />
              {dateMessages.map((message, index) => (
                <MessageItem
                  key={`${message.id}-${message.createdAt}-${index}`}
                  message={message}
                />
              ))}
            </React.Fragment>
          ))
        )}
        <div ref={messagesEndRef} />
      </Box>
    </Box>
  );
};

export default MessageList;
