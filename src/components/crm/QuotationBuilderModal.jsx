import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, FileText, Building, DollarSign, Calendar, Percent, CheckCircle2 } from "lucide-react";
import { crmService } from "../../services/crmService";
import { productService } from "../../services/productService";

export const QuotationBuilderModal = ({
  isOpen,
  onClose,
  initialOpportunity = null,
  onQuotationCreated,
  showToast
}) => {
  const [companies, setCompanies] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [products, setProducts] = useState([]);

  const [companyId, setCompanyId] = useState("");
  const [opportunityId, setOpportunityId] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [discount, setDiscount] = useState(0);
  const [termsAndConditions, setTermsAndConditions] = useState(
    "1. 50% advance payment with purchase order, balance prior to dispatch.\n2. Delivery timeline: 14 business days from advance payment.\n3. Warranty: 3 Years Standard Bentork OEM Warranty."
  );

  const [items, setItems] = useState([
    {
      productId: "",
      productDescription: "",
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0
    }
  ]);

  const [submitting, setSubmitting] = useState(false);

  // Initialize dates: default to 30 days ahead
  useEffect(() => {
    if (isOpen) {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      setValidUntil(d.toISOString().split("T")[0]);

      if (initialOpportunity) {
        setOpportunityId(initialOpportunity.id ? String(initialOpportunity.id) : "");
        setCompanyId(initialOpportunity.companyId ? String(initialOpportunity.companyId) : "");
      }
    }
  }, [isOpen, initialOpportunity]);

  // Load companies, opportunities, and product catalog
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      try {
        const [compData, oppData, prodData] = await Promise.all([
          crmService.getAllCompanies().catch(() => []),
          crmService.getAllOpportunities().catch(() => []),
          productService.getActiveProducts().catch(() => [])
        ]);

        setCompanies(Array.isArray(compData) ? compData : []);
        setOpportunities(Array.isArray(oppData) ? oppData : []);
        setProducts(Array.isArray(prodData) ? prodData : []);
      } catch (err) {
        console.warn("Failed to load quotation form dependencies:", err);
      }
    };

    loadData();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleProductSelect = (index, prodId) => {
    const selectedProd = products.find((p) => String(p.id) === String(prodId));
    setItems((prev) => {
      const next = [...prev];
      const desc = selectedProd
        ? selectedProd.specString || selectedProd.description || `${selectedProd.name} (${selectedProd.voltage || ""} ${selectedProd.capacity || ""})`
        : "";
      next[index] = {
        ...next[index],
        productId: prodId,
        productDescription: desc,
        unitPrice: next[index].unitPrice || 0,
        totalPrice: (next[index].quantity || 1) * (next[index].unitPrice || 0)
      };
      return next;
    });
  };

  const handleQuantityChange = (index, qty) => {
    const parsedQty = Math.max(1, parseInt(qty, 10) || 1);
    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        quantity: parsedQty,
        totalPrice: parsedQty * (next[index].unitPrice || 0)
      };
      return next;
    });
  };

  const handlePriceChange = (index, price) => {
    const parsedPrice = Math.max(0, parseFloat(price) || 0);
    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        unitPrice: parsedPrice,
        totalPrice: (next[index].quantity || 1) * parsedPrice
      };
      return next;
    });
  };

  const handleDescriptionChange = (index, desc) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        productDescription: desc
      };
      return next;
    });
  };

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        productId: "",
        productDescription: "",
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0
      }
    ]);
  };

  const removeItemRow = (index) => {
    if (items.length <= 1) {
      showToast?.("At least one line item is required", "error");
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  const discountAmount = Math.max(0, parseFloat(discount) || 0);
  const finalTotal = Math.max(0, subtotal - discountAmount);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!companyId) {
      showToast?.("Please select a target company", "error");
      return;
    }

    const validItems = items.filter(
      (item) => item.productDescription.trim() && item.quantity > 0 && item.unitPrice >= 0
    );

    if (validItems.length === 0) {
      showToast?.("Please add at least one valid line item with description & price", "error");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        companyId: Number(companyId),
        opportunityId: opportunityId ? Number(opportunityId) : null,
        validUntil: validUntil || null,
        discount: discountAmount,
        termsAndConditions: termsAndConditions.trim() || null,
        items: validItems.map((it) => ({
          productId: it.productId ? Number(it.productId) : null,
          productDescription: it.productDescription.trim(),
          quantity: it.quantity,
          unitPrice: it.unitPrice
        }))
      };

      const created = await crmService.createQuotation(payload);
      showToast?.(`Quotation ${created.quoteNumber} created successfully`, "success");
      onQuotationCreated?.(created);
      onClose();
    } catch (err) {
      console.error("Error creating quotation:", err);
      showToast?.(err.message || "Failed to create quotation", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
        padding: "16px"
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "760px",
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
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px",
            borderBottom: "1px solid #F3F4F6"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                backgroundColor: "#ECFDF5",
                color: "#10B981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <FileText size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#111827" }}>
                Quotation Builder
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#6B7280" }}>
                Generate official price estimate with product catalog specifications
              </p>
            </div>
          </div>
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

        <form onSubmit={handleSubmit} style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          {/* Company & Opportunity Selection */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
                Client / Company *
              </label>
              <select
                required
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #D1D5DB",
                  fontSize: "13px",
                  backgroundColor: "#fff"
                }}
              >
                <option value="">-- Select Company --</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
                Link Opportunity
              </label>
              <select
                value={opportunityId}
                onChange={(e) => setOpportunityId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #D1D5DB",
                  fontSize: "13px",
                  backgroundColor: "#fff"
                }}
              >
                <option value="">-- None (Standalone) --</option>
                {opportunities.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.opportunityNumber} - {o.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
                Valid Until Date
              </label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #D1D5DB",
                  fontSize: "13px",
                  boxSizing: "border-box"
                }}
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <label style={{ fontSize: "13px", fontWeight: 700, color: "#111827" }}>
                Line Items ({items.length})
              </label>
              <button
                type="button"
                onClick={addItemRow}
                style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  backgroundColor: "#ECFDF5",
                  color: "#065F46",
                  border: "1px solid #A7F3D0",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                <Plus size={13} />
                <span>Add Item</span>
              </button>
            </div>

            <div style={{ border: "1px solid #E5E7EB", borderRadius: "8px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#F9FAFB", borderBottom: "1px solid #E5E7EB", textAlign: "left", color: "#6B7280" }}>
                    <th style={{ padding: "8px 10px", width: "30%" }}>Product / Model</th>
                    <th style={{ padding: "8px 10px", width: "35%" }}>Description / Spec</th>
                    <th style={{ padding: "8px 10px", width: "10%", textAlign: "center" }}>Qty</th>
                    <th style={{ padding: "8px 10px", width: "15%", textAlign: "right" }}>Unit Price (₹)</th>
                    <th style={{ padding: "8px 10px", width: "10%", textAlign: "right" }}>Total (₹)</th>
                    <th style={{ padding: "8px 6px", width: "30px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #F3F4F6" }}>
                      <td style={{ padding: "8px 10px" }}>
                        <select
                          value={item.productId}
                          onChange={(e) => handleProductSelect(idx, e.target.value)}
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            borderRadius: "6px",
                            border: "1px solid #D1D5DB",
                            fontSize: "12px",
                            backgroundColor: "#fff"
                          }}
                        >
                          <option value="">-- Custom Item --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} {p.voltage ? `(${p.voltage} ${p.capacity || ""})` : ""}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td style={{ padding: "8px 10px" }}>
                        <input
                          type="text"
                          required
                          placeholder="Specification or custom description..."
                          value={item.productDescription}
                          onChange={(e) => handleDescriptionChange(idx, e.target.value)}
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            borderRadius: "6px",
                            border: "1px solid #D1D5DB",
                            fontSize: "12px",
                            boxSizing: "border-box"
                          }}
                        />
                      </td>

                      <td style={{ padding: "8px 10px", textAlign: "center" }}>
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(idx, e.target.value)}
                          style={{
                            width: "50px",
                            padding: "6px 4px",
                            textAlign: "center",
                            borderRadius: "6px",
                            border: "1px solid #D1D5DB",
                            fontSize: "12px",
                            boxSizing: "border-box"
                          }}
                        />
                      </td>

                      <td style={{ padding: "8px 10px", textAlign: "right" }}>
                        <input
                          type="number"
                          min="0"
                          required
                          value={item.unitPrice}
                          onChange={(e) => handlePriceChange(idx, e.target.value)}
                          style={{
                            width: "80px",
                            padding: "6px 6px",
                            textAlign: "right",
                            borderRadius: "6px",
                            border: "1px solid #D1D5DB",
                            fontSize: "12px",
                            boxSizing: "border-box"
                          }}
                        />
                      </td>

                      <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, color: "#111827" }}>
                        ₹{(item.totalPrice || 0).toLocaleString("en-IN")}
                      </td>

                      <td style={{ padding: "8px 6px", textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#EF4444",
                            cursor: "pointer",
                            padding: "2px"
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pricing Summary & Discount */}
          <div
            style={{
              backgroundColor: "#F9FAFB",
              borderRadius: "10px",
              padding: "16px",
              border: "1px solid #E5E7EB",
              marginBottom: "16px",
              display: "flex",
              justifyContent: "flex-end"
            }}
          >
            <div style={{ width: "260px", display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#6B7280" }}>
                <span>Subtotal:</span>
                <strong style={{ color: "#111827" }}>₹{subtotal.toLocaleString("en-IN")}</strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#6B7280" }}>Discount (₹):</span>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  style={{
                    width: "90px",
                    padding: "4px 8px",
                    textAlign: "right",
                    borderRadius: "6px",
                    border: "1px solid #D1D5DB",
                    fontSize: "12px"
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  paddingTop: "8px",
                  borderTop: "1px solid #E5E7EB",
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "#10B981"
                }}
              >
                <span>Final Amount:</span>
                <span>₹{finalTotal.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
              Terms & Conditions
            </label>
            <textarea
              rows={3}
              value={termsAndConditions}
              onChange={(e) => setTermsAndConditions(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #D1D5DB",
                fontSize: "12px",
                boxSizing: "border-box",
                resize: "vertical"
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: "9px 16px",
                borderRadius: "8px",
                border: "1px solid #D1D5DB",
                backgroundColor: "#ffffff",
                color: "#374151",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "9px 22px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "#10B981",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 600,
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.7 : 1,
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              {submitting ? "Creating..." : "Create Quotation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
