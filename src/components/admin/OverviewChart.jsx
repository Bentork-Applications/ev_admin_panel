import React, { useState, useEffect } from "react";
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
  { name: "Revenue", 2020: 15, 2021: 38, 2022: 20 },
  { name: "Users", 2020: 30, 2021: 40, 2022: 60 },
  { name: "Sessions", 2020: 80, 2021: 50, 2022: 40 },
  { name: "Units", 2020: 90, 2021: 60, 2022: 50 },
];

export default function OverviewChart() {
  const [data, setData] = useState([]);
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "20px",
        padding: "24px",
        marginTop: "20px",
      }}
    >
      <h2 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "20px" }}>
        Overview
      </h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis activeDot=" name" />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="2020"
            stroke="#6366f1"
            strokeWidth={3}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="2021"
            stroke="#f87171"
            strokeWidth={3}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="2022"
            stroke="#16d5f3ff"
            strokeWidth={3}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
