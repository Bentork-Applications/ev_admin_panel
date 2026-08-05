import React, { useMemo } from "react";
import { X } from "lucide-react";
import { calculateExpiryAndTotal } from "../../utils/formatters";

export const WarrantyRegistrationModal = React.memo(({
  showWarrantyModal,
  onClose,
  warrantyModalData,
  scmFormData,
  setScmFormData,
  showToast
}) => {
  const fullY = scmFormData?.fullWarrantyYears ?? Math.floor((Number(scmFormData?.fullWarrantyMonths) || 24) / 12);
  const fullM = scmFormData?.fullWarrantyMonths !== undefined && scmFormData?.fullWarrantyYears !== undefined
    ? scmFormData.fullWarrantyMonths
    : (Number(scmFormData?.fullWarrantyMonths) || 24) % 12;

  const servY = scmFormData?.serviceWarrantyYears ?? Math.floor((Number(scmFormData?.serviceWarrantyMonths) || 0) / 12);
  const servM = scmFormData?.serviceWarrantyMonths !== undefined && scmFormData?.serviceWarrantyYears !== undefined
    ? scmFormData.serviceWarrantyMonths
    : (Number(scmFormData?.serviceWarrantyMonths) || 0) % 12;

  const startDate = scmFormData?.warrantyStartDate || new Date().toISOString().split("T")[0];

  const { totalWarrantyLabel, expiryDateStr } = useMemo(() => {
    return calculateExpiryAndTotal(startDate, fullY, fullM, servY, servM);
  }, [startDate, fullY, fullM, servY, servM]);

  if (!showWarrantyModal || !warrantyModalData) return null;

  const handleChange = (field, val) => {
    setScmFormData((prev) => {
      const updated = { ...prev, [field]: val };
      return updated;
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: "680px" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ background: "#0F172A", color: "#FFFFFF", padding: "18px 24px", borderTopLeftRadius: "12px", borderTopRightRadius: "12px" }}>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>Battery Warranty Registration</h2>
            <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "2px" }}>
              Register warranty record matching Battery Register system format
            </div>
          </div>
          <button className="close-btn" style={{ color: "#94A3B8" }} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: "24px" }}>
          <div style={{ background: "#F1F5F9", padding: "12px 16px", borderRadius: "8px", marginBottom: "18px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>
              Order #{warrantyModalData.orderNumber} • Customer: {warrantyModalData.customerName}
            </div>
            <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
              {warrantyModalData.productDetails}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Barcode / Barcode Range</label>
              <input
                type="text"
                readOnly
                disabled
                value={warrantyModalData.barcode || (warrantyModalData.startBarcode ? `${warrantyModalData.startBarcode} - ${warrantyModalData.endBarcode}` : "—")}
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
              <label>Warranty Start Date *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleChange("warrantyStartDate", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Warranty Expiry Date (Auto-calculated)</label>
              <input
                type="date"
                readOnly
                disabled
                value={expiryDateStr || ""}
                style={{ background: "#F1F5F9", color: "#64748B", cursor: "not-allowed" }}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Full Warranty (Years / Months)</label>
              <div style={{ display: "flex", gap: "6px" }}>
                <input
                  type="number"
                  min="0"
                  placeholder="Yrs"
                  value={fullY}
                  onChange={(e) => handleChange("fullWarrantyYears", e.target.value)}
                  style={{ flex: 1 }}
                />
                <input
                  type="number"
                  min="0"
                  max="11"
                  placeholder="Mos"
                  value={fullM}
                  onChange={(e) => handleChange("fullWarrantyMonths", e.target.value)}
                  style={{ flex: 1 }}
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
                  value={servY}
                  onChange={(e) => handleChange("serviceWarrantyYears", e.target.value)}
                  style={{ flex: 1 }}
                />
                <input
                  type="number"
                  min="0"
                  max="11"
                  placeholder="Mos"
                  value={servM}
                  onChange={(e) => handleChange("serviceWarrantyMonths", e.target.value)}
                  style={{ flex: 1 }}
                />
              </div>
            </div>
          </div>

          <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", padding: "14px", borderRadius: "8px", marginTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#065F46" }}>Calculated Warranty Coverage</div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#047857", marginTop: "4px" }}>
                Total: {totalWarrantyLabel}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#065F46" }}>Expiry Date</div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#047857", marginTop: "4px" }}>
                {expiryDateStr || "—"}
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
              showToast(`Warranty registered successfully for Barcode ${warrantyModalData.barcode || warrantyModalData.orderNumber}`, "success");
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
