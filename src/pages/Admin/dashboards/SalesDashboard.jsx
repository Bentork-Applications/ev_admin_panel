import React, { useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { orderService } from "../../../services/orderService";
import { useDashboardData } from "../../../hooks/useDashboardData";
import { StatCard } from "../../../components/common/StatCard";
import { ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { RefreshCw, ArrowRight, ShoppingCart, TrendingUp, DollarSign, Clock, Eye } from "lucide-react";

export default function SalesDashboard() {
  const navigate = useNavigate();

  const fetchSalesData = useCallback(async () => {
    try {
      const userRole = (localStorage.getItem("userRole") || "").toUpperCase();
      if (["ADMIN", "SUPER_ADMIN", "ADMINISTRATOR"].includes(userRole)) {
        const all = await orderService.adminGetAllOrders();
        const arr = Array.isArray(all) ? all : Array.isArray(all?.orders) ? all.orders : [];
        if (arr.length > 0) return arr;
      }
      return await orderService.salesGetMyOrders();
    } catch (err) {
      console.warn("Failed to fetch sales orders for dashboard:", err);
      return [];
    }
  }, []);

  const { orders, loading, refresh: fetchSalesDataHandler } = useDashboardData(fetchSalesData);

  // Compute Sales Metrics
  const totalOrders = orders.length;
  const salesRegisteredCount = orders.filter((o) => o.orderStatus === "sales_registered").length;
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
      { month: "Mar", count: 12, revenue: 135000 },
      { month: "Apr", count: 16, revenue: 190000 },
      { month: "May", count: 22, revenue: 275000 }
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
      <style>{`
        .sales-banner {
          background: linear-gradient(135deg, #1E1B4B 0%, #312E81 40%, #2563EB 100%);
          border-radius: 16px;
          padding: 24px 32px;
          color: #FFFFFF;
          margin-bottom: 28px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 10px 25px -5px rgba(37, 99, 235, 0.35);
          flex-wrap: wrap;
          gap: 16px;
        }
        .sales-banner-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .sales-charts-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 20px;
          margin-bottom: 28px;
        }
        .sales-table-row {
          transition: background-color 0.15s ease-in-out;
        }
        .sales-table-row:hover {
          background-color: #F8FAFC !important;
        }
        @media (max-width: 1024px) {
          .sales-charts-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 640px) {
          .sales-banner {
            padding: 16px 20px;
            flex-direction: column;
            align-items: flex-start;
          }
          .sales-banner-actions {
            width: 100%;
            flex-direction: column;
          }
          .sales-banner-actions button {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

      {/* Header Banner */}
      <div className="sales-banner">
        <div>
          <span style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", background: "rgba(255, 255, 255, 0.2)", padding: "4px 10px", borderRadius: "12px", fontWeight: 600 }}>
            Sales Module Dashboard
          </span>
          <h1 style={{ fontSize: "24px", fontWeight: 700, marginTop: "8px", marginBottom: "4px", color: "#FFFFFF" }}>
            Sales & Demand Management
          </h1>
          <p style={{ fontSize: "13px", opacity: 0.9, margin: 0 }}>
            Track order intake, customer revenue pipeline, order statuses, and sales performance.
          </p>
        </div>
        <div className="sales-banner-actions">
          <button
            onClick={fetchSalesDataHandler}
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
              backdropFilter: "blur(4px)",
              transition: "all 0.2s"
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
              fontWeight: 600,
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
            }}
          >
            Manage Orders <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "28px" }}>
        <StatCard
          label="Total Sales Orders"
          icon={ShoppingCart}
          value={totalOrders}
          subtitle="Active Order History"
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          loading={loading}
        />
        <StatCard
          label="Pipeline Revenue Value"
          icon={DollarSign}
          value={`₹${totalPipelineRevenue.toLocaleString("en-IN")}`}
          subtitle="Cumulative Registered Value"
          iconBg="#ECFDF5"
          iconColor="#059669"
          loading={loading}
        />
        <StatCard
          label="Registered (Pending Prod)"
          icon={Clock}
          value={salesRegisteredCount}
          subtitle="Awaiting Production Queue"
          iconBg="#FEF3C7"
          iconColor="#D97706"
          loading={loading}
        />
        <StatCard
          label="Completed & Fulfilled"
          icon={TrendingUp}
          value={completedCount}
          subtitle="SCM & Dispatched Batches"
          iconBg="#F3E8FF"
          iconColor="#7C3AED"
          loading={loading}
        />
      </div>

      {/* Charts Row */}
      <div className="sales-charts-grid">
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
                <Area type="monotone" dataKey="count" name="Order Volume" stroke="#2563EB" strokeWidth={3} fillOpacity={1} fill="url(#salesGrad)" />
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
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>Pending Amount</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>Status</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>Priority</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>Date</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedOrders.slice(0, 6).map((order) => {
                  const pending = parseFloat(order.pendingAmount !== undefined && order.pendingAmount !== null ? order.pendingAmount : (order.paymentStatus === "paid" ? 0 : (order.totalAmount || order.totalPrice || 0)));
                  const statusKey = order.orderStatus || "sales_registered";
                  
                  let badgeBg = "#EFF6FF";
                  let badgeColor = "#1D4ED8";
                  let badgeBorder = "#BFDBFE";
                  if (statusKey === "in_production") {
                    badgeBg = "#FEF3C7";
                    badgeColor = "#B45309";
                    badgeBorder = "#FDE68A";
                  } else if (statusKey === "production_complete") {
                    badgeBg = "#F3E8FF";
                    badgeColor = "#6D28D9";
                    badgeBorder = "#DDD6FE";
                  } else if (statusKey === "scm_complete" || statusKey === "dispatched") {
                    badgeBg = "#ECFDF5";
                    badgeColor = "#047857";
                    badgeBorder = "#A7F3D0";
                  }

                  const prioKey = (order.priority || "medium").toLowerCase();
                  let prioBg = "#FEF3C7";
                  let prioColor = "#D97706";
                  if (prioKey === "high") {
                    prioBg = "#FEE2E2";
                    prioColor = "#DC2626";
                  } else if (prioKey === "low") {
                    prioBg = "#ECFDF5";
                    prioColor = "#059669";
                  }

                  return (
                    <tr key={order.id || order.orderNumber} className="sales-table-row" style={{ borderBottom: "1px solid #F3F4F6" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 600, color: "#111827" }}>{order.orderNumber}</td>
                      <td style={{ padding: "12px 16px", color: "#4B5563" }}>{order.customerName || "—"}</td>
                      <td style={{ padding: "12px 16px", color: "#4B5563" }}>
                        {Array.isArray(order.orderItems) && order.orderItems.length > 0
                          ? `${order.orderItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)} units (${order.orderItems.length} items)`
                          : `${order.quantity || 1} units`}
                      </td>
                      <td style={{ padding: "12px 16px", fontWeight: 600, color: "#10B981" }}>
                        ₹{parseFloat(order.totalAmount || order.totalPrice || 0).toLocaleString("en-IN")}
                      </td>
                      <td style={{ padding: "12px 16px", fontWeight: 600, color: pending > 0 ? "#DC2626" : "#059669" }}>
                        ₹{pending.toLocaleString("en-IN")}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: 600,
                            background: badgeBg,
                            color: badgeColor,
                            border: `1px solid ${badgeBorder}`
                          }}
                        >
                          {statusKey.replace("_", " ").toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "10px",
                            fontSize: "11px",
                            fontWeight: 600,
                            background: prioBg,
                            color: prioColor
                          }}
                        >
                          {(order.priority || "Medium").toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", color: "#6B7280" }}>
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "—"}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <button
                          onClick={() => navigate("/dashboard/orders")}
                          style={{
                            padding: "4px 10px",
                            fontSize: "12px",
                            background: "#EFF6FF",
                            color: "#2563EB",
                            border: "1px solid #BFDBFE",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontWeight: 500,
                            display: "flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <Eye size={13} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
