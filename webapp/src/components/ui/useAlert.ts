
import { useContext } from "react";
import { AlertContext } from "./alertContext";

// Hook para acceder al portal de notificaciones
export const useAlert = () =>
{
  const ctx = useContext(AlertContext);
  if (ctx) return ctx;
  throw new Error("useAlert must be used within AlertProvider");
};
