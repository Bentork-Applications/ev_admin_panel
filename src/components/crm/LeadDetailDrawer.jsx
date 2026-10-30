import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Check,
  Tag,
  Save,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Lock,
  MessageSquare,
  Send,
  FileSpreadsheet,
  Paperclip,
  Eye,
  Download,
  Film,
  Image as ImageIcon
} from "lucide-react";
import { crmService } from "../../services/crmService";
import { staffService } from "../../services/staffService";
import { LeadStatusBadge } from "./CrmBadge";
import { ActivityTimeline } from "./ActivityTimeline";
import { LogLeadMessageModal } from "./LogLeadMessageModal";
import {
  parseMessageAndAttachments,
  formatFileSize,
  getSessionAttachment
} from "../../utils/crmAttachmentUtils";

const formatINR = (amount) => {
  if (amount == null || amount === "" || isNaN(Number(amount))) return "—";
  const num = Number(amount);
  return "₹" + num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return String(dateStr);
  }
};

const formatDateOnly = (dateStr) => {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  } catch {
    return String(dateStr);
  }
};

const INDUSTRIES = [
  "Automotive / EV",
  "Industrial",
  "Renewable Energy",
  "Electronics",
  "OEM Manufacturing",
  "Dealer / Distribution",
  "Other"
];

const COMPANY_SIZES = [
  "Select",
  "1-10 Employees",
  "11-50 Employees",
  "50-100 Employees",
  "51-200 Employees",
  "201-500 Employees",
  "500+ Employees"
];

