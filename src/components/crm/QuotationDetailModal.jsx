import React, { useState, useEffect, useCallback } from "react";
import { X, FileText, Send, CheckCircle2, XCircle, Printer, Calendar, Building, DollarSign, ShoppingBag } from "lucide-react";
import { crmService } from "../../services/crmService";
import { QuotationStatusBadge } from "./CrmBadge";

export const QuotationDetailModal = ({
  quotationId,
  isOpen,
  onClose,
  onQuotationUpdated,
  showToast
}) => {
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [converting, setConverting] = useState(false);

  const fetchQuotation = useCallback(async () => {
    if (!quotationId) return;
    setLoading(true);
    try {
      const data = await crmService.getQuotationById(quotationId);
      setQuotation(data);
    } catch (err) {
      console.error("Error fetching quotation:", err);
      showToast?.(err.message || "Failed to load quotation", "error");
    } finally {
      setLoading(false);
    }
  }, [quotationId, showToast]);

  useEffect(() => {
    if (isOpen && quotationId) {
      fetchQuotation();
    }
  }, [isOpen, quotationId, fetchQuotation]);

  if (!isOpen) return null;

  const handleSend = async () => {
    setActionLoading(true);
    try {
      await crmService.sendQuotation(quotationId);
      showToast?.("Quotation marked as SENT", "success");
      await fetchQuotation();
      onQuotationUpdated?.();
    } catch (err) {
      console.error("Error sending quotation:", err);
      showToast?.(err.message || "Failed to send quotation", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccept = async () => {
    setActionLoading(true);
    try {
      await crmService.acceptQuotation(quotationId);
      showToast?.("Quotation marked as ACCEPTED", "success");
      await fetchQuotation();
      onQuotationUpdated?.();
    } catch (err) {
      console.error("Error accepting quotation:", err);
      showToast?.(err.message || "Failed to accept quotation", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      await crmService.rejectQuotation(quotationId);
      showToast?.("Quotation marked as REJECTED", "success");
      await fetchQuotation();
      onQuotationUpdated?.();
    } catch (err) {
      console.error("Error rejecting quotation:", err);
      showToast?.(err.message || "Failed to reject quotation", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConvertToOrder = async () => {
    setConverting(true);
    try {
      const res = await crmService.convertToOrder(quotationId);
      const msg = typeof res === "string" ? res : res?.message || `Quotation converted to Order successfully${res?.orderId ? ` (Order ID: ${res.orderId})` : ""}`;
      showToast?.(msg, "success");
      setShowConvertModal(false);
      await fetchQuotation();
      onQuotationUpdated?.();
    } catch (err) {
      console.error("Error converting quotation to order:", err);
      showToast?.(err.message || "Failed to convert quotation to order", "error");
    } finally {
      setConverting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const status = (quotation?.status || "DRAFT").toUpperCase();
  const items = Array.isArray(quotation?.items) ? quotation.items : [];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(4px)",
        zIndex: 1200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px"
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "720px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #F3F4F6",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                backgroundColor: "#ECFDF5",
                color: "#10B981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <FileText size={22} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#111827" }}>
                  {quotation?.quoteNumber || `Quotation #${quotationId}`}
                </h3>
                {quotation && <QuotationStatusBadge status={quotation.status} />}
              </div>
              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#6B7280" }}>
                {quotation?.companyName ? `Prepared for ${quotation.companyName}` : "Official Quotation"}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                background: "#F3F4F6",
                border: "none",
                color: "#374151",
                cursor: "pointer",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}
            >
              <Printer size={14} />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: "#9CA3AF",
                cursor: "pointer",
                padding: "4px"
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#6B7280" }}>
              Loading quotation details...
            </div>
          ) : !quotation ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#EF4444" }}>
              Quotation not found
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Meta Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "14px",
                  backgroundColor: "#F9FAFB",
                  padding: "16px",
                  borderRadius: "12px",
                  border: "1px solid #E5E7EB",
                  fontSize: "13px"
                }}
              >
                <div>
                  <span style={{ color: "#6B7280", fontSize: "11px", display: "block" }}>Company / Client</span>
                  <strong style={{ color: "#111827" }}>{quotation.companyName || "Direct Client"}</strong>
                </div>

                <div>
                  <span style={{ color: "#6B7280", fontSize: "11px", display: "block" }}>Linked Opportunity</span>
                  <strong style={{ color: "#111827" }}>{quotation.opportunityTitle || "None"}</strong>
                </div>

                <div>
                  <span style={{ color: "#6B7280", fontSize: "11px", display: "block" }}>Valid Until</span>
                  <span style={{ color: "#111827" }}>{quotation.validUntil || "30 days from issue"}</span>
                </div>

                <div>
                  <span style={{ color: "#6B7280", fontSize: "11px", display: "block" }}>Created By</span>
                  <span style={{ color: "#111827" }}>{quotation.createdByAdminEmail || "Bentork Sales"}</span>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", fontWeight: 700, color: "#111827" }}>
                  Items & Specifications
                </h4>
                <div style={{ border: "1px solid #E5E7EB", borderRadius: "8px", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#F9FAFB", borderBottom: "1px solid #E5E7EB", textAlign: "left", color: "#6B7280" }}>
                        <th style={{ padding: "10px 12px", width: "5%" }}>#</th>
                        <th style={{ padding: "10px 12px", width: "55%" }}>Product / Specification</th>
                        <th style={{ padding: "10px 12px", width: "10%", textAlign: "center" }}>Qty</th>
                        <th style={{ padding: "10px 12px", width: "15%", textAlign: "right" }}>Unit Price</th>
                        <th style={{ padding: "10px 12px", width: "15%", textAlign: "right" }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={item.id || idx} style={{ borderBottom: "1px solid #F3F4F6" }}>
                          <td style={{ padding: "10px 12px", color: "#6B7280" }}>{idx + 1}</td>
                          <td style={{ padding: "10px 12px", fontWeight: 500, color: "#111827" }}>
                            {item.productDescription}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "center" }}>{item.quantity}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right" }}>
                            ₹{(item.unitPrice || 0).toLocaleString("en-IN")}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>
                            ₹{(item.totalPrice || 0).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{ width: "260px", display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#6B7280" }}>
                    <span>Subtotal:</span>
                    <span>₹{(quotation.totalAmount || 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#6B7280" }}>
                    <span>Discount:</span>
                    <span>- ₹{(quotation.discount || 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      paddingTop: "8px",
                      borderTop: "1px solid #E5E7EB",
                      fontSize: "16px",
                      fontWeight: 700,
                      color: "#10B981"
                    }}
                  >
                    <span>Final Amount:</span>
                    <span>₹{(quotation.finalAmount || 0).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>

              {/* Terms */}
              {quotation.termsAndConditions && (
                <div style={{ backgroundColor: "#FAFAFA", padding: "14px", borderRadius: "8px", border: "1px solid #E5E7EB" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#374151", display: "block", marginBottom: "6px" }}>
                    Terms & Conditions
                  </span>
                  <div style={{ fontSize: "12px", color: "#4B5563", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                    {quotation.termsAndConditions}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {quotation && (
          <div
            style={{
              padding: "16px 24px",
              borderTop: "1px solid #F3F4F6",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "#F9FAFB"
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid #D1D5DB",
                backgroundColor: "#ffffff",
                color: "#374151",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Close
            </button>

            <div style={{ display: "flex", gap: "8px" }}>
              {status === "DRAFT" && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleSend}
                  style={{
                    padding: "8px 18px",
                    borderRadius: "8px",
                    backgroundColor: "#3B82F6",
                    color: "#ffffff",
                    border: "none",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: actionLoading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <Send size={14} />
                  <span>{actionLoading ? "Sending..." : "Mark as Sent"}</span>
                </button>
              )}

              {status === "SENT" && (
                <>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleReject}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "8px",
                      backgroundColor: "#FEF2F2",
                      color: "#991B1B",
                      border: "1px solid #FECACA",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: actionLoading ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                  >
                    <XCircle size={14} />
                    <span>Reject</span>
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleAccept}
                    style={{
                      padding: "8px 18px",
                      borderRadius: "8px",
                      backgroundColor: "#10B981",
                      color: "#ffffff",
                      border: "none",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: actionLoading ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                  >
                    <CheckCircle2 size={14} />
                    <span>Accept Quotation</span>
                  </button>
                </>
              )}

              {/* Convert to Order Action - Prominent green button enabled ONLY for ACCEPTED */}
              <button
                type="button"
                disabled={status !== "ACCEPTED" || actionLoading}
                onClick={() => setShowConvertModal(true)}
                title={status === "ACCEPTED" ? "Convert Quotation into a Production Order" : "Quotation must be in ACCEPTED status to convert to order"}
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  backgroundColor: status === "ACCEPTED" ? "#16A34A" : "#F1F5F9",
                  color: status === "ACCEPTED" ? "#ffffff" : "#94A3B8",
                  border: status === "ACCEPTED" ? "none" : "1px solid #CBD5E1",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: status === "ACCEPTED" ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: status === "ACCEPTED" ? "0 2px 4px rgba(22, 163, 74, 0.25)" : "none"
                }}
              >
                <ShoppingBag size={14} />
                <span>Convert to Order</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Quotation -> Order Conversion */}
      {showConvertModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 1300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px"
          }}
          onClick={() => setShowConvertModal(false)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "460px",
              padding: "24px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              display: "flex",
              flexDirection: "column",
              gap: "16px"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  backgroundColor: "#DCFCE7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#16A34A"
                }}
              >
                <ShoppingBag size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
                  Convert Quotation to Order
                </h3>
                <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748B" }}>
                  Confirm commercial conversion
                </p>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: "13px", color: "#334155", lineHeight: "1.5" }}>
              Convert Quotation <strong style={{ color: "#0F172A" }}>{quotation?.quoteNumber || `QT-${quotationId}`}</strong> into a Production Order?
            </p>

            <div
              style={{
                backgroundColor: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "8px",
                padding: "12px",
                fontSize: "12px",
                color: "#64748B",
                display: "flex",
                flexDirection: "column",
                gap: "4px"
              }}
            >
              <div>Company: <strong style={{ color: "#0F172A" }}>{quotation?.companyName || "—"}</strong></div>
              <div>Opportunity: <strong style={{ color: "#0F172A" }}>{quotation?.opportunityTitle || "—"}</strong></div>
              <div>Order Value: <strong style={{ color: "#16A34A" }}>₹{(quotation?.finalAmount ?? quotation?.totalAmount ?? 0).toLocaleString("en-IN")}</strong></div>
              <div>Status on Creation: <span style={{ color: "#2563EB", fontWeight: 600 }}>SALES_REGISTERED</span></div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
              <button
                type="button"
                onClick={() => setShowConvertModal(false)}
                disabled={converting}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  backgroundColor: "#ffffff",
                  color: "#475569",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={converting}
                onClick={handleConvertToOrder}
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  backgroundColor: "#16A34A",
                  color: "#ffffff",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: converting ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                {converting ? (
                  <span>Converting...</span>
                ) : (
                  <>
                    <CheckCircle2 size={15} />
                    <span>Confirm Conversion</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
