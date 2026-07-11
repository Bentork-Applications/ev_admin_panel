import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const OverviewChart = ({ users, revenue, sessions, energy }) => {
  const latestData = {
    users: Number(users?.toString().replace(/,/g, "")) || 0,
    revenue: Number(revenue?.toString().replace(/[₹,]/g, "")) || 0,
    sessions: Number(sessions?.toString().replace(/,/g, "")) || 0,
    energy: Number(energy?.toString().replace(/[^\d]/g, "")) || 0,
  };

  const chartData = useMemo(() => [
    { name: "Mon", Users: Math.floor(latestData.users * 0.7), Revenue: latestData.revenue * 0.6, Sessions: Math.floor(latestData.sessions * 0.5), Units: latestData.energy * 0.4 },
    { name: "Tue", Users: Math.floor(latestData.users * 0.8), Revenue: latestData.revenue * 0.75, Sessions: Math.floor(latestData.sessions * 0.7), Units: latestData.energy * 0.6 },
    { name: "Wed", Users: Math.floor(latestData.users * 0.85), Revenue: latestData.revenue * 0.7, Sessions: Math.floor(latestData.sessions * 0.65), Units: latestData.energy * 0.8 },
    { name: "Thu", Users: Math.floor(latestData.users * 0.9), Revenue: latestData.revenue * 0.9, Sessions: Math.floor(latestData.sessions * 0.85), Units: latestData.energy * 0.7 },
    { name: "Fri", Users: Math.floor(latestData.users * 0.95), Revenue: latestData.revenue * 0.85, Sessions: Math.floor(latestData.sessions * 0.9), Units: latestData.energy * 0.95 },
    { name: "Sat", Users: Math.floor(latestData.users * 0.98), Revenue: latestData.revenue * 0.95, Sessions: Math.floor(latestData.sessions * 0.95), Units: latestData.energy * 1.1 },
    { name: "Sun", Users: latestData.users, Revenue: latestData.revenue, Sessions: latestData.sessions, Units: latestData.energy },
  ], [latestData.users, latestData.revenue, latestData.sessions, latestData.energy]);

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "16px",
        padding: "24px",
        marginTop: "20px",
        border: "1px solid #e5e7eb",
      }}
    >
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2
          style={{
            fontSize: "18px",
            fontWeight: "600",
            color: "#111827",
            margin: 0
          }}
        >
          Overview
        </h2>
        <select style={{
          padding: "6px 12px",
          borderRadius: "6px",
          border: "1px solid #E5E7EB",
          background: "#fff",
          fontSize: "12px",
          color: "#374151",
          fontWeight: "500",
          outline: "none",
          cursor: "pointer"
        }}>
          <option>Last 7 Days (Jul 4-10)</option>
        </select>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />

          <Line
            type="monotone"
            dataKey="Users"
            stroke="#27C786"
            strokeWidth={2.5}
            dot={false}
          />

          <Line
            type="monotone"
            dataKey="Revenue"
            stroke="#111827"
            strokeWidth={2.5}
            dot={false}
          />

          <Line
            type="monotone"
            dataKey="Sessions"
            stroke="#6B7280"
            strokeWidth={2.5}
            dot={false}
          />

          <Line
            type="monotone"
            dataKey="Units"
            stroke="#05B86B"
            strokeWidth={2.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default OverviewChart;
