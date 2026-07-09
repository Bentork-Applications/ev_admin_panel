import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function BatteriesPage({ baseUrl: propBaseUrl }) {
  const navigate = useNavigate();

  const getWarrantyDurationYears = (b) => {
    if (!b.warrantyStartDate || !b.warrantyEndDate) return 0;
    const start = new Date(b.warrantyStartDate);
    const end = new Date(b.warrantyEndDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const years = Math.round(diffDays / 365);
    return Math.max(1, years);
  };

  const calculateEndDate = (startDateStr, yearsStr) => {
    if (!startDateStr || !yearsStr) return "";
    const years = parseInt(yearsStr, 10);
    if (isNaN(years) || years <= 0) return "";

    const start = new Date(startDateStr);
    if (isNaN(start.getTime())) return "";

    const end = new Date(start);
    end.setFullYear(start.getFullYear() + years);

    const yyyy = end.getFullYear();
    const mm = String(end.getMonth() + 1).padStart(2, '0');
    const dd = String(end.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [batteries, setBatteries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [warrantyYearFilter, setWarrantyYearFilter] = useState("All");
  const [productCategoryFilter, setProductCategoryFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [registerMode, setRegisterMode] = useState("single"); // "single" or "series"
  const [registerLoading, setRegisterLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formData, setFormData] = useState({
    customerName: "",
    productDetails: "",
    invoiceNumber: "",
    barcode: "",
    productSerialNumber: "",
    startSeriesNumber: "",
    endSeriesNumber: "",
    warrantyStartDate: "",
    warrantyEndDate: "",
    warrantyYears: "1",
  });

  const [deletedIds, setDeletedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("battery_inventory_deleted_ids") || "[]");
    } catch {
      return [];
    }
  });

  const [editedRecords, setEditedRecords] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("battery_inventory_edited_records") || "{}");
    } catch {
      return {};
    }
  });

  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editFormData, setEditFormData] = useState({
    customerName: "",
    productDetails: "",
    invoiceNumber: "",
    barcode: "",
    productSerialNumber: "",
    warrantyStartDate: "",
    warrantyEndDate: "",
    warrantyYears: "",
  });

  const baseUrl = propBaseUrl || import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchBatteries();
  }, []);

  const handleOpenEdit = (b) => {
    setEditTarget(b);
    const duration = getWarrantyDurationYears(b);
    setEditFormData({
      customerName: b.customerName || "",
      productDetails: b.productDetails || "",
      invoiceNumber: b.invoiceNumber || "",
      barcode: b.barcode || "",
      productSerialNumber: b.productSerialNumber || "",
      warrantyStartDate: b.warrantyStartDate || "",
      warrantyEndDate: b.warrantyEndDate || "",
      warrantyYears: duration > 0 ? duration.toString() : "1",
    });
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    const newEdited = { ...editedRecords };
    editTarget.originalBatteries.forEach(orig => {
      newEdited[orig.id] = {
        customerName: editFormData.customerName,
        productDetails: editFormData.productDetails,
        invoiceNumber: editFormData.invoiceNumber,
        barcode: editFormData.barcode,
        warrantyStartDate: editFormData.warrantyStartDate,
        warrantyEndDate: editFormData.warrantyEndDate,
      };
      if (editTarget.originalBatteries.length === 1) {
        newEdited[orig.id].productSerialNumber = editFormData.productSerialNumber;
      } else {
        newEdited[orig.id].productSerialNumber = orig.productSerialNumber;
      }
    });
    setEditedRecords(newEdited);
    localStorage.setItem("battery_inventory_edited_records", JSON.stringify(newEdited));
    setEditTarget(null);
    alert("Battery records updated successfully!");
  };

  const fetchBatteries = async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }
    try {
      const response = await fetch(`${baseUrl}/battery-data/admin/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setBatteries(Array.isArray(data) ? data : []);
      } else {
        throw new Error(`Failed to load batteries (Status: ${response.status})`);
      }
    } catch (err) {
      console.error("Error fetching batteries:", err);
      setError("Failed to load battery inventory. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setFormError(null);
    setFormData({
      customerName: "",
      productDetails: "",
      invoiceNumber: "",
      barcode: "",
      productSerialNumber: "",
      startSeriesNumber: "",
      endSeriesNumber: "",
      warrantyStartDate: "",
      warrantyEndDate: "",
      warrantyYears: "1",
    });
    setRegisterMode("single");
    setShowModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === "warrantyStartDate" || name === "warrantyYears") {
        updated.warrantyEndDate = calculateEndDate(updated.warrantyStartDate, updated.warrantyYears);
      }
      return updated;
    });
  };

  const handleEditFormChange = (name, value) => {
    setEditFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === "warrantyStartDate" || name === "warrantyYears") {
        updated.warrantyEndDate = calculateEndDate(updated.warrantyStartDate, updated.warrantyYears);
      }
      return updated;
    });
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegisterLoading(true);
    setFormError(null);

    const token = localStorage.getItem("token");
    const payload = {
      customerName: formData.customerName,
      productDetails: formData.productDetails,
      invoiceNumber: formData.invoiceNumber,
      barcode: formData.barcode,
      warrantyStartDate: formData.warrantyStartDate || null,
      warrantyEndDate: formData.warrantyEndDate || null,
    };

    if (registerMode === "single") {
      payload.productSerialNumber = formData.productSerialNumber;
      payload.startSeriesNumber = null;
      payload.endSeriesNumber = null;
    } else {
      payload.productSerialNumber = null;
      payload.startSeriesNumber = formData.startSeriesNumber;
      payload.endSeriesNumber = formData.endSeriesNumber;
    }

    try {
      const response = await fetch(`${baseUrl}/battery-data/admin/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert("Battery data registered successfully!");
        setShowModal(false);
        fetchBatteries();
      } else {
        const errorText = await response.text();
        throw new Error(errorText || "Registration failed");
      }
    } catch (err) {
      console.error("Registration error:", err);
      setFormError(err.message);
    } finally {
      setRegisterLoading(false);
    }
  };

  // Merge backend batteries with local edited overrides and filter out deleted ones
  const activeBatteries = React.useMemo(() => {
    return batteries
      .filter(b => !deletedIds.includes(b.id))
      .map(b => {
        if (editedRecords[b.id]) {
          const edited = editedRecords[b.id];
          const warrantyEndDate = edited.warrantyEndDate || b.warrantyEndDate;
          const isExpired = warrantyEndDate ? new Date().toISOString().split('T')[0] > warrantyEndDate : false;
          return {
            ...b,
            ...edited,
            warrantyActive: !isExpired
          };
        }
        return b;
      });
  }, [batteries, deletedIds, editedRecords]);

  // Group batteries into series
  const groupedBatteries = React.useMemo(() => {
    return groupBatteries(activeBatteries);
  }, [activeBatteries]);

  const getCurrentWarrantyYear = (b) => {
    if (!b.warrantyStartDate || !b.warrantyEndDate) return null;
    const start = new Date(b.warrantyStartDate);
    const end = new Date(b.warrantyEndDate);
    const today = new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    if (today < start) return null; // Warranty has not started yet
    if (today > end) return null;   // Warranty has expired

    // Calculate elapsed years
    let elapsedYears = today.getFullYear() - start.getFullYear();
    const monthDiff = today.getMonth() - start.getMonth();
    const dayDiff = today.getDate() - start.getDate();
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      elapsedYears--;
    }

    const currentYear = elapsedYears + 1;
    const totalYears = getWarrantyDurationYears(b);
    if (currentYear > totalYears) {
      return null;
    }
    return currentYear;
  };

  const maxWarrantyDuration = React.useMemo(() => {
    let max = 0;
    activeBatteries.forEach(b => {
      const duration = getWarrantyDurationYears(b);
      if (duration > max) max = duration;
    });
    return max;
  }, [activeBatteries]);

  const warrantyYearOptions = React.useMemo(() => {
    const options = [];
    for (let i = 1; i <= maxWarrantyDuration; i++) {
      options.push({ value: i.toString(), label: `Year ${i}` });
    }
    return options;
  }, [maxWarrantyDuration]);

  const getBatteryCategory = (b) => {
    if (b.productCategory) return b.productCategory;
    if (b.category) return b.category;
    
    const details = (b.productDetails || "").toLowerCase();
    if (details.includes("solar")) {
      return "Solar Batteries";
    }
    if (details.includes("ev") || details.includes("electric vehicle") || details.includes("li-ion") || details.includes("lithium")) {
      return "EV Batteries";
    }
    if (details.includes("battery") || details.includes("pack")) {
      return "Batteries";
    }
    return "Other";
  };

  const productCategories = React.useMemo(() => {
    const categories = new Set(["Solar Batteries", "EV Batteries", "Batteries"]);
    activeBatteries.forEach(b => {
      const cat = getBatteryCategory(b);
      if (cat) {
        categories.add(cat);
      }
    });
    return Array.from(categories);
  }, [activeBatteries]);

  // Filtered batteries based on search query, warranty year, and product category
  const filteredBatteries = groupedBatteries.filter(b => {
    const matchesSearch = searchQuery === "" ||
      b.displaySerialNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.originalBatteries?.some(orig => orig.productSerialNumber?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      b.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.barcode?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (warrantyYearFilter !== "All") {
      const targetYear = parseInt(warrantyYearFilter, 10);
      const currentYear = getCurrentWarrantyYear(b);
      if (currentYear !== targetYear) return false;
    }

    if (productCategoryFilter !== "All") {
      const cat = getBatteryCategory(b);
      if (cat !== productCategoryFilter) return false;
    }

    return true;
  });

  // Compute metrics
  const totalBatteries = activeBatteries.length;
  const activeWarranties = activeBatteries.filter(b => b.warrantyActive).length;
  const expiredWarranties = totalBatteries - activeWarranties;

  return (
    <div style={{ width: "100%", background: "#f1f1f1", minHeight: "100vh", fontFamily: "'Lexend', sans-serif", padding: "24px", boxSizing: "border-box" }}>
      <style>{`
        .batteries-container {
          max-width: 1200px;
          margin: 0 auto;
        }
        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .header-left h2 {
          font-size: 24px;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0;
        }
        .maint-btn {
          padding: 10px 20px;
          background: #111;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: background 0.2s;
        }
        .maint-btn:hover {
          background: #333;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 24px;
        }
        .stat-card {
          background: #fff;
          border-radius: 16px;
          padding: 24px;
          border: 1px solid #eee;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 120px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.02);
        }
        .stat-label {
          font-size: 14px;
          color: #666;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .stat-value {
          font-size: 32px;
          font-weight: 700;
          color: #111;
          margin-top: 8px;
        }
        .records-section {
          background: #fff;
          border-radius: 24px;
          padding: 24px;
          border: 1px solid #eee;
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
        }
        .search-bar {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid #ddd;
          border-radius: 12px;
          margin-bottom: 20px;
          font-size: 14px;
          outline: none;
          font-family: inherit;
        }
        .records-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }
        .records-table th {
          text-align: left;
          padding: 12px 16px;
          color: #666;
          font-weight: 500;
          font-size: 13px;
          border-bottom: 1px solid #f0f0f0;
        }
        .records-table td {
          padding: 16px;
          font-size: 14px;
          color: #333;
          border-bottom: 1px solid #f0f0f0;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        } 
        .status-active {
          background: #e6fcf5;
          color: #0ca678;
        }
        .status-expired {
          background: #fff5f5;
          color: #f03e3e;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: #fff;
          padding: 32px;
          border-radius: 20px;
          width: 600px;
          max-width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        }
        .modal-tabs {
          display: flex;
          border-bottom: 1px solid #eee;
          margin-bottom: 24px;
        }
        .modal-tab {
          flex: 1;
          text-align: center;
          padding: 12px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          color: #666;
          border-bottom: 2px solid transparent;
        }
        .modal-tab.active {
          color: #111;
          border-bottom-color: #111;
        }
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .form-group {
          margin-bottom: 16px;
        }
        .form-group.full-width {
          grid-column: span 2;
        }
        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-size: 13px;
          color: #444;
          font-weight: 500;
        }
        .form-group input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 8px;
          outline: none;
          font-size: 14px;
          box-sizing: border-box;
          font-family: inherit;
        }
        .form-group input:focus {
          border-color: #111;
        }
        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
        }
        .action-btn {
          padding: 10px 20px;
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          font-family: inherit;
        }
        .action-btn:hover {
          background: #f5f5f5;
        }
      `}</style>

      <div className="batteries-container">
        <div className="header-row">
          <div className="header-left">
            <h2>Battery Inventory</h2>
          </div>
          <button className="maint-btn" onClick={handleOpenModal}>Register Batteries</button>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Total Inventory <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2" /><line x1="9" y1="2" x2="9" y2="22" /><line x1="15" y1="2" x2="15" y2="22" /><line x1="2" y1="12" x2="22" y2="12" /></svg></span>
            <span className="stat-value">{totalBatteries}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Active Warranty <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg></span>
            <span className="stat-value" style={{ color: "#0ca678" }}>{activeWarranties}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Expired Warranty <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg></span>
            <span className="stat-value" style={{ color: "#f03e3e" }}>{expiredWarranties}</span>
          </div>
        </div>

        <div className="records-section">
          <input
            type="text"
            placeholder="Search by Serial Number, Customer Name, Invoice, Barcode..."
            className="search-bar"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <div style={{ display: "flex", gap: "16px", marginBottom: "20px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: "1 1 200px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "#555" }}>Battery Registered From</label>
              <select
                className="filter-select"
                value={warrantyYearFilter}
                onChange={(e) => setWarrantyYearFilter(e.target.value)}
                style={{
                  padding: "12px 16px",
                  border: "1px solid #ddd",
                  borderRadius: "12px",
                  fontSize: "14px",
                  outline: "none",
                  background: "#fff",
                  fontFamily: "inherit",
                  cursor: "pointer",
                  width: "100%",
                  height: "46px",
                  boxSizing: "border-box"
                }}
              >
                <option value="All">All Warranty Years</option>
                {warrantyYearOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: "1 1 200px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "#555" }}>Product Category</label>
              <select
                className="filter-select"
                value={productCategoryFilter}
                onChange={(e) => setProductCategoryFilter(e.target.value)}
                style={{
                  padding: "12px 16px",
                  border: "1px solid #ddd",
                  borderRadius: "12px",
                  fontSize: "14px",
                  outline: "none",
                  background: "#fff",
                  fontFamily: "inherit",
                  cursor: "pointer",
                  width: "100%",
                  height: "46px",
                  boxSizing: "border-box"
                }}
              >
                <option value="All">All Product Categories</option>
                {productCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <div style={{ display: 'inline-block', width: 24, height: 24, border: '3px solid #e2e8f0', borderTopColor: '#111', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 12 }}></div>
              <div style={{ color: '#64748b' }}>Loading battery records...</div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : error ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#ef4444' }}>
              <div>{error}</div>
              <button className="maint-btn" onClick={fetchBatteries} style={{ marginTop: 12 }}>Retry</button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="records-table">
                <thead>
                  <tr>
                    <th>Serial Number</th>
                    <th>Customer Name</th>
                    <th>Product Details</th>
                    <th>Invoice Number</th>
                    <th>Barcode</th>
                    <th>Warranty Period</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBatteries.length > 0 ? (
                    filteredBatteries.map((b) => (
                      <tr key={b.id}>
                        <td style={{ fontWeight: 600 }}>{b.displaySerialNumber}</td>
                        <td>{b.customerName || "-"}</td>
                        <td>{b.productDetails || "-"}</td>
                        <td>{b.invoiceNumber || "-"}</td>
                        <td>{b.barcode || "-"}</td>
                        <td style={{ fontSize: 13, color: "#666" }}>
                          {b.warrantyStartDate} to {b.warrantyEndDate}
                        </td>
                        <td>
                          <span className={`status-badge ${b.warrantyActive ? "status-active" : "status-expired"}`}>
                            {b.warrantyActive ? "Active" : "Expired"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              onClick={() => handleOpenEdit(b)}
                              style={{
                                padding: "6px 12px",
                                background: "#eff6ff",
                                color: "#2563eb",
                                border: "1px solid #dbeafe",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: "bold",
                                transition: "all 0.2s"
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setDeleteTarget(b)}
                              style={{
                                padding: "6px 12px",
                                background: "#fef2f2",
                                color: "#dc2626",
                                border: "1px solid #fee2e2",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: "bold",
                                transition: "all 0.2s"
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", padding: "40px", color: "#999" }}>
                        No battery records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ margin: "0 0 4px 0", fontSize: 20 }}>Register Batteries</h3>
            <p style={{ margin: "0 0 20px 0", fontSize: 13, color: "#666" }}>
              Add a single battery or automatically expand a numeric series of serials
            </p>

            <div className="modal-tabs">
              <div
                className={`modal-tab ${registerMode === "single" ? "active" : ""}`}
                onClick={() => { setRegisterMode("single"); setFormError(null); }}
              >
                Single Battery
              </div>
              <div
                className={`modal-tab ${registerMode === "series" ? "active" : ""}`}
                onClick={() => { setRegisterMode("series"); setFormError(null); }}
              >
                Bulk Registration
              </div>
            </div>

            {formError && (
              <div style={{ background: "#fff5f5", color: "#f03e3e", padding: 12, borderRadius: 8, fontSize: 13, border: "1px solid #ffe3e3", marginBottom: 16 }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Customer Name</label>
                  <input
                    type="text"
                    name="customerName"
                    value={formData.customerName}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Invoice Number</label>
                  <input
                    type="text"
                    name="invoiceNumber"
                    value={formData.invoiceNumber}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div className="form-group full-width">
                  <label>Product Description</label>
                  <input
                    type="text"
                    name="productDetails"
                    placeholder="e.g. EV Li-Ion Battery Pack 60V 30Ah"
                    value={formData.productDetails}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Barcode</label>
                  <input
                    type="text"
                    name="barcode"
                    value={formData.barcode}
                    onChange={handleFormChange}
                    required
                  />
                </div>

                {registerMode === "single" ? (
                  <div className="form-group">
                    <label>Product Serial Number</label>
                    <input
                      type="text"
                      name="productSerialNumber"
                      placeholder="e.g. BAT1001"
                      value={formData.productSerialNumber}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                ) : (
                  <>
                    <div className="form-group">
                      <label>Start Series Number</label>
                      <input
                        type="text"
                        name="startSeriesNumber"
                        placeholder="e.g. BAT001"
                        value={formData.startSeriesNumber}
                        onChange={handleFormChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>End Series Number</label>
                      <input
                        type="text"
                        name="endSeriesNumber"
                        placeholder="e.g. BAT005"
                        value={formData.endSeriesNumber}
                        onChange={handleFormChange}
                        required
                      />
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label>Warranty Start Date</label>
                  <input
                    type="date"
                    name="warrantyStartDate"
                    value={formData.warrantyStartDate}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Warranty Duration (Years)</label>
                  <input
                    type="number"
                    name="warrantyYears"
                    min="1"
                    placeholder="e.g. 1, 2, 3"
                    value={formData.warrantyYears}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Warranty End Date</label>
                  <input
                    type="date"
                    name="warrantyEndDate"
                    value={formData.warrantyEndDate}
                    readOnly
                    required
                    style={{ background: "#f5f5f5", cursor: "not-allowed" }}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="action-btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="maint-btn" disabled={registerLoading}>
                  {registerLoading ? "Registering..." : "Register"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editTarget && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ margin: "0 0 4px 0", fontSize: 20 }}>
              {editTarget.originalBatteries?.length > 1 ? "Edit Battery Series" : "Edit Battery"}
            </h3>
            <p style={{ margin: "0 0 20px 0", fontSize: 13, color: "#666" }}>
              Update details for this battery record.
            </p>

            <form onSubmit={handleEditSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Customer Name</label>
                  <input
                    type="text"
                    value={editFormData.customerName}
                    onChange={(e) => setEditFormData({ ...editFormData, customerName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Invoice Number</label>
                  <input
                    type="text"
                    value={editFormData.invoiceNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, invoiceNumber: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group full-width">
                  <label>Product Description</label>
                  <input
                    type="text"
                    value={editFormData.productDetails}
                    onChange={(e) => setEditFormData({ ...editFormData, productDetails: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Barcode</label>
                  <input
                    type="text"
                    value={editFormData.barcode}
                    onChange={(e) => setEditFormData({ ...editFormData, barcode: e.target.value })}
                    required
                  />
                </div>

                {editTarget.originalBatteries?.length === 1 && (
                  <div className="form-group">
                    <label>Product Serial Number</label>
                    <input
                      type="text"
                      value={editFormData.productSerialNumber}
                      onChange={(e) => setEditFormData({ ...editFormData, productSerialNumber: e.target.value })}
                      required
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Warranty Start Date</label>
                  <input
                    type="date"
                    value={editFormData.warrantyStartDate}
                    onChange={(e) => handleEditFormChange("warrantyStartDate", e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Warranty Duration (Years)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 1, 2, 3"
                    value={editFormData.warrantyYears}
                    onChange={(e) => handleEditFormChange("warrantyYears", e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Warranty End Date</label>
                  <input
                    type="date"
                    value={editFormData.warrantyEndDate}
                    readOnly
                    required
                    style={{ background: "#f5f5f5", cursor: "not-allowed" }}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="action-btn" onClick={() => setEditTarget(null)}>Cancel</button>
                <button type="submit" className="maint-btn">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 400 }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: 18 }}>Delete Battery Record?</h3>
            <p style={{ margin: "0 0 20px 0", fontSize: 14, color: "#666" }}>
              Are you sure you want to delete {deleteTarget.originalBatteries?.length > 1 ? "this battery series" : "this battery record"}? This action cannot be undone on the client side.
            </p>
            <div className="form-actions" style={{ marginTop: 20 }}>
              <button type="button" className="action-btn" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button
                type="button"
                className="maint-btn"
                style={{ background: "#dc2626" }}
                onClick={() => {
                  const newDeleted = [...deletedIds, ...deleteTarget.originalBatteries.map(orig => orig.id)];
                  setDeletedIds(newDeleted);
                  localStorage.setItem("battery_inventory_deleted_ids", JSON.stringify(newDeleted));
                  setDeleteTarget(null);
                  alert("Battery records deleted successfully!");
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function groupBatteries(batteryList) {
  if (!Array.isArray(batteryList) || batteryList.length === 0) {
    return [];
  }

  // 1. Group by identical non-serial fields
  const groups = {};
  batteryList.forEach(battery => {
    const key = [
      battery.customerName || "",
      battery.productDetails || "",
      battery.invoiceNumber || "",
      battery.barcode || "",
      battery.warrantyStartDate || "",
      battery.warrantyEndDate || "",
      battery.warrantyActive ? "active" : "expired"
    ].join("||");

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(battery);
  });

  const groupedList = [];

  // Helper to extract prefix and suffix
  const parseSerial = (serial) => {
    if (!serial) return null;
    const match = serial.match(/^([a-zA-Z_-]*)(0*)(\d+)$/);
    if (!match) return null;
    return {
      prefix: match[1],
      padding: match[2],
      num: parseInt(match[3], 10),
      numStr: match[3],
      original: serial
    };
  };

  // Helper to create a grouped row
  const createGroupRow = (chunk) => {
    const first = chunk[0];
    const last = chunk[chunk.length - 1];
    const originalBatteries = chunk.map(c => c.battery);

    let displaySerialNumber = first.original;
    if (chunk.length > 1) {
      displaySerialNumber = `${first.original} to ${last.original}`;
    }

    return {
      ...first.battery,
      displaySerialNumber,
      originalBatteries
    };
  };

  // 2. Process each group to find continuous ranges
  Object.values(groups).forEach(members => {
    const parsable = [];
    const unparsable = [];

    members.forEach(b => {
      const parsed = parseSerial(b.productSerialNumber);
      if (parsed) {
        parsable.push({ battery: b, ...parsed });
      } else {
        unparsable.push(b);
      }
    });

    unparsable.forEach(b => {
      groupedList.push({
        ...b,
        displaySerialNumber: b.productSerialNumber || "-",
        originalBatteries: [b]
      });
    });

    const subGroups = {};
    parsable.forEach(p => {
      const totalLen = p.padding.length + p.numStr.length;
      const subKey = `${p.prefix}||${totalLen}`;
      if (!subGroups[subKey]) {
        subGroups[subKey] = [];
      }
      subGroups[subKey].push(p);
    });

    Object.values(subGroups).forEach(subGroup => {
      subGroup.sort((a, b) => a.num - b.num);

      let chunk = [];
      for (let i = 0; i < subGroup.length; i++) {
        const item = subGroup[i];
        if (chunk.length === 0) {
          chunk.push(item);
        } else {
          const lastItem = chunk[chunk.length - 1];
          if (item.num === lastItem.num + 1) {
            chunk.push(item);
          } else {
            groupedList.push(createGroupRow(chunk));
            chunk = [item];
          }
        }
      }
      if (chunk.length > 0) {
        groupedList.push(createGroupRow(chunk));
      }
    });
  });

  return groupedList;
}
