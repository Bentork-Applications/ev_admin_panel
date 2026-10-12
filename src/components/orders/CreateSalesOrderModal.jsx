import React, { useState, useEffect, useMemo, useCallback } from "react";
import { X } from "lucide-react";
import { OrderItemsEditor } from "./OrderItemsEditor";
import { orderService } from "../../services/orderService";
import { userService } from "../../services/userService";
import { createDefaultOrderItem } from "../../utils/formatters";

export const CreateSalesOrderModal = React.memo(({
  showCreateModal,
  isOpen,
  onClose,
  onSuccess,
  showToast,
  salesFormData: externalFormData,
  setSalesFormData: externalSetFormData,
  salesFormErrors: externalFormErrors,
  handleCreateSalesOrder: externalHandleCreate,
  submitting: externalSubmitting,
  customerSearchTerm: externalSearchTerm,
  setCustomerSearchTerm: externalSetSearchTerm,
  showCustomerDropdown: externalShowDropdown,
  setShowCustomerDropdown: externalSetShowDropdown,
  registeredUsers: externalRegisteredUsers
}) => {
  const visible = showCreateModal !== undefined ? showCreateModal : isOpen;

  // Standalone mode internal state
  const [internalFormData, setInternalFormData] = useState({
    assignedUserId: null,
    customerName: "",
    customerEmail: "",
    mobileNumber: "",
    piNumber: "",
    orderItems: [createDefaultOrderItem()],
    expectedDeliveryDate: "",
    totalInvoiceAmount: "",
    receivedAmount: "",
    priority: "medium",
    address: ""
  });
  const [internalFormErrors, setInternalFormErrors] = useState({});
  const [internalSubmitting, setInternalSubmitting] = useState(false);
  const [internalCustomerSearchTerm, setInternalCustomerSearchTerm] = useState("");
  const [internalShowCustomerDropdown, setInternalShowCustomerDropdown] = useState(false);
  const [internalRegisteredUsers, setInternalRegisteredUsers] = useState([]);

  // Determine whether to use external or internal state
  const isControlled = !!externalFormData && !!externalSetFormData;

  const formData = isControlled ? externalFormData : internalFormData;
  const setFormData = isControlled ? externalSetFormData : setInternalFormData;
  const formErrors = isControlled ? (externalFormErrors || {}) : internalFormErrors;
  const isSubmitting = isControlled ? (externalSubmitting || false) : internalSubmitting;
  const searchTerm = isControlled ? (externalSearchTerm || "") : internalCustomerSearchTerm;
  const setSearchTerm = isControlled ? externalSetSearchTerm : setInternalCustomerSearchTerm;
  const showDropdown = isControlled ? (externalShowDropdown || false) : internalShowCustomerDropdown;
  const setShowDropdown = isControlled ? externalSetShowDropdown : setInternalShowCustomerDropdown;
  const userList = isControlled ? (externalRegisteredUsers || []) : internalRegisteredUsers;

  // Load registered users if not provided externally
  useEffect(() => {
    if (visible && !isControlled && internalRegisteredUsers.length === 0) {
      userService.getAllUsers()
        .then((users) => {
          setInternalRegisteredUsers(Array.isArray(users) ? users : Array.isArray(users?.data) ? users.data : []);
        })
        .catch(() => {});
    }
  }, [visible, isControlled, internalRegisteredUsers.length]);

  const filteredCustomerList = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return (userList || [])
      .filter((u) => {
        return (
          (u.name || "").toLowerCase().includes(term) ||
          (u.email || "").toLowerCase().includes(term) ||
          (u.mobile || u.mobileNumber || u.phone || "").includes(term)
        );
      })
      .slice(0, 6);
  }, [userList, searchTerm]);

  const handleInternalSubmit = useCallback(async (e) => {
    e.preventDefault();
    const errors = {};
    if (!formData.customerName?.trim()) errors.customerName = "Customer Name is required";
    if (!formData.piNumber?.trim()) errors.piNumber = "P.I. Number is required";
    if (!formData.mobileNumber?.trim() || !/^[0-9]{10}$/.test(formData.mobileNumber.trim())) {
      errors.mobileNumber = "Valid 10-digit mobile number is required";
    }
    if (!formData.expectedDeliveryDate) errors.expectedDeliveryDate = "Expected Delivery Date is required";
    if (!formData.totalInvoiceAmount || parseFloat(formData.totalInvoiceAmount) <= 0) {
      errors.totalInvoiceAmount = "Total Invoice Amount must be greater than 0";
    }

    if (Object.keys(errors).length > 0) {
      setInternalFormErrors(errors);
      showToast?.("Please resolve form errors", "error");
      return;
    }

    setInternalSubmitting(true);
    try {
      const payload = {
        customerName: formData.customerName.trim(),
        assignedUserId: formData.assignedUserId ? Number(formData.assignedUserId) : 1,
        piNumber: formData.piNumber.trim(),
        mobileNumber: formData.mobileNumber.trim(),
        expectedDeliveryDate: formData.expectedDeliveryDate,
        totalInvoiceAmount: parseFloat(formData.totalInvoiceAmount),
        receivedAmount: formData.receivedAmount ? parseFloat(formData.receivedAmount) : 0.0,
        priority: formData.priority || "medium",
        orderItems: (formData.orderItems || []).map((it) => ({
          productDetails: it.productDetails?.trim() || "EV Battery Pack",
          quantity: parseInt(it.quantity, 10) || 1,
          warrantyStartDate: it.warrantyStartDate || null,
          warrantyEndDate: it.warrantyEndDate || null
        }))
      };

      await orderService.salesCreateOrder(payload);
      showToast?.("Sales order created successfully", "success");
      onSuccess?.();
      onClose?.();
    } catch (err) {
      showToast?.(err.message || "Failed to create sales order", "error");
    } finally {
      setInternalSubmitting(false);
    }
  }, [formData, showToast, onSuccess, onClose]);

  if (!visible) return null;

  const handleSubmit = isControlled ? externalHandleCreate : handleInternalSubmit;

  return (
    <div className="modal-overlay" onClick={() => !isSubmitting && onClose()}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Sales Order</h2>
          <button className="close-btn" onClick={onClose} disabled={isSubmitting}>
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!isSubmitting) {
              handleSubmit(e);
            }
          }}
          autoComplete="off"
        >
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
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
              />
              {showDropdown && searchTerm.trim() && (
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
                        setFormData((prev) => ({
                          ...prev,
                          assignedUserId: u.id || u.userId || null,
                          customerName: u.name || "",
                          mobileNumber: u.mobile || u.mobileNumber || u.phone || prev.mobileNumber,
                          customerEmail: u.email || "",
                        }));
                        setSearchTerm(`${u.name} (${u.email || u.mobile || ""})`);
                        setShowDropdown(false);
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
                value={formData.customerName || ""}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              />
              {formErrors.customerName && <span className="field-error">{formErrors.customerName}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>P.I. Number *</label>
                <input
                  type="text"
                  placeholder="e.g. PI-2026-001"
                  value={formData.piNumber || ""}
                  onChange={(e) => setFormData({ ...formData, piNumber: e.target.value })}
                />
                {formErrors.piNumber && <span className="field-error">{formErrors.piNumber}</span>}
              </div>

              <div className="form-group">
                <label>Mobile Number (10 digits) *</label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="e.g. 9876543210"
                  value={formData.mobileNumber || ""}
                  onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                />
                {formErrors.mobileNumber && <span className="field-error">{formErrors.mobileNumber}</span>}
              </div>
            </div>

            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label>Product Line Items & Quantities *</label>
              <OrderItemsEditor data={formData} onChange={setFormData} errors={formErrors} />
            </div>

            <div className="form-group">
              <label>Expected Delivery Date *</label>
              <input
                type="date"
                value={formData.expectedDeliveryDate || ""}
                onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
              />
              {formErrors.expectedDeliveryDate && <span className="field-error">{formErrors.expectedDeliveryDate}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Total Invoice Amount (Including Tax) (₹) *</label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  placeholder="e.g. 50000"
                  value={formData.totalInvoiceAmount || ""}
                  onChange={(e) => setFormData({ ...formData, totalInvoiceAmount: e.target.value })}
                />
                {formErrors.totalInvoiceAmount && <span className="field-error">{formErrors.totalInvoiceAmount}</span>}
              </div>

              <div className="form-group">
                <label>Received Amount (₹)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="e.g. 20000 (Defaults to 0)"
                  value={formData.receivedAmount || ""}
                  onChange={(e) => setFormData({ ...formData, receivedAmount: e.target.value })}
                />
                {formErrors.receivedAmount && <span className="field-error">{formErrors.receivedAmount}</span>}
              </div>

              <div className="form-group">
                <label>Pending Amount (₹) (Calculated)</label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={(() => {
                    const total = parseFloat(formData.totalInvoiceAmount) || 0;
                    const received = parseFloat(formData.receivedAmount) || 0;
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
                value={formData.priority || "medium"}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              {formErrors.priority && <span className="field-error">{formErrors.priority}</span>}
            </div>

            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label>Customer Address (Optional)</label>
              <textarea
                placeholder="Enter customer address..."
                value={formData.address || ""}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={2}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #D1D5DB", borderRadius: "6px", fontSize: "14px" }}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="sec-btn" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="primary-action-btn" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Submit Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

CreateSalesOrderModal.displayName = "CreateSalesOrderModal";
