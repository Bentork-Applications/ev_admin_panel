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
        borderRadius: "10px",
        padding: "12px 16px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
        minWidth: "170px",
      }}
    >
      <p style={{ margin: 0, fontWeight: 700, color: "#111827", fontSize: "14px" }}>{label}</p>
      <p style={{ margin: "6px 0 2px", color: "#6366f1", fontSize: "13px" }}>
        Revenue:{" "}
        <strong>₹{revenue.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</strong>
      </p>
      <p style={{ margin: 0, color: "#22c55e", fontSize: "13px" }}>
        Trend:{" "}
        <strong>₹{trend.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</strong>
      </p>
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
      <div style={wrapperStyle}>
        <p style={{ textAlign: "center", color: "#9CA3AF", padding: "40px 0" }}>
          No revenue data available to display chart.
        </p>
      </div>
    );
  }

  return (
    <div style={wrapperStyle}>
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#111827" }}>
            Monthly Revenue Overview
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#6B7280" }}>
            Click a bar to filter the table by that month
          </p>
        </div>

        {/* Summary pills */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {[
            { label: "Total", value: `₹${total.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`, color: "#6366f1" },
            { label: "Monthly Avg", value: `₹${average.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`, color: "#0ea5e9" },
            { label: "Best Month", value: maxMonth || "—", color: "#22c55e" },
            { label: "Worst Month", value: minMonth || "—", color: "#f87171" },
          ].map((s) => (
            <div key={s.label} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "6px 14px", fontSize: "12px" }}>
              <span style={{ color: "#6B7280" }}>{s.label}: </span>
              <strong style={{ color: s.color }}>{s.value}</strong>
            </div>
          ))}
        </div>
      </div>

      {/* ── Chart ── */}
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
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
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.06)" }} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: "13px", paddingTop: "12px" }}
          />

          {/* Average reference line */}
          <ReferenceLine
            y={average}
            stroke="#f59e0b"
            strokeDasharray="4 4"
            label={{ value: "Avg", position: "insideTopRight", fontSize: 11, fill: "#f59e0b" }}
          />

          <Bar
            dataKey="Revenue"
            radius={[6, 6, 0, 0]}
            maxBarSize={48}
            cursor="pointer"
            onClick={(data) => onMonthClick && onMonthClick(data.name)}
          >
            {chartData.map((entry) => {
              const isSelected = selectedMonth === entry.name;
              const isMax = entry.name === maxMonth;
              const isMin = entry.name === minMonth;
              const color = isSelected
                ? "#4f46e5"
                : isMax
                ? "#22c55e"
                : isMin
                ? "#f87171"
                : "#6366f1";
              return <Cell key={entry.name} fill={color} opacity={isSelected || !selectedMonth ? 1 : 0.45} />;
            })}
          </Bar>

          <Line
            type="monotone"
            dataKey="Trend"
            stroke="#0ea5e9"
            strokeWidth={2}
            dot={{ r: 3, fill: "#0ea5e9" }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend hint */}
      <div style={{ display: "flex", gap: "16px", marginTop: "8px", flexWrap: "wrap" }}>
        {[
          { color: "#22c55e", label: "Highest revenue month" },
          { color: "#f87171", label: "Lowest revenue month" },
          { color: "#4f46e5", label: "Selected month" },
          { color: "#f59e0b", label: "Monthly average" },
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

const wrapperStyle = {
  background: "#fff",
  borderRadius: "14px",
  padding: "24px",
  marginBottom: "24px",
  border: "1px solid #e5e7eb",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

export default RevenueChart;
