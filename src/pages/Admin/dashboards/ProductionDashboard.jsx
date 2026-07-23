import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { orderService } from "../../../services/orderService";
import { ResponsiveContainer, BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { RefreshCw, ArrowRight, Wrench, CheckCircle2, AlertTriangle, Cpu, Layers } from "lucide-react";

export default function ProductionDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProductionData = async () => {
    setLoading(true);
    setError(null);
    try {
      let data = [];
      try {
        data = await orderService.productionGetOrders();
      } catch (err) {
        data = await orderService.adminGetAllOrders();
      }
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load production dashboard data:", err);
      setError(err.message || "Failed to load production data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductionData();
  }, []);

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
    return sum + (Number(o.quantity) || 1);
  }, 0);

  const throughputRate = totalOrders > 0 ? Math.round((completedCount / totalOrders) * 100) : 100;

  // Chart 1: Production Stage Breakdown
  const stageData = [
    { stage: "Sales Registered", count: orders.filter((o) => o.orderStatus === "sales_registered").length, fill: "#F59E0B" },
    { stage: "In Assembly", count: inProductionCount, fill: "#3B82F6" },
    { stage: "Quality Testing", count: testingCount, fill: "#8B5CF6" },
    { stage: "Prod Complete", count: completedCount, fill: "#10B981" },
  ];

  // Chart 2: Output Trend
  const outputChartData = [
    { month: "Jan", units: 120 },
    { month: "Feb", units: 180 },
    { month: "Mar", units: 250 },
    { month: "Apr", units: 310 },
    { month: "May", units: 290 },
    { month: "Jun", units: 410 },
  ];

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #78350F 0%, #D97706 100%)",
          borderRadius: "16px",
          padding: "24px 32px",
          color: "#FFFFFF",
          marginBottom: "28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 10px 25px -5px rgba(217, 119, 6, 0.3)"
        }}
      >
        <div>
          <span style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", background: "rgba(255, 255, 255, 0.2)", padding: "4px 10px", borderRadius: "12px", fontWeight: 600 }}>
            Production Module Dashboard
          </span>
          <h1 style={{ fontSize: "26px", fontWeight: 700, marginTop: "8px", marginBottom: "4px", color: "#FFFFFF" }}>
            Manufacturing & Production Assembly
          </h1>
          <p style={{ fontSize: "14px", opacity: 0.9, margin: 0 }}>
            Monitor battery assembly stages, quality testing, batch throughput, and completion queues.
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={fetchProductionData}
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
              color: "#78350F",
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px", marginBottom: "28px" }}>
        <div style={{ background: "#FFFFFF", padding: "20px", borderRadius: "12px", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "#6B7280", fontWeight: 500 }}>Active In Assembly</span>
            <div style={{ padding: "8px", background: "#EFF6FF", borderRadius: "8px", color: "#2563EB" }}>
              <Cpu size={20} />
            </div>
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#111827", marginTop: "12px" }}>
            {loading ? "..." : inProductionCount}
          </div>
          <span style={{ fontSize: "12px", color: "#2563EB", fontWeight: 500, marginTop: "4px", display: "inline-block" }}>
            Orders Being Manufactured
          </span>
        </div>

        <div style={{ background: "#FFFFFF", padding: "20px", borderRadius: "12px", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "#6B7280", fontWeight: 500 }}>Quality Testing Stage</span>
            <div style={{ padding: "8px", background: "#F3E8FF", borderRadius: "8px", color: "#8B5CF6" }}>
              <Wrench size={20} />
            </div>
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#111827", marginTop: "12px" }}>
            {loading ? "..." : testingCount}
          </div>
          <span style={{ fontSize: "12px", color: "#8B5CF6", marginTop: "4px", display: "inline-block" }}>
            Under QA Inspection
          </span>
        </div>

        <div style={{ background: "#FFFFFF", padding: "20px", borderRadius: "12px", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "#6B7280", fontWeight: 500 }}>Production Complete</span>
            <div style={{ padding: "8px", background: "#ECFDF5", borderRadius: "8px", color: "#059669" }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#111827", marginTop: "12px" }}>
            {loading ? "..." : completedCount}
          </div>
          <span style={{ fontSize: "12px", color: "#059669", marginTop: "4px", display: "inline-block" }}>
            Ready for SCM Handover
          </span>
        </div>

        <div style={{ background: "#FFFFFF", padding: "20px", borderRadius: "12px", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "#6B7280", fontWeight: 500 }}>Total Units Output</span>
            <div style={{ padding: "8px", background: "#FEF3C7", borderRadius: "8px", color: "#D97706" }}>
              <Layers size={20} />
            </div>
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#111827", marginTop: "12px" }}>
            {loading ? "..." : totalUnitsInProduction}
          </div>
          <span style={{ fontSize: "12px", color: "#D97706", marginTop: "4px", display: "inline-block" }}>
            Cumulative Units Manufactured
          </span>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "28px" }}>
        {/* Stage Breakdown Bar Chart */}
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
                    <cell key={`cell-${index}`} fill={entry.fill} />
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
                {orders.slice(0, 6).map((order) => (
                  <tr key={order.id || order.orderNumber} style={{ borderBottom: "1px solid #F3F4F6" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 600, color: "#111827" }}>{order.orderNumber}</td>
                    <td style={{ padding: "12px 16px", color: "#4B5563" }}>{order.batteryModel || order.product || "EV Battery Unit"}</td>
                    <td style={{ padding: "12px 16px", fontWeight: 600, color: "#111827" }}>{order.quantity || 1} units</td>
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
