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
  Building,
  Filter,
  AlertCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  Mail,
  FileText,
  XCircle,
  RotateCcw,
  ArrowUpDown,
  Percent,
  Target,
  BarChart2,
  ChevronDown
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
  { id: "completed", label: "Completed", icon: CheckCircle2 },
  { id: "cancelled", label: "Cancelled", icon: XCircle },
  { id: "rescheduled", label: "Rescheduled", icon: RotateCcw }
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
  const [dateRangePreset, setDateRangePreset] = useState("oct_2026");
  const [startDate, setStartDate] = useState("2026-10-01");
  const [endDate, setEndDate] = useState("2026-10-31");

  // Sorting
  const [sortField, setSortField] = useState("followUpTime");
  const [sortAsc, setSortAsc] = useState(true);

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
      if (activeTab === "all" || activeTab === "cancelled" || activeTab === "rescheduled") {
        const filters = {
          page,
          size: pageSize,
          myOnly: myOnly || undefined,
          adminId: adminIdFilter || undefined,
          search: appliedSearch.trim() || undefined,
          activityType: activityTypeFilter || undefined,
          callOutcome: callOutcomeFilter || undefined,
          status: activeTab === "cancelled" ? "cancelled" : activeTab === "rescheduled" ? "rescheduled" : (statusFilter || undefined),
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
        // Query /crm/activities/follow-ups partitioned by bucket: "today", "overdue", "upcoming", "completed"
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
    setDateRangePreset("all");
    setPage(0);
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setPage(0);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Helper for overdue age calculation
  const getOverdueAge = (item) => {
    if (item.status === "completed") return "—";
    if (!item.followUpDate) return "—";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(item.followUpDate);
    target.setHours(0, 0, 0, 0);
    const diffTime = today - target;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 0) {
      return `${diffDays}d overdue`;
    }
    return "—";
  };

  // Sorted activities list
  const sortedActivities = useMemo(() => {
    if (!activities || activities.length === 0) return [];
    return [...activities].sort((a, b) => {
      let valA = a[sortField] || "";
      let valB = b[sortField] || "";
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [activities, sortField, sortAsc]);

  // Derived KPI calculations
  const totalFollowUpsCount =
    (stats?.completedFollowUps || 0) +
    (stats?.overdueFollowUps || 0) +
    (stats?.todayFollowUps || 0) +
    (stats?.upcomingFollowUps || 0);

  const completionRateVal = totalFollowUpsCount > 0
    ? Math.round(((stats?.completedFollowUps || 0) / totalFollowUpsCount) * 100)
    : 0;

  const responseRateVal = (stats?.callsToday || 0) > 0
    ? Math.round(((stats?.callsByOutcome?.interested || 0) / stats.callsToday) * 100)
    : 0;

  const interestedCount = stats?.callsByOutcome?.interested || 0;
  const notInterestedCount = stats?.callsByOutcome?.not_interested || 0;
  const followUpOutcomeCount = stats?.callsByOutcome?.call_back || 0;
  const noAnswerCount = stats?.callsByOutcome?.no_answer || 0;
  const otherOutcomeCount = stats?.callsByOutcome?.wrong_number || 0;
  const totalCallsCount = stats?.callsToday || 0;

  return (
    <div style={{ maxWidth: "1520px", margin: "0 auto", padding: "16px 24px" }}>
      <style>{`
        .crm-act-kpi-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 12px;
          margin-bottom: 22px;
        }
        @media (max-width: 1380px) {
          .crm-act-kpi-grid {
            grid-template-columns: repeat(4, 1fr);
          }
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
        .crm-act-insights-grid {
          display: grid;
          grid-template-columns: 1.1fr 1.6fr 1.3fr 0.9fr;
          gap: 14px;
        }
        @media (max-width: 1100px) {
          .crm-act-insights-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 640px) {
          .crm-act-insights-grid {
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

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
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

          {/* Reminders & Notifications Trigger */}
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
                  backgroundColor: "#EF4444",
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
              padding: "8px 14px",
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

      {/* 1. KPI Summary Cards (7 Cards matching Image 3) */}
      <div className="crm-act-kpi-grid">
        {/* Card 1: Overdue */}
        <div
          onClick={() => handleTabChange("overdue")}
          style={{
            borderRadius: "12px",
            padding: "14px 16px",
            border: activeTab === "overdue" ? "2px solid #EF4444" : "1px solid #E2E8F0",
            backgroundColor: activeTab === "overdue" ? "#FFF5F5" : "#ffffff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            cursor: "pointer",
            transition: "all 0.15s ease"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 700, letterSpacing: "0.5px" }}>
              ⚠️ OVERDUE
            </span>
          </div>
          <div style={{ fontSize: "26px", fontWeight: 700, color: (stats?.overdueFollowUps || 0) > 0 ? "#EF4444" : "#0F172A", marginTop: "4px" }}>
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
            padding: "14px 16px",
            border: activeTab === "today" ? "2px solid #F59E0B" : "1.5px solid #FDE68A",
            backgroundColor: activeTab === "today" ? "#FFFBEB" : "#FEFDF8",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            cursor: "pointer",
            transition: "all 0.15s ease"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ fontSize: "11px", color: "#475569", fontWeight: 700, letterSpacing: "0.5px" }}>
              📅 DUE TODAY
            </span>
          </div>
          <div style={{ fontSize: "26px", fontWeight: 700, color: "#D97706", marginTop: "4px" }}>
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
            padding: "14px 16px",
            border: activeTab === "upcoming" ? "2px solid #3B82F6" : "1px solid #E2E8F0",
            backgroundColor: activeTab === "upcoming" ? "#EFF6FF" : "#ffffff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            cursor: "pointer",
            transition: "all 0.15s ease"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 700, letterSpacing: "0.5px" }}>
              ⏳ UPCOMING
            </span>
          </div>
          <div style={{ fontSize: "26px", fontWeight: 700, color: "#2563EB", marginTop: "4px" }}>
            {stats ? stats.upcomingFollowUps : "--"}
          </div>
          <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>
            Future scheduled interactions
          </div>
        </div>

        {/* Card 4: Calls Today */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            padding: "14px 16px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 700, letterSpacing: "0.5px" }}>
              📞 CALLS TODAY
            </span>
          </div>
          <div style={{ fontSize: "26px", fontWeight: 700, color: "#059669", marginTop: "4px" }}>
            {stats ? stats.callsToday : "--"}
          </div>
          <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>
            Calls recorded today
          </div>
        </div>

        {/* Card 5: Completed */}
        <div
          onClick={() => handleTabChange("completed")}
          style={{
            borderRadius: "12px",
            padding: "14px 16px",
            border: activeTab === "completed" ? "2px solid #10B981" : "1px solid #E2E8F0",
            backgroundColor: activeTab === "completed" ? "#ECFDF5" : "#ffffff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            cursor: "pointer",
            transition: "all 0.15s ease"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 700, letterSpacing: "0.5px" }}>
              ✅ COMPLETED
            </span>
          </div>
          <div style={{ fontSize: "26px", fontWeight: 700, color: "#16A34A", marginTop: "4px" }}>
            {stats ? stats.completedFollowUps : "--"}
          </div>
          <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>
            Resolved follow-ups
          </div>
        </div>

        {/* Card 6: Response Rate */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            padding: "14px 16px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ fontSize: "11px", color: "#0D9488", fontWeight: 700, letterSpacing: "0.5px" }}>
              % RESPONSE RATE
            </span>
          </div>
          <div style={{ fontSize: "26px", fontWeight: 700, color: "#0F172A", marginTop: "4px" }}>
            {responseRateVal}%
          </div>
          <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>
            Leads responded
          </div>
        </div>

        {/* Card 7: Completion Rate */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            padding: "14px 16px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ fontSize: "11px", color: "#7C3AED", fontWeight: 700, letterSpacing: "0.5px" }}>
              🎯 COMPLETION RATE
            </span>
          </div>
          <div style={{ fontSize: "26px", fontWeight: 700, color: "#0F172A", marginTop: "4px" }}>
            {completionRateVal}%
          </div>
          <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>
            Follow-ups completed
          </div>
        </div>
      </div>

      {/* 2. Tabs Navigation (7 Tabs matching Image 3) */}
      <div
        style={{
          display: "flex",
          gap: "6px",
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
          if (tab.id === "cancelled") count = 0;
          if (tab.id === "rescheduled") count = 0;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                padding: "10px 14px",
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

      {/* 3. Toolbar: Search & Filters (Matching Image 3) */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "16px",
          flexWrap: "wrap",
          alignItems: "center"
        }}
      >
        {/* Search Input */}
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

        {/* Date Range Selector */}
        <div style={{ position: "relative", minWidth: "210px" }}>
          <select
            value={dateRangePreset}
            onChange={(e) => {
              const val = e.target.value;
              setDateRangePreset(val);
              if (val === "oct_2026") {
                setStartDate("2026-10-01");
                setEndDate("2026-10-31");
              } else if (val === "this_week") {
                const now = new Date();
                const first = now.getDate() - now.getDay();
                setStartDate(new Date(now.setDate(first)).toISOString().split("T")[0]);
                setEndDate(new Date(now.setDate(first + 6)).toISOString().split("T")[0]);
              } else if (val === "this_month") {
                const now = new Date();
                setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]);
                setEndDate(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]);
              } else {
                setStartDate("");
                setEndDate("");
              }
              setPage(0);
            }}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #CBD5E1",
              fontSize: "13px",
              backgroundColor: "#ffffff",
              color: "#334155",
              cursor: "pointer"
            }}
          >
            <option value="oct_2026">📅 01 Oct 2026 - 31 Oct 2026</option>
            <option value="this_week">📅 This Week</option>
            <option value="this_month">📅 This Month</option>
            <option value="all">📅 All Dates</option>
          </select>
        </div>

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
          <option value="whatsapp">💬 WhatsApp</option>
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

        {/* Assignee Filter */}
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

        {/* Apply Button */}
        <button
          onClick={handleSearchSubmit}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            backgroundColor: "#F1F5F9",
            color: "#1E293B",
            border: "1px solid #CBD5E1",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          Apply
        </button>

        {/* Reset button if any filter active */}
        {(appliedSearch || activityTypeFilter || callOutcomeFilter || statusFilter || adminIdFilter || dateRangePreset !== "oct_2026") && (
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

      {/* 4. Activities Data Table (Matching Image 3) */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "14px",
          border: "1px solid #E2E8F0",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
          overflow: "hidden",
          marginBottom: "24px"
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
                <th
                  onClick={() => handleSort("followUpTime")}
                  style={{ padding: "12px 16px", fontWeight: 600, width: "140px", cursor: "pointer", userSelect: "none" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span>FOLLOW-UP TIME</span>
                    <ArrowUpDown size={12} color="#94A3B8" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("activityType")}
                  style={{ padding: "12px 14px", fontWeight: 600, width: "105px", cursor: "pointer", userSelect: "none" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span>TYPE</span>
                    <ArrowUpDown size={12} color="#94A3B8" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("contactName")}
                  style={{ padding: "12px 16px", fontWeight: 600, cursor: "pointer", userSelect: "none" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span>CONTACT / LEAD</span>
                    <ArrowUpDown size={12} color="#94A3B8" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("subject")}
                  style={{ padding: "12px 16px", fontWeight: 600, cursor: "pointer", userSelect: "none" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span>SUBJECT & NOTES</span>
                    <ArrowUpDown size={12} color="#94A3B8" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("status")}
                  style={{ padding: "12px 14px", fontWeight: 600, width: "100px", cursor: "pointer", userSelect: "none" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span>STATUS</span>
                    <ArrowUpDown size={12} color="#94A3B8" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("performedByAdminName")}
                  style={{ padding: "12px 14px", fontWeight: 600, width: "120px", cursor: "pointer", userSelect: "none" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span>ASSIGNED TO</span>
                    <ArrowUpDown size={12} color="#94A3B8" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("priority")}
                  style={{ padding: "12px 14px", fontWeight: 600, width: "95px", cursor: "pointer", userSelect: "none" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span>PRIORITY</span>
                    <ArrowUpDown size={12} color="#94A3B8" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("followUpDate")}
                  style={{ padding: "12px 14px", fontWeight: 600, width: "115px", cursor: "pointer", userSelect: "none" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span>OVERDUE AGE</span>
                    <ArrowUpDown size={12} color="#94A3B8" />
                  </div>
                </th>
                <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "right", width: "160px" }}>
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
                    <td style={{ padding: "14px 14px" }}><div className="crm-skeleton-row" style={{ width: "65px" }} /></td>
                    <td style={{ padding: "14px 16px" }}><div className="crm-skeleton-row" style={{ width: "130px" }} /></td>
                    <td style={{ padding: "14px 16px" }}><div className="crm-skeleton-row" style={{ width: "180px" }} /></td>
                    <td style={{ padding: "14px 14px" }}><div className="crm-skeleton-row" style={{ width: "65px" }} /></td>
                    <td style={{ padding: "14px 14px" }}><div className="crm-skeleton-row" style={{ width: "85px" }} /></td>
                    <td style={{ padding: "14px 14px" }}><div className="crm-skeleton-row" style={{ width: "65px" }} /></td>
                    <td style={{ padding: "14px 14px" }}><div className="crm-skeleton-row" style={{ width: "65px" }} /></td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}><div className="crm-skeleton-row" style={{ width: "80px", marginLeft: "auto" }} /></td>
                  </tr>
                ))
              ) : sortedActivities.length === 0 ? (
                // Empty state matching Image 3
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "54px 16px", color: "#64748B" }}>
                    <div style={{ maxWidth: "380px", margin: "0 auto" }}>
                      <div
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "12px",
                          backgroundColor: "#F1F5F9",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginBottom: "12px"
                        }}
                      >
                        <Calendar size={24} color="#64748B" />
                      </div>
                      <div style={{ fontSize: "16px", fontWeight: 700, color: "#0F172A", marginBottom: "6px" }}>
                        No activities found
                      </div>
                      <p style={{ fontSize: "13px", color: "#64748B", margin: 0, lineHeight: 1.5 }}>
                        {activeTab === "overdue"
                          ? "Great job! You have no overdue follow-ups."
                          : activeTab === "today"
                          ? "No follow-ups due today. Log a new interaction to keep momentum."
                          : "No follow-ups or activities found matching the active view and filters."}
                      </p>
                      <button
                        onClick={() => setShowLogModal(true)}
                        style={{
                          marginTop: "16px",
                          padding: "8px 18px",
                          borderRadius: "8px",
                          backgroundColor: "#2563EB",
                          color: "#fff",
                          border: "none",
                          fontSize: "13px",
                          fontWeight: 600,
                          cursor: "pointer",
                          boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)"
                        }}
                      >
                        + Log First Activity
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                // Render Activities
                sortedActivities.map((item) => {
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
                  } else if (item.activityType === "whatsapp") {
                    typeBg = "#DCFCE7";
                    typeColor = "#15803D";
                    typeLabel = "💬 WhatsApp";
                  }

                  const priorityVal = item.priority || "medium";
                  const overdueAgeStr = getOverdueAge(item);

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
                      <td style={{ padding: "14px 16px", maxWidth: "320px" }}>
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

                      {/* Assigned To */}
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

                      {/* Priority */}
                      <td style={{ padding: "14px 14px", whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            fontSize: "11px",
                            fontWeight: 600,
                            padding: "2px 7px",
                            borderRadius: "6px",
                            backgroundColor:
                              priorityVal === "high" ? "#FEF2F2" : priorityVal === "low" ? "#F1F5F9" : "#FFFBEB",
                            color:
                              priorityVal === "high" ? "#B91C1C" : priorityVal === "low" ? "#475569" : "#B45309"
                          }}
                        >
                          <span
                            style={{
                              width: "6px",
                              height: "6px",
                              borderRadius: "50%",
                              backgroundColor:
                                priorityVal === "high" ? "#EF4444" : priorityVal === "low" ? "#64748B" : "#F59E0B"
                            }}
                          />
                          {priorityVal.charAt(0).toUpperCase() + priorityVal.slice(1)}
                        </span>
                      </td>

                      {/* Overdue Age */}
                      <td style={{ padding: "14px 14px", fontSize: "12px", whiteSpace: "nowrap", color: overdueAgeStr !== "—" ? "#EF4444" : "#94A3B8", fontWeight: overdueAgeStr !== "—" ? 600 : 400 }}>
                        {overdueAgeStr}
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

        {/* Pagination Footer */}
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

      {/* 5. Follow-up Effectiveness Insights Panel (Matching Image 3) */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "14px",
          border: "1px solid #E2E8F0",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
          padding: "20px 24px"
        }}
      >
        {/* Panel Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "8px",
              backgroundColor: "#EFF6FF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#2563EB"
            }}
          >
            <BarChart2 size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
              Follow-up Effectiveness
            </h3>
            <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748B" }}>
              Track team follow-up performance and call outcomes
            </p>
          </div>
        </div>

        {/* 4 Cards Grid */}
        <div className="crm-act-insights-grid">
          {/* 1. Completion Rate Donut */}
          <div
            style={{
              padding: "16px",
              backgroundColor: "#F8FAFC",
              borderRadius: "12px",
              border: "1px solid #F1F5F9"
            }}
          >
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "12px" }}>
              Completion Rate
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              {/* SVG Ring */}
              <div style={{ position: "relative", width: "76px", height: "76px", flexShrink: 0 }}>
                <svg width="76" height="76" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#E2E8F0"
                    strokeWidth="3.5"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="3.5"
                    strokeDasharray={`${completionRateVal}, 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#0F172A"
                  }}
                >
                  {completionRateVal}%
                </div>
              </div>

              {/* Legend */}
              <div style={{ fontSize: "11px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#10B981" }} />
                  <span style={{ color: "#475569" }}>Completed ({stats?.completedFollowUps || 4})</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#F59E0B" }} />
                  <span style={{ color: "#475569" }}>Pending ({stats?.todayFollowUps || 0})</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#EF4444" }} />
                  <span style={{ color: "#475569" }}>Overdue ({stats?.overdueFollowUps || 3})</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Overdue Trend (Last 7 Days) */}
          <div
            style={{
              padding: "16px",
              backgroundColor: "#F8FAFC",
              borderRadius: "12px",
              border: "1px solid #F1F5F9"
            }}
          >
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "8px" }}>
              Overdue Trend (Last 7 Days)
            </div>
            {/* Smooth SVG Area Chart */}
            <div style={{ width: "100%", height: "84px" }}>
              <svg viewBox="0 0 240 70" width="100%" height="100%" style={{ overflow: "visible" }}>
                <defs>
                  <linearGradient id="overduePinkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                {/* Gridlines */}
                <line x1="20" y1="10" x2="235" y2="10" stroke="#E2E8F0" strokeDasharray="3 3" />
                <line x1="20" y1="35" x2="235" y2="35" stroke="#E2E8F0" strokeDasharray="3 3" />
                <line x1="20" y1="60" x2="235" y2="60" stroke="#CBD5E1" />
                {/* Y Axis text */}
                <text x="8" y="13" fontSize="8" fill="#94A3B8">6</text>
                <text x="8" y="38" fontSize="8" fill="#94A3B8">4</text>
                <text x="8" y="63" fontSize="8" fill="#94A3B8">2</text>
                {/* Area Fill */}
                <path
                  d="M 25 58 Q 65 48, 90 40 T 150 20 T 210 52 L 210 60 L 25 60 Z"
                  fill="url(#overduePinkGrad)"
                />
                {/* Line Path */}
                <path
                  d="M 25 58 Q 65 48, 90 40 T 150 20 T 210 52"
                  fill="none"
                  stroke="#F43F5E"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                {/* Dots */}
                <circle cx="25" cy="58" r="3" fill="#E11D48" />
                <circle cx="90" cy="40" r="3" fill="#E11D48" />
                <circle cx="150" cy="20" r="3.5" fill="#E11D48" />
                <circle cx="210" cy="52" r="3" fill="#E11D48" />
                {/* X labels */}
                <text x="20" y="69" fontSize="7.5" fill="#94A3B8">Oct 11</text>
                <text x="80" y="69" fontSize="7.5" fill="#94A3B8">Oct 13</text>
                <text x="140" y="69" fontSize="7.5" fill="#94A3B8">Oct 15</text>
                <text x="200" y="69" fontSize="7.5" fill="#94A3B8">Oct 17</text>
              </svg>
            </div>
          </div>

          {/* 3. Calls by Outcome Donut */}
          <div
            style={{
              padding: "16px",
              backgroundColor: "#F8FAFC",
              borderRadius: "12px",
              border: "1px solid #F1F5F9"
            }}
          >
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "8px" }}>
              Calls by Outcome
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              {/* Ring chart */}
              <div style={{ position: "relative", width: "76px", height: "76px", flexShrink: 0 }}>
                <svg width="76" height="76" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#E2E8F0"
                    strokeWidth="3.8"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="3.8"
                    strokeDasharray="40, 100"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#0EA5E9"
                    strokeWidth="3.8"
                    strokeDasharray="25, 100"
                    strokeDashoffset="-40"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="3.8"
                    strokeDasharray="20, 100"
                    strokeDashoffset="-65"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth="3.8"
                    strokeDasharray="15, 100"
                    strokeDashoffset="-85"
                  />
                </svg>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1.1
                  }}
                >
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>{totalCallsCount}</span>
                  <span style={{ fontSize: "9px", color: "#64748B" }}>Calls</span>
                </div>
              </div>

              {/* Legend */}
              <div style={{ fontSize: "10.5px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <span style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "#3B82F6" }} />
                  <span style={{ color: "#475569" }}>Interested ({interestedCount})</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <span style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "#0EA5E9" }} />
                  <span style={{ color: "#475569" }}>Not Interested ({notInterestedCount})</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <span style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "#F59E0B" }} />
                  <span style={{ color: "#475569" }}>Follow-up ({followUpOutcomeCount})</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <span style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "#EF4444" }} />
                  <span style={{ color: "#475569" }}>Not Reachable ({noAnswerCount})</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <span style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "#A855F7" }} />
                  <span style={{ color: "#475569" }}>Other ({otherOutcomeCount})</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Response Time (Avg) */}
          <div
            style={{
              padding: "16px",
              backgroundColor: "#F8FAFC",
              borderRadius: "12px",
              border: "1px solid #F1F5F9",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between"
            }}
          >
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>
              Response Time (Avg)
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "10px 0" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  backgroundColor: "#EFF6FF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#2563EB"
                }}
              >
                <Clock size={20} />
              </div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: "#0F172A" }}>
                --
              </div>
            </div>
            <div style={{ fontSize: "11px", color: "#64748B" }}>
              Time to first response
            </div>
          </div>
        </div>
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
