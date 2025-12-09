import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";

const data = [
  { date: "2025-10-29", uptime: 74, activeStations: 72, errors: 5 },
  { date: "2025-10-30", uptime: 76, activeStations: 75, errors: 3 },
  { date: "2025-10-31", uptime: 78, activeStations: 76, errors: 2 },
  { date: "2025-11-01", uptime: 75, activeStations: 74, errors: 4 },
  { date: "2025-11-02", uptime: 80, activeStations: 77, errors: 1 },
  { date: "2025-11-03", uptime: 82, activeStations: 78, errors: 2 },
  { date: "2025-11-04", uptime: 84, activeStations: 80, errors: 1 },
];

export default function StationOverviewChart() {
  return (
    <div
      style={{
        backgroundColor: "#fff",
        border: "1px solid #ccc",
        borderRadius: "8px",
        padding: "20px",
        width: "100%",
        maxWidth: "900px",
        margin: "20px auto",
        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
        }}
      >
        <h2 style={{ fontSize: "20px", color: "#333", margin: 0 }}>
          System Health Overview
        </h2>
        <span style={{ fontSize: "14px", color: "#666" }}>Last 7 Days</span>
      </div>

      <p style={{ fontSize: "14px", color: "#555", marginBottom: "15px" }}>
        Real-time monitoring of station performance
      </p>

      <div style={{ width: "100%", height: "350px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
            <XAxis dataKey="date" tick={{ fill: "#666" }} />
            <YAxis tick={{ fill: "#666" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #ddd",
                borderRadius: "5px",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="uptime"
              stroke="#7c3aed"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name="Uptime (%)"
            />
            <Line
              type="monotone"
              dataKey="activeStations"
              stroke="#14b8a6"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name="Active Stations"
            />
            <Line
              type="monotone"
              dataKey="errors"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name="Error Count"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
