import React, { useState, useMemo } from "react";
import { INDIA_MAP_WIDTH, INDIA_MAP_HEIGHT, INDIA_STATES_DATA } from "./indiaStatesGeoData";

// Normalizes state names and codes from APIs/leads/orders
export const normalizeStateName = (input) => {
  if (!input) return "";
  const s = String(input).trim().toLowerCase().replace(/[^a-z0-9]/g, "");

  const lookup = {
    mh: "Maharashtra",
    maharashtra: "Maharashtra",
    dl: "Delhi",
    delhi: "Delhi",
    newdelhi: "Delhi",
    nctofdelhi: "Delhi",
    gj: "Gujarat",
    gujarat: "Gujarat",
    ka: "Karnataka",
    karnataka: "Karnataka",
    tn: "Tamil Nadu",
    tamilnadu: "Tamil Nadu",
    up: "Uttar Pradesh",
    uttarpradesh: "Uttar Pradesh",
    wb: "West Bengal",
    westbengal: "West Bengal",
    ts: "Telangana",
    tg: "Telangana",
    telangana: "Telangana",
    ap: "Andhra Pradesh",
    andhrapradesh: "Andhra Pradesh",
    mp: "Madhya Pradesh",
    madhyapradesh: "Madhya Pradesh",
    rj: "Rajasthan",
    rajasthan: "Rajasthan",
    kl: "Kerala",
    kerala: "Kerala",
    pb: "Punjab",
    punjab: "Punjab",
    hr: "Haryana",
    haryana: "Haryana",
    br: "Bihar",
    bihar: "Bihar",
    od: "Odisha",
    orissa: "Odisha",
    odisha: "Odisha",
    jk: "Jammu and Kashmir",
    jammukashmir: "Jammu and Kashmir",
    jammukashmirladakh: "Jammu and Kashmir",
    la: "Ladakh",
    ladakh: "Ladakh",
    ga: "Goa",
    goa: "Goa",
    as: "Assam",
    assam: "Assam",
    jh: "Jharkhand",
    jharkhand: "Jharkhand",
    cg: "Chhattisgarh",
    chhattisgarh: "Chhattisgarh",
    uk: "Uttarakhand",
    uttarakhand: "Uttarakhand",
    uttaranchal: "Uttarakhand",
    hp: "Himachal Pradesh",
    himachalpradesh: "Himachal Pradesh",
    tr: "Tripura",
    tripura: "Tripura",
    ml: "Meghalaya",
    meghalaya: "Meghalaya",
    mn: "Manipur",
    manipur: "Manipur",
    nl: "Nagaland",
    nagaland: "Nagaland",
    mz: "Mizoram",
    mizoram: "Mizoram",
    sk: "Sikkim",
    sikkim: "Sikkim",
    ar: "Arunachal Pradesh",
    arunachalpradesh: "Arunachal Pradesh",
    ch: "Chandigarh",
    chandigarh: "Chandigarh",
    py: "Puducherry",
    puducherry: "Puducherry",
    pondicherry: "Puducherry",
    an: "Andaman and Nicobar Islands",
    andamanandnicobarislands: "Andaman and Nicobar Islands",
    andaman: "Andaman and Nicobar Islands",
    ld: "Lakshadweep",
    lakshadweep: "Lakshadweep",
    dn: "Dadra and Nagar Haveli",
    dd: "Daman and Diu",
    dnhdd: "Dadra and Nagar Haveli"
  };

  return lookup[s] || input.trim();
};

/**
 * IndiaMapSvg
 * Accurate, full India map showing all 37 Indian states & union territories.
 * Green color scale:
 *  - Dark green: Higher sales
 *  - Medium green: Medium sales
 *  - Light green: Lower sales
 *  - Neutral grey: No sales data
 */
