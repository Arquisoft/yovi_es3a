export type AlertType = "success" | "error" | "info";

export interface Alert {
  id: string;
  message: string;
  type?: AlertType;
  ttl?: number;
}

export interface AlertContextValue {
  showAlert: (message: string, type?: AlertType, ttl?: number) => void;
  clearAlert: (id: string) => void;
}
