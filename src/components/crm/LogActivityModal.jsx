import React, { useState } from "react";
import { X, Phone, Calendar, Mail, Clock, FileText, CheckCircle2 } from "lucide-react";
import { crmService } from "../../services/crmService";

const ACTIVITY_TYPES = [
  { id: "call", label: "Call", icon: Phone },
  { id: "meeting", label: "Meeting", icon: Calendar },
  { id: "email", label: "Email", icon: Mail },
  { id: "follow_up", label: "Follow-up", icon: Clock },
  { id: "note", label: "Note", icon: FileText }
];

const CALL_OUTCOMES = [
  "Interested",
  "Call Back",
  "No Answer",
  "Not Interested",
  "Meeting Scheduled",
  "Wrong Number"
];

export const LogActivityModal = ({
  isOpen,
  onClose,
  leadId,
  companyId,
  contactId,
  opportunityId,
  onActivityLogged,
  showToast
}) => {
  const [activityType, setActivityType] = useState("call");
  const [callOutcome, setCallOutcome] = useState("Interested");
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(10);
  const [followUpDate, setFollowUpDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!notes.trim()) {
      showToast?.("Please enter notes for the activity", "error");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        activityType,
        subject: subject.trim() || `${activityType.toUpperCase()} Log`,
        notes: notes.trim(),
        durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : null,
        followUpDate: followUpDate || null,
        leadId: leadId ? Number(leadId) : null,
        companyId: companyId ? Number(companyId) : null,
        contactId: contactId ? Number(contactId) : null,
        opportunityId: opportunityId ? Number(opportunityId) : null
      };

      if (activityType === "call") {
        payload.callOutcome = callOutcome;
      }

      await crmService.logActivity(payload);
      showToast?.("Activity logged successfully", "success");
      onActivityLogged?.();
      onClose();
    } catch (err) {
      console.error("Error logging activity:", err);
      showToast?.(err.message || "Failed to log activity", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(4px)",
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
          maxWidth: "520px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
          animation: "modalFadeIn 0.2s ease-out"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px",
            borderBottom: "1px solid #F3F4F6"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                backgroundColor: "#ECFDF5",
                color: "#10B981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#111827" }}>
                Log CRM Activity
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#6B7280" }}>
                Record communication, meeting notes, or follow-ups
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#9CA3AF",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "6px"
            }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "20px 24px" }}>
          {/* Activity Type Selector */}
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 600,
                color: "#374151",
                marginBottom: "8px"
              }}
            >
              Activity Type
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "6px" }}>
              {ACTIVITY_TYPES.map((type) => {
                const IconComponent = type.icon;
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
                      gap: "4px",
                      padding: "10px 4px",
                      borderRadius: "8px",
                      border: isSelected ? "1.5px solid #10B981" : "1px solid #E5E7EB",
                      backgroundColor: isSelected ? "#ECFDF5" : "#FAFAFA",
                      color: isSelected ? "#065F46" : "#4B5563",
                      fontSize: "11px",
                      fontWeight: isSelected ? 600 : 500,
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <IconComponent size={16} />
                    <span>{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Call Outcome if Call */}
          {activityType === "call" && (
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: "6px"
                }}
              >
                Call Outcome *
              </label>
              <select
                value={callOutcome}
                onChange={(e) => setCallOutcome(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #D1D5DB",
                  fontSize: "13px",
                  backgroundColor: "#ffffff",
                  color: "#111827",
                  outline: "none"
                }}
              >
                {CALL_OUTCOMES.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Subject */}
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 600,
                color: "#374151",
                marginBottom: "6px"
              }}
            >
              Subject / Topic
            </label>
            <input
              type="text"
              placeholder="e.g. Discussed battery specs & pricing"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "1px solid #D1D5DB",
                fontSize: "13px",
                backgroundColor: "#ffffff",
                boxSizing: "border-box"
              }}
            />
          </div>

          {/* Notes */}
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 600,
                color: "#374151",
                marginBottom: "6px"
              }}
            >
              Notes & Discussion Details *
            </label>
            <textarea
              rows={3}
              placeholder="Enter activity summary, client feedback, or agreed action items..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "1px solid #D1D5DB",
                fontSize: "13px",
                backgroundColor: "#ffffff",
                boxSizing: "border-box",
                resize: "vertical"
              }}
            />
          </div>

          {/* Duration & Follow-up Row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: "4px"
                }}
              >
                Duration (minutes)
              </label>
              <input
                type="number"
                min="1"
                placeholder="10"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #D1D5DB",
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
                  color: "#374151",
                  marginBottom: "4px"
                }}
              >
                Next Follow-up Date
              </label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #D1D5DB",
                  fontSize: "13px",
                  backgroundColor: "#ffffff",
                  boxSizing: "border-box"
                }}
              />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: "9px 16px",
                borderRadius: "8px",
                border: "1px solid #D1D5DB",
                backgroundColor: "#ffffff",
                color: "#374151",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "9px 20px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "#10B981",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 600,
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.7 : 1,
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              {submitting ? "Saving..." : "Log Activity"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
