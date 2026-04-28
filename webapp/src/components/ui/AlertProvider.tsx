
import { createPortal } from "react-dom";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { AlertList } from "./AlertList";
import { AlertContext } from "./alertContext";
import type { Alert, AlertType } from "./alertTypes";

// Gestor del sistema de alertas
export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) =>
{
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [topOffset, setTopOffset] = useState<number>(0);

  const showAlert = useCallback((message: string, type: AlertType = "info", ttl = 5000) => {
    const id = `${Date.now()}-${crypto.randomUUID().slice(0, 7)}`;
    const alert: Alert = { id, message, type, ttl };
    setAlerts((s) => [...s, alert]);
  }, []);

  const clearAlert = useCallback((id: string) => {
    setAlerts((s) => s.filter((a) => a.id !== id));
  }, []);

  const dismissById = useCallback((id: string) => {
    setAlerts((s) => s.filter((x) => x.id !== id));
  }, []);

  const scheduleDismiss = useCallback((id: string, ttl: number | undefined) => {
    if (!ttl) return undefined;
    return globalThis.setTimeout(() => {
      dismissById(id);
    }, ttl);
  }, [dismissById]);

  useEffect(() => {
    const timers: Record<string, ReturnType<typeof setTimeout> | undefined> = {};

    for (const a of alerts) {
      if (a.ttl && !timers[a.id]) {
        timers[a.id] = scheduleDismiss(a.id, a.ttl);
      }
    }

    return () => {
      Object.values(timers).forEach((t) => {
        if (t !== undefined) clearTimeout(t);
      });
    };
  }, [alerts, scheduleDismiss]);

  useEffect(() => {
    const computeOffset = () => {
      const nav = document.getElementById("myNav");
      const height = nav ? nav.getBoundingClientRect().height : 56;
      setTopOffset(Math.ceil(height));
    };

    computeOffset();
    window.addEventListener("resize", computeOffset);
    return () => window.removeEventListener("resize", computeOffset);
  }, []);

  const value = useMemo(() => ({ showAlert, clearAlert }), [showAlert, clearAlert]);

  const portalTarget = typeof document === "undefined" ? null : document.body;

  return (
    <AlertContext.Provider value={value}>
      {children}
      {portalTarget && createPortal(<AlertList alerts={alerts} clearAlert={clearAlert} topOffset={topOffset} />, portalTarget)}
    </AlertContext.Provider>
  );
};
