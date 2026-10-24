import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Phone,
  Calendar,
  Mail,
  Clock,
  FileText,
  User,
  Building,
  AlertCircle,
  MessageSquare,
  Paperclip,
  Sun,
  UploadCloud,
  Check
} from "lucide-react";
import { crmService } from "../../services/crmService";
import { staffService } from "../../services/staffService";
import { safeDecodeJwt } from "../../utils/jwtUtils";

// WhatsApp Custom SVG Icon
const WhatsAppIcon = ({ size = 16, color = "#25D366" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12.031 2C6.496 2 2 6.496 2 12.031c0 1.956.559 3.864 1.621 5.526L2 22l4.61-1.583a9.98 9.98 0 0 0 5.421 1.614h.004c5.535 0 10.031-4.496 10.031-10.031 0-2.68-1.043-5.2-2.937-7.094A9.957 9.957 0 0 0 12.031 2zm5.82 14.28c-.244.686-1.42 1.309-1.958 1.353-.513.042-1.18.06-3.8-1.026-3.351-1.389-5.508-4.836-5.674-5.059-.167-.223-1.354-1.802-1.354-3.438 0-1.636.855-2.441 1.16-2.776.305-.335.666-.419.888-.419.223 0 .445.002.639.012.205.01.48-.078.75.57.278.667.946 2.308 1.029 2.476.084.167.14.363.028.586-.112.223-.167.363-.334.558-.167.195-.351.436-.502.585-.167.167-.341.349-.147.683.195.334.866 1.428 1.859 2.312 1.278 1.139 2.355 1.492 2.689 1.66.334.167.529.14.724-.084.195-.223.834-.974 1.057-1.308.223-.335.445-.279.75-.167.306.111 1.947.918 2.28 1.085.334.167.556.251.639.39.083.139.083.807-.161 1.493z" />
  </svg>
);

const ACTIVITY_TYPES = [
  { id: "call", label: "Call", icon: Phone },
  { id: "meeting", label: "Meeting", icon: Calendar },
  { id: "follow_up", label: "Follow-up", icon: Clock },
  { id: "email", label: "Email", icon: Mail },
  { id: "note", label: "Note", icon: FileText },
  { id: "whatsapp", label: "WhatsApp", icon: WhatsAppIcon }
];

const CALL_OUTCOMES = [
  { value: "interested", label: "☀️ Interested" },
  { value: "call_back", label: "📞 Call Back" },
  { value: "meeting_scheduled", label: "🤝 Meeting Scheduled" },
  { value: "no_answer", label: "📵 No Answer" },
  { value: "not_interested", label: "❌ Not Interested" },
  { value: "wrong_number", label: "⚠️ Wrong Number" }
];

const NEXT_ACTION_OPTIONS = [
  "Send Quotation",
  "Follow-up Call",
  "Send Product Brochure",
  "Schedule Technical Demo",
  "Contract Review",
  "Price Negotiation",
  "Order Confirmation"
];

export const LogActivityModal = ({
  isOpen,
  onClose,
  onSuccess,
  onActivityLogged,
  leadId,
  initialLeadId,
  leadTitle,
  initialLeadTitle,
  leadNumber,
  contactId,
  contactName,
  initialContactName,
  contactPhone,
  initialContactPhone,
  companyId,
  opportunityId,
  showToast
}) => {
  const [activityType, setActivityType] = useState("call");
  const [callOutcome, setCallOutcome] = useState("interested");
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(15);

  // Assigned Name & Staff
  const [assignedName, setAssignedName] = useState("");
  const [staffList, setStaffList] = useState([]);

  // Follow-up scheduling
  const [hasFollowUp, setHasFollowUp] = useState(true);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTime, setFollowUpTime] = useState("11:00 AM");
  const [nextAction, setNextAction] = useState("Send Quotation");
  const [priority, setPriority] = useState("Medium");
  const [createReminder, setCreateReminder] = useState(true);

  // Attachments
  const [attachments, setAttachments] = useState([]);
  const fileInputRef = useRef(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Compute effective lead and contact details from props
  const effectiveLeadId = leadId || initialLeadId;
  const effectiveLeadTitle = leadTitle || initialLeadTitle;
  const effectiveContactName = contactName || initialContactName;
  const effectiveContactPhone = contactPhone || initialContactPhone;

  useEffect(() => {
    let isMounted = true;

    const initializeForm = async () => {
      let fetchedStaff = [];
      try {
        const res = await staffService.getAllStaff();
        fetchedStaff = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        if (isMounted) {
          setStaffList(fetchedStaff);
        }
      } catch (err) {
        console.error("Could not fetch staff list:", err);
      }

      // Resolve logged-in staff member's name from token
      const currentToken = localStorage.getItem("token");
      let resolvedName = "";
      if (currentToken) {
        try {
          const decoded = safeDecodeJwt(currentToken);
          const currentEmail = decoded?.sub || decoded?.email;

          const matched = fetchedStaff.find(
            (s) => s.email && currentEmail && s.email.toLowerCase() === currentEmail.toLowerCase()
          );

          if (matched && matched.name) {
            resolvedName = matched.name;
          } else if (matched && matched.email) {
            resolvedName = matched.email.split("@")[0];
          } else if (currentEmail) {
            resolvedName = currentEmail.split("@")[0];
          }
        } catch (e) {
          console.error("Error resolving user name from token:", e);
        }
      }

      if (isMounted) {
        setAssignedName(resolvedName || (fetchedStaff[0]?.email ? fetchedStaff[0].email.split("@")[0] : "sale.jayesh"));
      }
    };

    if (isOpen) {
      setActivityType("call");
      setCallOutcome("interested");
      setSubject("Discussed pricing & technical specifications");
      setNotes("Client showed interest in Frame A4 (Black). Requested quotation with bulk pricing. Will share technical specs via email.");
      setDurationMinutes(15);
      setHasFollowUp(true);
      setFollowUpDate(getDefaultFollowUpDate());
      setFollowUpTime("11:00 AM");
      setNextAction("Send Quotation");
      setPriority("Medium");
      setCreateReminder(true);
      setAttachments([]);
      setError(null);
      initializeForm();
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  function getDefaultFollowUpDate() {
    const today = new Date();
    return today.toISOString().split("T")[0];
  }

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setAttachments((prev) => [...prev, ...files]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!subject.trim()) {
      setError("Please enter a subject for this activity");
      showToast?.("Subject is required", "error");
      return;
    }

    const cleanAssignedName = assignedName.trim();
    if (!cleanAssignedName) {
      setError("Please select or enter the Assigned Name");
      showToast?.("Assigned Name is required", "error");
      return;
    }

    if (hasFollowUp && !followUpDate) {
      setError("Please select a follow-up date");
      showToast?.("Follow-up date is required", "error");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const matchedStaff = staffList.find(
        (s) =>
          (s.name && s.name.toLowerCase() === cleanAssignedName.toLowerCase()) ||
          (s.email && s.email.toLowerCase().includes(cleanAssignedName.toLowerCase()))
      );
      const matchedStaffId = matchedStaff ? matchedStaff.id : undefined;

      let finalNotes = notes.trim();
      const metaInfo = [
        `[Assigned: ${cleanAssignedName}]`,
        hasFollowUp ? `[Next Action: ${nextAction}]` : null,
        hasFollowUp ? `[Priority: ${priority}]` : null,
        createReminder ? `[Reminder Scheduled]` : null
      ].filter(Boolean).join(" ");

      if (!finalNotes.includes("[Assigned:")) {
        finalNotes = finalNotes ? `${finalNotes}\n${metaInfo}` : metaInfo;
      }

      // Convert 11:00 AM to 11:00:00 format if needed
      let formattedTime = followUpTime;
      if (formattedTime.includes("AM") || formattedTime.includes("PM")) {
        const parts = formattedTime.trim().split(" ");
        const timePart = parts[0];
        const modifier = parts[1];
        let [hours, minutes] = timePart.split(":");
        if (hours === "12") hours = "00";
        if (modifier === "PM") hours = parseInt(hours, 10) + 12;
        formattedTime = `${String(hours).padStart(2, "0")}:${minutes || "00"}`;
      }

      const payload = {
        activityType,
        subject: subject.trim(),
        notes: finalNotes || undefined,
        durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : undefined,
        leadId: effectiveLeadId ? Number(effectiveLeadId) : undefined,
        companyId: companyId ? Number(companyId) : undefined,
        contactId: contactId ? Number(contactId) : undefined,
        opportunityId: opportunityId ? Number(opportunityId) : undefined,
        followUpDate: hasFollowUp && followUpDate ? followUpDate : undefined,
        followUpTime: hasFollowUp && formattedTime ? formattedTime : undefined,
        performedByAdminId: matchedStaffId ? Number(matchedStaffId) : undefined,
        assignedAdminId: matchedStaffId ? Number(matchedStaffId) : undefined,
        ownerAdminId: matchedStaffId ? Number(matchedStaffId) : undefined,
        assignedName: cleanAssignedName,
        priority: priority.toLowerCase()
      };

      if (activityType === "call") {
        payload.callOutcome = callOutcome;
      }

      await crmService.logActivity(payload);

      if (effectiveLeadId && matchedStaffId) {
        try {
          await crmService.bulkAssignLeads([Number(effectiveLeadId)], Number(matchedStaffId));
        } catch (syncErr) {
          console.warn("Could not synchronize lead owner admin:", syncErr);
        }
      }

      showToast?.("Activity logged successfully!", "success");
      onSuccess?.();
      onActivityLogged?.();
      onClose();
    } catch (err) {
      console.error("Error logging activity:", err);
      const msg = err.message || "Failed to log activity";
      setError(msg);
      showToast?.(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
        padding: "16px"
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "600px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header matching Image 2 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 24px",
            borderBottom: "1px solid #F1F5F9"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                backgroundColor: "#EFF6FF",
                color: "#2563EB",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Phone size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#0F172A" }}>
                Log Sales Activity
              </h3>
              <p style={{ margin: "3px 0 0 0", fontSize: "12px", color: "#64748B" }}>
                Record interaction, assign responsible staff member, and schedule follow-ups
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              background: "none",
              border: "none",
              color: "#94A3B8",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "6px"
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Lead & Contact info badge (if pre-selected) */}
        {(effectiveContactName || effectiveLeadTitle) && (
          <div
            style={{
              padding: "8px 24px",
              backgroundColor: "#F8FAFC",
              borderBottom: "1px solid #E2E8F0",
              fontSize: "12px",
              color: "#475569",
              display: "flex",
              flexWrap: "wrap",
              gap: "16px",
              alignItems: "center"
            }}
          >
            {effectiveContactName && (
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <User size={13} color="#64748B" />
                <span>
                  <strong>Contact:</strong> {effectiveContactName}
                  {effectiveContactPhone ? ` (${effectiveContactPhone})` : ""}
                </span>
              </div>
            )}
            {effectiveLeadTitle && (
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <Building size={13} color="#64748B" />
                <span>
                  <strong>Lead:</strong> {effectiveLeadTitle}
                  {leadNumber ? ` (${leadNumber})` : ""}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Scrollable Form Body */}
        <div style={{ overflowY: "auto", padding: "20px 24px", flex: 1 }}>
          {error && (
            <div
              style={{
                marginBottom: "16px",
                padding: "10px 14px",
                borderRadius: "8px",
                backgroundColor: "#FEF2F2",
                border: "1px solid #FECACA",
                color: "#991B1B",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <AlertCircle size={16} color="#DC2626" />
              <span>{error}</span>
            </div>
          )}

          <form id="log-activity-form" onSubmit={handleSubmit}>
            {/* 1. Activity Type Selector (6 types matching Image 2) */}
            <div style={{ marginBottom: "18px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#334155",
                  marginBottom: "8px"
                }}
              >
                Activity Type
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "8px" }}>
                {ACTIVITY_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = activityType === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setActivityType(type.id)}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "6px",
                        padding: "12px 4px",
                        borderRadius: "10px",
                        border: isSelected ? "2px solid #2563EB" : "1px solid #E2E8F0",
                        backgroundColor: isSelected ? "#F8FAFC" : "#ffffff",
                        color: isSelected ? "#2563EB" : "#475569",
                        fontSize: "12px",
                        fontWeight: isSelected ? 700 : 500,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        boxShadow: isSelected ? "0 1px 3px rgba(37, 99, 235, 0.1)" : "none"
                      }}
                    >
                      <Icon size={18} color={isSelected ? "#2563EB" : type.id === "whatsapp" ? "#25D366" : "#64748B"} />
                      <span>{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Assigned Name * & Call Outcome */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
              {/* Assigned Name */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#334155",
                    marginBottom: "6px"
                  }}
                >
                  Assigned Name <span style={{ color: "#EF4444" }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <User size={15} color="#64748B" style={{ position: "absolute", left: "12px", top: "11px" }} />
                  <select
                    value={assignedName}
                    onChange={(e) => setAssignedName(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "9px 12px 9px 34px",
                      borderRadius: "8px",
                      border: "1px solid #CBD5E1",
                      fontSize: "13px",
                      backgroundColor: "#ffffff",
                      color: "#0F172A",
                      boxSizing: "border-box",
                      cursor: "pointer"
                    }}
                  >
                    {staffList.map((s) => (
                      <option key={s.id} value={s.email ? s.email.split("@")[0] : s.name}>
                        {s.email ? s.email.split("@")[0] : s.name}
                      </option>
                    ))}
                    {staffList.length === 0 && (
                      <option value="sale.jayesh">sale.jayesh</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Call Outcome */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#334155",
                    marginBottom: "6px"
                  }}
                >
                  Call Outcome <span style={{ color: "#EF4444" }}>*</span>
                </label>
                <select
                  value={callOutcome}
                  onChange={(e) => setCallOutcome(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #CBD5E1",
                    fontSize: "13px",
                    backgroundColor: "#ffffff",
                    color: "#0F172A",
                    boxSizing: "border-box",
                    cursor: "pointer"
                  }}
                >
                  {CALL_OUTCOMES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 3. Subject * & Duration (Minutes) */}
            <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr", gap: "14px", marginBottom: "16px" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#334155",
                    marginBottom: "6px"
                  }}
                >
                  Subject <span style={{ color: "#EF4444" }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Discussed pricing & technical specifications"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #CBD5E1",
                    fontSize: "13px",
                    backgroundColor: "#ffffff",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#334155",
                    marginBottom: "6px"
                  }}
                >
                  Duration (Minutes) <span style={{ color: "#EF4444" }}>*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="15"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #CBD5E1",
                    fontSize: "13px",
                    backgroundColor: "#ffffff",
                    boxSizing: "border-box"
                  }}
                />
              </div>
            </div>

            {/* 4. Discussion Summary / Notes */}
            <div style={{ marginBottom: "18px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#334155",
                  marginBottom: "6px"
                }}
              >
                Discussion Summary / Notes
              </label>
              <textarea
                rows={3}
                maxLength={1000}
                placeholder="Enter discussion notes, specific customer requirements, objections, or commitments..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  fontSize: "13px",
                  backgroundColor: "#ffffff",
                  boxSizing: "border-box",
                  resize: "vertical",
                  fontFamily: "inherit"
                }}
              />
              <div style={{ textAlign: "right", fontSize: "11px", color: "#94A3B8", marginTop: "3px" }}>
                {notes.length}/1000
              </div>
            </div>

            {/* 5. Schedule Next Follow-Up (Matching Image 2) */}
            <div
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #E2E8F0",
                borderRadius: "12px",
                padding: "16px",
                marginBottom: "16px"
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#1E293B",
                  cursor: "pointer",
                  userSelect: "none"
                }}
              >
                <input
                  type="checkbox"
                  checked={hasFollowUp}
                  onChange={(e) => setHasFollowUp(e.target.checked)}
                  style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#2563EB" }}
                />
                <span>Schedule Next Follow-Up</span>
              </label>

              {hasFollowUp && (
                <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "12px" }}>
                  {/* Row 1: Date & Time */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#475569",
                          marginBottom: "5px"
                        }}
                      >
                        Follow-Up Date <span style={{ color: "#EF4444" }}>*</span>
                      </label>
                      <input
                        type="date"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        required={hasFollowUp}
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          borderRadius: "8px",
                          border: "1px solid #CBD5E1",
                          fontSize: "13px",
                          backgroundColor: "#ffffff",
                          boxSizing: "border-box"
                        }}
                      />
                    </div>

                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#475569",
                          marginBottom: "5px"
                        }}
                      >
                        Follow-Up Time <span style={{ color: "#EF4444" }}>*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="11:00 AM"
                        value={followUpTime}
                        onChange={(e) => setFollowUpTime(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          borderRadius: "8px",
                          border: "1px solid #CBD5E1",
                          fontSize: "13px",
                          backgroundColor: "#ffffff",
                          boxSizing: "border-box"
                        }}
                      />
                    </div>
                  </div>

                  {/* Row 2: Next Action & Priority */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#475569",
                          marginBottom: "5px"
                        }}
                      >
                        Next Action <span style={{ color: "#EF4444" }}>*</span>
                      </label>
                      <select
                        value={nextAction}
                        onChange={(e) => setNextAction(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          borderRadius: "8px",
                          border: "1px solid #CBD5E1",
                          fontSize: "13px",
                          backgroundColor: "#ffffff",
                          boxSizing: "border-box"
                        }}
                      >
                        {NEXT_ACTION_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#475569",
                          marginBottom: "5px"
                        }}
                      >
                        Priority
                      </label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          borderRadius: "8px",
                          border: "1px solid #CBD5E1",
                          fontSize: "13px",
                          backgroundColor: "#ffffff",
                          boxSizing: "border-box"
                        }}
                      >
                        <option value="High">🔴 High</option>
                        <option value="Medium">🟡 Medium</option>
                        <option value="Low">⚪ Low</option>
                      </select>
                    </div>
                  </div>

                  {/* Checkbox: Create reminder */}
                  <div style={{ marginTop: "2px" }}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "8px",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#334155",
                        cursor: "pointer"
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={createReminder}
                        onChange={(e) => setCreateReminder(e.target.checked)}
                        style={{ marginTop: "2px", accentColor: "#2563EB", cursor: "pointer" }}
                      />
                      <div>
                        <span>Create reminder for assigned executive</span>
                        <div style={{ fontSize: "11px", fontWeight: 400, color: "#64748B", marginTop: "1px" }}>
                          A reminder will be created for the selected date and time.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* 6. Attachments (Optional) (Matching Image 2) */}
            <div
              style={{
                backgroundColor: "#ffffff",
                border: "1px dashed #CBD5E1",
                borderRadius: "12px",
                padding: "16px",
                marginBottom: "8px"
              }}
            >
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#1E293B", marginBottom: "10px" }}>
                Attachments (Optional)
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  backgroundColor: "#F8FAFC",
                  border: "1px solid #F1F5F9"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      backgroundColor: "#EFF6FF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#2563EB"
                    }}
                  >
                    <Paperclip size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "#1E293B" }}>
                      Click to upload files or drag & drop
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748B" }}>
                      PDF, Images, Excel, Word (Max 10 MB each)
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: "11px", color: "#94A3B8" }}>
                  {attachments.length} files attached
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Modal Footer Actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "10px",
            padding: "16px 24px",
            borderTop: "1px solid #F1F5F9",
            backgroundColor: "#ffffff"
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              padding: "9px 18px",
              borderRadius: "8px",
              border: "1px solid #CBD5E1",
              backgroundColor: "#ffffff",
              color: "#475569",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="log-activity-form"
            disabled={submitting}
            style={{
              padding: "9px 22px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "#2563EB",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 600,
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)"
            }}
          >
            {submitting ? "Saving..." : "Save Activity"}
          </button>
        </div>
      </div>
    </div>
  );
};
