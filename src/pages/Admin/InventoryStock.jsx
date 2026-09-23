import React, { useState, useEffect, useMemo, useCallback } from "react";
import { inventoryService } from "../../services/inventoryService";
import { productService } from "../../services/productService";
import { Toast } from "../../components/common/Toast";
import { useNavigate } from "react-router-dom";
import {
  Boxes,
  Search,
  RefreshCw,
  PackageCheck,
  AlertTriangle,
  PackageX,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  AlertCircle,
  Tag,
  Plus,
  X
} from "lucide-react";

export default function InventoryStock({ userRole: propUserRole }) {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [stockStatusFilter, setStockStatusFilter] = useState("ALL");

  // Add Product to Catalog State
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);
  const [productForm, setProductForm] = useState({
    name: "",
    category: "EV Battery",
    brand: "Bentork",
    modelNumber: "",
    voltage: "",
    capacity: "",
    chemistry: "",
    description: ""
  });

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchStock = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await inventoryService.getAllStock();
      setStocks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching inventory stock:", err);
      setError(err.message || "Failed to load real-time stock data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name.trim()) {
      showToast("Product name is required", "error");
      return;
    }
    setAddingProduct(true);
    try {
      await productService.createProduct({
        name: productForm.name.trim(),
        category: productForm.category || "EV Battery",
        brand: productForm.brand.trim() || "Bentork",
        modelNumber: productForm.modelNumber.trim() || undefined,
        voltage: productForm.voltage.trim() || undefined,
        capacity: productForm.capacity.trim() || undefined,
        chemistry: productForm.chemistry.trim() || undefined,
        description: productForm.description.trim() || undefined
      });
      showToast(`Product '${productForm.name}' added to catalog successfully!`, "success");
      setShowAddProductModal(false);
      setProductForm({
        name: "",
        category: "EV Battery",
        brand: "Bentork",
        modelNumber: "",
        voltage: "",
        capacity: "",
        chemistry: "",
        description: ""
      });
      fetchStock();
    } catch (err) {
      console.error("Failed to add product to catalog:", err);
      showToast(err.message || "Failed to add product to catalog", "error");
    } finally {
      setAddingProduct(false);
    }
  };

  // Derived Categories
  const categories = useMemo(() => {
    const set = new Set();
    stocks.forEach((s) => {
      if (s.product?.category) set.add(s.product.category);
    });
    return Array.from(set);
  }, [stocks]);

  // Metrics
  const metrics = useMemo(() => {
    const totalUnits = stocks.reduce((sum, s) => sum + (s.availableQuantity || 0), 0);
    const totalProducts = stocks.length;
    const inStock = stocks.filter((s) => (s.availableQuantity || 0) > 10).length;
    const lowStock = stocks.filter((s) => (s.availableQuantity || 0) > 0 && (s.availableQuantity || 0) <= 10).length;
    const outOfStock = stocks.filter((s) => (s.availableQuantity || 0) <= 0).length;

    return {
      totalUnits,
      totalProducts,
      inStock,
      lowStock,
      outOfStock
    };
  }, [stocks]);

  // Filtered stocks
  const filteredStocks = useMemo(() => {
    return stocks.filter((item) => {
      const p = item.product || {};
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        String(p.id).includes(q);

      const matchCategory = categoryFilter === "ALL" || p.category === categoryFilter;

      const qty = item.availableQuantity || 0;
      let matchStatus = true;
      if (stockStatusFilter === "IN_STOCK") matchStatus = qty > 10;
      else if (stockStatusFilter === "LOW_STOCK") matchStatus = qty > 0 && qty <= 10;
      else if (stockStatusFilter === "OUT_OF_STOCK") matchStatus = qty <= 0;

      return matchSearch && matchCategory && matchStatus;
    });
  }, [stocks, searchQuery, categoryFilter, stockStatusFilter]);

  return (
    <div style={{ padding: "20px 24px", maxWidth: "1400px", margin: "0 auto", boxSizing: "border-box", fontFamily: "Roboto, sans-serif" }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <style>{`
        .stock-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .stock-title {
          font-size: 22px;
          font-weight: 700;
          color: #0F172A;
          margin: 0 0 4px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .stock-card-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 14px;
          margin-bottom: 20px;
        }
        .stock-stat-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .stock-stat-icon {
          width: 44px;
          height: 44px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stock-controls {
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
        .stock-table-wrap {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 0 0 10px 10px;
          overflow-x: auto;
        }
        .stock-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 13px;
        }
        .stock-table th {
          background: #F8FAFC;
          color: #475569;
          font-weight: 600;
          padding: 12px 16px;
          border-bottom: 1px solid #E2E8F0;
          white-space: nowrap;
        }
        .stock-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #F1F5F9;
          color: #334155;
          vertical-align: middle;
        }
        .stock-table tr:hover td {
          background: #F8FAFC;
        }
        .stock-btn-secondary {
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
        .stock-btn-secondary:hover {
          background: #E2E8F0;
        }
      `}</style>

      {/* Header */}
      <div className="stock-header">
        <div>
          <h1 className="stock-title">
            <Boxes size={24} color="#10B981" /> Real-time Inventory Stock
          </h1>
          <p style={{ fontSize: "13px", color: "#64748B", margin: 0 }}>
            Live stock ledger balances computed dynamically across all inbound receipts and outbound issues.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => setShowAddProductModal(true)}
            style={{
              background: "#10B981",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "6px",
              padding: "7px 14px",
              fontSize: "12px",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer"
            }}
          >
            <Plus size={14} /> Add Product to Catalog
          </button>
          <button className="stock-btn-secondary" onClick={fetchStock} title="Refresh real-time stock">
            <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh Stock
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="stock-card-grid">
        <div className="stock-stat-card">
          <div className="stock-stat-icon" style={{ background: "#ECFDF5", color: "#059669" }}>
            <Boxes size={22} />
          </div>
          <div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#0F172A" }}>
              {metrics.totalUnits.toLocaleString("en-IN")}
            </div>
            <div style={{ fontSize: "12px", color: "#64748B" }}>Total Inventory Units</div>
          </div>
        </div>

        <div className="stock-stat-card">
          <div className="stock-stat-icon" style={{ background: "#EFF6FF", color: "#2563EB" }}>
            <Layers size={22} />
          </div>
          <div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#0F172A" }}>{metrics.totalProducts}</div>
            <div style={{ fontSize: "12px", color: "#64748B" }}>Catalog Products</div>
          </div>
        </div>

        <div className="stock-stat-card">
          <div className="stock-stat-icon" style={{ background: "#FEF3C7", color: "#D97706" }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#0F172A" }}>{metrics.lowStock}</div>
            <div style={{ fontSize: "12px", color: "#64748B" }}>Low Stock Alert (≤10)</div>
          </div>
        </div>

        <div className="stock-stat-card">
          <div className="stock-stat-icon" style={{ background: "#FEE2E2", color: "#DC2626" }}>
            <PackageX size={22} />
          </div>
          <div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#0F172A" }}>{metrics.outOfStock}</div>
            <div style={{ fontSize: "12px", color: "#64748B" }}>Out of Stock (0)</div>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="stock-controls">
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", background: "#F8FAFC", border: "1px solid #CBD5E1", borderRadius: "6px", padding: "6px 12px", width: "260px" }}>
            <Search size={16} color="#64748B" />
            <input
              type="text"
              placeholder="Search product name, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ border: "none", background: "transparent", outline: "none", fontSize: "13px", marginLeft: "8px", width: "100%", color: "#1E293B" }}
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ border: "1px solid #CBD5E1", borderRadius: "6px", padding: "7px 10px", fontSize: "13px", background: "#FFFFFF", color: "#334155" }}
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={stockStatusFilter}
            onChange={(e) => setStockStatusFilter(e.target.value)}
            style={{ border: "1px solid #CBD5E1", borderRadius: "6px", padding: "7px 10px", fontSize: "13px", background: "#FFFFFF", color: "#334155" }}
          >
            <option value="ALL">All Stock Levels</option>
            <option value="IN_STOCK">In Stock (&gt;10)</option>
            <option value="LOW_STOCK">Low Stock (1-10)</option>
            <option value="OUT_OF_STOCK">Out of Stock (0)</option>
          </select>
        </div>

        <div style={{ fontSize: "12px", color: "#64748B" }}>
          Showing <b>{filteredStocks.length}</b> of <b>{stocks.length}</b> product lines
        </div>
      </div>

      {/* Stock Table */}
      <div className="stock-table-wrap">
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
            <RefreshCw size={24} className="spin" style={{ margin: "0 auto 10px auto" }} />
            <div>Calculating live stock ledger balances...</div>
          </div>
        ) : error ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#DC2626" }}>
            <AlertCircle size={24} style={{ margin: "0 auto 10px auto" }} />
            <div>{error}</div>
            <button className="stock-btn-secondary" onClick={fetchStock} style={{ marginTop: "12px" }}>
              Retry
            </button>
          </div>
        ) : filteredStocks.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
            <Boxes size={32} style={{ margin: "0 auto 10px auto", opacity: 0.5 }} />
            <div style={{ fontWeight: 600, fontSize: "14px", color: "#334155" }}>No products in stock ledger</div>
            <div style={{ fontSize: "12px", marginTop: "4px" }}>
              Inward receipts recorded via Material IN will automatically populate this stock ledger
            </div>
          </div>
        ) : (
          <table className="stock-table">
            <thead>
              <tr>
                <th>Product ID & Name</th>
                <th>Category</th>
                <th>Brand</th>
                <th>Available Quantity</th>
                <th>Stock Status</th>
                <th>Quick Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStocks.map((item) => {
                const p = item.product || {};
                const qty = item.availableQuantity || 0;

                let badgeBg = "#ECFDF5";
                let badgeColor = "#059669";
                let badgeLabel = "In Stock";

                if (qty <= 0) {
                  badgeBg = "#FEF2F2";
                  badgeColor = "#DC2626";
                  badgeLabel = "Out of Stock";
                } else if (qty <= 10) {
                  badgeBg = "#FEF3C7";
                  badgeColor = "#D97706";
                  badgeLabel = "Low Stock";
                }

                return (
                  <tr key={p.id || Math.random()}>
                    <td style={{ fontWeight: 600, color: "#0F172A" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Boxes size={16} color="#10B981" />
                        <div>
                          <div>{p.name || "Unnamed Product"}</div>
                          <div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 400 }}>
                            ID: #{p.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          padding: "3px 8px",
                          background: "#F1F5F9",
                          color: "#475569",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: 500
                        }}
                      >
                        {p.category || "General"}
                      </span>
                    </td>
                    <td style={{ color: "#475569" }}>{p.brand || "Bentork"}</td>
                    <td>
                      <span
                        style={{
                          fontSize: "15px",
                          fontWeight: 700,
                          color: qty > 0 ? "#0F172A" : "#DC2626"
                        }}
                      >
                        {qty} <span style={{ fontSize: "12px", fontWeight: 400, color: "#64748B" }}>units</span>
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: 600,
                          background: badgeBg,
                          color: badgeColor
                        }}
                      >
                        {badgeLabel}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          className="stock-btn-secondary"
                          onClick={() => navigate("/dashboard/material-out")}
                          style={{ padding: "4px 8px", fontSize: "11px" }}
                          title="Issue material from stock"
                        >
                          <ArrowUpRight size={13} color="#2563EB" /> Issue
                        </button>
                        <button
                          className="stock-btn-secondary"
                          onClick={() => navigate("/dashboard/material-in")}
                          style={{ padding: "4px 8px", fontSize: "11px" }}
                          title="Inward material to stock"
                        >
                          <ArrowDownLeft size={13} color="#059669" /> Inward
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Product Modal */}
      {showAddProductModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px"
          }}
          onClick={() => !addingProduct && setShowAddProductModal(false)}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "500px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              overflow: "hidden"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #E2E8F0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
                Add Product to Catalog
              </h3>
              <button
                type="button"
                onClick={() => setShowAddProductModal(false)}
                disabled={addingProduct}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} style={{ padding: "20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. XYZ, ABX, ABC, PQR"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E1",
                      fontSize: "13px",
                      boxSizing: "border-box"
                    }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                      Category *
                    </label>
                    <select
                      value={productForm.category}
                      onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        border: "1px solid #CBD5E1",
                        fontSize: "13px",
                        boxSizing: "border-box"
                      }}
                    >
                      <option value="EV Battery">EV Battery</option>
                      <option value="Solar Battery">Solar Battery</option>
                      <option value="Battery Pack">Battery Pack</option>
                      <option value="Charger">Charger</option>
                      <option value="Spare Part">Spare Part</option>
                      <option value="Raw Material">Raw Material</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                      Brand
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Bentork"
                      value={productForm.brand}
                      onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        border: "1px solid #CBD5E1",
                        fontSize: "13px",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                      Model Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. BTK-48V-30AH"
                      value={productForm.modelNumber}
                      onChange={(e) => setProductForm({ ...productForm, modelNumber: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        border: "1px solid #CBD5E1",
                        fontSize: "13px",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                      Voltage
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 48V, 60V, 72V"
                      value={productForm.voltage}
                      onChange={(e) => setProductForm({ ...productForm, voltage: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        border: "1px solid #CBD5E1",
                        fontSize: "13px",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                      Capacity
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 30Ah, 40Ah"
                      value={productForm.capacity}
                      onChange={(e) => setProductForm({ ...productForm, capacity: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        border: "1px solid #CBD5E1",
                        fontSize: "13px",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                      Chemistry
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. NMC, LFP"
                      value={productForm.chemistry}
                      onChange={(e) => setProductForm({ ...productForm, chemistry: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        border: "1px solid #CBD5E1",
                        fontSize: "13px",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                    Description / Specifications
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Optional notes or specifications"
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E1",
                      fontSize: "12px",
                      boxSizing: "border-box"
                    }}
                  />
                </div>
              </div>

              <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  disabled={addingProduct}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    border: "1px solid #CBD5E1",
                    background: "#FFFFFF",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#475569",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingProduct}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    border: "none",
                    background: "#10B981",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#FFFFFF",
                    cursor: "pointer"
                  }}
                >
                  {addingProduct ? "Adding..." : "Add to Catalog"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
