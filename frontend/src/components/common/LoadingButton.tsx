import React from "react";
import { Button, ButtonProps, CircularProgress } from "@mui/material";

interface LoadingButtonProps extends ButtonProps {
  loading: boolean;
  startIcon?: React.ReactNode;
  loadingPosition?: "start" | "center" | "end";
}

// Componente per mostrare un pulsante con stato di caricamento
const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading,
  children,
  startIcon,
  loadingPosition = "center",
  disabled,
  ...rest
}) => {
  // Determina se mostrare l'icona iniziale
  const showStartIcon = startIcon && (!loading || loadingPosition !== "start");

  // Dimensione dello spinner
  const spinnerSize = 24;

  return (
    <Button
      {...rest}
      disabled={disabled || loading}
      startIcon={showStartIcon ? startIcon : undefined}
      sx={{
        position: "relative",
        "& .MuiCircularProgress-root": {
          color: "#19eeff",
        },
        ...rest.sx,
      }}
    >
      {loading && loadingPosition === "center" && (
        <CircularProgress
          size={spinnerSize}
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            marginTop: `-${spinnerSize / 2}px`,
            marginLeft: `-${spinnerSize / 2}px`,
          }}
        />
      )}

      {loading && loadingPosition === "start" && (
        <CircularProgress
          size={20}
          sx={{
            position: "absolute",
            left: 14,
            top: "50%",
            marginTop: "-10px",
          }}
        />
      )}

      {loading && loadingPosition === "end" && (
        <CircularProgress
          size={20}
          sx={{
            position: "absolute",
            right: 14,
            top: "50%",
            marginTop: "-10px",
          }}
        />
      )}

      <span
        style={{
          visibility:
            loading && loadingPosition === "center" ? "hidden" : "visible",
        }}
      >
        {children}
      </span>
    </Button>
  );
};

export default LoadingButton;
