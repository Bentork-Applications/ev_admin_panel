import React, { useMemo } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

// ─── Custom Tooltip ──────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const revenue = payload.find((p) => p.dataKey === "Revenue")?.value ?? 0;
  const trend = payload.find((p) => p.dataKey === "Trend")?.value ?? 0;
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        padding: "12px 16px",
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
        fontFamily: "inherit",
        fontSize: "13px"
      }}
    >
      <p style={{ margin: "0 0 6px 0", fontWeight: 700, color: "#111827", fontSize: "14px" }}>{label}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
          <span style={{ color: "#4B5563", fontWeight: 500 }}>Revenue:</span>
          <span style={{ color: "#10B981", fontWeight: 700 }}>₹{revenue.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
          <span style={{ color: "#4B5563", fontWeight: 500 }}>Trend:</span>
          <span style={{ color: "#3B82F6", fontWeight: 700 }}>₹{trend.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const RevenueChart = ({ monthlyRevenue = {}, selectedMonth, onMonthClick }) => {
  // Build sorted chart data from the monthlyRevenue map
  const chartData = useMemo(() => {
    const MONTH_ORDER = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    const entries = Object.entries(monthlyRevenue).map(([monthYear, amount]) => {
      const [mon, year] = monthYear.split(" ");
      return { monthYear, mon, year, amount };
    });

    // Sort chronologically
    entries.sort((a, b) => {
      const yearDiff = Number(a.year) - Number(b.year);
      if (yearDiff !== 0) return yearDiff;
      return MONTH_ORDER.indexOf(a.mon) - MONTH_ORDER.indexOf(b.mon);
    });

    return entries.map((e) => ({
      name: e.monthYear,
      Revenue: parseFloat(e.amount.toFixed(2)),
      Trend: parseFloat(e.amount.toFixed(2)),
    }));
  }, [monthlyRevenue]);

  // Summary stats
  const { total, average, maxMonth, minMonth } = useMemo(() => {
    if (!chartData.length) return { total: 0, average: 0, maxMonth: null, minMonth: null };
    const values = chartData.map((d) => d.Revenue);
    const total = values.reduce((s, v) => s + v, 0);
    const average = total / values.length;
    const maxIdx = values.indexOf(Math.max(...values));
    const minIdx = values.indexOf(Math.min(...values));
    return {
      total,
      average,
      maxMonth: chartData[maxIdx]?.name,
      minMonth: chartData[minIdx]?.name,
    };
  }, [chartData]);

  const formatINR = (v) =>
    v >= 100000
      ? `₹${(v / 100000).toFixed(1)}L`
      : v >= 1000
      ? `₹${(v / 1000).toFixed(1)}K`
      : `₹${v}`;

  if (!chartData.length) {
    return (
      <div className="revenue-chart-card">
        <p style={{ textAlign: "center", color: "#9CA3AF", padding: "40px 0" }}>
          No revenue data available to display chart.
        </p>
      </div>
    );
  }

  return (
    <div className="revenue-chart-card">
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#111827" }}>
            Monthly Revenue Overview
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#6B7280" }}>
            Click a bar to filter the transactions table by that month
          </p>
        </div>

        {/* Summary pills */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {[
            { label: "Total", value: `₹${total.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`, color: "#10B981" },
            { label: "Monthly Avg", value: `₹${average.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`, color: "#3B82F6" },
            { label: "Best Month", value: maxMonth || "—", color: "#059669" },
            { label: "Worst Month", value: minMonth || "—", color: "#EF4444" },
          ].map((s) => (
            <div key={s.label} style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: "8px", padding: "6px 14px", fontSize: "12px" }}>
              <span style={{ color: "#6B7280" }}>{s.label}: </span>
              <strong style={{ color: s.color }}>{s.value}</strong>
            </div>
          ))}
        </div>
      </div>

      {/* ── Chart ── */}
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: "#6B7280" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatINR}
            tick={{ fontSize: 12, fill: "#6B7280" }}
            axisLine={false}
            tickLine={false}
            width={64}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(16,185,129,0.06)" }} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: "13px", paddingTop: "12px" }}
          />

          {/* Average reference line */}
          <ReferenceLine
            y={average}
            stroke="#F59E0B"
            strokeDasharray="4 4"
            label={{ value: "Avg", position: "insideTopRight", fontSize: 11, fill: "#F59E0B" }}
          />

          <Bar
            dataKey="Revenue"
            radius={[6, 6, 0, 0]}
            maxBarSize={48}
            cursor="pointer"
            onClick={(data) => onMonthClick && onMonthClick(data.name)}
            isAnimationActive={true}
            animationDuration={800}
          >
            {chartData.map((entry) => {
              const isSelected = selectedMonth === entry.name;
              const isMax = entry.name === maxMonth;
              const isMin = entry.name === minMonth;
              const color = isSelected
                ? "#065F46"
                : isMax
                ? "#059669"
                : isMin
                ? "#EF4444"
                : "#10B981";
              return <Cell key={entry.name} fill={color} opacity={isSelected || !selectedMonth ? 1 : 0.45} />;
            })}
          </Bar>

          <Line
            type="monotone"
            dataKey="Trend"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={{ r: 3, fill: "#3B82F6" }}
            activeDot={{ r: 5 }}
            isAnimationActive={true}
            animationDuration={800}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend hint */}
      <div style={{ display: "flex", gap: "16px", marginTop: "12px", flexWrap: "wrap" }}>
        {[
          { color: "#059669", label: "Highest revenue month" },
          { color: "#EF4444", label: "Lowest revenue month" },
          { color: "#065F46", label: "Selected month" },
          { color: "#F59E0B", label: "Monthly average" },
        ].map((h) => (
          <span key={h.label} style={{ fontSize: "11px", color: "#6B7280", display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: h.color, display: "inline-block" }} />
            {h.label}
          </span>
        ))}
      </div>
    </div>
  );
};

export default RevenueChart;
