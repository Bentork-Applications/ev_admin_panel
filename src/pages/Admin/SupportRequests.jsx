import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function SupportRequests({ baseUrl: propBaseUrl, userRole }) {
  const baseUrl = propBaseUrl || import.meta.env.VITE_API_URL;
  const navigate = useNavigate();
  const location = useLocation();
  const isDealer = userRole === "DEALER" || localStorage.getItem("userRole") === "DEALER";

  // Data states
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (location.state?.openCreateModal && isDealer) {
      setShowCreateModal(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, isDealer, navigate, location.pathname]);

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Form states (Dealer only)
  const [formData, setFormData] = useState({
    customerFullName: "",
    product: "AC Fast Charger",
    customProduct: "",
    invoiceNumber: "",
    issueDescription: ""
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Filter states
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All");

  useEffect(() => {
    fetchRequests();
  }, [isDealer]);

  const filterByDate = (items) => {
    if (dateFilter === "All") return items;

    const cutoffDate = new Date();
    if (dateFilter === "7days") {
      cutoffDate.setDate(cutoffDate.getDate() - 7);
    } else if (dateFilter === "1month") {
      cutoffDate.setMonth(cutoffDate.getMonth() - 1);
    } else if (dateFilter === "6months") {
      cutoffDate.setMonth(cutoffDate.getMonth() - 6);
    }

    return items.filter(r => {
      if (!r.createdAt) return false;
      const d = new Date(r.createdAt);
      return !isNaN(d.getTime()) && d >= cutoffDate;
    });
  };

  // Refetch and filter when data or filters change
  useEffect(() => {
    if (!isDealer) {
      applyFilters();
    } else {
      setFilteredRequests(filterByDate(requests));
    }
  }, [requests, statusFilter, typeFilter, dateFilter, isDealer]);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem("token");

    try {
      const endpoint = isDealer
        ? `${baseUrl}/support-requests/dealer/my-requests`
        : `${baseUrl}/support-requests/admin/all`;

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRequests(data);
        window.dispatchEvent(new CustomEvent("refresh-pending-counts"));
      } else {
        throw new Error(`Failed to load requests (${response.status})`);
      }
    } catch (err) {
      console.error("Error fetching support requests:", err);
      setError("Failed to fetch support requests. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem("token");

    try {
      let data = [];

      // Determine the API endpoint based on active filters
      if (statusFilter !== "All" && typeFilter === "All") {
        // Backend status endpoint
        const response = await fetch(`${baseUrl}/support-requests/admin/status/${statusFilter}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) data = await response.json();
        else throw new Error("Failed to filter by status");
      } else if (typeFilter !== "All" && statusFilter === "All") {
        // Backend customer type endpoint
        const response = await fetch(`${baseUrl}/support-requests/admin/customer-type/${typeFilter}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) data = await response.json();
        else throw new Error("Failed to filter by customer type");
      } else if (statusFilter !== "All" && typeFilter !== "All") {
        // Combine status and customer type filter
        // First fetch by status from backend, then filter locally by customer type
        const response = await fetch(`${baseUrl}/support-requests/admin/status/${statusFilter}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const statusData = await response.json();
          data = statusData.filter(r => r.customerType === typeFilter);
        } else {
          throw new Error("Failed to combine filters");
        }
      } else {
        // Fetch all
        const response = await fetch(`${baseUrl}/support-requests/admin/all`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) data = await response.json();
        else throw new Error("Failed to load requests");
      }

      setFilteredRequests(filterByDate(data));
    } catch (err) {
      console.error("Filter error:", err);
      setError("Failed to apply filters. Using local fallback.");

      // Fallback local filtering in case endpoint fails or during offline test
      let localFiltered = [...requests];
      if (statusFilter !== "All") {
        localFiltered = localFiltered.filter(r => r.status === statusFilter);
      }
      if (typeFilter !== "All") {
        localFiltered = localFiltered.filter(r => r.customerType === typeFilter);
      }
      setFilteredRequests(filterByDate(localFiltered));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    // Form validations
    if (!formData.customerFullName.trim()) {
      setFormError("Customer Full Name is required");
      return;
    }

    if (formData.product === "Bentork Battery" && !formData.invoiceNumber.trim()) {
      setFormError("Invoice Number is required for Bentork Battery");
      return;
    }

    let finalProduct = formData.product;
    if (formData.product === "Other") {
      finalProduct = formData.customProduct;
    } else if (formData.product === "Bentork Battery") {
      finalProduct = `Bentork Battery (Invoice: ${formData.invoiceNumber.trim()})`;
    }

    if (!finalProduct.trim()) {
      setFormError("Product field cannot be empty");
      return;
    }

    if (!formData.issueDescription.trim()) {
      setFormError("Issue Description is required");
      return;
    }

    if (formData.issueDescription.length > 1000) {
      setFormError("Issue Description must be 1000 characters or less");
      return;
    }

    setSubmitting(true);
    const token = localStorage.getItem("token");

    try {
      const response = await fetch(`${baseUrl}/support-requests/dealer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          customerFullName: formData.customerFullName.trim(),
          product: finalProduct.trim(),
          issueDescription: formData.issueDescription.trim()
        })
      });

      if (response.ok) {
        const newRequest = await response.json();
        setRequests(prev => [newRequest, ...prev]);
        window.dispatchEvent(new CustomEvent("refresh-pending-counts"));
        setShowCreateModal(false);
        // Reset form
        setFormData({
          customerFullName: "",
          product: "AC Fast Charger",
          customProduct: "",
          invoiceNumber: "",
          issueDescription: ""
        });
      } else {
        const errorText = await response.text();
        setFormError(errorText || "Failed to submit request.");
      }
    } catch (err) {
      console.error("Create request error:", err);
      setFormError("Network error: Could not submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id, nextStatus) => {
    setSubmitting(true);
    const token = localStorage.getItem("token");

    try {
      const typePath = selectedRequest?.customerType === "DEALER" ? "dealer" : "user";
      const response = await fetch(`${baseUrl}/support-requests/admin/${typePath}/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: nextStatus
        })
      });

      if (response.ok) {
        const updatedRequest = await response.json();

        // Update requests lists
        setRequests(prev => prev.map(r => r.id === id ? updatedRequest : r));
        setFilteredRequests(prev => prev.map(r => r.id === id ? updatedRequest : r));
        setSelectedRequest(updatedRequest);
        window.dispatchEvent(new CustomEvent("refresh-pending-counts"));
      } else {
        const errText = await response.text();
        alert(`Failed to update status: ${errText}`);
      }
    } catch (err) {
      console.error("Status update error:", err);
      alert("Network error: Could not update status");
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to check valid next status transition
  const getNextStatus = (currentStatus) => {
    if (currentStatus === "pending") return "approved";
    if (currentStatus === "approved") return "in_progress";
    if (currentStatus === "in_progress") return "completed";
    return null;
  };

  const getTransitionButtonLabel = (nextStatus) => {
    if (nextStatus === "approved") return "Approve Request";
    if (nextStatus === "in_progress") return "Start Work";
    if (nextStatus === "completed") return "Complete Request";
    return "";
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Dynamic stats calculated from the current list
  const totalCount = requests.length;
  const pendingCount = requests.filter(r => r.status === "pending").length;
  const approvedCount = requests.filter(r => r.status === "approved").length;
  const inProgressCount = requests.filter(r => r.status === "in_progress").length;
  const completedCount = requests.filter(r => r.status === "completed").length;

  const currentRequestsList = filteredRequests;

  return (
    <>
      <style>{`
        .support-container {
          width: 100%;
          background: #f1f1f1;
          padding: 24px;
          box-sizing: border-box;
          font-family: 'Lexend', sans-serif;
        }

        .top-header {
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

        .primary-btn {
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

        .primary-btn:hover {
          background: #333;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: #fff;
          border-radius: 16px;
          padding: 20px;
          border: 1px solid #eee;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
        }

        .stat-label {
          font-size: 13px;
          color: #666;
          font-weight: 500;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: #111;
        }

        .filters-section {
          background: #fff;
          border-radius: 16px;
          padding: 16px 20px;
          border: 1px solid #eee;
          margin-bottom: 20px;
          display: flex;
          gap: 16px;
          align-items: center;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .filter-group label {
          font-size: 12px;
          font-weight: 600;
          color: #555;
        }

        .filter-select {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 13px;
          outline: none;
          min-width: 150px;
          background: #fff;
          font-family: 'Lexend', sans-serif;
        }

        .records-section {
          background: #fff;
          border-radius: 24px;
          padding: 24px;
          border: 1px solid #eee;
          box-shadow: 0 4px 6px rgba(0,0,0,0.01);
        }

        .records-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .records-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }

        .records-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }

        .records-table th {
          text-align: left;
          padding: 14px 16px;
          color: #666;
          font-weight: 600;
          font-size: 13px;
          border-bottom: 1px solid #f0f0f0;
          background: #fafafa;
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
          font-size: 11px;
          font-weight: 600;
          text-transform: capitalize;
        }

        .status-pending { background: #fff8e1; color: #b78103; }
        .status-approved { background: #e3f2fd; color: #0d47a1; }
        .status-in_progress { background: #efebe9; color: #5d4037; }
        .status-completed { background: #e8f5e9; color: #1b5e20; }

        .type-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 700;
        }
        .type-dealer { background: #ede7f6; color: #512da8; }
        .type-user { background: #e0f2f1; color: #00796b; }

        .action-btn {
          padding: 6px 14px;
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .action-btn:hover {
          background: #f5f5f5;
          border-color: #ccc;
        }

        /* Modals */
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
          backdrop-filter: blur(4px);
        }

        .modal-content {
          background: #fff;
          padding: 28px;
          border-radius: 20px;
          width: 550px;
          max-width: 90%;
          box-shadow: 0 10px 25px rgba(0,0,0,0.15);
          max-height: 90vh;
          overflow-y: auto;
          font-family: 'Lexend', sans-serif;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          border-bottom: 1px solid #eee;
          padding-bottom: 12px;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: #111;
        }

        .close-icon-btn {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #888;
        }

        .close-icon-btn:hover {
          color: #333;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-size: 13px;
          font-weight: 600;
          color: #333;
        }

        .form-input, .form-textarea, .form-select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 8px;
          outline: none;
          font-size: 14px;
          box-sizing: border-box;
          font-family: 'Lexend', sans-serif;
        }

        .form-input:focus, .form-textarea:focus, .form-select:focus {
          border-color: #111;
        }

        .form-textarea {
          resize: vertical;
          min-height: 100px;
        }

        .char-counter {
          display: block;
          text-align: right;
          font-size: 11px;
          color: #888;
          margin-top: 4px;
        }

        .error-banner {
          background: #fdf2f2;
          border: 1px solid #fde8e8;
          color: #c81e1e;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 13px;
          margin-bottom: 16px;
          font-weight: 500;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
          border-top: 1px solid #eee;
          padding-top: 16px;
        }

        .sec-btn {
          padding: 10px 18px;
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }

        .sec-btn:hover {
          background: #f5f5f5;
        }

        /* Details View Grid */
        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .detail-item-label {
          font-size: 11px;
          color: #888;
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        .detail-item-value {
          font-size: 14px;
          font-weight: 500;
          color: #222;
        }

        .desc-box {
          background: #f9f9f9;
          border: 1px solid #eee;
          border-radius: 10px;
          padding: 14px;
          font-size: 13px;
          color: #333;
          line-height: 1.5;
          margin-top: 8px;
          margin-bottom: 24px;
          white-space: pre-wrap;
          max-height: 180px;
          overflow-y: auto;
        }

        /* Stepper styles */
        .stepper-container {
          margin: 24px 0;
          padding: 10px 0;
        }

        .stepper-header {
          font-size: 12px;
          font-weight: 600;
          color: #666;
          margin-bottom: 16px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stepper {
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
        }

        .stepper::before {
          content: "";
          position: absolute;
          top: 15px;
          left: 0;
          right: 0;
          height: 3px;
          background: #e0e0e0;
          z-index: 1;
        }

        .stepper-progress-line {
          position: absolute;
          top: 15px;
          left: 0;
          height: 3px;
          background: #4caf50;
          z-index: 2;
          transition: width 0.3s ease;
        }

        .step {
          display: flex;
          flex-direction: column;
          align-items: center;
          z-index: 3;
          flex: 1;
        }

        .step-circle {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #fff;
          border: 3px solid #e0e0e0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          color: #999;
          transition: all 0.3s ease;
        }

        .step.completed .step-circle {
          background: #4caf50;
          border-color: #4caf50;
          color: white;
        }

        .step.active .step-circle {
          border-color: #2196f3;
          color: #2196f3;
          box-shadow: 0 0 8px rgba(33, 150, 243, 0.4);
        }

        .step-label {
          margin-top: 8px;
          font-size: 11px;
          font-weight: 600;
          color: #888;
          text-align: center;
          transition: color 0.3s ease;
        }

        .step.active .step-label {
          color: #2196f3;
        }

        .step.completed .step-label {
          color: #333;
        }

        .action-spinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-right: 8px;
        }

        .spinner-dark {
          border: 2px solid rgba(0, 0, 0, 0.1);
          border-top-color: #111;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="support-container">
        <div className="top-header">
          <div className="header-left">
            <h2>Support Requests</h2>
          </div>
          {isDealer && (
            <button className="primary-btn" onClick={() => setShowCreateModal(true)}>
              Raise Support Request
            </button>
          )}
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Total Requests</span>
            <span className="stat-value">{totalCount}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Pending</span>
            <span className="stat-value" style={{ color: "#b78103" }}>{pendingCount}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Approved</span>
            <span className="stat-value" style={{ color: "#0d47a1" }}>{approvedCount}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">In Progress</span>
            <span className="stat-value" style={{ color: "#5d4037" }}>{inProgressCount}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Completed</span>
            <span className="stat-value" style={{ color: "#1b5e20" }}>{completedCount}</span>
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="filters-section">
          <div className="filter-group">
            <label>Date Range</label>
            <select
              className="filter-select"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="All">All Time</option>
              <option value="7days">Last 7 Days</option>
              <option value="1month">Last 1 Month</option>
              <option value="6months">Last 6 Months</option>
            </select>
          </div>

          {!isDealer && (
            <>
              <div className="filter-group">
                <label>Status</label>
                <select
                  className="filter-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="All">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="filter-group">
                <label>User Type</label>
                <select
                  className="filter-select"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="All">All Submitters</option>
                  <option value="DEALER">Dealer Only</option>
                  <option value="END_USER">End User Only</option>
                </select>
              </div>
            </>
          )}
        </div>

        {/* Records Table */}
        <div className="records-section">
          <div className="records-header">
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <div style={{ display: 'inline-block', width: 28, height: 28, border: '3px solid #e2e8f0', borderTopColor: '#111', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 12 }}></div>
              <div style={{ color: '#64748b', fontSize: '14px' }}>Loading requests...</div>
            </div>
          ) : error ? (
            <div style={{ padding: 30, textAlign: 'center', color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 16 }}>
              <div>{error}</div>
              <button onClick={fetchRequests} style={{ marginTop: 12, padding: '6px 14px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Retry</button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="records-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Customer Name</th>
                    <th>Product</th>
                    <th>Date Created</th>
                    {!isDealer && <th>User Type</th>}
                    {!isDealer && <th>Submitter Email</th>}
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRequestsList.length > 0 ? (
                    currentRequestsList.map((req) => (
                      <tr key={req.id}>
                        <td style={{ fontWeight: 600 }}>
                          {req.customerType === "DEALER" ? `D${req.id}` : `EU${req.id}`}
                        </td>
                        <td>{req.customerFullName || "-"}</td>
                        <td>{req.product || "-"}</td>
                        <td>{formatDate(req.createdAt)}</td>
                        {!isDealer && (
                          <td>
                            <span className={`type-badge ${req.customerType === "DEALER" ? "type-dealer" : "type-user"}`}>
                              {req.customerType === "DEALER" ? "DEALER" : "END USER"}
                            </span>
                          </td>
                        )}
                        {!isDealer && (
                          <td style={{ fontSize: '13px', color: '#555' }}>
                            {req.submitterEmail || "-"}
                          </td>
                        )}
                        <td>
                          <span className={`status-badge status-${req.status}`}>
                            {req.status?.replace("_", " ")}
                          </span>
                        </td>
                        <td>
                          <button
                            className="action-btn"
                            onClick={() => {
                              setSelectedRequest(req);
                              setShowDetailsModal(true);
                            }}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={isDealer ? 6 : 8} style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                        No support requests found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* CREATE MODAL (Dealer Only) */}
        {showCreateModal && isDealer && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Raise Support Request</h3>
                <button className="close-icon-btn" onClick={() => setShowCreateModal(false)}>×</button>
              </div>

              <form onSubmit={handleCreateSubmit}>
                {formError && <div className="error-banner">{formError}</div>}

                <div className="form-group">
                  <label>Customer Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter customer full name"
                    value={formData.customerFullName}
                    onChange={(e) => setFormData({ ...formData, customerFullName: e.target.value })}
                    required
                    disabled={submitting}
                  />
                </div>

                <div className="form-group">
                  <label>Product</label>
                  <select
                    className="form-select"
                    value={formData.product}
                    onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                    disabled={submitting}
                  >
                    <option value="AC Fast Charger">AC Fast Charger</option>
                    <option value="DC Dual Charger">DC Dual Charger</option>
                    <option value="RFID Card">RFID Card</option>
                    <option value="Mobile App">Mobile App</option>
                    <option value="Wallet Payment">Wallet Payment</option>
                    <option value="Bentork Battery">Bentork Battery</option>
                    <option value="Others Battery">Others Battery</option>
                    <option value="Other">Other (Custom Product)</option>
                  </select>
                </div>

                {formData.product === "Bentork Battery" && (
                  <div className="form-group">
                    <label>Invoice Number</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Enter invoice number"
                      value={formData.invoiceNumber}
                      onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                      required
                      disabled={submitting}
                    />
                  </div>
                )}

                {formData.product === "Other" && (
                  <div className="form-group">
                    <label>Custom Product Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Enter custom product name"
                      value={formData.customProduct}
                      onChange={(e) => setFormData({ ...formData, customProduct: e.target.value })}
                      required
                      disabled={submitting}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Issue Description (Max 1000 characters)</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Describe the issue in detail..."
                    value={formData.issueDescription}
                    onChange={(e) => {
                      if (e.target.value.length <= 1000) {
                        setFormData({ ...formData, issueDescription: e.target.value });
                      }
                    }}
                    required
                    disabled={submitting}
                  />
                  <span className="char-counter">
                    {formData.issueDescription.length} / 1000 characters
                  </span>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="sec-btn"
                    onClick={() => setShowCreateModal(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="primary-btn" disabled={submitting}>
                    {submitting && <span className="action-spinner"></span>}
                    Submit Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DETAILS & STATUS STEPPER MODAL */}
        {showDetailsModal && selectedRequest && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ width: "600px" }}>
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h3>Support Request Details</h3>
                  <span className={`status-badge status-${selectedRequest.status}`}>
                    {selectedRequest.status?.replace("_", " ")}
                  </span>
                </div>
                <button className="close-icon-btn" onClick={() => setShowDetailsModal(false)}>×</button>
              </div>

              <div className="details-grid">
                <div className="detail-item">
                  <span className="detail-item-label">Request ID</span>
                  <span className="detail-item-value" style={{ fontWeight: 600 }}>
                    {selectedRequest.customerType === "DEALER" ? `D${selectedRequest.id}` : `EU${selectedRequest.id}`}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-item-label">Customer Name</span>
                  <span className="detail-item-value">{selectedRequest.customerFullName}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-item-label">Product</span>
                  <span className="detail-item-value">
                    {selectedRequest.product?.includes("(Invoice:")
                      ? selectedRequest.product.split(" (Invoice:")[0]
                      : selectedRequest.product}
                  </span>
                </div>
                {selectedRequest.product?.includes("(Invoice:") && (
                  <div className="detail-item">
                    <span className="detail-item-label">Invoice Number</span>
                    <span className="detail-item-value" style={{ fontWeight: 600, color: "#1D4ED8" }}>
                      {selectedRequest.product.split("(Invoice: ")[1]?.replace(")", "")}
                    </span>
                  </div>
                )}
                <div className="detail-item">
                  <span className="detail-item-label">Date Created</span>
                  <span className="detail-item-value">{formatDate(selectedRequest.createdAt)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-item-label">Submitter Email</span>
                  <span className="detail-item-value">{selectedRequest.submitterEmail}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-item-label">User Type</span>
                  <span className="detail-item-value">
                    <span className={`type-badge ${selectedRequest.customerType === "DEALER" ? "type-dealer" : "type-user"}`}>
                      {selectedRequest.customerType === "DEALER" ? "DEALER" : "END USER"}
                    </span>
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="detail-item-label">Issue Description</span>
                <div className="desc-box">{selectedRequest.issueDescription}</div>
              </div>

              {/* Visual Status Tracker Stepper */}
              <div className="stepper-container">
                <div className="stepper-header">Ticket Progress</div>
                <div className="stepper">
                  {/* Progress Line */}
                  <div
                    className="stepper-progress-line"
                    style={{
                      width:
                        selectedRequest.status === "pending" ? "0%" :
                          selectedRequest.status === "approved" ? "33.3%" :
                            selectedRequest.status === "in_progress" ? "66.6%" :
                              selectedRequest.status === "completed" ? "100%" : "0%"
                    }}
                  />

                  {/* Pending Step */}
                  <div className={`step ${selectedRequest.status === "pending" ? "active" : "completed"
                    }`}>
                    <div className="step-circle">
                      {selectedRequest.status !== "pending" ? "✓" : "1"}
                    </div>
                    <span className="step-label">Pending</span>
                  </div>

                  {/* Approved Step */}
                  <div className={`step ${selectedRequest.status === "pending" ? "" :
                    selectedRequest.status === "approved" ? "active" : "completed"
                    }`}>
                    <div className="step-circle">
                      {["in_progress", "completed"].includes(selectedRequest.status) ? "✓" : "2"}
                    </div>
                    <span className="step-label">Approved</span>
                  </div>

                  {/* In Progress Step */}
                  <div className={`step ${["pending", "approved"].includes(selectedRequest.status) ? "" :
                    selectedRequest.status === "in_progress" ? "active" : "completed"
                    }`}>
                    <div className="step-circle">
                      {selectedRequest.status === "completed" ? "✓" : "3"}
                    </div>
                    <span className="step-label">In Progress</span>
                  </div>

                  {/* Completed Step */}
                  <div className={`step ${selectedRequest.status === "completed" ? "completed" : ""
                    }`}>
                    <div className="step-circle">
                      4
                    </div>
                    <span className="step-label">Completed</span>
                  </div>
                </div>
              </div>

              {/* Admin Actions */}
              {!isDealer && getNextStatus(selectedRequest.status) && (
                <div style={{
                  marginTop: 24,
                  padding: 16,
                  background: "#fdfdfd",
                  border: "1px solid #f0f0f0",
                  borderRadius: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase' }}>Available Admin Action</span>
                    <span style={{ fontSize: 13, color: '#444' }}>
                      Advance request status to: <b style={{ textTransform: 'capitalize' }}>{getNextStatus(selectedRequest.status)?.replace("_", " ")}</b>
                    </span>
                  </div>
                  <button
                    className="primary-btn"
                    disabled={submitting}
                    onClick={() => handleUpdateStatus(selectedRequest.id, getNextStatus(selectedRequest.status))}
                  >
                    {submitting && <span className="action-spinner"></span>}
                    {getTransitionButtonLabel(getNextStatus(selectedRequest.status))}
                  </button>
                </div>
              )}

              {selectedRequest.status === "completed" && (
                <div style={{
                  marginTop: 24,
                  padding: 14,
                  background: "#e8f5e9",
                  border: "1px solid #c8e6c9",
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  color: "#2e7d32",
                  fontWeight: 600,
                  fontSize: 14
                }}>
                  <span>✓</span> Support request resolved.
                </div>
              )}

              <div className="form-actions" style={{ marginTop: 24 }}>
                <button className="sec-btn" onClick={() => setShowDetailsModal(false)}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
