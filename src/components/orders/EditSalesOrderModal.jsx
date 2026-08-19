import React from "react";
import { X } from "lucide-react";
import { OrderItemsEditor } from "./OrderItemsEditor";

export const EditSalesOrderModal = React.memo(({
  showEditModal,
  onClose,
  editOrderData,
  setEditOrderData,
  editFormErrors,
  handleUpdateSalesOrder,
  submitting
}) => {
  if (!showEditModal || !editOrderData) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Sales Order ({editOrderData.orderNumber})</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleUpdateSalesOrder}>
          <div className="modal-body">
            <div className="form-group">
              <label>Customer Name *</label>
              <input
                type="text"
                value={editOrderData.customerName}
                onChange={(e) => setEditOrderData({ ...editOrderData, customerName: e.target.value })}
              />
              {editFormErrors.customerName && <span className="field-error">{editFormErrors.customerName}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>P.I. Number *</label>
                <input
                  type="text"
                  value={editOrderData.piNumber}
                  onChange={(e) => setEditOrderData({ ...editOrderData, piNumber: e.target.value })}
                />
                {editFormErrors.piNumber && <span className="field-error">{editFormErrors.piNumber}</span>}
              </div>

              <div className="form-group">
                <label>Mobile Number (10 digits) *</label>
                <input
                  type="text"
                  maxLength={10}
                  value={editOrderData.mobileNumber}
                  onChange={(e) => setEditOrderData({ ...editOrderData, mobileNumber: e.target.value })}
                />
                {editFormErrors.mobileNumber && <span className="field-error">{editFormErrors.mobileNumber}</span>}
              </div>
            </div>

            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label>Product Line Items & Quantities *</label>
              <OrderItemsEditor data={editOrderData} onChange={setEditOrderData} errors={editFormErrors} />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Expected Delivery Date *</label>
                <input
                  type="date"
                  value={editOrderData.expectedDeliveryDate}
                  onChange={(e) => setEditOrderData({ ...editOrderData, expectedDeliveryDate: e.target.value })}
                />
                {editFormErrors.expectedDeliveryDate && <span className="field-error">{editFormErrors.expectedDeliveryDate}</span>}
              </div>

              <div className="form-group">
                <label>Warranty Start Date (Optional)</label>
                <input
                  type="date"
                  value={editOrderData.warrantyStartDate || ""}
                  onChange={(e) => setEditOrderData({ ...editOrderData, warrantyStartDate: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Total Invoice Amount (Including Tax) (₹) *</label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  placeholder="e.g. 50000"
                  value={editOrderData.totalInvoiceAmount}
                  onChange={(e) => setEditOrderData({ ...editOrderData, totalInvoiceAmount: e.target.value })}
                />
                {editFormErrors.totalInvoiceAmount && <span className="field-error">{editFormErrors.totalInvoiceAmount}</span>}
              </div>

              <div className="form-group">
                <label>Received Amount (₹)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="e.g. 20000"
                  value={editOrderData.receivedAmount}
                  onChange={(e) => setEditOrderData({ ...editOrderData, receivedAmount: e.target.value })}
                />
                {editFormErrors.receivedAmount && <span className="field-error">{editFormErrors.receivedAmount}</span>}
              </div>

              <div className="form-group">
                <label>Pending Amount (₹) (Calculated)</label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={(() => {
                    const total = parseFloat(editOrderData.totalInvoiceAmount) || 0;
                    const received = parseFloat(editOrderData.receivedAmount) || 0;
                    const pending = Math.max(0, total - received);
                    return `₹ ${pending.toLocaleString("en-IN")}`;
                  })()}
                  style={{ background: "#F1F5F9", color: "#64748B", cursor: "not-allowed" }}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Priority *</label>
              <select
                value={editOrderData.priority}
                onChange={(e) => setEditOrderData({ ...editOrderData, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              {editFormErrors.priority && <span className="field-error">{editFormErrors.priority}</span>}
            </div>

            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label>Customer Address (Optional)</label>
              <textarea
                placeholder="Enter customer address..."
                value={editOrderData.address || ""}
                onChange={(e) => setEditOrderData({ ...editOrderData, address: e.target.value })}
                rows={2}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #D1D5DB", borderRadius: "6px", fontSize: "14px" }}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="sec-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-action-btn" disabled={submitting}>
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

EditSalesOrderModal.displayName = "EditSalesOrderModal";
