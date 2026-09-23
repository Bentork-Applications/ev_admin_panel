import React from "react";
import { Eye, Edit2, Truck, FileText, CheckCircle } from "lucide-react";

export const OrderTableRow = React.memo(({
  order,
  isSalesAdmin,
  isProductionAdmin,
  isScmAdmin,
  isSuperAdmin,
  isAdministrator,
  isAdminStaff,
  submitting,
  onViewDetails,
  onEditSales,
  onUpdateProductionStatus,
  onOpenScmModal,
  onDispatchOrder,
  onMarkAsDelivered,
  onGeneratePdfReport,
  getStatusBadge,
  getPriorityBadge,
  formatDate
}) => {
  const statusBadge = getStatusBadge(order.orderStatus);
  const priorityBadge = getPriorityBadge(order.priority);
  const orderStatusLower = (order.orderStatus || "").toLowerCase();
  const isSalesRegistered = orderStatusLower === "sales_registered";
  const isScmComplete = orderStatusLower === "scm_complete";
  const isDispatched = orderStatusLower === "dispatched";
  const isDelivered = orderStatusLower === "delivered" || orderStatusLower === "completed";

  return (
    <tr onClick={() => onViewDetails(order.id)}>
      {/* Order Number & PI */}
      <td>
        <div className="order-num-text">{order.orderNumber || `ORD-#${order.id}`}</div>
        <div className="sub-text">P.I.: {order.piNumber || "—"}</div>
      </td>

      {/* Customer Info */}
      <td>
        <div className="customer-name">{order.customerName || "—"}</div>
        <div className="sub-text">📞 {order.mobileNumber || "—"}</div>
      </td>

      {/* Product Details */}
      <td>
        {Array.isArray(order.orderItems) && order.orderItems.length > 0 ? (
          <div>
            <div
              style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13, fontWeight: 600, color: "#1E293B" }}
              title={order.orderItems.map((it) => `${it.productDetails || ""} (Qty: ${it.quantity})`).join(", ")}
            >
              {order.orderItems[0].productDetails || "—"}
            </div>
            <div style={{ fontSize: "11px", color: "#2563EB", fontWeight: 600, marginTop: "2px" }}>
              {order.orderItems.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0)} units
              {order.orderItems.length > 1 && (
                <span style={{ background: "#EFF6FF", color: "#1D4ED8", padding: "1px 6px", borderRadius: "10px", marginLeft: "4px", fontSize: "10px" }}>
                  {order.orderItems.length} items
                </span>
              )}
            </div>
          </div>
        ) : (
          <div>
            <div
              style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13, color: "#374151" }}
              title={order.productDetails}
            >
              {order.productDetails || "—"}
            </div>
            <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>
              {order.quantity || order.partQuantity || 1} units
            </div>
          </div>
        )}
      </td>

      {/* Address */}
      <td>
        <div style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12, color: "#374151" }} title={order.address}>
          {order.address || "—"}
        </div>
      </td>

      {/* Order Lifecycle Status */}
      <td>
        <span
          className="badge-pill font-medium"
          style={{
            background: statusBadge.bg,
            color: statusBadge.fg,
            border: `1px solid ${statusBadge.border}`,
          }}
        >
          {statusBadge.label}
        </span>
      </td>

      {/* Production Status */}
      <td>
        <span className={`prod-status-tag ${order.productionStatus || "pending"}`}>
          {order.productionStatus === "in_progress"
            ? "In Progress"
            : order.productionStatus === "completed"
              ? "Completed"
              : "Pending"}
        </span>
      </td>

      {/* Barcode & Tracking ID */}
      <td>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>
          {order.barcode ? `🏷️ ${order.barcode}` : "—"}
        </div>
        <div style={{ fontSize: 11, color: "#6B7280" }}>
          {order.trackingId ? `🚚 ${order.trackingId}` : "—"}
        </div>
      </td>

      {/* Priority & Payment */}
      <td>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-start" }}>
          <span className="badge-pill" style={{ background: priorityBadge.bg, color: priorityBadge.fg }}>
            {priorityBadge.label}
          </span>
          <span className={`payment-tag ${order.paymentStatus === "paid"
            ? "paid"
            : (order.paymentStatus === "partial" || order.paymentStatus === "unpaid")
              ? "unpaid"
              : "pending"
            }`}>
            {order.paymentStatus === "paid"
              ? "Paid"
              : (order.paymentStatus === "partial" || order.paymentStatus === "unpaid")
                ? "Unpaid"
                : "Pending"}
          </span>
          {(isSalesAdmin || isAdministrator || isSuperAdmin) && (
            <div style={{ fontSize: "11px", fontWeight: 600, color: (Number(order.pendingAmount) || (order.paymentStatus === "paid" ? 0 : 1)) > 0 ? "#DC2626" : "#059669", marginTop: "2px" }}>
              Pending: ₹{parseFloat(order.pendingAmount !== undefined && order.pendingAmount !== null ? order.pendingAmount : (order.paymentStatus === "paid" ? 0 : (order.totalAmount || order.totalPrice || 0))).toLocaleString("en-IN")}
            </div>
          )}
        </div>
      </td>

      {/* Created & Updated Date */}
      <td>
        <div style={{ fontSize: 11, color: "#374151", fontWeight: 500 }}>
          {formatDate(order.createdAt || order.createdDate)}
        </div>
        <div style={{ fontSize: 10, color: "#9CA3AF" }}>
          Upd: {formatDate(order.updatedAt || order.updatedDate)}
        </div>
      </td>

      {/* Actions Column */}
      <td onClick={(e) => e.stopPropagation()}>
        <div className="row-actions">
          {/* View Button */}
          <button
            className="icon-action-btn view-btn"
            title="View Order Details"
            onClick={() => onViewDetails(order.id)}
          >
            <Eye size={15} />
          </button>

          {/* Sales Admin & Administrator Edit Order */}
          {(isSalesAdmin || isAdministrator) && (
            <button
              className="icon-action-btn edit-btn"
              title={isSalesRegistered ? "Edit Sales Order" : "Read-only: Order has progressed past Sales stage"}
              disabled={!isSalesRegistered}
              onClick={() => onEditSales(order)}
            >
              <Edit2 size={15} />
            </button>
          )}

          {/* Production Admin & Administrator Transitions */}
          {(isProductionAdmin || isAdministrator) && (
            <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
              <select
                className="filter-select"
                style={{ fontSize: "11px", height: "30px", padding: "0 6px", fontWeight: 600, borderRadius: "6px" }}
                value={order.productionStatus === "in_progress" ? "in_progress" : order.productionStatus === "testing" ? "testing" : order.productionStatus === "completed" ? "completed" : "pending"}
                onChange={(e) => onUpdateProductionStatus(order.id, e.target.value)}
                disabled={submitting}
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Production</option>
                <option value="testing">Testing</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          )}

          {/* SCM Admin & Administrator Actions */}
          {(isScmAdmin || isAdministrator) && (
            <>
              {order.orderStatus === "production_complete" && (
                <button
                  className="scm-action-btn fill-details"
                  disabled={submitting}
                  onClick={() => onOpenScmModal(order)}
                >
                  Fill SCM Details
                </button>
              )}

              {isScmComplete && (
                <button
                  className="scm-action-btn dispatch-btn"
                  disabled={submitting}
                  onClick={() => onDispatchOrder(order.id)}
                >
                  <Truck size={14} /> Dispatch
                </button>
              )}

              {isDispatched && (
                <>
                  <button
                    className="scm-action-btn"
                    style={{
                      background: "#059669",
                      color: "#FFFFFF",
                      border: "1px solid #047857",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "5px 10px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: submitting ? "not-allowed" : "pointer"
                    }}
                    disabled={submitting}
                    onClick={() => onMarkAsDelivered && onMarkAsDelivered(order)}
                    title="Mark Order as Delivered"
                  >
                    <CheckCircle size={14} /> Mark as Delivered
                  </button>
                  <button
                    className="icon-action-btn pdf-btn"
                    title="Download Order Report (PDF)"
                    style={{ background: "#EFF6FF", color: "#1D4ED8", borderColor: "#BFDBFE" }}
                    onClick={() => onGeneratePdfReport(order)}
                  >
                    <FileText size={15} />
                  </button>
                </>
              )}

              {isDelivered && (
                <>
                  <span className="done-badge completed" style={{ background: "#ECFDF5", color: "#065F46", border: "1px solid #A7F3D0", padding: "5px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 600 }}>
                    ✅ Completed
                  </span>
                  <button
                    className="icon-action-btn pdf-btn"
                    title="Download Order Report (PDF)"
                    style={{ background: "#ECFDF5", color: "#065F46", borderColor: "#A7F3D0" }}
                    onClick={() => onGeneratePdfReport(order)}
                  >
                    <FileText size={15} />
                  </button>
                </>
              )}

              {!isAdministrator && (isSalesRegistered || orderStatusLower === "in_production") && (
                <span className="read-only-label">In Pipeline</span>
              )}
            </>
          )}

          {/* Non-Administrator Staff Read-only view label */}
          {isAdminStaff && !isAdministrator && (
            <span className="read-only-label">Read Only</span>
          )}
        </div>
      </td>
    </tr>
  );
});

OrderTableRow.displayName = "OrderTableRow";
