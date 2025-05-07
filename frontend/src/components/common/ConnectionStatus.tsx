import React from "react";
import { Box, Tooltip, IconButton } from "@mui/material";
import {
  SignalWifi4Bar as ConnectedIcon,
  SignalWifiOff as DisconnectedIcon,
  Sync as ReconnectingIcon,
} from "@mui/icons-material";
import useChat from "../../hooks/useChat";

// Componente per mostrare lo stato della connessione WebSocket
const ConnectionStatus: React.FC = () => {
  const { connectionStatus, reconnectWebSocket } = useChat();

  // Determina quale icona mostrare in base allo stato
  let icon;
  let color;
  let tooltipText;

  switch (connectionStatus) {
    case "connected":
      icon = <ConnectedIcon />;
      color = "#19eeff";
      tooltipText = "Connesso al server";
      break;
    case "disconnected":
      icon = <DisconnectedIcon />;
      color = "error.main";
      tooltipText = "Disconnesso dal server. Clicca per riconnettere.";
      break;
    case "reconnecting":
      icon = <ReconnectingIcon className="rotating-icon" />;
      color = "warning.main";
      tooltipText = "Tentativo di riconnessione in corso...";
      break;
    default:
      icon = <ConnectedIcon />;
      color = "#19eeff";
      tooltipText = "Connesso al server";
  }

  // Gestisce il click sull'icona (tenta di riconnettersi)
  const handleClick = () => {
    if (connectionStatus === "disconnected") {
      reconnectWebSocket();
    }
  };

  return (
    <Tooltip title={tooltipText} arrow>
      <Box sx={{ display: "inline-flex", ml: 1 }}>
        <IconButton
          size="small"
          onClick={handleClick}
          disabled={
            connectionStatus === "connected" ||
            connectionStatus === "reconnecting"
          }
          sx={{
            color,
            p: 0.5,
            "& .rotating-icon": {
              animation: "spin 2s linear infinite",
              "@keyframes spin": {
                "0%": { transform: "rotate(0deg)" },
                "100%": { transform: "rotate(360deg)" },
              },
            },
          }}
        >
          {icon}
        </IconButton>
      </Box>
    </Tooltip>
  );
};

export default ConnectionStatus;
