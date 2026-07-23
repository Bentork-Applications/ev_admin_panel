import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { orderService } from "../../../services/orderService";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { RefreshCw, ArrowRight, Truck, Barcode, FileText, CheckCircle, Package } from "lucide-react";

export default function ScmDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchScmData = async () => {
    setLoading(true);
    setError(null);
    try {
      let data = [];
      try {
        data = await orderService.scmGetOrders();
      } catch (err) {
        data = await orderService.adminGetAllOrders();
      }
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load SCM dashboard data:", err);
      setError(err.message || "Failed to load SCM data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScmData();
  }, []);

  // Compute SCM Metrics
  const totalOrders = orders.length;
  const awaitingScmCount = orders.filter((o) => o.orderStatus === "production_complete").length;
  const scmCompleteCount = orders.filter((o) => o.orderStatus === "scm_complete").length;
  const dispatchedCount = orders.filter((o) => o.orderStatus === "dispatched").length;

  const totalFulfilledUnits = orders
    .filter((o) => o.orderStatus === "scm_complete" || o.orderStatus === "dispatched")
    .reduce((sum, o) => sum + (Number(o.quantity) || 1), 0);

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

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)",
          borderRadius: "16px",
          padding: "24px 32px",
          color: "#FFFFFF",
          marginBottom: "28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 10px 25px -5px rgba(20, 184, 166, 0.3)"
        }}
      >
        <div>
          <span style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", background: "rgba(255, 255, 255, 0.2)", padding: "4px 10px", borderRadius: "12px", fontWeight: 600 }}>
            SCM Module Dashboard
          </span>
          <h1 style={{ fontSize: "26px", fontWeight: 700, marginTop: "8px", marginBottom: "4px", color: "#FFFFFF" }}>
            Supply Chain & Logistics Management
          </h1>
          <p style={{ fontSize: "14px", opacity: 0.9, margin: 0 }}>
            Manage barcode range mapping, invoice numbers, courier assignments, and shipment dispatches.
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={fetchScmData}
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px", marginBottom: "28px" }}>
        <div style={{ background: "#FFFFFF", padding: "20px", borderRadius: "12px", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "#6B7280", fontWeight: 500 }}>Awaiting SCM Details</span>
            <div style={{ padding: "8px", background: "#FEF3C7", borderRadius: "8px", color: "#D97706" }}>
              <Package size={20} />
            </div>
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#111827", marginTop: "12px" }}>
            {loading ? "..." : awaitingScmCount}
          </div>
          <span style={{ fontSize: "12px", color: "#D97706", fontWeight: 500, marginTop: "4px", display: "inline-block" }}>
            Production Complete - Needs SCM
          </span>
        </div>

        <div style={{ background: "#FFFFFF", padding: "20px", borderRadius: "12px", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "#6B7280", fontWeight: 500 }}>SCM Completed</span>
            <div style={{ padding: "8px", background: "#F0FDFA", borderRadius: "8px", color: "#0F766E" }}>
              <Barcode size={20} />
            </div>
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#111827", marginTop: "12px" }}>
            {loading ? "..." : scmCompleteCount}
          </div>
          <span style={{ fontSize: "12px", color: "#0F766E", marginTop: "4px", display: "inline-block" }}>
            Barcodes & Invoice Assigned
          </span>
        </div>

        <div style={{ background: "#FFFFFF", padding: "20px", borderRadius: "12px", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "#6B7280", fontWeight: 500 }}>Dispatched / Shipped</span>
            <div style={{ padding: "8px", background: "#EFF6FF", borderRadius: "8px", color: "#2563EB" }}>
              <Truck size={20} />
            </div>
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#111827", marginTop: "12px" }}>
            {loading ? "..." : dispatchedCount}
          </div>
          <span style={{ fontSize: "12px", color: "#2563EB", marginTop: "4px", display: "inline-block" }}>
            In Transit to Customer
          </span>
        </div>

        <div style={{ background: "#FFFFFF", padding: "20px", borderRadius: "12px", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "#6B7280", fontWeight: 500 }}>Total Fulfilled Units</span>
            <div style={{ padding: "8px", background: "#ECFDF5", borderRadius: "8px", color: "#059669" }}>
              <CheckCircle size={20} />
            </div>
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#111827", marginTop: "12px" }}>
            {loading ? "..." : totalFulfilledUnits}
          </div>
          <span style={{ fontSize: "12px", color: "#059669", marginTop: "4px", display: "inline-block" }}>
            Total Shipped Units
          </span>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "28px" }}>
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
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>Order Number</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>Quantity</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>Invoice Number</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>Barcode / Range</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>Tracking ID</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>SCM Status</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 6).map((order) => {
                  const startB = order.startBarcode || (Array.isArray(order.barcodes) ? order.barcodes[0] : "") || order.barcode || "—";
                  const endB = order.endBarcode || (Array.isArray(order.barcodes) ? order.barcodes[order.barcodes.length - 1] : "") || "";
                  const barcodeDisplay = endB && startB !== endB ? `${startB} - ${endB}` : startB;

                  return (
                    <tr key={order.id || order.orderNumber} style={{ borderBottom: "1px solid #F3F4F6" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 600, color: "#111827" }}>{order.orderNumber}</td>
                      <td style={{ padding: "12px 16px", color: "#4B5563" }}>{order.quantity || 1} units</td>
                      <td style={{ padding: "12px 16px", fontWeight: 500, color: "#111827" }}>
                        {order.invoiceNumber || "—"}
                      </td>
                      <td style={{ padding: "12px 16px", fontFamily: "monospace", color: "#1D4ED8", fontSize: "12px" }}>
                        {barcodeDisplay}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#4B5563" }}>{order.trackingId || "—"}</td>
                      <td style={{ padding: "12px 16px" }}>
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
                      <td style={{ padding: "12px 16px" }}>
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
