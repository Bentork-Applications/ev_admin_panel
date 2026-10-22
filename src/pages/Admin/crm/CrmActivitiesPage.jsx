import React, { useState, useEffect, useCallback } from "react";
import {
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Plus,
  RefreshCw,
  PhoneCall,
  User,
  Building,
  Filter,
  AlertCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  Mail,
  FileText
} from "lucide-react";
import { crmService } from "../../../services/crmService";
import { staffService } from "../../../services/staffService";
import { Toast } from "../../../components/common/Toast";
import { LogActivityModal } from "../../../components/crm/LogActivityModal";
import { RescheduleModal } from "../../../components/crm/RescheduleModal";
import { CompleteActivityModal } from "../../../components/crm/CompleteActivityModal";
import { ActivityDetailModal } from "../../../components/crm/ActivityDetailModal";
import { NotificationPanel } from "../../../components/crm/NotificationPanel";

const TABS = [
  { id: "today", label: "Today's Schedule", icon: Calendar },
  { id: "overdue", label: "Overdue", icon: AlertTriangle, isDanger: true },
  { id: "upcoming", label: "Upcoming", icon: Clock },
  { id: "all", label: "All Activities", icon: FileText },
  { id: "completed", label: "Completed", icon: CheckCircle2 }
];

export default function CrmActivitiesPage() {
  // Navigation & Toggle States
  const [activeTab, setActiveTab] = useState("today");
  const [myOnly, setMyOnly] = useState(false);

  // Data States
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [activityTypeFilter, setActivityTypeFilter] = useState("");
  const [callOutcomeFilter, setCallOutcomeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [adminIdFilter, setAdminIdFilter] = useState("");
  const [staffList, setStaffList] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Loading & UI States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Modals & Panels
  const [showLogModal, setShowLogModal] = useState(false);
  const [rescheduleItem, setRescheduleItem] = useState(null);
  const [completeItem, setCompleteItem] = useState(null);
  const [selectedDetailActivity, setSelectedDetailActivity] = useState(null);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [notificationRefreshTrigger, setNotificationRefreshTrigger] = useState(0);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  // Fetch KPI Summary metrics
  const fetchSummaryStats = useCallback(async () => {
    try {
      const res = await crmService.getActivitySummary(myOnly);
      setStats(res);
    } catch (err) {
      console.error("Failed to load activity summary stats:", err);
    }
  }, [myOnly]);

  // Fetch Paginated Activities according to activeTab and filters
  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === "all") {
        // Query /crm/activities/all with full filters
        const filters = {
          page,
          size: pageSize,
          myOnly: myOnly || undefined,
          adminId: adminIdFilter || undefined,
          search: appliedSearch.trim() || undefined,
          activityType: activityTypeFilter || undefined,
          callOutcome: callOutcomeFilter || undefined,
          status: statusFilter || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          sortBy: "activityDate",
          sortDir: "desc"
        };
        const res = await crmService.getAllActivities(filters);
        setActivities(Array.isArray(res?.content) ? res.content : []);
        setTotalPages(res?.totalPages || 0);
        setTotalElements(res?.totalElements || 0);
      } else {
        // Query /crm/activities/follow-ups partitioned by bucket
        // buckets: "today", "overdue", "upcoming", "completed"
        const res = await crmService.getFollowUps(activeTab, page, pageSize, myOnly, adminIdFilter || null);
        let list = Array.isArray(res?.content) ? res.content : [];

        // Apply client-side search/type filter if user filtered inside a specific follow-up bucket
        if (appliedSearch.trim() || activityTypeFilter || callOutcomeFilter) {
          const q = appliedSearch.toLowerCase().trim();
          list = list.filter((item) => {
            const matchesSearch =
              !q ||
              (item.subject && item.subject.toLowerCase().includes(q)) ||
              (item.contactName && item.contactName.toLowerCase().includes(q)) ||
              (item.contactPhone && item.contactPhone.toLowerCase().includes(q)) ||
              (item.leadTitle && item.leadTitle.toLowerCase().includes(q)) ||
              (item.notes && item.notes.toLowerCase().includes(q));
            const matchesType = !activityTypeFilter || item.activityType === activityTypeFilter;
            const matchesOutcome =
              !callOutcomeFilter ||
              (item.callOutcome && item.callOutcome.toLowerCase() === callOutcomeFilter.toLowerCase());
            return matchesSearch && matchesType && matchesOutcome;
          });
        }

        setActivities(list);
        setTotalPages(res?.totalPages || (list.length > 0 ? 1 : 0));
        setTotalElements(res?.totalElements || list.length);
      }
    } catch (err) {
      console.error("Failed to load activities:", err);
      setError(err.message || "Failed to load activities from server");
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, pageSize, myOnly, adminIdFilter, appliedSearch, activityTypeFilter, callOutcomeFilter, statusFilter, startDate, endDate]);

  // Load staff list for assignee filter
  useEffect(() => {
    staffService
      .getAllStaff()
      .then((res) => setStaffList(Array.isArray(res) ? res : []))
      .catch((err) => console.error("Failed to load staff list in CrmActivitiesPage:", err));
  }, []);

  // Trigger data fetching on dependencies
  useEffect(() => {
    fetchSummaryStats();
  }, [fetchSummaryStats]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handleRefreshAll = () => {
    fetchSummaryStats();
    fetchActivities();
    setNotificationRefreshTrigger((prev) => prev + 1);
  };

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    setPage(0);
    setAppliedSearch(search);
  };

  const handleResetFilters = () => {
    setSearch("");
    setAppliedSearch("");
    setActivityTypeFilter("");
    setCallOutcomeFilter("");
    setStatusFilter("");
    setAdminIdFilter("");
    setStartDate("");
    setEndDate("");
    setPage(0);
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setPage(0);
  };

  return (
    <div style={{ maxWidth: "1520px", margin: "0 auto", padding: "16px 24px" }}>
      <style>{`
        .crm-act-kpi-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 14px;
          margin-bottom: 22px;
        }
        @media (max-width: 1200px) {
          .crm-act-kpi-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @media (max-width: 768px) {
          .crm-act-kpi-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 480px) {
          .crm-act-kpi-grid {
            grid-template-columns: 1fr;
          }
        }
        .crm-skeleton-row {
          height: 18px;
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: crmPulse 1.4s infinite;
          border-radius: 4px;
        }
        @keyframes crmPulse {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Top Header */}
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
            Sales Activities & Follow-Up Hub
          </h1>
          <p style={{ fontSize: "13px", color: "#64748B", margin: "4px 0 0 0" }}>
            Track today's interactions, manage overdue follow-ups, and log communication
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {/* My Activities / All Toggle */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#334155",
              cursor: "pointer",
              padding: "7px 12px",
              backgroundColor: myOnly ? "#EFF6FF" : "#F8FAFC",
              borderRadius: "8px",
              border: myOnly ? "1.5px solid #3B82F6" : "1px solid #CBD5E1",
              userSelect: "none",
              transition: "all 0.15s ease"
            }}
          >
            <input
              type="checkbox"
              checked={myOnly}
              onChange={(e) => {
                setMyOnly(e.target.checked);
                setPage(0);
              }}
              style={{ accentColor: "#2563EB", cursor: "pointer" }}
            />
            <span>My Activities Only</span>
          </label>

          {/* Reminders & Notifications Panel Trigger */}
          <button
            onClick={() => setShowNotificationPanel(true)}
            title="Scheduled Reminders & Follow-up Notifications"
            style={{
              position: "relative",
              padding: "8px 14px",
              borderRadius: "8px",
              backgroundColor: "#ffffff",
              border: "1px solid #CBD5E1",
              color: "#334155",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            <AlertTriangle size={15} color="#2563EB" />
            <span>Reminders</span>
            {((stats?.overdueFollowUps || 0) + (stats?.todayFollowUps || 0)) > 0 && (
              <span
                style={{
                  backgroundColor: (stats?.overdueFollowUps || 0) > 0 ? "#EF4444" : "#F59E0B",
                  color: "#ffffff",
                  fontSize: "10px",
                  padding: "1px 6px",
                  borderRadius: "10px",
                  fontWeight: 700
                }}
              >
                {(stats?.overdueFollowUps || 0) + (stats?.todayFollowUps || 0)}
              </span>
            )}
          </button>

          {/* Refresh button */}
          <button
            onClick={handleRefreshAll}
            disabled={loading}
            title="Refresh activities and summary"
            style={{
              padding: "9px 12px",
              borderRadius: "8px",
              backgroundColor: "#ffffff",
              border: "1px solid #CBD5E1",
              color: "#475569",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              fontWeight: 500
            }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          {/* Log Activity Button */}
          <button
            onClick={() => setShowLogModal(true)}
            style={{
              padding: "9px 18px",
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
            <span>Log Activity</span>
          </button>
        </div>
      </div>

      {/* Error state alert */}
      {error && !loading && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px 16px",
            borderRadius: "10px",
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
            onClick={handleRefreshAll}
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

      {/* 1. KPI Summary Cards (5 Cards) */}
      <div className="crm-act-kpi-grid">
        {/* Card 1: Overdue */}
        <div
          onClick={() => handleTabChange("overdue")}
          style={{
            borderRadius: "12px",
            padding: "16px 18px",
            border: activeTab === "overdue" ? "2px solid #EF4444" : "1px solid #E2E8F0",
            backgroundColor: activeTab === "overdue" ? "#FFF5F5" : "#ffffff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            cursor: "pointer",
            transition: "all 0.15s ease"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600, textTransform: "uppercase" }}>
              ⚠️ Overdue
            </span>
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: (stats?.overdueFollowUps || 0) > 0 ? "#EF4444" : "#0F172A", marginTop: "4px" }}>
            {stats ? stats.overdueFollowUps : "--"}
          </div>
          <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>
            Requires immediate attention
          </div>
        </div>

        {/* Card 2: Due Today */}
        <div
          onClick={() => handleTabChange("today")}
          style={{
            borderRadius: "12px",
            padding: "16px 18px",
            border: activeTab === "today" ? "2px solid #F59E0B" : "1px solid #E2E8F0",
            backgroundColor: activeTab === "today" ? "#FFFBEB" : "#ffffff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            cursor: "pointer",
            transition: "all 0.15s ease"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600, textTransform: "uppercase" }}>
              📅 Due Today
            </span>
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#D97706", marginTop: "4px" }}>
            {stats ? stats.todayFollowUps : "--"}
          </div>
          <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>
            Follow-ups scheduled today
          </div>
        </div>

        {/* Card 3: Upcoming */}
        <div
          onClick={() => handleTabChange("upcoming")}
          style={{
            borderRadius: "12px",
            padding: "16px 18px",
            border: activeTab === "upcoming" ? "2px solid #3B82F6" : "1px solid #E2E8F0",
            backgroundColor: activeTab === "upcoming" ? "#EFF6FF" : "#ffffff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            cursor: "pointer",
            transition: "all 0.15s ease"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600, textTransform: "uppercase" }}>
              ⏳ Upcoming
            </span>
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#2563EB", marginTop: "4px" }}>
            {stats ? stats.upcomingFollowUps : "--"}
          </div>
          <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>
            Future scheduled interactions
          </div>
        </div>

        {/* Card 4: Calls Made Today */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            padding: "16px 18px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600, textTransform: "uppercase" }}>
              📞 Calls Today
            </span>
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#059669", marginTop: "4px" }}>
            {stats ? stats.callsToday : "--"}
          </div>
          <div style={{ fontSize: "11px", color: "#059669", fontWeight: 600, marginTop: "2px" }}>
            {stats?.callsByOutcome?.interested ? `${stats.callsByOutcome.interested} Interested` : "Calls recorded today"}
          </div>
        </div>

        {/* Card 5: Completed */}
        <div
          onClick={() => handleTabChange("completed")}
          style={{
            borderRadius: "12px",
            padding: "16px 18px",
            border: activeTab === "completed" ? "2px solid #10B981" : "1px solid #E2E8F0",
            backgroundColor: activeTab === "completed" ? "#ECFDF5" : "#ffffff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            cursor: "pointer",
            transition: "all 0.15s ease"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600, textTransform: "uppercase" }}>
              ✅ Completed
            </span>
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#16A34A", marginTop: "4px" }}>
            {stats ? stats.completedFollowUps : "--"}
          </div>
          <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>
            Resolved follow-ups
          </div>
        </div>
      </div>

      {/* 2. Tabs Navigation (5 Tabs) */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          borderBottom: "1px solid #E2E8F0",
          marginBottom: "16px",
          flexWrap: "wrap"
        }}
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          let count = null;
          if (tab.id === "today") count = stats?.todayFollowUps;
          if (tab.id === "overdue") count = stats?.overdueFollowUps;
          if (tab.id === "upcoming") count = stats?.upcomingFollowUps;
          if (tab.id === "completed") count = stats?.completedFollowUps;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                padding: "10px 16px",
                border: "none",
                background: "transparent",
                borderBottom: isActive ? "2.5px solid #2563EB" : "2.5px solid transparent",
                color: isActive ? "#2563EB" : "#64748B",
                fontSize: "13px",
                fontWeight: isActive ? 700 : 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.15s ease"
              }}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
              {count !== null && count !== undefined && (
                <span
                  style={{
                    backgroundColor: tab.isDanger && count > 0 ? "#FEE2E2" : isActive ? "#EFF6FF" : "#F1F5F9",
                    color: tab.isDanger && count > 0 ? "#EF4444" : isActive ? "#1D4ED8" : "#64748B",
                    fontSize: "11px",
                    padding: "2px 7px",
                    borderRadius: "10px",
                    fontWeight: 700
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Toolbar: Search & Filters */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "16px",
          flexWrap: "wrap",
          alignItems: "center"
        }}
      >
        {/* Search form */}
        <form
          onSubmit={handleSearchSubmit}
          style={{
            display: "flex",
            alignItems: "center",
            flex: 1,
            minWidth: "260px",
            position: "relative"
          }}
        >
          <Search size={15} color="#94A3B8" style={{ position: "absolute", left: "12px" }} />
          <input
            type="text"
            placeholder="Search contact, phone, lead, subject, notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px 8px 36px",
              borderRadius: "8px",
              border: "1px solid #CBD5E1",
              fontSize: "13px",
              backgroundColor: "#ffffff",
              boxSizing: "border-box"
            }}
          />
        </form>

        {/* Type Filter */}
        <select
          value={activityTypeFilter}
          onChange={(e) => {
            setActivityTypeFilter(e.target.value);
            setPage(0);
          }}
          style={{
            padding: "8px 12px",
            borderRadius: "8px",
            border: "1px solid #CBD5E1",
            fontSize: "13px",
            backgroundColor: "#ffffff",
            color: "#334155"
          }}
        >
          <option value="">All Interaction Types</option>
          <option value="call">📞 Calls</option>
          <option value="meeting">🤝 Meetings</option>
          <option value="follow_up">⏰ Follow-ups</option>
          <option value="email">✉️ Emails</option>
          <option value="note">📝 Notes</option>
        </select>

        {/* Call Outcome Filter */}
        <select
          value={callOutcomeFilter}
          onChange={(e) => {
            setCallOutcomeFilter(e.target.value);
            setPage(0);
          }}
          style={{
            padding: "8px 12px",
            borderRadius: "8px",
            border: "1px solid #CBD5E1",
            fontSize: "13px",
            backgroundColor: "#ffffff",
            color: "#334155"
          }}
        >
          <option value="">All Call Outcomes</option>
          <option value="interested">🌟 Interested</option>
          <option value="call_back">📞 Call Back</option>
          <option value="meeting_scheduled">🤝 Meeting Scheduled</option>
          <option value="no_answer">📵 No Answer</option>
          <option value="not_interested">❌ Not Interested</option>
          <option value="wrong_number">⚠️ Wrong Number</option>
        </select>

        {/* Status Filter (available on All Activities tab) */}
        {activeTab === "all" && (
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #CBD5E1",
              fontSize: "13px",
              backgroundColor: "#ffffff",
              color: "#334155"
            }}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
        )}

        {/* Sales Rep / Assignee Filter */}
        <select
          value={adminIdFilter}
          onChange={(e) => {
            setAdminIdFilter(e.target.value);
            setPage(0);
          }}
          style={{
            padding: "8px 12px",
            borderRadius: "8px",
            border: "1px solid #CBD5E1",
            fontSize: "13px",
            backgroundColor: "#ffffff",
            color: "#334155"
          }}
        >
          <option value="">All Assignees</option>
          {staffList.map((s) => (
            <option key={s.id} value={s.id}>
              👤 {s.name || s.email}
            </option>
          ))}
        </select>

        {/* Apply Search Button */}
        <button
          onClick={handleSearchSubmit}
          style={{
            padding: "8px 14px",
            borderRadius: "8px",
            backgroundColor: "#F1F5F9",
            color: "#334155",
            border: "1px solid #CBD5E1",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          Apply
        </button>

        {/* Reset button if any filter active */}
        {(appliedSearch || activityTypeFilter || callOutcomeFilter || statusFilter || adminIdFilter || startDate || endDate) && (
          <button
            onClick={handleResetFilters}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              backgroundColor: "transparent",
              color: "#EF4444",
              border: "none",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* 4. Activities Data Table */}
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
              <tr
                style={{
                  backgroundColor: "#F8FAFC",
                  borderBottom: "1px solid #E2E8F0",
                  textAlign: "left",
                  color: "#64748B"
                }}
              >
                <th style={{ padding: "12px 16px", fontWeight: 600, width: "140px" }}>FOLLOW-UP TIME</th>
                <th style={{ padding: "12px 14px", fontWeight: 600, width: "110px" }}>TYPE</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>CONTACT / LEAD</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>SUBJECT & NOTES</th>
                <th style={{ padding: "12px 14px", fontWeight: 600, width: "110px" }}>STATUS</th>
                <th style={{ padding: "12px 14px", fontWeight: 600, width: "130px" }}>ASSIGNED TO</th>
                <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "right", width: "180px" }}>
                  QUICK ACTIONS
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                // Loading skeletons
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <td style={{ padding: "14px 16px" }}><div className="crm-skeleton-row" style={{ width: "90px" }} /></td>
                    <td style={{ padding: "14px 14px" }}><div className="crm-skeleton-row" style={{ width: "70px" }} /></td>
                    <td style={{ padding: "14px 16px" }}><div className="crm-skeleton-row" style={{ width: "140px" }} /></td>
                    <td style={{ padding: "14px 16px" }}><div className="crm-skeleton-row" style={{ width: "200px" }} /></td>
                    <td style={{ padding: "14px 14px" }}><div className="crm-skeleton-row" style={{ width: "70px" }} /></td>
                    <td style={{ padding: "14px 14px" }}><div className="crm-skeleton-row" style={{ width: "90px" }} /></td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}><div className="crm-skeleton-row" style={{ width: "80px", marginLeft: "auto" }} /></td>
                  </tr>
                ))
              ) : activities.length === 0 ? (
                // Empty state
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "48px 16px", color: "#64748B" }}>
                    <div style={{ maxWidth: "340px", margin: "0 auto" }}>
                      <Calendar size={36} color="#CBD5E1" style={{ marginBottom: "10px" }} />
                      <div style={{ fontSize: "15px", fontWeight: 600, color: "#1E293B", marginBottom: "4px" }}>
                        No activities found
                      </div>
                      <p style={{ fontSize: "12px", color: "#64748B", margin: 0 }}>
                        {activeTab === "overdue"
                          ? "Great job! You have no overdue follow-ups."
                          : activeTab === "today"
                          ? "No follow-ups due today. Log a new interaction to keep momentum."
                          : "No records found matching the active view and filters."}
                      </p>
                      <button
                        onClick={() => setShowLogModal(true)}
                        style={{
                          marginTop: "14px",
                          padding: "7px 14px",
                          borderRadius: "8px",
                          backgroundColor: "#2563EB",
                          color: "#fff",
                          border: "none",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer"
                        }}
                      >
                        + Log First Activity
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                // Render Activities
                activities.map((item) => {
                  const isCompleted = item.status === "completed";
                  const isOverdue = item.isOverdue || (!isCompleted && item.followUpDate && new Date(item.followUpDate) < new Date(new Date().toDateString()));

                  // Type styling
                  let typeBg = "#F1F5F9";
                  let typeColor = "#475569";
                  let typeLabel = item.activityType || "Activity";
                  if (item.activityType === "call") {
                    typeBg = "#EFF6FF";
                    typeColor = "#1D4ED8";
                    typeLabel = "📞 Call";
                  } else if (item.activityType === "meeting") {
                    typeBg = "#F5F3FF";
                    typeColor = "#7C3AED";
                    typeLabel = "🤝 Meeting";
                  } else if (item.activityType === "follow_up") {
                    typeBg = "#FEF3C7";
                    typeColor = "#B45309";
                    typeLabel = "⏰ Follow-up";
                  } else if (item.activityType === "email") {
                    typeBg = "#ECFDF5";
                    typeColor = "#047857";
                    typeLabel = "✉️ Email";
                  } else if (item.activityType === "note") {
                    typeBg = "#F8FAFC";
                    typeColor = "#64748B";
                    typeLabel = "📝 Note";
                  }

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedDetailActivity(item)}
                      style={{
                        borderBottom: "1px solid #F1F5F9",
                        backgroundColor: isOverdue ? "#FFFDF5" : "#ffffff",
                        transition: "background 0.15s ease",
                        cursor: "pointer"
                      }}
                      title="Click to view activity history and full details"
                    >
                      {/* Follow-up Time & Date */}
                      <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                        {item.followUpTime ? (
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              backgroundColor: isOverdue ? "#FEE2E2" : "#EFF6FF",
                              color: isOverdue ? "#B91C1C" : "#1D4ED8",
                              fontWeight: 700,
                              borderRadius: "6px",
                              fontSize: "12px"
                            }}
                          >
                            {String(item.followUpTime).substring(0, 5)}
                          </span>
                        ) : (
                          <span style={{ color: "#94A3B8", fontSize: "12px" }}>--:--</span>
                        )}
                        <div style={{ fontSize: "11px", color: isOverdue ? "#EF4444" : "#64748B", marginTop: "3px", fontWeight: isOverdue ? 600 : 400 }}>
                          {item.followUpDate || "No target date"}
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td style={{ padding: "14px 14px", whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: 600,
                            backgroundColor: typeBg,
                            color: typeColor
                          }}
                        >
                          {typeLabel}
                        </span>
                      </td>

                      {/* Contact / Lead */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: 600, color: "#0F172A" }}>
                          {item.contactName || "No Contact"}
                        </div>
                        {item.contactPhone && (
                          <a
                            href={`tel:${item.contactPhone}`}
                            style={{
                              fontSize: "11px",
                              color: "#2563EB",
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                              marginTop: "2px"
                            }}
                          >
                            📞 {item.contactPhone}
                          </a>
                        )}
                        {item.leadTitle && (
                          <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>
                            Lead: <strong>{item.leadTitle}</strong> {item.leadNumber ? `(${item.leadNumber})` : ""}
                          </div>
                        )}
                      </td>

                      {/* Subject & Outcome & Notes */}
                      <td style={{ padding: "14px 16px", maxWidth: "340px" }}>
                        <div style={{ fontWeight: 600, color: "#1E293B", marginBottom: "3px" }}>
                          {item.subject}
                        </div>
                        {item.callOutcome && (
                          <span
                            style={{
                              display: "inline-block",
                              fontSize: "10px",
                              fontWeight: 600,
                              padding: "1px 6px",
                              backgroundColor: "#F1F5F9",
                              color: "#475569",
                              borderRadius: "4px",
                              textTransform: "capitalize",
                              marginRight: "6px",
                              marginBottom: "2px"
                            }}
                          >
                            Outcome: {item.callOutcome.replace(/_/g, " ")}
                          </span>
                        )}
                        {item.notes && (
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#64748B",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical"
                            }}
                            title={item.notes}
                          >
                            {item.notes}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: "14px 14px", whiteSpace: "nowrap" }}>
                        {isCompleted ? (
                          <span
                            style={{
                              display: "inline-block",
                              padding: "3px 9px",
                              borderRadius: "12px",
                              fontSize: "11px",
                              fontWeight: 600,
                              backgroundColor: "#DCFCE7",
                              color: "#15803D"
                            }}
                          >
                            Completed
                          </span>
                        ) : isOverdue ? (
                          <span
                            style={{
                              display: "inline-block",
                              padding: "3px 9px",
                              borderRadius: "12px",
                              fontSize: "11px",
                              fontWeight: 600,
                              backgroundColor: "#FEE2E2",
                              color: "#B91C1C"
                            }}
                          >
                            Overdue
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-block",
                              padding: "3px 9px",
                              borderRadius: "12px",
                              fontSize: "11px",
                              fontWeight: 600,
                              backgroundColor: "#FEF3C7",
                              color: "#B45309"
                            }}
                          >
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Performed / Assigned By */}
                      <td style={{ padding: "14px 14px", color: "#475569", fontSize: "12px", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <User size={13} color="#64748B" />
                          <span
                            style={{
                              fontWeight: item.performedByAdminName ? 600 : 400,
                              color: item.performedByAdminName ? "#1E293B" : "#94A3B8"
                            }}
                          >
                            {item.performedByAdminName || "Unassigned"}
                          </span>
                        </div>
                      </td>

                      {/* Quick Actions */}
                      <td
                        style={{ padding: "14px 16px", textAlign: "right", whiteSpace: "nowrap" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {!isCompleted ? (
                          <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                            {/* Reschedule */}
                            <button
                              onClick={() => setRescheduleItem(item)}
                              title="Reschedule Follow-up"
                              style={{
                                padding: "5px 10px",
                                borderRadius: "6px",
                                backgroundColor: "#ffffff",
                                border: "1px solid #CBD5E1",
                                color: "#334155",
                                fontSize: "12px",
                                fontWeight: 600,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px"
                              }}
                            >
                              <Clock size={12} />
                              <span>Reschedule</span>
                            </button>

                            {/* Mark Done */}
                            <button
                              onClick={() => setCompleteItem(item)}
                              title="Complete Activity"
                              style={{
                                padding: "5px 10px",
                                borderRadius: "6px",
                                backgroundColor: "#16A34A",
                                border: "none",
                                color: "#ffffff",
                                fontSize: "12px",
                                fontWeight: 600,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px"
                              }}
                            >
                              <CheckCircle2 size={12} />
                              <span>Done</span>
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: "11px", color: "#94A3B8" }}>
                            {item.completedAt ? `Done ${new Date(item.completedAt).toLocaleDateString()}` : "Completed"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Pagination Footer */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 18px",
              borderTop: "1px solid #E2E8F0",
              backgroundColor: "#FAFAFA",
              fontSize: "12px",
              color: "#64748B"
            }}
          >
            <span>
              Showing page <strong>{page + 1}</strong> of <strong>{totalPages}</strong> ({totalElements} total items)
            </span>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <button
                disabled={page === 0 || loading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                style={{
                  padding: "5px 10px",
                  borderRadius: "6px",
                  border: "1px solid #CBD5E1",
                  backgroundColor: page === 0 ? "#F1F5F9" : "#ffffff",
                  color: page === 0 ? "#94A3B8" : "#334155",
                  cursor: page === 0 ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "3px"
                }}
              >
                <ChevronLeft size={14} />
                <span>Prev</span>
              </button>

              <button
                disabled={page >= totalPages - 1 || loading}
                onClick={() => setPage((p) => p + 1)}
                style={{
                  padding: "5px 10px",
                  borderRadius: "6px",
                  border: "1px solid #CBD5E1",
                  backgroundColor: page >= totalPages - 1 ? "#F1F5F9" : "#ffffff",
                  color: page >= totalPages - 1 ? "#94A3B8" : "#334155",
                  cursor: page >= totalPages - 1 ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "3px"
                }}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <LogActivityModal
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        onSuccess={handleRefreshAll}
        showToast={showToast}
      />

      <RescheduleModal
        activity={rescheduleItem}
        isOpen={!!rescheduleItem}
        onClose={() => setRescheduleItem(null)}
        onSuccess={handleRefreshAll}
        showToast={showToast}
      />

      <CompleteActivityModal
        activity={completeItem}
        isOpen={!!completeItem}
        onClose={() => setCompleteItem(null)}
        onSuccess={handleRefreshAll}
        showToast={showToast}
      />

      {/* Activity Detail & History Modal */}
      <ActivityDetailModal
        activity={selectedDetailActivity}
        isOpen={!!selectedDetailActivity}
        onClose={() => setSelectedDetailActivity(null)}
        onReschedule={(act) => setRescheduleItem(act)}
        onComplete={(act) => setCompleteItem(act)}
        onRefresh={handleRefreshAll}
      />

      {/* Scheduled Reminders & Follow-up Notifications Panel */}
      <NotificationPanel
        isOpen={showNotificationPanel}
        onClose={() => setShowNotificationPanel(false)}
        onSelectActivity={(act) => setSelectedDetailActivity(act)}
        onReschedule={(act) => setRescheduleItem(act)}
        onComplete={(act) => setCompleteItem(act)}
        refreshTrigger={notificationRefreshTrigger}
      />
    </div>
  );
}
