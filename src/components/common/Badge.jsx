import React from "react";
import { getStatusBadgeConfig, getPriorityBadgeConfig } from "../../config/orderConfig";

export const StatusBadge = ({ status }) => {
  const config = getStatusBadgeConfig(status);
  return (
    <span
      className="badge-pill font-medium"
      style={{
        background: config.bg,
        color: config.fg,
        border: `1px solid ${config.border}`
      }}
    >
      {config.label}
    </span>
  );
};

export const PriorityBadge = ({ priority }) => {
  const config = getPriorityBadgeConfig(priority);
  return (
    <span
      className="badge-pill"
      style={{
        background: config.bg,
        color: config.fg,
        fontSize: "11px",
        fontWeight: 600
      }}
    >
      {config.label}
    </span>
  );
};
