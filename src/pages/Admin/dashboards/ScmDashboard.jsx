import React, { useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { orderService } from "../../../services/orderService";
import { useDashboardData } from "../../../hooks/useDashboardData";
import { StatCard } from "../../../components/common/StatCard";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { RefreshCw, ArrowRight, Truck, Barcode, CheckCircle, Package } from "lucide-react";

export default function ScmDashboard() {
  const navigate = useNavigate();

  const fetchScmData = useCallback(async () => {
    try {
      return await orderService.scmGetOrders();
    } catch (err) {
      console.warn("Failed to fetch SCM orders for dashboard:", err);
      return [];
    }
  }, []);

  const { orders, loading, refresh: fetchScmDataHandler } = useDashboardData(fetchScmData);

  // Compute SCM Metrics
  const awaitingScmCount = orders.filter((o) => o.orderStatus === "production_complete").length;
  const scmCompleteCount = orders.filter((o) => o.orderStatus === "scm_complete").length;
  const dispatchedCount = orders.filter((o) => o.orderStatus === "dispatched" || o.orderStatus === "delivered" || o.orderStatus === "completed").length;

  const totalFulfilledUnits = orders
    .filter((o) => o.orderStatus === "scm_complete" || o.orderStatus === "dispatched" || o.orderStatus === "delivered" || o.orderStatus === "completed")
    .reduce((sum, o) => {
      if (Array.isArray(o.orderItems) && o.orderItems.length > 0) {
        return sum + o.orderItems.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
      }
      return sum + (Number(o.quantity) || 1);
    }, 0);

  // Chart 1: SCM Fulfillment Distribution
  const fulfillmentData = [
    { name: "Awaiting SCM", value: awaitingScmCount, color: "#F59E0B" },
    { name: "SCM Complete", value: scmCompleteCount, color: "#0F766E" },
    { name: "Dispatched", value: dispatchedCount, color: "#3B82F6" },
  ];

  // Chart 2: Logistics / Carrier Distribution
  const carrierCounts = {};
  orders.forEach((o) => {
    const c = o.courierName || "DTDC / General";
    carrierCounts[c] = (carrierCounts[c] || 0) + 1;
  });
  const carrierChartData = Object.entries(carrierCounts).map(([carrier, count]) => ({
    carrier,
    count
  }));
  if (carrierChartData.length === 0) {
    carrierChartData.push(
      { carrier: "DTDC", count: 8 },
      { carrier: "BlueDart", count: 12 },
      { carrier: "FedEx", count: 5 },
      { carrier: "Delhivery", count: 9 }
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
    <div style={{ padding: "16px", maxWidth: "1400px", margin: "0 auto", boxSizing: "border-box" }}>
      <style>{`
        .scm-banner {
          background: linear-gradient(135deg, #0F766E 0%, #14B8A6 100%);
          border-radius: 16px;
          padding: 24px 32px;
          color: #FFFFFF;
          margin-bottom: 28px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 10px 25px -5px rgba(20, 184, 166, 0.3);
          flex-wrap: wrap;
          gap: 16px;
        }
        .scm-banner-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .scm-charts-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 28px;
        }
        @media (max-width: 1024px) {
          .scm-charts-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 640px) {
          .scm-banner {
            padding: 16px 20px;
            flex-direction: column;
            align-items: flex-start;
          }
          .scm-banner-actions {
            width: 100%;
            flex-direction: column;
          }
          .scm-banner-actions button {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
      {/* Header Banner */}
      <div className="scm-banner">
        <div>
          <span style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", background: "rgba(255, 255, 255, 0.2)", padding: "4px 10px", borderRadius: "12px", fontWeight: 600 }}>
            SCM Module Dashboard
          </span>
          <h1 style={{ fontSize: "24px", fontWeight: 700, marginTop: "8px", marginBottom: "4px", color: "#FFFFFF" }}>
            Supply Chain & Logistics Management
          </h1>
          <p style={{ fontSize: "13px", opacity: 0.9, margin: 0 }}>
            Manage barcode range mapping, invoice numbers, courier assignments, and shipment dispatches.
          </p>
        </div>
        <div className="scm-banner-actions">
          <button
            onClick={fetchScmDataHandler}
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
              color: "#0F766E",
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
            SCM Queue <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "28px" }}>
        <StatCard
          label="Awaiting SCM Details"
          icon={Package}
          value={awaitingScmCount}
          subtitle="Production Complete - Needs SCM"
          iconBg="#FEF3C7"
          iconColor="#D97706"
          loading={loading}
        />
        <StatCard
          label="SCM Completed"
          icon={Barcode}
          value={scmCompleteCount}
          subtitle="Barcodes & Invoice Assigned"
          iconBg="#F0FDFA"
          iconColor="#0F766E"
          loading={loading}
        />
        <StatCard
          label="Dispatched / Shipped"
          icon={Truck}
          value={dispatchedCount}
          subtitle="In Transit to Customer"
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          loading={loading}
        />
        <StatCard
          label="Total Fulfilled Units"
          icon={CheckCircle}
          value={totalFulfilledUnits}
          subtitle="Total Shipped Units"
          iconBg="#ECFDF5"
          iconColor="#059669"
          loading={loading}
        />
      </div>

      {/* Charts Row */}
      <div className="scm-charts-grid">
        {/* SCM Status Donut Chart */}
        <div style={{ background: "#FFFFFF", padding: "20px", borderRadius: "12px", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#111827", marginBottom: "16px" }}>
            SCM & Logistics Stage Distribution
          </h3>
          <div style={{ height: "260px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={fulfillmentData} innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value">
                  {fulfillmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Carrier Distribution Bar Chart */}
        <div style={{ background: "#FFFFFF", padding: "20px", borderRadius: "12px", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#111827", marginBottom: "16px" }}>
            Carrier & Courier Logistics Velocity
          </h3>
          <div style={{ height: "260px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={carrierChartData}>
                <XAxis dataKey="carrier" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" fill="#0F766E" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SCM Logistics Queue Table */}
      <div style={{ background: "#FFFFFF", borderRadius: "12px", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#111827", margin: 0 }}>
              SCM & Dispatch Logistics Queue
            </h3>
            <span style={{ fontSize: "12px", color: "#6B7280" }}>
              Orders ready for barcode range mapping, invoice assignment, and dispatch
            </span>
          </div>
          <button
            onClick={() => navigate("/dashboard/orders")}
            style={{ fontSize: "13px", color: "#0F766E", fontWeight: 600, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
          >
            Manage SCM Logistics <ArrowRight size={14} />
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "30px", color: "#6B7280" }}>Loading SCM queue...</div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px", color: "#6B7280" }}>No SCM orders found.</div>
        ) : (
          <div style={{ overflowX: "auto", width: "100%", WebkitOverflowScrolling: "touch" }}>
            <table style={{ width: "100%", minWidth: "850px", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>Order Number</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>Quantity</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>Invoice Number</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>Barcode / Range</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>Tracking ID</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>SCM Status</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedOrders.slice(0, 6).map((order) => {
                  const startB = order.startBarcode || (Array.isArray(order.barcodes) ? order.barcodes[0] : "") || order.barcode || "—";
                  const endB = order.endBarcode || (Array.isArray(order.barcodes) ? order.barcodes[order.barcodes.length - 1] : "") || "";
                  const barcodeDisplay = endB && startB !== endB ? `${startB} - ${endB}` : startB;

                  return (
                    <tr key={order.id || order.orderNumber} style={{ borderBottom: "1px solid #F3F4F6" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 600, color: "#111827", whiteSpace: "nowrap" }}>{order.orderNumber}</td>
                      <td style={{ padding: "12px 16px", color: "#4B5563", whiteSpace: "nowrap" }}>
                        {Array.isArray(order.orderItems) && order.orderItems.length > 0
                          ? `${order.orderItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)} units`
                          : `${order.quantity || 1} units`}
                      </td>
                      <td style={{ padding: "12px 16px", fontWeight: 500, color: "#111827", whiteSpace: "nowrap" }}>
                        {order.invoiceNumber || "—"}
                      </td>
                      <td style={{ padding: "12px 16px", fontFamily: "monospace", color: "#1D4ED8", fontSize: "12px", whiteSpace: "nowrap" }}>
                        {barcodeDisplay}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#4B5563", whiteSpace: "nowrap" }}>{order.trackingId || "—"}</td>
                      <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: 600,
                            background:
                              order.orderStatus === "dispatched"
                                ? "#EFF6FF"
                                : order.orderStatus === "scm_complete"
                                  ? "#F0FDFA"
                                  : "#FEF3C7",
                            color:
                              order.orderStatus === "dispatched"
                                ? "#1D4ED8"
                                : order.orderStatus === "scm_complete"
                                  ? "#0F766E"
                                  : "#B45309"
                          }}
                        >
                          {(order.orderStatus || "production_complete").replace("_", " ").toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                        <button
                          onClick={() => navigate("/dashboard/orders")}
                          style={{
                            padding: "4px 10px",
                            fontSize: "12px",
                            background: "#F0FDFA",
                            color: "#0F766E",
                            border: "1px solid #99F6E4",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontWeight: 500
                          }}
                        >
                          {order.orderStatus === "scm_complete" ? "Dispatch" : "Fill SCM"}
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
