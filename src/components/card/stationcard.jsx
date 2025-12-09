import React from "react";

function DashboardCard({ title, value, subtitle, icon }) {
  return (
    <div
      style={{
        width: "253px",
        height: "90px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        borderRadius: "14px",
        border: "0.2px solid #ddd",
        padding: "15px 28px",
        fontFamily: "Roboto, sans-serif",
        backgroundColor: "#fff",
      }}
    >
      {/* Title + Icon */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontWeight: 400,
            lineHeight: "153%",
            color: "#333",
          }}
        >
          {title}
        </span>
        <img src={icon} alt="icon" style={{ width: "19px", height: "19px" }} />
      </div>

      {/* Value + Subtitle stacked */}
      <div style={{ display: "flex", flexDirection: "column", marginTop: "5px" }}>
        <div style={{ fontSize: "22px", fontWeight: "600" }}>{value}</div>
        <div
          style={{
            fontSize: "12px",
            fontWeight: 400,
            lineHeight: "160%",
            color: "#666",
          }}
        >
          {subtitle}
        </div>
      </div>
    </div>
  );
}

export default DashboardCard;
