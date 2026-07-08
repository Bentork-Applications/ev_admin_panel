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

export default function SessionChart({ data = [] }) {
  return (
    <div className="sc-container">
      <style>{`
        .sc-container {
          background-color: #fff;
          padding: 24px;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          margin: 24px 0;
          font-family: 'Lexend', sans-serif;
        }
        .sc-title {
          font-size: 18px;
          font-weight: 700;
          margin: 0 0 20px 0;
          color: #111;
        }
      `}</style>
      <h2 className="sc-title">Session Trends</h2>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
          <XAxis 
            dataKey="month" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#6B7280', fontSize: 12 }}
            dy={10}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#6B7280', fontSize: 12 }}
          />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#6366f1"
            strokeWidth={3}
            dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 6, strokeWidth: 0 }}
            name="Total Sessions"
          />
          <Line
            type="monotone"
            dataKey="energy"
            stroke="#10b981"
            strokeWidth={3}
            dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 6, strokeWidth: 0 }}
            name="Energy (kWh)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
