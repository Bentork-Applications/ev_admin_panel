import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { orderService } from "../../../services/orderService";
import { ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { RefreshCw, ArrowRight, ShoppingCart, TrendingUp, DollarSign, Clock } from "lucide-react";

export default function SalesDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSalesData = async () => {
    setLoading(true);
    setError(null);
    try {
      let data = [];
      try {
        data = await orderService.salesGetMyOrders();
      } catch (err) {
        data = await orderService.adminGetAllOrders();
      }
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load sales dashboard data:", err);
      setError(err.message || "Failed to load sales data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, []);

  // Compute Sales Metrics
  const totalOrders = orders.length;
  const salesRegisteredCount = orders.filter((o) => o.orderStatus === "sales_registered").length;
  const inProductionCount = orders.filter((o) => o.orderStatus === "in_production").length;
  const completedCount = orders.filter((o) => o.orderStatus === "scm_complete" || o.orderStatus === "dispatched").length;

  const totalPipelineRevenue = orders.reduce((sum, o) => {
    const amt = parseFloat(o.totalAmount || o.totalPrice || 0);
    return sum + (isNaN(amt) ? 0 : amt);
  }, 0);

  // Chart 1: Priority Breakdown
  const priorityCounts = { High: 0, Medium: 0, Low: 0 };
  orders.forEach((o) => {
    const p = (o.priority || "medium").toLowerCase();
    if (p === "high") priorityCounts.High++;
    else if (p === "low") priorityCounts.Low++;
    else priorityCounts.Medium++;
  });

  const priorityChartData = [
    { name: "High Priority", value: priorityCounts.High, color: "#EF4444" },
    { name: "Medium Priority", value: priorityCounts.Medium, color: "#F59E0B" },
    { name: "Low Priority", value: priorityCounts.Low, color: "#10B981" },
  ];

  // Chart 2: Monthly Order Volume
  const monthlyDataMap = {};
  orders.forEach((o) => {
    const d = o.createdAt ? new Date(o.createdAt) : new Date();
    const month = d.toLocaleString("default", { month: "short" });
    if (!monthlyDataMap[month]) monthlyDataMap[month] = { month, count: 0, revenue: 0 };
    monthlyDataMap[month].count += 1;
    monthlyDataMap[month].revenue += parseFloat(o.totalAmount || 0) || 0;
  });
  const monthlyChartData = Object.values(monthlyDataMap).slice(-6);
  if (monthlyChartData.length === 0) {
    monthlyChartData.push(
      { month: "Jan", count: 4, revenue: 45000 },
      { month: "Feb", count: 7, revenue: 82000 },
      { month: "Mar", count: 12, revenue: 135000 }
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)",
          borderRadius: "16px",
          padding: "24px 32px",
          color: "#FFFFFF",
          marginBottom: "28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.3)"
        }}
      >
        <div>
          <span style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", background: "rgba(255, 255, 255, 0.2)", padding: "4px 10px", borderRadius: "12px", fontWeight: 600 }}>
            Sales Module Dashboard
          </span>
          <h1 style={{ fontSize: "26px", fontWeight: 700, marginTop: "8px", marginBottom: "4px", color: "#FFFFFF" }}>
            Sales & Demand Management
          </h1>
          <p style={{ fontSize: "14px", opacity: 0.9, margin: 0 }}>
            Track order intake, customer revenue pipeline, order statuses, and sales performance.
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={fetchSalesData}
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
              color: "#1E3A8A",
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
            Manage Orders <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px", marginBottom: "28px" }}>
        <div style={{ background: "#FFFFFF", padding: "20px", borderRadius: "12px", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "#6B7280", fontWeight: 500 }}>Total Sales Orders</span>
            <div style={{ padding: "8px", background: "#EFF6FF", borderRadius: "8px", color: "#2563EB" }}>
              <ShoppingCart size={20} />
            </div>
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#111827", marginTop: "12px" }}>
            {loading ? "..." : totalOrders}
          </div>
          <span style={{ fontSize: "12px", color: "#10B981", fontWeight: 500, marginTop: "4px", display: "inline-block" }}>
            Active Order History
          </span>
        </div>

        <div style={{ background: "#FFFFFF", padding: "20px", borderRadius: "12px", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "#6B7280", fontWeight: 500 }}>Pipeline Revenue Value</span>
            <div style={{ padding: "8px", background: "#ECFDF5", borderRadius: "8px", color: "#059669" }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#111827", marginTop: "12px" }}>
            ₹{loading ? "..." : totalPipelineRevenue.toLocaleString("en-IN")}
          </div>
          <span style={{ fontSize: "12px", color: "#6B7280", marginTop: "4px", display: "inline-block" }}>
            Cumulative Registered Value
          </span>
        </div>

        <div style={{ background: "#FFFFFF", padding: "20px", borderRadius: "12px", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "#6B7280", fontWeight: 500 }}>Registered (Pending Prod)</span>
            <div style={{ padding: "8px", background: "#FEF3C7", borderRadius: "8px", color: "#D97706" }}>
              <Clock size={20} />
            </div>
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#111827", marginTop: "12px" }}>
            {loading ? "..." : salesRegisteredCount}
          </div>
          <span style={{ fontSize: "12px", color: "#D97706", marginTop: "4px", display: "inline-block" }}>
            Awaiting Production Queue
          </span>
        </div>

        <div style={{ background: "#FFFFFF", padding: "20px", borderRadius: "12px", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "#6B7280", fontWeight: 500 }}>Completed & Fulfilled</span>
            <div style={{ padding: "8px", background: "#F3E8FF", borderRadius: "8px", color: "#7C3AED" }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#111827", marginTop: "12px" }}>
            {loading ? "..." : completedCount}
          </div>
          <span style={{ fontSize: "12px", color: "#10B981", marginTop: "4px", display: "inline-block" }}>
            SCM & Dispatched Batches
          </span>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px", marginBottom: "28px" }}>
        {/* Trend Area Chart */}
        <div style={{ background: "#FFFFFF", padding: "20px", borderRadius: "12px", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#111827", marginBottom: "16px" }}>
            Sales Order Intake Trend
          </h3>
          <div style={{ height: "260px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyChartData}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip />
                <Area type="monotone" dataKey="count" name="Order Volume" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#salesGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Donut Chart */}
        <div style={{ background: "#FFFFFF", padding: "20px", borderRadius: "12px", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#111827", marginBottom: "16px" }}>
            Orders by Priority
          </h3>
          <div style={{ height: "260px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={priorityChartData} innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value">
                  {priorityChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Sales Queue Table */}
      <div style={{ background: "#FFFFFF", borderRadius: "12px", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#111827", margin: 0 }}>
              Recent Sales Orders Queue
            </h3>
            <span style={{ fontSize: "12px", color: "#6B7280" }}>
              Latest customer demand orders registered in the system
            </span>
          </div>
          <button
            onClick={() => navigate("/dashboard/orders")}
            style={{ fontSize: "13px", color: "#2563EB", fontWeight: 600, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
          >
            View All Orders <ArrowRight size={14} />
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "30px", color: "#6B7280" }}>Loading sales queue...</div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px", color: "#6B7280" }}>No sales orders found.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>Order Number</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>Customer Name</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>Quantity</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>Total Amount</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>Status</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>Priority</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 5).map((order) => (
                  <tr key={order.id || order.orderNumber} style={{ borderBottom: "1px solid #F3F4F6" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 600, color: "#111827" }}>{order.orderNumber}</td>
                    <td style={{ padding: "12px 16px", color: "#4B5563" }}>{order.customerName || "—"}</td>
                    <td style={{ padding: "12px 16px", color: "#4B5563" }}>{order.quantity || 1} units</td>
                    <td style={{ padding: "12px 16px", fontWeight: 600, color: "#10B981" }}>
                      ₹{parseFloat(order.totalAmount || order.totalPrice || 0).toLocaleString("en-IN")}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: 600,
                          background: order.orderStatus === "sales_registered" ? "#EFF6FF" : "#ECFDF5",
                          color: order.orderStatus === "sales_registered" ? "#1D4ED8" : "#047857"
                        }}
                      >
                        {(order.orderStatus || "registered").replace("_", " ").toUpperCase()}
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
                    <td style={{ padding: "12px 16px", color: "#6B7280" }}>
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "—"}
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
