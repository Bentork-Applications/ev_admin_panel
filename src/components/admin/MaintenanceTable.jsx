import React, { useState } from "react";

export default function MaintenanceTable() {
  const [activeTab, setActiveTab] = useState("manual");

  const data = [
    {
      id: "S-82037173",
      station: "Highway Rest A",
      charger: "Charger #11",
      issue: "Power Surge",
      reported: "1 hrs ago",
      status: "Error",
      respondedBy: "Emergency Team A",
    },
    {
      id: "S-82037173",
      station: "Highway Rest B",
      charger: "Charger #13",
      issue: "Power Surge",
      reported: "1 hrs ago",
      status: "Error",
      respondedBy: "Emergency Team A",
    },
    {
      id: "S-82037173",
      station: "Highway Rest C",
      charger: "Charger #119",
      issue: "Power Surge",
      reported: "2 hrs ago",
      status: "Error",
      respondedBy: "Emergency Team A",
    },
    {
      id: "S-82037173",
      station: "Highway Rest D",
      charger: "Charger #111",
      issue: "Power Surge",
      reported: "4 hrs ago",
      status: "Error",
      respondedBy: "Emergency Team A",
    },
  ];

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "16px",
        padding: "20px",
        marginTop: "20px",
        fontFamily: "'Inter', sans-serif",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
      }}
    >
      {/* Header Section */}
      <div style={{ marginBottom: "16px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700" }}>🛠 Maintenance</h2>
        <p style={{ fontSize: "13px", color: "#6b7280" }}>
          Track scheduled and manual maintenance activities
        </p>
        <div
          style={{
            display: "flex",
            borderRadius: "12px",
            border: "2px dashed #d1d5db",
            marginTop: "12px",
            width: "250px",
          }}
        >
          <button
            onClick={() => setActiveTab("manual")}
            style={{
              flex: 1,
              background: activeTab === "manual" ? "#111" : "transparent",
              color: activeTab === "manual" ? "#fff" : "#000",
              border: "none",
              padding: "8px 0",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Manual
          </button>
          <button
            onClick={() => setActiveTab("automatic")}
            style={{
              flex: 1,
              background: activeTab === "automatic" ? "#111" : "transparent",
              color: activeTab === "automatic" ? "#fff" : "#000",
              border: "none",
              padding: "8px 0",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Automatic
          </button>
        </div>

        {/* Tabs */}
        {/* <div
          style={{
            display: "flex",
            borderRadius: "12px",
            border: "2px dashed #d1d5db",
            marginTop: "12px",
            width: "250px",
          }}
        >
          <button
            onClick={() => setActiveTab("manual")}
            style={{
              flex: 1,
              background: activeTab === "manual" ? "#111" : "transparent",
              color: activeTab === "manual" ? "#fff" : "#000",
              border: "none",
              padding: "8px 0",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Manual
          </button>
          <button
            onClick={() => setActiveTab("automatic")}
            style={{
              flex: 1,
              background: activeTab === "automatic" ? "#111" : "transparent",
              color: activeTab === "automatic" ? "#fff" : "#000",
              border: "none",
              padding: "8px 0",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Automatic
          </button>
        </div> */}
      </div>

      {/* Table Section */}
      <table
        style={{
          width: "100%",
          borderCollapse: "separate",
          borderSpacing: 0,
          fontSize: "14px",
        }}
      >
        <thead>
          <tr style={{ borderBottom: "2px solid #f3f4f6" }}>
            <th style={thStyle}>ID</th>
            <th style={thStyle}>Station</th>
            <th style={thStyle}>Charger</th>
            <th style={thStyle}>Issue</th>
            <th style={thStyle}>Reported</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Responded By</th>
            <th style={thStyle}>Action</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
              <td style={tdStyle}>{row.id}</td>
              <td style={tdStyle}>{row.station}</td>
              <td style={tdStyle}>{row.charger}</td>
              <td style={tdStyle}>{row.issue}</td>
              <td style={tdStyle}>{row.reported}</td>
              <td style={tdStyle}>
                <span
                  style={{
                    backgroundColor: "#fee2e2",
                    color: "#b91c1c",
                    padding: "4px 12px",
                    borderRadius: "9999px",
                    fontWeight: 500,
                  }}
                >
                  {row.status}
                </span>
              </td>
              <td style={tdStyle}>{row.respondedBy}</td>
              <td style={tdStyle}>
                <button
                  style={{
                    border: "1px solid #d1d5db",
                    background: "#fff",
                    borderRadius: "8px",
                    padding: "5px 12px",
                    cursor: "pointer",
                  }}
                >
                  Details
                </button>
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
