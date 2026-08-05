import React, { useMemo } from "react";
import { X, FileText, Layers, Edit2, Sparkles, Truck, Clock, CheckCircle } from "lucide-react";
import { OrderProgressStepper } from "./OrderProgressStepper";
import { OrderItemsEditor } from "./OrderItemsEditor";
import { calculateExpiryAndTotal } from "../../utils/formatters";

export const OrderDetailsDrawer = React.memo(({
  showDrawer,
  selectedOrder,
  onClose,
  isSalesAdmin,
  isProductionAdmin,
  isScmAdmin,
  isSuperAdmin,
  submitting,
  recordPaymentAmount,
  setRecordPaymentAmount,
  handleRecordIncrementalPayment,
  handleUpdateProductionStatus,
  openEditSalesModal,
  openWarrantyModal,
  openScmModal,
  handleDispatchOrder,
  handleMarkAsDelivered,
  generateOrderPdfReport,
  formatDate,
  openDrawerItemsEdit,
  isEditingDrawerProductDetails,
  setIsEditingDrawerProductDetails,
  drawerOrderItems,
  setDrawerOrderItems,
  handleSaveDrawerProductDetails,
  editFormErrors
}) => {
  const productItemsList = useMemo(() => {
    if (!selectedOrder) return [];
    if (Array.isArray(selectedOrder.orderItems) && selectedOrder.orderItems.length > 0) {
      return selectedOrder.orderItems;
    }
    return [{
      id: "single_1",
      productDetails: selectedOrder.productDetails || "EV Battery Unit",
      quantity: selectedOrder.quantity || selectedOrder.partQuantity || 1,
      barcode: selectedOrder.barcode || (selectedOrder.startBarcode ? `${selectedOrder.startBarcode} - ${selectedOrder.endBarcode}` : ""),
      startBarcode: selectedOrder.startBarcode || "",
      endBarcode: selectedOrder.endBarcode || "",
      warrantyStartDate: selectedOrder.warrantyStartDate || "",
      warrantyEndDate: selectedOrder.warrantyEndDate || "",
      fullWarrantyYears: selectedOrder.fullWarrantyYears,
      fullWarrantyMonths: selectedOrder.fullWarrantyMonths,
      serviceWarrantyYears: selectedOrder.serviceWarrantyYears,
      serviceWarrantyMonths: selectedOrder.serviceWarrantyMonths,
      totalWarrantyLabel: selectedOrder.totalWarrantyLabel
    }];
  }, [selectedOrder]);

  if (!showDrawer || !selectedOrder) return null;

  const getProductWarrantyInfo = (item) => {
    const startDate = item.warrantyStartDate || selectedOrder.warrantyStartDate || "";
    const endDate = item.warrantyEndDate || selectedOrder.warrantyEndDate || "";

    let fullY = item.fullWarrantyYears;
    let fullM = item.fullWarrantyMonths;
    let servY = item.serviceWarrantyYears;
    let servM = item.serviceWarrantyMonths;

    if (fullY === undefined && fullM === undefined && selectedOrder.fullWarrantyMonths !== undefined) {
      const fM = Number(selectedOrder.fullWarrantyMonths) || 0;
      fullY = Math.floor(fM / 12);
      fullM = fM % 12;
    }
    if (servY === undefined && servM === undefined && selectedOrder.serviceWarrantyMonths !== undefined) {
      const sM = Number(selectedOrder.serviceWarrantyMonths) || 0;
      servY = Math.floor(sM / 12);
      servM = sM % 12;
    }

    const { totalWarrantyLabel, expiryDateStr } = calculateExpiryAndTotal(
      startDate,
      fullY ?? "1",
      fullM ?? "0",
      servY ?? "0",
      servM ?? "0"
    );

    const formatDuration = (years, months) => {
      const y = parseInt(years, 10) || 0;
      const m = parseInt(months, 10) || 0;
      if (y > 0 && m > 0) return `${y} Year${y > 1 ? "s" : ""} ${m} Month${m > 1 ? "s" : ""}`;
      if (y > 0) return `${y} Year${y > 1 ? "s" : ""}`;
      if (m > 0) return `${m} Month${m > 1 ? "s" : ""}`;
      return "0 Years";
    };

    let barcodeStr = item.barcode;
    if (!barcodeStr) {
      if (Array.isArray(item.barcodes) && item.barcodes.length > 0) {
        barcodeStr = item.barcodes.length === 1 ? item.barcodes[0] : `${item.barcodes[0]} - ${item.barcodes[item.barcodes.length - 1]}`;
      } else if (item.startBarcode) {
        barcodeStr = item.endBarcode && item.startBarcode !== item.endBarcode ? `${item.startBarcode} - ${item.endBarcode}` : item.startBarcode;
      } else {
        barcodeStr = selectedOrder.barcode || (selectedOrder.startBarcode ? `${selectedOrder.startBarcode} - ${selectedOrder.endBarcode}` : "—");
      }
    }

    return {
      productName: item.productDetails || selectedOrder.productDetails || "EV Battery Unit",
      barcode: barcodeStr || "—",
      warrantyStartDate: startDate || "—",
      fullWarranty: formatDuration(fullY ?? 1, fullM ?? 0),
      serviceWarranty: formatDuration(servY ?? 0, servM ?? 0),
      totalWarranty: item.totalWarrantyLabel || totalWarrantyLabel || "—",
      warrantyEndDate: endDate || expiryDateStr || "—"
    };
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <h2>Order Details</h2>
            <div className="order-number-subtitle">{selectedOrder.orderNumber || `ORD-#${selectedOrder.id}`}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {selectedOrder.orderStatus === "dispatched" && (
              <button
                onClick={() => generateOrderPdfReport(selectedOrder)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  background: "#EFF6FF",
                  border: "1px solid #BFDBFE",
                  borderRadius: "6px",
                  color: "#1D4ED8",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                <FileText size={14} /> PDF Report
              </button>
            )}
            <button className="close-drawer-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="drawer-body">
          {/* Order Lifecycle Progress Stepper */}
          <div className="drawer-section">
            <h4 className="section-title">Order Lifecycle Progress</h4>
            <OrderProgressStepper selectedOrder={selectedOrder} />
          </div>

          {/* Product Line Items & Quantities Section */}
          <div className="drawer-section">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h4 className="section-title" style={{ margin: 0 }}>
                <Layers size={16} /> Product Line Items & Quantities
              </h4>
              {!isEditingDrawerProductDetails && (isSalesAdmin || isSuperAdmin) && selectedOrder.orderStatus === "sales_registered" && (
                <button
                  type="button"
                  onClick={openDrawerItemsEdit}
                  style={{
                    background: "#EFF6FF",
                    border: "1px solid #BFDBFE",
                    color: "#1D4ED8",
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "4px 8px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  <Edit2 size={12} /> Edit Line Items
                </button>
              )}
            </div>

            {isEditingDrawerProductDetails ? (
              <div style={{ background: "#F8FAFC", border: "1px solid #CBD5E1", borderRadius: "10px", padding: "14px" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#1E3A8A", marginBottom: "10px" }}>
                  Editing Line Items for Order #{selectedOrder.orderNumber}
                </div>
                <OrderItemsEditor
                  data={{ orderItems: drawerOrderItems }}
                  onChange={(newData) => setDrawerOrderItems(newData.orderItems)}
                  errors={editFormErrors}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "12px" }}>
                  <button
                    type="button"
                    className="sec-btn"
                    onClick={() => setIsEditingDrawerProductDetails(false)}
                    style={{ padding: "6px 12px", fontSize: "12px" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="primary-action-btn"
                    onClick={handleSaveDrawerProductDetails}
                    disabled={submitting}
                    style={{ padding: "6px 12px", fontSize: "12px" }}
                  >
                    {submitting ? "Saving..." : "Save Product Details"}
                  </button>
                </div>
              </div>
            ) : Array.isArray(selectedOrder.orderItems) && selectedOrder.orderItems.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {selectedOrder.orderItems.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    style={{
                      background: "#F8FAFC",
                      border: "1px solid #E2E8F0",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A" }}>
                        Product #{idx + 1}: {item.productDetails || "EV Battery Pack"}
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>
                        Project Category: {item.project || selectedOrder.project || "EV Battery"}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "#2563EB", background: "#EFF6FF", padding: "2px 8px", borderRadius: "10px" }}>
                        Qty: {item.quantity || 1} unit{(item.quantity || 1) > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="details-grid">
                <div className="detail-item full-width">
                  <span className="label">Product Details</span>
                  <span className="val highlight">{selectedOrder.productDetails || "—"}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Quantity</span>
                  <span className="val">{selectedOrder.quantity || selectedOrder.partQuantity || 1} units</span>
                </div>
                <div className="detail-item">
                  <span className="label">Project / Application</span>
                  <span className="val">{selectedOrder.project || "EV Battery"}</span>
                </div>
              </div>
            )}
          </div>

          {/* Customer & Invoice Details */}
          <div className="drawer-section">
            <h4 className="section-title">Customer & Invoice Details</h4>
            <div className="details-grid">
              <div className="detail-item">
                <span className="label">Customer Name</span>
                <span className="val">{selectedOrder.customerName || "—"}</span>
              </div>
              <div className="detail-item">
                <span className="label">P.I. Number</span>
                <span className="val">{selectedOrder.piNumber || "—"}</span>
              </div>
              <div className="detail-item">
                <span className="label">Mobile Number</span>
                <span className="val">{selectedOrder.mobileNumber || "—"}</span>
              </div>
              <div className="detail-item">
                <span className="label">Customer Email</span>
                <span className="val">{selectedOrder.customerEmail || "—"}</span>
              </div>
              <div className="detail-item">
                <span className="label">Expected Delivery Date</span>
                <span className="val">{selectedOrder.expectedDeliveryDate || "—"}</span>
              </div>
              <div className="detail-item">
                <span className="label">Priority Level</span>
                <span className="val" style={{ textTransform: "capitalize" }}>{selectedOrder.priority || "Medium"}</span>
              </div>
              <div className="detail-item full-width">
                <span className="label">Customer Shipping Address</span>
                <span className="val">{selectedOrder.address || "—"}</span>
              </div>
            </div>
          </div>

          {/* Financials & Payments */}
          <div className="drawer-section">
            <h4 className="section-title">Financials & Payment Status</h4>
            <div className="details-grid">
              <div className="detail-item">
                <span className="label">Total Invoice Amount</span>
                <span className="val highlight">₹{parseFloat(selectedOrder.totalInvoiceAmount || selectedOrder.totalAmount || selectedOrder.totalPrice || 0).toLocaleString("en-IN")}</span>
              </div>
              <div className="detail-item">
                <span className="label">Received Amount</span>
                <span className="val" style={{ color: "#059669" }}>₹{parseFloat(selectedOrder.receivedAmount || 0).toLocaleString("en-IN")}</span>
              </div>
              <div className="detail-item">
                <span className="label">Pending Balance</span>
                <span className="val" style={{ color: (selectedOrder.pendingAmount || 0) > 0 ? "#DC2626" : "#059669" }}>
                  ₹{parseFloat(selectedOrder.pendingAmount !== undefined && selectedOrder.pendingAmount !== null ? selectedOrder.pendingAmount : Math.max(0, (selectedOrder.totalInvoiceAmount || 0) - (selectedOrder.receivedAmount || 0))).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="detail-item">
                <span className="label">Payment Status</span>
                <span className="val" style={{ textTransform: "capitalize" }}>{selectedOrder.paymentStatus || "Pending"}</span>
              </div>
            </div>
          </div>

          {/* Manufacturing & Production Progress */}
          <div className="drawer-section">
            <h4 className="section-title">
              <Sparkles size={16} /> Manufacturing & Production Status
            </h4>
            <div className="details-grid">
              <div className="detail-item">
                <span className="label">Production Pipeline Stage</span>
                <span className="val">
                  <span className={`prod-status-tag ${selectedOrder.productionStatus || "pending"}`}>
                    {selectedOrder.productionStatus === "in_progress"
                      ? "In Production"
                      : selectedOrder.productionStatus === "testing"
                        ? "Testing"
                        : selectedOrder.productionStatus === "completed"
                          ? "Completed"
                          : "Pending"}
                  </span>
                </span>
              </div>
              <div className="detail-item">
                <span className="label">Production Updated By</span>
                <span className="val">{selectedOrder.productionUpdatedByEmail || "—"}</span>
              </div>
            </div>
          </div>

          {/* SCM & Logistics Information */}
          <div className="drawer-section">
            <h4 className="section-title">
              <Truck size={16} /> SCM & Product-Wise Warranty Details
            </h4>

            {/* Common Logistics Information */}
            <div className="details-grid" style={{ marginBottom: "14px" }}>
              <div className="detail-item">
                <span className="label">Invoice Number</span>
                <span className="val">{selectedOrder.invoiceNumber || "—"}</span>
              </div>
              <div className="detail-item">
                <span className="label">Courier Name</span>
                <span className="val highlight">{selectedOrder.courierName || "—"}</span>
              </div>
              <div className="detail-item">
                <span className="label">Tracking ID</span>
                <span className="val">{selectedOrder.trackingId || "—"}</span>
              </div>
            </div>

            {/* Product-Wise Warranty Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {productItemsList.map((item, idx) => {
                const info = getProductWarrantyInfo(item);
                return (
                  <div
                    key={item.id || idx}
                    style={{
                      background: "#F8FAFC",
                      border: "1px solid #E2E8F0",
                      borderRadius: "10px",
                      padding: "14px"
                    }}
                  >
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#1E3A8A", marginBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>Product #{idx + 1}: {info.productName}</span>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#2563EB", background: "#EFF6FF", padding: "2px 8px", borderRadius: "10px" }}>
                        Qty: {item.quantity || 1} unit{(item.quantity || 1) > 1 ? "s" : ""}
                      </span>
                    </div>

                    <div className="details-grid">
                      <div className="detail-item">
                        <span className="label">Barcode</span>
                        <span className="val">{info.barcode}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Warranty Start Date</span>
                        <span className="val">{info.warrantyStartDate}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Full Warranty</span>
                        <span className="val">{info.fullWarranty}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Service Warranty</span>
                        <span className="val">{info.serviceWarranty}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Total Warranty</span>
                        <span className="val highlight">{info.totalWarranty}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Warranty Expiry Date</span>
                        <span className="val highlight">{info.warrantyEndDate}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Audit & Timestamps */}
          <div className="drawer-section">
            <h4 className="section-title">
              <Clock size={16} /> Audit & Timestamps
            </h4>
            <div className="details-grid">
              <div className="detail-item">
                <span className="label">Created By</span>
                <span className="val">{selectedOrder.createdByAdminEmail || "—"}</span>
              </div>
              <div className="detail-item">
                <span className="label">Created Time</span>
                <span className="val">{formatDate(selectedOrder.createdAt)}</span>
              </div>
              <div className="detail-item">
                <span className="label">Updated Time</span>
                <span className="val">{formatDate(selectedOrder.updatedAt)}</span>
              </div>
              <div className="detail-item">
                <span className="label">Production Completed Time</span>
                <span className="val">{formatDate(selectedOrder.productionCompletedAt)}</span>
              </div>
              <div className="detail-item">
                <span className="label">SCM Completed Time</span>
                <span className="val">{formatDate(selectedOrder.scmCompletedAt)}</span>
              </div>
              <div className="detail-item">
                <span className="label">Dispatch Time</span>
                <span className="val">{formatDate(selectedOrder.dispatchedAt)}</span>
              </div>
            </div>
          </div>

          {/* Action Toolbar Inside Drawer */}
          {(isSalesAdmin || isProductionAdmin || isScmAdmin || isSuperAdmin) && (
            <div className="drawer-actions-bar" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {isSalesAdmin && selectedOrder.orderStatus === "sales_registered" && (
                <button className="primary-action-btn full-w" onClick={() => openEditSalesModal(selectedOrder)}>
                  <Edit2 size={16} /> Edit Sales Order
                </button>
              )}

              {isSalesAdmin && (selectedOrder.paymentStatus || "").toLowerCase() !== "paid" && (
                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>Record Incremental Payment</span>
                  <form onSubmit={handleRecordIncrementalPayment} style={{ display: "flex", gap: "8px", margin: 0 }}>
                    <div style={{ flex: 1, position: "relative" }}>
                      <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "13px", color: "#64748B", fontWeight: 600 }}>₹</span>
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        placeholder="Amount"
                        value={recordPaymentAmount}
                        onChange={(e) => setRecordPaymentAmount(e.target.value)}
                        style={{ width: "100%", padding: "8px 8px 8px 24px", border: "1px solid #CBD5E1", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box" }}
                      />
                    </div>
                    <button type="submit" className="primary-action-btn" disabled={submitting}>
                      Save
                    </button>
                  </form>
                </div>
              )}

              {isProductionAdmin && selectedOrder.orderStatus !== "dispatched" && (
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    className="status-transition-btn start-prod"
                    style={{ flex: 1, padding: "10px" }}
                    onClick={() => handleUpdateProductionStatus(selectedOrder.id, "in_progress")}
                    disabled={submitting}
                  >
                    Start Production
                  </button>
                  <button
                    className="status-transition-btn complete-prod"
                    style={{ flex: 1, padding: "10px" }}
                    onClick={() => handleUpdateProductionStatus(selectedOrder.id, "completed")}
                    disabled={submitting}
                  >
                    Mark Production Complete
                  </button>
                </div>
              )}

              {isScmAdmin && (
                <>
                  <button
                    className="scm-action-btn fill-details"
                    style={{ width: "100%", padding: "10px", justifyContent: "center", fontSize: "13px" }}
                    onClick={() => { onClose(); openScmModal(selectedOrder); }}
                  >
                    Fill SCM Details
                  </button>

                  <button
                    className="scm-action-btn dispatch-btn"
                    style={{ width: "100%", padding: "10px", justifyContent: "center", fontSize: "13px" }}
                    onClick={() => handleDispatchOrder(selectedOrder.id)}
                    disabled={submitting}
                  >
                    <Truck size={16} /> Mark as Dispatched
                  </button>

                  <button
                    className="primary-action-btn full-w"
                    style={{ background: "#059669" }}
                    onClick={() => openWarrantyModal(selectedOrder)}
                  >
                    Register / Update Warranty
                  </button>

                  {selectedOrder.orderStatus === "dispatched" && (
                    <button
                      className="primary-action-btn full-w"
                      style={{ background: "#2563EB" }}
                      onClick={() => handleMarkAsDelivered(selectedOrder.id)}
                      disabled={submitting}
                    >
                      <CheckCircle size={16} /> Mark as Delivered & Generate Overview PDF
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

OrderDetailsDrawer.displayName = "OrderDetailsDrawer";
