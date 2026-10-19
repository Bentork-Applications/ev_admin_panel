import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  X,
  Bell,
  Clock,
  Calendar,
  AlertTriangle,
  Phone,
  Mail,
  FileText,
  User,
  CheckCircle2,
  RefreshCw,
  ChevronRight
} from "lucide-react";
import { crmService } from "../../services/crmService";

export const NotificationPanel = ({
  isOpen,
  onClose,
  onSelectActivity,
  onReschedule,
  onComplete,
  refreshTrigger
}) => {
  const [filter, setFilter] = useState("all"); // "all", "overdue", "today", "upcoming"
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load scheduled calls and follow-ups from backend
  const fetchScheduledNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch overdue, today, and upcoming buckets in parallel to assemble notifications
      const [overdueRes, todayRes, upcomingRes] = await Promise.all([
        crmService.getFollowUps("overdue", 0, 30).catch(() => ({ content: [] })),
        crmService.getFollowUps("today", 0, 30).catch(() => ({ content: [] })),
        crmService.getFollowUps("upcoming", 0, 30).catch(() => ({ content: [] }))
      ]);

      const overdueItems = (Array.isArray(overdueRes?.content) ? overdueRes.content : []).map(
        (item) => ({ ...item, notificationBucket: "overdue" })
      );
      const todayItems = (Array.isArray(todayRes?.content) ? todayRes.content : []).map(
        (item) => ({ ...item, notificationBucket: "today" })
      );
      const upcomingItems = (Array.isArray(upcomingRes?.content) ? upcomingRes.content : []).map(
        (item) => ({ ...item, notificationBucket: "upcoming" })
      );

      // Merge and deduplicate by unique activity ID, excluding already completed activities
      const seen = new Set();
      const combined = [];
      [...overdueItems, ...todayItems, ...upcomingItems].forEach((item) => {
        if (!seen.has(item.id) && item.status !== "completed") {
          seen.add(item.id);
          combined.push(item);
        }
      });

      setNotifications(combined);
    } catch (err) {
      console.error("Failed to load scheduled notifications:", err);
      setError("Failed to load notifications from server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchScheduledNotifications();
    }
  }, [isOpen, refreshTrigger, fetchScheduledNotifications]);

  // Filtered list according to tab inside notification panel
  const displayedNotifications = useMemo(() => {
    if (filter === "overdue") return notifications.filter((n) => n.notificationBucket === "overdue");
    if (filter === "today") return notifications.filter((n) => n.notificationBucket === "today");
    if (filter === "upcoming") return notifications.filter((n) => n.notificationBucket === "upcoming");
    return notifications;
  }, [filter, notifications]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(2px)",
        display: "flex",
        justifyContent: "flex-end",
        zIndex: 1200
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          height: "100vh",
          backgroundColor: "#ffffff",
          boxShadow: "-10px 0 25px -5px rgba(0, 0, 0, 0.15)",
          display: "flex",
          flexDirection: "column",
          animation: "slideInRight 0.25s ease-out"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
        `}</style>

        {/* Panel Header */}
        <div
          style={{
            padding: "18px 20px",
            borderBottom: "1px solid #E2E8F0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#F8FAFC"
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
              <Bell size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
                Scheduled Reminders
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748B" }}>
                {notifications.length} active follow-up{notifications.length === 1 ? "" : "s"} & call{notifications.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={fetchScheduledNotifications}
              disabled={loading}
              title="Refresh notifications"
              style={{
                background: "none",
                border: "none",
                color: "#64748B",
                cursor: "pointer",
                padding: "6px"
              }}
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: "#94A3B8",
                cursor: "pointer",
                padding: "6px"
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Notification Filter Pills */}
        <div
          style={{
            display: "flex",
            gap: "6px",
            padding: "12px 20px",
            borderBottom: "1px solid #F1F5F9",
            backgroundColor: "#ffffff",
            overflowX: "auto"
          }}
        >
          {[
            { id: "all", label: `All (${notifications.length})` },
            {
              id: "overdue",
              label: `Overdue (${notifications.filter((n) => n.notificationBucket === "overdue").length})`,
              isDanger: true
            },
            {
              id: "today",
              label: `Due Today (${notifications.filter((n) => n.notificationBucket === "today").length})`
            },
            {
              id: "upcoming",
              label: `Upcoming (${notifications.filter((n) => n.notificationBucket === "upcoming").length})`
            }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              style={{
                padding: "6px 12px",
                borderRadius: "20px",
                border: "none",
                fontSize: "12px",
                fontWeight: filter === tab.id ? 700 : 500,
                backgroundColor:
                  filter === tab.id
                    ? tab.isDanger
                      ? "#FEE2E2"
                      : "#2563EB"
                    : "#F1F5F9",
                color:
                  filter === tab.id
                    ? tab.isDanger
                      ? "#B91C1C"
                      : "#ffffff"
                    : "#475569",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notification List Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#64748B", fontSize: "13px" }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 10px" }} />
              <div>Checking schedule...</div>
            </div>
          ) : error ? (
            <div
              style={{
                padding: "12px",
                borderRadius: "8px",
                backgroundColor: "#FEF2F2",
                color: "#991B1B",
                fontSize: "12px"
              }}
            >
              {error}
            </div>
          ) : displayedNotifications.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#94A3B8" }}>
              <CheckCircle2 size={36} color="#CBD5E1" style={{ margin: "0 auto 12px" }} />
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#1E293B", marginBottom: "4px" }}>
                All Caught Up!
              </div>
              <p style={{ fontSize: "12px", color: "#64748B", margin: 0 }}>
                {filter === "overdue"
                  ? "No overdue follow-ups."
                  : filter === "today"
                  ? "No more follow-ups due today."
                  : "No scheduled calls or follow-ups matching this filter."}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {displayedNotifications.map((item) => {
                const isOverdue = item.notificationBucket === "overdue";
                const isToday = item.notificationBucket === "today";

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      onSelectActivity?.(item);
                      onClose();
                    }}
                    style={{
                      padding: "14px",
                      borderRadius: "12px",
                      border: isOverdue
                        ? "1.5px solid #FCA5A5"
                        : isToday
                        ? "1.5px solid #FDE68A"
                        : "1px solid #E2E8F0",
                      backgroundColor: isOverdue ? "#FFF5F5" : isToday ? "#FFFDF5" : "#ffffff",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    {/* Top Row: Type & Bucket Tag */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "6px",
                          backgroundColor: isOverdue ? "#FEE2E2" : isToday ? "#FEF3C7" : "#EFF6FF",
                          color: isOverdue ? "#B91C1C" : isToday ? "#B45309" : "#1D4ED8"
                        }}
                      >
                        {isOverdue ? "⚠️ OVERDUE" : isToday ? "📅 TODAY" : "⏳ UPCOMING"}
                      </span>

                      <span style={{ fontSize: "12px", fontWeight: 700, color: isOverdue ? "#DC2626" : "#2563EB" }}>
                        {item.followUpTime ? String(item.followUpTime).substring(0, 5) : "--:--"}
                      </span>
                    </div>

                    {/* Subject Line */}
                    <div style={{ fontWeight: 600, color: "#0F172A", fontSize: "13px", marginBottom: "4px" }}>
                      {item.subject}
                    </div>

                    {/* Contact & Lead Info */}
                    <div style={{ fontSize: "12px", color: "#475569", marginBottom: "4px" }}>
                      {item.contactName && <span>Contact: <strong>{item.contactName}</strong></span>}
                      {item.contactPhone && (
                        <span style={{ marginLeft: "6px", color: "#2563EB" }}>({item.contactPhone})</span>
                      )}
                    </div>
                    {item.leadTitle && (
                      <div style={{ fontSize: "11px", color: "#64748B", marginBottom: "6px" }}>
                        Lead: <strong>{item.leadTitle}</strong>
                      </div>
                    )}

                    {/* Assigned Name & Date */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: "11px",
                        color: "#64748B",
                        paddingTop: "6px",
                        borderTop: "1px dashed #E2E8F0"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <User size={12} color="#64748B" />
                        <span>Assigned: <strong>{item.performedByAdminName || "Unassigned"}</strong></span>
                      </div>

                      <span>{item.followUpDate}</span>
                    </div>

                    {/* Quick Action Buttons */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: "8px",
                        marginTop: "10px"
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          onReschedule?.(item);
                          onClose();
                        }}
                        style={{
                          padding: "4px 10px",
                          borderRadius: "6px",
                          border: "1px solid #CBD5E1",
                          backgroundColor: "#ffffff",
                          color: "#334155",
                          fontSize: "11px",
                          fontWeight: 600,
                          cursor: "pointer"
                        }}
                      >
                        Reschedule
                      </button>

                      <button
                        onClick={() => {
                          onComplete?.(item);
                          onClose();
                        }}
                        style={{
                          padding: "4px 10px",
                          borderRadius: "6px",
                          border: "none",
                          backgroundColor: "#16A34A",
                          color: "#ffffff",
                          fontSize: "11px",
                          fontWeight: 600,
                          cursor: "pointer"
                        }}
                      >
                        Done
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
