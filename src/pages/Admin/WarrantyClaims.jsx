import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const STATUS_CONFIGS = {
  request_created: { label: "Request Created", bg: "#FEF3C7", color: "#D97706" },
  approved: { label: "Approved", bg: "#DBEAFE", color: "#1D4ED8" },
  rejected: { label: "Rejected", bg: "#FEE2E2", color: "#DC2626" },
  product_received: { label: "Product Received", bg: "#E0F2FE", color: "#0369A1" },
  processing: { label: "Processing", bg: "#F3E8FF", color: "#7E22CE" },
  completed: { label: "Repair Complete", bg: "#D1FAE5", color: "#047857" },
  dispatched: { label: "Dispatched", bg: "#E0E7FF", color: "#4338CA" },
  delivered: { label: "Delivered", bg: "#ECFDF5", color: "#065F46" },
  user_confirmed: { label: "Confirmed by User", bg: "#D1FAE5", color: "#065F46" },
  closed: { label: "Closed", bg: "#F3F4F6", color: "#4B5563" },
};

const getProcessingTime = (startStr, closeStr) => {
  if (!startStr || !closeStr) return "In Progress";
  const start = new Date(startStr);
  const close = new Date(closeStr);
  const diffMs = close - start;
  if (diffMs < 0) return "0 Days, 0 Hours, 0 Minutes";

  const diffMins = Math.floor(diffMs / 1000 / 60);
  const mins = diffMins % 60;
  const diffHours = Math.floor(diffMins / 60);
  const hours = diffHours % 24;
  const days = Math.floor(diffHours / 24);

  return `${days} Days, ${hours} Hours, ${mins} Minutes`;
};

