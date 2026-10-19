import React, { useState, useEffect } from "react";
import {
  X,
  Phone,
  Calendar,
  Mail,
  Clock,
  FileText,
  CheckCircle2,
  User,
  Building,
  AlertCircle
} from "lucide-react";
import { crmService } from "../../services/crmService";
import { staffService } from "../../services/staffService";
import { safeDecodeJwt } from "../../utils/jwtUtils";

const ACTIVITY_TYPES = [
  { id: "call", label: "Call", icon: Phone },
  { id: "meeting", label: "Meeting", icon: Calendar },
  { id: "follow_up", label: "Follow-up", icon: Clock },
  { id: "email", label: "Email", icon: Mail },
  { id: "note", label: "Note", icon: FileText }
];

const CALL_OUTCOMES = [
  { value: "interested", label: "🌟 Interested" },
  { value: "call_back", label: "📞 Call Back Requested" },
  { value: "meeting_scheduled", label: "🤝 Meeting Scheduled" },
  { value: "no_answer", label: "📵 No Answer / Busy" },
  { value: "not_interested", label: "❌ Not Interested" },
  { value: "wrong_number", label: "⚠️ Wrong Number" }
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

  // Assigned Name (Text Input)
  const [assignedName, setAssignedName] = useState("");
  const [staffList, setStaffList] = useState([]);

  // Follow-up scheduling
  const [hasFollowUp, setHasFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTime, setFollowUpTime] = useState("11:00");

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
      // 1. Fetch available staff list to cross-reference ID by name
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

      // 2. Resolve logged-in staff member's name from existing token/auth
      const currentToken = localStorage.getItem("token");
      let resolvedName = "";
      if (currentToken) {
        try {
          const decoded = safeDecodeJwt(currentToken);
          const currentEmail = decoded?.sub || decoded?.email;

          // Match email against staff list for actual name
          const matched = fetchedStaff.find(
            (s) => s.email && currentEmail && s.email.toLowerCase() === currentEmail.toLowerCase()
          );

          if (matched && matched.name) {
            resolvedName = matched.name;
          } else if (decoded?.name && decoded.name !== "Admin") {
            resolvedName = decoded.name;
          } else if (currentEmail) {
            resolvedName = currentEmail.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
          }
        } catch (e) {
          console.error("Error resolving user name from token:", e);
        }
      }

      if (isMounted) {
        setAssignedName(resolvedName || "Sales Executive");
      }
    };

    if (isOpen) {
      setActivityType("call");
      setCallOutcome("interested");
      setSubject("");
      setNotes("");
      setDurationMinutes(15);
      setHasFollowUp(false);
      setFollowUpDate(getDefaultFollowUpDate());
      setFollowUpTime("11:00");
      setError(null);
      initializeForm();
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  function getDefaultFollowUpDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Validation: Subject required
    if (!subject.trim()) {
      setError("Please enter a subject for this activity");
      showToast?.("Subject is required", "error");
      return;
    }

    // 2. Validation: Assigned Name required
    const cleanAssignedName = assignedName.trim();
    if (!cleanAssignedName) {
      setError("Please enter the Assigned Name");
      showToast?.("Assigned Name is required", "error");
      return;
    }

    // 3. Validation: Follow-up date if enabled
    if (hasFollowUp) {
      if (!followUpDate) {
        setError("Please select a follow-up date");
        showToast?.("Follow-up date is required", "error");
        return;
      }

      // Check if date is in the past
      const todayStr = new Date().toISOString().split("T")[0];
      if (followUpDate < todayStr) {
        setError("Follow-up date cannot be in the past");
        showToast?.("Follow-up date cannot be in the past", "error");
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      // Find matching staff ID if typed name matches a registered admin
      const matchedStaff = staffList.find(
        (s) =>
          (s.name && s.name.toLowerCase() === cleanAssignedName.toLowerCase()) ||
          (s.email && s.email.toLowerCase() === cleanAssignedName.toLowerCase())
      );
      const matchedStaffId = matchedStaff ? matchedStaff.id : undefined;

      // Ensure assignment name is recorded in notes
      let finalNotes = notes.trim();
      const assignAudit = `[Assigned: ${cleanAssignedName}]`;
      if (!finalNotes.includes("[Assigned:")) {
        finalNotes = finalNotes ? `${finalNotes}\n${assignAudit}` : assignAudit;
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
        followUpTime: hasFollowUp && followUpTime ? followUpTime : undefined,
        // Send assigned name and mapped staff ID in backend-supported fields
        performedByAdminId: matchedStaffId ? Number(matchedStaffId) : undefined,
        assignedAdminId: matchedStaffId ? Number(matchedStaffId) : undefined,
        ownerAdminId: matchedStaffId ? Number(matchedStaffId) : undefined,
        assignedName: cleanAssignedName
      };

      if (activityType === "call") {
        payload.callOutcome = callOutcome;
      }

      await crmService.logActivity(payload);

      // If associated with a Lead and staff ID is matched, synchronize the lead's owner
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
          maxWidth: "580px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 24px",
            borderBottom: "1px solid #F1F5F9"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                backgroundColor: "#EFF6FF",
                color: "#2563EB",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#0F172A" }}>
                Log Sales Activity
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748B" }}>
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

        {/* Lead & Contact Banner (if available) */}
        {(effectiveContactName || effectiveLeadTitle) && (
          <div
            style={{
              padding: "10px 24px",
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
            {/* Interaction Type Selector */}
            <div style={{ marginBottom: "16px" }}>
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
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px" }}>
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
                        gap: "5px",
                        padding: "10px 4px",
                        borderRadius: "10px",
                        border: isSelected ? "2px solid #2563EB" : "1px solid #E2E8F0",
                        backgroundColor: isSelected ? "#EFF6FF" : "#FAFAFA",
                        color: isSelected ? "#1D4ED8" : "#475569",
                        fontSize: "12px",
                        fontWeight: isSelected ? 700 : 500,
                        cursor: "pointer",
                        transition: "all 0.15s ease"
                      }}
                    >
                      <Icon size={16} />
                      <span>{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Assigned Name * (Text Input Only) & Call Outcome */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: activityType === "call" ? "1fr 1fr" : "1fr",
                gap: "12px",
                marginBottom: "16px"
              }}
            >
              {/* Assigned Name * - Text Input */}
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
                  <User size={15} color="#94A3B8" style={{ position: "absolute", left: "12px", top: "11px" }} />
                  <input
                    type="text"
                    placeholder="Enter staff member's name"
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
                      boxSizing: "border-box"
                    }}
                  />
                </div>
              </div>

              {/* Call Outcome (Conditional: only visible when Type === "call") */}
              {activityType === "call" && (
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
                    Call Outcome
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
                      boxSizing: "border-box"
                    }}
                  >
                    {CALL_OUTCOMES.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Subject (required) & Duration */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px", marginBottom: "16px" }}>
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
                  placeholder="e.g. Discussed pricing & technical specs"
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
                  Duration (min)
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

            {/* Discussion Summary / Notes */}
            <div style={{ marginBottom: "16px" }}>
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
                placeholder="Client agreed to preliminary quotation. Requested revision on payment terms..."
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
                  resize: "vertical"
                }}
              />
            </div>

            {/* Schedule Next Follow-up Section */}
            <div
              style={{
                backgroundColor: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "12px",
                padding: "16px",
                marginBottom: "8px"
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
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
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                    marginTop: "14px",
                    paddingTop: "12px",
                    borderTop: "1px dashed #CBD5E1"
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#475569",
                        marginBottom: "4px"
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
                        marginBottom: "4px"
                      }}
                    >
                      Follow-Up Time (HH:mm)
                    </label>
                    <input
                      type="time"
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
              )}
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
