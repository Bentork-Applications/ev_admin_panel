import React, { useState } from "react";
import { Plus, Phone, Calendar, Mail, Clock, FileText, User } from "lucide-react";
import { ActivityTypeBadge } from "./CrmBadge";
import { LogActivityModal } from "./LogActivityModal";

export const ActivityTimeline = ({
  activities = [],
  leadId,
  companyId,
  contactId,
  opportunityId,
  onRefresh,
  showToast,
  emptyMessage = "No activities recorded yet."
}) => {
  const [showLogModal, setShowLogModal] = useState(false);

  const getActivityIcon = (type) => {
    const t = (type || "note").toLowerCase();
    switch (t) {
      case "call":
        return <Phone size={14} color="#3B82F6" />;
      case "meeting":
        return <Calendar size={14} color="#8B5CF6" />;
      case "email":
        return <Mail size={14} color="#EC4899" />;
      case "follow_up":
        return <Clock size={14} color="#F59E0B" />;
      default:
        return <FileText size={14} color="#10B981" />;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("en-IN", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #F3F4F6",
          paddingBottom: "12px"
        }}
      >
        <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#111827" }}>
          Activity Timeline ({activities.length})
        </h4>
        <button
          type="button"
          onClick={() => setShowLogModal(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "6px 12px",
            borderRadius: "8px",
            backgroundColor: "#10B981",
            color: "#ffffff",
            border: "none",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "background-color 0.2s"
          }}
        >
          <Plus size={14} />
          <span>Log Activity</span>
        </button>
      </div>

      {activities.length === 0 ? (
        <div
          style={{
            padding: "32px 16px",
            textAlign: "center",
            backgroundColor: "#F9FAFB",
            borderRadius: "12px",
            border: "1px dashed #E5E7EB"
          }}
        >
          <div style={{ fontSize: "24px", marginBottom: "8px" }}>📋</div>
          <div style={{ fontSize: "13px", color: "#6B7280", fontWeight: 500 }}>{emptyMessage}</div>
          <button
            type="button"
            onClick={() => setShowLogModal(true)}
            style={{
              marginTop: "12px",
              padding: "6px 14px",
              borderRadius: "6px",
              backgroundColor: "#ECFDF5",
              color: "#065F46",
              border: "1px solid #A7F3D0",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            + Log First Activity
          </button>
        </div>
      ) : (
        <div
          style={{
            position: "relative",
            paddingLeft: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px"
          }}
        >
          {/* Vertical line connecting nodes */}
          <div
            style={{
              position: "absolute",
              left: "11px",
              top: "12px",
              bottom: "12px",
              width: "2px",
              backgroundColor: "#E5E7EB"
            }}
          />

          {activities.map((item) => (
            <div
              key={item.id || Math.random()}
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                backgroundColor: "#ffffff",
                borderRadius: "10px",
                border: "1px solid #F3F4F6",
                padding: "12px 14px",
                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.03)"
              }}
            >
              {/* Dot Icon */}
              <div
                style={{
                  position: "absolute",
                  left: "-25px",
                  top: "12px",
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  backgroundColor: "#ffffff",
                  border: "2px solid #E5E7EB",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
                }}
              >
                {getActivityIcon(item.activityType)}
              </div>

              {/* Header Info */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "6px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <ActivityTypeBadge type={item.activityType} />
                  {item.callOutcome && (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: "9999px",
                        backgroundColor: "#FEF3C7",
                        color: "#92400E"
                      }}
                    >
                      Outcome: {item.callOutcome}
                    </span>
                  )}
                  {item.durationMinutes && (
                    <span style={{ fontSize: "11px", color: "#6B7280" }}>
                      ({item.durationMinutes} mins)
                    </span>
                  )}
                </div>
                <span style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500 }}>
                  {formatDate(item.activityDate || item.createdAt)}
                </span>
              </div>

              {/* Subject */}
              {item.subject && (
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>
                  {item.subject}
                </div>
              )}

              {/* Notes */}
              {item.notes && (
                <div
                  style={{
                    fontSize: "12px",
                    color: "#4B5563",
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap"
                  }}
                >
                  {item.notes}
                </div>
              )}

              {/* Footer / Follow-up / Performed By */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: "4px",
                  paddingTop: "6px",
                  borderTop: "1px dashed #F3F4F6",
                  fontSize: "11px",
                  color: "#6B7280"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <User size={12} />
                  <span>{item.performedByAdminName || "Staff"}</span>
                </div>
                {item.followUpDate && (
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#D97706", fontWeight: 500 }}>
                    <Clock size={12} />
                    <span>Follow-up: {item.followUpDate}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showLogModal && (
        <LogActivityModal
          isOpen={showLogModal}
          onClose={() => setShowLogModal(false)}
          leadId={leadId}
          companyId={companyId}
          contactId={contactId}
          opportunityId={opportunityId}
          onActivityLogged={onRefresh}
          showToast={showToast}
        />
      )}
    </div>
  );
};
