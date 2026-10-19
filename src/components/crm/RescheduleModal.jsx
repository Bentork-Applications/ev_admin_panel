import React, { useState, useEffect } from "react";
import { X, Calendar, Clock, RefreshCw } from "lucide-react";
import { crmService } from "../../services/crmService";

export const RescheduleModal = ({ activity, isOpen, onClose, onSuccess, showToast }) => {
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("11:00");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (activity) {
      setNewDate(activity.followUpDate || getDefaultDate());
      setNewTime(
        activity.followUpTime
          ? String(activity.followUpTime).substring(0, 5)
          : "11:00"
      );
      setReason("");
      setError(null);
    }
  }, [activity, isOpen]);

  if (!isOpen || !activity) return null;

  function getDefaultDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newDate) {
      setError("Please select a new follow-up date");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await crmService.rescheduleActivity(activity.id, {
        newFollowUpDate: newDate,
        newFollowUpTime: newTime || undefined,
        reason: reason.trim() || undefined
      });
      showToast?.("Follow-up rescheduled successfully", "success");
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Reschedule error:", err);
      const msg = err.message || "Failed to reschedule follow-up";
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
                backgroundColor: "#EFF6FF",
                color: "#2563EB",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <RefreshCw size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
                Reschedule Follow-up
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748B" }}>
                Adjust target follow-up date and time
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
            {activity.followUpDate && <span>Current: <strong>{activity.followUpDate} {activity.followUpTime || ""}</strong></span>}
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
          {/* New Date & Time */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#334155",
                  marginBottom: "5px"
                }}
              >
                New Date *
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #CBD5E1",
                    fontSize: "13px",
                    boxSizing: "border-box"
                  }}
                />
              </div>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#334155",
                  marginBottom: "5px"
                }}
              >
                New Time
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #CBD5E1",
                    fontSize: "13px",
                    boxSizing: "border-box"
                  }}
                />
              </div>
            </div>
          </div>

          {/* Reason */}
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
              Reschedule Reason / Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Client requested callback after 3 PM"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "1px solid #CBD5E1",
                fontSize: "13px",
                boxSizing: "border-box"
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
                backgroundColor: "#2563EB",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 600,
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.7 : 1
              }}
            >
              {submitting ? "Rescheduling..." : "Confirm Reschedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
