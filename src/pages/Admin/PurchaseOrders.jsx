import React, { useState, useEffect, useMemo, useCallback } from "react";
import { procurementService } from "../../services/procurementService";
import { productService } from "../../services/productService";
import { Toast } from "../../components/common/Toast";
import {
  FileCheck2,
  Plus,
  Search,
  RefreshCw,
  Eye,
  CheckCircle,
  Clock,
  Package,
  Building2,
  Calendar,
  DollarSign,
  Trash2,
  X,
  AlertCircle,
  ChevronRight
} from "lucide-react";

export default function PurchaseOrders({ userRole: propUserRole }) {
  const [orders, setOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals & Drawers
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [approvingId, setApprovingId] = useState(null);

  // Effective Role Check
  const currentRole = useMemo(() => {
    const rawRole = (propUserRole || localStorage.getItem("userRole") || "").toUpperCase().trim();
    if (rawRole.includes("SCM")) return "SCM_ADMIN";
    if (rawRole.includes("SALES")) return "SALES_ADMIN";
    return "ADMIN";
  }, [propUserRole]);

  const canManagePO = currentRole === "ADMIN" || currentRole === "SCM_ADMIN";

  // Create Form State
  const [formData, setFormData] = useState({
    vendorId: "",
    expectedDeliveryDate: "",
    deliveryLocation: "Bentork Main Warehouse, Pune",
    termsAndConditions: "Standard delivery within business hours. 100% inspection upon receipt.",
    items: [{ productId: "", quantity: 1 }]
  });
  const [formErrors, setFormErrors] = useState({});

  // Quick Product Creation State
  const [showQuickProductModal, setShowQuickProductModal] = useState(false);
  const [quickProductTargetIdx, setQuickProductTargetIdx] = useState(0);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [quickProductForm, setQuickProductForm] = useState({
    name: "",
    category: "EV Battery",
    brand: "Bentork",
    modelNumber: "",
    voltage: "",
    capacity: "",
    chemistry: ""
  });

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Standardized product extractor from various backend response formats
  const extractProductList = (raw) => {
    if (!raw) return [];
    let list = [];
    if (Array.isArray(raw)) {
      list = raw;
    } else if (Array.isArray(raw?.data)) {
      list = raw.data;
    } else if (Array.isArray(raw?.data?.content)) {
      list = raw.data.content;
    } else if (Array.isArray(raw?.data?.products)) {
      list = raw.data.products;
    } else if (Array.isArray(raw?.products)) {
      list = raw.products;
    } else if (Array.isArray(raw?.content)) {
      list = raw.content;
    } else if (Array.isArray(raw?.items)) {
      list = raw.items;
    }

    const seen = new Set();
    const result = [];

    list.forEach((item) => {
      if (!item) return;
      const p = item.product || item;
      const id = p.id ?? p.productId ?? p._id;
      if (id === undefined || id === null) return;
      const numId = Number(id);
      if (isNaN(numId) || numId <= 0 || seen.has(numId)) return;
      seen.add(numId);

      const name = (p.name || p.productName || p.title || p.label || `Product #${numId}`).trim();
      const isInactive = p.active === false || p.isActive === false || p.status === "INACTIVE" || p.status === "inactive";

      if (!isInactive) {
        result.push({
          id: numId,
          name: name,
          modelNumber: p.modelNumber || "",
          category: p.category || "",
          specString: p.specString || "",
          active: true
        });
      }
    });

    return result;
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [posData, vendorsData, productsData] = await Promise.all([
        procurementService.getAllPurchaseOrders().catch(() => []),
        procurementService.getAllVendors().catch(() => []),
        productService.getActiveProducts().catch(() => [])
      ]);

      const parsedPOs = Array.isArray(posData) ? posData : posData?.data || [];
      setOrders(parsedPOs);
      setVendors(Array.isArray(vendorsData) ? vendorsData : vendorsData?.data || []);

      let parsedProducts = extractProductList(productsData);

      // If catalog returned no products (e.g. role access constraint), extract products from historical PO items
      if (parsedProducts.length === 0 && Array.isArray(parsedPOs)) {
        const poProducts = [];
        parsedPOs.forEach((po) => {
          if (Array.isArray(po.items)) {
            po.items.forEach((it) => {
              if (it.product && (it.product.id || it.product.productId)) {
                poProducts.push(it.product);
              }
            });
          }
        });
        if (poProducts.length > 0) {
          parsedProducts = extractProductList(poProducts);
        }
      }

      setProducts(parsedProducts);
    } catch (err) {
      console.error("Error fetching PO data:", err);
      setError(err.message || "Failed to load Purchase Orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Ensure active products are refreshed whenever opening the Create PO modal
  useEffect(() => {
    if (showCreateModal) {
      setLoadingProducts(true);
      productService
        .getActiveProducts()
        .then((res) => {
          const list = extractProductList(res);
          if (list.length > 0) {
            setProducts(list);
          }
        })
        .catch((e) => console.warn("Failed to reload products on modal open:", e))
        .finally(() => setLoadingProducts(false));
    }
  }, [showCreateModal]);

  // Handle Dynamic Items in Create Form
  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { productId: "", quantity: 1 }]
    }));
  };

  const handleRemoveItem = (index) => {
    if (formData.items.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index, field, value) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, items: newItems };
    });
  };

  const handleCreateQuickProduct = async (e) => {
    e.preventDefault();
    if (!quickProductForm.name.trim()) {
      showToast("Product name is required", "error");
      return;
    }
    setCreatingProduct(true);
    try {
      const created = await productService.createProduct({
        name: quickProductForm.name.trim(),
        category: quickProductForm.category || "EV Battery",
        brand: quickProductForm.brand.trim() || "Bentork",
        modelNumber: quickProductForm.modelNumber.trim() || undefined,
        voltage: quickProductForm.voltage.trim() || undefined,
        capacity: quickProductForm.capacity.trim() || undefined,
        chemistry: quickProductForm.chemistry.trim() || undefined
      });
      showToast(`Product '${quickProductForm.name}' created and added to catalog!`, "success");

      const newProdId = created?.id || created?.productId;
      setShowQuickProductModal(false);
      setQuickProductForm({
        name: "",
        category: "EV Battery",
        brand: "Bentork",
        modelNumber: "",
        voltage: "",
        capacity: "",
        chemistry: ""
      });

      // Refresh active products and auto-select newly created product
      const refreshed = await productService.getActiveProducts();
      const list = extractProductList(refreshed);
      setProducts(list);
      if (newProdId) {
        handleItemChange(quickProductTargetIdx, "productId", String(newProdId));
      }
    } catch (err) {
      console.error("Failed to create product:", err);
      showToast(err.message || "Failed to create product", "error");
    } finally {
      setCreatingProduct(false);
    }
  };

  // Validation
  const validateForm = () => {
    const errors = {};
    if (!formData.vendorId) errors.vendorId = "Vendor selection is required";
    if (!formData.expectedDeliveryDate) errors.expectedDeliveryDate = "Expected delivery date is required";

    if (!formData.items || formData.items.length === 0) {
      errors.items = "At least one product item is required";
    } else {
      formData.items.forEach((item, idx) => {
        if (!item.productId || isNaN(Number(item.productId)) || Number(item.productId) <= 0) {
          errors[`item_product_${idx}`] = "Product selection is required";
        }
        if (!item.quantity || Number(item.quantity) < 1) {
          errors[`item_qty_${idx}`] = "Quantity must be at least 1";
        }
      });
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreatePO = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        vendorId: Number(formData.vendorId),
        expectedDeliveryDate: formData.expectedDeliveryDate || null,
        deliveryLocation: formData.deliveryLocation?.trim() || null,
        termsAndConditions: formData.termsAndConditions?.trim() || null,
        items: formData.items.map((item) => ({
          productId: Number(item.productId),
          quantity: Number(item.quantity),
          unitPrice: 0.0,
          taxPercentage: 0.0
        }))
      };

      console.log("Submitting Purchase Order payload:", JSON.stringify(payload, null, 2));

      const created = await procurementService.createPurchaseOrder(payload);
      showToast(`Purchase Order #${created?.poNumber || ""} created in Draft status!`, "success");
      setShowCreateModal(false);
      setFormData({
        vendorId: "",
        expectedDeliveryDate: "",
        deliveryLocation: "Bentork Main Warehouse, Pune",
        termsAndConditions: "Standard delivery within business hours. 100% inspection upon receipt.",
        items: [{ productId: "", quantity: 1 }]
      });
      setFormErrors({});
      fetchData();
    } catch (err) {
      console.error("Error creating PO:", err);
      showToast(err.message || "Failed to create Purchase Order", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprovePO = async (id, poNumber) => {
    if (!window.confirm(`Are you sure you want to approve Purchase Order ${poNumber}?`)) return;
    setApprovingId(id);
    try {
      await procurementService.approvePurchaseOrder(id);
      showToast(`Purchase Order ${poNumber} approved successfully!`, "success");
      if (selectedPO && selectedPO.id === id) {
        setSelectedPO((prev) => ({ ...prev, status: "Approved" }));
      }
      fetchData();
    } catch (err) {
      console.error("Error approving PO:", err);
      showToast(err.message || "Failed to approve Purchase Order", "error");
    } finally {
      setApprovingId(null);
    }
  };

  // Status Badge Helper
  const getStatusBadge = (statusStr) => {
    const s = (statusStr || "").toLowerCase();
    if (s.includes("draft")) {
      return { bg: "#FEF3C7", color: "#D97706", label: "Draft" };
    }
    if (s.includes("approved")) {
      return { bg: "#DBEAFE", color: "#1D4ED8", label: "Approved" };
    }
    if (s.includes("partially")) {
      return { bg: "#F3E8FF", color: "#7E22CE", label: "Partially Fulfilled" };
    }
    if (s.includes("fulfilled")) {
      return { bg: "#ECFDF5", color: "#059669", label: "Fulfilled" };
    }
    if (s.includes("cancelled")) {
      return { bg: "#FEE2E2", color: "#DC2626", label: "Cancelled" };
    }
    return { bg: "#F1F5F9", color: "#475569", label: statusStr || "Unknown" };
  };

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((po) => {
      const matchSearch =
        !searchQuery.trim() ||
        po.poNumber?.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        po.vendor?.name?.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        po.deliveryLocation?.toLowerCase().includes(searchQuery.toLowerCase().trim());

      const matchStatus =
        statusFilter === "ALL" ||
        (po.status || "").toLowerCase().replace(/_/g, " ").includes(statusFilter.toLowerCase().replace(/_/g, " "));

      return matchSearch && matchStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  return (
    <div style={{ padding: "20px 24px", maxWidth: "1400px", margin: "0 auto", boxSizing: "border-box", fontFamily: "Roboto, sans-serif" }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <style>{`
        .po-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .po-title {
          font-size: 22px;
          font-weight: 700;
          color: #0F172A;
          margin: 0 0 4px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .po-card-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 14px;
          margin-bottom: 20px;
        }
        .po-stat-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .po-stat-icon {
          width: 44px;
          height: 44px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .po-controls {
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
        .po-table-wrap {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 0 0 10px 10px;
          overflow-x: auto;
        }
        .po-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 13px;
        }
        .po-table th {
          background: #F8FAFC;
          color: #475569;
          font-weight: 600;
          padding: 12px 16px;
          border-bottom: 1px solid #E2E8F0;
          white-space: nowrap;
        }
        .po-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #F1F5F9;
          color: #334155;
          vertical-align: middle;
        }
        .po-table tr:hover td {
          background: #F8FAFC;
        }
        .po-btn-primary {
          background: #10B981;
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
        .po-btn-primary:hover {
          background: #059669;
        }
        .po-btn-secondary {
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
        .po-btn-secondary:hover {
          background: #E2E8F0;
        }
        .po-modal-overlay {
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
        .po-modal {
          background: #FFFFFF;
          border-radius: 12px;
          width: 100%;
          max-width: 800px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        .po-modal-header {
          padding: 16px 20px;
          border-bottom: 1px solid #E2E8F0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .po-modal-body {
          padding: 20px;
        }
        .po-modal-footer {
          padding: 14px 20px;
          border-top: 1px solid #E2E8F0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #F8FAFC;
          border-radius: 0 0 12px 12px;
        }
        .item-row {
          display: grid;
          grid-template-columns: 1fr 140px 38px;
          gap: 12px;
          align-items: center;
          margin-bottom: 10px;
        }
        @media (max-width: 640px) {
          .item-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Header */}
      <div className="po-header">
        <div>
          <h1 className="po-title">
            <FileCheck2 size={24} color="#10B981" /> Purchase Orders
          </h1>
          <p style={{ fontSize: "13px", color: "#64748B", margin: 0 }}>
            Create procurement orders, assign supplier lines, calculate taxes, and approve purchase workflows.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="po-btn-secondary" onClick={fetchData} title="Refresh purchase orders">
            <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
          </button>
          {canManagePO && (
            <button className="po-btn-primary" onClick={() => setShowCreateModal(true)}>
              <Plus size={16} /> Create PO
            </button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="po-card-grid">
        <div className="po-stat-card">
          <div className="po-stat-icon" style={{ background: "#EFF6FF", color: "#2563EB" }}>
            <FileCheck2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#0F172A" }}>{orders.length}</div>
            <div style={{ fontSize: "12px", color: "#64748B" }}>Total POs</div>
          </div>
        </div>

        <div className="po-stat-card">
          <div className="po-stat-icon" style={{ background: "#FEF3C7", color: "#D97706" }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#0F172A" }}>
              {orders.filter((o) => (o.status || "").toLowerCase().includes("draft")).length}
            </div>
            <div style={{ fontSize: "12px", color: "#64748B" }}>Draft (Pending Approval)</div>
          </div>
        </div>

        <div className="po-stat-card">
          <div className="po-stat-icon" style={{ background: "#DBEAFE", color: "#1D4ED8" }}>
            <CheckCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#0F172A" }}>
              {orders.filter((o) => (o.status || "").toLowerCase().includes("approved")).length}
            </div>
            <div style={{ fontSize: "12px", color: "#64748B" }}>Approved & Open</div>
          </div>
        </div>

        <div className="po-stat-card">
          <div className="po-stat-icon" style={{ background: "#ECFDF5", color: "#059669" }}>
            <Package size={22} />
          </div>
          <div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#0F172A" }}>
              {orders.filter((o) => (o.status || "").toLowerCase().includes("fulfilled")).length}
            </div>
            <div style={{ fontSize: "12px", color: "#64748B" }}>Fulfilled Receipts</div>
          </div>
        </div>
      </div>

      {/* Table Filter Controls */}
      <div className="po-controls">
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", background: "#F8FAFC", border: "1px solid #CBD5E1", borderRadius: "6px", padding: "6px 12px", width: "280px" }}>
            <Search size={16} color="#64748B" />
            <input
              type="text"
              placeholder="Search PO#, Vendor, Location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ border: "none", background: "transparent", outline: "none", fontSize: "13px", marginLeft: "8px", width: "100%", color: "#1E293B" }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ border: "1px solid #CBD5E1", borderRadius: "6px", padding: "7px 10px", fontSize: "13px", background: "#FFFFFF", color: "#334155" }}
          >
            <option value="ALL">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Approved">Approved</option>
            <option value="Partially Fulfilled">Partially Fulfilled</option>
            <option value="Fulfilled">Fulfilled</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <div style={{ fontSize: "12px", color: "#64748B" }}>
          Showing <b>{filteredOrders.length}</b> of <b>{orders.length}</b> orders
        </div>
      </div>

      {/* Table */}
      <div className="po-table-wrap">
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
            <RefreshCw size={24} className="spin" style={{ margin: "0 auto 10px auto" }} />
            <div>Loading Purchase Orders...</div>
          </div>
        ) : error ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#DC2626" }}>
            <AlertCircle size={24} style={{ margin: "0 auto 10px auto" }} />
            <div>{error}</div>
            <button className="po-btn-secondary" onClick={fetchData} style={{ marginTop: "12px" }}>
              Retry
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
            <FileCheck2 size={32} style={{ margin: "0 auto 10px auto", opacity: 0.5 }} />
            <div style={{ fontWeight: 600, fontSize: "14px", color: "#334155" }}>No Purchase Orders found</div>
            <div style={{ fontSize: "12px", marginTop: "4px" }}>
              {canManagePO ? "Click 'Create PO' to create a procurement order" : "No orders matching current filter"}
            </div>
          </div>
        ) : (
          <table className="po-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Vendor</th>
                <th>Expected Delivery</th>
                <th>Items & Qty</th>
                <th>Tax & Total Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((po) => {
                const badge = getStatusBadge(po.status);
                const isDraft = (po.status || "").toLowerCase().includes("draft");
                const totalItemsCount = Array.isArray(po.items)
                  ? po.items.reduce((sum, it) => sum + (it.quantity || 0), 0)
                  : 0;

                return (
                  <tr key={po.id}>
                    <td style={{ fontWeight: 600, color: "#0F172A" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <FileCheck2 size={16} color="#2563EB" />
                        {po.poNumber}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Building2 size={14} color="#64748B" />
                        <span style={{ fontWeight: 500 }}>{po.vendor?.name || "—"}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                        <Calendar size={14} />
                        {po.expectedDeliveryDate ? String(po.expectedDeliveryDate) : "—"}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500 }}>
                        {Array.isArray(po.items) ? po.items.length : 0} lines ({totalItemsCount} units)
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: 700, color: "#0F172A" }}>
                          ₹{Number(po.netAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                        <span style={{ fontSize: "11px", color: "#64748B" }}>
                          Incl. Tax ₹{Number(po.taxAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: 600,
                          background: badge.bg,
                          color: badge.color
                        }}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <button
                          className="po-btn-secondary"
                          onClick={() => setSelectedPO(po)}
                          style={{ padding: "4px 8px", fontSize: "11px" }}
                        >
                          <Eye size={13} /> View
                        </button>
                        {isDraft && canManagePO && (
                          <button
                            className="po-btn-primary"
                            onClick={() => handleApprovePO(po.id, po.poNumber)}
                            disabled={approvingId === po.id}
                            style={{ padding: "4px 8px", fontSize: "11px", background: "#2563EB" }}
                          >
                            <CheckCircle size={13} /> {approvingId === po.id ? "Approving..." : "Approve"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Purchase Order Modal */}
      {showCreateModal && (
        <div className="po-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="po-modal" onClick={(e) => e.stopPropagation()}>
            <div className="po-modal-header">
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
                Create Purchase Order (PO)
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B" }}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreatePO}>
              <div className="po-modal-body">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                      Select Vendor *
                    </label>
                    <select
                      value={formData.vendorId}
                      onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "13px" }}
                      required
                    >
                      <option value="">-- Choose Vendor --</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} {v.gstNumber ? `(${v.gstNumber})` : ""}
                        </option>
                      ))}
                    </select>
                    {formErrors.vendorId && <span style={{ color: "#DC2626", fontSize: "11px" }}>{formErrors.vendorId}</span>}
                  </div>

                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                      Expected Delivery Date *
                    </label>
                    <input
                      type="date"
                      value={formData.expectedDeliveryDate}
                      onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "13px" }}
                      required
                    />
                    {formErrors.expectedDeliveryDate && <span style={{ color: "#DC2626", fontSize: "11px" }}>{formErrors.expectedDeliveryDate}</span>}
                  </div>

                  <div style={{ gridColumn: "span 2" }}>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                      Delivery Location
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Bentork Warehouse, Plot 12, Pune"
                      value={formData.deliveryLocation}
                      onChange={(e) => setFormData({ ...formData, deliveryLocation: e.target.value })}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "13px" }}
                    />
                  </div>
                </div>

                {/* Items Section */}
                <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: "14px", marginBottom: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
                        Ordered Product Items
                      </h4>
                      <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#64748B" }}>
                        Select products from the catalog and specify ordered quantities
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        className="po-btn-secondary"
                        onClick={() => {
                          setQuickProductTargetIdx(0);
                          setShowQuickProductModal(true);
                        }}
                        style={{ fontSize: "11px", padding: "5px 10px", color: "#059669", borderColor: "#A7F3D0", background: "#ECFDF5" }}
                        title="Register a new product directly into the Product Catalog"
                      >
                        <Plus size={12} /> New Catalog Product
                      </button>
                      <button type="button" className="po-btn-secondary" onClick={handleAddItem} style={{ fontSize: "11px", padding: "5px 10px" }}>
                        <Plus size={12} /> Add Item Line
                      </button>
                    </div>
                  </div>

                  {/* Table Column Headers */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 38px", gap: "12px", padding: "0 10px 6px 10px", fontSize: "11px", fontWeight: 600, color: "#64748B" }}>
                    <div>Product *</div>
                    <div>Ordered Quantity *</div>
                    <div></div>
                  </div>

                  {formData.items.map((item, idx) => (
                    <div key={idx} className="item-row" style={{ background: "#F8FAFC", padding: "8px 10px", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
                      <div>
                        <select
                          value={item.productId}
                          onChange={(e) => handleItemChange(idx, "productId", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            borderRadius: "6px",
                            border: formErrors[`item_product_${idx}`] ? "1px solid #DC2626" : "1px solid #CBD5E1",
                            fontSize: "13px",
                            background: "#FFFFFF",
                            color: "#0F172A",
                            cursor: "pointer"
                          }}
                          required
                        >
                          <option value="">-- Choose Product from Catalog --</option>
                          {loadingProducts ? (
                            <option value="" disabled>Loading products from catalog...</option>
                          ) : products.length === 0 ? (
                            <option value="" disabled>No active products available in Product Catalog</option>
                          ) : (
                            products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))
                          )}
                        </select>
                        {formErrors[`item_product_${idx}`] && (
                          <div style={{ color: "#DC2626", fontSize: "11px", marginTop: "2px" }}>
                            {formErrors[`item_product_${idx}`]}
                          </div>
                        )}
                      </div>

                      <div>
                        <input
                          type="number"
                          placeholder="Quantity"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            borderRadius: "6px",
                            border: formErrors[`item_qty_${idx}`] ? "1px solid #DC2626" : "1px solid #CBD5E1",
                            fontSize: "13px",
                            background: "#FFFFFF",
                            color: "#0F172A",
                            boxSizing: "border-box"
                          }}
                          required
                        />
                        {formErrors[`item_qty_${idx}`] && (
                          <div style={{ color: "#DC2626", fontSize: "11px", marginTop: "2px" }}>
                            {formErrors[`item_qty_${idx}`]}
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          disabled={formData.items.length <= 1}
                          title="Remove line"
                          style={{
                            background: "none",
                            border: "none",
                            color: formData.items.length <= 1 ? "#CBD5E1" : "#EF4444",
                            cursor: formData.items.length <= 1 ? "not-allowed" : "pointer",
                            padding: "6px"
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {formErrors.items && (
                    <div style={{ color: "#DC2626", fontSize: "12px", marginTop: "4px" }}>
                      {formErrors.items}
                    </div>
                  )}
                </div>

                {/* Terms */}
                <div style={{ marginTop: "14px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                    Terms and Conditions / Notes
                  </label>
                  <textarea
                    rows={2}
                    value={formData.termsAndConditions}
                    onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "12px" }}
                  />
                </div>
              </div>

              <div className="po-modal-footer">
                <button type="button" className="po-btn-secondary" onClick={() => setShowCreateModal(false)} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="po-btn-primary" disabled={submitting}>
                  {submitting ? "Submitting..." : "Generate Purchase Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Product to Catalog Modal */}
      {showQuickProductModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "20px"
          }}
          onClick={() => !creatingProduct && setShowQuickProductModal(false)}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "480px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.15)",
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
                Add New Product to Catalog
              </h3>
              <button
                type="button"
                onClick={() => setShowQuickProductModal(false)}
                disabled={creatingProduct}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateQuickProduct} style={{ padding: "20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. XYZ, ABX, ABC, PQR"
                    value={quickProductForm.name}
                    onChange={(e) => setQuickProductForm({ ...quickProductForm, name: e.target.value })}
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
                      value={quickProductForm.category}
                      onChange={(e) => setQuickProductForm({ ...quickProductForm, category: e.target.value })}
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
                      value={quickProductForm.brand}
                      onChange={(e) => setQuickProductForm({ ...quickProductForm, brand: e.target.value })}
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
                      placeholder="e.g. BTK-XYZ"
                      value={quickProductForm.modelNumber}
                      onChange={(e) => setQuickProductForm({ ...quickProductForm, modelNumber: e.target.value })}
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
                      placeholder="e.g. 48V, 60V"
                      value={quickProductForm.voltage}
                      onChange={(e) => setQuickProductForm({ ...quickProductForm, voltage: e.target.value })}
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
                      value={quickProductForm.capacity}
                      onChange={(e) => setQuickProductForm({ ...quickProductForm, capacity: e.target.value })}
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
                      value={quickProductForm.chemistry}
                      onChange={(e) => setQuickProductForm({ ...quickProductForm, chemistry: e.target.value })}
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
              </div>

              <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowQuickProductModal(false)}
                  disabled={creatingProduct}
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
                  disabled={creatingProduct}
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
                  {creatingProduct ? "Adding..." : "Add to Catalog"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View PO Details Drawer / Modal */}
      {selectedPO && (
        <div className="po-modal-overlay" onClick={() => setSelectedPO(null)}>
          <div className="po-modal" onClick={(e) => e.stopPropagation()}>
            <div className="po-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
                  Purchase Order #{selectedPO.poNumber}
                </h3>
                <span style={{ fontSize: "12px", color: "#64748B" }}>
                  Created on {selectedPO.createdAt ? new Date(selectedPO.createdAt).toLocaleDateString() : "—"}
                </span>
              </div>
              <button onClick={() => setSelectedPO(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B" }}>
                <X size={18} />
              </button>
            </div>
            <div className="po-modal-body">
              {/* Header Info */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", background: "#F8FAFC", padding: "14px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px" }}>
                <div>
                  <strong style={{ color: "#64748B", display: "block", fontSize: "11px", marginBottom: "2px" }}>VENDOR</strong>
                  <span style={{ fontWeight: 600, color: "#0F172A" }}>{selectedPO.vendor?.name}</span>
                  <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
                    GST: {selectedPO.vendor?.gstNumber || "N/A"} | Terms: {selectedPO.vendor?.paymentTerms || "Net 30"}
                  </div>
                </div>
                <div>
                  <strong style={{ color: "#64748B", display: "block", fontSize: "11px", marginBottom: "2px" }}>STATUS & APPROVAL</strong>
                  <span
                    style={{
                      padding: "3px 8px",
                      borderRadius: "12px",
                      fontSize: "11px",
                      fontWeight: 600,
                      background: getStatusBadge(selectedPO.status).bg,
                      color: getStatusBadge(selectedPO.status).color
                    }}
                  >
                    {getStatusBadge(selectedPO.status).label}
                  </span>
                  <div style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>
                    Approved by: {selectedPO.approvedByEmail || "Pending Approval"}
                  </div>
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <strong style={{ color: "#64748B", display: "block", fontSize: "11px", marginBottom: "2px" }}>DELIVERY LOCATION</strong>
                  <span>{selectedPO.deliveryLocation || "Not specified"}</span>
                </div>
              </div>

              {/* Items Table */}
              <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
                Order Line Items
              </h4>
              <div style={{ overflowX: "auto", marginBottom: "16px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                  <thead>
                    <tr style={{ background: "#F1F5F9", borderBottom: "1px solid #E2E8F0" }}>
                      <th style={{ padding: "8px 10px", textAlign: "left" }}>Product</th>
                      <th style={{ padding: "8px 10px", textAlign: "center" }}>Ordered Qty</th>
                      <th style={{ padding: "8px 10px", textAlign: "center" }}>Received Qty</th>
                      <th style={{ padding: "8px 10px", textAlign: "right" }}>Unit Price</th>
                      <th style={{ padding: "8px 10px", textAlign: "right" }}>Tax %</th>
                      <th style={{ padding: "8px 10px", textAlign: "right" }}>Total Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(selectedPO.items) &&
                      selectedPO.items.map((it) => (
                        <tr key={it.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                          <td style={{ padding: "8px 10px", fontWeight: 500, color: "#0F172A" }}>
                            {it.product?.name || `Product #${it.id}`}
                          </td>
                          <td style={{ padding: "8px 10px", textAlign: "center" }}>{it.quantity}</td>
                          <td style={{ padding: "8px 10px", textAlign: "center", color: it.receivedQuantity > 0 ? "#059669" : "#64748B", fontWeight: 600 }}>
                            {it.receivedQuantity || 0}
                          </td>
                          <td style={{ padding: "8px 10px", textAlign: "right" }}>
                            ₹{Number(it.unitPrice || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: "8px 10px", textAlign: "right" }}>{it.taxPercentage || 0}%</td>
                          <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, color: "#0F172A" }}>
                            ₹{Number(it.totalPrice || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Totals */}
              <div style={{ background: "#F8FAFC", padding: "12px 16px", borderRadius: "8px", border: "1px solid #E2E8F0", textAlign: "right", fontSize: "13px" }}>
                <div>Subtotal: ₹{Number(selectedPO.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                <div style={{ marginTop: "4px" }}>Total Tax: ₹{Number(selectedPO.taxAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                <div style={{ marginTop: "6px", fontSize: "16px", fontWeight: 700, color: "#10B981" }}>
                  Net Amount: ₹{Number(selectedPO.netAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
            <div className="po-modal-footer">
              <div>
                {(selectedPO.status || "").toLowerCase().includes("draft") && canManagePO && (
                  <button
                    className="po-btn-primary"
                    onClick={() => handleApprovePO(selectedPO.id, selectedPO.poNumber)}
                    disabled={approvingId === selectedPO.id}
                    style={{ background: "#2563EB" }}
                  >
                    <CheckCircle size={14} /> {approvingId === selectedPO.id ? "Approving..." : "Approve This PO"}
                  </button>
                )}
              </div>
              <button className="po-btn-secondary" onClick={() => setSelectedPO(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
