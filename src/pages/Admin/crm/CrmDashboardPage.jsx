import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  Users,
  Phone,
  Calendar,
  AlertTriangle,
  Award,
  DollarSign,
  Plus,
  ArrowRight,
  RefreshCw,
  Clock,
  Building2,
  CheckCircle2,
  PhoneCall,
  AlertCircle
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from "recharts";
import { crmService } from "../../../services/crmService";
import { Toast } from "../../../components/common/Toast";

export default function CrmDashboardPage() {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState(null);
  const [todayActivities, setTodayActivities] = useState([]);
  const [overdueLeads, setOverdueLeads] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [kpiRes, actsRes, overdueRes, oppsRes] = await Promise.all([
        crmService.getDashboardKPIs().catch(() => ({})),
        crmService.getTodayActivities().catch(() => []),
        crmService.getOverdueFollowUps().catch(() => []),
        crmService.getAllOpportunities().catch(() => [])
      ]);

      setKpis(kpiRes || {});
      setTodayActivities(Array.isArray(actsRes) ? actsRes : []);
      setOverdueLeads(Array.isArray(overdueRes) ? overdueRes : []);
      setOpportunities(Array.isArray(oppsRes) ? oppsRes : []);
    } catch (err) {
      console.error("Failed to load CRM dashboard:", err);
      setError(err.message || "Failed to load CRM dashboard metrics");
      showToast(err.message || "Failed to load CRM dashboard metrics", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleCompleteTask = async (activityId) => {
    if (!activityId) return;
    try {
      await crmService.completeTask(activityId);
      showToast("Task completed successfully!", "success");
      setTodayActivities((prev) =>
        prev.map((a) => (a.id === activityId ? { ...a, status: "completed", completedAt: new Date().toISOString() } : a))
      );
      await fetchDashboardData();
    } catch (err) {
      console.error("Complete task error:", err);
      showToast(err.message || "Failed to complete task", "error");
    }
  };

  // Lead trend chart data dynamically derived from real activities and opportunities
  const leadTrendData = useMemo(() => {
    if (!todayActivities.length && !opportunities.length) {
      return [];
    }
    const daysMap = {};
    [...todayActivities, ...opportunities].forEach((item) => {
      const dateStr = item.activityDate || item.createdAt || item.createdDate;
      if (dateStr) {
        const d = new Date(dateStr);
        const day = d.getDate().toString();
        daysMap[day] = (daysMap[day] || 0) + 1;
      }
    });

    return Object.keys(daysMap)
      .map((day) => ({
        day,
        count: daysMap[day]
      }))
      .slice(-7);
  }, [todayActivities, opportunities]);

  const formatCurrency = (val) => {
    if (val === undefined || val === null || isNaN(Number(val))) return "₹0";
    const num = Number(val);
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
    return `₹${num.toLocaleString("en-IN")}`;
  };

  // Pipeline stage counts from real opportunities
  const qualifiedCount = opportunities.filter((o) => (o.stage || "").toUpperCase() === "QUALIFIED").length;
  const proposalCount = opportunities.filter((o) => (o.stage || "").toUpperCase() === "PROPOSAL").length;
  const negotiationCount = opportunities.filter((o) => (o.stage || "").toUpperCase() === "NEGOTIATION").length;

  return (
    <div style={{ maxWidth: "1480px", margin: "0 auto", padding: "16px 20px" }}>
      <style>{`
        .crm-dash-kpis {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 24px;
        }
        .crm-dash-cols {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 20px;
          margin-bottom: 24px;
        }
        @media (max-width: 1200px) {
          .crm-dash-kpis {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
        @media (max-width: 900px) {
          .crm-dash-cols {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 640px) {
          .crm-dash-kpis {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 480px) {
          .crm-dash-kpis {
            grid-template-columns: 1fr;
          }
        }
        .crm-skeleton-pulse {
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: crmPulse 1.5s infinite;
          border-radius: 6px;
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
            Sales Dashboard
          </h1>
          <p style={{ fontSize: "13px", color: "#64748B", margin: "4px 0 0 0" }}>
            Welcome back. Real-time sales pipeline & performance overview.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={() => navigate("/dashboard/crm/new-call")}
            style={{
              padding: "10px 18px",
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
              boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)",
              transition: "background-color 0.15s"
            }}
          >
            <Plus size={16} />
            <span>+ New Call / Add Lead</span>
          </button>

          <button
            onClick={fetchDashboardData}
            title="Refresh Data"
            disabled={loading}
            style={{
              padding: "10px",
              borderRadius: "8px",
              backgroundColor: "#ffffff",
              border: "1px solid #CBD5E1",
              color: "#475569",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "border-color 0.15s"
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
            marginBottom: "20px",
            padding: "14px 18px",
            borderRadius: "10px",
            backgroundColor: "#FEF2F2",
            border: "1px solid #FECACA",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            color: "#991B1B"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
            <AlertCircle size={18} color="#DC2626" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchDashboardData}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              backgroundColor: "#DC2626",
              color: "#ffffff",
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

      {/* 5 Top KPI Cards */}
      <div className="crm-dash-kpis">
        {loading && !kpis ? (
          [1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "12px",
                padding: "18px 20px",
                border: "1px solid #E2E8F0"
              }}
            >
              <div className="crm-skeleton-pulse" style={{ height: "12px", width: "60px", marginBottom: "8px" }} />
              <div className="crm-skeleton-pulse" style={{ height: "28px", width: "100px", marginBottom: "8px" }} />
              <div className="crm-skeleton-pulse" style={{ height: "10px", width: "80px" }} />
            </div>
          ))
        ) : (
          <>
            {/* Card 1: Total Leads */}
            <div
              onClick={() => navigate("/dashboard/crm/leads")}
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "12px",
                padding: "18px 20px",
                border: "1px solid #E2E8F0",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>Total Leads</span>
              <div style={{ fontSize: "24px", fontWeight: 700, color: "#0F172A", marginTop: "4px" }}>
                {kpis?.totalLeadsThisMonth !== undefined ? kpis.totalLeadsThisMonth.toLocaleString("en-IN") : "0"}
              </div>
              <div style={{ fontSize: "11px", color: "#64748B", marginTop: "4px", fontWeight: 500 }}>
                This Month
              </div>
            </div>

            {/* Card 2: New Today */}
            <div
              onClick={() => navigate("/dashboard/crm/leads")}
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "12px",
                padding: "18px 20px",
                border: "1px solid #E2E8F0",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>New Today</span>
              <div style={{ fontSize: "24px", fontWeight: 700, color: "#0F172A", marginTop: "4px" }}>
                {kpis?.newLeads || 0}
              </div>
              <div style={{ fontSize: "11px", color: "#10B981", marginTop: "4px", fontWeight: 600 }}>
                Today's Inflow
              </div>
            </div>

            {/* Card 3: Follow-ups Due */}
            <div
              onClick={() => navigate("/dashboard/crm/activities")}
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "12px",
                padding: "18px 20px",
                border: "1px solid #E2E8F0",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>Follow-ups Due</span>
              <div style={{ fontSize: "24px", fontWeight: 700, color: "#0F172A", marginTop: "4px" }}>
                {kpis?.overdueFollowUps !== undefined ? kpis.overdueFollowUps : overdueLeads.length}
              </div>
              <div style={{ fontSize: "11px", color: overdueLeads.length > 0 ? "#EF4444" : "#64748B", marginTop: "4px", fontWeight: 600 }}>
                {overdueLeads.length} overdue
              </div>
            </div>

            {/* Card 4: Pipeline Value */}
            <div
              onClick={() => navigate("/dashboard/crm/opportunities")}
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "12px",
                padding: "18px 20px",
                border: "1px solid #E2E8F0",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>Pipeline Value</span>
              <div style={{ fontSize: "24px", fontWeight: 700, color: "#0F172A", marginTop: "4px" }}>
                {formatCurrency(kpis?.totalPipelineValue)}
              </div>
              <div style={{ fontSize: "11px", color: "#64748B", marginTop: "4px", fontWeight: 500 }}>
                Active Funnel
              </div>
            </div>

            {/* Card 5: Won This Month */}
            <div
              onClick={() => navigate("/dashboard/crm/opportunities")}
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "12px",
                padding: "18px 20px",
                border: "1px solid #E2E8F0",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>Won This Month</span>
              <div style={{ fontSize: "24px", fontWeight: 700, color: "#0F172A", marginTop: "4px" }}>
                {kpis?.wonDealsThisMonth || 0}
              </div>
              <div style={{ fontSize: "11px", color: "#16A34A", marginTop: "4px", fontWeight: 600 }}>
                {formatCurrency(kpis?.wonValueThisMonth)}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main 2-Column Grid */}
      <div className="crm-dash-cols">
        {/* Left Column: Lead Trend & Recent Activities */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Lead Trend Bar Chart */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              padding: "20px",
              border: "1px solid #E2E8F0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>
                Lead & Activity Trend
              </h3>
            </div>
            {loading && !todayActivities.length && !opportunities.length ? (
              <div className="crm-skeleton-pulse" style={{ height: "200px", width: "100%", borderRadius: "8px" }} />
            ) : leadTrendData.length > 0 ? (
              <div style={{ width: "100%", height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leadTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="day" stroke="#94A3B8" fontSize={12} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} />
                    <Tooltip
                      formatter={(val) => [`${val} Items`, "Volume"]}
                      contentStyle={{ backgroundColor: "#1E293B", borderRadius: "8px", color: "#fff", border: "none" }}
                    />
                    <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ height: "180px", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748B", fontSize: "13px" }}>
                No activity trend data available yet.
              </div>
            )}
          </div>

          {/* Recent Activities */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              padding: "20px",
              border: "1px solid #E2E8F0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
            }}
          >
            <h3 style={{ margin: "0 0 14px 0", fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>
              Recent Activities
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {loading && !todayActivities.length ? (
                [1, 2, 3].map((i) => (
                  <div key={i} style={{ paddingBottom: "10px", borderBottom: "1px solid #F1F5F9" }}>
                    <div className="crm-skeleton-pulse" style={{ height: "14px", width: "140px", marginBottom: "6px" }} />
                    <div className="crm-skeleton-pulse" style={{ height: "10px", width: "200px" }} />
                  </div>
                ))
              ) : todayActivities.length > 0 ? (
                todayActivities.slice(0, 4).map((act, i) => {
                  const isCompleted = (act.status || "").toLowerCase() === "completed";
                  return (
                    <div
                      key={act.id || i}
                      style={{
                        borderBottom: i < todayActivities.length - 1 ? "1px solid #F1F5F9" : "none",
                        paddingBottom: "10px",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px"
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isCompleted}
                        onChange={() => handleCompleteTask(act.id)}
                        disabled={isCompleted}
                        style={{ marginTop: "3px", cursor: isCompleted ? "default" : "pointer", accentColor: "#16A34A" }}
                        title={isCompleted ? "Completed" : "Click to mark complete"}
                      />
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: "13px",
                            fontWeight: 600,
                            color: isCompleted ? "#94A3B8" : "#0F172A",
                            textDecoration: isCompleted ? "line-through" : "none"
                          }}
                        >
                          {act.subject || `${(act.activityType || "Activity").toUpperCase()} Log`}
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: isCompleted ? "#CBD5E1" : "#64748B",
                            marginTop: "2px",
                            textDecoration: isCompleted ? "line-through" : "none"
                          }}
                        >
                          {new Date(act.activityDate || act.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {act.notes || act.outcome || "Activity logged"}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: "20px 0", textAlign: "center", color: "#64748B", fontSize: "13px" }}>
                  No recent activities logged today.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Upcoming Follow-ups & Pipeline Snapshot */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Upcoming Follow-ups */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              padding: "20px",
              border: "1px solid #E2E8F0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>
                Upcoming Follow-ups
              </h3>
              <button
                onClick={() => navigate("/dashboard/crm/activities")}
                style={{ background: "none", border: "none", color: "#2563EB", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
              >
                View all →
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {loading && !overdueLeads.length ? (
                [1, 2, 3].map((i) => (
                  <div key={i} style={{ paddingBottom: "8px", borderBottom: "1px solid #F1F5F9" }}>
                    <div className="crm-skeleton-pulse" style={{ height: "14px", width: "160px", marginBottom: "6px" }} />
                    <div className="crm-skeleton-pulse" style={{ height: "10px", width: "120px" }} />
                  </div>
                ))
              ) : overdueLeads.length > 0 ? (
                overdueLeads.slice(0, 4).map((lead, i) => (
                  <div key={lead.id || i} style={{ borderBottom: i < overdueLeads.length - 1 ? "1px solid #F1F5F9" : "none", paddingBottom: "8px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A" }}>{lead.companyName || lead.title || lead.name || "Lead Follow-up"}</div>
                    <div style={{ fontSize: "12px", color: "#64748B", marginTop: "1px" }}>
                      Follow-up · {lead.followUpDate ? `Scheduled: ${lead.followUpDate}` : "Pending follow-up"}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: "20px 0", textAlign: "center", color: "#64748B", fontSize: "13px" }}>
                  No pending follow-ups scheduled.
                </div>
              )}
            </div>
          </div>

          {/* Pipeline Snapshot */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              padding: "20px",
              border: "1px solid #E2E8F0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
            }}
          >
            <h3 style={{ margin: "0 0 16px 0", fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>
              Pipeline Snapshot
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 600, color: "#0F172A", marginBottom: "6px" }}>
                  <span>Qualified</span>
                  <span>{qualifiedCount}</span>
                </div>
                <div style={{ width: "100%", height: "8px", backgroundColor: "#F1F5F9", borderRadius: "9999px", overflow: "hidden" }}>
                  <div style={{ width: opportunities.length ? `${Math.min(100, (qualifiedCount / opportunities.length) * 100)}%` : "0%", height: "100%", backgroundColor: "#2563EB", borderRadius: "9999px", transition: "width 0.3s ease" }} />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 600, color: "#0F172A", marginBottom: "6px" }}>
                  <span>Proposal</span>
                  <span>{proposalCount}</span>
                </div>
                <div style={{ width: "100%", height: "8px", backgroundColor: "#F1F5F9", borderRadius: "9999px", overflow: "hidden" }}>
                  <div style={{ width: opportunities.length ? `${Math.min(100, (proposalCount / opportunities.length) * 100)}%` : "0%", height: "100%", backgroundColor: "#3B82F6", borderRadius: "9999px", transition: "width 0.3s ease" }} />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 600, color: "#0F172A", marginBottom: "6px" }}>
                  <span>Negotiation</span>
                  <span>{negotiationCount}</span>
                </div>
                <div style={{ width: "100%", height: "8px", backgroundColor: "#F1F5F9", borderRadius: "9999px", overflow: "hidden" }}>
                  <div style={{ width: opportunities.length ? `${Math.min(100, (negotiationCount / opportunities.length) * 100)}%` : "0%", height: "100%", backgroundColor: "#60A5FA", borderRadius: "9999px", transition: "width 0.3s ease" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
