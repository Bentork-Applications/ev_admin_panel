import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function CitySalesCard({
  cities = [],
  metric = "Revenue",
  onMetricChange,
  timeRange = "This Month",
  onTimeRangeChange,
  loading = false,
  onCitySelect
}) {
  const [metricDropdown, setMetricDropdown] = useState(false);
  const [timeDropdown, setTimeDropdown] = useState(false);

  const hasData = cities && cities.length > 0;

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
          gap: "8px",
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
          City-wise Sales (Top 10)
        </h3>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {/* Metric Dropdown */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => {
                setMetricDropdown(!metricDropdown);
                setTimeDropdown(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
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
              <span>{metric}</span>
              <ChevronDown size={13} />
            </button>
            {metricDropdown && (
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
                  minWidth: "90px"
                }}
              >
                {["Revenue", "Orders", "Leads"].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      if (onMetricChange) onMetricChange(m);
                      setMetricDropdown(false);
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "6px 10px",
                      fontSize: "11px",
                      border: "none",
                      background: metric === m ? "#EFF6FF" : "transparent",
                      color: metric === m ? "#2563EB" : "#334155",
                      cursor: "pointer"
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Time Filter */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => {
                setTimeDropdown(!timeDropdown);
                setMetricDropdown(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
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
            {timeDropdown && (
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
                      setTimeDropdown(false);
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
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowX: "auto" }}>
        {loading ? (
          <div
            style={{
              width: "100%",
              height: "260px",
              borderRadius: "8px",
              backgroundColor: "#F8FAFC"
            }}
            className="sales-skeleton-pulse"
          />
        ) : !hasData ? (
          <div
            style={{
              height: "260px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#94A3B8",
              fontSize: "12px"
            }}
          >
            No city-level sales recorded
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #E2E8F0", color: "#64748B", fontWeight: 600 }}>
                <th style={{ padding: "6px 6px 8px 4px", width: "24px" }}>#</th>
                <th style={{ padding: "6px 8px 8px" }}>City</th>
                <th style={{ padding: "6px 6px 8px", textAlign: "center" }}>Leads</th>
                <th style={{ padding: "6px 6px 8px", textAlign: "center" }}>Orders</th>
                <th style={{ padding: "6px 4px 8px 6px", textAlign: "right" }}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {cities.slice(0, 10).map((ct, i) => (
                <tr
                  key={i}
                  onClick={() => onCitySelect && onCitySelect(ct.city)}
                  style={{
                    borderBottom: i === cities.length - 1 ? "none" : "1px solid #F1F5F9",
                    transition: "background-color 0.1s ease",
                    cursor: "pointer"
                  }}
                  className="sales-hover-row"
                >
                  <td style={{ padding: "7px 6px 7px 4px", color: "#94A3B8", fontWeight: 500 }}>
                    {i + 1}
                  </td>
                  <td style={{ padding: "7px 8px", fontWeight: 500, color: "#1E293B" }}>
                    {ct.city}
                  </td>
                  <td style={{ padding: "7px 6px", textAlign: "center", color: "#475569" }}>
                    {ct.leads}
                  </td>
                  <td style={{ padding: "7px 6px", textAlign: "center", color: "#475569" }}>
                    {ct.orders}
                  </td>
                  <td style={{ padding: "7px 4px 7px 6px", textAlign: "right", fontWeight: 600, color: "#0F172A" }}>
                    {ct.revenueFormatted || `₹${(ct.revenue / 100000).toFixed(2)}L`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
