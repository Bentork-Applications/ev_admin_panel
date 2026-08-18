import React from "react";
import { X, Truck, Barcode } from "lucide-react";
import { calculateExpiryAndTotal } from "../../utils/formatters";

export const ScmDetailsModal = React.memo(({
  showScmModal,
  onClose,
  orderForScm,
  scmFormData,
  setScmFormData,
  scmItemDetails,
  setScmItemDetails,
  scmFormErrors,
  handleCompleteScm,
  submitting
}) => {
  if (!showScmModal || !orderForScm) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content scm-details-modal"
        style={{
          width: "min(760px, 92vw)",
          maxWidth: "760px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          .scm-details-modal input {
            box-sizing: border-box;
            width: 100%;
          }
          @media (max-width: 640px) {
            .scm-form-responsive-row {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
        <div className="modal-header">
          <h2>Fill SCM Details ({orderForScm.orderNumber})</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleCompleteScm} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
          <div className="modal-body" style={{ padding: "20px", overflowY: "auto", flex: 1, minHeight: 0 }}>
            {/* 1. Common Shipment Information Section */}
            <div style={{ background: "#F8FAFC", padding: "16px", borderRadius: "10px", border: "1px solid #E2E8F0", marginBottom: "20px" }}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#1E3A8A", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Truck size={16} /> Common Order Shipment Details
              </div>

              <div className="form-row scm-form-responsive-row">
                <div className="form-group">
                  <label>Invoice Number *</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-2026-001"
                    value={scmFormData.invoiceNumber}
                    onChange={(e) => setScmFormData({ ...scmFormData, invoiceNumber: e.target.value })}
                  />
                  {scmFormErrors.invoiceNumber && <span className="field-error">{scmFormErrors.invoiceNumber}</span>}
                </div>

                <div className="form-group">
                  <label>Courier Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. DTDC, BlueDart, FedEx"
                    value={scmFormData.courierName}
                    onChange={(e) => setScmFormData({ ...scmFormData, courierName: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Tracking ID *</label>
                <input
                  type="text"
                  placeholder="e.g. TRK123456789"
                  value={scmFormData.trackingId}
                  onChange={(e) => setScmFormData({ ...scmFormData, trackingId: e.target.value })}
                />
                {scmFormErrors.trackingId && <span className="field-error">{scmFormErrors.trackingId}</span>}
              </div>
            </div>

            {/* 2. Product Line Items Barcode & Warranty Section */}
            <div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#1E3A8A", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Barcode size={16} /> Product Line Items — Barcodes & Independent Warranty
              </div>

              {scmItemDetails.map((item, idx) => {
                const updateItemState = (updates) => {
                  const newItems = [...scmItemDetails];
                  const currentItem = { ...newItems[idx], ...updates };

                  const { totalWarrantyLabel, expiryDateStr } = calculateExpiryAndTotal(
                    currentItem.warrantyStartDate || "",
                    currentItem.fullWarrantyYears ?? "1",
                    currentItem.fullWarrantyMonths ?? "0",
                    currentItem.serviceWarrantyYears ?? "0",
                    currentItem.serviceWarrantyMonths ?? "0"
                  );

                  currentItem.warrantyEndDate = expiryDateStr;
                  currentItem.totalWarrantyLabel = totalWarrantyLabel;
                  newItems[idx] = currentItem;
                  setScmItemDetails(newItems);
                };

                return (
                  <div
                    key={item.id || idx}
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #CBD5E1",
                      borderRadius: "10px",
                      padding: "16px",
                      marginBottom: idx === scmItemDetails.length - 1 ? "0" : "16px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid #F1F5F9", paddingBottom: "8px", flexWrap: "wrap", gap: "6px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A", wordBreak: "break-word" }}>
                        Product #{idx + 1}: {item.productDetails || "EV Battery Unit"}
                      </span>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "#2563EB", background: "#EFF6FF", padding: "2px 8px", borderRadius: "10px", flexShrink: 0 }}>
                        Qty: {item.quantity || 1} unit{(item.quantity || 1) > 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Barcode Range / Single Barcode Row */}
                    {(item.quantity || 1) === 1 ? (
                      <div className="form-group">
                        <label>Barcode *</label>
                        <input
                          type="text"
                          placeholder="e.g. BAR001"
                          value={item.startBarcode || ""}
                          onChange={(e) => updateItemState({ startBarcode: e.target.value, endBarcode: e.target.value })}
                        />
                        {scmFormErrors[`startBarcode_${idx}`] && (
                          <span className="field-error">{scmFormErrors[`startBarcode_${idx}`]}</span>
                        )}
                      </div>
                    ) : (
                      <div className="form-row scm-form-responsive-row">
                        <div className="form-group">
                          <label>Start Barcode *</label>
                          <input
                            type="text"
                            placeholder="e.g. BAR001"
                            value={item.startBarcode || ""}
                            onChange={(e) => updateItemState({ startBarcode: e.target.value })}
                          />
                          {scmFormErrors[`startBarcode_${idx}`] && (
                            <span className="field-error">{scmFormErrors[`startBarcode_${idx}`]}</span>
                          )}
                        </div>

                        <div className="form-group">
                          <label>End Barcode *</label>
                          <input
                            type="text"
                            placeholder="e.g. BAR005"
                            value={item.endBarcode || ""}
                            onChange={(e) => updateItemState({ endBarcode: e.target.value })}
                          />
                          {scmFormErrors[`endBarcode_${idx}`] && (
                            <span className="field-error">{scmFormErrors[`endBarcode_${idx}`]}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Warranty Start & Expiry Date Row */}
                    <div className="form-row scm-form-responsive-row">
                      <div className="form-group">
                        <label>Warranty Start Date *</label>
                        <input
                          type="date"
                          value={item.warrantyStartDate || item.warranty_start_date || orderForScm?.warrantyStartDate || orderForScm?.warranty_start_date || (orderForScm?.createdAt ? String(orderForScm.createdAt).split("T")[0] : (orderForScm?.createdDate ? String(orderForScm.createdDate).split("T")[0] : "")) || ""}
                          onChange={(e) => updateItemState({ warrantyStartDate: e.target.value })}
                        />
                        {scmFormErrors[`warrantyStartDate_${idx}`] && (
                          <span className="field-error">{scmFormErrors[`warrantyStartDate_${idx}`]}</span>
                        )}
                      </div>

                      <div className="form-group">
                        <label>Warranty Expiry Date (Auto-calculated)</label>
                        <input
                          type="date"
                          readOnly
                          disabled
                          value={item.warrantyEndDate || item.warranty_end_date || orderForScm?.warrantyEndDate || orderForScm?.warranty_end_date || ""}
                          style={{ background: "#F1F5F9", color: "#64748B", cursor: "not-allowed" }}
                        />
                        {scmFormErrors[`warrantyEndDate_${idx}`] && (
                          <span className="field-error">{scmFormErrors[`warrantyEndDate_${idx}`]}</span>
                        )}
                      </div>
                    </div>

                    {/* Full Warranty & Service Warranty Duration Row */}
                    <div className="form-row scm-form-responsive-row" style={{ marginTop: "10px" }}>
                      <div className="form-group">
                        <label>Full Warranty (Years / Months)</label>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <input
                            type="number"
                            min="0"
                            placeholder="Yrs"
                            value={item.fullWarrantyYears ?? "1"}
                            onChange={(e) => updateItemState({ fullWarrantyYears: e.target.value })}
                            style={{ flex: 1, minWidth: 0 }}
                          />
                          <input
                            type="number"
                            min="0"
                            max="11"
                            placeholder="Mos"
                            value={item.fullWarrantyMonths ?? "0"}
                            onChange={(e) => updateItemState({ fullWarrantyMonths: e.target.value })}
                            style={{ flex: 1, minWidth: 0 }}
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Service Warranty (Years / Months)</label>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <input
                            type="number"
                            min="0"
                            placeholder="Yrs"
                            value={item.serviceWarrantyYears ?? "0"}
                            onChange={(e) => updateItemState({ serviceWarrantyYears: e.target.value })}
                            style={{ flex: 1, minWidth: 0 }}
                          />
                          <input
                            type="number"
                            min="0"
                            max="11"
                            placeholder="Mos"
                            value={item.serviceWarrantyMonths ?? "0"}
                            onChange={(e) => updateItemState({ serviceWarrantyMonths: e.target.value })}
                            style={{ flex: 1, minWidth: 0 }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Auto-calculated Total Warranty & Expiry Info */}
                    <div style={{ fontSize: "11px", color: "#065F46", background: "#ECFDF5", padding: "6px 10px", borderRadius: "6px", border: "1px solid #A7F3D0", marginTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "4px" }}>
                      <span>Total Coverage: <strong>{item.totalWarrantyLabel || "1 Year"}</strong></span>
                      <span>Expiry: <strong>{item.warrantyEndDate || "—"}</strong></span>
                    </div>

                    {/* Barcode Sequence Info Badge */}
                    <div style={{ fontSize: "11px", color: "#64748B", background: "#F8FAFC", padding: "6px 10px", borderRadius: "6px", border: "1px solid #E2E8F0", marginTop: "6px", wordBreak: "break-word" }}>
                      {(item.quantity || 1) === 1 ? (
                        <>Barcode: <strong style={{ color: "#1D4ED8" }}>{item.startBarcode || "—"}</strong> (Single Unit)</>
                      ) : (
                        <>Range: <strong style={{ color: "#1D4ED8" }}>{item.startBarcode || "—"}</strong> to <strong style={{ color: "#1D4ED8" }}>{item.endBarcode || "—"}</strong> (Total: {item.quantity} barcodes)</>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="sec-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-action-btn" disabled={submitting}>
              {submitting ? "Submitting SCM..." : "Submit SCM Complete"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

ScmDetailsModal.displayName = "ScmDetailsModal";
