import React from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";

export default function ChargerTable() {
  const data = [
    {
      id: "123456",
      stationId: "Text Goes Here",
      ocpp: "OCPP-01",
      connector: "CSS2",
      type: "DC",
      rate: "$8.50",
      chargeMode: "Fast",
      status: "Available",
      availability: "Online",
    },
    {
      id: "123456",
      stationId: "Text Goes Here",
      ocpp: "OCPP-02",
      connector: "Type2",
      type: "AC",
      rate: "$8.50",
      chargeMode: "Standard",
      status: "Available",
      availability: "Offline",
    },
  ];

  const getTypeStyle = (type) => ({
    background: type === "DC" ? "#111" : "#f4f4f5",
    color: type === "DC" ? "#fff" : "#111",
    borderRadius: "20px",
    padding: "4px 12px",
    fontWeight: 500,
  });

  const getChargeModeStyle = (mode) => ({
    background: mode === "Fast" ? "#dbeafe" : "#dbeafe",
    color: "#1d4ed8",
    borderRadius: "20px",
    padding: "4px 12px",
    fontWeight: 500,
  });

  const getAvailabilityStyle = (availability) => ({
    background: availability === "Online" ? "#dcfce7" : "#fee2e2",
    color: availability === "Online" ? "#166534" : "#b91c1c",
    borderRadius: "20px",
    padding: "4px 12px",
    fontWeight: 500,
  });

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "16px",
        padding: "24px",
        fontFamily: "'Inter', sans-serif",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
      }}
    >
      <h2 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "16px" }}>
        Chargers
      </h2>

      <table
        style={{
          width: "100%",
          borderCollapse: "separate",
          borderSpacing: 0,
          fontSize: "15px",
        }}
      >
        <thead>
          <tr style={{ borderBottom: "2px solid #f3f4f6" }}>
            <th style={thStyle}>ID</th>
            <th style={thStyle}>Station ID</th>
            <th style={thStyle}>OCPP ID</th>
            <th style={thStyle}>Connector</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Rate</th>
            <th style={thStyle}>Charge Mode</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Availability</th>
            <th style={thStyle}>Action</th>
          </tr>
        </thead>

        <tbody>
          {data.map((row, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
              <td style={tdStyle}>{row.id}</td>
              <td style={tdStyle}>{row.stationId}</td>
              <td style={{ ...tdStyle }}>
                <Eye size={18} style={{ cursor: "pointer" }} />
              </td>
              <td style={tdStyle}>
                <span
                  style={{
                    border: "1px solid #d1d5db",
                    padding: "4px 12px",
                    borderRadius: "8px",
                  }}
                >
                  {row.connector}
                </span>
              </td>
              <td style={tdStyle}>
                <span style={getTypeStyle(row.type)}>{row.type}</span>
              </td>
              <td style={tdStyle}>{row.rate}</td>
              <td style={tdStyle}>
                <span style={getChargeModeStyle(row.chargeMode)}>
                  {row.chargeMode}
                </span>
              </td>
              <td style={tdStyle}>{row.status}</td>
              <td style={tdStyle}>
                <span style={getAvailabilityStyle(row.availability)}>
                  {row.availability}
                </span>
              </td>
              <td style={{ ...tdStyle, display: "flex", gap: "10px" }}>
                <Pencil size={18} style={{ cursor: "pointer" }} />
                <Trash2 size={18} style={{ cursor: "pointer" }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const thStyle = {
  textAlign: "left",
  padding: "12px 16px",
  fontWeight: 600,
  color: "#374151",
};

const tdStyle = {
  padding: "12px 16px",
  color: "#111827",
};
