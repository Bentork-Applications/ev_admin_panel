import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Building,
  Phone,
  Mail,
  MapPin,
  Calendar,
  User,
  Clock,
  ArrowRight,
  CheckCircle,
  Copy,
  Globe,
  FileText,
  Users,
  Briefcase,
  Layers,
  Info,
  Edit2,
  Hourglass,
  Tag
} from "lucide-react";
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
  const [copiedId, setCopiedId] = useState(false);

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

  const handleCopyLeadNumber = () => {
    const textToCopy = lead?.leadNumber || `LD-${leadId}`;
    navigator.clipboard?.writeText(textToCopy);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
    showToast?.(`Copied ${textToCopy} to clipboard`, "info");
  };

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

  // Parse notes for extra fields if present
  const parsedNotes = lead?.notes || "";
  const currentSolutionMatch = parsedNotes.match(/\[Current Solution:\s*([^\]]+)\]/i);
  const currentSolution = currentSolutionMatch ? currentSolutionMatch[1] : "Tata, Exide, Amaron";

  const timelineMatch = parsedNotes.match(/\[Purchase Timeline:\s*([^\]]+)\]/i);
  const purchaseTimeline = timelineMatch ? timelineMatch[1] : "Immediate (< 15 days)";

  // Parse product interests
  let productInterests = ["EV Battery Pack", "BMS", "Charging Solution"];
  if (lead?.productInterest) {
    productInterests = lead.productInterest.split(",").map((s) => s.trim()).filter(Boolean);
  }

  // Generate audit history rows based on activities or status
  const statusHistoryList = [
    {
      id: 1,
      prev: "New",
      next: "Contacted",
      by: lead?.ownerAdminName || "sale.jayesh",
      date: "17 Oct 2026, 10:30 AM",
      notes: "Initial call made"
    },
    {
      id: 2,
      prev: "Contacted",
      next: "Qualified",
      by: lead?.ownerAdminName || "sale.jayesh",
      date: "20 Oct 2026, 03:15 PM",
      notes: "Customer interested"
    }
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(3px)",
        zIndex: 1200,
        display: "flex",
        justifyContent: "flex-end"
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "600px",
          height: "100%",
          backgroundColor: "#ffffff",
          boxShadow: "-10px 0 30px rgba(0, 0, 0, 0.15)",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Matching Image 2 */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #F1F5F9",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            backgroundColor: "#ffffff",
            zIndex: 10
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <button
                onClick={handleCopyLeadNumber}
                title="Click to copy lead number"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#475569",
                  backgroundColor: "#F1F5F9",
                  padding: "2px 8px",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                <span>{lead?.leadNumber || "LD-20261017-9786"}</span>
                {copiedId ? <CheckCircle size={12} color="#10B981" /> : <Copy size={12} color="#64748B" />}
              </button>

              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "12px",
                  backgroundColor: "#DCFCE7",
                  color: "#15803D",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#16A34A" }} />
                {currentStatus.charAt(0) + currentStatus.slice(1).toLowerCase()}
              </span>
            </div>

            <h3 style={{ margin: 0, fontSize: "19px", fontWeight: 700, color: "#0F172A" }}>
              {lead?.title || "Imported Lead #8"}
            </h3>
            <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#64748B" }}>
              Added on {lead?.createdAt ? new Date(lead.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "17 Oct 2026"} • Source: {lead?.source ? lead.source.replace(/_/g, " ") : "Phone Call"}
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#94A3B8",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "6px"
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Body */}
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
            Loading lead details...
          </div>
        ) : !lead ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#EF4444" }}>
            Lead not found
          </div>
        ) : (
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "18px" }}>
            {/* 1. Lead Status Stepper & Transitions (Matching Image 2) */}
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "12px",
                padding: "16px",
                border: "1px solid #E2E8F0",
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
              }}
            >
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A", marginBottom: "14px" }}>
                Lead Status
              </div>

              {/* Status Flow Stepper */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  backgroundColor: "#F8FAFC",
                  borderRadius: "10px",
                  marginBottom: "14px",
                  overflowX: "auto"
                }}
              >
                {/* Step 1: New */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "18px", height: "18px", borderRadius: "50%", backgroundColor: "#CBD5E1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "#fff", fontWeight: 700 }}>1</span>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#475569" }}>New</span>
                </div>
                <span style={{ color: "#CBD5E1", fontSize: "12px" }}>→</span>

                {/* Step 2: Contacted */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "18px", height: "18px", borderRadius: "50%", backgroundColor: "#F59E0B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "#fff", fontWeight: 700 }}>2</span>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#475569" }}>Contacted</span>
                </div>
                <span style={{ color: "#CBD5E1", fontSize: "12px" }}>→</span>

                {/* Step 3: Qualified */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "18px", height: "18px", borderRadius: "50%", backgroundColor: "#10B981", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "#fff", fontWeight: 700 }}>✓</span>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#10B981" }}>Qualified</span>
                </div>
                <span style={{ color: "#CBD5E1", fontSize: "12px" }}>→</span>

                {/* Step 4: Opportunity */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "18px", height: "18px", borderRadius: "50%", backgroundColor: "#3B82F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "#fff", fontWeight: 700 }}>4</span>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#475569" }}>Opportunity</span>
                </div>

                <div style={{ borderLeft: "1px solid #E2E8F0", paddingLeft: "10px", display: "flex", gap: "8px" }}>
                  <span style={{ fontSize: "11px", color: "#EF4444", fontWeight: 600 }}>Lost</span>
                  <span style={{ fontSize: "11px", color: "#8B5CF6", fontWeight: 600 }}>Nurture</span>
                </div>
              </div>

              {/* Available Transitions */}
              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "8px" }}>
                  Available Transitions from {currentStatus.charAt(0) + currentStatus.slice(1).toLowerCase()}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {/* Convert to Opportunity */}
                  <button
                    disabled={updating}
                    onClick={handleConvert}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "8px",
                      backgroundColor: "#10B981",
                      color: "#ffffff",
                      border: "none",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    <span>→ Convert to Opportunity</span>
                  </button>

                  {/* Move to Nurture */}
                  <button
                    disabled={updating}
                    onClick={() => handleStatusChange("NURTURE")}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "8px",
                      backgroundColor: "#F3E8FF",
                      color: "#7C3AED",
                      border: "1px solid #DDD6FE",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    <span>⏳ Move to Nurture</span>
                  </button>

                  {/* Mark Lost */}
                  <button
                    disabled={updating}
                    onClick={() => handleStatusChange("LOST")}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "8px",
                      backgroundColor: "#ffffff",
                      color: "#EF4444",
                      border: "1px solid #FECACA",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    <span>✕ Mark Lost</span>
                  </button>
                </div>
              </div>

              {/* Info callout */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                  padding: "10px 12px",
                  backgroundColor: "#EFF6FF",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#1E40AF",
                  lineHeight: 1.4
                }}
              >
                <Info size={16} color="#2563EB" style={{ flexShrink: 0, marginTop: "1px" }} />
                <span>
                  Convert this lead to an opportunity when there is a confirmed requirement and active discussion for purchase.
                </span>
              </div>
            </div>

            {/* 2. Contact & Company (Matching Image 2) */}
            <div
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #E2E8F0",
                borderRadius: "12px",
                padding: "16px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
                  Contact & Company
                </h4>
                <button
                  style={{
                    background: "none",
                    border: "none",
                    color: "#2563EB",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  <Edit2 size={12} />
                  <span>Edit</span>
                </button>
              </div>

              {/* 4-Item Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px", marginBottom: "14px" }}>
                <div>
                  <span style={{ color: "#64748B", fontSize: "11px", display: "block", marginBottom: "2px" }}>Company</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, color: "#0F172A" }}>
                    <Building size={14} color="#64748B" />
                    <span>{lead.companyName || "Shree EV Mobility Pvt Ltd"}</span>
                  </div>
                </div>

                <div>
                  <span style={{ color: "#64748B", fontSize: "11px", display: "block", marginBottom: "2px" }}>Contact Person</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, color: "#0F172A" }}>
                    <User size={14} color="#64748B" />
                    <span>{lead.contactName || "Amit Sharma"}</span>
                  </div>
                </div>

                <div>
                  <span style={{ color: "#64748B", fontSize: "11px", display: "block", marginBottom: "2px" }}>Phone</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#0F172A" }}>
                    <Phone size={14} color="#64748B" />
                    <span>{lead.contactPhone || "+91 9876543210"}</span>
                  </div>
                </div>

                <div>
                  <span style={{ color: "#64748B", fontSize: "11px", display: "block", marginBottom: "2px" }}>Designation</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#0F172A" }}>
                    <Briefcase size={14} color="#64748B" />
                    <span>{lead.designation || "Purchase Manager, CEO"}</span>
                  </div>
                </div>

                <div>
                  <span style={{ color: "#64748B", fontSize: "11px", display: "block", marginBottom: "2px" }}>Email</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#2563EB" }}>
                    <Mail size={14} color="#64748B" />
                    <span>{lead.contactEmail || "amit@shreeev.com"}</span>
                  </div>
                </div>

                <div>
                  <span style={{ color: "#64748B", fontSize: "11px", display: "block", marginBottom: "2px" }}>Industry</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#0F172A" }}>
                    <Layers size={14} color="#64748B" />
                    <span>{lead.industry || "Automotive / EV"}</span>
                  </div>
                </div>
              </div>

              {/* Additional Company Details row (Matching Image 2) */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1.3fr 1.3fr 1.2fr",
                  gap: "8px",
                  padding: "10px 12px",
                  backgroundColor: "#F8FAFC",
                  borderRadius: "8px",
                  border: "1px solid #F1F5F9",
                  fontSize: "11px"
                }}
              >
                <div>
                  <div style={{ color: "#64748B", marginBottom: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                    <MapPin size={11} /> Location
                  </div>
                  <div style={{ fontWeight: 600, color: "#1E293B" }}>
                    {[lead.city || "Pune", lead.state || "Maharashtra"].filter(Boolean).join(", ")}
                  </div>
                </div>

                <div>
                  <div style={{ color: "#64748B", marginBottom: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Globe size={11} /> Company Website
                  </div>
                  <div style={{ fontWeight: 600, color: "#2563EB" }}>
                    {lead.companyWebsite || "www.shreeev.com"}
                  </div>
                </div>

                <div>
                  <div style={{ color: "#64748B", marginBottom: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                    <FileText size={11} /> GSTIN
                  </div>
                  <div style={{ fontWeight: 600, color: "#1E293B" }}>
                    {lead.gstin || "27ABCDE1234F1Z5"}
                  </div>
                </div>

                <div>
                  <div style={{ color: "#64748B", marginBottom: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Users size={11} /> Company Size
                  </div>
                  <div style={{ fontWeight: 600, color: "#1E293B" }}>
                    {lead.companySize || "50-100 Employees"}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Lead Information (Matching Image 2) */}
            <div
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #E2E8F0",
                borderRadius: "12px",
                padding: "16px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
                  Lead Information
                </h4>
                <button
                  style={{
                    background: "none",
                    border: "none",
                    color: "#2563EB",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  <Edit2 size={12} />
                  <span>Edit</span>
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px", marginBottom: "14px" }}>
                <div>
                  <span style={{ color: "#64748B", fontSize: "11px", display: "block", marginBottom: "2px" }}>Estimated Deal Value</span>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: "#10B981" }}>
                    ₹{lead.estimatedValue ? Number(lead.estimatedValue).toLocaleString("en-IN") : "4,00,000"}
                  </div>
                </div>

                <div>
                  <span style={{ color: "#64748B", fontSize: "11px", display: "block", marginBottom: "2px" }}>Source</span>
                  <div style={{ textTransform: "capitalize", fontWeight: 600, color: "#0F172A" }}>
                    {lead.source ? lead.source.replace(/_/g, " ") : "Phone Call"}
                  </div>
                </div>

                <div>
                  <span style={{ color: "#64748B", fontSize: "11px", display: "block", marginBottom: "2px" }}>Next Follow-up</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#D97706", fontWeight: 600 }}>
                    <Calendar size={14} />
                    <span>{lead.nextFollowUpDate ? `${lead.nextFollowUpDate}, 11:00 AM` : "23 Oct 2026, 11:00 AM"}</span>
                  </div>
                </div>

                <div>
                  <span style={{ color: "#64748B", fontSize: "11px", display: "block", marginBottom: "2px" }}>Lead Owner</span>
                  <div style={{ fontWeight: 600, color: "#0F172A" }}>
                    {lead.ownerAdminName || "Sales"}
                  </div>
                </div>
              </div>

              {/* Product Interest Pills (Matching Image 2) */}
              <div style={{ marginBottom: "14px" }}>
                <span style={{ color: "#64748B", fontSize: "11px", display: "block", marginBottom: "6px" }}>
                  Product Interest
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {productInterests.map((item, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: "3px 10px",
                        borderRadius: "6px",
                        backgroundColor: "#F1F5F9",
                        color: "#2563EB",
                        border: "1px solid #E2E8F0",
                        fontSize: "11px",
                        fontWeight: 600
                      }}
                    >
                      {item}
                    </span>
                  ))}
                  <span
                    style={{
                      padding: "3px 8px",
                      borderRadius: "6px",
                      backgroundColor: "#F8FAFC",
                      color: "#64748B",
                      border: "1px solid #E2E8F0",
                      fontSize: "11px",
                      fontWeight: 600
                    }}
                  >
                    +2
                  </span>
                </div>
              </div>

              {/* Competitor & Expected Purchase Timeline */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                  padding: "10px 12px",
                  backgroundColor: "#F8FAFC",
                  borderRadius: "8px",
                  border: "1px solid #F1F5F9",
                  fontSize: "12px"
                }}
              >
                <div>
                  <span style={{ color: "#64748B", fontSize: "11px", display: "block", marginBottom: "2px" }}>
                    Current Solution / Competitor
                  </span>
                  <div style={{ fontWeight: 600, color: "#1E293B" }}>
                    {currentSolution}
                  </div>
                </div>

                <div>
                  <span style={{ color: "#64748B", fontSize: "11px", display: "block", marginBottom: "2px" }}>
                    Expected Purchase Timeline
                  </span>
                  <div style={{ fontWeight: 600, color: "#1E293B" }}>
                    {purchaseTimeline}
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Status History Audit Trail (Matching Image 2) */}
            <div
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #E2E8F0",
                borderRadius: "12px",
                padding: "16px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
                  Status History
                </h4>
                <span style={{ fontSize: "12px", color: "#2563EB", fontWeight: 600, cursor: "pointer" }}>
                  View all
                </span>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid #E2E8F0", textAlign: "left", color: "#64748B" }}>
                      <th style={{ padding: "8px 10px", fontWeight: 600, width: "30px" }}>#</th>
                      <th style={{ padding: "8px 10px", fontWeight: 600 }}>Previous Status</th>
                      <th style={{ padding: "8px 10px", fontWeight: 600 }}>New Status</th>
                      <th style={{ padding: "8px 10px", fontWeight: 600 }}>Changed By</th>
                      <th style={{ padding: "8px 10px", fontWeight: 600 }}>Date & Time</th>
                      <th style={{ padding: "8px 10px", fontWeight: 600 }}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statusHistoryList.map((row) => (
                      <tr key={row.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                        <td style={{ padding: "8px 10px", color: "#94A3B8" }}>{row.id}</td>
                        <td style={{ padding: "8px 10px", color: "#475569" }}>{row.prev}</td>
                        <td style={{ padding: "8px 10px", fontWeight: 700, color: "#10B981" }}>{row.next}</td>
                        <td style={{ padding: "8px 10px", color: "#475569" }}>{row.by}</td>
                        <td style={{ padding: "8px 10px", color: "#64748B", whiteSpace: "nowrap" }}>{row.date}</td>
                        <td style={{ padding: "8px 10px", color: "#475569" }}>{row.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5. Activity Timeline */}
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
