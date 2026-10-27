import React, { useState, useMemo } from "react";
import { ChevronDown, MapPin } from "lucide-react";
import IndiaMapSvg, { normalizeStateName } from "./IndiaMapSvg";

export default function StateSalesCard({
  states = [],
  metric = "Revenue",
  onMetricChange,
  timeRange = "This Month",
  onTimeRangeChange,
  selectedState = null,
  onStateSelect,
  loading = false
}) {
  const [metricDropdown, setMetricDropdown] = useState(false);
  const [timeDropdown, setTimeDropdown] = useState(false);

  // Convert array to dictionary for map lookup using canonical names
  const mapStateData = useMemo(() => {
    const dict = {};
    states.forEach((st) => {
      const canonical = normalizeStateName(st.state);
      dict[canonical] = st;
      dict[canonical.toLowerCase()] = st;
    });
    return dict;
  }, [states]);

  // Find max revenue for color scale matching
  const maxRevenue = useMemo(() => {
    let max = 0;
    states.forEach((st) => {
      if (st.revenue > max) max = st.revenue;
    });
    return max;
  }, [states]);

  // Color helper for state table status dot
  const getTierDot = (revenue) => {
    if (!revenue || revenue === 0) return "#CBD5E1";
    if (maxRevenue > 0) {
      const ratio = revenue / maxRevenue;
      if (ratio >= 0.7) return "#15803D"; // Darker Green
      if (ratio >= 0.35) return "#16A34A"; // Medium-High Green
      if (ratio >= 0.1) return "#22C55E";  // Medium Green
      return "#86EFAC"; // Light Green
    }
    return "#86EFAC";
  };

  const hasData = states && states.length > 0;

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
      {/* Card Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px",
          marginBottom: "14px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "8px",
              backgroundColor: "#DCFCE7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#15803D"
            }}
          >
            <MapPin size={16} />
          </div>
          <div>
            <h3
              style={{
                fontSize: "15px",
                fontWeight: 700,
                color: "#0F172A",
                margin: 0
              }}
            >
              State-wise Sales Performance
            </h3>
            <span style={{ fontSize: "11px", color: "#64748B" }}>
              Geographic distribution across Indian States & UTs
            </span>
          </div>
        </div>

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
                  minWidth: "100px"
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

          {/* Time Range Dropdown */}
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

      {/* Main Grid: Accurate Map of India on Left, State Ranking Table on Right */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 1.05fr",
          gap: "16px",
          alignItems: "center"
        }}
        className="state-sales-layout-grid"
      >
        {/* Full India Map Container */}
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "4px 0"
          }}
        >
          <IndiaMapSvg
            stateData={mapStateData}
            selectedState={selectedState}
            onStateClick={onStateSelect}
          />
        </div>

        {/* State Performance Ranking List / Table */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", height: "100%", maxHeight: "360px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>
              Performance Rankings
            </span>
            <span style={{ fontSize: "11px", color: "#64748B" }}>
              {states.length} Active Regions
            </span>
          </div>

          <div style={{ flex: 1, overflowY: "auto", overflowX: "auto" }}>
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
                No state-wise sales recorded
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11.5px", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #E2E8F0", color: "#64748B", fontWeight: 600 }}>
                    <th style={{ padding: "6px 4px 6px 0", width: "22px" }}>#</th>
                    <th style={{ padding: "6px 6px" }}>State</th>
                    <th style={{ padding: "6px 6px", textAlign: "center" }}>Leads</th>
                    <th style={{ padding: "6px 6px", textAlign: "center" }}>Orders</th>
                    <th style={{ padding: "6px 6px", textAlign: "right" }}>Revenue</th>
                    <th style={{ padding: "6px 4px 6px 6px", textAlign: "right" }}>Conv.</th>
                  </tr>
                </thead>
                <tbody>
                  {states.map((st, i) => {
                    const dotColor = getTierDot(st.revenue);
                    const isSelected = selectedState && normalizeStateName(selectedState).toLowerCase() === normalizeStateName(st.state).toLowerCase();

                    return (
                      <tr
                        key={i}
                        onClick={() => onStateSelect && onStateSelect(st.state)}
                        style={{
                          borderBottom: "1px solid #F1F5F9",
                          backgroundColor: isSelected ? "#EFF6FF" : "transparent",
                          transition: "background-color 0.1s ease",
                          cursor: "pointer"
                        }}
                        className="sales-hover-row"
                      >
                        <td style={{ padding: "6px 4px 6px 0", color: "#94A3B8", fontWeight: 600 }}>
                          {i + 1}
                        </td>
                        <td style={{ padding: "6px 6px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span
                              style={{
                                width: "8px",
                                height: "8px",
                                borderRadius: "50%",
                                backgroundColor: dotColor,
                                flexShrink: 0
                              }}
                            />
                            <span style={{ fontWeight: 600, color: "#1E293B", whiteSpace: "nowrap" }}>
                              {st.state}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: "6px 6px", textAlign: "center", color: "#475569" }}>
                          {st.leads}
                        </td>
                        <td style={{ padding: "6px 6px", textAlign: "center", color: "#475569" }}>
                          {st.orders}
                        </td>
                        <td style={{ padding: "6px 6px", textAlign: "right", fontWeight: 700, color: "#0F172A" }}>
                          {st.revenueFormatted || `₹${(st.revenue / 100000).toFixed(2)}L`}
                        </td>
                        <td style={{ padding: "6px 4px 6px 6px", textAlign: "right", fontWeight: 700, color: "#15803D" }}>
                          {st.conversionRate}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
