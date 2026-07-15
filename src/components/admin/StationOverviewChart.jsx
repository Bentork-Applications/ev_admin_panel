import React, { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Helper to generate data points based on selection
const generateData = (range) => {
  const data = [];
  const now = new Date();
  
  if (range === "24h") {
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 60 * 60 * 1000);
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', hour12: false });
      data.push({
        label: `${timeStr}:00`,
        uptime: Math.round(92 + Math.random() * 7),
        activeStations: Math.round(76 + Math.random() * 4),
        errors: Math.round(Math.random() * 2),
      });
    }
  } else if (range === "7d") {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      data.push({
        label: dateStr,
        uptime: Math.round(89 + Math.random() * 10),
        activeStations: Math.round(74 + Math.random() * 6),
        errors: Math.round(Math.random() * 3),
      });
    }
  } else if (range === "30d") {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      data.push({
        label: dateStr,
        uptime: Math.round(85 + Math.random() * 14),
        activeStations: Math.round(70 + Math.random() * 10),
        errors: Math.round(Math.random() * 5),
      });
    }
  } else {
    // Custom Range (14 Days)
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      data.push({
        label: dateStr,
        uptime: Math.round(88 + Math.random() * 11),
        activeStations: Math.round(72 + Math.random() * 8),
        errors: Math.round(Math.random() * 4),
      });
    }
  }
  return data;
};

export default function StationOverviewChart() {
  const [timeRange, setTimeRange] = useState("7d");
  const [hoveredSeries, setHoveredSeries] = useState(null);

  const chartData = useMemo(() => generateData(timeRange), [timeRange]);

  const handleLegendMouseEnter = (o) => {
    setHoveredSeries(o.dataKey);
  };

  const handleLegendMouseLeave = () => {
    setHoveredSeries(null);
  };

  return (
    <div
      style={{
        backgroundColor: "#fff",
        border: "1px solid #E5E7EB",
        borderRadius: "16px",
        padding: "24px",
        width: "100%",
        boxSizing: "border-box",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.02)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#111827", margin: 0 }}>
            System Health Overview
          </h2>
          <p style={{ fontSize: "13px", color: "#6B7280", margin: "4px 0 0 0" }}>
            Real-time monitoring of station performance
          </p>
        </div>

        {/* Time Range Selector */}
        <div style={{ display: "flex", background: "#F3F4F6", borderRadius: "9999px", padding: "4px" }}>
          {[
            { id: "24h", label: "24h" },
            { id: "7d", label: "7d" },
            { id: "30d", label: "30d" },
            { id: "custom", label: "Custom" },
          ].map((range) => (
            <button
              key={range.id}
              onClick={() => setTimeRange(range.id)}
              style={{
                border: "none",
                background: timeRange === range.id ? "#ffffff" : "transparent",
                color: timeRange === range.id ? "#111827" : "#4B5563",
                fontSize: "12px",
                fontWeight: 600,
                padding: "6px 14px",
                borderRadius: "9999px",
                cursor: "pointer",
                boxShadow: timeRange === range.id ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
                transition: "all 0.25s ease",
              }}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ width: "100%", height: "350px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorUptime" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.0}/>
              </linearGradient>
              <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#14B8A6" stopOpacity={0.0}/>
              </linearGradient>
              <linearGradient id="colorErrors" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#6B7280", fontSize: 11 }} stroke="#E5E7EB" />
            <YAxis tick={{ fill: "#6B7280", fontSize: 11 }} stroke="#E5E7EB" />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(8px)",
                border: "1px solid #E5E7EB",
                borderRadius: "12px",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)",
                fontFamily: "inherit",
              }}
            />
            <Legend
              onMouseEnter={handleLegendMouseEnter}
              onMouseLeave={handleLegendMouseLeave}
              wrapperStyle={{ paddingTop: "15px", fontSize: "12px", fontWeight: 500 }}
            />
            <Area
              type="monotone"
              dataKey="uptime"
              stroke="#7C3AED"
              strokeWidth={2}
              fill="url(#colorUptime)"
              fillOpacity={hoveredSeries ? (hoveredSeries === "uptime" ? 0.4 : 0.05) : 0.15}
              strokeOpacity={hoveredSeries ? (hoveredSeries === "uptime" ? 1 : 0.2) : 1}
              dot={{ r: 3, stroke: "#7C3AED", strokeWidth: 1, fill: "#fff" }}
              activeDot={{ r: 7, strokeWidth: 0, fill: "#7C3AED" }}
              name="Uptime (%)"
              animationDuration={800}
            />
            <Area
              type="monotone"
              dataKey="activeStations"
              stroke="#14B8A6"
              strokeWidth={2}
              fill="url(#colorActive)"
              fillOpacity={hoveredSeries ? (hoveredSeries === "activeStations" ? 0.4 : 0.05) : 0.15}
              strokeOpacity={hoveredSeries ? (hoveredSeries === "activeStations" ? 1 : 0.2) : 1}
              dot={{ r: 3, stroke: "#14B8A6", strokeWidth: 1, fill: "#fff" }}
              activeDot={{ r: 7, strokeWidth: 0, fill: "#14B8A6" }}
              name="Active Stations"
              animationDuration={800}
            />
            <Area
              type="monotone"
              dataKey="errors"
              stroke="#EF4444"
              strokeWidth={2}
              fill="url(#colorErrors)"
              fillOpacity={hoveredSeries ? (hoveredSeries === "errors" ? 0.4 : 0.05) : 0.15}
              strokeOpacity={hoveredSeries ? (hoveredSeries === "errors" ? 1 : 0.2) : 1}
              dot={{ r: 3, stroke: "#EF4444", strokeWidth: 1, fill: "#fff" }}
              activeDot={{ r: 7, strokeWidth: 0, fill: "#EF4444" }}
              name="Errors Today"
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
