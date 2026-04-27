import React from "react";
import type { Alert, AlertType } from "./alertTypes";

interface Props {
  alerts: Alert[];
  clearAlert: (id: string) => void;
  topOffset: number;
}

function alertClass(type?: AlertType): string {
  if (type === "error") return "danger";
  if (type === "success") return "success";
  return "secondary";
}

function iconClass(type?: AlertType): string {
  if (type === "success") return "bi-check-circle-fill";
  if (type === "error") return "bi-exclamation-triangle-fill";
  return "bi-info-circle-fill";
}

export const AlertList: React.FC<Props> = ({ alerts, clearAlert, topOffset }) => {
  return (
    <div
      className="alert-portal-wrapper"
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: "fixed",
        top: `${topOffset}px`,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        zIndex: 2000,
        pointerEvents: "none",
      }}
    >
      <div style={{ width: "100%", maxWidth: 980, padding: "0.5rem", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
        {alerts.map((a) => (
          <div
            key={a.id}
            className={`alert alert-${alertClass(a.type)} alert-dismissible fade show d-flex align-items-center border-0 bg-opacity-10 small`}
            role="alert"
            style={{ pointerEvents: "auto", width: "100%" }}
          >
            <i className={`bi ${iconClass(a.type)} me-2`}></i>
            <div style={{ flex: 1 }}>{a.message}</div>
            <button type="button" className="btn-close small" aria-label="Close" onClick={() => clearAlert(a.id)}></button>
          </div>
        ))}
      </div>
    </div>
  );
};