export default function WarrantyClaimsPage({ baseUrl: propBaseUrl }) {
  const navigate = useNavigate();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // "all", "pending", "in_service", "dispatched", "closed"
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  
  // Action state
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [courierData, setCourierData] = useState({
    courierName: "",
    trackingNumber: "",
    dispatchDate: new Date().toISOString().split('T')[0],
  });
  const [showDispatchForm, setShowDispatchForm] = useState(false);
  const [actionError, setActionError] = useState(null);

  const baseUrl = propBaseUrl || import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }
    try {
      const [claimsRes, batteriesRes] = await Promise.all([
        fetch(`${baseUrl}/warranty-claims/admin/all`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${baseUrl}/battery-data/admin/all`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (!claimsRes.ok) {
        throw new Error(`Failed to load claims (Status: ${claimsRes.status})`);
      }

      const claimsData = await claimsRes.json();
      let batteriesMap = {};

      if (batteriesRes.ok) {
        const batteriesData = await batteriesRes.json();
        if (Array.isArray(batteriesData)) {
          batteriesData.forEach(b => {
            batteriesMap[b.id] = b;
          });
        }
      }

      const mappedClaims = (Array.isArray(claimsData) ? claimsData : []).map(claim => {
        const battery = batteriesMap[claim.batteryDataId];
        return {
          ...claim,
          barcode: battery ? battery.barcode : null,
          warrantyStartDate: battery ? battery.warrantyStartDate : null,
          warrantyEndDate: battery ? battery.warrantyEndDate : null,
          productSerialNumber: battery ? battery.productSerialNumber : null,
        };
      });

      setClaims(mappedClaims);
    } catch (err) {
      console.error("Error fetching claims:", err);
      setError("Failed to load warranty claims. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetails = async (claimId) => {
    setModalLoading(true);
    setActionError(null);
    setShowRejectForm(false);
    setShowDispatchForm(false);
    setRejectReason("");
    setCourierData({
      courierName: "",
      trackingNumber: "",
      dispatchDate: new Date().toISOString().split('T')[0],
    });
    
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`${baseUrl}/warranty-claims/admin/${claimId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const detail = await response.json();
        if (detail.batteryDataId) {
          try {
            const batteryResponse = await fetch(`${baseUrl}/battery-data/admin/${detail.batteryDataId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (batteryResponse.ok) {
              const batteryDetail = await batteryResponse.json();
              detail.barcode = batteryDetail.barcode;
              detail.warrantyStartDate = batteryDetail.warrantyStartDate;
              detail.warrantyEndDate = batteryDetail.warrantyEndDate;
              detail.productSerialNumber = batteryDetail.productSerialNumber;
            }
          } catch (batErr) {
            console.error("Error fetching battery details for claim:", batErr);
          }
        }
        setSelectedClaim(detail);
      } else {
        throw new Error("Failed to fetch claim details");
      }
    } catch (err) {
      console.error(err);
      alert("Error loading claim details: " + err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const handleWorkflowAction = async (endpoint, method = "PUT", body = null) => {
    if (!selectedClaim) return;
    setModalLoading(true);
    setActionError(null);
    const token = localStorage.getItem("token");
    try {
      const config = {
        method: method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      };
      if (body) {
        config.body = JSON.stringify(body);
      }

      const response = await fetch(`${baseUrl}/warranty-claims/admin/${selectedClaim.id}/${endpoint}`, config);
      if (response.ok) {
        const updated = await response.json();
        setSelectedClaim(updated);
        setShowRejectForm(false);
        setShowDispatchForm(false);
        // Refresh claim list in background
        fetchClaims();
        window.dispatchEvent(new CustomEvent("refresh-pending-counts"));
      } else {
        const errorText = await response.text();
        throw new Error(errorText || "Action failed");
      }
    } catch (err) {
      console.error("Workflow error:", err);
      setActionError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const getClaimImageSrc = (photoBase64) => {
    if (!photoBase64) return null;
    if (photoBase64.startsWith("data:image")) return photoBase64;
    return `data:image/jpeg;base64,${photoBase64}`;
  };

  const formatTimestamp = (ts) => {
    if (!ts) return null;
    return new Date(ts).toLocaleString();
  };

  // Filtering logic by tabs
  const getTabFilteredClaims = () => {
    switch (activeTab) {
      case "pending":
        return claims.filter(c => c.status === "request_created");
      case "in_service":
        return claims.filter(c => ["approved", "product_received", "processing", "completed"].includes(c.status));
      case "dispatched":
        return claims.filter(c => ["dispatched", "delivered"].includes(c.status));
      case "closed":
        return claims.filter(c => ["closed", "rejected", "user_confirmed"].includes(c.status));
      default:
        return claims;
    }
  };

  const tabFiltered = getTabFilteredClaims();
  
  const searchFilteredClaims = tabFiltered.filter(c => 
    c.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.productDetails?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.submitterEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.id?.toString().includes(searchQuery)
  );

  const allCount = claims.length;
  const pendingCount = claims.filter(c => c.status === "request_created").length;
  const inServiceCount = claims.filter(c => ["approved", "product_received", "processing", "completed"].includes(c.status)).length;
  const dispatchedCount = claims.filter(c => ["dispatched", "delivered"].includes(c.status)).length;
  const closedCount = claims.filter(c => ["closed", "rejected", "user_confirmed"].includes(c.status)).length;

  return (
    <div style={{ width: "100%", background: "#f1f1f1", minHeight: "100vh", fontFamily: "'Lexend', sans-serif", padding: "24px", boxSizing: "border-box" }}>
      <style>{`
        .claims-container {
          max-width: 1200px;
          margin: 0 auto;
        }
        .header-row {
          margin-bottom: 24px;
        }
        .header-row h2 {
          font-size: 24px;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0;
        }
        .tabs-header {
          display: flex;
          gap: 8px;
          border-bottom: 1px solid #ddd;
          margin-bottom: 20px;
        }
        .tab-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          cursor: pointer;
          font-weight: 500;
          font-size: 14px;
          color: #666;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
        }
        .tab-btn.active {
          color: #111;
          border-bottom-color: #111;
          font-weight: 600;
        }
        .tab-badge {
          padding: 2px 6px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          background: #e2e8f0;
          color: #475569;
          transition: all 0.2s;
        }
        .tab-btn.active .tab-badge {
          background: #111;
          color: #fff;
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
          display: inline-flex;
          align-items: center;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: capitalize;
        }
        .action-btn {
          padding: 6px 14px;
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s;
          font-family: inherit;
        }
        .action-btn:hover {
          background: #f5f5f5;
        }
        .primary-btn {
          background: #111;
          color: #fff;
          border: none;
        }
        .primary-btn:hover {
          background: #333;
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
          border-radius: 24px;
          width: 800px;
          max-width: 95%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 10px 30px rgba(0,0,0,0.15);
        }
        .modal-grid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 24px;
          margin-top: 20px;
        }
        .detail-box {
          border: 1px solid #eee;
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 16px;
          background: #fafafa;
        }
        .detail-label {
          font-size: 12px;
          color: #888;
          margin-bottom: 4px;
        }
        .detail-value {
          font-size: 14px;
          font-weight: 500;
          color: #111;
        }
        .claim-image {
          width: 100%;
          border-radius: 12px;
          border: 1px solid #ddd;
          max-height: 220px;
          object-fit: contain;
          background: #fdfdfd;
        }
        .timeline {
          border-left: 2px solid #ddd;
          padding-left: 16px;
          margin-left: 8px;
          position: relative;
        }
        .timeline-item {
          position: relative;
          margin-bottom: 20px;
        }
        .timeline-dot {
          position: absolute;
          left: -23px;
          top: 4px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #ddd;
          border: 2px solid #fff;
        }
        .timeline-dot.completed {
          background: #0ca678;
        }
        .timeline-title {
          font-size: 13px;
          font-weight: 600;
          color: #333;
        }
        .timeline-time {
          font-size: 11px;
          color: #888;
        }
        .form-group {
          margin-bottom: 12px;
        }
        .form-group label {
          display: block;
          font-size: 12px;
          margin-bottom: 4px;
          font-weight: 500;
        }
        .form-group input, .form-group textarea {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-family: inherit;
          font-size: 13px;
          box-sizing: border-box;
          outline: none;
        }
        .form-group input:focus, .form-group textarea:focus {
          border-color: #111;
        }
      `}</style>

      <div className="claims-container">
        <div className="header-row">
          <h2>Warranty Claims Workspace</h2>
        </div>

        <div className="tabs-header">
          <div className={`tab-btn ${activeTab === "all" ? "active" : ""}`} onClick={() => setActiveTab("all")}>
            All Claims <span className="tab-badge">{allCount}</span>
          </div>
          <div className={`tab-btn ${activeTab === "pending" ? "active" : ""}`} onClick={() => setActiveTab("pending")}>
            Pending Approval <span className="tab-badge">{pendingCount}</span>
          </div>
          <div className={`tab-btn ${activeTab === "in_service" ? "active" : ""}`} onClick={() => setActiveTab("in_service")}>
            In Service Center <span className="tab-badge">{inServiceCount}</span>
          </div>
          <div className={`tab-btn ${activeTab === "dispatched" ? "active" : ""}`} onClick={() => setActiveTab("dispatched")}>
            Dispatched / Delivered <span className="tab-badge">{dispatchedCount}</span>
          </div>
          <div className={`tab-btn ${activeTab === "closed" ? "active" : ""}`} onClick={() => setActiveTab("closed")}>
            Closed / Rejected <span className="tab-badge">{closedCount}</span>
          </div>
        </div>

        <div className="records-section">
          <input
            type="text"
            placeholder="Search by Claim ID, Customer, Invoice, Submitter Email, Product..."
            className="search-bar"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {loading ? (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <div style={{ display: 'inline-block', width: 24, height: 24, border: '3px solid #e2e8f0', borderTopColor: '#111', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 12 }}></div>
              <div style={{ color: '#64748b' }}>Loading claims list...</div>
            </div>
          ) : error ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#ef4444' }}>
              <div>{error}</div>
              <button className="maint-btn" onClick={fetchClaims} style={{ marginTop: 12 }}>Retry</button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="records-table">
                <thead>
                  <tr>
                    <th>Claim ID</th>
                    <th>Customer Name</th>
                    <th>Product Details</th>
                    <th>Barcode</th>
                    <th>Warranty Period</th>
                    <th>Invoice Number</th>
                    <th>Submitter Email</th>
                    <th>Status</th>
                    <th>Created At</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {searchFilteredClaims.length > 0 ? (
                    searchFilteredClaims.map((c) => {
                      const cfg = STATUS_CONFIGS[c.status] || { label: c.status, bg: "#eee", color: "#666" };
                      return (
                        <tr key={c.id}>
                          <td style={{ fontWeight: 600 }}>#{c.id}</td>
                          <td>{c.customerName || "-"}</td>
                          <td>{c.productDetails || "-"}</td>
                          <td>{c.barcode || "-"}</td>
                          <td style={{ whiteSpace: "nowrap" }}>
                            {c.warrantyStartDate && c.warrantyEndDate 
                              ? `${c.warrantyStartDate} to ${c.warrantyEndDate}`
                              : "-"}
                          </td>
                          <td>{c.invoiceNumber || "-"}</td>
                          <td>{c.submitterEmail || "-"}</td>
                          <td>
                            <span className="status-badge" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                              {cfg.label}
                            </span>
                          </td>
                          <td style={{ fontSize: 13, color: "#666" }}>
                            {new Date(c.createdAt).toLocaleDateString()}
                          </td>
                          <td>
                            <button className="action-btn primary-btn" onClick={() => handleOpenDetails(c.id)}>
                              Process
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", padding: "40px", color: "#999" }}>
                        No claims match the filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedClaim && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eee", paddingBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>Claim Process Details (ID: #{selectedClaim.id})</h3>
              <button onClick={() => setSelectedClaim(null)} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#999" }}>&times;</button>
            </div>

            {actionError && (
              <div style={{ background: "#fff5f5", color: "#f03e3e", padding: 12, borderRadius: 8, fontSize: 13, border: "1px solid #ffe3e3", marginTop: 16 }}>
                {actionError}
              </div>
            )}

            <div className="modal-grid">
              <div>
                <div className="detail-box">
                  <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <div className="detail-label">Customer Name</div>
                      <div className="detail-value">{selectedClaim.customerName || "-"}</div>
                    </div>
                    <div>
                      <div className="detail-label">Submitter Email</div>
                      <div className="detail-value">{selectedClaim.submitterEmail || "-"}</div>
                    </div>
                    <div>
                      <div className="detail-label">Invoice Number</div>
                      <div className="detail-value">{selectedClaim.invoiceNumber || "-"}</div>
                    </div>
                    <div>
                      <div className="detail-label">Product Details</div>
                      <div className="detail-value">{selectedClaim.productDetails || "-"}</div>
                    </div>
                    <div>
                      <div className="detail-label">Barcode</div>
                      <div className="detail-value">{selectedClaim.barcode || "-"}</div>
                    </div>
                    <div>
                      <div className="detail-label">Serial Number</div>
                      <div className="detail-value" style={{ fontFamily: "monospace" }}>{selectedClaim.productSerialNumber || "-"}</div>
                    </div>
                    <div>
                      <div className="detail-label">Warranty Period</div>
                      <div className="detail-value">
                        {selectedClaim.warrantyStartDate && selectedClaim.warrantyEndDate 
                          ? `${selectedClaim.warrantyStartDate} to ${selectedClaim.warrantyEndDate}`
                          : "-"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="detail-box">
                  <div className="detail-label">Issue Description</div>
                  <div className="detail-value" style={{ whiteSpace: "pre-wrap", fontWeight: 400 }}>
                    {selectedClaim.issueDescription || "No description provided."}
                  </div>
                </div>

                {selectedClaim.photoBase64 && (
                  <div className="detail-box">
                    <div className="detail-label" style={{ marginBottom: "8px" }}>Battery Photo</div>
                    <img 
                      src={getClaimImageSrc(selectedClaim.photoBase64)} 
                      alt="Battery Issue" 
                      className="claim-image"
                      onClick={() => {
                        const win = window.open();
                        win.document.write(`<iframe src="${getClaimImageSrc(selectedClaim.photoBase64)}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                      }}
                      style={{ cursor: "pointer" }}
                      title="Click to view full size"
                    />
                  </div>
                )}

                {/* Status-specific action buttons */}
                <div style={{ marginTop: "24px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  {modalLoading ? (
                    <div>Processing transaction...</div>
                  ) : (
                    <>
                      {selectedClaim.status === "request_created" && !showRejectForm && (
                        <>
                          <button className="maint-btn" onClick={() => handleWorkflowAction("approve")}>
                            Approve Claim
                          </button>
                          <button className="action-btn" style={{ color: "#ff3b5c", borderColor: "#ff3b5c" }} onClick={() => setShowRejectForm(true)}>
                            Reject Claim
                          </button>
                        </>
                      )}

                      {showRejectForm && (
                        <div style={{ width: "100%", background: "#fef2f2", padding: "16px", borderRadius: "12px", border: "1px solid #fecaca" }}>
                          <div className="form-group">
                            <label style={{ fontWeight: 600, color: "#991b1b" }}>Reason for Rejection</label>
                            <textarea
                              rows={3}
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder="Please explain why the warranty claim is rejected..."
                              required
                            />
                          </div>
                          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                            <button className="action-btn" type="button" onClick={() => setShowRejectForm(false)}>Cancel</button>
                            <button 
                              className="maint-btn" 
                              style={{ background: "#dc2626" }}
                              type="button"
                              onClick={() => handleWorkflowAction("reject", "PUT", { rejectReason })}
                            >
                              Confirm Reject
                            </button>
                          </div>
                        </div>
                      )}

                      {selectedClaim.status === "approved" && (
                        <button className="maint-btn" onClick={() => handleWorkflowAction("receive-product")}>
                          Mark Product Received at Service Center
                        </button>
                      )}

                      {selectedClaim.status === "product_received" && (
                        <button className="maint-btn" onClick={() => handleWorkflowAction("start-processing")}>
                          Start Processing Battery
                        </button>
                      )}

                      {selectedClaim.status === "processing" && (
                        <button className="maint-btn" onClick={() => handleWorkflowAction("complete")}>
                          Complete Repair / Processing
                        </button>
                      )}

                      {selectedClaim.status === "completed" && !showDispatchForm && (
                        <button className="maint-btn" onClick={() => setShowDispatchForm(true)}>
                          Dispatch Product (Courier details)
                        </button>
                      )}

                      {showDispatchForm && (
                        <div style={{ width: "100%", background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                          <h4 style={{ margin: "0 0 12px 0", fontSize: 14 }}>Enter Courier Details</h4>
                          <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                            <div className="form-group">
                              <label>Courier Name</label>
                              <input
                                type="text"
                                value={courierData.courierName}
                                onChange={(e) => setCourierData({ ...courierData, courierName: e.target.value })}
                                placeholder="e.g. DHL, BlueDart"
                                required
                              />
                            </div>
                            <div className="form-group">
                              <label>Tracking Number</label>
                              <input
                                type="text"
                                value={courierData.trackingNumber}
                                onChange={(e) => setCourierData({ ...courierData, trackingNumber: e.target.value })}
                                placeholder="e.g. TRK1234567"
                                required
                              />
                            </div>
                            <div className="form-group full-width">
                              <label>Dispatch Date</label>
                              <input
                                type="date"
                                value={courierData.dispatchDate}
                                onChange={(e) => setCourierData({ ...courierData, dispatchDate: e.target.value })}
                                required
                              />
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                            <button className="action-btn" type="button" onClick={() => setShowDispatchForm(false)}>Cancel</button>
                            <button 
                              className="maint-btn" 
                              type="button"
                              onClick={() => handleWorkflowAction("dispatch", "PUT", courierData)}
                            >
                              Dispatch Repaired Battery
                            </button>
                          </div>
                        </div>
                      )}

                      {selectedClaim.status === "dispatched" && (
                        <button className="maint-btn" onClick={() => handleWorkflowAction("mark-delivered")}>
                          Mark as Delivered to Customer
                        </button>
                      )}

                      {selectedClaim.status === "delivered" && (
                        <div style={{ color: "#000", fontWeight: 600, fontSize: "14px", background: "#f6ffed", border: "1px solid #b7eb8f", padding: "12px 16px", borderRadius: "8px", width: "100%" }}>
                          ✓ Repaired product delivered. Awaiting customer confirmation from mobile app.
                        </div>
                      )}

                      {selectedClaim.status === "rejected" && (
                        <div style={{ color: "#cf1322", fontWeight: 500, fontSize: "14px", background: "#fff2f0", border: "1px solid #ffccc7", padding: "12px 16px", borderRadius: "8px", width: "100%" }}>
                          <strong>Claim Rejected.</strong> Reason: {selectedClaim.rejectReason || "-"}
                        </div>
                      )}

                      {(selectedClaim.status === "closed" || selectedClaim.status === "user_confirmed") && (
                        <div style={{ color: "#52c41a", fontWeight: 600, fontSize: "14px", background: "#f6ffed", border: "1px solid #b7eb8f", padding: "12px 16px", borderRadius: "8px", width: "100%" }}>
                          ✓ This warranty claim is closed and complete.
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Claims Timeline log */}
              <div style={{ borderLeft: "1px solid #eee", paddingLeft: "20px" }}>
                <h4 style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: "600", color: "#333" }}>Claim Logs & Timeline</h4>
                <div className="timeline">
                  <div className="timeline-item">
                    <div className={`timeline-dot ${selectedClaim.createdAt ? "completed" : ""}`} />
                    <div className="timeline-title">Claim Submitted</div>
                    <div className="timeline-time">{formatTimestamp(selectedClaim.createdAt) || "-"}</div>
                  </div>

                  {(selectedClaim.approvedAt || selectedClaim.status === "request_created") && (
                    <div className="timeline-item">
                      <div className={`timeline-dot ${selectedClaim.approvedAt ? "completed" : ""}`} />
                      <div className="timeline-title">Approved by Admin</div>
                      <div className="timeline-time">{formatTimestamp(selectedClaim.approvedAt) || "-"}</div>
                    </div>
                  )}

                  {selectedClaim.rejectedAt && (
                    <div className="timeline-item">
                      <div className="timeline-dot completed" style={{ backgroundColor: "#ef4444" }} />
                      <div className="timeline-title" style={{ color: "#ef4444" }}>Claim Rejected</div>
                      <div className="timeline-time">{formatTimestamp(selectedClaim.rejectedAt)}</div>
                    </div>
                  )}

                  {!selectedClaim.rejectedAt && (
                    <>
                      <div className="timeline-item">
                        <div className={`timeline-dot ${selectedClaim.productReceivedAt ? "completed" : ""}`} />
                        <div className="timeline-title">Received at Service Center</div>
                        <div className="timeline-time">{formatTimestamp(selectedClaim.productReceivedAt) || "-"}</div>
                      </div>

                      <div className="timeline-item">
                        <div className={`timeline-dot ${selectedClaim.processingStartedAt ? "completed" : ""}`} />
                        <div className="timeline-title">Processing / Repair Started</div>
                        <div className="timeline-time">{formatTimestamp(selectedClaim.processingStartedAt) || "-"}</div>
                      </div>

                      <div className="timeline-item">
                        <div className={`timeline-dot ${selectedClaim.completedAt ? "completed" : ""}`} />
                        <div className="timeline-title">Repair Completed</div>
                        <div className="timeline-time">{formatTimestamp(selectedClaim.completedAt) || "-"}</div>
                      </div>

                      <div className="timeline-item">
                        <div className={`timeline-dot ${selectedClaim.dispatchedAt ? "completed" : ""}`} />
                        <div className="timeline-title">Dispatched to Customer</div>
                        <div className="timeline-time">
                          {formatTimestamp(selectedClaim.dispatchedAt) || "-"}
                          {selectedClaim.courierName && (
                            <div style={{ fontSize: "11px", color: "#666", marginTop: "4px", background: "#f1f1f1", padding: "4px 8px", borderRadius: "4px" }}>
                              <strong>Courier:</strong> {selectedClaim.courierName}<br/>
                              <strong>Tracking:</strong> {selectedClaim.trackingNumber}<br/>
                              <strong>Date:</strong> {selectedClaim.dispatchDate}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="timeline-item">
                        <div className={`timeline-dot ${selectedClaim.deliveredAt ? "completed" : ""}`} />
                        <div className="timeline-title">Delivered</div>
                        <div className="timeline-time">{formatTimestamp(selectedClaim.deliveredAt) || "-"}</div>
                      </div>

                      <div className="timeline-item">
                        <div className={`timeline-dot ${selectedClaim.closedAt ? "completed" : ""}`} />
                        <div className="timeline-title">Closed</div>
                        <div className="timeline-time">{formatTimestamp(selectedClaim.closedAt) || "-"}</div>
                      </div>
                    </>
                  )}
                </div>

                {/* Process Duration Card */}
                {(() => {
                  const startDateTime = selectedClaim.createdAt;
                  const isTerminal = ["closed", "user_confirmed", "rejected"].includes(selectedClaim.status);
                  const closeDateTime = isTerminal 
                    ? (selectedClaim.status === "rejected" ? selectedClaim.rejectedAt : selectedClaim.closedAt)
                    : null;
                  
                  return (
                    <div className="detail-box" style={{ marginTop: "24px", marginBottom: 0 }}>
                      <h4 style={{ margin: "0 0 12px 0", fontSize: "13px", fontWeight: "600", color: "#333", textTransform: "uppercase", letterSpacing: "0.5px" }}>Process Duration Metrics</h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div>
                          <div className="detail-label">Process Start Date & Time</div>
                          <div className="detail-value">{formatTimestamp(startDateTime) || "-"}</div>
                        </div>
                        <div>
                          <div className="detail-label">Process Close Date & Time</div>
                          <div className="detail-value" style={{ color: isTerminal ? "#111" : "#D97706", fontWeight: isTerminal ? "500" : "600" }}>
                            {isTerminal ? (formatTimestamp(closeDateTime) || "-") : "In Progress"}
                          </div>
                        </div>
                        <div style={{ borderTop: "1px solid #eef0f2", paddingTop: "10px" }}>
                          <div className="detail-label">Total Processing Time</div>
                          <div style={{ fontSize: "15px", fontWeight: "700", color: isTerminal ? "#059669" : "#D97706" }}>
                            {isTerminal ? getProcessingTime(startDateTime, closeDateTime) : "In Progress"}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
