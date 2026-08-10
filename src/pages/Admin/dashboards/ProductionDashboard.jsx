import React, { useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { orderService } from "../../../services/orderService";
import { useDashboardData } from "../../../hooks/useDashboardData";
import { StatCard } from "../../../components/common/StatCard";
import { ResponsiveContainer, BarChart, Bar, AreaChart, Area, Cell, XAxis, YAxis, Tooltip } from "recharts";
import { RefreshCw, ArrowRight, Wrench, CheckCircle2, Cpu, Layers } from "lucide-react";

export default function ProductionDashboard() {
  const navigate = useNavigate();

  const fetchProductionData = useCallback(async () => {
    let data = [];
    try {
      data = await orderService.productionGetOrders();
    } catch {
      try {
        data = await orderService.adminGetAllOrders();
      } catch (adminErr) {
        console.warn("Failed to fetch production orders:", adminErr);
      }
    }

    const dataArray = Array.isArray(data)
      ? data
      : Array.isArray(data?.orders)
        ? data.orders
        : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.items)
            ? data.items
            : [];

    return dataArray.map((o) => {
      const localStatus = localStorage.getItem(`order_status_${o.id}`);
      return {
        ...o,
        orderStatus: localStatus || o.orderStatus
      };
    });
  }, []);

  const { orders, loading, refresh: fetchProductionDataHandler } = useDashboardData(fetchProductionData);

  // Compute Production Metrics
  const totalOrders = orders.length;
  const inProductionCount = orders.filter(
    (o) => o.orderStatus === "in_production" || o.productionStatus === "in_progress"
  ).length;
  const testingCount = orders.filter((o) => o.productionStatus === "testing").length;
  const completedCount = orders.filter(
    (o) => o.orderStatus === "production_complete" || o.productionStatus === "completed" || o.orderStatus === "scm_complete" || o.orderStatus === "dispatched"
  ).length;

  const totalUnitsInProduction = orders.reduce((sum, o) => {
    if (Array.isArray(o.orderItems) && o.orderItems.length > 0) {
      return sum + o.orderItems.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
    }
    return sum + (Number(o.quantity) || 1);
  }, 0);

  const throughputRate = totalOrders > 0 ? Math.round((completedCount / totalOrders) * 100) : 100;

  // Chart 1: Production Stage Breakdown
  const stageData = [
    { stage: "Sales Registered", count: orders.filter((o) => o.orderStatus === "sales_registered").length, fill: "#F59E0B" },
    { stage: "In Assembly", count: inProductionCount, fill: "#3B82F6" },
    { stage: "Quality Testing", count: testingCount, fill: "#8B5CF6" },
    { stage: "Completed", count: completedCount, fill: "#10B981" },
  ];

  // Chart 2: Output Throughput Trend Data
  const monthlyOutputMap = {};
  orders.forEach((o) => {
    const d = o.createdAt ? new Date(o.createdAt) : o.createdDate ? new Date(o.createdDate) : new Date();
    const month = d.toLocaleString("default", { month: "short" });
    if (!monthlyOutputMap[month]) monthlyOutputMap[month] = { month, units: 0 };
    const qty = Array.isArray(o.orderItems) && o.orderItems.length > 0
      ? o.orderItems.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0)
      : (Number(o.quantity) || 1);
    monthlyOutputMap[month].units += qty;
  });
  const outputChartData = Object.values(monthlyOutputMap).slice(-6);
  if (outputChartData.length === 0) {
    outputChartData.push(
      { month: "Jan", units: 120 },
      { month: "Feb", units: 240 },
      { month: "Mar", units: 380 },
      { month: "Apr", units: 450 },
      { month: "May", units: 520 }
    );
  }

  // Sort orders newest first
  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : a.createdDate ? new Date(a.createdDate).getTime() : a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : b.createdDate ? new Date(b.createdDate).getTime() : b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      if (timeA !== timeB && timeA > 0 && timeB > 0) {
        return timeB - timeA;
      }
      const numA = Number(String(a.id || a.orderNumber || "").replace(/\D/g, "")) || 0;
      const numB = Number(String(b.id || b.orderNumber || "").replace(/\D/g, "")) || 0;
      return numB - numA;
    });
  }, [orders]);

  return (
    <div style={{ padding: "16px 24px", maxWidth: "1400px", margin: "0 auto", boxSizing: "border-box" }}>
      {/* Header Banner */}
      <div className="production-banner" style={{
        background: "linear-gradient(135deg, #78350F 0%, #D97706 100%)",
        borderRadius: "16px",
        padding: "24px 32px",
        color: "#FFFFFF",
        marginBottom: "28px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "0 10px 25px -5px rgba(217, 119, 6, 0.3)"
      }}>
        <div>
          <span style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", background: "rgba(255, 255, 255, 0.2)", padding: "4px 10px", borderRadius: "12px", fontWeight: 600 }}>
            Production Module Dashboard
          </span>
          <h1 style={{ fontSize: "24px", fontWeight: 700, marginTop: "8px", marginBottom: "4px", color: "#FFFFFF" }}>
            Manufacturing & Assembly Pipeline
          </h1>
          <p style={{ fontSize: "13px", opacity: 0.9, margin: 0 }}>
            Monitor live battery assembly lines, quality assurance testing, throughput rate, and finished inventory.
          </p>
        </div>
        <div className="production-banner-actions" style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={fetchProductionDataHandler}
            style={{
              background: "rgba(255, 255, 255, 0.15)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              color: "#FFFFFF",
              padding: "10px 16px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              fontWeight: 500,
              backdropFilter: "blur(4px)"
            }}
          >
            <RefreshCw size={16} className={loading ? "spin" : ""} /> Refresh Data
          </button>
          <button
            onClick={() => navigate("/dashboard/orders")}
            style={{
              background: "#FFFFFF",
              color: "#C2410C",
              border: "none",
              padding: "10px 18px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            Production Queue <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "28px" }}>
        <StatCard
          label="Active Assembly Orders"
          icon={Wrench}
          value={inProductionCount}
          subtitle="Currently on Assembly Line"
          iconBg="#FEF3C7"
          iconColor="#D97706"
          loading={loading}
        />
        <StatCard
          label="Completed Batches"
          icon={CheckCircle2}
          value={completedCount}
          subtitle="Ready for SCM / Dispatched"
          iconBg="#ECFDF5"
          iconColor="#059669"
          loading={loading}
        />
        <StatCard
          label="Total Units in Pipeline"
          icon={Layers}
          value={totalUnitsInProduction}
          subtitle="Cumulative Battery Pack Volume"
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          loading={loading}
        />
        <StatCard
          label="Throughput Efficiency"
          icon={Cpu}
          value={`${throughputRate}%`}
          subtitle="Assembly Completion Rate"
          iconBg="#F3E8FF"
          iconColor="#7C3AED"
          loading={loading}
        />
      </div>

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "28px" }}>
        <div style={{ background: "#FFFFFF", padding: "20px", borderRadius: "12px", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#111827", marginBottom: "16px" }}>
            Manufacturing Stage Distribution
          </h3>
          <div style={{ height: "260px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageData} layout="vertical">
                <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                <YAxis dataKey="stage" type="category" stroke="#9CA3AF" fontSize={12} width={110} />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {stageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Output Trend Chart */}
        <div style={{ background: "#FFFFFF", padding: "20px", borderRadius: "12px", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#111827", marginBottom: "16px" }}>
            Monthly Battery Assembly Throughput (Units)
          </h3>
          <div style={{ height: "260px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={outputChartData}>
                <defs>
                  <linearGradient id="prodGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D97706" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#D97706" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip />
                <Area type="monotone" dataKey="units" name="Battery Units" stroke="#D97706" strokeWidth={3} fillOpacity={1} fill="url(#prodGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Production Queue Table */}
      <div style={{ background: "#FFFFFF", borderRadius: "12px", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#111827", margin: 0 }}>
              Active Manufacturing Queue
            </h3>
            <span style={{ fontSize: "12px", color: "#6B7280" }}>
              Orders currently undergoing production, assembly, or QA testing
            </span>
          </div>
          <button
            onClick={() => navigate("/dashboard/orders")}
            style={{ fontSize: "13px", color: "#D97706", fontWeight: 600, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
          >
            Manage Production Queue <ArrowRight size={14} />
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "30px", color: "#6B7280" }}>Loading production queue...</div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px", color: "#6B7280" }}>No active manufacturing orders.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>Order Number</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>Product / Battery</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>Batch Quantity</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>Production Stage</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>Priority</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedOrders.slice(0, 6).map((order) => (
                  <tr key={order.id || order.orderNumber} style={{ borderBottom: "1px solid #F3F4F6" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 600, color: "#111827" }}>{order.orderNumber}</td>
                    <td style={{ padding: "12px 16px", color: "#4B5563" }}>{order.batteryModel || order.product || "EV Battery Unit"}</td>
                    <td style={{ padding: "12px 16px", fontWeight: 600, color: "#111827" }}>
                      {Array.isArray(order.orderItems) && order.orderItems.length > 0
                        ? `${order.orderItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)} units`
                        : `${order.quantity || 1} units`}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: 600,
                          background:
                            order.productionStatus === "completed" || order.orderStatus === "production_complete"
                              ? "#ECFDF5"
                              : order.productionStatus === "testing"
                                ? "#F3E8FF"
                                : "#FEF3C7",
                          color:
                            order.productionStatus === "completed" || order.orderStatus === "production_complete"
                              ? "#047857"
                              : order.productionStatus === "testing"
                                ? "#6D28D9"
                                : "#B45309"
                        }}
                      >
                        {(order.productionStatus || order.orderStatus || "in_progress").replace("_", " ").toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          color: (order.priority || "").toLowerCase() === "high" ? "#DC2626" : "#059669"
                        }}
                      >
                        {(order.priority || "Medium").toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <button
                        onClick={() => navigate("/dashboard/orders")}
                        style={{
                          padding: "4px 10px",
                          fontSize: "12px",
                          background: "#FEF3C7",
                          color: "#92400E",
                          border: "1px solid #FDE68A",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontWeight: 500
                        }}
                      >
                        Update Stage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
