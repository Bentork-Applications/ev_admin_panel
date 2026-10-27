import React, { useState } from "react";
import { Award, ChevronDown, User } from "lucide-react";

export default function TopSalesExecutivesCard({
  executives = [],
  timeRange = "This Month",
  onTimeRangeChange,
  loading = false,
  onExecutiveSelect
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const hasData = executives && executives.length > 0;

  // Determine progress bar color based on achievement percentage
  const getAchievementColor = (pct) => {
    if (pct >= 75) return "#10B981"; // Green
    if (pct >= 55) return "#F59E0B"; // Amber / Orange
    if (pct >= 40) return "#F87171"; // Salmon / Red
    return "#06B6D4"; // Cyan / Teal
  };

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
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "8px",
              backgroundColor: "#FEF3C7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#D97706"
            }}
          >
            <Award size={16} />
          </div>
          <h3
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: "#0F172A",
              margin: 0
            }}
          >
            Top Performing Sales Executives
          </h3>
        </div>

        {/* Time Filter */}
        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 8px",
              fontSize: "11px",
              fontWeight: 600,
              color: "#475569",
              backgroundColor: "#F8FAFC",
              border: "1px solid #CBD5E1",
              borderRadius: "6px",
              cursor: "pointer"
            }}
          >
            <span>{timeRange}</span>
            <ChevronDown size={13} />
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
                borderRadius: "6px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                zIndex: 20,
                minWidth: "110px"
              }}
            >
              {["This Month", "Last Month", "This Quarter", "All Time"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    if (onTimeRangeChange) onTimeRangeChange(t);
                    setDropdownOpen(false);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "6px 10px",
                    fontSize: "11px",
                    border: "none",
                    background: timeRange === t ? "#EFF6FF" : "transparent",
                    color: timeRange === t ? "#2563EB" : "#334155",
                    cursor: "pointer"
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowX: "auto" }}>
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
              height: "220px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#94A3B8",
              fontSize: "12px"
            }}
          >
            No sales executive performance data available
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #E2E8F0", color: "#64748B", fontWeight: 600 }}>
                <th style={{ padding: "6px 6px 8px 4px", width: "20px" }}>#</th>
                <th style={{ padding: "6px 8px 8px" }}>Name</th>
                <th style={{ padding: "6px 6px 8px", textAlign: "center" }}>Leads</th>
                <th style={{ padding: "6px 6px 8px", textAlign: "center" }}>Orders</th>
                <th style={{ padding: "6px 6px 8px", textAlign: "right" }}>Revenue</th>
                <th style={{ padding: "6px 6px 8px", textAlign: "center" }}>Conversion</th>
                <th style={{ padding: "6px 6px 8px", textAlign: "right" }}>Target</th>
                <th style={{ padding: "6px 4px 8px 6px", width: "110px", textAlign: "left" }}>Achievement</th>
              </tr>
            </thead>
            <tbody>
              {executives.slice(0, 6).map((exec, i) => {
                const achievementPct = exec.achievementRate !== undefined ? exec.achievementRate : (Math.round(((exec.revenue || 0) / (exec.target || 1)) * 100) || 0);
                const barColor = getAchievementColor(achievementPct);

                return (
                  <tr
                    key={i}
                    onClick={() => onExecutiveSelect && onExecutiveSelect(exec.id || exec.name)}
                    style={{
                      borderBottom: i === executives.length - 1 ? "none" : "1px solid #F1F5F9",
                      transition: "background-color 0.1s ease",
                      cursor: "pointer"
                    }}
                    className="sales-hover-row"
                  >
                    <td style={{ padding: "8px 6px 8px 4px", color: "#94A3B8", fontWeight: 500 }}>
                      {i + 1}
                    </td>
                    <td style={{ padding: "8px 8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div
                          style={{
                            width: "26px",
                            height: "26px",
                            borderRadius: "50%",
                            backgroundColor: "#E2E8F0",
                            color: "#475569",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "11px",
                            fontWeight: 600,
                            overflow: "hidden",
                            flexShrink: 0
                          }}
                        >
                          {exec.avatar ? (
                            <img src={exec.avatar} alt={exec.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            exec.name ? exec.name.charAt(0).toUpperCase() : <User size={14} />
                          )}
                        </div>
                        <span style={{ fontWeight: 600, color: "#1E293B", whiteSpace: "nowrap" }}>
                          {exec.name}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: "8px 6px", textAlign: "center", color: "#475569" }}>
                      {exec.leads ?? 0}
                    </td>
                    <td style={{ padding: "8px 6px", textAlign: "center", color: "#475569" }}>
                      {exec.orders ?? 0}
                    </td>
                    <td style={{ padding: "8px 6px", textAlign: "right", fontWeight: 600, color: "#0F172A" }}>
                      {exec.revenueFormatted || `₹${((exec.revenue || 0) / 100000).toFixed(2)}L`}
                    </td>
                    <td style={{ padding: "8px 6px", textAlign: "center", fontWeight: 500, color: "#475569" }}>
                      {exec.conversionRate ?? 0}%
                    </td>
                    <td style={{ padding: "8px 6px", textAlign: "right", color: "#64748B", fontWeight: 500 }}>
                      {exec.target ? (exec.targetFormatted || `₹${((exec.target || 0) / 100000).toFixed(1)}L`) : "-"}
                    </td>
                    <td style={{ padding: "8px 4px 8px 6px" }}>
                      {exec.achievementRate !== null && exec.achievementRate !== undefined && exec.target ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <div
                            style={{
                              flex: 1,
                              height: "6px",
                              backgroundColor: "#F1F5F9",
                              borderRadius: "3px",
                              overflow: "hidden"
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${Math.min(100, Math.max(3, exec.achievementRate))}%`,
                                backgroundColor: barColor,
                                borderRadius: "3px"
                              }}
                            />
                          </div>
                          <span style={{ fontSize: "11px", fontWeight: 600, color: "#475569", minWidth: "28px" }}>
                            {exec.achievementRate}%
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: "11px", color: "#94A3B8" }}>Not set</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
