import React from "react";
import { ResponsiveContainer, AreaChart, Area } from "recharts";

/**
 * SalesKpiCard
 * Renders a single KPI card matching the reference image:
 * - Icon with soft background
 * - Label in muted gray
 * - Large metric value
 * - Subtitle / Trend badge (e.g. ↑ 12% vs last month or ↑ 4 overdue)
 * - Mini sparkline area chart on the bottom right
 */
export default function SalesKpiCard({
  label,
  value,
  trendText,
  isPositive = true,
  isWarning = false,
  icon: Icon,
  iconBg = "#EFF6FF",
  iconColor = "#2563EB",
  sparklineData = [],
  sparklineColor = "#3B82F6",
  loading = false,
  onClick
}) {
  const defaultSparkline = [
    { v: 10 }, { v: 15 }, { v: 12 }, { v: 18 }, { v: 14 }, { v: 22 }, { v: 20 }, { v: 28 }
  ];
  const chartData = (sparklineData && sparklineData.length >= 2) ? sparklineData : defaultSparkline;

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: "14px",
        padding: "16px 18px",
        border: "1px solid #E2E8F0",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.03)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "116px",
        cursor: onClick ? "pointer" : "default",
        transition: "transform 0.15s ease, box-shadow 0.15s ease"
      }}
      className="sales-kpi-card"
    >
      {/* Top Section: Icon + Label */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
        <div
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "10px",
            backgroundColor: iconBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: iconColor,
            flexShrink: 0
          }}
        >
          {Icon && <Icon size={19} strokeWidth={2.2} />}
        </div>
        <div style={{ overflow: "hidden" }}>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "#64748B",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              overflow: "hidden",
              display: "block"
            }}
          >
            {label}
          </span>
          <div
            style={{
              fontSize: "22px",
              fontWeight: 700,
              color: "#0F172A",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
              marginTop: "2px"
            }}
          >
            {loading ? (
              <span className="sales-skeleton-pulse" style={{ display: "inline-block", width: "70px", height: "24px", borderRadius: "4px" }} />
            ) : (
              value ?? 0
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: Trend / Subtext on Left + Sparkline on Right */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "8px", marginTop: "4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 600 }}>
          {loading ? (
            <span className="sales-skeleton-pulse" style={{ display: "inline-block", width: "90px", height: "14px", borderRadius: "4px" }} />
          ) : (
            <span
              style={{
                color: isWarning ? "#EF4444" : isPositive ? "#16A34A" : "#64748B",
                display: "inline-flex",
                alignItems: "center",
                gap: "2px",
                whiteSpace: "nowrap"
              }}
            >
              {trendText}
            </span>
          )}
        </div>

        {/* Sparkline */}
        <div style={{ width: "75px", height: "26px", flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${label.replace(/\s+/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={sparklineColor} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={sparklineColor} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={sparklineColor}
                strokeWidth={2}
                fill={`url(#grad-${label.replace(/\s+/g, "")})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
