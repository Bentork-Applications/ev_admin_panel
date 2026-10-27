import React, { useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { ChevronDown } from "lucide-react";

export default function LeadSourceDonutCard({
  sources = [],
  totalLeads = 0,
  timeRange = "This Month",
  onTimeRangeChange,
  loading = false
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const defaultSources = [
    { name: "Website", count: 0, percent: 0, color: "#2563EB" },
    { name: "Instagram", count: 0, percent: 0, color: "#EC4899" },
    { name: "Referral", count: 0, percent: 0, color: "#06B6D4" },
    { name: "Direct", count: 0, percent: 0, color: "#FBBF24" },
    { name: "Other", count: 0, percent: 0, color: "#8B5CF6" }
  ];

  const displaySources = sources && sources.length > 0 ? sources : defaultSources;
  const hasData = sources && sources.some((s) => s.count > 0 || s.percent > 0);

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
          Lead Source Distribution
        </h3>

        {/* Time Filter */}
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
            <span>{timeRange}</span>
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
                minWidth: "120px"
              }}
            >
              {["This Month", "Last Month", "This Quarter", "All Time"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    if (onTimeRangeChange) onTimeRangeChange(opt);
                    setDropdownOpen(false);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 12px",
                    fontSize: "12px",
                    border: "none",
                    background: timeRange === opt ? "#EFF6FF" : "transparent",
                    color: timeRange === opt ? "#2563EB" : "#334155",
                    fontWeight: timeRange === opt ? 600 : 400,
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

      {/* Donut and Legend Grid */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          minHeight: "240px"
        }}
      >
        {loading ? (
          <div
            style={{
              width: "100%",
              height: "220px",
              borderRadius: "8px",
              backgroundColor: "#F8FAFC"
            }}
            className="sales-skeleton-pulse"
          />
        ) : !hasData ? (
          <div
            style={{
              width: "100%",
              height: "220px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#94A3B8",
              fontSize: "13px"
            }}
          >
            <span>No lead source data available</span>
          </div>
        ) : (
          <>
            {/* Donut Chart with Center Text */}
            <div style={{ position: "relative", width: "160px", height: "160px", flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    formatter={(val, name, item) => [`${val} (${item.payload.percent}%)`, name]}
                    contentStyle={{ backgroundColor: "#0F172A", borderRadius: "8px", color: "#fff", border: "none", fontSize: "12px" }}
                  />
                  <Pie
                    data={displaySources}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="count"
                  >
                    {displaySources.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Center Overlay Text */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none"
                }}
              >
                <span style={{ fontSize: "20px", fontWeight: 700, color: "#0F172A", lineHeight: 1.1 }}>
                  {totalLeads}
                </span>
                <span style={{ fontSize: "10px", fontWeight: 600, color: "#64748B", marginTop: "2px" }}>
                  Total Leads
                </span>
              </div>
            </div>

            {/* Legend List on Right */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px", paddingLeft: "8px" }}>
              {displaySources.map((src, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                    fontSize: "12px"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        backgroundColor: src.color,
                        flexShrink: 0
                      }}
                    />
                    <span
                      style={{
                        color: "#334155",
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                        overflow: "hidden"
                      }}
                    >
                      {src.name}
                    </span>
                  </div>
                  <span style={{ fontWeight: 700, color: "#0F172A", minWidth: "32px", textAlign: "right" }}>
                    {src.percent}%
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
