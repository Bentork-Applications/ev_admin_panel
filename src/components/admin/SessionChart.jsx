import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Custom Tooltip matching the design system
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: "#fff",
        border: "1px solid #E5E7EB",
        borderRadius: "10px",
        padding: "10px 14px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
        fontFamily: "'Lexend', sans-serif",
        fontSize: "13px",
      }}>
        <p style={{ margin: "0 0 8px", fontWeight: 700, color: "#111827", fontSize: "12px" }}>{label}</p>
        {payload.map((entry, i) => (
          <p key={i} style={{ margin: "3px 0", color: entry.color, fontWeight: 600 }}>
            {entry.name}: <span style={{ color: "#111827" }}>{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function SessionChart({ data = [] }) {
  return (
    <div className="sc-container">
      <style>{`
        .sc-container {
          background: #ffffff;
          border: 1px solid #E5E7EB;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          margin-bottom: 24px;
          font-family: 'Lexend', sans-serif;
          transition: box-shadow 0.3s ease;
        }
        .sc-container:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.06);
        }
        .sc-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid #F3F4F6;
          flex-wrap: wrap;
          gap: 12px;
        }
        .sc-title-group {}
        .sc-title {
          font-size: 16px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 3px 0;
        }
        .sc-subtitle {
          font-size: 13px;
          color: #6B7280;
          font-weight: 500;
          margin: 0;
        }
        .sc-legend {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          align-items: center;
        }
        .sc-legend-item {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 12px;
          font-weight: 600;
          color: #4B5563;
        }
        .sc-legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .sc-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 280px;
          color: #9CA3AF;
          gap: 10px;
        }
        .sc-empty-icon {
          width: 48px; height: 48px;
          background: #F3F4F6;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
        }
        .sc-empty-text { font-size: 14px; font-weight: 500; }
      `}</style>

      <div className="sc-header">
        <div className="sc-title-group">
          <h3 className="sc-title">Session Trends</h3>
          <p className="sc-subtitle">Monthly session count and energy consumption</p>
        </div>
        <div className="sc-legend">
          <span className="sc-legend-item">
            <span className="sc-legend-dot" style={{ background: "#6366f1" }} />
            Total Sessions
          </span>
          <span className="sc-legend-item">
            <span className="sc-legend-dot" style={{ background: "#10b981" }} />
            Energy (kWh)
          </span>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="sc-empty">
          <div className="sc-empty-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <p className="sc-empty-text">No trend data to display</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#6B7280", fontSize: 12, fontFamily: "'Lexend', sans-serif" }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#6B7280", fontSize: 12, fontFamily: "'Lexend', sans-serif" }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#6366f1"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#6366f1", strokeWidth: 2, stroke: "#fff" }}
              activeDot={{ r: 6, strokeWidth: 0, fill: "#6366f1" }}
              name="Total Sessions"
            />
            <Line
              type="monotone"
              dataKey="energy"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }}
              activeDot={{ r: 6, strokeWidth: 0, fill: "#10b981" }}
              name="Energy (kWh)"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
