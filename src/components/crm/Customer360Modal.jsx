import React, { useState, useEffect } from "react";
import { X, Building2, Phone, Mail, MapPin, Calendar, Clock, DollarSign, TrendingUp, CheckCircle, FileText, PhoneCall, Plus, RefreshCw } from "lucide-react";
import { crmService } from "../../services/crmService";

export const Customer360Modal = ({
  isOpen,
  onClose,
  company,
  onLogCall,
  onCreateOpportunity
}) => {
  const [data360, setData360] = useState(null);
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !company?.id) return;

    const fetch360 = async () => {
      setLoading(true);
      try {
        const [res360, reqs] = await Promise.all([
          crmService.getCompany360(company.id).catch(() => null),
          crmService.getRequirementsByCompany(company.id).catch(() => [])
        ]);
        setData360(res360);
        setRequirements(Array.isArray(reqs) ? reqs : []);
      } catch (err) {
        console.error("Failed to load Customer 360 profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetch360();
  }, [isOpen, company?.id]);

  if (!isOpen || !company) return null;

  const activeCompany = data360?.company || company;
  const opportunities = data360?.opportunities || [];
  const quotations = data360?.quotations || [];
  const activities = data360?.activities || [];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
        zIndex: 1300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px"
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "760px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          border: "1px solid #E2E8F0",
          animation: "scaleUp 0.2s ease-out"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #E2E8F0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            backgroundColor: "#F8FAFC"
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#0F172A" }}>
                Customer 360° — {activeCompany.name || activeCompany.companyName || "Company Details"}
              </h2>
              {loading && (
                <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 500 }}>
                  (Loading...)
                </span>
              )}
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#10B981", fontWeight: 500 }}>
              {activeCompany.status || "Active relationship · Real-time activity and commercial history"}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#64748B",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "6px"
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* 4 Quick Stat Cards matching PDF Page 16 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "12px",
            padding: "20px 24px",
            backgroundColor: "#ffffff",
            borderBottom: "1px solid #F1F5F9"
          }}
        >
          <div style={{ padding: "12px 16px", borderRadius: "10px", border: "1px solid #E2E8F0", backgroundColor: "#F8FAFC" }}>
            <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 600 }}>Open Opportunities</span>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>
              {opportunities.length || activeCompany.openOpportunities || activeCompany.openOppCount || 0}
            </div>
          </div>
          <div style={{ padding: "12px 16px", borderRadius: "10px", border: "1px solid #E2E8F0", backgroundColor: "#F8FAFC" }}>
            <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 600 }}>Quotes</span>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>
              {quotations.length || activeCompany.quoteCount || 0}
            </div>
          </div>
          <div style={{ padding: "12px 16px", borderRadius: "10px", border: "1px solid #E2E8F0", backgroundColor: "#F8FAFC" }}>
            <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 600 }}>Requirements</span>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#2563EB", marginTop: "2px" }}>
              {requirements.length || activeCompany.requirementsCount || 0}
            </div>
          </div>
          <div style={{ padding: "12px 16px", borderRadius: "10px", border: "1px solid #E2E8F0", backgroundColor: "#F8FAFC" }}>
            <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 600 }}>Last Contact</span>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#0F172A", marginTop: "4px" }}>
              {activeCompany.lastContact || "—"}
            </div>
          </div>
        </div>

        {/* 2 Column Body matching PDF Page 16 */}
        <div
          style={{
            padding: "20px 24px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "24px",
            overflowY: "auto"
          }}
        >
          {/* Left Column: Company Details */}
          <div>
            <h4 style={{ margin: "0 0 14px 0", fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
              Company Details
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
              <div>
                <span style={{ color: "#64748B" }}>Industry: </span>
                <strong style={{ color: "#1E293B" }}>{activeCompany.industry || "—"}</strong>
              </div>
              <div>
                <span style={{ color: "#64748B" }}>Location: </span>
                <strong style={{ color: "#1E293B" }}>{[activeCompany.city, activeCompany.state].filter(Boolean).join(", ") || "—"}</strong>
              </div>
              <div>
                <span style={{ color: "#64748B" }}>Primary Contact: </span>
                <strong style={{ color: "#1E293B" }}>{activeCompany.primaryContact || activeCompany.contactPerson || "—"}</strong>
              </div>
              <div>
                <span style={{ color: "#64748B" }}>Phone: </span>
                <strong style={{ color: "#1E293B" }}>{activeCompany.phone || activeCompany.phoneNumber || "—"}</strong>
              </div>
              <div>
                <span style={{ color: "#64748B" }}>Products: </span>
                <strong style={{ color: "#1E293B" }}>{activeCompany.products || activeCompany.productCategory || "—"}</strong>
              </div>

              {/* Tags */}
              <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "6px", backgroundColor: "#EFF6FF", color: "#2563EB", border: "1px solid #DBEAFE" }}>
                  {activeCompany.type || "Customer"}
                </span>
                {activeCompany.status && (
                  <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "6px", backgroundColor: "#F0FDF4", color: "#16A34A", border: "1px solid #DCFCE7" }}>
                    {activeCompany.status}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Recent Timeline */}
          <div>
            <h4 style={{ margin: "0 0 14px 0", fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
              Recent Timeline & Activities
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", borderLeft: "2px solid #E2E8F0", paddingLeft: "14px", marginLeft: "4px" }}>
              {activities.length > 0 ? (
                activities.slice(0, 5).map((act, i) => (
                  <div key={act.id || i}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A" }}>{act.activityType || act.type || "Activity"} — {act.subject || act.outcome || "Completed"}</div>
                    <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>{act.activityDate || act.dueDate || act.createdAt || "Recently"} {act.notes ? `· ${act.notes}` : ""}</div>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: "13px", color: "#64748B", margin: 0 }}>
                  No recent activities recorded.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions matching PDF Page 16 */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #E2E8F0",
            backgroundColor: "#F8FAFC",
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px"
          }}
        >
          <button
            onClick={() => {
              onClose();
              onLogCall?.(activeCompany);
            }}
            style={{
              padding: "9px 16px",
              borderRadius: "8px",
              backgroundColor: "#ffffff",
              color: "#334155",
              border: "1px solid #CBD5E1",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Log Call
          </button>
          <button
            onClick={() => {
              onClose();
              onCreateOpportunity?.(activeCompany);
            }}
            style={{
              padding: "9px 18px",
              borderRadius: "8px",
              backgroundColor: "#2563EB",
              color: "#ffffff",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Create Opportunity
          </button>
        </div>
      </div>
    </div>
  );
};
