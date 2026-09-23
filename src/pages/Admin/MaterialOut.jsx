import React, { useState, useEffect, useMemo, useCallback } from "react";
import { inventoryService } from "../../services/inventoryService";
import { productService } from "../../services/productService";
import { Toast } from "../../components/common/Toast";
import {
  ArrowUpRight,
  Plus,
  Search,
  RefreshCw,
  Barcode,
  Package,
  User,
  Calendar,
  X,
  AlertCircle,
  Tag,
  CheckCircle2,
  ScanLine
} from "lucide-react";

export default function MaterialOut() {
  const [materialOuts, setMaterialOuts] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [selectedProductId, setSelectedProductId] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeSearching, setBarcodeSearching] = useState(false);
  const [barcodeLookupSuccess, setBarcodeLookupSuccess] = useState(null);

  const [quantity, setQuantity] = useState(1);
  const [purpose, setPurpose] = useState("Production Assembly");
  const [issuedTo, setIssuedTo] = useState("");
  const [notes, setNotes] = useState("");
  const [formErrors, setFormErrors] = useState({});

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [matOutData, stockData, prodData] = await Promise.all([
        inventoryService.getAllMaterialOut().catch(() => []),
        inventoryService.getAllStock().catch(() => []),
        productService.getActiveProducts().catch(() => [])
      ]);
      setMaterialOuts(Array.isArray(matOutData) ? matOutData : []);
      setStocks(Array.isArray(stockData) ? stockData : []);
      setProducts(Array.isArray(prodData) ? prodData : []);
    } catch (err) {
      console.error("Error fetching Material OUT data:", err);
      setError(err.message || "Failed to load Material OUT data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Current selected product stock info
  const selectedProductStock = useMemo(() => {
    if (!selectedProductId) return 0;
    const stockItem = stocks.find((s) => s.product?.id === Number(selectedProductId));
    return stockItem ? stockItem.availableQuantity || 0 : 0;
  }, [selectedProductId, stocks]);

  // Selected product object
  const selectedProductObj = useMemo(() => {
    if (!selectedProductId) return null;
    return products.find((p) => String(p.id) === String(selectedProductId)) || null;
  }, [selectedProductId, products]);

  // Barcode Lookup Handler
  const handleBarcodeLookup = async (e) => {
    if (e) e.preventDefault();
    if (!barcodeInput.trim()) return;

    setBarcodeSearching(true);
    setBarcodeLookupSuccess(null);
    try {
      const product = await inventoryService.lookupProductByBarcode(barcodeInput.trim());
      if (product && product.id) {
        setSelectedProductId(String(product.id));
        setBarcodeLookupSuccess(`Found: ${product.name} (${product.category || "General"})`);
      } else {
        showToast("No product found with this barcode", "error");
      }
    } catch (err) {
      console.error("Barcode lookup error:", err);
      showToast(err.message || "Barcode lookup failed. Try selecting manually.", "error");
    } finally {
      setBarcodeSearching(false);
    }
  };

  // Validation
  const validateForm = () => {
    const errors = {};
    if (!selectedProductId) errors.product = "Please select or scan a product";
    if (!issuedTo.trim()) errors.issuedTo = "Recipient name is required";
    if (!purpose.trim()) errors.purpose = "Purpose is required";

    const qtyNum = parseInt(quantity, 10);
    if (isNaN(qtyNum) || qtyNum < 1) {
      errors.quantity = "Quantity must be at least 1";
    } else if (qtyNum > selectedProductStock) {
      errors.quantity = `Requested quantity (${qtyNum}) exceeds available stock (${selectedProductStock})`;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        productId: Number(selectedProductId),
        quantity: Number(quantity),
        purpose: purpose.trim(),
        issuedTo: issuedTo.trim(),
        notes: notes.trim() || null
      };

      const result = await inventoryService.processMaterialOut(payload);
      showToast(`Material Outward Issue #${result?.issueNumber || ""} completed! Stock updated.`, "success");
      setShowIssueModal(false);
      setSelectedProductId("");
      setBarcodeInput("");
      setBarcodeLookupSuccess(null);
      setQuantity(1);
      setIssuedTo("");
      setNotes("");
      setFormErrors({});
      fetchData();
    } catch (err) {
      console.error("Error processing Material OUT:", err);
      showToast(err.message || "Failed to process Material OUT", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered List
  const filteredMaterialOuts = useMemo(() => {
    if (!searchQuery.trim()) return materialOuts;
    const q = searchQuery.toLowerCase().trim();
    return materialOuts.filter(
      (m) =>
        m.issueNumber?.toLowerCase().includes(q) ||
        m.product?.name?.toLowerCase().includes(q) ||
        m.issuedTo?.toLowerCase().includes(q) ||
        m.purpose?.toLowerCase().includes(q) ||
        m.issuedByEmail?.toLowerCase().includes(q)
    );
  }, [materialOuts, searchQuery]);

  return (
    <div style={{ padding: "20px 24px", maxWidth: "1400px", margin: "0 auto", boxSizing: "border-box", fontFamily: "Roboto, sans-serif" }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <style>{`
        .matout-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .matout-title {
          font-size: 22px;
          font-weight: 700;
          color: #0F172A;
          margin: 0 0 4px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .matout-card-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 14px;
          margin-bottom: 20px;
        }
        .matout-stat-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .matout-stat-icon {
          width: 44px;
          height: 44px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .matout-controls {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 10px 10px 0 0;
          padding: 14px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          border-bottom: none;
        }
        .matout-table-wrap {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 0 0 10px 10px;
          overflow-x: auto;
        }
        .matout-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 13px;
        }
        .matout-table th {
          background: #F8FAFC;
          color: #475569;
          font-weight: 600;
          padding: 12px 16px;
          border-bottom: 1px solid #E2E8F0;
          white-space: nowrap;
        }
        .matout-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #F1F5F9;
          color: #334155;
          vertical-align: middle;
        }
        .matout-table tr:hover td {
          background: #F8FAFC;
        }
        .matout-btn-primary {
          background: #2563EB;
          color: #FFFFFF;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: background 0.2s;
        }
        .matout-btn-primary:hover {
          background: #1D4ED8;
        }
        .matout-btn-secondary {
          background: #F1F5F9;
          color: #334155;
          border: 1px solid #CBD5E1;
          padding: 7px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .matout-btn-secondary:hover {
          background: #E2E8F0;
        }
        .matout-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }
        .matout-modal {
          background: #FFFFFF;
          border-radius: 12px;
          width: 100%;
          max-width: 620px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        .matout-modal-header {
          padding: 16px 20px;
          border-bottom: 1px solid #E2E8F0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .matout-modal-body {
          padding: 20px;
        }
        .matout-modal-footer {
          padding: 14px 20px;
          border-top: 1px solid #E2E8F0;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          background: #F8FAFC;
          border-radius: 0 0 12px 12px;
        }
      `}</style>

      {/* Header */}
      <div className="matout-header">
        <div>
          <h1 className="matout-title">
            <ArrowUpRight size={24} color="#2563EB" /> Material OUT (Issue & Dispatch)
          </h1>
          <p style={{ fontSize: "13px", color: "#64748B", margin: 0 }}>
            Issue raw materials and batteries for production, maintenance, or orders with real-time stock validation and barcode lookup.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="matout-btn-secondary" onClick={fetchData} title="Refresh Material OUT records">
            <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
          </button>
          <button className="matout-btn-primary" onClick={() => setShowIssueModal(true)}>
            <Plus size={16} /> Issue Material
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="matout-card-grid">
        <div className="matout-stat-card">
          <div className="matout-stat-icon" style={{ background: "#EFF6FF", color: "#2563EB" }}>
            <ArrowUpRight size={22} />
          </div>
          <div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#0F172A" }}>{materialOuts.length}</div>
            <div style={{ fontSize: "12px", color: "#64748B" }}>Total Material OUT Issues</div>
          </div>
        </div>

        <div className="matout-stat-card">
          <div className="matout-stat-icon" style={{ background: "#ECFDF5", color: "#059669" }}>
            <Package size={22} />
          </div>
          <div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#0F172A" }}>
              {materialOuts.reduce((sum, m) => sum + (m.quantity || 0), 0)}
            </div>
            <div style={{ fontSize: "12px", color: "#64748B" }}>Total Units Issued</div>
          </div>
        </div>

        <div className="matout-stat-card">
          <div className="matout-stat-icon" style={{ background: "#FEF3C7", color: "#D97706" }}>
            <Tag size={22} />
          </div>
          <div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#0F172A" }}>
              {new Set(materialOuts.map((m) => m.purpose)).size}
            </div>
            <div style={{ fontSize: "12px", color: "#64748B" }}>Distinct Issue Purposes</div>
          </div>
        </div>
      </div>

      {/* Table Controls */}
      <div className="matout-controls">
        <div style={{ display: "flex", alignItems: "center", background: "#F8FAFC", border: "1px solid #CBD5E1", borderRadius: "6px", padding: "6px 12px", width: "320px" }}>
          <Search size={16} color="#64748B" />
          <input
            type="text"
            placeholder="Search Issue#, Product, Recipient, Purpose..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ border: "none", background: "transparent", outline: "none", fontSize: "13px", marginLeft: "8px", width: "100%", color: "#1E293B" }}
          />
        </div>
        <div style={{ fontSize: "12px", color: "#64748B" }}>
          Showing <b>{filteredMaterialOuts.length}</b> of <b>{materialOuts.length}</b> records
        </div>
      </div>

      {/* Table */}
      <div className="matout-table-wrap">
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
            <RefreshCw size={24} className="spin" style={{ margin: "0 auto 10px auto" }} />
            <div>Loading Material OUT history...</div>
          </div>
        ) : error ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#DC2626" }}>
            <AlertCircle size={24} style={{ margin: "0 auto 10px auto" }} />
            <div>{error}</div>
            <button className="matout-btn-secondary" onClick={fetchData} style={{ marginTop: "12px" }}>
              Retry
            </button>
          </div>
        ) : filteredMaterialOuts.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
            <ArrowUpRight size={32} style={{ margin: "0 auto 10px auto", opacity: 0.5 }} />
            <div style={{ fontWeight: 600, fontSize: "14px", color: "#334155" }}>No Material OUT records found</div>
            <div style={{ fontSize: "12px", marginTop: "4px" }}>
              Click "Issue Material" to issue items out of warehouse inventory
            </div>
          </div>
        ) : (
          <table className="matout-table">
            <thead>
              <tr>
                <th>Issue Number</th>
                <th>Product</th>
                <th>Issued Qty</th>
                <th>Issued To (Recipient)</th>
                <th>Purpose</th>
                <th>Date & Issuer</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredMaterialOuts.map((matOut) => (
                <tr key={matOut.id}>
                  <td style={{ fontWeight: 600, color: "#0F172A" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <ArrowUpRight size={16} color="#2563EB" />
                      {matOut.issueNumber}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: "#0F172A" }}>
                      {matOut.product?.name || "Product"}
                    </span>
                    <div style={{ fontSize: "11px", color: "#64748B" }}>
                      {matOut.product?.category || "General"}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: "#DC2626", background: "#FEF2F2", padding: "2px 8px", borderRadius: "10px" }}>
                      -{matOut.quantity} units
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 500 }}>
                      <User size={14} color="#64748B" />
                      {matOut.issuedTo}
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        padding: "3px 8px",
                        background: "#F1F5F9",
                        color: "#334155",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 500
                      }}
                    >
                      {matOut.purpose}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", fontSize: "12px" }}>
                      <span style={{ color: "#334155" }}>
                        {matOut.issueDate ? String(matOut.issueDate) : matOut.createdAt ? new Date(matOut.createdAt).toLocaleDateString() : "—"}
                      </span>
                      <span style={{ color: "#94A3B8", fontSize: "11px" }}>
                        By: {matOut.issuedByEmail || "SCM Admin"}
                      </span>
                    </div>
                  </td>
                  <td style={{ color: "#64748B", maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {matOut.notes || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Issue Material Modal */}
      {showIssueModal && (
        <div className="matout-modal-overlay" onClick={() => setShowIssueModal(false)}>
          <div className="matout-modal" onClick={(e) => e.stopPropagation()}>
            <div className="matout-modal-header">
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
                Issue Material OUT (Warehouse Issuance)
              </h3>
              <button
                onClick={() => setShowIssueModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B" }}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleIssueSubmit}>
              <div className="matout-modal-body">
                {/* Barcode Quick Lookup Section */}
                <div style={{ background: "#F8FAFC", padding: "12px 14px", borderRadius: "8px", border: "1px solid #E2E8F0", marginBottom: "16px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155", display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                    <ScanLine size={14} color="#2563EB" /> Quick Barcode Scan / Lookup
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="text"
                      placeholder="Scan or enter barcode (e.g. BAT-48V-001)..."
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleBarcodeLookup();
                        }
                      }}
                      style={{ flex: 1, padding: "7px 10px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "13px" }}
                    />
                    <button
                      type="button"
                      className="matout-btn-secondary"
                      onClick={handleBarcodeLookup}
                      disabled={barcodeSearching}
                    >
                      {barcodeSearching ? "Searching..." : "Lookup"}
                    </button>
                  </div>
                  {barcodeLookupSuccess && (
                    <div style={{ color: "#059669", fontSize: "12px", marginTop: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
                      <CheckCircle2 size={14} /> {barcodeLookupSuccess}
                    </div>
                  )}
                </div>

                {/* Product Select Dropdown */}
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                    Select Product *
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => {
                      setSelectedProductId(e.target.value);
                      setBarcodeLookupSuccess(null);
                    }}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "13px" }}
                    required
                  >
                    <option value="">-- Choose Product --</option>
                    {products.map((p) => {
                      const stockVal = stocks.find((s) => s.product?.id === p.id)?.availableQuantity || 0;
                      return (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.category || "General"}) — [Available: {stockVal}]
                        </option>
                      );
                    })}
                  </select>
                  {formErrors.product && <span style={{ color: "#DC2626", fontSize: "11px" }}>{formErrors.product}</span>}
                </div>

                {/* Available Stock Indicator */}
                {selectedProductId && (
                  <div
                    style={{
                      background: selectedProductStock > 0 ? "#ECFDF5" : "#FEF2F2",
                      border: `1px solid ${selectedProductStock > 0 ? "#A7F3D0" : "#FECACA"}`,
                      borderRadius: "6px",
                      padding: "8px 12px",
                      marginBottom: "14px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: "13px"
                    }}
                  >
                    <span style={{ color: selectedProductStock > 0 ? "#065F46" : "#991B1B", fontWeight: 500 }}>
                      Current Available Warehouse Stock:
                    </span>
                    <b style={{ color: selectedProductStock > 0 ? "#059669" : "#DC2626", fontSize: "15px" }}>
                      {selectedProductStock} units
                    </b>
                  </div>
                )}

                {/* Quantity & Purpose */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                      Quantity to Issue *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={selectedProductStock > 0 ? selectedProductStock : 1}
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: formErrors.quantity ? "1px solid #DC2626" : "1px solid #CBD5E1", fontSize: "13px" }}
                      required
                    />
                    {formErrors.quantity && <span style={{ color: "#DC2626", fontSize: "11px" }}>{formErrors.quantity}</span>}
                  </div>

                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                      Purpose / Department *
                    </label>
                    <select
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "13px" }}
                    >
                      <option value="Production Assembly">Production Assembly</option>
                      <option value="Customer Order Dispatch">Customer Order Dispatch</option>
                      <option value="Warranty Replacement">Warranty Replacement</option>
                      <option value="Testing & Quality Control">Testing & Quality Control</option>
                      <option value="R&D / Prototyping">R&D / Prototyping</option>
                      <option value="Maintenance & Repair">Maintenance & Repair</option>
                    </select>
                  </div>
                </div>

                {/* Recipient */}
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                    Issued To (Recipient Name / Tech Lead) *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Kadam (Shop Floor Lead)"
                    value={issuedTo}
                    onChange={(e) => setIssuedTo(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: formErrors.issuedTo ? "1px solid #DC2626" : "1px solid #CBD5E1", fontSize: "13px" }}
                    required
                  />
                  {formErrors.issuedTo && <span style={{ color: "#DC2626", fontSize: "11px" }}>{formErrors.issuedTo}</span>}
                </div>

                {/* Notes */}
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                    Issuance Notes / Batch Details
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Dispatched for Job Card #JC-902"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "13px" }}
                  />
                </div>
              </div>
              <div className="matout-modal-footer">
                <button type="button" className="matout-btn-secondary" onClick={() => setShowIssueModal(false)} disabled={submitting}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="matout-btn-primary"
                  disabled={submitting || !selectedProductId || selectedProductStock < 1}
                >
                  {submitting ? "Issuing..." : "Confirm Material Issue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
