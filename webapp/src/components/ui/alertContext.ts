
import { createContext } from "react";
import type { AlertContextValue } from "./alertTypes";

// Contexto del portal de notificaciones
export const AlertContext = createContext<AlertContextValue | null>(null);
