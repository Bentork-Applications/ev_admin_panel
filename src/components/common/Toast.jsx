import React, { useEffect } from "react";

export const Toast = ({ message, type = "success", onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  if (!message) return null;

  return (
    <div className={`toast-notification ${type}`}>
      <span className="toast-icon">{type === "success" ? "✓" : "✕"}</span>
      <span>{message}</span>
    </div>
  );
};
