import React, { useMemo } from "react";
import { X } from "lucide-react";
import { OrderItemsEditor } from "./OrderItemsEditor";

export const CreateSalesOrderModal = React.memo(({
  showCreateModal,
  onClose,
  salesFormData,
  setSalesFormData,
  salesFormErrors,
  handleCreateSalesOrder,
  submitting,
  customerSearchTerm,
  setCustomerSearchTerm,
  showCustomerDropdown,
  setShowCustomerDropdown,
  registeredUsers
}) => {
  const filteredCustomerList = useMemo(() => {
    if (!customerSearchTerm.trim()) return [];
    const term = customerSearchTerm.toLowerCase();
    return (registeredUsers || [])
      .filter((u) => {
        return (
          (u.name || "").toLowerCase().includes(term) ||
          (u.email || "").toLowerCase().includes(term) ||
          (u.mobile || u.mobileNumber || u.phone || "").includes(term)
        );
      })
      .slice(0, 6);
  }, [registeredUsers, customerSearchTerm]);

  if (!showCreateModal) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Sales Order</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleCreateSalesOrder}>
          <div className="modal-body">
            {/* Registered Customer Search Autocomplete */}
            <div className="form-group" style={{ position: "relative" }}>
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Search Registered Customer (Optional)</span>
                <span style={{ fontSize: "11px", color: "#6B7280" }}>Auto-populates customer details</span>
              </label>
              <input
                type="text"
                placeholder="Search by customer name, email, or mobile..."
                value={customerSearchTerm}
                onChange={(e) => {
                  setCustomerSearchTerm(e.target.value);
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => setShowCustomerDropdown(true)}
              />
              {showCustomerDropdown && customerSearchTerm.trim() && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    zIndex: 99,
                    background: "#FFFFFF",
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                    maxHeight: "180px",
                    overflowY: "auto",
                    marginTop: "4px"
                  }}
                >
                  {filteredCustomerList.map((u) => (
                    <div
                      key={u.id || u.email}
                      style={{
                        padding: "8px 12px",
                        cursor: "pointer",
                        borderBottom: "1px solid #F3F4F6"
                      }}
                      onMouseDown={() => {
                        setSalesFormData((prev) => ({
                          ...prev,
                          assignedUserId: u.id || u.userId || null,
                          customerName: u.name || "",
                          mobileNumber: u.mobile || u.mobileNumber || u.phone || prev.mobileNumber,
                          customerEmail: u.email || "",
                        }));
                        setCustomerSearchTerm(`${u.name} (${u.email || u.mobile || ""})`);
                        setShowCustomerDropdown(false);
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: "13px", color: "#111827" }}>{u.name}</div>
                      <div style={{ fontSize: "11px", color: "#6B7280" }}>
                        {u.email} {u.mobile || u.mobileNumber ? `• 📞 ${u.mobile || u.mobileNumber}` : ""}
                      </div>
                    </div>
                  ))}
                  {filteredCustomerList.length === 0 && (
                    <div style={{ padding: "10px", fontSize: "12px", color: "#9CA3AF", textAlign: "center" }}>
                      No matching registered users found
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Customer Name *</label>
              <input
                type="text"
                placeholder="e.g. John Doe"
                value={salesFormData.customerName}
                onChange={(e) => setSalesFormData({ ...salesFormData, customerName: e.target.value })}
              />
              {salesFormErrors.customerName && <span className="field-error">{salesFormErrors.customerName}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>P.I. Number *</label>
                <input
                  type="text"
                  placeholder="e.g. PI-2026-001"
                  value={salesFormData.piNumber}
                  onChange={(e) => setSalesFormData({ ...salesFormData, piNumber: e.target.value })}
                />
                {salesFormErrors.piNumber && <span className="field-error">{salesFormErrors.piNumber}</span>}
              </div>

              <div className="form-group">
                <label>Mobile Number (10 digits) *</label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="e.g. 9876543210"
                  value={salesFormData.mobileNumber}
                  onChange={(e) => setSalesFormData({ ...salesFormData, mobileNumber: e.target.value })}
                />
                {salesFormErrors.mobileNumber && <span className="field-error">{salesFormErrors.mobileNumber}</span>}
              </div>
            </div>

            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label>Product Line Items & Quantities *</label>
              <OrderItemsEditor data={salesFormData} onChange={setSalesFormData} errors={salesFormErrors} />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Expected Delivery Date *</label>
                <input
                  type="date"
                  value={salesFormData.expectedDeliveryDate}
                  onChange={(e) => setSalesFormData({ ...salesFormData, expectedDeliveryDate: e.target.value })}
                />
                {salesFormErrors.expectedDeliveryDate && <span className="field-error">{salesFormErrors.expectedDeliveryDate}</span>}
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
                  value={salesFormData.totalInvoiceAmount}
                  onChange={(e) => setSalesFormData({ ...salesFormData, totalInvoiceAmount: e.target.value })}
                />
                {salesFormErrors.totalInvoiceAmount && <span className="field-error">{salesFormErrors.totalInvoiceAmount}</span>}
              </div>

              <div className="form-group">
                <label>Received Amount (₹)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="e.g. 20000 (Defaults to 0)"
                  value={salesFormData.receivedAmount}
                  onChange={(e) => setSalesFormData({ ...salesFormData, receivedAmount: e.target.value })}
                />
                {salesFormErrors.receivedAmount && <span className="field-error">{salesFormErrors.receivedAmount}</span>}
              </div>

              <div className="form-group">
                <label>Pending Amount (₹) (Calculated)</label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={(() => {
                    const total = parseFloat(salesFormData.totalInvoiceAmount) || 0;
                    const received = parseFloat(salesFormData.receivedAmount) || 0;
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
                value={salesFormData.priority}
                onChange={(e) => setSalesFormData({ ...salesFormData, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              {salesFormErrors.priority && <span className="field-error">{salesFormErrors.priority}</span>}
            </div>

            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label>Customer Address (Optional)</label>
              <textarea
                placeholder="Enter customer address..."
                value={salesFormData.address || ""}
                onChange={(e) => setSalesFormData({ ...salesFormData, address: e.target.value })}
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
              {submitting ? "Creating..." : "Submit Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

CreateSalesOrderModal.displayName = "CreateSalesOrderModal";
