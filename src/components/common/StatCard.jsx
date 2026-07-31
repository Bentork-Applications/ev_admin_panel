import React from "react";

export const StatCard = ({ label, icon: Icon, value, subtitle, iconBg = "#EFF6FF", iconColor = "#2563EB", loading = false }) => {
  return (
    <div style={{ background: "#FFFFFF", padding: "20px", borderRadius: "12px", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "13px", color: "#6B7280", fontWeight: 500 }}>{label}</span>
        {Icon && (
          <div style={{ padding: "8px", background: iconBg, borderRadius: "8px", color: iconColor }}>
            <Icon size={20} />
          </div>
        )}
      </div>
      <div style={{ fontSize: "28px", fontWeight: 700, color: "#111827", marginTop: "12px" }}>
        {loading ? "..." : value}
      </div>
      {subtitle && (
        <span style={{ fontSize: "12px", color: iconColor, fontWeight: 500, marginTop: "4px", display: "inline-block" }}>
          {subtitle}
        </span>
      )}
    </div>
  );
};
