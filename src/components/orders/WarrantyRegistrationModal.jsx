import React, { useState, useMemo } from "react";
import { X, Layers } from "lucide-react";
import { calculateExpiryAndTotal } from "../../utils/formatters";

export const WarrantyRegistrationModal = React.memo(({
  showWarrantyModal,
  onClose,
  warrantyModalData,
  scmFormData,
  setScmFormData,
  showToast
}) => {
  const [selectedItemIdx, setSelectedItemIdx] = useState(0);

  const itemsList = useMemo(() => {
    if (!warrantyModalData) return [];
    if (Array.isArray(warrantyModalData.orderItems) && warrantyModalData.orderItems.length > 0) {
      return warrantyModalData.orderItems;
    }
    return [{
      id: "single",
      productDetails: warrantyModalData.productDetails || "EV Battery Pack",
      quantity: warrantyModalData.quantity || warrantyModalData.partQuantity || 1,
      barcode: warrantyModalData.barcode || (warrantyModalData.startBarcode ? `${warrantyModalData.startBarcode} - ${warrantyModalData.endBarcode}` : "—"),
      warrantyStartDate: warrantyModalData.warrantyStartDate,
      warrantyEndDate: warrantyModalData.warrantyEndDate,
      fullWarrantyMonths: warrantyModalData.fullWarrantyMonths,
      serviceWarrantyMonths: warrantyModalData.serviceWarrantyMonths,
      totalWarrantyLabel: warrantyModalData.totalWarrantyLabel
    }];
  }, [warrantyModalData]);

  const activeItem = itemsList[selectedItemIdx] || itemsList[0] || {};

  const fullY = activeItem?.fullWarrantyYears ?? scmFormData?.fullWarrantyYears ?? Math.floor((Number(activeItem?.fullWarrantyMonths ?? scmFormData?.fullWarrantyMonths) || 24) / 12);
  const fullM = activeItem?.fullWarrantyMonths !== undefined
    ? activeItem.fullWarrantyMonths % 12
    : (scmFormData?.fullWarrantyMonths !== undefined ? scmFormData.fullWarrantyMonths % 12 : 0);

  const servY = activeItem?.serviceWarrantyYears ?? scmFormData?.serviceWarrantyYears ?? Math.floor((Number(activeItem?.serviceWarrantyMonths ?? scmFormData?.serviceWarrantyMonths) || 0) / 12);
  const servM = activeItem?.serviceWarrantyMonths !== undefined
    ? activeItem.serviceWarrantyMonths % 12
    : (scmFormData?.serviceWarrantyMonths !== undefined ? scmFormData.serviceWarrantyMonths % 12 : 0);

  const startDate =
    activeItem?.warrantyStartDate ||
    activeItem?.warranty_start_date ||
    scmFormData?.warrantyStartDate ||
    warrantyModalData?.warrantyStartDate ||
    warrantyModalData?.warranty_start_date ||
    (warrantyModalData?.id ? localStorage.getItem(`order_warranty_start_${warrantyModalData.id}`) : null) ||
    (warrantyModalData?.createdAt ? String(warrantyModalData.createdAt).split("T")[0] : (warrantyModalData?.createdDate ? String(warrantyModalData.createdDate).split("T")[0] : null)) ||
    new Date().toISOString().split("T")[0];

  const { totalWarrantyLabel, expiryDateStr } = useMemo(() => {
    return calculateExpiryAndTotal(startDate, fullY, fullM, servY, servM);
  }, [startDate, fullY, fullM, servY, servM]);

  if (!showWarrantyModal || !warrantyModalData) return null;

  const itemBarcodeStr = activeItem.barcode || (activeItem.startBarcode ? (activeItem.endBarcode && activeItem.startBarcode !== activeItem.endBarcode ? `${activeItem.startBarcode} - ${activeItem.endBarcode}` : activeItem.startBarcode) : (warrantyModalData.barcode || "—"));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: "700px" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ background: "#0F172A", color: "#FFFFFF", padding: "18px 24px", borderTopLeftRadius: "12px", borderTopRightRadius: "12px" }}>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>Product-Wise Battery Warranty Registration</h2>
            <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "2px" }}>
              Independent warranty records for order #{warrantyModalData.orderNumber || warrantyModalData.id}
            </div>
          </div>
          <button className="close-btn" style={{ color: "#94A3B8" }} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: "24px" }}>
          {/* Order Customer Header */}
          <div style={{ background: "#F1F5F9", padding: "12px 16px", borderRadius: "8px", marginBottom: "18px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>
              Order #{warrantyModalData.orderNumber} • Customer: {warrantyModalData.customerName || "—"}
            </div>
            <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
              Total Products in Order: {itemsList.length}
            </div>
          </div>

          {/* Product Line Items Tabs if multiple products exist */}
          {itemsList.length > 1 && (
            <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "8px", marginBottom: "16px" }}>
              {itemsList.map((it, idx) => (
                <button
                  key={it.id || idx}
                  type="button"
                  onClick={() => setSelectedItemIdx(idx)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    border: selectedItemIdx === idx ? "2px solid #2563EB" : "1px solid #CBD5E1",
                    background: selectedItemIdx === idx ? "#EFF6FF" : "#FFFFFF",
                    color: selectedItemIdx === idx ? "#1D4ED8" : "#475569",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <Layers size={14} /> Product #{idx + 1}: {it.productDetails || "EV Unit"}
                </button>
              ))}
            </div>
          )}

          {/* Selected Product Banner */}
          <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px" }}>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#1E40AF" }}>
              Product #{selectedItemIdx + 1}: {activeItem.productDetails || "EV Battery Unit"}
            </div>
            <div style={{ fontSize: "11px", color: "#3B82F6", marginTop: "2px" }}>
              Quantity: {activeItem.quantity || 1} unit{(activeItem.quantity || 1) > 1 ? "s" : ""}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Barcode / Barcode Range</label>
              <input
                type="text"
                readOnly
                disabled
                value={itemBarcodeStr}
              />
            </div>
            <div className="form-group">
              <label>Invoice Number</label>
              <input
                type="text"
                readOnly
                disabled
                value={warrantyModalData.invoiceNumber || "—"}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Warranty Start Date</label>
              <input
                type="date"
                readOnly
                disabled
                value={startDate}
                style={{ background: "#F1F5F9", color: "#334155" }}
              />
            </div>
            <div className="form-group">
              <label>Warranty Expiry Date</label>
              <input
                type="date"
                readOnly
                disabled
                value={activeItem.warrantyEndDate || expiryDateStr || ""}
                style={{ background: "#F1F5F9", color: "#1D4ED8", fontWeight: 600, cursor: "not-allowed" }}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Full Warranty</label>
              <input
                type="text"
                readOnly
                disabled
                value={`${fullY} Year${fullY > 1 ? "s" : ""} ${fullM > 0 ? `${fullM} Month${fullM > 1 ? "s" : ""}` : ""}`}
                style={{ background: "#F1F5F9" }}
              />
            </div>
            <div className="form-group">
              <label>Service Warranty</label>
              <input
                type="text"
                readOnly
                disabled
                value={`${servY} Year${servY > 1 ? "s" : ""} ${servM > 0 ? `${servM} Month${servM > 1 ? "s" : ""}` : ""}`}
                style={{ background: "#F1F5F9" }}
              />
            </div>
          </div>

          <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", padding: "14px", borderRadius: "8px", marginTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#065F46" }}>Product Total Warranty Coverage</div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#047857", marginTop: "4px" }}>
                Total: {activeItem.totalWarrantyLabel || totalWarrantyLabel}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#065F46" }}>Product Expiry Date</div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#047857", marginTop: "4px" }}>
                {activeItem.warrantyEndDate || expiryDateStr || "—"}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="sec-btn" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="primary-action-btn"
            onClick={() => {
              showToast(`Warranty record verified & registered for ${activeItem.productDetails || "Product #" + (selectedItemIdx + 1)} (${itemBarcodeStr})`, "success");
              onClose();
            }}
          >
            ✓ Complete Warranty Registration
          </button>
        </div>
      </div>
    </div>
  );
});

WarrantyRegistrationModal.displayName = "WarrantyRegistrationModal";

