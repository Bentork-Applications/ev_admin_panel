import React, { useState } from "react";
import { ChevronDown, Package, Image, Sparkles } from "lucide-react";

export default function ProductSalesCard({
  products = [],
  timeRange = "This Month",
  onTimeRangeChange,
  loading = false,
  onProductSelect
}) {
  const [activeTab, setActiveTab] = useState("Revenue"); // "Revenue" | "Units Sold" | "Orders"
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const colors = [
    "#2563EB", // Blue
    "#0284C7", // Sky
    "#8B5CF6", // Purple
    "#F97316", // Coral/Orange
    "#F59E0B", // Amber
    "#EC4899", // Pink
    "#94A3B8"  // Slate
  ];

  const hasData = products && products.length > 0;

  const sortedProducts = React.useMemo(() => {
    if (!products || products.length === 0) return [];
    const list = [...products];
    if (activeTab === "Units Sold") return list.sort((a, b) => (b.unitsSold || 0) - (a.unitsSold || 0));
    if (activeTab === "Orders") return list.sort((a, b) => (b.orders || 0) - (a.orders || 0));
    return list.sort((a, b) => (b.revenue || 0) - (a.revenue || 0));
  }, [products, activeTab]);

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
          marginBottom: "12px"
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
          Product-wise Sales
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

      {/* Tabs Row */}
      <div
        style={{
          display: "flex",
          gap: "6px",
          borderBottom: "1px solid #E2E8F0",
          paddingBottom: "8px",
          marginBottom: "14px"
        }}
      >
        {["Revenue", "Units Sold", "Orders"].map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "4px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: isActive ? 600 : 500,
                border: isActive ? "1px solid #2563EB" : "1px solid transparent",
                backgroundColor: isActive ? "#EFF6FF" : "transparent",
                color: isActive ? "#2563EB" : "#64748B",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Product List */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px", overflowY: "auto" }}>
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
            No product sales recorded in this period
          </div>
        ) : (
          sortedProducts.slice(0, 7).map((prod, i) => {
            const barColor = colors[i % colors.length];
            const pct = prod.percent !== undefined ? prod.percent : (Math.round(((prod.value || prod.revenue || 0) / (products[0]?.value || products[0]?.revenue || 1)) * 100) || 0);

            let formattedVal = "";
            if (activeTab === "Revenue") {
              formattedVal = prod.revenueFormatted || `₹${(prod.revenue / 100000).toFixed(2)}L`;
            } else if (activeTab === "Units Sold") {
              formattedVal = `${prod.unitsSold ?? prod.count ?? 0} units`;
            } else {
              formattedVal = `${prod.orders ?? 0} orders`;
            }

            return (
              <div
                key={i}
                onClick={() => onProductSelect && onProductSelect(prod.name)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "30px 110px 1fr auto",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                  padding: "3px 4px",
                  borderRadius: "6px"
                }}
                className="sales-hover-row"
              >
                {/* Product Thumbnail / Box */}
                <div
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "6px",
                    backgroundColor: "#F1F5F9",
                    border: "1px solid #E2E8F0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#475569",
                    overflow: "hidden"
                  }}
                >
                  {prod.image ? (
                    <img
                      src={prod.image}
                      alt={prod.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <Package size={15} />
                  )}
                </div>

                {/* Product Name */}
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#1E293B",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}
                  title={prod.name}
                >
                  {prod.name}
                </span>

                {/* Progress Bar */}
                <div
                  style={{
                    width: "100%",
                    height: "8px",
                    backgroundColor: "#F1F5F9",
                    borderRadius: "4px",
                    overflow: "hidden"
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(100, Math.max(5, pct))}%`,
                      backgroundColor: barColor,
                      borderRadius: "4px",
                      transition: "width 0.3s ease"
                    }}
                  />
                </div>

                {/* Value & Percent */}
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#0F172A",
                    textAlign: "right",
                    whiteSpace: "nowrap",
                    minWidth: "75px"
                  }}
                >
                  {formattedVal} <span style={{ color: "#64748B", fontWeight: 500 }}>({pct}%)</span>
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
