import React, { useState, useEffect, useCallback } from "react";
import { X, Building, Phone, Mail, MapPin, DollarSign, Calendar, User, Clock, ArrowRight, CheckCircle, RefreshCw } from "lucide-react";
import { crmService } from "../../services/crmService";
import { LeadStatusBadge } from "./CrmBadge";
import { ActivityTimeline } from "./ActivityTimeline";

export const LeadDetailDrawer = ({
  leadId,
  isOpen,
  onClose,
  onLeadUpdated,
  showToast
}) => {
  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchLeadDetails = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    try {
      const [leadData, activityData] = await Promise.all([
        crmService.getLeadById(leadId),
        crmService.getActivitiesForLead(leadId).catch(() => [])
      ]);
      setLead(leadData);
      setActivities(Array.isArray(activityData) ? activityData : []);
    } catch (err) {
      console.error("Error fetching lead details:", err);
      showToast?.(err.message || "Failed to load lead details", "error");
    } finally {
      setLoading(false);
    }
  }, [leadId, showToast]);

  useEffect(() => {
    if (isOpen && leadId) {
      fetchLeadDetails();
    }
  }, [isOpen, leadId, fetchLeadDetails]);

  if (!isOpen) return null;

  const handleStatusChange = async (newStatus) => {
    setUpdating(true);
    try {
      await crmService.updateLeadStatus(leadId, newStatus.toUpperCase());
      showToast?.(`Lead status updated to ${newStatus.toUpperCase()}`, "success");
      await fetchLeadDetails();
      onLeadUpdated?.();
    } catch (err) {
      console.error("Error updating status:", err);
      showToast?.(err.message || "Failed to update lead status", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleConvert = async () => {
    setUpdating(true);
    try {
      const opp = await crmService.convertLeadToOpportunity(leadId);
      showToast?.(`Lead converted to Opportunity ${opp?.opportunityNumber || ""}`, "success");
      await fetchLeadDetails();
      onLeadUpdated?.();
    } catch (err) {
      console.error("Error converting lead:", err);
      showToast?.(err.message || "Failed to convert lead to opportunity", "error");
    } finally {
      setUpdating(false);
    }
  };

  const currentStatus = (lead?.status || "NEW").toUpperCase();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        backdropFilter: "blur(4px)",
        zIndex: 1200,
        display: "flex",
        justifyContent: "flex-end"
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "580px",
          height: "100%",
          backgroundColor: "#ffffff",
          boxShadow: "-10px 0 30px rgba(0, 0, 0, 0.15)",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          animation: "slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #F3F4F6",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            backgroundColor: "#ffffff",
            zIndex: 10
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#10B981" }}>
                {lead?.leadNumber || `LEAD #${leadId}`}
              </span>
              {lead && <LeadStatusBadge status={lead.status} />}
            </div>
            <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#111827" }}>
              {lead?.title || "Lead Details"}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#9CA3AF",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "6px"
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#6B7280" }}>
            Loading lead details...
          </div>
        ) : !lead ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#EF4444" }}>
            Lead not found
          </div>
        ) : (
          <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Status Progression Controls */}
            <div
              style={{
                backgroundColor: "#F9FAFB",
                borderRadius: "12px",
                padding: "16px",
                border: "1px solid #E5E7EB"
              }}
            >
              <span style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "10px" }}>
                Available Status Transitions
              </span>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {currentStatus === "NEW" && (
                  <>
                    <button
                      disabled={updating}
                      onClick={() => handleStatusChange("CONTACTED")}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        backgroundColor: "#FEF3C7",
                        color: "#92400E",
                        border: "1px solid #FDE68A",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      → Mark Contacted
                    </button>
                    <button
                      disabled={updating}
                      onClick={() => handleStatusChange("LOST")}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        backgroundColor: "#FEF2F2",
                        color: "#991B1B",
                        border: "1px solid #FECACA",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      ✕ Mark Lost
                    </button>
                  </>
                )}

                {currentStatus === "CONTACTED" && (
                  <>
                    <button
                      disabled={updating}
                      onClick={() => handleStatusChange("QUALIFIED")}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        backgroundColor: "#ECFDF5",
                        color: "#065F46",
                        border: "1px solid #A7F3D0",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      ✓ Mark Qualified
                    </button>
                    <button
                      disabled={updating}
                      onClick={() => handleStatusChange("NURTURE")}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        backgroundColor: "#F3E8FF",
                        color: "#6B21A8",
                        border: "1px solid #E9D5FF",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      ⌛ Move to Nurture
                    </button>
                    <button
                      disabled={updating}
                      onClick={() => handleStatusChange("LOST")}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        backgroundColor: "#FEF2F2",
                        color: "#991B1B",
                        border: "1px solid #FECACA",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      ✕ Mark Lost
                    </button>
                  </>
                )}

                {currentStatus === "QUALIFIED" && (
                  <>
                    <button
                      disabled={updating}
                      onClick={handleConvert}
                      style={{
                        padding: "7px 16px",
                        borderRadius: "6px",
                        backgroundColor: "#10B981",
                        color: "#ffffff",
                        border: "none",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        boxShadow: "0 2px 4px rgba(16, 185, 129, 0.2)"
                      }}
                    >
                      <ArrowRight size={14} />
                      <span>Convert to Opportunity</span>
                    </button>
                    <button
                      disabled={updating}
                      onClick={() => handleStatusChange("LOST")}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        backgroundColor: "#FEF2F2",
                        color: "#991B1B",
                        border: "1px solid #FECACA",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      ✕ Mark Lost
                    </button>
                  </>
                )}

                {currentStatus === "NURTURE" && (
                  <>
                    <button
                      disabled={updating}
                      onClick={() => handleStatusChange("CONTACTED")}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        backgroundColor: "#FEF3C7",
                        color: "#92400E",
                        border: "1px solid #FDE68A",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      → Re-engage (Contacted)
                    </button>
                    <button
                      disabled={updating}
                      onClick={() => handleStatusChange("LOST")}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        backgroundColor: "#FEF2F2",
                        color: "#991B1B",
                        border: "1px solid #FECACA",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      ✕ Mark Lost
                    </button>
                  </>
                )}

                {currentStatus === "CONVERTED" && (
                  <span style={{ fontSize: "12px", color: "#047857", fontWeight: 600 }}>
                    ✓ Lead has been converted to Opportunity #{lead.convertedToOpportunityId || ""}
                  </span>
                )}

                {currentStatus === "LOST" && (
                  <span style={{ fontSize: "12px", color: "#991B1B", fontWeight: 600 }}>
                    This lead is closed as lost.
                  </span>
                )}
              </div>
            </div>

            {/* Contact & Company Details Card */}
            <div
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #E5E7EB",
                borderRadius: "12px",
                padding: "18px"
              }}
            >
              <h4 style={{ margin: "0 0 14px 0", fontSize: "14px", fontWeight: 700, color: "#111827" }}>
                Contact & Company
              </h4>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
                <div>
                  <span style={{ color: "#6B7280", fontSize: "11px", display: "block" }}>Company</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", fontWeight: 600, color: "#111827" }}>
                    <Building size={14} color="#6B7280" />
                    <span>{lead.companyName || "—"}</span>
                  </div>
                </div>

                <div>
                  <span style={{ color: "#6B7280", fontSize: "11px", display: "block" }}>Contact Person</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", fontWeight: 600, color: "#111827" }}>
                    <User size={14} color="#6B7280" />
                    <span>{lead.contactName || "—"}</span>
                  </div>
                </div>

                <div>
                  <span style={{ color: "#6B7280", fontSize: "11px", display: "block" }}>Phone</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#111827" }}>
                    <Phone size={14} color="#6B7280" />
                    <span>{lead.contactPhone || "—"}</span>
                  </div>
                </div>

                <div>
                  <span style={{ color: "#6B7280", fontSize: "11px", display: "block" }}>Location</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#111827" }}>
                    <MapPin size={14} color="#6B7280" />
                    <span>{[lead.city, lead.state].filter(Boolean).join(", ") || "—"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sales Pipeline Info Card */}
            <div
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #E5E7EB",
                borderRadius: "12px",
                padding: "18px"
              }}
            >
              <h4 style={{ margin: "0 0 14px 0", fontSize: "14px", fontWeight: 700, color: "#111827" }}>
                Lead Information
              </h4>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
                <div>
                  <span style={{ color: "#6B7280", fontSize: "11px", display: "block" }}>Estimated Value</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", fontWeight: 700, color: "#10B981" }}>
                    <span>₹{lead.estimatedValue ? Number(lead.estimatedValue).toLocaleString("en-IN") : "0"}</span>
                  </div>
                </div>

                <div>
                  <span style={{ color: "#6B7280", fontSize: "11px", display: "block" }}>Source</span>
                  <div style={{ textTransform: "capitalize", fontWeight: 500 }}>
                    {lead.source?.replace("_", " ") || "Direct"}
                  </div>
                </div>

                <div>
                  <span style={{ color: "#6B7280", fontSize: "11px", display: "block" }}>Next Follow-up</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", color: lead.nextFollowUpDate ? "#D97706" : "#6B7280" }}>
                    <Calendar size={14} />
                    <span>{lead.nextFollowUpDate || "Not scheduled"}</span>
                  </div>
                </div>

                <div>
                  <span style={{ color: "#6B7280", fontSize: "11px", display: "block" }}>Lead Owner</span>
                  <div>{lead.ownerAdminName || "Unassigned"}</div>
                </div>
              </div>

              {lead.notes && (
                <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid #F3F4F6" }}>
                  <span style={{ color: "#6B7280", fontSize: "11px", display: "block", marginBottom: "4px" }}>
                    Notes
                  </span>
                  <div style={{ fontSize: "13px", color: "#374151", backgroundColor: "#F9FAFB", padding: "10px", borderRadius: "8px", lineHeight: 1.5 }}>
                    {lead.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Activity Timeline Section */}
            <ActivityTimeline
              activities={activities}
              leadId={leadId}
              companyId={lead.companyId}
              contactId={lead.contactId}
              onRefresh={fetchLeadDetails}
              showToast={showToast}
            />
          </div>
        )}
      </div>
    </div>
  );
};
