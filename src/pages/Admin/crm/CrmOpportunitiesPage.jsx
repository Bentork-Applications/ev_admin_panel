/* eslint-disable react-refresh/only-export-components */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  TrendingUp,
  Plus,
  RefreshCw,
  Building,
  User,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Eye,
  AlertCircle,
  ArrowRight,
  ChevronRight,
  X,
  FilePlus,
  Check,
  Ban
} from "lucide-react";
import { crmService } from "../../../services/crmService";
import { Toast } from "../../../components/common/Toast";
import { CreateOpportunityModal } from "../../../components/crm/CreateOpportunityModal";
import { OpportunityDetailDrawer } from "../../../components/crm/OpportunityDetailDrawer";
import { QuotationBuilderModal } from "../../../components/crm/QuotationBuilderModal";
import { OpportunityStageBadge } from "../../../components/crm/CrmBadge";

export const PIPELINE_STAGES = [
  { id: "QUALIFIED", label: "Qualified", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
  { id: "REQUIREMENT", label: "Requirement", color: "#4F46E5", bg: "#EEF2FF", border: "#C7D2FE" },
  { id: "PROPOSAL", label: "Proposal", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
  { id: "NEGOTIATION", label: "Negotiation", color: "#EA580C", bg: "#FFF7ED", border: "#FED7AA" },
  { id: "WON", label: "Won", color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0" },
  { id: "LOST", label: "Lost", color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" }
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

/**
 * Backend transition rule:
 * QUALIFIED -> REQUIREMENT -> PROPOSAL -> NEGOTIATION -> WON
 * Any active stage -> LOST
 * WON and LOST are terminal states.
 */
export const isValidStageTransition = (current, target) => {
  if (!current || !target) return false;
  const cur = current.toUpperCase();
  const tgt = target.toUpperCase();
  if (cur === tgt) return false;
  if (cur === "WON" || cur === "LOST") return false;
  if (tgt === "LOST") return true;

  switch (cur) {
    case "QUALIFIED":
      return tgt === "REQUIREMENT";
    case "REQUIREMENT":
      return tgt === "PROPOSAL";
    case "PROPOSAL":
      return tgt === "NEGOTIATION";
    case "NEGOTIATION":
      return tgt === "WON";
    default:
      return false;
  }
};

export const getNextStageInfo = (current) => {
  switch ((current || "").toUpperCase()) {
    case "QUALIFIED":
      return { id: "REQUIREMENT", label: "Requirement" };
    case "REQUIREMENT":
      return { id: "PROPOSAL", label: "Proposal" };
    case "PROPOSAL":
      return { id: "NEGOTIATION", label: "Negotiation" };
    case "NEGOTIATION":
      return { id: "WON", label: "Won" };
    default:
      return null;
  }
};

export default function CrmOpportunitiesPage() {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOppId, setSelectedOppId] = useState(null);
  const [quotationModalOpp, setQuotationModalOpp] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [ownerFilter, setOwnerFilter] = useState("ALL");

  // Stage change modal / Lost reason prompt
  const [stageChangeModal, setStageChangeModal] = useState({
    open: false,
    opp: null,
    targetStage: "",
    lostReason: ""
  });
  const [updatingStage, setUpdatingStage] = useState(false);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    try {
      const data = await crmService.getAllOpportunities();
      setOpportunities(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load opportunities:", err);
      showToast(err.message || "Failed to load opportunities", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  // Unique list of owners for filtering
  const ownersList = useMemo(() => {
    const set = new Set();
    opportunities.forEach((o) => {
      const owner = o.ownerAdminName || o.owner;
      if (owner) set.add(owner);
    });
    return Array.from(set);
  }, [opportunities]);

  // Filtered opportunities
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((opp) => {
      const q = searchQuery.toLowerCase().trim();
      const oppIdStr = (opp.opportunityNumber || `OPP-${opp.id}`).toLowerCase();
      const matchesSearch =
        !q ||
        (opp.title && opp.title.toLowerCase().includes(q)) ||
        (opp.companyName && opp.companyName.toLowerCase().includes(q)) ||
        (opp.contactName && opp.contactName.toLowerCase().includes(q)) ||
        (opp.leadNumber && opp.leadNumber.toLowerCase().includes(q)) ||
        oppIdStr.includes(q);

      const oppStage = (opp.stage || "").toUpperCase();
      const matchesStage = stageFilter === "ALL" || oppStage === stageFilter;

      const oppOwner = opp.ownerAdminName || opp.owner || "Unassigned";
      const matchesOwner = ownerFilter === "ALL" || oppOwner === ownerFilter;

      return matchesSearch && matchesStage && matchesOwner;
    });
  }, [opportunities, searchQuery, stageFilter, ownerFilter]);

  // 5 Key Summary Metrics
  const summary = useMemo(() => {
    let totalDealValue = 0;
    let weightedValue = 0;
    let wonDeals = 0;
    let activeDeals = 0;

    opportunities.forEach((o) => {
      const val = Number(o.value) || 0;
      const prob = Number(o.probability) || 0;
      const stage = (o.stage || "").toUpperCase();

      totalDealValue += val;
      weightedValue += (val * prob) / 100;

      if (stage === "WON") {
        wonDeals += 1;
      } else if (stage !== "LOST") {
        activeDeals += 1;
      }
    });

    return {
      totalDeals: opportunities.length,
      totalDealValue,
      weightedValue,
      wonDeals,
      activeDeals
    };
  }, [opportunities]);

  // Stage update handler
  const handleConfirmStageChange = async () => {
    if (!stageChangeModal.opp || !stageChangeModal.targetStage) return;

    const currentStage = (stageChangeModal.opp.stage || "").toUpperCase();
    const targetStage = stageChangeModal.targetStage.toUpperCase();

    if (!isValidStageTransition(currentStage, targetStage)) {
      showToast(
        `Cannot move directly from ${currentStage} to ${targetStage}. Opportunities must follow the sequential pipeline or be marked as Lost.`,
        "error"
      );
      return;
    }

    if (targetStage === "LOST" && !stageChangeModal.lostReason.trim()) {
      showToast("Please provide a reason for marking this deal as lost", "error");
      return;
    }

    setUpdatingStage(true);
    try {
      await crmService.updateOpportunityStage(stageChangeModal.opp.id, {
        stage: targetStage,
        lostReason: targetStage === "LOST" ? stageChangeModal.lostReason.trim() : null
      });
      showToast(`Updated to ${targetStage}`, "success");
      await fetchOpportunities();
      setStageChangeModal({ open: false, opp: null, targetStage: "", lostReason: "" });
    } catch (err) {
      console.error("Stage update error:", err);
      showToast(err.message || "Failed to update stage", "error");
    } finally {
      setUpdatingStage(false);
    }
  };

  // Quick next stage advance handler
  const handleQuickAdvance = async (opp) => {
    const nextStage = getNextStageInfo(opp.stage);
    if (!nextStage) return;

    setUpdatingStage(true);
    try {
      await crmService.updateOpportunityStage(opp.id, {
        stage: nextStage.id,
        lostReason: null
      });
      showToast(`Advanced "${opp.title}" to ${nextStage.label}`, "success");
      await fetchOpportunities();
    } catch (err) {
      console.error("Quick advance error:", err);
      showToast(err.message || "Failed to advance stage", "error");
    } finally {
      setUpdatingStage(false);
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e, id, currentStage) => {
    if (currentStage === "WON" || currentStage === "LOST") {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("text/plain", id.toString());
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetStage) => {
    e.preventDefault();
    const oppIdStr = e.dataTransfer.getData("text/plain");
    if (!oppIdStr) return;
    const opp = opportunities.find((o) => o.id === Number(oppIdStr));
    if (!opp) return;

    const currentStage = (opp.stage || "").toUpperCase();
    if (currentStage === targetStage) return;

    if (!isValidStageTransition(currentStage, targetStage)) {
      const next = getNextStageInfo(currentStage);
      showToast(
        `Cannot move from ${currentStage} directly to ${targetStage}. Valid next step is ${
          next ? next.label : "None"
        } or Lost.`,
        "error"
      );
      return;
    }

    // If valid, open confirmation modal
    setStageChangeModal({
      open: true,
      opp,
      targetStage,
      lostReason: ""
    });
  };

  // Columns to display based on Stage filter
  const visibleColumns = useMemo(() => {
    if (stageFilter === "ALL") return PIPELINE_STAGES;
    return PIPELINE_STAGES.filter((s) => s.id === stageFilter);
  }, [stageFilter]);

  const hasActiveFilters = searchQuery !== "" || stageFilter !== "ALL" || ownerFilter !== "ALL";

  return (
    <div style={{ maxWidth: "1680px", margin: "0 auto", padding: "20px 24px", fontFamily: "inherit" }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* 1. Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "14px"
        }}
      >
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0F172A", margin: 0 }}>
            Opportunity Pipeline
          </h1>
          <p style={{ fontSize: "13px", color: "#64748B", margin: "4px 0 0 0" }}>
            Track deals from qualified lead through to winning contracts
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: "9px 16px",
              borderRadius: "8px",
              backgroundColor: "#16A34A",
              color: "#ffffff",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 4px rgba(22, 163, 74, 0.2)"
            }}
          >
            <Plus size={16} />
            <span>Create Opportunity</span>
          </button>

          <button
            onClick={fetchOpportunities}
            disabled={loading}
            title="Refresh Pipeline"
            style={{
              padding: "9px",
              borderRadius: "8px",
              backgroundColor: "#ffffff",
              border: "1px solid #CBD5E1",
              color: "#475569",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* 2. Top Summary Metrics (5 Cards) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: "12px",
          marginBottom: "20px"
        }}
      >
        {/* Total Deals */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "10px",
            padding: "14px 16px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)"
          }}
        >
          <div style={{ fontSize: "12px", color: "#64748B", fontWeight: 600, marginBottom: "4px" }}>
            Total Deals
          </div>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#0F172A" }}>
            {summary.totalDeals}
          </div>
        </div>

        {/* Total Deal Value */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "10px",
            padding: "14px 16px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)"
          }}
        >
          <div style={{ fontSize: "12px", color: "#64748B", fontWeight: 600, marginBottom: "4px" }}>
            Total Deal Value
          </div>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#0F172A" }}>
            {formatINR(summary.totalDealValue)}
          </div>
        </div>

        {/* Weighted Value */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "10px",
            padding: "14px 16px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)"
          }}
        >
          <div style={{ fontSize: "12px", color: "#64748B", fontWeight: 600, marginBottom: "4px" }}>
            Weighted Value
          </div>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#2563EB" }}>
            {formatINR(summary.weightedValue)}
          </div>
        </div>

        {/* Active Deals */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "10px",
            padding: "14px 16px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)"
          }}
        >
          <div style={{ fontSize: "12px", color: "#64748B", fontWeight: 600, marginBottom: "4px" }}>
            Active Deals
          </div>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#D97706" }}>
            {summary.activeDeals}
          </div>
        </div>

        {/* Won Deals */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "10px",
            padding: "14px 16px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)"
          }}
        >
          <div style={{ fontSize: "12px", color: "#64748B", fontWeight: 600, marginBottom: "4px" }}>
            Won Deals
          </div>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#16A34A" }}>
            {summary.wonDeals}
          </div>
        </div>
      </div>

      {/* 3. Search & Filters Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#ffffff",
          padding: "12px 16px",
          borderRadius: "10px",
          border: "1px solid #E2E8F0",
          marginBottom: "20px",
          gap: "12px",
          flexWrap: "wrap"
        }}
      >
        {/* Search Box */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "260px" }}>
          <Search size={16} color="#94A3B8" />
          <input
            type="text"
            placeholder="Search by Opportunity Title, Company, Contact, Lead ID, or Opp ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              fontSize: "13px",
              color: "#1E293B",
              backgroundColor: "transparent"
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                background: "none",
                border: "none",
                color: "#94A3B8",
                fontSize: "12px",
                cursor: "pointer"
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {/* Stage Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 500 }}>Stage:</span>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              style={{
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid #CBD5E1",
                fontSize: "12px",
                color: "#334155",
                backgroundColor: "#ffffff"
              }}
            >
              <option value="ALL">All Stages</option>
              {PIPELINE_STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Owner Filter */}
          {ownersList.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 500 }}>Owner:</span>
              <select
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                style={{
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "1px solid #CBD5E1",
                  fontSize: "12px",
                  color: "#334155",
                  backgroundColor: "#ffffff"
                }}
              >
                <option value="ALL">All Owners</option>
                {ownersList.map((owner) => (
                  <option key={owner} value={owner}>
                    {owner}
                  </option>
                ))}
              </select>
            </div>
          )}

          {hasActiveFilters && (
            <button
              onClick={() => {
                setSearchQuery("");
                setStageFilter("ALL");
                setOwnerFilter("ALL");
              }}
              style={{
                background: "none",
                border: "none",
                color: "#2563EB",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                padding: "4px 8px"
              }}
            >
              Reset Filters
            </button>
          )}

          <div style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>
            {filteredOpportunities.length} {filteredOpportunities.length === 1 ? "Deal" : "Deals"}
          </div>
        </div>
      </div>

      {/* 4. Global Empty State if 0 opportunities exist */}
      {!loading && opportunities.length === 0 && (
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px dashed #CBD5E1",
            padding: "48px 24px",
            textAlign: "center",
            maxWidth: "500px",
            margin: "40px auto"
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: "#F0FDF4",
              color: "#16A34A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px auto"
            }}
          >
            <TrendingUp size={28} />
          </div>
          <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#0F172A", margin: "0 0 6px 0" }}>
            No Opportunities Yet
          </h3>
          <p style={{ fontSize: "13px", color: "#64748B", margin: "0 0 20px 0" }}>
            Create your first sales deal to track its pipeline progress from Qualified to Won.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: "9px 18px",
              borderRadius: "8px",
              backgroundColor: "#16A34A",
              color: "#ffffff",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <Plus size={16} />
            <span>Create Opportunity</span>
          </button>
        </div>
      )}

      {/* 5. Pipeline Stages & Kanban Board */}
      {(loading || opportunities.length > 0) && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${visibleColumns.length}, minmax(270px, 1fr))`,
            gap: "14px",
            overflowX: "auto",
            paddingBottom: "16px",
            alignItems: "flex-start"
          }}
        >
          {visibleColumns.map((col) => {
            const colOpps = filteredOpportunities.filter(
              (o) => (o.stage || "").toUpperCase() === col.id
            );
            const colDealValue = colOpps.reduce((sum, o) => sum + (Number(o.value) || 0), 0);

            return (
              <div
                key={col.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
                style={{
                  backgroundColor: "#F8FAFC",
                  borderRadius: "10px",
                  border: "1px solid #E2E8F0",
                  padding: "12px",
                  minHeight: "520px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px"
                }}
              >
                {/* Stage Header */}
                <div
                  style={{
                    padding: "10px 12px",
                    backgroundColor: "#ffffff",
                    borderRadius: "8px",
                    border: `1px solid ${col.border}`,
                    borderLeft: `4px solid ${col.color}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <div>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>
                      {col.label}
                    </span>
                    <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>
                      Total: <strong>{formatINR(colDealValue)}</strong>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: col.color,
                      backgroundColor: col.bg,
                      padding: "2px 8px",
                      borderRadius: "10px"
                    }}
                  >
                    {colOpps.length}
                  </span>
                </div>

                {/* Opportunity Cards List */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", minHeight: "80px" }}>
                  {loading ? (
                    <div style={{ padding: "20px", textAlign: "center", color: "#94A3B8", fontSize: "12px" }}>
                      Loading deals...
                    </div>
                  ) : colOpps.length > 0 ? (
                    colOpps.map((opp) => {
                      const dealVal = Number(opp.value) || 0;
                      const prob = Number(opp.probability) || 0;
                      const weightedVal = (dealVal * prob) / 100;
                      const oppIdDisplay =
                        opp.opportunityNumber || `OPP-${opp.id.toString().padStart(3, "0")}`;
                      const ownerName = opp.ownerAdminName || opp.owner || "Sales";
                      const currentStage = (opp.stage || "").toUpperCase();
                      const isTerminal = currentStage === "WON" || currentStage === "LOST";
                      const nextStage = getNextStageInfo(currentStage);

                      return (
                        <div
                          key={opp.id}
                          draggable={!isTerminal}
                          onDragStart={(e) => handleDragStart(e, opp.id, currentStage)}
                          style={{
                            backgroundColor: "#ffffff",
                            borderRadius: "8px",
                            padding: "12px",
                            border: "1px solid #E2E8F0",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                            cursor: isTerminal ? "default" : "grab",
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                            transition: "border-color 0.15s, box-shadow 0.15s"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = col.color;
                            e.currentTarget.style.boxShadow = "0 3px 8px rgba(0,0,0,0.06)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "#E2E8F0";
                            e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.03)";
                          }}
                        >
                          {/* Card Header: Opportunity ID & Stage Badge */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <strong style={{ fontSize: "12px", color: "#16A34A", fontWeight: 700 }}>
                              {oppIdDisplay}
                            </strong>
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 700,
                                color: col.color,
                                backgroundColor: col.bg,
                                padding: "2px 6px",
                                borderRadius: "4px"
                              }}
                            >
                              {col.label}
                            </span>
                          </div>

                          {/* Title / Name */}
                          <div
                            onClick={() => setSelectedOppId(opp.id)}
                            style={{
                              fontSize: "13px",
                              fontWeight: 700,
                              color: "#0F172A",
                              lineHeight: 1.3,
                              cursor: "pointer"
                            }}
                          >
                            {opp.title}
                          </div>

                          {/* Company & Contact */}
                          <div style={{ fontSize: "12px", color: "#475569" }}>
                            {opp.companyName && (
                              <div style={{ fontWeight: 600, color: "#1E293B" }}>
                                {opp.companyName}
                              </div>
                            )}
                            {opp.contactName && (
                              <div style={{ fontSize: "11px", color: "#64748B", marginTop: "1px" }}>
                                Contact: {opp.contactName}
                              </div>
                            )}
                          </div>

                          {/* Deal Metrics Details */}
                          <div
                            style={{
                              backgroundColor: "#F8FAFC",
                              borderRadius: "6px",
                              padding: "8px 10px",
                              border: "1px solid #F1F5F9",
                              fontSize: "11.5px",
                              display: "flex",
                              flexDirection: "column",
                              gap: "3px"
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: "#64748B" }}>Deal Value:</span>
                              <strong style={{ color: "#16A34A" }}>{formatINR(dealVal)}</strong>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: "#64748B" }}>Probability:</span>
                              <span style={{ color: "#0F172A", fontWeight: 600 }}>{prob}%</span>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: "#64748B" }}>Weighted Value:</span>
                              <strong style={{ color: "#2563EB" }}>{formatINR(weightedVal)}</strong>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: "#64748B" }}>Expected Close:</span>
                              <span style={{ color: "#0F172A" }}>{formatCloseDate(opp.expectedCloseDate)}</span>
                            </div>
                          </div>

                          {/* Owner & Lead */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              fontSize: "11px",
                              color: "#64748B",
                              paddingTop: "2px"
                            }}
                          >
                            <div>
                              Owner: <strong style={{ color: "#334155" }}>{ownerName}</strong>
                            </div>
                            <div>
                              Lead: <strong style={{ color: "#334155" }}>{opp.leadNumber || "—"}</strong>
                            </div>
                          </div>

                          {/* Lost Reason if present */}
                          {opp.lostReason && (
                            <div
                              style={{
                                fontSize: "11px",
                                color: "#DC2626",
                                backgroundColor: "#FEF2F2",
                                padding: "4px 8px",
                                borderRadius: "4px"
                              }}
                            >
                              <strong>Lost Reason:</strong> {opp.lostReason}
                            </div>
                          )}

                          {/* Quick Stage Progression button for active deals */}
                          {nextStage && !isTerminal && (
                            <button
                              type="button"
                              disabled={updatingStage}
                              onClick={() => handleQuickAdvance(opp)}
                              style={{
                                backgroundColor: "#F0FDF4",
                                border: "1px solid #BBF7D0",
                                color: "#16A34A",
                                fontSize: "11.5px",
                                fontWeight: 700,
                                borderRadius: "6px",
                                padding: "5px 8px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "4px",
                                marginTop: "2px"
                              }}
                              title={`Advance to ${nextStage.label}`}
                            >
                              <span>Advance to {nextStage.label}</span>
                              <ArrowRight size={13} />
                            </button>
                          )}

                          {/* Card Actions: View & Change Stage */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              borderTop: "1px solid #F1F5F9",
                              paddingTop: "8px",
                              marginTop: "2px"
                            }}
                          >
                            <button
                              onClick={() => setSelectedOppId(opp.id)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#2563EB",
                                fontSize: "12px",
                                fontWeight: 600,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "3px",
                                padding: 0
                              }}
                            >
                              <Eye size={13} />
                              <span>View Details</span>
                            </button>

                            {!isTerminal ? (
                              <button
                                onClick={() =>
                                  setStageChangeModal({
                                    open: true,
                                    opp,
                                    targetStage: nextStage ? nextStage.id : "",
                                    lostReason: ""
                                  })
                                }
                                style={{
                                  backgroundColor: "#F1F5F9",
                                  border: "1px solid #CBD5E1",
                                  color: "#334155",
                                  fontSize: "11.5px",
                                  fontWeight: 600,
                                  borderRadius: "5px",
                                  padding: "4px 8px",
                                  cursor: "pointer"
                                }}
                              >
                                Change Stage
                              </button>
                            ) : (
                              <span style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 500 }}>
                                Closed Deal
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div
                      style={{
                        padding: "24px 8px",
                        textAlign: "center",
                        color: "#94A3B8",
                        fontSize: "12px",
                        border: "1px dashed #CBD5E1",
                        borderRadius: "6px",
                        backgroundColor: "#ffffff"
                      }}
                    >
                      No deals
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. Guided Stage Change & Lost Reason Modal */}
      {stageChangeModal.open && stageChangeModal.opp && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.45)",
            backdropFilter: "blur(2px)",
            zIndex: 1300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px"
          }}
          onClick={() => {
            if (!updatingStage) setStageChangeModal({ open: false, opp: null, targetStage: "", lostReason: "" });
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              padding: "22px",
              width: "100%",
              maxWidth: "480px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
                  Update Opportunity Stage
                </h3>
                <p style={{ margin: "3px 0 0 0", fontSize: "12px", color: "#64748B" }}>
                  {stageChangeModal.opp.title} ({stageChangeModal.opp.opportunityNumber || `OPP-${stageChangeModal.opp.id}`})
                </p>
              </div>
              <button
                onClick={() => setStageChangeModal({ open: false, opp: null, targetStage: "", lostReason: "" })}
                style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer", padding: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Current Stage Indicator */}
            <div
              style={{
                fontSize: "12px",
                color: "#475569",
                marginBottom: "14px",
                padding: "8px 12px",
                backgroundColor: "#F8FAFC",
                borderRadius: "6px",
                border: "1px solid #E2E8F0"
              }}
            >
              Current Stage:{" "}
              <strong style={{ color: "#0F172A" }}>
                {(stageChangeModal.opp.stage || "QUALIFIED").toUpperCase()}
              </strong>
            </div>

            {/* Stage Selector with validation highlighting */}
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                Select Valid Target Stage:
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {PIPELINE_STAGES.map((stg) => {
                  const currentStage = (stageChangeModal.opp.stage || "").toUpperCase();
                  const isCurrent = currentStage === stg.id;
                  const isValid = isValidStageTransition(currentStage, stg.id);
                  const isSelected = stageChangeModal.targetStage === stg.id;

                  let border = "1px solid #CBD5E1";
                  let bg = "#ffffff";
                  let textColor = "#334155";
                  let cursor = "pointer";

                  if (isCurrent) {
                    bg = "#F1F5F9";
                    textColor = "#94A3B8";
                    cursor = "not-allowed";
                  } else if (isSelected) {
                    border = `2px solid ${stg.color}`;
                    bg = stg.bg;
                    textColor = stg.color;
                  } else if (!isValid) {
                    bg = "#F8FAFC";
                    textColor = "#CBD5E1";
                    cursor = "not-allowed";
                    border = "1px solid #E2E8F0";
                  }

                  return (
                    <button
                      key={stg.id}
                      type="button"
                      disabled={isCurrent || !isValid || updatingStage}
                      onClick={() =>
                        setStageChangeModal((prev) => ({
                          ...prev,
                          targetStage: stg.id
                        }))
                      }
                      title={
                        isCurrent
                          ? "Current stage"
                          : isValid
                          ? `Move to ${stg.label}`
                          : "Stages must be followed in order"
                      }
                      style={{
                        padding: "8px 10px",
                        borderRadius: "6px",
                        border,
                        backgroundColor: bg,
                        color: textColor,
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <span>{stg.label}</span>
                      {isCurrent && <span style={{ fontSize: "10px", color: "#94A3B8" }}>Current</span>}
                      {isSelected && <CheckCircle2 size={13} color={stg.color} />}
                      {!isCurrent && isValid && !isSelected && (
                        <span style={{ fontSize: "10px", color: stg.id === "LOST" ? "#DC2626" : "#16A34A" }}>
                          {stg.id === "LOST" ? "Lost" : "Next"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p style={{ margin: "6px 0 0 0", fontSize: "11px", color: "#64748B" }}>
                Pipeline sequence: Qualified → Requirement → Proposal → Negotiation → Won (or Mark Lost).
              </p>
            </div>

            {/* Lost Reason Input if target stage is LOST */}
            {stageChangeModal.targetStage === "LOST" && (
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#DC2626", marginBottom: "4px" }}>
                  Lost Reason *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Price too high, Competitor selected, Project cancelled..."
                  value={stageChangeModal.lostReason}
                  onChange={(e) =>
                    setStageChangeModal((prev) => ({ ...prev, lostReason: e.target.value }))
                  }
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: "1px solid #CBD5E1",
                    fontSize: "12px",
                    boxSizing: "border-box",
                    outline: "none"
                  }}
                />
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button
                type="button"
                disabled={updatingStage}
                onClick={() => setStageChangeModal({ open: false, opp: null, targetStage: "", lostReason: "" })}
                style={{
                  padding: "8px 14px",
                  borderRadius: "6px",
                  border: "1px solid #CBD5E1",
                  backgroundColor: "#ffffff",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  color: "#475569"
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  !stageChangeModal.targetStage ||
                  (stageChangeModal.targetStage === "LOST" && !stageChangeModal.lostReason.trim()) ||
                  updatingStage
                }
                onClick={handleConfirmStageChange}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  backgroundColor: stageChangeModal.targetStage === "LOST" ? "#DC2626" : "#16A34A",
                  color: "#ffffff",
                  border: "none",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor:
                    !stageChangeModal.targetStage ||
                    (stageChangeModal.targetStage === "LOST" && !stageChangeModal.lostReason.trim()) ||
                    updatingStage
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    !stageChangeModal.targetStage ||
                    (stageChangeModal.targetStage === "LOST" && !stageChangeModal.lostReason.trim()) ||
                    updatingStage
                      ? 0.6
                      : 1
                }}
              >
                {updatingStage ? "Updating..." : "Confirm Stage Change"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Opportunity Detail Drawer */}
      {selectedOppId && (
        <OpportunityDetailDrawer
          opportunityId={selectedOppId}
          isOpen={!!selectedOppId}
          onClose={() => setSelectedOppId(null)}
          onOpportunityUpdated={fetchOpportunities}
          onOpenQuotationBuilder={(opp) => setQuotationModalOpp(opp)}
          showToast={showToast}
        />
      )}

      {/* 8. Create Opportunity Modal */}
      {showCreateModal && (
        <CreateOpportunityModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onOpportunityCreated={fetchOpportunities}
          showToast={showToast}
        />
      )}

      {/* 9. Quotation Builder Modal */}
      {quotationModalOpp && (
        <QuotationBuilderModal
          isOpen={!!quotationModalOpp}
          initialOpportunity={quotationModalOpp}
          onClose={() => setQuotationModalOpp(null)}
          onQuotationCreated={() => {
            fetchOpportunities();
            showToast("Quotation created successfully!", "success");
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
}

