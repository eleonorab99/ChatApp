import React from "react";
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  Badge,
  Divider,
} from "@mui/material";
import { AccountCircle } from "@mui/icons-material";
import useChat from "../../hooks/useChat";
import useAuth from "../../hooks/useAuth";
import { OnlineUser } from "../../types/chat.types";
import { useTranslation } from "react-i18next";

// Componente per la lista degli utenti online
const UserList: React.FC = () => {
  const { onlineUsers, currentRecipient, setCurrentRecipient, unreadCounts } =
    useChat();
  const { user } = useAuth();
  const { t } = useTranslation();

  // Seleziona un utente come destinatario
  const handleSelectUser = (selectedUser: OnlineUser) => {
    setCurrentRecipient(selectedUser);
  };

  // Filtra l'utente corrente dalla lista online
  let filteredUsers = onlineUsers.filter(
    (onlineUser) => user && onlineUser.userId !== user.id
  );

  // Rimuovi la logica per aggiungere un destinatario non specifico
  if (
    currentRecipient &&
    !filteredUsers.some((u) => u.userId === currentRecipient.userId) &&
    user &&
    currentRecipient.userId !== user.id
  ) {
    filteredUsers = [currentRecipient, ...filteredUsers];
  }

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        backgroundColor: "background.paper",
        borderRight: 1,
        borderColor: "divider",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Typography
        variant="h6"
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: "divider",
          backgroundColor: "grey.100",
        }}
      >
        {t("messageInput.utenti")}
      </Typography>

      <List
        sx={{
          width: "100%",
          overflowY: "auto",
          flex: 1,
        }}
      >
        <Divider component="li" />

        {filteredUsers.length === 0 ? (
          <Box sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              {t("messageInput.nessunUtente")}
            </Typography>
          </Box>
        ) : (
          filteredUsers.map((onlineUser) => (
            <ListItem key={onlineUser.userId} disablePadding>
              <ListItemButton
                selected={currentRecipient?.userId === onlineUser.userId}
                onClick={() => handleSelectUser(onlineUser)}
                sx={{
                  borderRadius: 0,
                  "&.Mui-selected": {
                    backgroundColor: "action.selected",
                  },
                }}
              >
                <ListItemAvatar>
                  <Avatar>
                    <AccountCircle />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Typography component="span" sx={{ flexGrow: 1 }}>
                        {onlineUser.username}
                      </Typography>
                      {unreadCounts[onlineUser.userId] > 0 && (
                        <Badge
                          badgeContent={unreadCounts[onlineUser.userId]}
                          color="error"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Box>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))
        )}
      </List>
    </Box>
  );
};

export default UserList;
