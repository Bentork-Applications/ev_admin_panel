import React, { useState, useEffect } from "react";
import { X, CheckCircle2 } from "lucide-react";
import { crmService } from "../../services/crmService";

const OUTCOME_OPTIONS = [
  { value: "interested", label: "🌟 Interested" },
  { value: "meeting_scheduled", label: "🤝 Meeting Scheduled" },
  { value: "call_back", label: "📞 Call Back Needed" },
  { value: "no_answer", label: "📵 No Answer" },
  { value: "not_interested", label: "❌ Not Interested" },
  { value: "wrong_number", label: "⚠️ Wrong Number" }
];

export const CompleteActivityModal = ({ activity, isOpen, onClose, onSuccess, showToast }) => {
  const [notes, setNotes] = useState("");
  const [outcome, setOutcome] = useState("interested");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (activity) {
      setNotes("");
      setOutcome(activity.callOutcome || "interested");
      setError(null);
    }
  }, [activity, isOpen]);

  if (!isOpen || !activity) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      await crmService.completeActivity(activity.id, {
        notes: notes.trim() || undefined,
        outcome: activity.activityType === "call" ? outcome : undefined
      });
      showToast?.("Activity marked as completed", "success");
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Complete activity error:", err);
      const msg = err.message || "Failed to mark activity as completed";
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
        backgroundColor: "rgba(15, 23, 42, 0.5)",
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
          borderRadius: "14px",
          width: "100%",
          maxWidth: "460px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.15)",
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
            padding: "18px 22px",
            borderBottom: "1px solid #F1F5F9"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                backgroundColor: "#DCFCE7",
                color: "#16A34A",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <CheckCircle2 size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
                Complete Activity
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748B" }}>
                Record completion notes and resolution
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
              padding: "4px"
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Task Brief */}
        <div
          style={{
            padding: "12px 22px",
            backgroundColor: "#F8FAFC",
            borderBottom: "1px solid #E2E8F0",
            fontSize: "12px",
            color: "#475569"
          }}
        >
          <div style={{ fontWeight: 600, color: "#1E293B", marginBottom: "3px" }}>
            {activity.subject}
          </div>
          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", fontSize: "11px", color: "#64748B" }}>
            {activity.contactName && <span>Contact: <strong>{activity.contactName}</strong></span>}
            {activity.leadTitle && <span>Lead: <strong>{activity.leadTitle}</strong></span>}
            <span>Assigned: <strong>{activity.performedByAdminName || "Unassigned"}</strong></span>
          </div>
        </div>

        {error && (
          <div
            style={{
              margin: "14px 22px 0",
              padding: "10px 14px",
              borderRadius: "8px",
              backgroundColor: "#FEF2F2",
              border: "1px solid #FECACA",
              color: "#991B1B",
              fontSize: "12px"
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ padding: "18px 22px" }}>
          {/* If call, final outcome */}
          {activity.activityType === "call" && (
            <div style={{ marginBottom: "14px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#334155",
                  marginBottom: "5px"
                }}
              >
                Final Call Outcome
              </label>
              <select
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  fontSize: "13px",
                  backgroundColor: "#ffffff",
                  boxSizing: "border-box"
                }}
              >
                {OUTCOME_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Completion Notes */}
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: 600,
                color: "#334155",
                marginBottom: "5px"
              }}
            >
              Completion Notes / Resolution Summary
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Spoke with client, confirmed next step or concluded discussion..."
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

          {/* Action Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: "8px 16px",
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
              disabled={submitting}
              style={{
                padding: "8px 18px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "#16A34A",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 600,
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.7 : 1
              }}
            >
              {submitting ? "Completing..." : "Mark Completed"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
