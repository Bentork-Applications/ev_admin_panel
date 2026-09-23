import React, { useState, useEffect, useMemo, useCallback } from "react";
import { procurementService } from "../../services/procurementService";
import { inventoryService } from "../../services/inventoryService";
import { Toast } from "../../components/common/Toast";
import {
  Building2,
  Plus,
  Search,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  FileText,
  X,
  Eye,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  FileCheck2,
  ArrowDownLeft,
  Clock,
  Package,
  Calendar,
  ChevronDown,
  ChevronUp,
  Info,
  DollarSign,
  User,
  ShieldCheck,
  ExternalLink
} from "lucide-react";

export default function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Navigation & Selected Vendor for History Dashboard
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"); // 'overview' | 'orders' | 'material_in' | 'payments'

  // Selected Vendor History Data
  const [vendorPOs, setVendorPOs] = useState([]);
  const [allMaterialIns, setAllMaterialIns] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  // Sub-filters inside History Dashboard
  const [poSearchQuery, setPoSearchQuery] = useState("");
  const [poStatusFilter, setPoStatusFilter] = useState("ALL");
  const [expandedPOId, setExpandedPOId] = useState(null);
  const [matInSearchQuery, setMatInSearchQuery] = useState("");

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    gstNumber: "",
    contactPerson: "",
    contactNumber: "",
    email: "",
    address: "",
    bankDetails: ""
  });
  const [formErrors, setFormErrors] = useState({});

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Fetch all vendors
  const fetchVendors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await procurementService.getAllVendors();
      setVendors(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching vendors:", err);
      setError(err.message || "Failed to load vendors");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  // Fetch history details when a vendor is selected
  const fetchVendorHistory = useCallback(async (vendorId) => {
    if (!vendorId) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const [posData, matInData] = await Promise.all([
        procurementService.getPurchaseOrdersByVendorId(vendorId).catch(async () => {
          // Fallback if vendorId endpoint filters on client
          const allPOs = await procurementService.getAllPurchaseOrders().catch(() => []);
          return (Array.isArray(allPOs) ? allPOs : []).filter(
            (p) => String(p.vendor?.id) === String(vendorId) || String(p.vendorId) === String(vendorId)
          );
        }),
        inventoryService.getAllMaterialIn().catch(() => [])
      ]);

      setVendorPOs(Array.isArray(posData) ? posData : []);
      setAllMaterialIns(Array.isArray(matInData) ? matInData : []);
    } catch (err) {
      console.error("Error fetching vendor history:", err);
      setHistoryError(err.message || "Failed to load vendor history");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedVendor?.id) {
      fetchVendorHistory(selectedVendor.id);
    }
  }, [selectedVendor, fetchVendorHistory]);

  // Filtered Material In receipts belonging to this vendor's POs
  const vendorMaterialIns = useMemo(() => {
    if (!vendorPOs.length || !allMaterialIns.length) return [];
    const poIds = new Set(vendorPOs.map((p) => p.id));
    const poNumbers = new Set(vendorPOs.map((p) => p.poNumber).filter(Boolean));

    return allMaterialIns.filter(
      (m) => poIds.has(m.purchaseOrderId) || (m.poNumber && poNumbers.has(m.poNumber))
    );
  }, [vendorPOs, allMaterialIns]);

  // Financial & KPI Calculations for Selected Vendor
  const vendorMetrics = useMemo(() => {
    const totalPOs = vendorPOs.length;
    const draftPOs = vendorPOs.filter((p) => (p.status || "").toLowerCase().includes("draft")).length;
    const approvedPOs = vendorPOs.filter((p) => (p.status || "").toLowerCase().includes("approved")).length;
    const fulfilledPOs = vendorPOs.filter((p) => (p.status || "").toLowerCase().includes("fulfilled")).length;

    // Calculate total purchase amount from POs
    const totalPurchaseAmount = vendorPOs.reduce((sum, po) => {
      if (po.netAmount && !isNaN(Number(po.netAmount))) {
        return sum + Number(po.netAmount);
      }
      if (po.totalAmount && !isNaN(Number(po.totalAmount))) {
        return sum + Number(po.totalAmount);
      }
      // Sum line items if present
      if (Array.isArray(po.items)) {
        const itemSum = po.items.reduce((iSum, it) => {
          const price = Number(it.unitPrice || it.product?.basePrice || 0);
          const qty = Number(it.quantity || 0);
          return iSum + price * qty;
        }, 0);
        return sum + itemSum;
      }
      return sum;
    }, 0);

    const totalMaterialInCount = vendorMaterialIns.length;

    // Outstanding / Paid estimates
    // In procurement, paid amount is tracked when payments are logged or POs are fully completed
    const paidAmount = fulfilledPOs > 0 ? (totalPurchaseAmount * (fulfilledPOs / (totalPOs || 1))) : 0;
    const pendingAmount = Math.max(0, totalPurchaseAmount - paidAmount);

    return {
      totalPOs,
      draftPOs,
      approvedPOs,
      fulfilledPOs,
      totalPurchaseAmount,
      paidAmount,
      pendingAmount,
      totalMaterialInCount
    };
  }, [vendorPOs, vendorMaterialIns]);

  // Validation for Add Vendor
  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = "Vendor / Company name is required";
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = "Please enter a valid email address";
    }
    if (formData.contactNumber && !/^[0-9+ -]{7,15}$/.test(formData.contactNumber.trim())) {
      errors.contactNumber = "Please enter a valid phone number";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddVendor = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        gstNumber: formData.gstNumber.trim() || null,
        contactPerson: formData.contactPerson.trim() || null,
        contactNumber: formData.contactNumber.trim() || null,
        email: formData.email.trim() || null,
        address: formData.address.trim() || null,
        bankDetails: formData.bankDetails.trim() || null
      };

      const created = await procurementService.createVendor(payload);
      showToast(`Vendor "${payload.name}" added successfully!`, "success");
      setShowAddModal(false);
      setFormData({
        name: "",
        gstNumber: "",
        contactPerson: "",
        contactNumber: "",
        email: "",
        address: "",
        bankDetails: ""
      });
      setFormErrors({});
      fetchVendors();
      if (created && created.id) {
        setSelectedVendor(created);
      }
    } catch (err) {
      console.error("Error creating vendor:", err);
      showToast(err.message || "Failed to create vendor", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Vendors for List View
  const filteredVendors = useMemo(() => {
    if (!searchQuery.trim()) return vendors;
    const query = searchQuery.toLowerCase().trim();
    return vendors.filter(
      (v) =>
        v.name?.toLowerCase().includes(query) ||
        v.companyName?.toLowerCase().includes(query) ||
        v.gstNumber?.toLowerCase().includes(query) ||
        v.contactPerson?.toLowerCase().includes(query) ||
        v.email?.toLowerCase().includes(query) ||
        v.contactNumber?.toLowerCase().includes(query)
    );
  }, [vendors, searchQuery]);

  // Filtered POs for History Dashboard
  const filteredVendorPOs = useMemo(() => {
    return vendorPOs.filter((po) => {
      const matchSearch =
        !poSearchQuery.trim() ||
        po.poNumber?.toLowerCase().includes(poSearchQuery.toLowerCase().trim()) ||
        po.deliveryLocation?.toLowerCase().includes(poSearchQuery.toLowerCase().trim());

      const matchStatus =
        poStatusFilter === "ALL" ||
        (po.status || "").toLowerCase().replace(/_/g, " ").includes(poStatusFilter.toLowerCase().replace(/_/g, " "));

      return matchSearch && matchStatus;
    });
  }, [vendorPOs, poSearchQuery, poStatusFilter]);

  // Filtered Material IN for History Dashboard
  const filteredMaterialIns = useMemo(() => {
    if (!matInSearchQuery.trim()) return vendorMaterialIns;
    const q = matInSearchQuery.toLowerCase().trim();
    return vendorMaterialIns.filter(
      (m) =>
        m.receiptNumber?.toLowerCase().includes(q) ||
        m.poNumber?.toLowerCase().includes(q) ||
        m.vendorInvoiceNumber?.toLowerCase().includes(q) ||
        m.receivedByEmail?.toLowerCase().includes(q) ||
        m.notes?.toLowerCase().includes(q)
    );
  }, [vendorMaterialIns, matInSearchQuery]);

  // PO Status Badge Helper
  const getPOStatusBadge = (statusStr) => {
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

  return (
    <div style={{ padding: "20px 24px", maxWidth: "1400px", margin: "0 auto", boxSizing: "border-box", fontFamily: "Roboto, sans-serif" }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <style>{`
        .procure-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .procure-title {
          font-size: 22px;
          font-weight: 700;
          color: #0F172A;
          margin: 0 0 4px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .procure-sub {
          font-size: 13px;
          color: #64748B;
          margin: 0;
        }
        .procure-card-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 14px;
          margin-bottom: 20px;
        }
        .procure-stat-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 14px;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .procure-stat-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        .procure-stat-icon {
          width: 44px;
          height: 44px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .procure-controls {
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
        .procure-search-box {
          display: flex;
          align-items: center;
          background: #F8FAFC;
          border: 1px solid #CBD5E1;
          border-radius: 6px;
          padding: 6px 12px;
          width: 320px;
          max-width: 100%;
        }
        .procure-search-box input {
          border: none;
          background: transparent;
          outline: none;
          font-size: 13px;
          margin-left: 8px;
          width: 100%;
          color: #1E293B;
        }
        .procure-table-wrap {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 0 0 10px 10px;
          overflow-x: auto;
        }
        .procure-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 13px;
        }
        .procure-table th {
          background: #F8FAFC;
          color: #475569;
          font-weight: 600;
          padding: 12px 16px;
          border-bottom: 1px solid #E2E8F0;
          white-space: nowrap;
        }
        .procure-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #F1F5F9;
          color: #334155;
          vertical-align: middle;
        }
        .procure-table tr.clickable-row {
          cursor: pointer;
          transition: background-color 0.15s;
        }
        .procure-table tr.clickable-row:hover td {
          background: #F8FAFC;
        }
        .procure-btn-primary {
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
        .procure-btn-primary:hover {
          background: #059669;
        }
        .procure-btn-secondary {
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
          transition: background 0.15s;
        }
        .procure-btn-secondary:hover {
          background: #E2E8F0;
        }
        .tab-btn {
          padding: 10px 18px;
          font-size: 13px;
          font-weight: 600;
          color: #64748B;
          border: none;
          background: transparent;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }
        .tab-btn:hover {
          color: #0F172A;
        }
        .tab-btn.active {
          color: #10B981;
          border-bottom-color: #10B981;
          background: #FFFFFF;
        }
        .badge-count {
          background: #E2E8F0;
          color: #475569;
          padding: 1px 7px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 600;
        }
        .tab-btn.active .badge-count {
          background: #ECFDF5;
          color: #059669;
        }
        .procure-modal-overlay {
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
        .procure-modal {
          background: #FFFFFF;
          border-radius: 12px;
          width: 100%;
          max-width: 580px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        .procure-modal-header {
          padding: 16px 20px;
          border-bottom: 1px solid #E2E8F0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .procure-modal-body {
          padding: 20px;
        }
        .procure-modal-footer {
          padding: 14px 20px;
          border-top: 1px solid #E2E8F0;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          background: #F8FAFC;
          border-radius: 0 0 12px 12px;
        }
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .form-group.full-width {
          grid-column: span 2;
        }
        .form-group label {
          font-size: 12px;
          font-weight: 600;
          color: #334155;
        }
        .form-group input, .form-group select, .form-group textarea {
          border: 1px solid #CBD5E1;
          border-radius: 6px;
          padding: 8px 10px;
          font-size: 13px;
          outline: none;
          color: #0F172A;
          background: #FFFFFF;
        }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
          border-color: #10B981;
        }
        .error-text {
          font-size: 11px;
          color: #DC2626;
          margin-top: 2px;
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* ========================================================================= */}
      {/* VENDOR HISTORY DASHBOARD VIEW (WHEN A VENDOR ROW IS CLICKED)               */}
      {/* ========================================================================= */}
      {selectedVendor ? (
        <div>
          {/* Top Breadcrumb & Navigation Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button
                className="procure-btn-secondary"
                onClick={() => setSelectedVendor(null)}
                style={{ padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <ArrowLeft size={15} /> Back to Vendors List
              </button>
              <div style={{ fontSize: "13px", color: "#64748B" }}>
                <span>Vendor Management</span> / <b style={{ color: "#0F172A" }}>{selectedVendor.name}</b>
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className="procure-btn-secondary"
                onClick={() => fetchVendorHistory(selectedVendor.id)}
                disabled={historyLoading}
                title="Refresh history for this vendor"
              >
                <RefreshCw size={14} className={historyLoading ? "spin" : ""} /> Refresh History
              </button>
            </div>
          </div>

          {/* Vendor Profile Header Card */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "12px",
              padding: "20px 24px",
              marginBottom: "20px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "10px",
                    background: "#ECFDF5",
                    color: "#059669",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <Building2 size={28} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#0F172A" }}>
                      {selectedVendor.name}
                    </h2>
                    <span
                      style={{
                        padding: "2px 10px",
                        borderRadius: "12px",
                        fontSize: "11px",
                        fontWeight: 600,
                        background: selectedVendor.active !== false ? "#ECFDF5" : "#FEF2F2",
                        color: selectedVendor.active !== false ? "#059669" : "#DC2626"
                      }}
                    >
                      {selectedVendor.active !== false ? "Active Supplier" : "Inactive"}
                    </span>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: 500,
                        background: "#EFF6FF",
                        color: "#2563EB",
                        fontFamily: "monospace"
                      }}
                    >
                      ID: #{selectedVendor.id}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "6px", fontSize: "12px", color: "#64748B", flexWrap: "wrap" }}>
                    {selectedVendor.gstNumber && (
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <ShieldCheck size={14} color="#2563EB" /> GST: <b style={{ color: "#0F172A" }}>{selectedVendor.gstNumber}</b>
                      </span>
                    )}
                    {selectedVendor.paymentTerms && (
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <CreditCard size={14} color="#7C3AED" /> Terms: <b style={{ color: "#0F172A" }}>{selectedVendor.paymentTerms}</b>
                      </span>
                    )}
                    {selectedVendor.contactPerson && (
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <User size={14} /> Contact: <span style={{ color: "#0F172A" }}>{selectedVendor.contactPerson}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 5 Summary KPI Cards */}
          <div className="procure-card-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            {/* 1. Total POs */}
            <div className="procure-stat-card">
              <div className="procure-stat-icon" style={{ background: "#EFF6FF", color: "#2563EB" }}>
                <FileCheck2 size={22} />
              </div>
              <div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: "#0F172A" }}>
                  {vendorMetrics.totalPOs}
                </div>
                <div style={{ fontSize: "12px", color: "#64748B" }}>Total Purchase Orders</div>
                <div style={{ fontSize: "11px", color: "#2563EB", marginTop: "2px" }}>
                  {vendorMetrics.approvedPOs} Approved · {vendorMetrics.draftPOs} Draft
                </div>
              </div>
            </div>

            {/* 2. Total Purchase Amount */}
            <div className="procure-stat-card">
              <div className="procure-stat-icon" style={{ background: "#ECFDF5", color: "#059669" }}>
                <DollarSign size={22} />
              </div>
              <div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: "#0F172A" }}>
                  ₹{vendorMetrics.totalPurchaseAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: "12px", color: "#64748B" }}>Total Purchase Amount</div>
                <div style={{ fontSize: "11px", color: "#059669", marginTop: "2px" }}>
                  Across {vendorMetrics.totalPOs} PO(s)
                </div>
              </div>
            </div>

            {/* 3. Paid Amount */}
            <div className="procure-stat-card">
              <div className="procure-stat-icon" style={{ background: "#F0FDF4", color: "#16A34A" }}>
                <CheckCircle2 size={22} />
              </div>
              <div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: "#0F172A" }}>
                  ₹{vendorMetrics.paidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: "12px", color: "#64748B" }}>Fulfilled / Paid Amount</div>
                <div style={{ fontSize: "11px", color: "#16A34A", marginTop: "2px" }}>
                  {vendorMetrics.fulfilledPOs} Fulfilled POs
                </div>
              </div>
            </div>

            {/* 4. Pending / Outstanding Amount */}
            <div className="procure-stat-card">
              <div className="procure-stat-icon" style={{ background: "#FEF3C7", color: "#D97706" }}>
                <Clock size={22} />
              </div>
              <div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: "#0F172A" }}>
                  ₹{vendorMetrics.pendingAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: "12px", color: "#64748B" }}>Pending / Outstanding</div>
                <div style={{ fontSize: "11px", color: "#D97706", marginTop: "2px" }}>
                  Active Procurement Pipeline
                </div>
              </div>
            </div>

            {/* 5. Material IN Count */}
            <div className="procure-stat-card">
              <div className="procure-stat-icon" style={{ background: "#F3E8FF", color: "#7C3AED" }}>
                <ArrowDownLeft size={22} />
              </div>
              <div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: "#0F172A" }}>
                  {vendorMetrics.totalMaterialInCount}
                </div>
                <div style={{ fontSize: "12px", color: "#64748B" }}>Material IN Receipts</div>
                <div style={{ fontSize: "11px", color: "#7C3AED", marginTop: "2px" }}>
                  Inward shipments recorded
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div
            style={{
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "10px 10px 0 0",
              display: "flex",
              borderBottom: "1px solid #E2E8F0",
              overflowX: "auto"
            }}
          >
            <button
              className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
              onClick={() => setActiveTab("overview")}
            >
              <Info size={15} /> Overview
            </button>
            <button
              className={`tab-btn ${activeTab === "orders" ? "active" : ""}`}
              onClick={() => setActiveTab("orders")}
            >
              <FileCheck2 size={15} /> Purchase Orders <span className="badge-count">{vendorPOs.length}</span>
            </button>
            <button
              className={`tab-btn ${activeTab === "material_in" ? "active" : ""}`}
              onClick={() => setActiveTab("material_in")}
            >
              <ArrowDownLeft size={15} /> Material IN <span className="badge-count">{vendorMaterialIns.length}</span>
            </button>
            <button
              className={`tab-btn ${activeTab === "payments" ? "active" : ""}`}
              onClick={() => setActiveTab("payments")}
            >
              <CreditCard size={15} /> Payments & Terms
            </button>
          </div>

          {/* Tab Content Wrap */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderTop: "none",
              borderRadius: "0 0 10px 10px",
              padding: "20px",
              minHeight: "380px"
            }}
          >
            {historyLoading ? (
              <div style={{ padding: "60px 20px", textAlign: "center", color: "#64748B" }}>
                <RefreshCw size={28} className="spin" style={{ margin: "0 auto 12px auto", color: "#10B981" }} />
                <div style={{ fontWeight: 600, fontSize: "14px", color: "#0F172A" }}>Loading vendor history...</div>
                <div style={{ fontSize: "12px", marginTop: "4px" }}>Fetching purchase orders, inward receipts, and commercial records</div>
              </div>
            ) : historyError ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#DC2626" }}>
                <AlertCircle size={28} style={{ margin: "0 auto 12px auto" }} />
                <div style={{ fontWeight: 600, fontSize: "14px" }}>{historyError}</div>
                <button
                  className="procure-btn-secondary"
                  onClick={() => fetchVendorHistory(selectedVendor.id)}
                  style={{ marginTop: "12px" }}
                >
                  Retry Loading
                </button>
              </div>
            ) : (
              <>
                {/* ------------------------------------------------------------- */}
                {/* TAB 1: OVERVIEW                                               */}
                {/* ------------------------------------------------------------- */}
                {activeTab === "overview" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    {/* Top Row: Vendor Details & Commercial Terms */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
                      {/* Company & Contact Profile */}
                      <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", borderBottom: "1px solid #E2E8F0", paddingBottom: "8px" }}>
                          <Building2 size={16} color="#10B981" />
                          <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
                            Vendor Profile & Contact Information
                          </h4>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "12px" }}>
                          <div>
                            <span style={{ color: "#64748B", display: "block", fontSize: "11px", fontWeight: 600 }}>VENDOR NAME</span>
                            <span style={{ fontWeight: 600, color: "#0F172A" }}>{selectedVendor.name}</span>
                          </div>
                          <div>
                            <span style={{ color: "#64748B", display: "block", fontSize: "11px", fontWeight: 600 }}>GST NUMBER</span>
                            <span style={{ fontFamily: "monospace", color: selectedVendor.gstNumber ? "#2563EB" : "#94A3B8" }}>
                              {selectedVendor.gstNumber || "Not Provided"}
                            </span>
                          </div>
                          <div>
                            <span style={{ color: "#64748B", display: "block", fontSize: "11px", fontWeight: 600 }}>CONTACT PERSON</span>
                            <span style={{ color: "#0F172A" }}>{selectedVendor.contactPerson || "—"}</span>
                          </div>
                          <div>
                            <span style={{ color: "#64748B", display: "block", fontSize: "11px", fontWeight: 600 }}>PHONE NUMBER</span>
                            <span style={{ color: "#0F172A", display: "flex", alignItems: "center", gap: "4px" }}>
                              {selectedVendor.contactNumber ? (
                                <>
                                  <Phone size={11} color="#64748B" /> {selectedVendor.contactNumber}
                                </>
                              ) : (
                                "—"
                              )}
                            </span>
                          </div>
                          <div style={{ gridColumn: "span 2" }}>
                            <span style={{ color: "#64748B", display: "block", fontSize: "11px", fontWeight: 600 }}>EMAIL ADDRESS</span>
                            <span style={{ color: "#0F172A", display: "flex", alignItems: "center", gap: "4px" }}>
                              {selectedVendor.email ? (
                                <>
                                  <Mail size={11} color="#64748B" /> {selectedVendor.email}
                                </>
                              ) : (
                                "—"
                              )}
                            </span>
                          </div>
                          <div style={{ gridColumn: "span 2" }}>
                            <span style={{ color: "#64748B", display: "block", fontSize: "11px", fontWeight: 600 }}>ADDRESS / FACTORY LOCATION</span>
                            <span style={{ color: "#334155", display: "flex", alignItems: "flex-start", gap: "4px" }}>
                              <MapPin size={12} color="#64748B" style={{ flexShrink: 0, marginTop: "2px" }} />
                              {selectedVendor.address || "No address provided."}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Commercial Terms & Bank Info */}
                      <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", borderBottom: "1px solid #E2E8F0", paddingBottom: "8px" }}>
                          <CreditCard size={16} color="#7C3AED" />
                          <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
                            Commercial Terms & Bank Details
                          </h4>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "12px" }}>
                          <div>
                            <span style={{ color: "#64748B", display: "block", fontSize: "11px", fontWeight: 600 }}>PAYMENT TERMS</span>
                            <span
                              style={{
                                display: "inline-block",
                                marginTop: "2px",
                                padding: "3px 8px",
                                background: "#FFFFFF",
                                border: "1px solid #CBD5E1",
                                borderRadius: "6px",
                                color: "#0F172A",
                                fontWeight: 600
                              }}
                            >
                              {selectedVendor.paymentTerms || "Net 30"}
                            </span>
                          </div>
                          <div>
                            <span style={{ color: "#64748B", display: "block", fontSize: "11px", fontWeight: 600 }}>STATUS</span>
                            <span style={{ color: selectedVendor.active !== false ? "#059669" : "#DC2626", fontWeight: 600 }}>
                              {selectedVendor.active !== false ? "Active for Procurement" : "Inactive"}
                            </span>
                          </div>
                          <div style={{ gridColumn: "span 2" }}>
                            <span style={{ color: "#64748B", display: "block", fontSize: "11px", fontWeight: 600, marginBottom: "4px" }}>
                              BANK DETAILS & ACCOUNT
                            </span>
                            <div
                              style={{
                                background: "#FFFFFF",
                                border: "1px solid #E2E8F0",
                                borderRadius: "6px",
                                padding: "10px",
                                fontSize: "12px",
                                color: "#334155",
                                whiteSpace: "pre-wrap",
                                fontFamily: "inherit"
                              }}
                            >
                              {selectedVendor.bankDetails || "No bank account details recorded."}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Recent Purchase Orders Snippet */}
                    <div style={{ border: "1px solid #E2E8F0", borderRadius: "10px", overflow: "hidden" }}>
                      <div
                        style={{
                          background: "#F8FAFC",
                          padding: "12px 16px",
                          borderBottom: "1px solid #E2E8F0",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <FileCheck2 size={16} color="#2563EB" />
                          <h4 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>
                            Recent Purchase Orders ({vendorPOs.length})
                          </h4>
                        </div>
                        {vendorPOs.length > 0 && (
                          <button
                            className="procure-btn-secondary"
                            onClick={() => setActiveTab("orders")}
                            style={{ padding: "4px 8px", fontSize: "11px" }}
                          >
                            View All in Orders Tab →
                          </button>
                        )}
                      </div>
                      {vendorPOs.length === 0 ? (
                        <div style={{ padding: "24px", textAlign: "center", color: "#64748B", fontSize: "13px" }}>
                          No Purchase Orders created for this vendor yet.
                        </div>
                      ) : (
                        <table className="procure-table">
                          <thead>
                            <tr>
                              <th>PO Number</th>
                              <th>Creation Date</th>
                              <th>Expected Delivery</th>
                              <th>Items</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {vendorPOs.slice(0, 5).map((po) => {
                              const badge = getPOStatusBadge(po.status);
                              return (
                                <tr key={po.id}>
                                  <td style={{ fontWeight: 600, color: "#0F172A" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                      <FileCheck2 size={14} color="#2563EB" />
                                      {po.poNumber}
                                    </div>
                                  </td>
                                  <td>{po.createdAt ? new Date(po.createdAt).toLocaleDateString() : "—"}</td>
                                  <td>{po.expectedDeliveryDate ? String(po.expectedDeliveryDate) : "—"}</td>
                                  <td>{Array.isArray(po.items) ? `${po.items.length} line items` : "—"}</td>
                                  <td>
                                    <span
                                      style={{
                                        padding: "2px 8px",
                                        borderRadius: "10px",
                                        fontSize: "11px",
                                        fontWeight: 600,
                                        background: badge.bg,
                                        color: badge.color
                                      }}
                                    >
                                      {badge.label}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>

                    {/* Recent Material IN Receipts Snippet */}
                    <div style={{ border: "1px solid #E2E8F0", borderRadius: "10px", overflow: "hidden" }}>
                      <div
                        style={{
                          background: "#F8FAFC",
                          padding: "12px 16px",
                          borderBottom: "1px solid #E2E8F0",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <ArrowDownLeft size={16} color="#059669" />
                          <h4 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>
                            Recent Material IN Receipts ({vendorMaterialIns.length})
                          </h4>
                        </div>
                        {vendorMaterialIns.length > 0 && (
                          <button
                            className="procure-btn-secondary"
                            onClick={() => setActiveTab("material_in")}
                            style={{ padding: "4px 8px", fontSize: "11px" }}
                          >
                            View All in Material IN Tab →
                          </button>
                        )}
                      </div>
                      {vendorMaterialIns.length === 0 ? (
                        <div style={{ padding: "24px", textAlign: "center", color: "#64748B", fontSize: "13px" }}>
                          No Material IN receipts processed for this vendor yet.
                        </div>
                      ) : (
                        <table className="procure-table">
                          <thead>
                            <tr>
                              <th>Receipt Number</th>
                              <th>PO Number</th>
                              <th>Vendor Invoice #</th>
                              <th>Received Date</th>
                              <th>Received By</th>
                            </tr>
                          </thead>
                          <tbody>
                            {vendorMaterialIns.slice(0, 5).map((matIn) => (
                              <tr key={matIn.id}>
                                <td style={{ fontWeight: 600, color: "#0F172A" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <ArrowDownLeft size={14} color="#059669" />
                                    {matIn.receiptNumber}
                                  </div>
                                </td>
                                <td style={{ color: "#2563EB", fontWeight: 500 }}>
                                  {matIn.poNumber || `PO #${matIn.purchaseOrderId}`}
                                </td>
                                <td style={{ fontFamily: "monospace" }}>{matIn.vendorInvoiceNumber || "—"}</td>
                                <td>
                                  {matIn.receivedDate
                                    ? String(matIn.receivedDate)
                                    : matIn.createdAt
                                    ? new Date(matIn.createdAt).toLocaleDateString()
                                    : "—"}
                                </td>
                                <td>{matIn.receivedByEmail || "SCM Admin"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* TAB 2: PURCHASE ORDERS                                        */}
                {/* ------------------------------------------------------------- */}
                {activeTab === "orders" && (
                  <div>
                    {/* Controls Bar */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
                      <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                        <div style={{ display: "flex", alignItems: "center", background: "#F8FAFC", border: "1px solid #CBD5E1", borderRadius: "6px", padding: "6px 12px", width: "260px" }}>
                          <Search size={15} color="#64748B" />
                          <input
                            type="text"
                            placeholder="Search PO#, location..."
                            value={poSearchQuery}
                            onChange={(e) => setPoSearchQuery(e.target.value)}
                            style={{ border: "none", background: "transparent", outline: "none", fontSize: "13px", marginLeft: "8px", width: "100%", color: "#1E293B" }}
                          />
                        </div>

                        <select
                          value={poStatusFilter}
                          onChange={(e) => setPoStatusFilter(e.target.value)}
                          style={{ border: "1px solid #CBD5E1", borderRadius: "6px", padding: "6px 10px", fontSize: "13px", background: "#FFFFFF", color: "#334155" }}
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
                        Showing <b>{filteredVendorPOs.length}</b> of <b>{vendorPOs.length}</b> purchase orders
                      </div>
                    </div>

                    {/* Table */}
                    <div style={{ border: "1px solid #E2E8F0", borderRadius: "8px", overflowX: "auto" }}>
                      {filteredVendorPOs.length === 0 ? (
                        <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
                          <FileCheck2 size={32} style={{ margin: "0 auto 10px auto", opacity: 0.4 }} />
                          <div style={{ fontWeight: 600, fontSize: "14px", color: "#334155" }}>
                            No Purchase Orders found
                          </div>
                          <div style={{ fontSize: "12px", marginTop: "4px" }}>
                            {poSearchQuery || poStatusFilter !== "ALL"
                              ? "Try adjusting your search query or status filter"
                              : "No purchase orders recorded for this vendor."}
                          </div>
                        </div>
                      ) : (
                        <table className="procure-table">
                          <thead>
                            <tr>
                              <th>PO Number</th>
                              <th>Date Created</th>
                              <th>Expected Delivery</th>
                              <th>Items & Quantity</th>
                              <th>Amount</th>
                              <th>Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredVendorPOs.map((po) => {
                              const badge = getPOStatusBadge(po.status);
                              const isExpanded = expandedPOId === po.id;
                              const totalQty = Array.isArray(po.items)
                                ? po.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0)
                                : 0;
                              const poAmount = po.netAmount || po.totalAmount || 0;

                              return (
                                <React.Fragment key={po.id}>
                                  <tr>
                                    <td style={{ fontWeight: 600, color: "#0F172A" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                        <FileCheck2 size={16} color="#2563EB" />
                                        {po.poNumber}
                                      </div>
                                    </td>
                                    <td>
                                      <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#475569" }}>
                                        <Calendar size={13} />
                                        {po.createdAt ? new Date(po.createdAt).toLocaleDateString() : "—"}
                                      </div>
                                    </td>
                                    <td>{po.expectedDeliveryDate ? String(po.expectedDeliveryDate) : "—"}</td>
                                    <td>
                                      <span style={{ fontWeight: 500 }}>
                                        {Array.isArray(po.items) ? po.items.length : 0} line(s) ({totalQty} units)
                                      </span>
                                    </td>
                                    <td>
                                      <span style={{ fontWeight: 600, color: "#0F172A" }}>
                                        ₹{Number(poAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                      </span>
                                    </td>
                                    <td>
                                      <span
                                        style={{
                                          padding: "3px 9px",
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
                                      <button
                                        className="procure-btn-secondary"
                                        onClick={() => setExpandedPOId(isExpanded ? null : po.id)}
                                        style={{ padding: "4px 8px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                                      >
                                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                        {isExpanded ? "Hide Lines" : "View Items"}
                                      </button>
                                    </td>
                                  </tr>

                                  {/* Expandable PO Line Items */}
                                  {isExpanded && (
                                    <tr>
                                      <td colSpan={7} style={{ background: "#F8FAFC", padding: "14px 20px" }}>
                                        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "12px 16px" }}>
                                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                                            <h5 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>
                                              Items Ordered in PO #{po.poNumber}
                                            </h5>
                                            <span style={{ fontSize: "12px", color: "#64748B" }}>
                                              Delivery Location: <b>{po.deliveryLocation || "Bentork Warehouse"}</b>
                                            </span>
                                          </div>
                                          {Array.isArray(po.items) && po.items.length > 0 ? (
                                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                                              <thead>
                                                <tr style={{ background: "#F1F5F9", borderBottom: "1px solid #E2E8F0" }}>
                                                  <th style={{ padding: "6px 10px", textAlign: "left" }}>Product</th>
                                                  <th style={{ padding: "6px 10px", textAlign: "center" }}>Category / Specs</th>
                                                  <th style={{ padding: "6px 10px", textAlign: "center" }}>Ordered Qty</th>
                                                  <th style={{ padding: "6px 10px", textAlign: "center" }}>Received Qty</th>
                                                  <th style={{ padding: "6px 10px", textAlign: "right" }}>Fulfillment Status</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {po.items.map((it) => {
                                                  const isFulfilled = (it.receivedQuantity || 0) >= (it.quantity || 0);
                                                  return (
                                                    <tr key={it.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                                                      <td style={{ padding: "6px 10px", fontWeight: 600, color: "#0F172A" }}>
                                                        {it.product?.name || `Item #${it.id}`}
                                                      </td>
                                                      <td style={{ padding: "6px 10px", textAlign: "center", color: "#64748B" }}>
                                                        {it.product?.category || it.product?.specString || "—"}
                                                      </td>
                                                      <td style={{ padding: "6px 10px", textAlign: "center", fontWeight: 600 }}>
                                                        {it.quantity}
                                                      </td>
                                                      <td style={{ padding: "6px 10px", textAlign: "center", color: it.receivedQuantity > 0 ? "#059669" : "#64748B", fontWeight: 600 }}>
                                                        {it.receivedQuantity || 0}
                                                      </td>
                                                      <td style={{ padding: "6px 10px", textAlign: "right" }}>
                                                        <span
                                                          style={{
                                                            padding: "2px 7px",
                                                            borderRadius: "10px",
                                                            fontSize: "10px",
                                                            fontWeight: 600,
                                                            background: isFulfilled ? "#ECFDF5" : "#FEF3C7",
                                                            color: isFulfilled ? "#059669" : "#D97706"
                                                          }}
                                                        >
                                                          {isFulfilled ? "Completed" : "Pending Inward"}
                                                        </span>
                                                      </td>
                                                    </tr>
                                                  );
                                                })}
                                              </tbody>
                                            </table>
                                          ) : (
                                            <div style={{ color: "#64748B", fontSize: "12px" }}>No item details available.</div>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* TAB 3: MATERIAL IN (INWARD GOODS HISTORY)                     */}
                {/* ------------------------------------------------------------- */}
                {activeTab === "material_in" && (
                  <div>
                    {/* Controls Bar */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", background: "#F8FAFC", border: "1px solid #CBD5E1", borderRadius: "6px", padding: "6px 12px", width: "300px" }}>
                        <Search size={15} color="#64748B" />
                        <input
                          type="text"
                          placeholder="Search by Receipt#, PO#, Invoice#..."
                          value={matInSearchQuery}
                          onChange={(e) => setMatInSearchQuery(e.target.value)}
                          style={{ border: "none", background: "transparent", outline: "none", fontSize: "13px", marginLeft: "8px", width: "100%", color: "#1E293B" }}
                        />
                      </div>

                      <div style={{ fontSize: "12px", color: "#64748B" }}>
                        Showing <b>{filteredMaterialIns.length}</b> of <b>{vendorMaterialIns.length}</b> inward receipts
                      </div>
                    </div>

                    {/* Material In Table */}
                    <div style={{ border: "1px solid #E2E8F0", borderRadius: "8px", overflowX: "auto" }}>
                      {filteredMaterialIns.length === 0 ? (
                        <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
                          <ArrowDownLeft size={32} style={{ margin: "0 auto 10px auto", opacity: 0.4 }} />
                          <div style={{ fontWeight: 600, fontSize: "14px", color: "#334155" }}>
                            No Material IN Receipts found
                          </div>
                          <div style={{ fontSize: "12px", marginTop: "4px" }}>
                            {matInSearchQuery
                              ? "Try adjusting your search keyword"
                              : "No inward receipts have been processed against this vendor's POs yet."}
                          </div>
                        </div>
                      ) : (
                        <table className="procure-table">
                          <thead>
                            <tr>
                              <th>Receipt Number</th>
                              <th>Purchase Order</th>
                              <th>Vendor Invoice #</th>
                              <th>Received Date</th>
                              <th>Received By</th>
                              <th>Notes / Remarks</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredMaterialIns.map((matIn) => (
                              <tr key={matIn.id}>
                                <td style={{ fontWeight: 600, color: "#0F172A" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <ArrowDownLeft size={16} color="#059669" />
                                    {matIn.receiptNumber}
                                  </div>
                                </td>
                                <td>
                                  <span style={{ fontWeight: 600, color: "#2563EB" }}>
                                    {matIn.poNumber || `PO #${matIn.purchaseOrderId}`}
                                  </span>
                                </td>
                                <td style={{ fontFamily: "monospace", color: "#0F172A" }}>
                                  {matIn.vendorInvoiceNumber || "—"}
                                </td>
                                <td>
                                  <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#475569" }}>
                                    <Calendar size={13} />
                                    {matIn.receivedDate
                                      ? String(matIn.receivedDate)
                                      : matIn.createdAt
                                      ? new Date(matIn.createdAt).toLocaleDateString()
                                      : "—"}
                                  </div>
                                </td>
                                <td>
                                  <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#64748B" }}>
                                    <User size={13} />
                                    {matIn.receivedByEmail || "SCM Admin"}
                                  </div>
                                </td>
                                <td style={{ color: "#64748B", maxWidth: "260px" }}>
                                  {matIn.notes || "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* TAB 4: PAYMENTS & COMMERCIAL TERMS                            */}
                {/* ------------------------------------------------------------- */}
                {activeTab === "payments" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                    {/* Financial Billing & Outstanding Balance Summary */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
                      <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748B", display: "block" }}>TOTAL PURCHASE VALUE</span>
                        <div style={{ fontSize: "20px", fontWeight: 700, color: "#0F172A", marginTop: "4px" }}>
                          ₹{vendorMetrics.totalPurchaseAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </div>
                        <span style={{ fontSize: "11px", color: "#64748B", marginTop: "2px", display: "block" }}>
                          Cumulative order commitment
                        </span>
                      </div>

                      <div style={{ background: "#F0FDF4", border: "1px solid #DCFCE7", borderRadius: "10px", padding: "16px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 600, color: "#16A34A", display: "block" }}>FULFILLED / SETTLED</span>
                        <div style={{ fontSize: "20px", fontWeight: 700, color: "#16A34A", marginTop: "4px" }}>
                          ₹{vendorMetrics.paidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </div>
                        <span style={{ fontSize: "11px", color: "#16A34A", marginTop: "2px", display: "block" }}>
                          {vendorMetrics.fulfilledPOs} Fulfilled POs
                        </span>
                      </div>

                      <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: "10px", padding: "16px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 600, color: "#D97706", display: "block" }}>PENDING / OUTSTANDING</span>
                        <div style={{ fontSize: "20px", fontWeight: 700, color: "#D97706", marginTop: "4px" }}>
                          ₹{vendorMetrics.pendingAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </div>
                        <span style={{ fontSize: "11px", color: "#D97706", marginTop: "2px", display: "block" }}>
                          Terms: {selectedVendor.paymentTerms || "Net 30"}
                        </span>
                      </div>
                    </div>

                    {/* Commercial Terms & Bank Records */}
                    <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "18px" }}>
                      <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: 700, color: "#0F172A", display: "flex", alignItems: "center", gap: "8px" }}>
                        <CreditCard size={16} color="#7C3AED" /> Recorded Commercial Terms & Bank Account Details
                      </h4>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "13px" }}>
                        <div>
                          <strong style={{ color: "#64748B", display: "block", fontSize: "11px", marginBottom: "3px" }}>COMMERCIAL PAYMENT TERMS</strong>
                          <span style={{ fontWeight: 600, color: "#0F172A", background: "#FFFFFF", padding: "4px 10px", border: "1px solid #CBD5E1", borderRadius: "6px", display: "inline-block" }}>
                            {selectedVendor.paymentTerms || "Net 30 Days"}
                          </span>
                        </div>
                        <div>
                          <strong style={{ color: "#64748B", display: "block", fontSize: "11px", marginBottom: "3px" }}>GST IDENTIFICATION (GSTIN)</strong>
                          <span style={{ fontFamily: "monospace", color: "#2563EB", fontWeight: 600 }}>
                            {selectedVendor.gstNumber || "Not on file"}
                          </span>
                        </div>
                        <div style={{ gridColumn: "span 2" }}>
                          <strong style={{ color: "#64748B", display: "block", fontSize: "11px", marginBottom: "3px" }}>BANK ACCOUNT / DISBURSEMENT DETAILS</strong>
                          <pre
                            style={{
                              margin: 0,
                              padding: "10px 14px",
                              background: "#FFFFFF",
                              border: "1px solid #E2E8F0",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontFamily: "inherit",
                              color: "#334155",
                              whiteSpace: "pre-wrap"
                            }}
                          >
                            {selectedVendor.bankDetails || "No bank account or IFSC recorded for this supplier."}
                          </pre>
                        </div>
                      </div>
                    </div>

                    {/* Payment Transactions & Backend Notice */}
                    <div style={{ border: "1px solid #E2E8F0", borderRadius: "10px", overflow: "hidden" }}>
                      <div style={{ background: "#F8FAFC", padding: "12px 16px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <FileText size={16} color="#059669" />
                          <h4 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>
                            Disbursement & Payment History
                          </h4>
                        </div>
                      </div>

                      {/* Architecture notice if payment ledger endpoint is pending */}
                      <div style={{ background: "#EFF6FF", borderBottom: "1px solid #DBEAFE", padding: "10px 16px", display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#1E40AF" }}>
                        <Info size={15} style={{ flexShrink: 0 }} />
                        <span>
                          Vendor disbursement transactions follow commercial term <b>{selectedVendor.paymentTerms || "Net 30"}</b>. Live bank disbursement webhook / ledger records will populate here as payment records are logged.
                        </span>
                      </div>

                      <div style={{ padding: "36px 20px", textAlign: "center", color: "#64748B" }}>
                        <CreditCard size={32} style={{ margin: "0 auto 10px auto", opacity: 0.4 }} />
                        <div style={{ fontWeight: 600, fontSize: "14px", color: "#334155" }}>
                          No Outward Payment Transactions Logged
                        </div>
                        <div style={{ fontSize: "12px", marginTop: "4px", maxWidth: "460px", margin: "4px auto 0 auto" }}>
                          All invoices are processed against approved purchase orders subject to <b>{selectedVendor.paymentTerms || "Net 30"}</b> terms.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* MAIN VENDORS LIST VIEW                                                   */
        /* ========================================================================= */
        <>
          {/* Header */}
          <div className="procure-header">
            <div>
              <h1 className="procure-title">
                <Building2 size={24} color="#10B981" /> Vendor Management
              </h1>
              <p className="procure-sub">
                Manage suppliers, GST credentials, contact details, commercial terms, and click any vendor to view history.
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button className="procure-btn-secondary" onClick={fetchVendors} title="Refresh vendor list">
                <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
              </button>
              <button className="procure-btn-primary" onClick={() => setShowAddModal(true)}>
                <Plus size={16} /> Add Vendor
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="procure-card-grid">
            <div className="procure-stat-card">
              <div className="procure-stat-icon" style={{ background: "#ECFDF5", color: "#059669" }}>
                <Building2 size={22} />
              </div>
              <div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: "#0F172A" }}>{vendors.length}</div>
                <div style={{ fontSize: "12px", color: "#64748B" }}>Total Active Vendors</div>
              </div>
            </div>

            <div className="procure-stat-card">
              <div className="procure-stat-icon" style={{ background: "#EFF6FF", color: "#2563EB" }}>
                <FileText size={22} />
              </div>
              <div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: "#0F172A" }}>
                  {vendors.filter((v) => v.gstNumber).length}
                </div>
                <div style={{ fontSize: "12px", color: "#64748B" }}>GST Registered</div>
              </div>
            </div>

            <div className="procure-stat-card">
              <div className="procure-stat-icon" style={{ background: "#F3E8FF", color: "#7C3AED" }}>
                <CreditCard size={22} />
              </div>
              <div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: "#0F172A" }}>
                  {vendors.filter((v) => v.bankDetails).length}
                </div>
                <div style={{ fontSize: "12px", color: "#64748B" }}>Bank Accounts Recorded</div>
              </div>
            </div>
          </div>

          {/* Table Controls */}
          <div className="procure-controls">
            <div className="procure-search-box">
              <Search size={16} color="#64748B" />
              <input
                type="text"
                placeholder="Search by vendor, GST, email, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div style={{ fontSize: "12px", color: "#64748B" }}>
              Showing <b>{filteredVendors.length}</b> of <b>{vendors.length}</b> vendors · <i>Click row to view history</i>
            </div>
          </div>

          {/* Table */}
          <div className="procure-table-wrap">
            {loading ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
                <RefreshCw size={24} className="spin" style={{ margin: "0 auto 10px auto" }} />
                <div>Loading vendors...</div>
              </div>
            ) : error ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#DC2626" }}>
                <AlertCircle size={24} style={{ margin: "0 auto 10px auto" }} />
                <div>{error}</div>
                <button className="procure-btn-secondary" onClick={fetchVendors} style={{ marginTop: "12px" }}>
                  Retry
                </button>
              </div>
            ) : filteredVendors.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
                <Building2 size={32} style={{ margin: "0 auto 10px auto", opacity: 0.5 }} />
                <div style={{ fontWeight: 600, fontSize: "14px", color: "#334155" }}>No vendors found</div>
                <div style={{ fontSize: "12px", marginTop: "4px" }}>
                  {searchQuery ? "Try refining your search keyword" : "Click 'Add Vendor' to register your first supplier"}
                </div>
              </div>
            ) : (
              <table className="procure-table">
                <thead>
                  <tr>
                    <th>Vendor / Company Name</th>
                    <th>GST Number</th>
                    <th>Contact Person</th>
                    <th>Phone & Email</th>
                    <th>Payment Terms</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVendors.map((vendor) => (
                    <tr
                      key={vendor.id}
                      className="clickable-row"
                      onClick={() => {
                        setSelectedVendor(vendor);
                        setActiveTab("overview");
                      }}
                      title="Click to view full vendor history dashboard"
                    >
                      <td style={{ fontWeight: 600, color: "#0F172A" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <Building2 size={16} color="#10B981" />
                          <span>{vendor.name}</span>
                        </div>
                      </td>
                      <td style={{ fontFamily: "monospace", color: vendor.gstNumber ? "#2563EB" : "#94A3B8" }}>
                        {vendor.gstNumber || "—"}
                      </td>
                      <td>{vendor.contactPerson || "—"}</td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "12px" }}>
                          {vendor.contactNumber && (
                            <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#475569" }}>
                              <Phone size={12} /> {vendor.contactNumber}
                            </span>
                          )}
                          {vendor.email && (
                            <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#64748B" }}>
                              <Mail size={12} /> {vendor.email}
                            </span>
                          )}
                          {!vendor.contactNumber && !vendor.email && <span style={{ color: "#94A3B8" }}>—</span>}
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
                          {vendor.paymentTerms || "Net 30"}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            padding: "3px 8px",
                            background: vendor.active !== false ? "#ECFDF5" : "#FEF2F2",
                            color: vendor.active !== false ? "#059669" : "#DC2626",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: 600
                          }}
                        >
                          {vendor.active !== false ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <button
                          className="procure-btn-secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVendor(vendor);
                            setActiveTab("overview");
                          }}
                          style={{ padding: "4px 8px", fontSize: "11px" }}
                        >
                          <Eye size={13} /> View History
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* ADD VENDOR MODAL                                                         */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="procure-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="procure-modal" onClick={(e) => e.stopPropagation()}>
            <div className="procure-modal-header">
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
                Add New Vendor
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B" }}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddVendor}>
              <div className="procure-modal-body">
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Vendor / Company Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Exide Power Systems Pvt Ltd"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                    {formErrors.name && <span className="error-text">{formErrors.name}</span>}
                  </div>

                  <div className="form-group">
                    <label>GST Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 27AABCE1234F1Z5"
                      value={formData.gstNumber}
                      onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Contact Person</label>
                    <input
                      type="text"
                      placeholder="e.g. Rajesh Sharma"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Phone / Mobile</label>
                    <input
                      type="text"
                      placeholder="e.g. +91 98765 43210"
                      value={formData.contactNumber}
                      onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                    />
                    {formErrors.contactNumber && <span className="error-text">{formErrors.contactNumber}</span>}
                  </div>

                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      placeholder="e.g. vendor@supplier.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                    {formErrors.email && <span className="error-text">{formErrors.email}</span>}
                  </div>

                  <div className="form-group full-width">
                    <label>Full Address / Factory Location</label>
                    <textarea
                      rows={2}
                      placeholder="Street, City, State, PIN"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Bank Details</label>
                    <textarea
                      rows={2}
                      placeholder="Bank Name, Account Number, IFSC Code, Branch"
                      value={formData.bankDetails}
                      onChange={(e) => setFormData({ ...formData, bankDetails: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="procure-modal-footer">
                <button
                  type="button"
                  className="procure-btn-secondary"
                  onClick={() => setShowAddModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="procure-btn-primary" disabled={submitting}>
                  {submitting ? "Saving..." : "Save Vendor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
