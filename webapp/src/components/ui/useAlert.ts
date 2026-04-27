import { useContext } from "react";
import { AlertContext } from "./alertContext";

export const useAlert = () => {
  const ctx = useContext(AlertContext);
  if (ctx) return ctx;
  throw new Error("useAlert must be used within AlertProvider");
};
