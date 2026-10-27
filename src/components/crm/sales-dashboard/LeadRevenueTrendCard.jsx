import React, { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";
import { ChevronDown } from "lucide-react";

export default function LeadRevenueTrendCard({
  data = [],
  loading = false,
  granularity = "Monthly",
  onGranularityChange
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Format revenue for right Y-axis (e.g. 5L, 10L, 15L, 20L or K)
  const formatYAxisRevenue = (val) => {
    if (val === 0) return "0";
    if (val >= 10000000) return `${(val / 10000000).toFixed(0)}Cr`;
    if (val >= 100000) return `${(val / 100000).toFixed(0)}L`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
    return `₹${val}`;
  };

  const formatTooltipRevenue = (val) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
    return `₹${Number(val).toLocaleString("en-IN")}`;
  };

  const hasData = Array.isArray(data) && data.length > 0;

  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: "14px",
        padding: "18px 20px",
        border: "1px solid #E2E8F0",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.03)",
        display: "flex",
        flexDirection: "column",
        height: "100%"
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          marginBottom: "16px"
        }}
      >
        <h3
          style={{
            fontSize: "15px",
            fontWeight: 700,
            color: "#0F172A",
            margin: 0
          }}
        >
          Lead & Revenue Trend
        </h3>

        {/* Legend */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", fontSize: "11px", fontWeight: 600, color: "#475569" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "2px", backgroundColor: "#3B82F6" }} />
            <span>Leads</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "2px", backgroundColor: "#10B981" }} />
            <span>Won Deals</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ width: "12px", height: "2px", backgroundColor: "#F97316", position: "relative", display: "inline-block" }}>
              <span style={{ position: "absolute", width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#F97316", top: "-2px", left: "3px" }} />
            </span>
            <span>Revenue (₹)</span>
          </div>
        </div>

        {/* Timeframe Dropdown */}
        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 10px",
              fontSize: "12px",
              fontWeight: 500,
              color: "#475569",
              backgroundColor: "#F8FAFC",
              border: "1px solid #CBD5E1",
              borderRadius: "6px",
              cursor: "pointer"
            }}
          >
            <span>{granularity}</span>
            <ChevronDown size={14} />
          </button>
          {dropdownOpen && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: "4px",
                backgroundColor: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                zIndex: 20,
                minWidth: "100px",
                overflow: "hidden"
              }}
            >
              {["Monthly", "Weekly", "Daily"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    if (onGranularityChange) onGranularityChange(opt);
                    setDropdownOpen(false);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 12px",
                    fontSize: "12px",
                    border: "none",
                    background: granularity === opt ? "#EFF6FF" : "transparent",
                    color: granularity === opt ? "#2563EB" : "#334155",
                    fontWeight: granularity === opt ? 600 : 400,
                    cursor: "pointer"
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chart Canvas */}
      <div style={{ flex: 1, minHeight: "260px", width: "100%", position: "relative" }}>
        {loading ? (
          <div
            style={{
              width: "100%",
              height: "100%",
              minHeight: "260px",
              borderRadius: "8px",
              backgroundColor: "#F8FAFC",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            className="sales-skeleton-pulse"
          />
        ) : !hasData ? (
          <div
            style={{
              width: "100%",
              height: "100%",
              minHeight: "260px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#94A3B8",
              fontSize: "13px"
            }}
          >
            <span>No lead or revenue trend data available</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={270}>
            <ComposedChart
              data={data}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis
                dataKey="label"
                stroke="#94A3B8"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "#E2E8F0" }}
              />
              {/* Left Y Axis for Counts */}
              <YAxis
                yAxisId="left"
                stroke="#94A3B8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                label={{
                  value: "Leads / Deals",
                  angle: -90,
                  position: "insideLeft",
                  style: { textAnchor: "middle", fill: "#94A3B8", fontSize: 10 }
                }}
              />
              {/* Right Y Axis for Revenue */}
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#94A3B8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatYAxisRevenue}
                label={{
                  value: "Revenue (₹)",
                  angle: 90,
                  position: "insideRight",
                  style: { textAnchor: "middle", fill: "#94A3B8", fontSize: 10 }
                }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div
                        style={{
                          backgroundColor: "#0F172A",
                          borderRadius: "8px",
                          padding: "10px 14px",
                          color: "#FFFFFF",
                          fontSize: "12px",
                          boxShadow: "0 4px 14px rgba(0,0,0,0.25)"
                        }}
                      >
                        <div style={{ fontWeight: 700, marginBottom: "6px", color: "#E2E8F0" }}>{label}</div>
                        {payload.map((entry, idx) => (
                          <div key={idx} style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginTop: "3px" }}>
                            <span style={{ color: entry.color, display: "flex", alignItems: "center", gap: "4px" }}>
                              <span style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: entry.color }} />
                              {entry.name}:
                            </span>
                            <span style={{ fontWeight: 600 }}>
                              {entry.dataKey === "revenue" ? formatTooltipRevenue(entry.value) : entry.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {/* Blue Bar for Leads */}
              <Bar
                yAxisId="left"
                dataKey="leads"
                name="Leads"
                fill="#3B82F6"
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
              />
              {/* Green Bar for Won Deals */}
              <Bar
                yAxisId="left"
                dataKey="wonDeals"
                name="Won Deals"
                fill="#10B981"
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
              />
              {/* Orange Line for Revenue */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="revenue"
                name="Revenue (₹)"
                stroke="#F97316"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: "#F97316", stroke: "#FFFFFF", strokeWidth: 1.5 }}
                activeDot={{ r: 5, fill: "#F97316" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