export default function IndiaMapSvg({
  stateData = {},
  selectedState = null,
  onStateClick
}) {
  const [hoveredState, setHoveredState] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Map normalized backend data
  const normalizedDataMap = useMemo(() => {
    const map = new Map();
    Object.entries(stateData).forEach(([key, val]) => {
      const canonical = normalizeStateName(key);
      if (canonical) {
        map.set(canonical.toLowerCase(), { ...val, canonicalName: canonical });
      }
    });
    return map;
  }, [stateData]);

  // Determine max sales metric among all states for dynamic scaling
  const maxRevenue = useMemo(() => {
    let max = 0;
    normalizedDataMap.forEach((val) => {
      const rev = Number(val.revenue || 0);
      if (rev > max) max = rev;
    });
    return max;
  }, [normalizedDataMap]);

  // Calculate green shade based on actual sales data
  const getStateColor = (stateName) => {
    const canonical = normalizeStateName(stateName).toLowerCase();
    const info = normalizedDataMap.get(canonical);

    if (!info || (!info.revenue && !info.leads && !info.orders)) {
      return "#E2E8F0"; // Neutral grey: No sales data
    }

    const rev = Number(info.revenue || 0);
    const leads = Number(info.leads || 0);
    const orders = Number(info.orders || 0);

    // If maxRevenue is available, use dynamic scale
    if (maxRevenue > 0) {
      const ratio = rev / maxRevenue;
      if (ratio >= 0.7) return "#15803D"; // Darker Green (Top Tier)
      if (ratio >= 0.35) return "#16A34A"; // Medium-High Green
      if (ratio >= 0.1) return "#22C55E";  // Medium Green
      if (ratio > 0 || orders > 0) return "#86EFAC"; // Light Green
    }

    // If leads exist but 0 revenue yet
    if (leads > 0 || orders > 0) {
      return "#BBF7D0"; // Very Light Mint Green
    }

    return "#E2E8F0"; // Neutral grey
  };

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
      }}
      onMouseMove={handleMouseMove}
    >
      {/* SVG Canvas for Full India Map */}
      <svg
        viewBox={`0 0 ${INDIA_MAP_WIDTH} ${INDIA_MAP_HEIGHT}`}
        style={{
          width: "100%",
          maxHeight: "340px",
          overflow: "visible",
          filter: "drop-shadow(0 2px 6px rgba(0, 0, 0, 0.05))"
        }}
      >
        <g>
          {INDIA_STATES_DATA.map((st) => {
            const canonical = normalizeStateName(st.name);
            const isHovered = hoveredState?.name === st.name;
            const isSelected = selectedState && normalizeStateName(selectedState).toLowerCase() === canonical.toLowerCase();
            const fillColor = getStateColor(st.name);
            const hasData = fillColor !== "#E2E8F0";

            return (
              <path
                key={st.id || st.name}
                d={st.d}
                fill={isHovered ? "#0F766E" : fillColor}
                stroke={isSelected ? "#F59E0B" : isHovered ? "#047857" : "#FFFFFF"}
                strokeWidth={isSelected ? 2.5 : isHovered ? 1.8 : 0.8}
                strokeLinejoin="round"
                style={{
                  transition: "fill 0.15s ease, stroke 0.15s ease, stroke-width 0.15s ease",
                  cursor: "pointer"
                }}
                onMouseEnter={() => {
                  const info = normalizedDataMap.get(canonical.toLowerCase()) || {};
                  setHoveredState({
                    name: canonical,
                    hasData,
                    revenue: info.revenue || 0,
                    revenueFormatted: info.revenueFormatted || (info.revenue ? `₹${(info.revenue / 100000).toFixed(2)}L` : "₹0"),
                    leads: info.leads || 0,
                    orders: info.orders || 0,
                    conversionRate: info.conversionRate ?? (info.leads > 0 ? Math.min(100, Math.round(((info.orders || 0) / info.leads) * 100)) : 0)
                  });
                }}
                onMouseLeave={() => setHoveredState(null)}
                onClick={() => onStateClick && onStateClick(canonical)}
              />
            );
          })}
        </g>
      </svg>

      {/* Hover / Click Tooltip */}
      {hoveredState && (
        <div
          style={{
            position: "absolute",
            left: `${Math.min(Math.max(tooltipPos.x + 12, 10), 280)}px`,
            top: `${Math.max(tooltipPos.y - 70, 10)}px`,
            backgroundColor: "#0F172A",
            color: "#FFFFFF",
            padding: "9px 13px",
            borderRadius: "8px",
            fontSize: "11.5px",
            lineHeight: 1.4,
            pointerEvents: "none",
            zIndex: 40,
            boxShadow: "0 6px 18px rgba(0, 0, 0, 0.25)",
            border: "1px solid #334155",
            minWidth: "140px"
          }}
        >
          <div style={{ fontWeight: 700, fontSize: "12.5px", color: "#34D399", marginBottom: "4px" }}>
            {hoveredState.name}
          </div>
          {hoveredState.hasData ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                <span style={{ color: "#94A3B8" }}>Revenue:</span>
                <span style={{ fontWeight: 600, color: "#F8FAFC" }}>{hoveredState.revenueFormatted}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                <span style={{ color: "#94A3B8" }}>Leads:</span>
                <span style={{ fontWeight: 600 }}>{hoveredState.leads}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                <span style={{ color: "#94A3B8" }}>Orders:</span>
                <span style={{ fontWeight: 600 }}>{hoveredState.orders}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginTop: "2px", borderTop: "1px solid #1E293B", paddingTop: "2px" }}>
                <span style={{ color: "#94A3B8" }}>Conversion:</span>
                <span style={{ fontWeight: 700, color: "#10B981" }}>{hoveredState.conversionRate}%</span>
              </div>
            </>
          ) : (
            <div style={{ color: "#94A3B8", fontStyle: "italic", fontSize: "11px" }}>
              No sales data recorded
            </div>
          )}
        </div>
      )}

      {/* Multi-step Green Color Legend */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          flexWrap: "wrap",
          fontSize: "11px",
          color: "#475569",
          fontWeight: 600,
          marginTop: "10px",
          padding: "4px 8px",
          backgroundColor: "#F8FAFC",
          borderRadius: "6px",
          border: "1px solid #E2E8F0"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ width: "12px", height: "12px", backgroundColor: "#E2E8F0", borderRadius: "3px", border: "1px solid #CBD5E1" }} />
          <span>No Data</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ width: "12px", height: "12px", backgroundColor: "#86EFAC", borderRadius: "3px" }} />
          <span>Lower</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ width: "12px", height: "12px", backgroundColor: "#22C55E", borderRadius: "3px" }} />
          <span>Medium</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ width: "12px", height: "12px", backgroundColor: "#15803D", borderRadius: "3px" }} />
          <span>Higher</span>
        </div>
      </div>
    </div>
  );
}
