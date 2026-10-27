import React, { useState } from "react";
import {
  FileText,
  ChevronDown,
  ShoppingCart,
  CheckCircle2,
  Clock,
  Truck,
  PackageCheck,
  XCircle
} from "lucide-react";

export default function OrderStatusRevenueCard({
  stats = {},
  timeRange = "This Month",
  onTimeRangeChange,
  loading = false,
  onStatusClick
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const total = stats.totalOrders || 0;
  const confirmed = stats.confirmed || 0;
  const processing = stats.processing || 0;
  const shipped = stats.shipped || 0;
  const delivered = stats.delivered || 0;
  const cancelled = stats.cancelled || 0;

  const confirmedPct = total > 0 ? Math.round((confirmed / total) * 100) : 0;
  const processingPct = total > 0 ? Math.round((processing / total) * 100) : 0;
  const shippedPct = total > 0 ? Math.round((shipped / total) * 100) : 0;
  const deliveredPct = total > 0 ? Math.round((delivered / total) * 100) : 0;
  const cancelledPct = total > 0 ? Math.round((cancelled / total) * 100) : 0;

  const miniCards = [
    {
      label: "Total Orders",
      value: total,
      subtext: stats.totalTrend || "↑ 18% vs last month",
      isPositive: true,
      icon: ShoppingCart,
      iconBg: "#EFF6FF",
      iconColor: "#2563EB"
    },
    {
      label: "Confirmed",
      value: confirmed,
      subtext: `${confirmedPct}% of total`,
      isPositive: true,
      icon: CheckCircle2,
      iconBg: "#ECFDF5",
      iconColor: "#10B981"
    },
    {
      label: "Processing",
      value: processing,
      subtext: `${processingPct}% of total`,
      isPositive: true,
      icon: Clock,
      iconBg: "#EFF6FF",
      iconColor: "#3B82F6"
    },
    {
      label: "Shipped",
      value: shipped,
      subtext: `${shippedPct}% of total`,
      isPositive: true,
      icon: Truck,
      iconBg: "#EEF2FF",
      iconColor: "#4F46E5"
    },
    {
      label: "Delivered",
      value: delivered,
      subtext: `${deliveredPct}% of total`,
      isPositive: true,
      icon: PackageCheck,
      iconBg: "#D1FAE5",
      iconColor: "#059669"
    },
    {
      label: "Cancelled",
      value: cancelled,
      subtext: `${cancelledPct}% of total`,
      isPositive: false,
      isDanger: true,
      icon: XCircle,
      iconBg: "#FEE2E2",
      iconColor: "#EF4444"
    }
  ];

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
        justifyContent: "space-between",
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
              backgroundColor: "#DCFCE7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#16A34A"
            }}
          >
            <FileText size={16} />
          </div>
          <h3
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: "#0F172A",
              margin: 0
            }}
          >
            Order Status & Revenue
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

      {/* 6 Mini Status Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: "10px",
          marginBottom: "20px"
        }}
        className="order-status-mini-grid"
      >
        {miniCards.map((card, i) => {
          const CardIcon = card.icon;
          return (
            <div
              key={i}
              onClick={() => onStatusClick && onStatusClick(card.label)}
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "10px",
                padding: "10px 12px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
              className="sales-hover-row"
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748B", whiteSpace: "nowrap" }}>
                  {card.label}
                </span>
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "6px",
                    backgroundColor: card.iconBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: card.iconColor,
                    flexShrink: 0
                  }}
                >
                  <CardIcon size={13} strokeWidth={2.2} />
                </div>
              </div>

              <div style={{ fontSize: "20px", fontWeight: 700, color: "#0F172A", lineHeight: 1.1 }}>
                {loading ? (
                  <span className="sales-skeleton-pulse" style={{ display: "inline-block", width: "40px", height: "20px", borderRadius: "4px" }} />
                ) : (
                  card.value
                )}
              </div>

              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  color: card.isDanger ? "#EF4444" : card.isPositive ? "#16A34A" : "#64748B",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}
              >
                {card.subtext}
              </div>
            </div>
          );
        })}
      </div>

      {/* Stacked Multi-segmented Progress Bar */}
      <div style={{ marginBottom: "14px" }}>
        <div
          style={{
            height: "12px",
            width: "100%",
            backgroundColor: "#F1F5F9",
            borderRadius: "6px",
            display: "flex",
            overflow: "hidden",
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)"
          }}
        >
          {total === 0 ? (
            <div style={{ width: "100%", height: "100%", backgroundColor: "#E2E8F0" }} />
          ) : (
            <>
              {confirmed > 0 && (
                <div
                  style={{
                    width: `${(confirmed / total) * 100}%`,
                    height: "100%",
                    backgroundColor: "#10B981",
                    transition: "width 0.3s ease"
                  }}
                  title={`Confirmed: ${confirmed} (${confirmedPct}%)`}
                />
              )}
              {processing > 0 && (
                <div
                  style={{
                    width: `${(processing / total) * 100}%`,
                    height: "100%",
                    backgroundColor: "#3B82F6",
                    transition: "width 0.3s ease"
                  }}
                  title={`Processing: ${processing} (${processingPct}%)`}
                />
              )}
              {shipped > 0 && (
                <div
                  style={{
                    width: `${(shipped / total) * 100}%`,
                    height: "100%",
                    backgroundColor: "#F97316",
                    transition: "width 0.3s ease"
                  }}
                  title={`Shipped: ${shipped} (${shippedPct}%)`}
                />
              )}
              {delivered > 0 && (
                <div
                  style={{
                    width: `${(delivered / total) * 100}%`,
                    height: "100%",
                    backgroundColor: "#8B5CF6",
                    transition: "width 0.3s ease"
                  }}
                  title={`Delivered: ${delivered} (${deliveredPct}%)`}
                />
              )}
              {cancelled > 0 && (
                <div
                  style={{
                    width: `${(cancelled / total) * 100}%`,
                    height: "100%",
                    backgroundColor: "#EF4444",
                    transition: "width 0.3s ease"
                  }}
                  title={`Cancelled: ${cancelled} (${cancelledPct}%)`}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Legend Row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "18px",
          flexWrap: "wrap",
          fontSize: "11px",
          fontWeight: 600,
          color: "#475569"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "9px", height: "9px", borderRadius: "50%", backgroundColor: "#10B981" }} />
          <span>Confirmed ({confirmed})</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "9px", height: "9px", borderRadius: "50%", backgroundColor: "#3B82F6" }} />
          <span>Processing ({processing})</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "9px", height: "9px", borderRadius: "50%", backgroundColor: "#F97316" }} />
          <span>Shipped ({shipped})</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "9px", height: "9px", borderRadius: "50%", backgroundColor: "#8B5CF6" }} />
          <span>Delivered ({delivered})</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "9px", height: "9px", borderRadius: "50%", backgroundColor: "#EF4444" }} />
          <span>Cancelled ({cancelled})</span>
        </div>
      </div>
    </div>
  );
}
