import React from "react";

export const LEAD_STATUS_CONFIG = {
  NEW: { label: "New", bg: "#EFF6FF", fg: "#1D4ED8", border: "#BFDBFE" },
  CONTACTED: { label: "Contacted", bg: "#FEF3C7", fg: "#B45309", border: "#FDE68A" },
  QUALIFIED: { label: "Qualified", bg: "#ECFDF5", fg: "#047857", border: "#A7F3D0" },
  NURTURE: { label: "Nurture", bg: "#F3E8FF", fg: "#6B21A8", border: "#E9D5FF" },
  CONVERTED: { label: "Converted", bg: "#F0FDF4", fg: "#15803D", border: "#BBF7D0" },
  LOST: { label: "Lost", bg: "#FEF2F2", fg: "#B91C1C", border: "#FECACA" }
};

export const OPP_STAGE_CONFIG = {
  QUALIFIED: { label: "Qualified", bg: "#EFF6FF", fg: "#1D4ED8", border: "#BFDBFE" },
  REQUIREMENT: { label: "Requirement", bg: "#E0E7FF", fg: "#3730A3", border: "#C7D2FE" },
  PROPOSAL: { label: "Proposal", bg: "#FEF3C7", fg: "#B45309", border: "#FDE68A" },
  NEGOTIATION: { label: "Negotiation", bg: "#FFEDD5", fg: "#C2410C", border: "#FED7AA" },
  WON: { label: "Closed Won", bg: "#ECFDF5", fg: "#047857", border: "#A7F3D0" },
  LOST: { label: "Closed Lost", bg: "#FEF2F2", fg: "#B91C1C", border: "#FECACA" }
};

export const QUOTE_STATUS_CONFIG = {
  DRAFT: { label: "Draft", bg: "#F3F4F6", fg: "#4B5563", border: "#E5E7EB" },
  SENT: { label: "Sent", bg: "#EFF6FF", fg: "#1D4ED8", border: "#BFDBFE" },
  ACCEPTED: { label: "Accepted", bg: "#ECFDF5", fg: "#047857", border: "#A7F3D0" },
  REJECTED: { label: "Rejected", bg: "#FEF2F2", fg: "#B91C1C", border: "#FECACA" }
};

export const ACTIVITY_TYPE_CONFIG = {
  call: { label: "Call", icon: "📞", color: "#3B82F6", bg: "#EFF6FF" },
  meeting: { label: "Meeting", icon: "🤝", color: "#8B5CF6", bg: "#F5F3FF" },
  email: { label: "Email", icon: "✉️", color: "#EC4899", bg: "#FDF2F8" },
  follow_up: { label: "Follow-up", icon: "⏰", color: "#F59E0B", bg: "#FFFBEB" },
  note: { label: "Note", icon: "📝", color: "#10B981", bg: "#ECFDF5" }
};

export const LeadStatusBadge = ({ status }) => {
  const normalized = (status || "NEW").toUpperCase();
  const config = LEAD_STATUS_CONFIG[normalized] || {
    label: status || "Unknown",
    bg: "#F3F4F6",
    fg: "#4B5563",
    border: "#E5E7EB"
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "3px 9px",
        borderRadius: "9999px",
        fontSize: "11px",
        fontWeight: 600,
        backgroundColor: config.bg,
        color: config.fg,
        border: `1px solid ${config.border}`,
        whiteSpace: "nowrap",
        letterSpacing: "0.02em"
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          backgroundColor: config.fg
        }}
      />
      {config.label}
    </span>
  );
};

export const OpportunityStageBadge = ({ stage }) => {
  const normalized = (stage || "QUALIFIED").toUpperCase();
  const config = OPP_STAGE_CONFIG[normalized] || {
    label: stage || "Unknown",
    bg: "#F3F4F6",
    fg: "#4B5563",
    border: "#E5E7EB"
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "3px 9px",
        borderRadius: "9999px",
        fontSize: "11px",
        fontWeight: 600,
        backgroundColor: config.bg,
        color: config.fg,
        border: `1px solid ${config.border}`,
        whiteSpace: "nowrap"
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          backgroundColor: config.fg
        }}
      />
      {config.label}
    </span>
  );
};

export const QuotationStatusBadge = ({ status }) => {
  const normalized = (status || "DRAFT").toUpperCase();
  const config = QUOTE_STATUS_CONFIG[normalized] || {
    label: status || "Unknown",
    bg: "#F3F4F6",
    fg: "#4B5563",
    border: "#E5E7EB"
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "3px 9px",
        borderRadius: "9999px",
        fontSize: "11px",
        fontWeight: 600,
        backgroundColor: config.bg,
        color: config.fg,
        border: `1px solid ${config.border}`,
        whiteSpace: "nowrap"
      }}
    >
      {config.label}
    </span>
  );
};

export const ActivityTypeBadge = ({ type }) => {
  const normalized = (type || "note").toLowerCase();
  const config = ACTIVITY_TYPE_CONFIG[normalized] || ACTIVITY_TYPE_CONFIG.note;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "2px 8px",
        borderRadius: "6px",
        fontSize: "11px",
        fontWeight: 600,
        backgroundColor: config.bg,
        color: config.color
      }}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
};
