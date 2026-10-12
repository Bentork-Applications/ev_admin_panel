import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Plus,
  RefreshCw,
  PhoneCall,
  User,
  Filter,
  AlertCircle
} from "lucide-react";
import { crmService } from "../../../services/crmService";
import { Toast } from "../../../components/common/Toast";
import { LogActivityModal } from "../../../components/crm/LogActivityModal";

const TABS = [
  { id: "today", label: "Today" },
  { id: "overdue", label: "Overdue" },
  { id: "upcoming", label: "Upcoming" },
  { id: "my", label: "My Activities" }
];

export default function CrmActivitiesPage() {
  const [activeTab, setActiveTab] = useState("today");
  const [activities, setActivities] = useState([]);
  const [overdueLeads, setOverdueLeads] = useState([]);
  const [historyActivities, setHistoryActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [todayActs, overdueRes, historyRes] = await Promise.all([
        crmService.getTodayActivities().catch(() => []),
        crmService.getOverdueFollowUps().catch(() => []),
        crmService.getActivitiesHistory().catch(() => [])
      ]);
      setActivities(Array.isArray(todayActs) ? todayActs : []);
      setOverdueLeads(Array.isArray(overdueRes) ? overdueRes : []);
      setHistoryActivities(Array.isArray(historyRes) ? historyRes : []);
    } catch (err) {
      console.error("Failed to load activities:", err);
      setError(err.message || "Failed to load activities");
      showToast(err.message || "Failed to load activities", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Mark Complete honestly without fake persistence
  const handleMarkComplete = (activityId) => {
    showToast(
      `Backend API Required: A status update endpoint (PUT /api/crm/activities/${activityId}/status) is pending on the server to persist completion.`,
      "info"
    );
  };

  const displayedList = useMemo(() => {
    if (activeTab === "overdue") return overdueLeads;
    if (activeTab === "today") return activities;
    if (activeTab === "upcoming") {
      return activities.filter((a) => {
        if (!a.dueDate && !a.followUpDate) return false;
        const d = new Date(a.dueDate || a.followUpDate);
        return d > new Date();
      });
    }
    return activities;
  }, [activeTab, activities, overdueLeads]);

  const completedTodayCount = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return historyActivities.filter((a) => {
      const isCompleted = a.status === "COMPLETED" || a.completed;
      const isToday = (a.completedAt || a.updatedAt || a.date || "").startsWith(todayStr);
      return isCompleted && isToday;
    }).length;
  }, [historyActivities]);

  const upcomingCount = useMemo(() => {
    return activities.filter((a) => {
      if (!a.dueDate && !a.followUpDate) return false;
      const d = new Date(a.dueDate || a.followUpDate);
      return d > new Date();
    }).length;
  }, [activities]);

  return (
    <div style={{ maxWidth: "1480px", margin: "0 auto", padding: "16px 20px" }}>
      <style>{`
        .crm-act-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 24px;
        }
        @media (max-width: 900px) {
          .crm-act-kpi-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 480px) {
          .crm-act-kpi-grid {
            grid-template-columns: 1fr;
          }
        }
        .crm-act-skeleton {
          height: 14px;
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: crmPulse 1.5s infinite;
          border-radius: 4px;
        }
        @keyframes crmPulse {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px"
        }}
      >
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#0F172A", margin: 0 }}>
            Activities & Follow-ups
          </h1>
          <p style={{ fontSize: "13px", color: "#64748B", margin: "4px 0 0 0" }}>
            Daily tasks, phone calls, reminders and customer follow-up schedule
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={() => setShowAddTaskModal(true)}
            style={{
              padding: "9px 16px",
              borderRadius: "8px",
              backgroundColor: "#2563EB",
              color: "#ffffff",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)"
            }}
          >
            <Plus size={16} />
            <span>+ Log Activity / Task</span>
          </button>

          <button
            onClick={fetchData}
            disabled={loading}
            title="Refresh"
            style={{
              padding: "9px",
              borderRadius: "8px",
              backgroundColor: "#ffffff",
              border: "1px solid #CBD5E1",
              color: "#475569",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Error state with retry */}
      {error && !loading && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px 16px",
            borderRadius: "8px",
            backgroundColor: "#FEF2F2",
            border: "1px solid #FECACA",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#991B1B",
            fontSize: "13px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertCircle size={16} color="#DC2626" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchData}
            style={{
              padding: "4px 12px",
              borderRadius: "6px",
              backgroundColor: "#DC2626",
              color: "#fff",
              border: "none",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* 4 KPI Cards */}
      <div className="crm-act-kpi-grid">
        <div
          onClick={() => setActiveTab("today")}
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            padding: "18px 20px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            cursor: "pointer",
            borderLeft: activeTab === "today" ? "4px solid #2563EB" : "1px solid #E2E8F0"
          }}
        >
          <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>Due Today</span>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#0F172A", marginTop: "4px" }}>
            {activities.length}
          </div>
        </div>

        <div
          onClick={() => setActiveTab("overdue")}
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            padding: "18px 20px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            cursor: "pointer",
            borderLeft: activeTab === "overdue" ? "4px solid #EF4444" : "1px solid #E2E8F0"
          }}
        >
          <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>Overdue</span>
          <div style={{ fontSize: "24px", fontWeight: 700, color: overdueLeads.length > 0 ? "#EF4444" : "#0F172A", marginTop: "4px" }}>
            {overdueLeads.length}
          </div>
        </div>

        <div
          onClick={() => setActiveTab("upcoming")}
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            padding: "18px 20px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            cursor: "pointer",
            borderLeft: activeTab === "upcoming" ? "4px solid #3B82F6" : "1px solid #E2E8F0"
          }}
        >
          <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>Upcoming</span>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#0F172A", marginTop: "4px" }}>
            {upcomingCount}
          </div>
        </div>

        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            padding: "18px 20px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
          }}
        >
          <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>Completed Today</span>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#16A34A", marginTop: "4px" }}>
            {completedTodayCount}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid #E2E8F0", marginBottom: "16px", flexWrap: "wrap" }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "8px 16px",
              border: "none",
              background: "transparent",
              borderBottom: activeTab === tab.id ? "2px solid #2563EB" : "2px solid transparent",
              color: activeTab === tab.id ? "#2563EB" : "#64748B",
              fontSize: "13px",
              fontWeight: activeTab === tab.id ? 700 : 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <span>{tab.label}</span>
            {tab.id === "overdue" && overdueLeads.length > 0 && (
              <span style={{ backgroundColor: "#FEE2E2", color: "#EF4444", fontSize: "10px", padding: "1px 6px", borderRadius: "10px", fontWeight: 700 }}>
                {overdueLeads.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Activities Table */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "14px",
          border: "1px solid #E2E8F0",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
          overflow: "hidden"
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid #E2E8F0", textAlign: "left", color: "#64748B" }}>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>TIME / DATE</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>TYPE</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>COMPANY / CONTACT</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>SUBJECT & DETAILS</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>STATUS</th>
                <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "right" }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1, 2, 3, 4].map((i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <td style={{ padding: "14px 16px" }}><div className="crm-act-skeleton" style={{ width: "80px" }} /></td>
                    <td style={{ padding: "14px 16px" }}><div className="crm-act-skeleton" style={{ width: "60px" }} /></td>
                    <td style={{ padding: "14px 16px" }}><div className="crm-act-skeleton" style={{ width: "120px" }} /></td>
                    <td style={{ padding: "14px 16px" }}><div className="crm-act-skeleton" style={{ width: "200px" }} /></td>
                    <td style={{ padding: "14px 16px" }}><div className="crm-act-skeleton" style={{ width: "70px" }} /></td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}><div className="crm-act-skeleton" style={{ width: "80px", marginLeft: "auto" }} /></td>
                  </tr>
                ))
              ) : displayedList.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
                    No activities found for "{TABS.find((t) => t.id === activeTab)?.label}".
                  </td>
                </tr>
              ) : (
                displayedList.map((item, idx) => {
                  const isOverdue =
                    activeTab === "overdue" ||
                    Boolean(item.followUpDate && new Date(item.followUpDate) < new Date() && item.status !== "COMPLETED");

                  const timeStr = item.activityDate
                    ? new Date(item.activityDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : item.followUpDate || "Today";

                  return (
                    <tr
                      key={item.id || idx}
                      style={{
                        borderBottom: "1px solid #F1F5F9",
                        backgroundColor: isOverdue ? "#FFFBFB" : "transparent"
                      }}
                    >
                      <td style={{ padding: "12px 16px", color: isOverdue ? "#DC2626" : "#64748B", fontWeight: isOverdue ? 600 : 500 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          {isOverdue && <AlertTriangle size={13} color="#DC2626" />}
                          <span>{timeStr}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", color: "#334155" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: "10px",
                            backgroundColor: "#F1F5F9",
                            color: "#475569",
                            textTransform: "uppercase"
                          }}
                        >
                          {item.activityType || item.type || "Call"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", fontWeight: 600, color: "#0F172A" }}>
                        {item.companyName || item.customerName || item.company || item.name || "—"}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#334155" }}>
                        <div style={{ fontWeight: 500 }}>{item.subject || item.title || "Customer follow-up"}</div>
                        {(item.notes || item.outcome) && (
                          <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>
                            {item.notes || item.outcome}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: "12px",
                            backgroundColor: isOverdue ? "#FEE2E2" : "#DCFCE7",
                            color: isOverdue ? "#DC2626" : "#16A34A"
                          }}
                        >
                          {isOverdue ? "Overdue" : item.status || "Pending"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <button
                          onClick={() => handleMarkComplete(item.id)}
                          title="Backend API required for persistent completion"
                          style={{
                            padding: "4px 10px",
                            borderRadius: "6px",
                            backgroundColor: "#F8FAFC",
                            border: "1px dashed #CBD5E1",
                            color: "#64748B",
                            fontSize: "11px",
                            fontWeight: 500,
                            cursor: "pointer"
                          }}
                        >
                          Complete (Backend Req.)
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddTaskModal && (
        <LogActivityModal
          isOpen={showAddTaskModal}
          onClose={() => setShowAddTaskModal(false)}
          onActivityLogged={() => {
            fetchData();
            showToast("Activity logged successfully", "success");
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
}
