/**
 * Centralized Order & Role Configuration Maps (Open/Closed Principle)
 */

export const ORDER_STATUS_CONFIG = {
  sales_registered: {
    label: "Sales Registered",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "#BFDBFE",
    fg: "#1D4ED8",
    color: "#2563EB"
  },
  in_production: {
    label: "In Production",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "#FDE68A",
    fg: "#B45309",
    color: "#D97706"
  },
  production_complete: {
    label: "Production Complete",
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "#E9D5FF",
    fg: "#6B21A8",
    color: "#7C3AED"
  },
  scm_complete: {
    label: "SCM Complete",
    bg: "bg-teal-50",
    text: "text-teal-700",
    border: "#99F6E4",
    fg: "#0F766E",
    color: "#0F766E"
  },
  dispatched: {
    label: "Dispatched",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "#A7F3D0",
    fg: "#047857",
    color: "#059669"
  }
};

export const PRIORITY_CONFIG = {
  urgent: { label: "Urgent", color: "#DC2626", bg: "#FEF2F2", fg: "#DC2626" },
  high: { label: "High", color: "#EA580C", bg: "#FFEDD5", fg: "#EA580C" },
  medium: { label: "Medium", color: "#D97706", bg: "#FEF3C7", fg: "#D97706" },
  low: { label: "Low", color: "#2563EB", bg: "#EFF6FF", fg: "#2563EB" }
};

export const getStatusBadgeConfig = (status) => {
  return ORDER_STATUS_CONFIG[status] || {
    label: status ? status.replace("_", " ") : "Unknown",
    bg: "bg-gray-50",
    text: "text-gray-700",
    border: "#E5E7EB",
    fg: "#374151",
    color: "#6B7280"
  };
};

export const getPriorityBadgeConfig = (priority) => {
  return PRIORITY_CONFIG[priority?.toLowerCase()] || {
    label: priority || "Normal",
    color: "#6B7280",
    bg: "#F3F4F6",
    fg: "#4B5563"
  };
};
