import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  TrendingUp,
  Building,
  User,
  DollarSign,
  Calendar,
  Percent,
  FileText,
  Plus,
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { crmService } from "../../services/crmService";
import { OpportunityStageBadge, QuotationStatusBadge } from "./CrmBadge";
import { ActivityTimeline } from "./ActivityTimeline";

const STAGES = [
  { id: "QUALIFIED", label: "Qualified", probability: 20 },
  { id: "REQUIREMENT", label: "Requirement", probability: 40 },
  { id: "PROPOSAL", label: "Proposal", probability: 60 },
  { id: "NEGOTIATION", label: "Negotiation", probability: 80 },
  { id: "WON", label: "Won", probability: 100 },
  { id: "LOST", label: "Lost", probability: 0 }
];

export const formatINR = (amount) => {
  if (amount == null || amount === "" || isNaN(Number(amount))) return "₹0";
  const num = Number(amount);
  return "₹" + num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
};

export const formatCloseDate = (dateStr) => {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    const day = String(d.getDate()).padStart(2, "0");
    const month = d.toLocaleString("en-GB", { month: "short" });
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return "—";
  }
};

export const OpportunityDetailDrawer = ({
  opportunityId,
  isOpen,
  onClose,
  onOpportunityUpdated,
  onOpenQuotationBuilder,
  showToast
}) => {
  const [opp, setOpp] = useState(null);
  const [quotations, setQuotations] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingStage, setUpdatingStage] = useState(false);

  // Lost Reason Modal State
  const [showLostModal, setShowLostModal] = useState(false);
  const [lostReasonInput, setLostReasonInput] = useState("");

  const fetchOpportunityDetails = useCallback(async () => {
    if (!opportunityId) return;
    setLoading(true);
    try {
      const [oppData, quotesData, actsData] = await Promise.all([
        crmService.getOpportunityById(opportunityId),
        crmService.getQuotationsForOpportunity(opportunityId).catch(() => []),
        crmService.getActivitiesForOpportunity(opportunityId).catch(() => [])
      ]);
      setOpp(oppData);
      setQuotations(Array.isArray(quotesData) ? quotesData : []);
      setActivities(Array.isArray(actsData) ? actsData : []);
    } catch (err) {
      console.error("Error fetching opportunity details:", err);
      showToast?.(err.message || "Failed to load opportunity details", "error");
    } finally {
      setLoading(false);
    }
  }, [opportunityId, showToast]);

  useEffect(() => {
    if (isOpen && opportunityId) {
      fetchOpportunityDetails();
    }
  }, [isOpen, opportunityId, fetchOpportunityDetails]);

  if (!isOpen) return null;

  const currentStage = (opp?.stage || "QUALIFIED").toUpperCase();
  const dealValue = Number(opp?.value) || 0;
  const probability = opp?.probability != null && !isNaN(Number(opp.probability)) ? Number(opp.probability) : 0;
  const weightedValue = (dealValue * probability) / 100;
  const oppIdDisplay = opp?.opportunityNumber || (opp?.id ? `OPP-${opp.id.toString().padStart(3, "0")}` : "—");
  const ownerName = opp?.ownerAdminName || opp?.owner || "Unassigned";

  const handleStageChange = async (targetStage, reason = null) => {
    if (targetStage === "LOST" && !reason) {
      setShowLostModal(true);
      return;
    }

    setUpdatingStage(true);
    try {
      await crmService.updateOpportunityStage(opportunityId, {
        stage: targetStage,
        lostReason: reason || null
      });
      showToast?.(`Stage updated to ${targetStage}`, "success");
      await fetchOpportunityDetails();
      onOpportunityUpdated?.();
      setShowLostModal(false);
    } catch (err) {
      console.error("Error updating stage:", err);
      showToast?.(err.message || "Invalid stage transition", "error");
    } finally {
      setUpdatingStage(false);
    }
  };

  const currentStageIndex = STAGES.findIndex((s) => s.id === currentStage);

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
          maxWidth: "640px",
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
                {oppIdDisplay}
              </span>
              {opp && <OpportunityStageBadge stage={opp.stage} />}
            </div>
            <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#111827" }}>
              {opp?.title || "Opportunity Details"}
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
            Loading opportunity...
          </div>
        ) : !opp ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#EF4444" }}>
            Opportunity not found
          </div>
        ) : (
          <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Visual Stage Pipeline Progression Bar */}
            <div
              style={{
                backgroundColor: "#F9FAFB",
                borderRadius: "12px",
                padding: "16px",
                border: "1px solid #E5E7EB"
              }}
            >
              <span style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "12px" }}>
                Pipeline Stage Progression
              </span>

              {/* Pipeline bar */}
              <div style={{ display: "flex", gap: "4px", borderRadius: "8px", overflow: "hidden", marginBottom: "14px" }}>
                {["QUALIFIED", "REQUIREMENT", "PROPOSAL", "NEGOTIATION", "WON"].map((stageKey, idx) => {
                  const stageObj = STAGES.find((s) => s.id === stageKey);
                  const isCurrent = currentStage === stageKey;
                  const isPassed = currentStageIndex > idx && currentStage !== "LOST";

                  let bg = "#E5E7EB";
                  let textColor = "#6B7280";
                  if (isCurrent) {
                    bg = "#10B981";
                    textColor = "#ffffff";
                  } else if (isPassed) {
                    bg = "#A7F3D0";
                    textColor = "#065F46";
                  }

                  return (
                    <div
                      key={stageKey}
                      style={{
                        flex: 1,
                        padding: "8px 4px",
                        textAlign: "center",
                        backgroundColor: bg,
                        color: textColor,
                        fontSize: "11px",
                        fontWeight: 600,
                        transition: "all 0.2s"
                      }}
                    >
                      {stageObj.label}
                    </div>
                  );
                })}
              </div>

              {/* Stage Transition Action Buttons */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
                {currentStage === "WON" ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#16A34A", fontSize: "12px", fontWeight: 700 }}>
                    <CheckCircle2 size={16} color="#16A34A" />
                    <span>Opportunity Won & Successfully Closed</span>
                  </div>
                ) : currentStage === "LOST" ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#DC2626", fontSize: "12px", fontWeight: 700 }}>
                    <AlertCircle size={16} color="#DC2626" />
                    <span>Opportunity Closed as Lost</span>
                  </div>
                ) : (
                  <>
                    <span style={{ fontSize: "11px", color: "#6B7280", fontWeight: 500 }}>Advance Stage:</span>
                    {currentStage === "QUALIFIED" && (
                      <button
                        disabled={updatingStage}
                        onClick={() => handleStageChange("REQUIREMENT")}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "6px",
                          backgroundColor: "#10B981",
                          color: "#ffffff",
                          border: "none",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer"
                        }}
                      >
                        → Requirement
                      </button>
                    )}

                    {currentStage === "REQUIREMENT" && (
                      <button
                        disabled={updatingStage}
                        onClick={() => handleStageChange("PROPOSAL")}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "6px",
                          backgroundColor: "#10B981",
                          color: "#ffffff",
                          border: "none",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer"
                        }}
                      >
                        → Proposal
                      </button>
                    )}

                    {currentStage === "PROPOSAL" && (
                      <button
                        disabled={updatingStage}
                        onClick={() => handleStageChange("NEGOTIATION")}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "6px",
                          backgroundColor: "#10B981",
                          color: "#ffffff",
                          border: "none",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer"
                        }}
                      >
                        → Negotiation
                      </button>
                    )}

                    {currentStage === "NEGOTIATION" && (
                      <button
                        disabled={updatingStage}
                        onClick={() => handleStageChange("WON")}
                        style={{
                          padding: "6px 14px",
                          borderRadius: "6px",
                          backgroundColor: "#10B981",
                          color: "#ffffff",
                          border: "none",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        <CheckCircle2 size={13} />
                        <span>Close as WON</span>
                      </button>
                    )}

                    <button
                      disabled={updatingStage}
                      onClick={() => handleStageChange("LOST")}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        backgroundColor: "#FEF2F2",
                        color: "#991B1B",
                        border: "1px solid #FECACA",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                        marginLeft: "auto"
                      }}
                    >
                      ✕ Close as Lost
                    </button>
                  </>
                )}
              </div>

              {opp.lostReason && (
                <div style={{ marginTop: "10px", padding: "8px 12px", backgroundColor: "#FEF2F2", borderRadius: "6px", fontSize: "12px", color: "#991B1B" }}>
                  <strong>Lost Reason:</strong> {opp.lostReason}
                </div>
              )}
            </div>

            {/* Deal Metrics Card */}
            <div
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #E5E7EB",
                borderRadius: "12px",
                padding: "18px"
              }}
            >
              <h4 style={{ margin: "0 0 14px 0", fontSize: "14px", fontWeight: 700, color: "#111827" }}>
                Deal Metrics
              </h4>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "14px", fontSize: "13px" }}>
                <div>
                  <span style={{ color: "#6B7280", fontSize: "11px", display: "block", marginBottom: "2px" }}>Deal Value</span>
                  <strong style={{ color: "#10B981", fontSize: "16px" }}>
                    {formatINR(dealValue)}
                  </strong>
                </div>

                <div>
                  <span style={{ color: "#6B7280", fontSize: "11px", display: "block", marginBottom: "2px" }}>Probability</span>
                  <strong style={{ color: "#111827", fontSize: "16px" }}>{probability}%</strong>
                </div>

                <div>
                  <span style={{ color: "#6B7280", fontSize: "11px", display: "block", marginBottom: "2px" }}>Weighted Value</span>
                  <strong style={{ color: "#2563EB", fontSize: "16px" }}>
                    {formatINR(weightedValue)}
                  </strong>
                </div>

                <div>
                  <span style={{ color: "#6B7280", fontSize: "11px", display: "block", marginBottom: "2px" }}>Expected Close</span>
                  <span style={{ color: "#111827", fontWeight: 600 }}>{formatCloseDate(opp.expectedCloseDate)}</span>
                </div>

                <div>
                  <span style={{ color: "#6B7280", fontSize: "11px", display: "block", marginBottom: "2px" }}>Owner</span>
                  <span style={{ color: "#111827", fontWeight: 500 }}>{ownerName}</span>
                </div>

                <div>
                  <span style={{ color: "#6B7280", fontSize: "11px", display: "block", marginBottom: "2px" }}>Opportunity ID</span>
                  <span style={{ color: "#111827", fontWeight: 600 }}>{oppIdDisplay}</span>
                </div>

                <div>
                  <span style={{ color: "#6B7280", fontSize: "11px", display: "block", marginBottom: "2px" }}>Originating Lead</span>
                  <span style={{ color: "#111827" }}>{opp.leadNumber || "—"}</span>
                </div>

                <div>
                  <span style={{ color: "#6B7280", fontSize: "11px", display: "block", marginBottom: "2px" }}>Created On</span>
                  <span style={{ color: "#111827" }}>{formatCloseDate(opp.createdAt)}</span>
                </div>
              </div>

              {opp.notes && (
                <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid #F3F4F6" }}>
                  <span style={{ color: "#6B7280", fontSize: "11px", display: "block", marginBottom: "4px" }}>
                    Notes
                  </span>
                  <div style={{ fontSize: "12px", color: "#374151", backgroundColor: "#F9FAFB", padding: "10px", borderRadius: "8px" }}>
                    {opp.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Associated Company & Contact Card */}
            <div
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #E5E7EB",
                borderRadius: "12px",
                padding: "18px"
              }}
            >
              <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: 700, color: "#111827" }}>
                Account & Contact
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
                <div>
                  <span style={{ color: "#6B7280", fontSize: "11px", display: "block" }}>Company</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", fontWeight: 600 }}>
                    <Building size={14} color="#6B7280" />
                    <span>{opp.companyName || "—"}</span>
                  </div>
                </div>
                <div>
                  <span style={{ color: "#6B7280", fontSize: "11px", display: "block" }}>Contact</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", fontWeight: 600 }}>
                    <User size={14} color="#6B7280" />
                    <span>{opp.contactName || "—"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Linked Quotations Section */}
            <div
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #E5E7EB",
                borderRadius: "12px",
                padding: "18px"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#111827" }}>
                  Quotations ({quotations.length})
                </h4>
                <button
                  type="button"
                  onClick={() => onOpenQuotationBuilder?.(opp)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    backgroundColor: "#10B981",
                    color: "#ffffff",
                    border: "none",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  <Plus size={14} />
                  <span>Create Quotation</span>
                </button>
              </div>

              {quotations.length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center", color: "#6B7280", backgroundColor: "#F9FAFB", borderRadius: "8px", fontSize: "12px" }}>
                  No quotations created for this opportunity yet.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {quotations.map((q) => (
                    <div
                      key={q.id}
                      style={{
                        padding: "12px",
                        borderRadius: "8px",
                        border: "1px solid #E5E7EB",
                        backgroundColor: "#FAFAFA",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: "13px", color: "#111827" }}>{q.quoteNumber}</strong>
                        <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "2px" }}>
                          {q.items?.length || 0} items • Valid until: {q.validUntil || "-"}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <strong style={{ fontSize: "13px", color: "#10B981" }}>
                          {formatINR(q.finalAmount)}
                        </strong>
                        <QuotationStatusBadge status={q.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Activities Timeline */}
            <ActivityTimeline
              activities={activities}
              opportunityId={opportunityId}
              companyId={opp.companyId}
              contactId={opp.contactId}
              onRefresh={fetchOpportunityDetails}
              showToast={showToast}
            />
          </div>
        )}

        {/* Lost Reason Dialog Modal */}
        {showLostModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              zIndex: 1300,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px"
            }}
            onClick={() => setShowLostModal(false)}
          >
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "14px",
                padding: "20px",
                width: "100%",
                maxWidth: "420px",
                boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h4 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: 700, color: "#111827" }}>
                Opportunity Lost Reason
              </h4>
              <p style={{ margin: "0 0 14px 0", fontSize: "12px", color: "#6B7280" }}>
                Please specify why this deal was lost (e.g. Price too high, Competitor selected, Project cancelled)
              </p>
              <textarea
                rows={3}
                required
                placeholder="Enter reason..."
                value={lostReasonInput}
                onChange={(e) => setLostReasonInput(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #D1D5DB",
                  fontSize: "13px",
                  boxSizing: "border-box",
                  marginBottom: "16px"
                }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setShowLostModal(false)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "6px",
                    border: "1px solid #D1D5DB",
                    backgroundColor: "#ffffff",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!lostReasonInput.trim() || updatingStage}
                  onClick={() => handleStageChange("LOST", lostReasonInput.trim())}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    backgroundColor: "#EF4444",
                    color: "#ffffff",
                    border: "none",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  {updatingStage ? "Closing..." : "Confirm Lost"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
