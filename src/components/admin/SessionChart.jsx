import React from "react";
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

const data = [
  { date: "2025-10-29", total: 80, active: 18, uptime: 72, errors: 6 },
  { date: "2025-10-30", total: 87, active: 19, uptime: 74, errors: 4 },
  { date: "2025-10-31", total: 95, active: 21, uptime: 76, errors: 3 },
  { date: "2025-11-01", total: 98, active: 22, uptime: 77, errors: 2 },
  { date: "2025-11-02", total: 100, active: 23, uptime: 78, errors: 3 },
  { date: "2025-11-03", total: 102, active: 23, uptime: 76, errors: 3 },
  { date: "2025-11-04", total: 104, active: 24, uptime: 79, errors: 2 },
];

export default function SessionChart() {
  const styles = {
    container: {
      backgroundColor: "#fff",
      padding: "20px",
      borderRadius: "16px",
      boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
      margin: "20px",
      fontFamily: "sans-serif",width: "1140px",
            minHeight: "324px",
    
    },
    title: {
      fontSize: "1.5rem",
      fontWeight: "700",
      marginBottom: "10px",
      color: "#000"   },
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Session Overview</h2>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data} margin={{ top: 20, right: 40, left: 10, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="total"
            stroke="#7c3aed"
            activeDot={{ r: 8 }}
            name="Total Sessions"
          />
          <Line
            type="monotone"
            dataKey="active"
            stroke="#06b6d4"
            name="Active Sessions"
          />
          <Line
            type="monotone"
            dataKey="uptime"
            stroke="#f97316"
            name="Average Uptime (%)"
          />
          <Line
            type="monotone"
            dataKey="errors"
            stroke="#ef4444"
            name="Errors Reported"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
