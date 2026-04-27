import { createContext } from "react";
import type { AlertContextValue } from "./alertTypes";

export const AlertContext = createContext<AlertContextValue | null>(null);
