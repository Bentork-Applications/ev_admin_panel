import React, { useState, useEffect } from "react";
import {
  X,
  Calendar,
  Clock,
  Phone,
  Mail,
  FileText,
  CheckCircle2,
  AlertTriangle,
  User,
  Building,
  RefreshCw,
  History,
  Tag
} from "lucide-react";
import { crmService } from "../../services/crmService";

export const ActivityDetailModal = ({
  activity,
  isOpen,
  onClose,
  onReschedule,
  onComplete,
  onRefresh
}) => {
  void onRefresh;
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (activity && activity.leadId && isOpen) {
      setLoadingHistory(true);
      crmService
        .getActivitiesForLead(activity.leadId)
        .then((res) => {
          if (isMounted) {
            setHistoryList(Array.isArray(res) ? res : []);
          }
        })
        .catch((err) => {
          console.error("Failed to load lead activity history:", err);
        })
        .finally(() => {
          if (isMounted) setLoadingHistory(false);
        });
    } else {
      setHistoryList([]);
    }

    return () => {
      isMounted = false;
    };
  }, [activity, isOpen]);

  if (!isOpen || !activity) return null;

  const isCompleted = activity.status === "completed";
  const isOverdue =
    activity.isOverdue ||
    (!isCompleted &&
      activity.followUpDate &&
      new Date(activity.followUpDate) < new Date(new Date().toDateString()));

  // Extract assigned name: either from performedByAdminName or from [Assigned: ...] note tag
  const assignedDisplay =
    activity.performedByAdminName ||
    (activity.notes && activity.notes.match(/\[Assigned:\s*([^\]]+)\]/i)?.[1]) ||
    "Unassigned";

  // Activity type icon & badge
  let typeLabel = activity.activityType || "Activity";
  let TypeIcon = Phone;
  let typeBg = "#EFF6FF";
  let typeColor = "#1D4ED8";

  if (activity.activityType === "meeting") {
    TypeIcon = Calendar;
    typeBg = "#F5F3FF";
    typeColor = "#7C3AED";
    typeLabel = "Meeting";
  } else if (activity.activityType === "follow_up") {
    TypeIcon = Clock;
    typeBg = "#FEF3C7";
    typeColor = "#B45309";
    typeLabel = "Follow-up";
  } else if (activity.activityType === "email") {
    TypeIcon = Mail;
    typeBg = "#ECFDF5";
    typeColor = "#047857";
    typeLabel = "Email";
  } else if (activity.activityType === "note") {
    TypeIcon = FileText;
    typeBg = "#F8FAFC";
    typeColor = "#64748B";
    typeLabel = "Note";
  } else {
    typeLabel = "Call";
  }

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
          maxWidth: "640px",
          maxHeight: "90vh",
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
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                backgroundColor: typeBg,
                color: typeColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <TypeIcon size={20} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#0F172A" }}>
                  {activity.subject || `${typeLabel} Details`}
                </h3>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: "6px",
                    backgroundColor: typeBg,
                    color: typeColor
                  }}
                >
                  {typeLabel}
                </span>
              </div>
              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748B" }}>
                Activity Record & Associated History
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
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

        {/* Scrollable Content */}
        <div style={{ overflowY: "auto", padding: "20px 24px", flex: 1 }}>
          {/* Key Overview Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "12px",
              marginBottom: "20px"
            }}
          >
            {/* Status Card */}
            <div
              style={{
                backgroundColor: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "10px",
                padding: "12px"
              }}
            >
              <div style={{ fontSize: "11px", color: "#64748B", fontWeight: 600, textTransform: "uppercase" }}>
                Status
              </div>
              <div style={{ marginTop: "4px" }}>
                {isCompleted ? (
                  <span
                    style={{
                      display: "inline-block",
                      padding: "3px 9px",
                      borderRadius: "12px",
                      fontSize: "11px",
                      fontWeight: 700,
                      backgroundColor: "#DCFCE7",
                      color: "#15803D"
                    }}
                  >
                    ✅ Completed
                  </span>
                ) : isOverdue ? (
                  <span
                    style={{
                      display: "inline-block",
                      padding: "3px 9px",
                      borderRadius: "12px",
                      fontSize: "11px",
                      fontWeight: 700,
                      backgroundColor: "#FEE2E2",
                      color: "#B91C1C"
                    }}
                  >
                    ⚠️ Overdue
                  </span>
                ) : (
                  <span
                    style={{
                      display: "inline-block",
                      padding: "3px 9px",
                      borderRadius: "12px",
                      fontSize: "11px",
                      fontWeight: 700,
                      backgroundColor: "#FEF3C7",
                      color: "#B45309"
                    }}
                  >
                    ⏳ Pending
                  </span>
                )}
              </div>
            </div>

            {/* Assigned Name Card */}
            <div
              style={{
                backgroundColor: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "10px",
                padding: "12px"
              }}
            >
              <div style={{ fontSize: "11px", color: "#64748B", fontWeight: 600, textTransform: "uppercase" }}>
                Assigned Name
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  marginTop: "4px",
                  fontWeight: 600,
                  fontSize: "13px",
                  color: "#1E293B"
                }}
              >
                <User size={14} color="#2563EB" />
                <span title={assignedDisplay}>{assignedDisplay}</span>
              </div>
            </div>

            {/* Scheduled Follow-Up */}
            <div
              style={{
                backgroundColor: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "10px",
                padding: "12px"
              }}
            >
              <div style={{ fontSize: "11px", color: "#64748B", fontWeight: 600, textTransform: "uppercase" }}>
                Follow-up Schedule
              </div>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#1E293B", marginTop: "4px" }}>
                {activity.followUpDate ? (
                  <span>
                    📅 {activity.followUpDate}{" "}
                    {activity.followUpTime ? `@ ${String(activity.followUpTime).substring(0, 5)}` : ""}
                  </span>
                ) : (
                  <span style={{ color: "#94A3B8" }}>None Scheduled</span>
                )}
              </div>
            </div>
          </div>

          {/* Contact / Lead Banner */}
          {(activity.contactName || activity.leadTitle) && (
            <div
              style={{
                padding: "12px 16px",
                backgroundColor: "#EFF6FF",
                border: "1px solid #BFDBFE",
                borderRadius: "10px",
                marginBottom: "18px",
                fontSize: "12px",
                display: "flex",
                flexWrap: "wrap",
                gap: "16px",
                alignItems: "center"
              }}
            >
              {activity.contactName && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <User size={14} color="#1D4ED8" />
                  <span>
                    <strong>Contact:</strong> {activity.contactName}
                    {activity.contactPhone && (
                      <a
                        href={`tel:${activity.contactPhone}`}
                        style={{ marginLeft: "6px", color: "#2563EB", textDecoration: "none", fontWeight: 600 }}
                      >
                        📞 {activity.contactPhone}
                      </a>
                    )}
                  </span>
                </div>
              )}

              {activity.leadTitle && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Building size={14} color="#1D4ED8" />
                  <span>
                    <strong>Lead:</strong> {activity.leadTitle}{" "}
                    {activity.leadNumber ? `(${activity.leadNumber})` : ""}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Outcome & Duration */}
          <div style={{ display: "flex", gap: "20px", marginBottom: "16px", fontSize: "13px" }}>
            {activity.callOutcome && (
              <div>
                <span style={{ color: "#64748B" }}>Call Outcome: </span>
                <span
                  style={{
                    fontWeight: 600,
                    textTransform: "capitalize",
                    backgroundColor: "#F1F5F9",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    color: "#334155"
                  }}
                >
                  {activity.callOutcome.replace(/_/g, " ")}
                </span>
              </div>
            )}
            {activity.durationMinutes && (
              <div>
                <span style={{ color: "#64748B" }}>Duration: </span>
                <strong>{activity.durationMinutes} mins</strong>
              </div>
            )}
            {activity.activityDate && (
              <div>
                <span style={{ color: "#64748B" }}>Activity Date: </span>
                <strong>{new Date(activity.activityDate).toLocaleString()}</strong>
              </div>
            )}
          </div>

          {/* Notes */}
          <div style={{ marginBottom: "22px" }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
              Discussion Summary / Notes
            </div>
            <div
              style={{
                padding: "12px 14px",
                backgroundColor: "#FAFAFA",
                border: "1px solid #E2E8F0",
                borderRadius: "8px",
                fontSize: "13px",
                color: "#1E293B",
                whiteSpace: "pre-wrap",
                lineHeight: "1.5"
              }}
            >
              {activity.notes || <span style={{ color: "#94A3B8" }}>No notes recorded for this interaction.</span>}
            </div>
          </div>

          {/* Related Lead Activity History Timeline */}
          {activity.leadId && (
            <div style={{ marginTop: "24px", paddingTop: "18px", borderTop: "1px solid #E2E8F0" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "12px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <History size={16} color="#2563EB" />
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>
                    Lead Activity History ({historyList.length})
                  </span>
                </div>
                {loadingHistory && <span style={{ fontSize: "11px", color: "#64748B" }}>Loading history...</span>}
              </div>

              {historyList.length === 0 && !loadingHistory ? (
                <div style={{ fontSize: "12px", color: "#94A3B8", fontStyle: "italic" }}>
                  No prior activity history found for this lead.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {historyList.map((hist) => {
                    const isCurrent = hist.id === activity.id;
                    return (
                      <div
                        key={hist.id}
                        style={{
                          padding: "10px 12px",
                          borderRadius: "8px",
                          border: isCurrent ? "1.5px solid #2563EB" : "1px solid #E2E8F0",
                          backgroundColor: isCurrent ? "#EFF6FF" : "#F8FAFC",
                          fontSize: "12px"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                          <span style={{ fontWeight: 600, color: "#0F172A" }}>
                            {hist.activityType?.toUpperCase()}: {hist.subject}
                          </span>
                          <span style={{ color: "#64748B", fontSize: "11px" }}>
                            {hist.activityDate ? new Date(hist.activityDate).toLocaleDateString() : ""}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: "12px", color: "#64748B", fontSize: "11px" }}>
                          <span>Assigned: <strong>{hist.performedByAdminName || "Unassigned"}</strong></span>
                          {hist.callOutcome && <span>Outcome: {hist.callOutcome}</span>}
                          <span>Status: <strong>{hist.status}</strong></span>
                        </div>
                        {hist.notes && (
                          <div style={{ marginTop: "4px", color: "#334155", fontSize: "11px" }}>
                            {hist.notes}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 24px",
            borderTop: "1px solid #F1F5F9",
            backgroundColor: "#FAFAFA"
          }}
        >
          <button
            type="button"
            onClick={onClose}
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
            Close
          </button>

          {!isCompleted && (
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onReschedule?.(activity);
                }}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  backgroundColor: "#ffffff",
                  color: "#1E293B",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <Clock size={14} />
                <span>Reschedule</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onComplete?.(activity);
                }}
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "#16A34A",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <CheckCircle2 size={14} />
                <span>Mark Done</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
