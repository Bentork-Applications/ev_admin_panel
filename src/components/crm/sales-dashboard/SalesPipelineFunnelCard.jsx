import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function SalesPipelineFunnelCard({
  stages = [],
  accounts = [],
  selectedAccount = "All Accounts",
  onAccountChange,
  loading = false
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Default stage templates if empty or loading
  const defaultStages = [
    { key: "new", name: "New Leads", count: 0, percent: 100, color: "#2563EB" },
    { key: "contacted", name: "Contacted", count: 0, percent: 0, color: "#0284C7" },
    { key: "qualified", name: "Qualified", count: 0, percent: 0, color: "#8B5CF6" },
    { key: "proposal", name: "Proposal", count: 0, percent: 0, color: "#F97316" },
    { key: "negotiation", name: "Negotiation", count: 0, percent: 0, color: "#F59E0B" },
    { key: "won", name: "Won", count: 0, percent: 0, color: "#10B981" }
  ];

  const displayStages = stages && stages.length > 0 ? stages : defaultStages;
  const hasData = stages && stages.some((s) => s.count > 0);

  // Calculate funnel trapezoid widths (from 100% down to ~45%)
  const stageWidths = [
    { top: 100, bottom: 88 },
    { top: 88, bottom: 76 },
    { top: 76, bottom: 64 },
    { top: 64, bottom: 52 },
    { top: 52, bottom: 42 },
    { top: 42, bottom: 42 }
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
          Sales Pipeline Funnel
        </h3>

        {/* Account Filter */}
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
            <span style={{ maxWidth: "110px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {selectedAccount}
            </span>
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
                minWidth: "140px",
                maxHeight: "200px",
                overflowY: "auto"
              }}
            >
              <button
                type="button"
                onClick={() => {
                  if (onAccountChange) onAccountChange("All Accounts");
                  setDropdownOpen(false);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 12px",
                  fontSize: "12px",
                  border: "none",
                  background: selectedAccount === "All Accounts" ? "#EFF6FF" : "transparent",
                  color: selectedAccount === "All Accounts" ? "#2563EB" : "#334155",
                  fontWeight: selectedAccount === "All Accounts" ? 600 : 400,
                  cursor: "pointer"
                }}
              >
                All Accounts
              </button>
              {accounts.map((acc, i) => {
                const name = typeof acc === "string" ? acc : acc.name || acc.email;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      if (onAccountChange) onAccountChange(name);
                      setDropdownOpen(false);
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 12px",
                      fontSize: "12px",
                      border: "none",
                      background: selectedAccount === name ? "#EFF6FF" : "transparent",
                      color: selectedAccount === name ? "#2563EB" : "#334155",
                      fontWeight: selectedAccount === name ? 600 : 400,
                      cursor: "pointer",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Funnel Layout */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "6px" }}>
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
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#94A3B8",
              fontSize: "13px"
            }}
          >
            <span>No active pipeline opportunities</span>
          </div>
        ) : (
          displayStages.map((stage, idx) => {
            const geom = stageWidths[idx] || { top: 50, bottom: 50 };
            const topInset = (100 - geom.top) / 2;
            const bottomInset = (100 - geom.bottom) / 2;
            const clipPath = `polygon(${topInset}% 0%, ${100 - topInset}% 0%, ${100 - bottomInset}% 100%, ${bottomInset}% 100%)`;

            return (
              <div
                key={stage.key || idx}
                style={{
                  display: "grid",
                  gridTemplateColumns: "130px 1fr auto",
                  alignItems: "center",
                  gap: "12px",
                  height: "38px"
                }}
              >
                {/* Visual Tapered Funnel Segment */}
                <div
                  style={{
                    height: "36px",
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative"
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      backgroundColor: stage.color || "#2563EB",
                      clipPath: clipPath,
                      borderRadius: "2px",
                      transition: "all 0.2s ease"
                    }}
                  />
                  {/* Number Inside Funnel */}
                  <span
                    style={{
                      position: "relative",
                      zIndex: 2,
                      color: "#FFFFFF",
                      fontSize: "13px",
                      fontWeight: 700
                    }}
                  >
                    {stage.count}
                  </span>
                </div>

                {/* Stage Label */}
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#334155",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}
                >
                  {stage.name}
                </span>

                {/* Percentage */}
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#64748B",
                    textAlign: "right",
                    minWidth: "35px"
                  }}
                >
                  {stage.percent}%
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
