import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  RefreshCw,
  ShoppingCart,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  CreditCard
} from "lucide-react";
import { orderService } from "../../../services/orderService";
import { Toast } from "../../../components/common/Toast";
import { CreateSalesOrderModal } from "../../../components/orders/CreateSalesOrderModal";

const PAGE_SIZE = 10;

export default function CrmOrdersPaymentsPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const userRole = (localStorage.getItem("userRole") || "").toUpperCase();
      let res = [];
      if (["ADMIN", "SUPER_ADMIN", "ADMINISTRATOR"].includes(userRole)) {
        const all = await orderService.adminGetAllOrders();
        res = Array.isArray(all) ? all : Array.isArray(all?.orders) ? all.orders : [];
      } else {
        res = await orderService.salesGetMyOrders();
      }
      setOrders(Array.isArray(res) ? res : []);
    } catch (err) {
      console.warn("Failed to load orders:", err);
      setError("Failed to load live orders");
      showToast("Failed to load live orders", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Compute metrics
  const totalValue = useMemo(() => {
    return orders.reduce((sum, o) => sum + (parseFloat(o.totalInvoiceAmount || o.totalAmount || o.totalPrice || 0) || 0), 0);
  }, [orders]);

  const totalReceived = useMemo(() => {
    return orders.reduce((sum, o) => sum + (parseFloat(o.receivedAmount || 0) || 0), 0);
  }, [orders]);

  const totalOutstanding = Math.max(0, totalValue - totalReceived);

  const overdueAmount = useMemo(() => {
    return orders.reduce((sum, o) => {
      const val = parseFloat(o.totalInvoiceAmount || o.totalAmount || o.totalPrice || 0) || 0;
      const rec = parseFloat(o.receivedAmount || 0) || 0;
      const out = Math.max(0, val - rec);
      if (out > 0 && o.dueDate && new Date(o.dueDate) < new Date()) {
        return sum + out;
      }
      return sum;
    }, 0);
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "ALL") {
        const val = parseFloat(o.totalInvoiceAmount || o.totalAmount || o.totalPrice || 0);
        const rec = parseFloat(o.receivedAmount || 0);
        const out = Math.max(0, val - rec);
        const isPaid = out === 0 || o.paymentStatus === "paid" || o.orderStatus === "delivered";

        if (statusFilter === "PAID" && !isPaid) return false;
        if (statusFilter === "DUE" && isPaid) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const po = (o.piNumber || o.orderNumber || `PO-${o.id}`).toLowerCase();
        const cust = (o.customerName || o.companyName || "").toLowerCase();
        if (!po.includes(q) && !cust.includes(q)) return false;
      }

      return true;
    });
  }, [orders, statusFilter, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery]);

  const totalPages = Math.ceil(filteredOrders.length / PAGE_SIZE) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredOrders.slice(start, start + PAGE_SIZE);
  }, [filteredOrders, currentPage]);

  const handleRecordPaymentClick = (order) => {
    showToast(
      `Backend Required: Direct payment ledger recording for Order #${order.piNumber || order.orderNumber || order.id} requires payment gateway API implementation.`,
      "info"
    );
  };

  return (
    <div style={{ maxWidth: "1480px", margin: "0 auto", padding: "16px 20px" }}>
      <style>{`
        .crm-orders-kpis {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 24px;
        }
        @media (max-width: 992px) {
          .crm-orders-kpis {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 480px) {
          .crm-orders-kpis {
            grid-template-columns: 1fr;
          }
        }
        .crm-order-skeleton {
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
            Orders & Payments
          </h1>
          <p style={{ fontSize: "13px", color: "#64748B", margin: "4px 0 0 0" }}>
            Post-sale commercial execution and collection visibility
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={() => setShowCreateOrderModal(true)}
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
            <span>+ Add Order</span>
          </button>

          <button
            onClick={fetchOrders}
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

      {/* Error banner with retry */}
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
            onClick={fetchOrders}
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

      {/* 4 Top KPI Cards */}
      <div className="crm-orders-kpis">
        <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", padding: "18px 20px", border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>Open Orders</span>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#0F172A", marginTop: "4px" }}>
            {orders.length}
          </div>
        </div>

        <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", padding: "18px 20px", border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>Order Value</span>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#0F172A", marginTop: "4px" }}>
            {totalValue > 0 ? (totalValue >= 100000 ? `₹${(totalValue/100000).toFixed(1)}L` : `₹${totalValue.toLocaleString("en-IN")}`) : "₹0"}
          </div>
        </div>

        <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", padding: "18px 20px", border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>Outstanding</span>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#0F172A", marginTop: "4px" }}>
            {totalOutstanding > 0 ? (totalOutstanding >= 100000 ? `₹${(totalOutstanding/100000).toFixed(1)}L` : `₹${totalOutstanding.toLocaleString("en-IN")}`) : "₹0"}
          </div>
        </div>

        <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", padding: "18px 20px", border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>Overdue</span>
          <div style={{ fontSize: "24px", fontWeight: 700, color: overdueAmount > 0 ? "#EF4444" : "#0F172A", marginTop: "4px" }}>
            {overdueAmount > 0 ? (overdueAmount >= 100000 ? `₹${(overdueAmount/100000).toFixed(1)}L` : `₹${overdueAmount.toLocaleString("en-IN")}`) : "₹0"}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "16px"
        }}
      >
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            onClick={() => setStatusFilter("ALL")}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              border: "1px solid #CBD5E1",
              backgroundColor: statusFilter === "ALL" ? "#2563EB" : "#fff",
              color: statusFilter === "ALL" ? "#fff" : "#475569",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            All Orders ({orders.length})
          </button>
          <button
            onClick={() => setStatusFilter("PAID")}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              border: "1px solid #CBD5E1",
              backgroundColor: statusFilter === "PAID" ? "#16A34A" : "#fff",
              color: statusFilter === "PAID" ? "#fff" : "#475569",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Paid
          </button>
          <button
            onClick={() => setStatusFilter("DUE")}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              border: "1px solid #CBD5E1",
              backgroundColor: statusFilter === "DUE" ? "#D97706" : "#fff",
              color: statusFilter === "DUE" ? "#fff" : "#475569",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Payment Due
          </button>
        </div>

        <div style={{ position: "relative", minWidth: "240px" }}>
          <Search size={15} color="#94A3B8" style={{ position: "absolute", left: "10px", top: "10px" }} />
          <input
            type="text"
            placeholder="Search PO#, customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px 8px 32px",
              borderRadius: "8px",
              border: "1px solid #CBD5E1",
              fontSize: "13px",
              boxSizing: "border-box"
            }}
          />
        </div>
      </div>

      {/* Table: Recent Orders */}
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
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>PO / ORDER #</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>COMPANY / CUSTOMER</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>VALUE</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>RECEIVED</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>OUTSTANDING</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>STATUS</th>
                <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "right" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1, 2, 3, 4].map((i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <td style={{ padding: "14px 16px" }}><div className="crm-order-skeleton" style={{ width: "90px" }} /></td>
                    <td style={{ padding: "14px 16px" }}><div className="crm-order-skeleton" style={{ width: "140px" }} /></td>
                    <td style={{ padding: "14px 16px" }}><div className="crm-order-skeleton" style={{ width: "70px" }} /></td>
                    <td style={{ padding: "14px 16px" }}><div className="crm-order-skeleton" style={{ width: "70px" }} /></td>
                    <td style={{ padding: "14px 16px" }}><div className="crm-order-skeleton" style={{ width: "70px" }} /></td>
                    <td style={{ padding: "14px 16px" }}><div className="crm-order-skeleton" style={{ width: "60px" }} /></td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}><div className="crm-order-skeleton" style={{ width: "100px", marginLeft: "auto" }} /></td>
                  </tr>
                ))
              ) : filteredOrders.length > 0 ? (
                paginatedOrders.map((o) => {
                  const val = parseFloat(o.totalInvoiceAmount || o.totalAmount || o.totalPrice || 0);
                  const rec = parseFloat(o.receivedAmount || 0);
                  const out = Math.max(0, val - rec);
                  const isPaid = out === 0 || o.paymentStatus === "paid" || o.orderStatus === "delivered";

                  return (
                    <tr key={o.id || o.orderNumber} style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 600, color: "#0F172A" }}>
                        {o.piNumber || o.orderNumber || `PO-${o.id}`}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#334155" }}>
                        {o.customerName || o.companyName || "—"}
                      </td>
                      <td style={{ padding: "12px 16px", fontWeight: 600, color: "#0F172A" }}>
                        ₹{val >= 100000 ? `${(val/100000).toFixed(1)}L` : val.toLocaleString("en-IN")}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#16A34A", fontWeight: 600 }}>
                        ₹{rec >= 100000 ? `${(rec/100000).toFixed(1)}L` : rec.toLocaleString("en-IN")}
                      </td>
                      <td style={{ padding: "12px 16px", color: out > 0 ? "#EF4444" : "#64748B", fontWeight: 600 }}>
                        ₹{out >= 100000 ? `${(out/100000).toFixed(1)}L` : out.toLocaleString("en-IN")}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: "12px",
                            backgroundColor: isPaid ? "#DCFCE7" : "#FEF3C7",
                            color: isPaid ? "#16A34A" : "#D97706"
                          }}
                        >
                          {isPaid ? "Paid" : o.orderStatus || o.paymentStatus || "Payment Due"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                          <button
                            onClick={() => navigate("/dashboard/orders")}
                            title="Open in Order Tracking"
                            style={{
                              padding: "4px 8px",
                              borderRadius: "6px",
                              backgroundColor: "#EFF6FF",
                              border: "1px solid #BFDBFE",
                              color: "#2563EB",
                              fontSize: "11px",
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "3px"
                            }}
                          >
                            <ExternalLink size={12} />
                            <span>Track</span>
                          </button>

                          <button
                            onClick={() => handleRecordPaymentClick(o)}
                            title="Backend API required for direct payment gateway recording"
                            style={{
                              padding: "4px 8px",
                              borderRadius: "6px",
                              backgroundColor: "#F8FAFC",
                              border: "1px dashed #CBD5E1",
                              color: "#64748B",
                              fontSize: "11px",
                              fontWeight: 500,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "3px"
                            }}
                          >
                            <CreditCard size={12} />
                            <span>Pay (Backend Req.)</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
                    No orders match your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && filteredOrders.length > PAGE_SIZE && (
          <div
            style={{
              padding: "10px 16px",
              borderTop: "1px solid #E2E8F0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "#FAFBFD",
              fontSize: "12px",
              color: "#64748B"
            }}
          >
            <div>
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(filteredOrders.length, currentPage * PAGE_SIZE)} of {filteredOrders.length}
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: "4px 8px",
                  borderRadius: "4px",
                  border: "1px solid #CBD5E1",
                  backgroundColor: currentPage === 1 ? "#F1F5F9" : "#fff",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer"
                }}
              >
                <ChevronLeft size={13} />
              </button>
              <span style={{ padding: "0 6px", lineHeight: "26px", fontWeight: 600 }}>{currentPage} / {totalPages}</span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                style={{
                  padding: "4px 8px",
                  borderRadius: "4px",
                  border: "1px solid #CBD5E1",
                  backgroundColor: currentPage >= totalPages ? "#F1F5F9" : "#fff",
                  cursor: currentPage >= totalPages ? "not-allowed" : "pointer"
                }}
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {showCreateOrderModal && (
        <CreateSalesOrderModal
          isOpen={showCreateOrderModal}
          onClose={() => setShowCreateOrderModal(false)}
          onSuccess={() => {
            fetchOrders();
            setShowCreateOrderModal(false);
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
}
