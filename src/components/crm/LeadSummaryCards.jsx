import React from "react";
import {
  Users,
  UserPlus,
  Clock,
  TrendingUp,
  XCircle
} from "lucide-react";

const SUMMARY_CARD_DEFINITIONS = [
  {
    id: "total",
    title: "Total Leads",
    countKey: "total",
    targetStatus: "ALL",
    icon: Users,
    color: "#2563EB",
    bg: "#EFF6FF",
    border: "#BFDBFE",
    activeBorder: "#2563EB",
    activeBg: "#F8FAFC",
    subtitle: "All Ingested Leads"
  },
  {
    id: "new_this_month",
    title: "New Leads This Month",
    countKey: "newThisMonthCount",
    targetStatus: "NEW_THIS_MONTH",
    icon: UserPlus,
    color: "#0284C7",
    bg: "#F0F9FF",
    border: "#BAE6FD",
    activeBorder: "#0284C7",
    activeBg: "#F0F9FF",
    subtitle: "Created This Month"
  },
  {
    id: "pending",
    title: "Pending Leads",
    countKey: "pendingCount",
    targetStatus: "PENDING",
    icon: Clock,
    color: "#D97706",
    bg: "#FFFBEB",
    border: "#FDE68A",
    activeBorder: "#D97706",
    activeBg: "#FFFBEB",
    subtitle: "Action / Follow-up"
  },
  {
    id: "converted",
    title: "Converted Leads",
    countKey: "convertedCount",
    targetStatus: "converted",
    icon: TrendingUp,
    color: "#16A34A",
    bg: "#F0FDF4",
    border: "#BBF7D0",
    activeBorder: "#16A34A",
    activeBg: "#F0FDF4",
    subtitle: "Won / Customer"
  },
  {
    id: "lost",
    title: "Lost Leads",
    countKey: "lostCount",
    targetStatus: "lost",
    icon: XCircle,
    color: "#DC2626",
    bg: "#FEF2F2",
    border: "#FECACA",
    activeBorder: "#DC2626",
    activeBg: "#FEF2F2",
    subtitle: "Closed / Lost"
  }
];

export const LeadSummaryCards = ({
  cardCounts = {},
  loading = false,
  activeStatus = "ALL",
  onStatusSelect
}) => {
  return (
    <>
      <style>{`
        .crm-lead-summary-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }
        @media (max-width: 1180px) {
          .crm-lead-summary-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
        @media (max-width: 768px) {
          .crm-lead-summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 480px) {
          .crm-lead-summary-grid {
            grid-template-columns: 1fr;
          }
        }

        .crm-lead-summary-card {
          background-color: #ffffff;
          border-radius: 12px;
          padding: 14px 16px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          flex-direction: column;
          justifyContent: space-between;
          min-height: 98px;
          position: relative;
          user-select: none;
        }
        .crm-lead-summary-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 14px rgba(0, 0, 0, 0.07);
          border-color: #CBD5E1;
        }
        .crm-lead-summary-card:active {
          transform: translateY(0);
        }
        .crm-lead-summary-card.is-active {
          transform: translateY(-1px);
        }
        .crm-summary-skeleton {
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: crmPulse 1.5s infinite;
          border-radius: 4px;
        }
      `}</style>

      <div className="crm-lead-summary-grid">
        {loading ? (
          SUMMARY_CARD_DEFINITIONS.map((def) => (
            <div
              key={def.id}
              className="crm-lead-summary-card"
              style={{ cursor: "default" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div className="crm-summary-skeleton" style={{ height: "12px", width: "70px" }} />
                <div className="crm-summary-skeleton" style={{ height: "28px", width: "28px", borderRadius: "8px" }} />
              </div>
              <div className="crm-summary-skeleton" style={{ height: "26px", width: "48px", marginBottom: "8px" }} />
              <div className="crm-summary-skeleton" style={{ height: "10px", width: "84px" }} />
            </div>
          ))
        ) : (
          SUMMARY_CARD_DEFINITIONS.map((card) => {
            const count = Number(cardCounts[card.countKey] ?? 0);
            const Icon = card.icon;

            const isActive =
              card.targetStatus === "ALL"
                ? activeStatus === "ALL" || !activeStatus
                : (activeStatus || "").toUpperCase() === card.targetStatus.toUpperCase();

            return (
              <div
                key={card.id}
                onClick={() => onStatusSelect && onStatusSelect(card.targetStatus)}
                className={`crm-lead-summary-card ${isActive ? "is-active" : ""}`}
                style={{
                  borderColor: isActive ? card.activeBorder : "#E2E8F0",
                  backgroundColor: isActive ? card.activeBg : "#ffffff",
                  boxShadow: isActive
                    ? `0 0 0 1.5px ${card.activeBorder}, 0 4px 12px rgba(0, 0, 0, 0.06)`
                    : "0 1px 3px rgba(0, 0, 0, 0.04)"
                }}
                title={`Click to filter leads by: ${card.title}`}
              >
                {/* Top Row: Title + Icon */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "6px"
                  }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: isActive ? card.color : "#64748B"
                    }}
                  >
                    {card.title}
                  </span>
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "8px",
                      backgroundColor: card.bg,
                      border: `1px solid ${card.border}`,
                      color: card.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0
                    }}
                  >
                    <Icon size={15} />
                  </div>
                </div>

                {/* Middle Row: Big Count Number + Active Tag */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: "6px",
                    marginBottom: "4px"
                  }}
                >
                  <span
                    style={{
                      fontSize: "24px",
                      fontWeight: 700,
                      color: "#0F172A",
                      lineHeight: 1.1
                    }}
                  >
                    {count.toLocaleString("en-IN")}
                  </span>

                  {isActive && card.targetStatus !== "ALL" && (
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 700,
                        color: card.color,
                        backgroundColor: card.bg,
                        border: `1px solid ${card.border}`,
                        borderRadius: "4px",
                        padding: "1px 5px",
                        letterSpacing: "0.03em"
                      }}
                    >
                      FILTERED
                    </span>
                  )}
                </div>

                {/* Bottom Row: Subtitle / Context description */}
                <div
                  style={{
                    fontSize: "11px",
                    color: isActive ? card.color : "#94A3B8",
                    fontWeight: 500
                  }}
                >
                  {card.subtitle}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
};

export default LeadSummaryCards;
