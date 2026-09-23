import React from "react";
import { CheckCircle, X, Truck, AlertCircle, Loader2 } from "lucide-react";

export const MarkDeliveredModal = React.memo(({
  showModal,
  onClose,
  order,
  adminNotes,
  setAdminNotes,
  onConfirm,
  submitting
}) => {
  if (!showModal || !order) return null;

  const orderNum = order.orderNumber || (order.id ? `ORD-#${order.id}` : "Order");
  const customerName = order.customerName || "Customer";
  const courier = order.courierName || "Standard Courier";
  const trackingId = order.trackingId || "—";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: "480px", width: "95%" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ borderBottom: "1px solid #E2E8F0", paddingBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                background: "#ECFDF5",
                color: "#059669",
                borderRadius: "10px",
                padding: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <CheckCircle size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#0F172A" }}>
                Mark as Delivered
              </h3>
              <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
                Confirm delivery for {orderNum}
              </div>
            </div>
          </div>
          <button
            className="close-modal-btn"
            onClick={onClose}
            disabled={submitting}
            style={{
              background: "none",
              border: "none",
              cursor: submitting ? "not-allowed" : "pointer",
              color: "#94A3B8"
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "18px 0" }}>
          {/* Order Summary Info Box */}
          <div
            style={{
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "8px",
              padding: "12px 14px",
              marginBottom: "16px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
              fontSize: "12px"
            }}
          >
            <div>
              <span style={{ color: "#64748B", display: "block" }}>Customer:</span>
              <strong style={{ color: "#1E293B" }}>{customerName}</strong>
            </div>
            <div>
              <span style={{ color: "#64748B", display: "block" }}>P.I. Number:</span>
              <strong style={{ color: "#1E293B" }}>{order.piNumber || "—"}</strong>
            </div>
            <div>
              <span style={{ color: "#64748B", display: "block" }}>Courier:</span>
              <strong style={{ color: "#1E293B" }}>{courier}</strong>
            </div>
            <div>
              <span style={{ color: "#64748B", display: "block" }}>Tracking ID:</span>
              <strong style={{ color: "#1E293B" }}>{trackingId}</strong>
            </div>
          </div>

          <p style={{ fontSize: "13px", color: "#334155", lineHeight: "1.5", marginBottom: "14px" }}>
            Are you sure you want to mark this order as <strong>Delivered</strong>? The order status will transition to <strong>Completed</strong>.
          </p>

          {/* Optional Admin Notes Input */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label
              htmlFor="delivery-admin-notes"
              style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}
            >
              Admin Notes <span style={{ fontWeight: 400, color: "#94A3B8" }}>(Optional)</span>
            </label>
            <textarea
              id="delivery-admin-notes"
              rows={3}
              placeholder="e.g. Received by customer, signature verified, package in good condition..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              disabled={submitting}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #CBD5E1",
                fontSize: "13px",
                fontFamily: "inherit",
                resize: "vertical",
                boxSizing: "border-box",
                outline: "none"
              }}
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            borderTop: "1px solid #E2E8F0",
            paddingTop: "14px"
          }}
        >
          <button
            type="button"
            className="sec-btn"
            onClick={onClose}
            disabled={submitting}
            style={{ padding: "8px 16px", fontSize: "13px", cursor: submitting ? "not-allowed" : "pointer" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            style={{
              background: "#059669",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "8px",
              padding: "8px 18px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: submitting ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 4px rgba(5, 150, 105, 0.2)",
              opacity: submitting ? 0.75 : 1
            }}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="spin" />
                <span>Marking as Delivered...</span>
              </>
            ) : (
              <>
                <CheckCircle size={16} />
                <span>Confirm & Mark Delivered</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

MarkDeliveredModal.displayName = "MarkDeliveredModal";
