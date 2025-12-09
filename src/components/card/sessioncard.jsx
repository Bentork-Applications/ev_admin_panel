import React from "react";

function SessionCard({ title, value, subtitle, icon }) {
  return (
    <div
      style={{
        width: "285px",
        height: "142px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        borderRadius: "14px",
        border: "0.5px solid #E0E0E0",
        backgroundColor: "#FFFFFF",
        padding: "18px 22px",
        fontFamily: "Roboto, sans-serif",
        boxSizing: "border-box",
      }}
    >
      {/* Title and Icon (Top Row) */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <span
          style={{
            fontSize: "14px",
            fontWeight: 500,
            color: "#1A1A1A",
          }}
        >
          {title}
        </span>
        <img
          src={icon}
          alt="icon"
          style={{ width: "22px", height: "22px", objectFit: "contain" }}
        />
      </div>

      {/* Value and Subtitle */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: "10px",
        }}
      >
        <span
          style={{
            fontSize: "32px",
            fontWeight: "700",
            color: "#000000",
            lineHeight: "1.2",
          }}
        >
          {value}
        </span>
        {subtitle && (
          <span
            style={{
              fontSize: "13px",
              color: "#666666",
              marginTop: "6px",
            }}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}

export default SessionCard;