export const LeadDetailDrawer = ({
  leadId,
  isOpen,
  onClose,
  onLeadUpdated,
  showToast
}) => {
  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Edit Mode state (Test E)
  const [isEditing, setIsEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editFormData, setEditFormData] = useState({});

  // Confirmation dialog modal & conversion state
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [convertedOpp, setConvertedOpp] = useState(null);
  const [showLogMessageModal, setShowLogMessageModal] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState(null);

  const fetchLeadDetails = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    try {
      const [leadData, activityData, allStaff] = await Promise.all([
        crmService.getLeadById(leadId),
        crmService.getActivitiesForLead(leadId).catch(() => []),
        staffService.getAllStaff().catch(() => [])
      ]);

      const staffArr = Array.isArray(allStaff)
        ? allStaff
        : Array.isArray(allStaff?.data)
        ? allStaff.data
        : [];
      setStaffList(staffArr);

      const actArr = Array.isArray(activityData) ? activityData : [];
      setActivities(actArr);

      // Fetch linked company & contacts if companyId exists
      let companyData = null;
      let contactData = null;

      if (leadData?.companyId) {
        try {
          const [comp, compContacts] = await Promise.all([
            crmService.getCompanyById(leadData.companyId).catch(() => null),
            crmService.getContactsByCompany(leadData.companyId).catch(() => [])
          ]);
          companyData = comp;
          if (Array.isArray(compContacts) && compContacts.length > 0) {
            contactData =
              compContacts.find((c) => c.id === leadData.contactId) ||
              compContacts.find((c) => c.phone === leadData.contactPhone) ||
              compContacts.find((c) => c.isPrimary) ||
              compContacts[0] ||
              null;
          }
        } catch (compErr) {
          console.warn("Could not load associated company details:", compErr);
        }
      }

      // If contact still not found, search by phone
      if (!contactData && leadData?.contactPhone) {
        try {
          const searched = await crmService.searchContactByPhone(leadData.contactPhone).catch(() => null);
          if (searched && searched.id) {
            contactData = searched;
          }
        } catch (phoneErr) {
          console.warn("Could not search contact by phone:", phoneErr);
        }
      }

      // Aggregate all notes to parse embedded metadata
      const allNotesText = [leadData?.notes || "", ...actArr.map((a) => a.notes || "")].join("\n");

      const currentSolutionMatch =
        allNotesText.match(/\[Current Solution(?:\/Competitor)?:\s*([^\]]+)\]/i) ||
        allNotesText.match(/Competitor:\s*([^\n|\]]+)/i);
      const currentSolution = currentSolutionMatch ? currentSolutionMatch[1].trim() : "";

      const timelineMatch = allNotesText.match(/\[Purchase Timeline:\s*([^\]]+)\]/i);
      const purchaseTimeline = timelineMatch ? timelineMatch[1].trim() : "";

      const webMatch = allNotesText.match(/Web:\s*([^\s|\]]+)/i);
      const gstinMatch = allNotesText.match(/GSTIN:\s*([^\s|\]]+)/i);
      const sizeMatch = allNotesText.match(/Size:\s*([^\n|\]]+)/i);

      const mergedLead = {
        ...leadData,
        companyName: leadData?.companyName || companyData?.name || "",
        contactName: leadData?.contactName || contactData?.name || "",
        contactPhone: leadData?.contactPhone || contactData?.phone || "",
        contactEmail: contactData?.email || leadData?.contactEmail || "",
        designation: contactData?.designation || leadData?.designation || "",
        industry: companyData?.industry || leadData?.industry || "",
        city: leadData?.city || companyData?.city || "",
        state: leadData?.state || companyData?.state || "",
        companyWebsite:
          companyData?.website ||
          (webMatch && webMatch[1] !== "-" ? webMatch[1].trim() : "") ||
          "",
        gstin:
          companyData?.gstNumber ||
          (gstinMatch && gstinMatch[1] !== "-" ? gstinMatch[1].trim() : "") ||
          "",
        companySize:
          companyData?.companyType ||
          (sizeMatch && sizeMatch[1] !== "-" ? sizeMatch[1].trim() : "") ||
          "",
        currentSolution: currentSolution || "",
        purchaseTimeline: purchaseTimeline || "",
        ownerAdminName: leadData?.ownerAdminName || companyData?.ownerAdminName || "",
        ownerAdminId: leadData?.ownerAdminId || companyData?.ownerAdminId || ""
      };

      setLead(mergedLead);
    } catch (err) {
      console.error("Error fetching lead details:", err);
      showToast?.(err.message || "Failed to load lead details", "error");
    } finally {
      setLoading(false);
    }
  }, [leadId, showToast]);

  useEffect(() => {
    if (isOpen && leadId) {
      setIsEditing(false);
      fetchLeadDetails();
    }
  }, [isOpen, leadId, fetchLeadDetails]);

  const currentStatus = (lead?.status || "NEW").toUpperCase();

  const handleCopyLeadNumber = () => {
    const textToCopy = lead?.leadNumber || `LD-${leadId}`;
    navigator.clipboard?.writeText(textToCopy);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
    showToast?.(`Copied ${textToCopy} to clipboard`, "info");
  };

  // Status transition with explicit confirmation modal
  const requestStatusChange = (newStatus) => {
    const statusLabels = {
      CONTACTED: "Contacted",
      QUALIFIED: "Qualified",
      NURTURE: "Nurture",
      LOST: "Lost"
    };
    const targetLabel = statusLabels[newStatus] || newStatus;

    let warningNote = `This will move the lead from ${currentStatus} to ${targetLabel}.`;
    if (newStatus === "QUALIFIED") {
      warningNote = "Marking this lead as Qualified confirms eligibility for Opportunity conversion. Only Qualified leads with an associated company can be converted.";
    } else if (newStatus === "LOST") {
      warningNote = "Warning: Marking this lead as Lost is a terminal action. You will not be able to transition or convert this lead once marked as Lost.";
    }

    setConfirmDialog({
      title: `Confirm Status Change: ${targetLabel}`,
      message: `Are you sure you want to change the status of lead "${lead?.title || lead?.leadNumber || `LD-${leadId}`}" to ${targetLabel}?`,
      warningNote,
      confirmText: `Yes, Mark as ${targetLabel}`,
      confirmColor: newStatus === "LOST" ? "#DC2626" : newStatus === "QUALIFIED" ? "#10B981" : "#2563EB",
      onConfirm: async () => {
        setConfirmDialog(null);
        await executeStatusChange(newStatus);
      }
    });
  };

  const executeStatusChange = async (newStatus) => {
    setUpdating(true);
    try {
      await crmService.updateLeadStatus(leadId, newStatus.toUpperCase());
      try {
        await crmService.logActivity({
          leadId,
          companyId: lead?.companyId || null,
          contactId: lead?.contactId || null,
          activityType: "note",
          subject: `Status changed to ${newStatus.toUpperCase()}`,
          notes: `Lead status changed from ${currentStatus} to ${newStatus.toUpperCase()}`
        });
      } catch (actErr) {
        console.warn("Failed to log status activity:", actErr);
      }
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

  // Convert to Opportunity with validation & explicit confirmation
  const requestConvert = () => {
    if (currentStatus !== "QUALIFIED") {
      showToast?.(`Lead must be in QUALIFIED status to convert. Current: ${currentStatus.toLowerCase()}`, "error");
      return;
    }
    if (!lead?.companyId && !lead?.companyName) {
      showToast?.("Lead must have an associated company to convert to an opportunity", "error");
      return;
    }

    setConfirmDialog({
      title: "Convert Lead to Opportunity",
      message: `Are you sure you want to convert lead "${lead?.title || lead?.leadNumber || `LD-${leadId}`}" to a Sales Opportunity?`,
      warningNote: `This will create an active Opportunity linked to "${lead?.companyName || "the associated company"}" and set this lead to Converted in your sales pipeline.`,
      confirmText: "Yes, Convert to Opportunity",
      confirmColor: "#10B981",
      onConfirm: async () => {
        setConfirmDialog(null);
        await executeConvert();
      }
    });
  };

  const executeConvert = async () => {
    setUpdating(true);
    try {
      const opp = await crmService.convertLeadToOpportunity(leadId);
      setConvertedOpp(opp);
      try {
        await crmService.logActivity({
          leadId,
          companyId: lead?.companyId || null,
          contactId: lead?.contactId || null,
          activityType: "note",
          subject: "Converted to Opportunity",
          notes: `Lead converted to Opportunity ${opp?.opportunityNumber || opp?.id || ""}`
        });
      } catch (actErr) {
        console.warn("Failed to log convert activity:", actErr);
      }
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

  // Start Edit mode
  const handleStartEdit = () => {
    if (!lead) return;
    setEditFormData({
      contactName: lead.contactName || "",
      contactPhone: lead.contactPhone || "",
      contactEmail: lead.contactEmail || "",
      designation: lead.designation || "",
      companyName: lead.companyName || "",
      industry: lead.industry || "",
      city: lead.city || "",
      state: lead.state || "",
      companyWebsite: lead.companyWebsite || "",
      gstin: lead.gstin || "",
      companySize: lead.companySize || "",
      estimatedValue: lead.estimatedValue != null ? String(lead.estimatedValue) : "",
      nextFollowUpDate: lead.nextFollowUpDate || "",
      ownerAdminId: lead.ownerAdminId ? String(lead.ownerAdminId) : "",
      currentSolution: lead.currentSolution || ""
    });
    setIsEditing(true);
  };

  // Cancel Edit mode
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditFormData({});
  };

  // Explicit Save Changes (Test E)
  const handleSaveEdit = async (e) => {
    e?.preventDefault();
    setSavingEdit(true);
    try {
      // 1. Update Company details if companyId exists
      if (lead?.companyId) {
        await crmService.updateCompany(lead.companyId, {
          name: editFormData.companyName.trim() || lead.companyName,
          industry: editFormData.industry || lead.industry || null,
          companyType: editFormData.companySize || lead.companySize || "PRIVATE_LIMITED",
          gstNumber: editFormData.gstin.trim() || null,
          phone: editFormData.contactPhone.trim() || lead.contactPhone,
          email: editFormData.contactEmail.trim() || null,
          website: editFormData.companyWebsite.trim() || null,
          city: editFormData.city.trim() || null,
          state: editFormData.state.trim() || null,
          notes: editFormData.currentSolution
            ? `[Current Solution: ${editFormData.currentSolution.trim()}]`
            : undefined
        });
      }

      // 2. Update Lead Owner if changed
      const newOwnerId = Number(editFormData.ownerAdminId);
      if (Number.isInteger(newOwnerId) && newOwnerId > 0 && String(newOwnerId) !== String(lead?.ownerAdminId)) {
        await crmService.bulkAssignLeads([leadId], newOwnerId);
      }

      // 3. Log an activity note for this edit
      try {
        await crmService.logActivity({
          leadId,
          companyId: lead?.companyId || null,
          contactId: lead?.contactId || null,
          activityType: "note",
          subject: "Lead Details Updated",
          notes: `Updated lead details. Company: ${editFormData.companyName || "-"}, Contact: ${editFormData.contactName || "-"}, Industry: ${editFormData.industry || "-"}`
        });
      } catch (actErr) {
        console.warn("Could not log edit activity:", actErr);
      }

      showToast?.("Lead details updated successfully!", "success");
      setIsEditing(false);
      await fetchLeadDetails();
      onLeadUpdated?.();
    } catch (err) {
      console.error("Failed to update lead details:", err);
      showToast?.(err.message || "Failed to update lead details", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  // Dynamic Product Interests derived from lead title or tags
  const productInterests = useMemo(() => {
    if (!lead) return [];
    if (lead.productInterest) {
      return lead.productInterest.split(",").map((s) => s.trim()).filter(Boolean);
    }
    if (lead.tags) {
      return lead.tags.split(",").map((s) => s.trim()).filter(Boolean);
    }
    if (lead.title && lead.title.includes("—")) {
      const parts = lead.title.split("—")[1];
      if (parts) {
        return parts.split(",").map((s) => s.trim()).filter(Boolean);
      }
    }
    return lead.title ? [lead.title] : [];
  }, [lead]);

  // Status History: dynamic audit trail built from real creation + activity logs
  const statusHistoryList = useMemo(() => {
    if (!lead) return [];

    const rows = [];

    // 1. Initial creation entry from lead.createdAt
    const initialStatus =
      (lead.source === "phone_call" || activities.some((a) => a.activityType === "call"))
        ? "Contacted"
        : "New";

    rows.push({
      id: 1,
      prev: "—",
      next: initialStatus,
      by: lead.ownerAdminName || "System",
      date: formatDate(lead.createdAt),
      notes: lead.title ? `Registered: ${lead.title}` : "Initial lead creation"
    });

    // 2. Chronologically sort activities
    const sortedActs = [...activities].sort((a, b) => {
      const tA = new Date(a.activityDate || a.createdAt || 0).getTime();
      const tB = new Date(b.activityDate || b.createdAt || 0).getTime();
      return tA - tB;
    });

    // 3. Extract recorded status transitions or call outcomes
    sortedActs.forEach((act) => {
      const isCall = act.activityType === "call";
      const isStatusNote =
        (act.subject && act.subject.toLowerCase().includes("status")) ||
        (act.notes && act.notes.toLowerCase().includes("status changed"));

      if (isCall && initialStatus !== "Contacted") {
        rows.push({
          id: rows.length + 1,
          prev: "New",
          next: "Contacted",
          by: act.performedByAdminName || lead.ownerAdminName || "Sales Executive",
          date: formatDate(act.activityDate || act.createdAt),
          notes: act.callOutcome ? `Call logged (${act.callOutcome})` : "Initial call logged"
        });
      } else if (isStatusNote) {
        const match = act.notes?.match(/from\s+([A-Za-z_]+)\s+to\s+([A-Za-z_]+)/i);
        const prevS = match ? match[1] : rows[rows.length - 1]?.next || "Contacted";
        const nextS = match ? match[2] : (act.subject?.replace(/Status changed to\s*/i, "") || currentStatus);

        rows.push({
          id: rows.length + 1,
          prev: prevS.charAt(0).toUpperCase() + prevS.slice(1).toLowerCase(),
          next: nextS.charAt(0).toUpperCase() + nextS.slice(1).toLowerCase(),
          by: act.performedByAdminName || lead.ownerAdminName || "Sales Executive",
          date: formatDate(act.activityDate || act.createdAt),
          notes: act.notes || act.subject || "Status updated"
        });
      }
    });

    return rows;
  }, [lead, activities, currentStatus]);

  // Source Excel file name helper (from lead notes, activity metadata, or localStorage)
  const sourceFileName = useMemo(() => {
    if (!lead) return "";
    const match = (lead.notes || "").match(/\[File:\s*([^\]]+)\]/i);
    if (match && match[1]) return match[1].trim();

    for (const act of activities || []) {
      const actMatch = (act.notes || act.subject || "").match(/\[File:\s*([^\]]+)\]/i);
      if (actMatch && actMatch[1]) return actMatch[1].trim();
    }

    try {
      const sessions = JSON.parse(localStorage.getItem("crm_excel_imports") || "[]");
      const phone = String(lead.contactPhone || lead.phone || "").replace(/\D/g, "").slice(-10);
      if (phone) {
        const sess = sessions.find((s) => Array.isArray(s.phones) && s.phones.includes(phone));
        if (sess && sess.fileName) return sess.fileName;
      }
    } catch {
      // ignore
    }
    return "";
  }, [lead, activities]);

  // Chronologically sorted messages recorded for this lead
  const messageHistory = useMemo(() => {
    if (!activities || !Array.isArray(activities)) return [];
    return activities
      .filter((a) => {
        const type = (a.activityType || "").toLowerCase();
        const sub = (a.subject || "").toLowerCase();
        const not = (a.notes || "").toLowerCase();
        return (
          type.includes("whatsapp") ||
          type.includes("campaign") ||
          type.includes("email") ||
          sub.includes("message") ||
          sub.includes("broadcast") ||
          not.includes("[file:") ||
          (type === "note" && (sub.includes("message") || not.includes("message") || not.includes("sent")))
        );
      })
      .sort((a, b) => new Date(a.activityDate || a.createdAt || 0) - new Date(b.activityDate || b.createdAt || 0));
  }, [activities]);

  // Stepper helper
  const getStepStatus = (stepName) => {
    const s = currentStatus.toLowerCase();
    if (s === "lost") return "lost";

    if (stepName === "new") {
      return s === "new" ? "current" : "done";
    }
    if (stepName === "contacted") {
      if (s === "new") return "pending";
      if (s === "contacted") return "current";
      return ["qualified", "opportunity", "converted"].includes(s) ? "done" : "pending";
    }
    if (stepName === "qualified") {
      if (["new", "contacted", "nurture"].includes(s)) return "pending";
      if (s === "qualified") return "current";
      return ["opportunity", "converted"].includes(s) ? "done" : "pending";
    }
    if (stepName === "opportunity") {
      if (["opportunity", "converted"].includes(s)) return "done";
      return "pending";
    }
    return "pending";
  };

  if (!isOpen) return null;

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
          maxWidth: "640px",
          height: "100%",
          backgroundColor: "#ffffff",
          boxShadow: "-10px 0 30px rgba(0, 0, 0, 0.15)",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
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
                <span>{lead?.leadNumber || `LD-${leadId}`}</span>
                {copiedId ? <CheckCircle size={12} color="#10B981" /> : <Copy size={12} color="#64748B" />}
              </button>

              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "12px",
                  backgroundColor:
                    currentStatus === "QUALIFIED"
                      ? "#DCFCE7"
                      : currentStatus === "CONTACTED"
                      ? "#FEF3C7"
                      : currentStatus === "LOST"
                      ? "#FEE2E2"
                      : "#EFF6FF",
                  color:
                    currentStatus === "QUALIFIED"
                      ? "#15803D"
                      : currentStatus === "CONTACTED"
                      ? "#B45309"
                      : currentStatus === "LOST"
                      ? "#B91C1C"
                      : "#1D4ED8",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor:
                      currentStatus === "QUALIFIED"
                        ? "#16A34A"
                        : currentStatus === "CONTACTED"
                        ? "#F59E0B"
                        : currentStatus === "LOST"
                        ? "#DC2626"
                        : "#2563EB"
                  }}
                />
                {currentStatus.charAt(0) + currentStatus.slice(1).toLowerCase()}
              </span>
            </div>

            <h3 style={{ margin: 0, fontSize: "19px", fontWeight: 700, color: "#0F172A" }}>
              {lead?.title || "Lead Details"}
            </h3>
            <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#64748B" }}>
              Added on {formatDateOnly(lead?.createdAt)} • Source:{" "}
              {lead?.source ? lead.source.replace(/_/g, " ") : "Phone Call"}
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
            {/* 1. Lead Status Stepper & Transitions */}
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
                  <span
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      backgroundColor:
                        getStepStatus("new") === "done"
                          ? "#10B981"
                          : getStepStatus("new") === "current"
                          ? "#2563EB"
                          : "#CBD5E1",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "10px",
                      color: "#fff",
                      fontWeight: 700
                    }}
                  >
                    {getStepStatus("new") === "done" ? "✓" : "1"}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: getStepStatus("new") === "current" ? 700 : 600,
                      color:
                        getStepStatus("new") === "current"
                          ? "#1D4ED8"
                          : getStepStatus("new") === "done"
                          ? "#059669"
                          : "#64748B"
                    }}
                  >
                    New
                  </span>
                </div>
                <span style={{ color: "#CBD5E1", fontSize: "12px" }}>→</span>

                {/* Step 2: Contacted */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      backgroundColor:
                        getStepStatus("contacted") === "done"
                          ? "#10B981"
                          : getStepStatus("contacted") === "current"
                          ? "#F59E0B"
                          : "#CBD5E1",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "10px",
                      color: "#fff",
                      fontWeight: 700
                    }}
                  >
                    {getStepStatus("contacted") === "done" ? "✓" : "2"}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: getStepStatus("contacted") === "current" ? 700 : 600,
                      color:
                        getStepStatus("contacted") === "current"
                          ? "#B45309"
                          : getStepStatus("contacted") === "done"
                          ? "#059669"
                          : "#64748B"
                    }}
                  >
                    Contacted
                  </span>
                </div>
                <span style={{ color: "#CBD5E1", fontSize: "12px" }}>→</span>

                {/* Step 3: Qualified */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      backgroundColor:
                        getStepStatus("qualified") === "done"
                          ? "#10B981"
                          : getStepStatus("qualified") === "current"
                          ? "#10B981"
                          : "#CBD5E1",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "10px",
                      color: "#fff",
                      fontWeight: 700
                    }}
                  >
                    {getStepStatus("qualified") === "done" ? "✓" : "3"}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: getStepStatus("qualified") === "current" ? 700 : 600,
                      color:
                        getStepStatus("qualified") === "current" || getStepStatus("qualified") === "done"
                          ? "#059669"
                          : "#64748B"
                    }}
                  >
                    Qualified
                  </span>
                </div>
                <span style={{ color: "#CBD5E1", fontSize: "12px" }}>→</span>

                {/* Step 4: Opportunity */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      backgroundColor:
                        getStepStatus("opportunity") === "done"
                          ? "#7C3AED"
                          : "#CBD5E1",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "10px",
                      color: "#fff",
                      fontWeight: 700
                    }}
                  >
                    {getStepStatus("opportunity") === "done" ? "✓" : "4"}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: getStepStatus("opportunity") === "done" ? 700 : 600,
                      color: getStepStatus("opportunity") === "done" ? "#6D28D9" : "#64748B"
                    }}
                  >
                    Opportunity
                  </span>
                </div>

                <div style={{ borderLeft: "1px solid #E2E8F0", paddingLeft: "10px", display: "flex", gap: "8px" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      color: currentStatus === "LOST" ? "#EF4444" : "#94A3B8",
                      fontWeight: currentStatus === "LOST" ? 700 : 500
                    }}
                  >
                    Lost
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      color: currentStatus === "NURTURE" ? "#8B5CF6" : "#94A3B8",
                      fontWeight: currentStatus === "NURTURE" ? 700 : 500
                    }}
                  >
                    Nurture
                  </span>
                </div>
              </div>

              {/* Status & Conversion Guidance Banner */}
              {currentStatus === "CONTACTED" && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    padding: "12px 14px",
                    backgroundColor: "#FFFBEB",
                    border: "1px solid #FDE68A",
                    borderRadius: "10px",
                    marginBottom: "12px"
                  }}
                >
                  <AlertTriangle size={18} color="#D97706" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#92400E", marginBottom: "2px" }}>
                      Prerequisite Required for Opportunity Conversion
                    </div>
                    <div style={{ fontSize: "12px", color: "#B45309", lineHeight: 1.4 }}>
                      Lead must be in <strong>QUALIFIED</strong> status to convert. Current status is <strong>Contacted</strong>.
                      Review the lead criteria and click <strong>"✓ Mark as Qualified"</strong> below once verified.
                    </div>
                  </div>
                </div>
              )}

              {currentStatus === "NEW" && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    padding: "12px 14px",
                    backgroundColor: "#EFF6FF",
                    border: "1px solid #BFDBFE",
                    borderRadius: "10px",
                    marginBottom: "12px"
                  }}
                >
                  <Info size={18} color="#2563EB" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#1E40AF", marginBottom: "2px" }}>
                      New Lead: Initial Contact Required
                    </div>
                    <div style={{ fontSize: "12px", color: "#1D4ED8", lineHeight: 1.4 }}>
                      This lead is in <strong>NEW</strong> status. Reach out to the contact and mark as <strong>Contacted</strong> to begin qualification.
                    </div>
                  </div>
                </div>
              )}

              {currentStatus === "QUALIFIED" && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    padding: "12px 14px",
                    backgroundColor: (!lead?.companyId && !lead?.companyName) ? "#FFFBEB" : "#ECFDF5",
                    border: `1px solid ${(!lead?.companyId && !lead?.companyName) ? "#FDE68A" : "#A7F3D0"}`,
                    borderRadius: "10px",
                    marginBottom: "12px"
                  }}
                >
                  {(!lead?.companyId && !lead?.companyName) ? (
                    <AlertTriangle size={18} color="#D97706" style={{ flexShrink: 0, marginTop: "2px" }} />
                  ) : (
                    <CheckCircle2 size={18} color="#059669" style={{ flexShrink: 0, marginTop: "2px" }} />
                  )}
                  <div>
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: 700,
                        color: (!lead?.companyId && !lead?.companyName) ? "#92400E" : "#065F46",
                        marginBottom: "2px"
                      }}
                    >
                      {(!lead?.companyId && !lead?.companyName)
                        ? "Company Required for Conversion"
                        : "Lead is Qualified for Opportunity Conversion"}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: (!lead?.companyId && !lead?.companyName) ? "#B45309" : "#047857",
                        lineHeight: 1.4
                      }}
                    >
                      {(!lead?.companyId && !lead?.companyName)
                        ? "The backend requires an associated company to convert this lead to an opportunity. Please edit this lead to provide a company name first."
                        : "This lead is qualified and ready to be converted into an active Sales Opportunity."}
                    </div>
                  </div>
                </div>
              )}

              {currentStatus === "CONVERTED" && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                    padding: "14px 16px",
                    backgroundColor: "#F0FDF4",
                    border: "1px solid #BBF7D0",
                    borderRadius: "10px",
                    marginBottom: "12px"
                  }}
                >
                  <CheckCircle size={20} color="#16A34A" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#15803D", marginBottom: "2px" }}>
                      Lead Converted to Opportunity
                    </div>
                    <div style={{ fontSize: "12px", color: "#166534", lineHeight: 1.4 }}>
                      This lead was successfully converted to an Opportunity
                      {(convertedOpp?.opportunityNumber || lead?.convertedToOpportunityId) && (
                        <strong> ({convertedOpp?.opportunityNumber || `ID: ${lead.convertedToOpportunityId}`})</strong>
                      )} and is now tracked in your pipeline.
                    </div>
                  </div>
                </div>
              )}

              {currentStatus === "LOST" && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    padding: "12px 14px",
                    backgroundColor: "#FEF2F2",
                    border: "1px solid #FECACA",
                    borderRadius: "10px",
                    marginBottom: "12px"
                  }}
                >
                  <AlertTriangle size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#991B1B", marginBottom: "2px" }}>
                      Lead Closed as Lost
                    </div>
                    <div style={{ fontSize: "12px", color: "#B91C1C", lineHeight: 1.4 }}>
                      This lead has been closed as Lost. No further transitions or opportunity conversions can be made.
                    </div>
                  </div>
                </div>
              )}

              {/* Available Transitions */}
              {currentStatus !== "CONVERTED" && currentStatus !== "LOST" && (
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "8px" }}>
                    Available Transitions from {currentStatus.charAt(0) + currentStatus.slice(1).toLowerCase()}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {/* Convert to Opportunity Button */}
                    {currentStatus === "QUALIFIED" ? (
                      <button
                        disabled={updating || (!lead?.companyId && !lead?.companyName)}
                        onClick={requestConvert}
                        title={(!lead?.companyId && !lead?.companyName) ? "Associate a company name before converting" : "Convert this qualified lead to an opportunity"}
                        style={{
                          padding: "8px 16px",
                          borderRadius: "8px",
                          backgroundColor: (!lead?.companyId && !lead?.companyName) ? "#94A3B8" : "#10B981",
                          color: "#ffffff",
                          border: "none",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: (!lead?.companyId && !lead?.companyName) ? "not-allowed" : "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          boxShadow: (!lead?.companyId && !lead?.companyName) ? "none" : "0 2px 4px rgba(16, 185, 129, 0.2)"
                        }}
                      >
                        <span>→ Convert to Opportunity</span>
                      </button>
                    ) : (
                      <button
                        disabled={true}
                        title={`Lead must be in QUALIFIED status to convert. Current status: ${currentStatus.toLowerCase()}`}
                        style={{
                          padding: "8px 14px",
                          borderRadius: "8px",
                          backgroundColor: "#F1F5F9",
                          color: "#94A3B8",
                          border: "1px dashed #CBD5E1",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "not-allowed",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px"
                        }}
                      >
                        <Lock size={12} color="#94A3B8" />
                        <span>Convert to Opportunity (Requires Qualified)</span>
                      </button>
                    )}

                    {/* NEW -> CONTACTED */}
                    {currentStatus === "NEW" && (
                      <button
                        disabled={updating}
                        onClick={() => requestStatusChange("CONTACTED")}
                        style={{
                          padding: "8px 14px",
                          borderRadius: "8px",
                          backgroundColor: "#EFF6FF",
                          color: "#2563EB",
                          border: "1px solid #BFDBFE",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px"
                        }}
                      >
                        <span>📞 Mark as Contacted</span>
                      </button>
                    )}

                    {/* CONTACTED -> QUALIFIED */}
                    {currentStatus === "CONTACTED" && (
                      <button
                        disabled={updating}
                        onClick={() => requestStatusChange("QUALIFIED")}
                        style={{
                          padding: "8px 16px",
                          borderRadius: "8px",
                          backgroundColor: "#ECFDF5",
                          color: "#059669",
                          border: "1px solid #A7F3D0",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          boxShadow: "0 1px 2px rgba(5, 150, 105, 0.1)"
                        }}
                      >
                        <span>✓ Mark as Qualified</span>
                      </button>
                    )}

                    {/* CONTACTED -> NURTURE */}
                    {currentStatus === "CONTACTED" && (
                      <button
                        disabled={updating}
                        onClick={() => requestStatusChange("NURTURE")}
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
                    )}

                    {/* NURTURE -> CONTACTED */}
                    {currentStatus === "NURTURE" && (
                      <button
                        disabled={updating}
                        onClick={() => requestStatusChange("CONTACTED")}
                        style={{
                          padding: "8px 14px",
                          borderRadius: "8px",
                          backgroundColor: "#EFF6FF",
                          color: "#2563EB",
                          border: "1px solid #BFDBFE",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px"
                        }}
                      >
                        <span>📞 Re-contact Lead</span>
                      </button>
                    )}

                    {/* Mark Lost (Allowed from NEW, CONTACTED, QUALIFIED, NURTURE) */}
                    <button
                      disabled={updating}
                      onClick={() => requestStatusChange("LOST")}
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
              )}

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
                  All status transitions are confirmed before saving and automatically recorded in the CRM activity history.
                </span>
              </div>
            </div>

            {/* EDIT MODE FORM (Test E: Existing Lead Editing) */}
            {isEditing ? (
              <form
                onSubmit={handleSaveEdit}
                style={{
                  backgroundColor: "#ffffff",
                  border: "2px solid #2563EB",
                  borderRadius: "12px",
                  padding: "20px",
                  boxShadow: "0 4px 12px rgba(37, 99, 235, 0.1)"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Edit2 size={16} color="#2563EB" />
                    <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>
                      Edit Lead Information
                    </h4>
                  </div>
                  <span style={{ fontSize: "11px", color: "#64748B" }}>
                    Changes are saved only upon clicking "Save Changes"
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#475569", marginBottom: "3px" }}>
                      Contact Name
                    </label>
                    <input
                      type="text"
                      value={editFormData.contactName || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, contactName: e.target.value })}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "12px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#475569", marginBottom: "3px" }}>
                      Phone
                    </label>
                    <input
                      type="text"
                      value={editFormData.contactPhone || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, contactPhone: e.target.value })}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "12px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#475569", marginBottom: "3px" }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={editFormData.contactEmail || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, contactEmail: e.target.value })}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "12px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#475569", marginBottom: "3px" }}>
                      Designation
                    </label>
                    <input
                      type="text"
                      value={editFormData.designation || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, designation: e.target.value })}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "12px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#475569", marginBottom: "3px" }}>
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={editFormData.companyName || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, companyName: e.target.value })}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "12px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#475569", marginBottom: "3px" }}>
                      Industry
                    </label>
                    <select
                      value={editFormData.industry || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, industry: e.target.value })}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "12px" }}
                    >
                      <option value="">-- Select Industry --</option>
                      {INDUSTRIES.map((ind) => (
                        <option key={ind} value={ind}>{ind}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#475569", marginBottom: "3px" }}>
                      City
                    </label>
                    <input
                      type="text"
                      value={editFormData.city || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "12px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#475569", marginBottom: "3px" }}>
                      State
                    </label>
                    <input
                      type="text"
                      value={editFormData.state || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "12px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#475569", marginBottom: "3px" }}>
                      Company Website
                    </label>
                    <input
                      type="text"
                      value={editFormData.companyWebsite || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, companyWebsite: e.target.value })}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "12px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#475569", marginBottom: "3px" }}>
                      GSTIN
                    </label>
                    <input
                      type="text"
                      value={editFormData.gstin || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, gstin: e.target.value })}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "12px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#475569", marginBottom: "3px" }}>
                      Company Size
                    </label>
                    <select
                      value={editFormData.companySize || "Select"}
                      onChange={(e) => setEditFormData({ ...editFormData, companySize: e.target.value })}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "12px" }}
                    >
                      {COMPANY_SIZES.map((sz) => (
                        <option key={sz} value={sz}>{sz}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#475569", marginBottom: "3px" }}>
                      Lead Owner
                    </label>
                    <select
                      value={editFormData.ownerAdminId || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, ownerAdminId: e.target.value })}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "12px" }}
                    >
                      <option value="">-- Unassigned --</option>
                      {staffList.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name || st.email} ({st.role || "Staff"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#475569", marginBottom: "3px" }}>
                      Estimated Value (₹)
                    </label>
                    <input
                      type="number"
                      value={editFormData.estimatedValue || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, estimatedValue: e.target.value })}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "12px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#475569", marginBottom: "3px" }}>
                      Current Solution / Competitor
                    </label>
                    <input
                      type="text"
                      value={editFormData.currentSolution || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, currentSolution: e.target.value })}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "12px" }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "14px" }}>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={savingEdit}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "6px",
                      backgroundColor: "#F1F5F9",
                      color: "#475569",
                      border: "1px solid #CBD5E1",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    style={{
                      padding: "8px 18px",
                      borderRadius: "6px",
                      backgroundColor: "#2563EB",
                      color: "#ffffff",
                      border: "none",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    <Save size={13} />
                    <span>{savingEdit ? "Saving..." : "Save Changes"}</span>
                  </button>
                </div>
              </form>
            ) : (
              <>
                {/* 2. Contact & Company (View Mode) */}
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
                      onClick={handleStartEdit}
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
                        <span>{lead.companyName || "—"}</span>
                      </div>
                    </div>

                    <div>
                      <span style={{ color: "#64748B", fontSize: "11px", display: "block", marginBottom: "2px" }}>Contact Person</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, color: "#0F172A" }}>
                        <User size={14} color="#64748B" />
                        <span>{lead.contactName || "—"}</span>
                      </div>
                    </div>

                    <div>
                      <span style={{ color: "#64748B", fontSize: "11px", display: "block", marginBottom: "2px" }}>Phone</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#0F172A" }}>
                        <Phone size={14} color="#64748B" />
                        <span>{lead.contactPhone || "—"}</span>
                      </div>
                    </div>

                    <div>
                      <span style={{ color: "#64748B", fontSize: "11px", display: "block", marginBottom: "2px" }}>Designation</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#0F172A" }}>
                        <Briefcase size={14} color="#64748B" />
                        <span>{lead.designation || "—"}</span>
                      </div>
                    </div>

                    <div>
                      <span style={{ color: "#64748B", fontSize: "11px", display: "block", marginBottom: "2px" }}>Email</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: lead.contactEmail ? "#2563EB" : "#64748B" }}>
                        <Mail size={14} color="#64748B" />
                        <span>{lead.contactEmail || "—"}</span>
                      </div>
                    </div>

                    <div>
                      <span style={{ color: "#64748B", fontSize: "11px", display: "block", marginBottom: "2px" }}>Industry</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#0F172A" }}>
                        <Layers size={14} color="#64748B" />
                        <span>{lead.industry || "—"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Additional Company Details row */}
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
                        {[lead.city, lead.state].filter(Boolean).join(", ") || "—"}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: "#64748B", marginBottom: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Globe size={11} /> Company Website
                      </div>
                      <div style={{ fontWeight: 600, color: lead.companyWebsite ? "#2563EB" : "#64748B" }}>
                        {lead.companyWebsite ? (
                          <a
                            href={lead.companyWebsite.startsWith("http") ? lead.companyWebsite : `https://${lead.companyWebsite}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#2563EB", textDecoration: "underline" }}
                          >
                            {lead.companyWebsite}
                          </a>
                        ) : (
                          "—"
                        )}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: "#64748B", marginBottom: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                        <FileText size={11} /> GSTIN
                      </div>
                      <div style={{ fontWeight: 600, color: "#1E293B" }}>
                        {lead.gstin || "—"}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: "#64748B", marginBottom: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Users size={11} /> Company Size
                      </div>
                      <div style={{ fontWeight: 600, color: "#1E293B" }}>
                        {lead.companySize || "—"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Lead Information (View Mode) */}
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
                      onClick={handleStartEdit}
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
                        {formatINR(lead.estimatedValue)}
                      </div>
                    </div>

                    <div>
                      <span style={{ color: "#64748B", fontSize: "11px", display: "block", marginBottom: "2px" }}>Source</span>
                      <div style={{ textTransform: "capitalize", fontWeight: 600, color: "#0F172A" }}>
                        {lead.source ? lead.source.replace(/_/g, " ") : "—"}
                      </div>
                    </div>

                    <div>
                      <span style={{ color: "#64748B", fontSize: "11px", display: "block", marginBottom: "2px" }}>Next Follow-up</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#D97706", fontWeight: 600 }}>
                        <Calendar size={14} />
                        <span>{lead.nextFollowUpDate ? formatDateOnly(lead.nextFollowUpDate) : "—"}</span>
                      </div>
                    </div>

                    <div>
                      <span style={{ color: "#64748B", fontSize: "11px", display: "block", marginBottom: "2px" }}>Lead Owner</span>
                      <div style={{ fontWeight: 600, color: "#0F172A" }}>
                        {lead.ownerAdminName || "Unassigned"}
                      </div>
                    </div>
                  </div>

                  {/* Product Interest Pills */}
                  {productInterests.length > 0 && (
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
                      </div>
                    </div>
                  )}

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
                        {lead.currentSolution || "—"}
                      </div>
                    </div>

                    <div>
                      <span style={{ color: "#64748B", fontSize: "11px", display: "block", marginBottom: "2px" }}>
                        Expected Purchase Timeline
                      </span>
                      <div style={{ fontWeight: 600, color: "#1E293B" }}>
                        {lead.purchaseTimeline || "—"}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* 4. Status History Audit Trail (Dynamic from Real Data) */}
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
                <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 500 }}>
                  {statusHistoryList.length} record(s)
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

            {/* 4.5 Recorded Message History Section */}
            <div
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #E2E8F0",
                borderRadius: "12px",
                padding: "16px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "14px",
                  flexWrap: "wrap",
                  gap: "10px"
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <MessageSquare size={16} color="#2563EB" />
                    <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
                      Message History
                    </h4>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        backgroundColor: "#EFF6FF",
                        color: "#2563EB",
                        padding: "2px 7px",
                        borderRadius: "10px"
                      }}
                    >
                      {messageHistory.length}
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748B", marginTop: "3px" }}>
                    <span>Contact: <strong>{lead.contactName || "—"}</strong></span>
                    <span style={{ margin: "0 6px" }}>•</span>
                    <span>Mobile: <strong>{lead.contactPhone || lead.phone || "—"}</strong></span>
                    {sourceFileName && (
                      <>
                        <span style={{ margin: "0 6px" }}>•</span>
                        <span style={{ color: "#059669", fontWeight: 600 }}>File: {sourceFileName}</span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowLogMessageModal(true)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    backgroundColor: "#2563EB",
                    color: "#ffffff",
                    border: "none",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    boxShadow: "0 1px 2px rgba(37, 99, 235, 0.2)"
                  }}
                >
                  <Send size={13} />
                  <span>+ Record Message</span>
                </button>
              </div>

              {messageHistory.length === 0 ? (
                <div
                  style={{
                    padding: "24px 16px",
                    textAlign: "center",
                    backgroundColor: "#F8FAFC",
                    borderRadius: "10px",
                    border: "1px dashed #CBD5E1"
                  }}
                >
                  <MessageSquare size={22} color="#94A3B8" style={{ margin: "0 auto 6px" }} />
                  <div style={{ fontSize: "13px", color: "#64748B", fontWeight: 500 }}>
                    No messages recorded yet for this lead.
                  </div>
                  <div style={{ fontSize: "11.5px", color: "#94A3B8", marginTop: "2px" }}>
                    Click "+ Record Message" to log message content and timestamps.
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {messageHistory.map((msg, index) => {
                    const rawType = (msg.activityType || "note").toLowerCase();
                    const isWhatsApp = rawType.includes("whatsapp");
                    const isCampaign = rawType.includes("campaign");
                    const isEmail = rawType.includes("email");

                    const badgeBg = isWhatsApp ? "#ECFDF5" : isCampaign ? "#FAF5FF" : isEmail ? "#FDF2F8" : "#F1F5F9";
                    const badgeColor = isWhatsApp ? "#059669" : isCampaign ? "#7E22CE" : isEmail ? "#BE185D" : "#475569";
                    const badgeBorder = isWhatsApp ? "#A7F3D0" : isCampaign ? "#E9D5FF" : isEmail ? "#FBCFE8" : "#E2E8F0";
                    const typeLabel = isWhatsApp ? "WhatsApp Outbound" : isCampaign ? "Campaign Message" : isEmail ? "Email" : "Message Note";

                    const msgFileMatch = (msg.notes || msg.subject || "").match(/\[File:\s*([^\]]+)\]/i);
                    const msgFileName = msgFileMatch ? msgFileMatch[1].trim() : sourceFileName;

                    const { cleanText, attachments: msgAttachments } = parseMessageAndAttachments(msg.notes);
                    const recipientContact = msg.contactName || lead.contactName || lead.title || "—";
                    const recipientPhone = msg.contactPhone || lead.contactPhone || lead.phone || "—";

                    return (
                      <div
                        key={msg.id || index}
                        style={{
                          padding: "14px 16px",
                          borderRadius: "10px",
                          backgroundColor: "#F8FAFC",
                          border: "1px solid #E2E8F0",
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px"
                        }}
                      >
                        {/* Message Header */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: "8px"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 600,
                                padding: "2px 8px",
                                borderRadius: "6px",
                                backgroundColor: badgeBg,
                                color: badgeColor,
                                border: `1px solid ${badgeBorder}`
                              }}
                            >
                              {typeLabel}
                            </span>
                            {msg.subject && (
                              <span style={{ fontSize: "12.5px", fontWeight: 600, color: "#1E293B" }}>
                                {msg.subject}
                              </span>
                            )}
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "11.5px", color: "#64748B" }}>
                            {msgFileName && (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#059669", fontWeight: 500 }}>
                                <FileSpreadsheet size={12} />
                                {msgFileName}
                              </span>
                            )}
                            <span style={{ whiteSpace: "nowrap" }}>
                              {formatDate(msg.activityDate || msg.createdAt)}
                            </span>
                            {msg.performedByAdminName && (
                              <span style={{ color: "#475569", fontWeight: 500 }}>
                                by {msg.performedByAdminName}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Recipient Details Pill */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            fontSize: "11.5px",
                            color: "#475569",
                            backgroundColor: "#F1F5F9",
                            padding: "4px 10px",
                            borderRadius: "6px",
                            width: "fit-content"
                          }}
                        >
                          <span>Recipient: <strong style={{ color: "#0F172A" }}>{recipientContact}</strong></span>
                          <span>•</span>
                          <span>Mobile: <strong style={{ fontFamily: "monospace", color: "#0F172A" }}>{recipientPhone}</strong></span>
                        </div>

                        {/* Message Text Body */}
                        <div
                          style={{
                            fontSize: "13px",
                            color: "#334155",
                            lineHeight: "1.55",
                            backgroundColor: "#ffffff",
                            padding: "10px 12px",
                            borderRadius: "8px",
                            border: "1px solid #E2E8F0",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word"
                          }}
                        >
                          {cleanText || "No message text recorded"}
                        </div>

                        {/* Attachments Section - ONLY shown if attachments exist for this message */}
                        {msgAttachments && msgAttachments.length > 0 && (
                          <div
                            style={{
                              backgroundColor: "#ffffff",
                              border: "1px solid #E2E8F0",
                              borderRadius: "8px",
                              padding: "10px 12px"
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                fontSize: "11.5px",
                                fontWeight: 700,
                                color: "#334155",
                                marginBottom: "8px",
                                textTransform: "uppercase",
                                letterSpacing: "0.03em"
                              }}
                            >
                              <Paperclip size={13} color="#2563EB" />
                              <span>Attachments ({msgAttachments.length})</span>
                            </div>

                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
                                gap: "8px"
                              }}
                            >
                              {msgAttachments.map((att, attIdx) => {
                                const cached = getSessionAttachment(att.id);
                                const effectiveUrl = att.thumbnail || (cached ? cached.objectUrl : null) || att.objectUrl || att.previewUrl;
                                const isImg = att.category === "image";
                                const isPdf = att.category === "pdf";
                                const isVid = att.category === "video";
                                const isDoc = att.category === "document";

                                const handleAction = () => {
                                  if (isImg) {
                                    setPreviewAttachment({ ...att, effectiveUrl });
                                  } else if (cached?.objectUrl || att.objectUrl) {
                                    const urlToOpen = cached?.objectUrl || att.objectUrl;
                                    const link = document.createElement("a");
                                    link.href = urlToOpen;
                                    link.download = att.name;
                                    link.target = "_blank";
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                  } else {
                                    showToast?.(
                                      `Attachment "${att.name}" (${formatFileSize(att.size)}) is recorded in CRM message audit trail. Full external cloud storage endpoint is pending backend integration.`,
                                      "info"
                                    );
                                  }
                                };

                                return (
                                  <div
                                    key={att.id || attIdx}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      padding: "8px 10px",
                                      borderRadius: "8px",
                                      border: "1px solid #E2E8F0",
                                      backgroundColor: "#F8FAFC",
                                      gap: "8px"
                                    }}
                                  >
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                                      {isImg && effectiveUrl ? (
                                        <div
                                          onClick={handleAction}
                                          style={{
                                            width: "36px",
                                            height: "36px",
                                            borderRadius: "6px",
                                            overflow: "hidden",
                                            flexShrink: 0,
                                            cursor: "pointer",
                                            border: "1px solid #CBD5E1",
                                            backgroundColor: "#E2E8F0"
                                          }}
                                          title="Click to view full image"
                                        >
                                          <img
                                            src={effectiveUrl}
                                            alt={att.name}
                                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                          />
                                        </div>
                                      ) : (
                                        <div
                                          style={{
                                            width: "32px",
                                            height: "32px",
                                            borderRadius: "6px",
                                            backgroundColor: isPdf ? "#FEF2F2" : isDoc ? "#ECFDF5" : isVid ? "#F5F3FF" : "#F1F5F9",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0
                                          }}
                                        >
                                          {isPdf && <FileText size={16} color="#DC2626" />}
                                          {isDoc && <FileSpreadsheet size={16} color="#059669" />}
                                          {isVid && <Film size={16} color="#7C3AED" />}
                                          {!isPdf && !isDoc && !isVid && <FileText size={16} color="#64748B" />}
                                        </div>
                                      )}

                                      <div style={{ overflow: "hidden" }}>
                                        <div
                                          style={{
                                            fontSize: "12px",
                                            fontWeight: 600,
                                            color: "#1E293B",
                                            whiteSpace: "nowrap",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            maxWidth: "130px"
                                          }}
                                          title={att.name}
                                        >
                                          {att.name}
                                        </div>
                                        <div style={{ fontSize: "10.5px", color: "#64748B" }}>
                                          {formatFileSize(att.size)}
                                        </div>
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={handleAction}
                                      style={{
                                        border: "none",
                                        backgroundColor: "#EFF6FF",
                                        color: "#2563EB",
                                        padding: "4px 8px",
                                        borderRadius: "6px",
                                        fontSize: "11px",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        flexShrink: 0
                                      }}
                                      title={isImg ? "View image" : "Open or download file"}
                                    >
                                      {isImg ? <Eye size={12} /> : <Download size={12} />}
                                      <span>{isImg ? "View" : isPdf ? "Open" : "Get"}</span>
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 5. Activity Timeline */}
            <ActivityTimeline
              activities={activities}
              leadId={leadId}
              companyId={lead?.companyId}
              contactId={lead?.contactId}
              onRefresh={fetchLeadDetails}
              showToast={showToast}
            />
          </div>
        )}
      </div>

      {/* Log Message Modal for this Lead */}
      {showLogMessageModal && lead && (
        <LogLeadMessageModal
          isOpen={showLogMessageModal}
          onClose={() => setShowLogMessageModal(false)}
          selectedLeads={[
            {
              id: lead.id,
              contactName: lead.contactName || lead.title,
              contactPhone: lead.contactPhone || lead.phone,
              companyName: lead.companyName,
              companyId: lead.companyId,
              contactId: lead.contactId
            }
          ]}
          onSuccess={() => {
            fetchLeadDetails();
            showToast?.("Message recorded successfully", "success");
          }}
          showToast={showToast}
        />
      )}

      {/* Confirmation Dialog Modal */}
      {confirmDialog && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 1400,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px"
          }}
          onClick={() => !updating && setConfirmDialog(null)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              padding: "24px",
              width: "100%",
              maxWidth: "460px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "16px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  backgroundColor: confirmDialog.confirmColor === "#DC2626" ? "#FEE2E2" : "#ECFDF5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}
              >
                {confirmDialog.confirmColor === "#DC2626" ? (
                  <AlertTriangle size={22} color="#DC2626" />
                ) : (
                  <CheckCircle2 size={22} color={confirmDialog.confirmColor || "#10B981"} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
                  {confirmDialog.title}
                </h4>
                <p style={{ margin: 0, fontSize: "13px", color: "#475569", lineHeight: 1.5 }}>
                  {confirmDialog.message}
                </p>
              </div>
            </div>

            {confirmDialog.warningNote && (
              <div
                style={{
                  backgroundColor: "#F8FAFC",
                  borderLeft: "3px solid #3B82F6",
                  padding: "10px 12px",
                  borderRadius: "0 8px 8px 0",
                  marginBottom: "20px",
                  fontSize: "12px",
                  color: "#334155",
                  lineHeight: 1.4
                }}
              >
                {confirmDialog.warningNote}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                disabled={updating}
                onClick={() => setConfirmDialog(null)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  backgroundColor: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#475569",
                  cursor: updating ? "not-allowed" : "pointer"
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updating}
                onClick={confirmDialog.onConfirm}
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: confirmDialog.confirmColor || "#10B981",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#ffffff",
                  cursor: updating ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                {updating ? "Processing..." : confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Attachment Preview Modal */}
      {previewAttachment && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(6px)",
            zIndex: 1450,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
          onClick={() => setPreviewAttachment(null)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              maxWidth: "720px",
              width: "100%",
              maxHeight: "90vh",
              overflow: "hidden",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid #E2E8F0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "#F8FAFC"
              }}
            >
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
                  {previewAttachment.name}
                </div>
                <div style={{ fontSize: "11.5px", color: "#64748B", marginTop: "2px" }}>
                  {(previewAttachment.category || "").toUpperCase()} • {formatFileSize(previewAttachment.size)}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94A3B8",
                  cursor: "pointer",
                  padding: "6px",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Area */}
            <div
              style={{
                padding: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#0F172A",
                overflowY: "auto",
                maxHeight: "70vh"
              }}
            >
              {previewAttachment.category === "image" ? (
                <img
                  src={previewAttachment.effectiveUrl || previewAttachment.thumbnail}
                  alt={previewAttachment.name}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "65vh",
                    borderRadius: "8px",
                    objectFit: "contain"
                  }}
                />
              ) : previewAttachment.category === "video" && previewAttachment.effectiveUrl ? (
                <video
                  controls
                  autoPlay
                  src={previewAttachment.effectiveUrl}
                  style={{ maxWidth: "100%", maxHeight: "65vh", borderRadius: "8px" }}
                />
              ) : (
                <div style={{ textAlign: "center", padding: "30px", color: "#F8FAFC" }}>
                  <FileText size={48} color="#94A3B8" style={{ margin: "0 auto 12px" }} />
                  <div style={{ fontSize: "14px", fontWeight: 600 }}>{previewAttachment.name}</div>
                  <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "4px" }}>
                    {formatFileSize(previewAttachment.size)}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "12px 20px",
                borderTop: "1px solid #E2E8F0",
                display: "flex",
                justifyContent: "flex-end",
                backgroundColor: "#F8FAFC",
                gap: "10px"
              }}
            >
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                style={{
                  padding: "7px 16px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  backgroundColor: "#ffffff",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  color: "#475569",
                  cursor: "pointer"
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
