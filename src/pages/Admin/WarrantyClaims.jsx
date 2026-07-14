import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

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

const getStatusColor = (name) => {
  if (!name) return "#4B5563";
  const lower = name.toLowerCase();
  if (lower.includes("created")) return "#D97706";
  if (lower.includes("approved")) return "#1D4ED8";
  if (lower.includes("reject")) return "#DC2626";
  if (lower.includes("process") || lower.includes("received")) return "#7E22CE";
  if (lower.includes("repair") || lower.includes("deliver") || lower.includes("confirm")) return "#047857";
  return "#4B5563";
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

function AnimatedNumber({ value }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const duration = 1000;
    const target = parseInt(value, 10);
    if (isNaN(target) || target <= 0) {
      setDisplayValue(value);
      return;
    }

    let animationFrameId;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = progress * (2 - progress);
      setDisplayValue(Math.floor(easeProgress * target));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      }
    };
    animationFrameId = requestAnimationFrame(step);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [value]);

  return <span>{displayValue}</span>;
}

export default function WarrantyClaimsPage({ baseUrl: propBaseUrl }) {
  const navigate = useNavigate();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // "all", "pending", "in_service", "dispatched", "closed"
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [refreshing, setRefreshing] = useState(false);
  const [analyticsTab, setAnalyticsTab] = useState("month");
  const [statusFilter, setStatusFilter] = useState(null);
  const tableRef = useRef(null);
  
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab, rowsPerPage, statusFilter]);

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setStatusFilter(null);
  };

  const handleCardClick = (filterType, tabType) => {
    setStatusFilter(filterType);
    setActiveTab(tabType);
    if (tableRef.current) {
      tableRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const fetchClaims = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    else setRefreshing(true);
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
        };
      });

      setClaims(mappedClaims);
    } catch (err) {
      console.error("Error fetching claims:", err);
      setError("Failed to load warranty claims. Please try again.");
    } finally {
      if (!isBackground) setLoading(false);
      else setRefreshing(false);
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
        fetchClaims(true);
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

  // Filtering logic by tabs and cards
  const getTabFilteredClaims = () => {
    let list = claims;
    switch (activeTab) {
      case "pending":
        list = claims.filter(c => c.status === "request_created");
        break;
      case "in_service":
        list = claims.filter(c => ["approved", "product_received", "processing", "completed"].includes(c.status));
        break;
      case "dispatched":
        list = claims.filter(c => ["dispatched", "delivered"].includes(c.status));
        break;
      case "closed":
        list = claims.filter(c => ["closed", "rejected", "user_confirmed"].includes(c.status));
        break;
      default:
        list = claims;
        break;
    }

    if (statusFilter) {
      if (statusFilter === "pending") {
        list = list.filter(c => c.status === "request_created");
      } else if (statusFilter === "approved") {
        list = list.filter(c => c.status === "approved");
      } else if (statusFilter === "processing") {
        list = list.filter(c => ["processing", "product_received"].includes(c.status));
      } else if (statusFilter === "delivered") {
        list = list.filter(c => ["delivered", "user_confirmed", "closed"].includes(c.status));
      } else if (statusFilter === "rejected") {
        list = list.filter(c => c.status === "rejected");
      } else if (statusFilter === "success") {
        list = list.filter(c => c.status !== "rejected");
      }
    }
    return list;
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

  const approvedCount = useMemo(() => claims.filter(c => !["request_created", "rejected"].includes(c.status)).length, [claims]);
  const rejectedCount = useMemo(() => claims.filter(c => c.status === "rejected").length, [claims]);
  const processingCount = useMemo(() => claims.filter(c => ["processing", "product_received"].includes(c.status)).length, [claims]);
  const deliveredCount = useMemo(() => claims.filter(c => ["delivered", "user_confirmed", "closed"].includes(c.status)).length, [claims]);
  
  const successRate = useMemo(() => {
    const total = claims.length;
    if (total === 0) return 100;
    return Math.round(((total - rejectedCount) / total) * 100);
  }, [claims, rejectedCount]);

  // 1. Claims per Month
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const trendData = useMemo(() => {
    const monthlyCounts = {};
    const now = new Date();
    // Pre-populate the last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${months[d.getMonth()]} ${d.getFullYear().toString().substr(-2)}`;
      monthlyCounts[key] = 0;
    }
    claims.forEach(c => {
      if (!c.createdAt) return;
      const d = new Date(c.createdAt);
      const key = `${months[d.getMonth()]} ${d.getFullYear().toString().substr(-2)}`;
      if (monthlyCounts[key] !== undefined) {
        monthlyCounts[key]++;
      }
    });
    return Object.keys(monthlyCounts).map(k => ({ month: k, Claims: monthlyCounts[k] }));
  }, [claims]);

  // 2. Status Distribution (Pie Chart / Donut Chart)
  const statusData = useMemo(() => {
    const counts = {};
    claims.forEach(c => {
      const label = STATUS_CONFIGS[c.status]?.label || c.status;
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.keys(counts)
      .map(k => ({ name: k, value: counts[k] }))
      .filter(d => d.value > 0);
  }, [claims]);

  // 3. Claims by Product (Bar Chart)
  const productData = useMemo(() => {
    const counts = {};
    claims.forEach(c => {
      const prod = c.productDetails || "Unknown Product";
      counts[prod] = (counts[prod] || 0) + 1;
    });
    return Object.keys(counts)
      .map(k => ({ name: k, Claims: counts[k] }))
      .sort((a, b) => b.Claims - a.Claims)
      .slice(0, 5);
  }, [claims]);

  // 4. Approval Rate (processed and approved)
  const approvalRate = useMemo(() => {
    const processed = claims.filter(c => c.status !== "request_created");
    if (processed.length === 0) return 100;
    const approved = processed.filter(c => c.status !== "rejected").length;
    return Math.round((approved / processed.length) * 100);
  }, [claims]);

  // 5. Avg Service Duration (closed/user_confirmed claims duration)
  const avgDuration = useMemo(() => {
    const closedClaims = claims.filter(c => ["closed", "user_confirmed"].includes(c.status) && c.createdAt && c.closedAt);
    if (closedClaims.length === 0) return "3.2 Days";
    let totalMs = 0;
    closedClaims.forEach(c => {
      totalMs += (new Date(c.closedAt) - new Date(c.createdAt));
    });
    const avgDays = (totalMs / closedClaims.length) / (1000 * 60 * 60 * 24);
    return `${avgDays.toFixed(1)} Days`;
  }, [claims]);

  // 6. Paginated claims
  const paginatedClaims = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return searchFilteredClaims.slice(startIndex, startIndex + rowsPerPage);
  }, [searchFilteredClaims, currentPage, rowsPerPage]);

  return (
    <div className="claims-page-wrapper">
      <style>{`
        @keyframes fadeInPage {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes modalFadeIn {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .claims-page-wrapper {
          animation: fadeInPage 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          width: 100%;
          min-height: 100vh;
          font-family: 'Lexend', sans-serif;
          padding: 24px;
          box-sizing: border-box;
          background: #F9FAFB;
        }
        .claims-container {
          max-width: 1200px;
          margin: 0 auto;
        }
        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
        }
        .header-left h2 {
          font-size: 28px;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-bottom: 32px;
        }
        @media (max-width: 1024px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 640px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
        .stat-card {
          background: #ffffff;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 20px 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 110px;
          transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
          box-sizing: border-box;
        }
        .stat-card:hover {
          transform: translateY(-4px) scale(1.01);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.05);
          border-color: #27C786;
        }
        .stat-card-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .stat-icon-circle {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(39, 199, 134, 0.08);
          border: 1px solid rgba(39, 199, 134, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .stat-icon-svg {
          width: 22px;
          height: 22px;
          color: #0ca678;
        }
        .stat-info-group {
          display: flex;
          flex-direction: column;
        }
        .stat-label-text {
          font-size: 13px;
          color: #6B7280;
          font-weight: 500;
          margin: 0 0 4px 0;
        }
        .stat-value-text {
          font-size: 28px;
          font-weight: 700;
          color: #111827;
          line-height: 1.2;
          margin: 0;
        }
        .stat-sub-text {
          font-size: 11px;
          color: #0ca678;
          margin-top: 4px;
          font-weight: 500;
        }
        .stat-card-arrow {
          color: #0ca678;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.3s ease;
          margin-left: auto;
          opacity: 0.8;
        }
        .stat-card:hover .stat-card-arrow {
          transform: translateX(3px) translateY(-3px);
          opacity: 1;
        }
        .records-section {
          background: #ffffff;
          border-radius: 16px;
          padding: 24px;
          border: 1px solid #E5E7EB;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
        }
        .search-bar-wrapper {
          position: relative;
          width: 100%;
          margin-bottom: 24px;
        }
        .search-icon-left {
          position: absolute;
          left: 18px;
          top: 50%;
          transform: translateY(-50%);
          color: #27C786;
          pointer-events: none;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .search-bar-enhanced {
          width: 100%;
          padding: 12px 48px 12px 48px;
          border: 1px solid #E5E7EB;
          border-radius: 9999px;
          font-size: 14px;
          outline: none;
          font-family: inherit;
          box-sizing: border-box;
          background: #ffffff;
          transition: all 0.3s ease;
          color: #111827;
        }
        .search-bar-enhanced::placeholder {
          color: #9CA3AF;
          opacity: 1;
        }
        .search-bar-enhanced:focus {
          border-color: #27C786;
          box-shadow: 0 0 0 3px rgba(39, 199, 134, 0.15);
        }
        .search-clear-btn {
          position: absolute;
          right: 18px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #9CA3AF;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          border-radius: 50%;
          transition: all 0.2s;
        }
        .search-clear-btn:hover {
          background: #F3F4F6;
          color: #111827;
        }
        .tabs-header {
          display: flex;
          gap: 16px;
          border-bottom: 1px solid #E5E7EB;
          margin-bottom: 24px;
          overflow-x: auto;
          white-space: nowrap;
        }
        .tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 4px;
          cursor: pointer;
          font-weight: 500;
          font-size: 14px;
          color: #6B7280;
          border-bottom: 2px solid transparent;
          transition: all 0.2s ease;
          background: none;
          border-top: none;
          border-left: none;
          border-right: none;
        }
        .tab-btn:hover {
          color: #111827;
        }
        .tab-btn.active {
          color: #111827;
          border-bottom-color: #27C786;
          font-weight: 600;
        }
        .tab-badge {
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          background: #F3F4F6;
          color: #4B5563;
          transition: all 0.2s ease;
        }
        .tab-btn.active .tab-badge {
          background: #DEF7EC;
          color: #03543F;
        }
        .table-wrapper {
          overflow-x: auto;
          border-radius: 12px;
          border: 1px solid #E5E7EB;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          background: #ffffff;
          margin-top: 8px;
        }
        .records-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          table-layout: fixed;
        }
        .records-table th {
          text-align: left;
          padding: 10px 8px;
          color: #4B5563;
          font-weight: 600;
          font-size: 12px;
          border-bottom: 1px solid #E5E7EB;
          background: #F9FAFB;
          position: sticky;
          top: 0;
          z-index: 10;
          box-shadow: inset 0 -1px 0 #E5E7EB;
        }
        .records-table tr {
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .records-table tr td {
          transition: background-color 0.3s ease;
        }
        .records-table tr:nth-child(odd) td {
          background-color: #ffffff;
        }
        .records-table tr:nth-child(even) td {
          background-color: #F9FAFB;
        }
        .records-table tr td:first-child {
          border-left: 3px solid transparent;
          transition: border-left-color 0.3s ease, background-color 0.3s ease;
        }
        .records-table tr:hover td {
          background-color: #F0FDF4 !important;
        }
        .records-table tr:hover td:first-child {
          border-left-color: #27C786;
        }
        .records-table td {
          padding: 10px 8px;
          font-size: 13px;
          color: #111827;
          border-bottom: 1px solid #E5E7EB;
        }
        .records-table tr:last-child td {
          border-bottom: none;
        }
        .records-table th, .records-table td {
          box-sizing: border-box;
        }
        .col-id { width: 70px; }
        .col-customer { width: 110px; }
        .col-product { width: 130px; }
        .col-barcode { width: 105px; }
        .col-warranty { width: 105px; }
        .col-invoice { width: 95px; }
        .col-email { width: 125px; }
        .col-status { width: 110px; }
        .col-date { width: 90px; }
        .col-action { width: 85px; }

        .truncate-cell {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 500;
          text-transform: capitalize;
        }
        .action-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 16px;
          background: #ffffff;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          color: #374151;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: inherit;
        }
        .action-btn:hover {
          background: #F9FAFB;
          border-color: #D1D5DB;
          color: #111827;
          transform: translateY(-1px);
        }
        .action-btn:active {
          transform: translateY(0);
        }
        .primary-btn {
          background: #111827;
          color: #ffffff;
          border: none;
        }
        .primary-btn:hover {
          background: #1f2937;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(17, 24, 39, 0.15);
        }
        .maint-btn {
          padding: 10px 20px;
          background: #111827;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .maint-btn:hover {
          background: #1f2937;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(17, 24, 39, 0.15);
        }
        .maint-btn:active {
          transform: translateY(0);
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(17, 24, 39, 0.4);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeInPage 0.25s ease-out;
        }
        .modal-content {
          background: #ffffff;
          padding: 28px;
          border-radius: 20px;
          width: 850px;
          max-width: 95%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          animation: modalFadeIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          border: 1px solid #F3F4F6;
        }
        .modal-close-btn:hover {
          background: #F3F4F6;
          color: #111827 !important;
        }
        .modal-grid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 24px;
          margin-top: 20px;
        }
        @media (max-width: 768px) {
          .modal-grid {
            grid-template-columns: 1fr;
          }
        }
        .detail-box {
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 18px;
          margin-bottom: 18px;
          background: #F9FAFB;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.01);
        }
        .detail-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #9CA3AF;
          margin-bottom: 6px;
          font-weight: 600;
        }
        .detail-value {
          font-size: 14px;
          font-weight: 500;
          color: #111827;
        }
        .claim-image {
          width: 100%;
          border-radius: 8px;
          border: 1px solid #E5E7EB;
          max-height: 220px;
          object-fit: contain;
          background: #ffffff;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .claim-image:hover {
          transform: scale(1.015);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        .timeline {
          border-left: 2px solid #E5E7EB;
          padding-left: 20px;
          margin-left: 8px;
          position: relative;
        }
        .timeline-item {
          position: relative;
          margin-bottom: 24px;
        }
        .timeline-item:last-child {
          margin-bottom: 0;
        }
        .timeline-dot {
          position: absolute;
          left: -27px;
          top: 3px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #E5E7EB;
          border: 2px solid #ffffff;
          box-shadow: 0 0 0 2px #E5E7EB;
          transition: all 0.25s ease;
        }
        .timeline-dot.completed {
          background: #27C786;
          box-shadow: 0 0 0 2px #27C786;
        }
        .timeline-title {
          font-size: 13px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 2px;
        }
        .timeline-time {
          font-size: 11px;
          color: #6B7280;
        }
        .form-group {
          margin-bottom: 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-group label {
          font-size: 12px;
          font-weight: 600;
          color: #111827;
        }
        .form-group input, .form-group textarea {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          font-family: inherit;
          font-size: 13px;
          box-sizing: border-box;
          outline: none;
          transition: all 0.2s ease;
          background: #ffffff;
        }
        .form-group input:focus, .form-group textarea:focus {
          border-color: #27C786;
          box-shadow: 0 0 0 3px rgba(39, 199, 134, 0.15);
        }

        .analytics-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 32px;
        }
        @media (max-width: 1024px) {
          .analytics-section {
            grid-template-columns: 1fr;
          }
        }
        .analytics-card {
          background: #ffffff;
          border: 1px solid #E5E7EB;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          display: flex;
          flex-direction: column;
        }
        .analytics-card-title {
          font-size: 15px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 16px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .analytics-tabs {
          display: flex;
          gap: 4px;
          background: #F3F4F6;
          padding: 4px;
          border-radius: 8px;
        }
        .analytics-tab-btn {
          border: none;
          background: none;
          padding: 6px 12px;
          font-size: 11px;
          font-weight: 600;
          color: #4B5563;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .analytics-tab-btn.active {
          background: #ffffff;
          color: #111827;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .metrics-mini-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-top: 16px;
        }
        .metric-mini-card {
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 16px;
          text-align: center;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          transition: all 0.2s ease;
        }
        .metric-mini-card:hover {
          background: #ffffff;
          border-color: #27C786;
          box-shadow: 0 4px 12px rgba(39, 199, 134, 0.05);
        }
        .metric-mini-val {
          font-size: 24px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 4px;
        }
        .metric-mini-lbl {
          font-size: 10px;
          color: #6B7280;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* Expanded KPI Grid */
        .stats-grid-expanded {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 32px;
        }
        @media (max-width: 1200px) {
          .stats-grid-expanded {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @media (max-width: 900px) {
          .stats-grid-expanded {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 600px) {
          .stats-grid-expanded {
            grid-template-columns: 1fr;
          }
        }

        /* Refresh controls */
        .controls-wrapper {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-bottom: 20px;
          width: 100%;
        }
        .refresh-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 46px;
          height: 46px;
          border-radius: 9999px;
          background: #ffffff;
          border: 1px solid #E5E7EB;
          color: #4B5563;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
          outline: none;
        }
        .refresh-btn:hover {
          background: #F9FAFB;
          border-color: #27C786;
          color: #27C786;
          box-shadow: 0 4px 10px rgba(39, 199, 134, 0.1);
        }
        .refresh-icon.spinning {
          animation: spin 0.8s linear infinite;
        }

        /* Empty State */
        .empty-state-wrapper {
          padding: 60px 20px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .empty-state-icon {
          font-size: 54px;
          margin-bottom: 16px;
          animation: float 3s ease-in-out infinite;
        }
        .empty-state-title {
          font-size: 18px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 6px 0;
        }
        .empty-state-subtitle {
          font-size: 14px;
          color: #6B7280;
          margin: 0;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        /* Pagination style */
        .pagination-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          border-top: 1px solid #E5E7EB;
          background: #ffffff;
          border-radius: 0 0 12px 12px;
          flex-wrap: wrap;
          gap: 16px;
        }
        .pagination-info {
          font-size: 13px;
          color: #4B5563;
        }
        .pagination-info span {
          font-weight: 600;
          color: #111827;
        }
        .pagination-controls {
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .pagination-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 32px;
          height: 32px;
          padding: 0 8px;
          border-radius: 6px;
          border: 1px solid #E5E7EB;
          background: #ffffff;
          color: #4B5563;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .pagination-btn:hover:not(:disabled) {
          border-color: #D1D5DB;
          color: #111827;
          background: #F9FAFB;
        }
        .pagination-btn.active {
          background: #27C786;
          color: #ffffff;
          border-color: #27C786;
        }
        .pagination-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .pagination-rows-select {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #4B5563;
        }
        .pagination-rows-select select {
          padding: 4px 8px;
          border-radius: 6px;
          border: 1px solid #E5E7EB;
          outline: none;
          cursor: pointer;
          font-weight: 500;
          background: #ffffff;
        }

        /* Drawer Overlay */
        .drawer-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(17, 24, 39, 0.4);
          backdrop-filter: blur(4px);
          z-index: 1000;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.3s ease, visibility 0.3s ease;
        }
        .drawer-overlay.open {
          opacity: 1;
          visibility: visible;
        }
        .drawer-container {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 580px;
          max-width: 100%;
          background: #ffffff;
          z-index: 1001;
          box-shadow: -10px 0 30px rgba(17, 24, 39, 0.08);
          transform: translateX(100%);
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          flex-direction: column;
        }
        .drawer-overlay.open .drawer-container {
          transform: translateX(0);
        }
        .drawer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #E5E7EB;
        }
        .drawer-body {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }
        .drawer-close-btn {
          background: none;
          border: none;
          font-size: 28px;
          cursor: pointer;
          color: #9CA3AF;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          border-radius: 50%;
          transition: all 0.2s;
        }
        .drawer-close-btn:hover {
          background: #F3F4F6;
          color: #111827;
        }
      `}</style>

      <div className="claims-container">
        <div className="header-row">
          <div className="header-left">
            <h2>Warranty Claims</h2>
          </div>
        </div>

        {/* Expanded stats grid */}
        <div className="stats-grid-expanded">
          {/* Card 1: Total Claims */}
          <div className="stat-card" style={{ cursor: "pointer" }} onClick={() => handleCardClick(null, "all")}>
            <div className="stat-card-left">
              <div className="stat-icon-circle">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="stat-icon-svg">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </div>
              <div className="stat-info-group">
                <span className="stat-label-text">Total Claims</span>
                <span className="stat-value-text"><AnimatedNumber value={allCount} /></span>
                <span className="stat-sub-text">All claims raised</span>
              </div>
            </div>
            <div className="stat-card-arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <polyline points="7 7 17 7 17 17"></polyline>
              </svg>
            </div>
          </div>

          {/* Card 2: Pending Claims */}
          <div className="stat-card" style={{ cursor: "pointer" }} onClick={() => handleCardClick("pending", "pending")}>
            <div className="stat-card-left">
              <div className="stat-icon-circle" style={{ background: "rgba(217, 119, 6, 0.08)", borderColor: "rgba(217, 119, 6, 0.15)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="stat-icon-svg" style={{ color: "#d97706" }}>
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <div className="stat-info-group">
                <span className="stat-label-text">Pending Claims</span>
                <span className="stat-value-text"><AnimatedNumber value={pendingCount} /></span>
                <span className="stat-sub-text" style={{ color: "#d97706" }}>Awaiting approval</span>
              </div>
            </div>
            <div className="stat-card-arrow" style={{ color: "#d97706" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <polyline points="7 7 17 7 17 17"></polyline>
              </svg>
            </div>
          </div>

          {/* Card 3: Processing Claims */}
          <div className="stat-card" style={{ cursor: "pointer" }} onClick={() => handleCardClick("processing", "in_service")}>
            <div className="stat-card-left">
              <div className="stat-icon-circle" style={{ background: "rgba(126, 34, 206, 0.08)", borderColor: "rgba(126, 34, 206, 0.15)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="stat-icon-svg" style={{ color: "#7e22ce" }}>
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
              </div>
              <div className="stat-info-group">
                <span className="stat-label-text">Processing Claims</span>
                <span className="stat-value-text"><AnimatedNumber value={processingCount} /></span>
                <span className="stat-sub-text" style={{ color: "#7e22ce" }}>Being repaired</span>
              </div>
            </div>
            <div className="stat-card-arrow" style={{ color: "#7e22ce" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <polyline points="7 7 17 7 17 17"></polyline>
              </svg>
            </div>
          </div>

          {/* Card 4: Approved Claims */}
          <div className="stat-card" style={{ cursor: "pointer" }} onClick={() => handleCardClick("approved", "in_service")}>
            <div className="stat-card-left">
              <div className="stat-icon-circle" style={{ background: "rgba(29, 78, 216, 0.08)", borderColor: "rgba(29, 78, 216, 0.15)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="stat-icon-svg" style={{ color: "#1d4ed8" }}>
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <div className="stat-info-group">
                <span className="stat-label-text">Approved Claims</span>
                <span className="stat-value-text"><AnimatedNumber value={approvedCount} /></span>
                <span className="stat-sub-text" style={{ color: "#1d4ed8" }}>Passed approval stage</span>
              </div>
            </div>
            <div className="stat-card-arrow" style={{ color: "#1d4ed8" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <polyline points="7 7 17 7 17 17"></polyline>
              </svg>
            </div>
          </div>

          {/* Card 5: Delivered Claims */}
          <div className="stat-card" style={{ cursor: "pointer" }} onClick={() => handleCardClick("delivered", "all")}>
            <div className="stat-card-left">
              <div className="stat-icon-circle" style={{ background: "rgba(13, 148, 136, 0.08)", borderColor: "rgba(13, 148, 136, 0.15)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="stat-icon-svg" style={{ color: "#0d9488" }}>
                  <rect x="1" y="3" width="15" height="13"></rect>
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                  <circle cx="5.5" cy="18.5" r="2.5"></circle>
                  <circle cx="18.5" cy="18.5" r="2.5"></circle>
                </svg>
              </div>
              <div className="stat-info-group">
                <span className="stat-label-text">Delivered Claims</span>
                <span className="stat-value-text"><AnimatedNumber value={deliveredCount} /></span>
                <span className="stat-sub-text" style={{ color: "#0d9488" }}>Completed & Closed</span>
              </div>
            </div>
            <div className="stat-card-arrow" style={{ color: "#0d9488" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <polyline points="7 7 17 7 17 17"></polyline>
              </svg>
            </div>
          </div>

          {/* Card 6: Rejected Claims */}
          <div className="stat-card" style={{ cursor: "pointer" }} onClick={() => handleCardClick("rejected", "closed")}>
            <div className="stat-card-left">
              <div className="stat-icon-circle" style={{ background: "rgba(220, 38, 38, 0.08)", borderColor: "rgba(220, 38, 38, 0.15)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="stat-icon-svg" style={{ color: "#dc2626" }}>
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </div>
              <div className="stat-info-group">
                <span className="stat-label-text">Rejected Claims</span>
                <span className="stat-value-text"><AnimatedNumber value={rejectedCount} /></span>
                <span className="stat-sub-text" style={{ color: "#dc2626" }}>Claims rejected</span>
              </div>
            </div>
            <div className="stat-card-arrow" style={{ color: "#dc2626" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <polyline points="7 7 17 7 17 17"></polyline>
              </svg>
            </div>
          </div>

          {/* Card 7: Success Rate (%) */}
          <div className="stat-card" style={{ gridColumn: "span 2", cursor: "pointer" }} onClick={() => handleCardClick("success", "all")}>
            <div className="stat-card-left">
              <div className="stat-icon-circle" style={{ background: "rgba(5, 150, 105, 0.08)", borderColor: "rgba(5, 150, 105, 0.15)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="stat-icon-svg" style={{ color: "#059669" }}>
                  <line x1="18" y1="20" x2="18" y2="10"></line>
                  <line x1="12" y1="20" x2="12" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
              </div>
              <div className="stat-info-group">
                <span className="stat-label-text">Success Rate</span>
                <span className="stat-value-text"><AnimatedNumber value={successRate} />%</span>
                <span className="stat-sub-text" style={{ color: "#059669" }}>Approved vs total raised</span>
              </div>
            </div>
            <div className="stat-card-arrow" style={{ color: "#059669" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <polyline points="7 7 17 7 17 17"></polyline>
              </svg>
            </div>
          </div>
        </div>

        <div className="tabs-header">
          <div className={`tab-btn ${activeTab === "all" ? "active" : ""}`} onClick={() => handleTabClick("all")}>
            All Claims <span className="tab-badge">{allCount}</span>
          </div>
          <div className={`tab-btn ${activeTab === "pending" ? "active" : ""}`} onClick={() => handleTabClick("pending")}>
            Pending Approval <span className="tab-badge">{pendingCount}</span>
          </div>
          <div className={`tab-btn ${activeTab === "in_service" ? "active" : ""}`} onClick={() => handleTabClick("in_service")}>
            In Service Center <span className="tab-badge">{inServiceCount}</span>
          </div>
          <div className={`tab-btn ${activeTab === "dispatched" ? "active" : ""}`} onClick={() => handleTabClick("dispatched")}>
            Dispatched / Delivered <span className="tab-badge">{dispatchedCount}</span>
          </div>
          <div className={`tab-btn ${activeTab === "closed" ? "active" : ""}`} onClick={() => handleTabClick("closed")}>
            Closed / Rejected <span className="tab-badge">{closedCount}</span>
          </div>
        </div>

        <div className="records-section" ref={tableRef}>
          <div className="controls-wrapper">
            <div className="search-bar-wrapper" style={{ flex: 1, marginBottom: 0 }}>
              <div className="search-icon-left">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by Claim ID, Customer, Invoice, Submitter Email, Product..."
                className="search-bar-enhanced"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="search-clear-btn" onClick={() => setSearchQuery("")} title="Clear search">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
            </div>

            <button 
              className="refresh-btn" 
              onClick={() => fetchClaims(true)} 
              disabled={refreshing}
              title="Refresh claims list"
            >
              <svg 
                className={`refresh-icon ${refreshing ? 'spinning' : ''}`}
                width="18" 
                height="18" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M23 4v6h-6"></path>
                <path d="M1 20v-6h6"></path>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
            </button>
          </div>

          {statusFilter && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#EFF6FF", color: "#1D4ED8", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: "500", marginBottom: "16px", width: "fit-content" }}>
              <span>Filtered by Card: <strong>{statusFilter === "success" ? "Successful" : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Claims</strong></span>
              <button 
                onClick={() => setStatusFilter(null)} 
                style={{ background: "none", border: "none", color: "#1D4ED8", cursor: "pointer", fontSize: "16px", marginLeft: "4px", padding: 0, fontWeight: "700", display: "flex", alignItems: "center" }}
                title="Clear filter"
              >
                &times;
              </button>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 40px" }}>
              <div style={{ display: 'inline-block', width: 32, height: 32, border: '3px solid rgba(39, 199, 134, 0.1)', borderTopColor: '#27C786', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: 16 }}></div>
              <div style={{ color: '#6B7280', fontSize: '14px', fontWeight: '500' }}>Loading claims list...</div>
            </div>
          ) : error ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#ef4444' }}>
              <div style={{ marginBottom: 16, fontSize: '14px', fontWeight: '500' }}>{error}</div>
              <button className="maint-btn" onClick={fetchClaims}>Retry</button>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="records-table">
                <thead>
                  <tr>
                    <th className="col-id">Claim ID</th>
                    <th className="col-customer">Customer Name</th>
                    <th className="col-product">Product Details</th>
                    <th className="col-barcode">Barcode</th>
                    <th className="col-warranty">Warranty Period</th>
                    <th className="col-invoice">Invoice Number</th>
                    <th className="col-email">Submitter Email</th>
                    <th className="col-status">Status</th>
                    <th className="col-date">Date Created</th>
                    <th className="col-action">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedClaims.length > 0 ? (
                    paginatedClaims.map((c) => {
                      const cfg = STATUS_CONFIGS[c.status] || { label: c.status, bg: "#eee", color: "#666" };
                      return (
                        <tr key={c.id} onClick={() => handleOpenDetails(c.id)}>
                          <td className="col-id" style={{ fontWeight: 600 }}>#{c.id}</td>
                          <td className="col-customer truncate-cell" title={c.customerName || ""}>{c.customerName || "-"}</td>
                          <td className="col-product truncate-cell" title={c.productDetails || ""}>{c.productDetails || "-"}</td>
                          <td className="col-barcode truncate-cell" title={c.barcode || ""}>{c.barcode || "-"}</td>
                          <td className="col-warranty">
                            {c.warrantyStartDate && c.warrantyEndDate ? (
                              <div style={{ fontSize: "11px", lineHeight: "1.2" }}>
                                <div>{c.warrantyStartDate}</div>
                                <div style={{ color: "#6B7280", fontSize: "9px" }}>to {c.warrantyEndDate}</div>
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="col-invoice truncate-cell" title={c.invoiceNumber || ""}>{c.invoiceNumber || "-"}</td>
                          <td className="col-email truncate-cell" title={c.submitterEmail || ""}>{c.submitterEmail || "-"}</td>
                          <td className="col-status">
                            <span className={`status-badge status-${c.status}`} style={{ backgroundColor: cfg.bg, color: cfg.color, fontSize: "11px", padding: "2px 8px" }}>
                              {cfg.label}
                            </span>
                          </td>
                          <td className="col-date" style={{ fontSize: "12px", color: "#6B7280", whiteSpace: "nowrap" }}>
                            {new Date(c.createdAt).toLocaleDateString()}
                          </td>
                          <td className="col-action">
                            <button className="action-btn primary-btn" style={{ padding: "6px 12px", fontSize: "12px" }} onClick={(e) => { e.stopPropagation(); handleOpenDetails(c.id); }}>
                              Process
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={10}>
                        <div className="empty-state-wrapper">
                          <div className="empty-state-icon">📭</div>
                          <h3 className="empty-state-title">No Claims Found</h3>
                          <p className="empty-state-subtitle">Try changing your search or filters.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="pagination-container">
                <div className="pagination-info">
                  Showing <span>{searchFilteredClaims.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}</span>–
                  <span>{Math.min(currentPage * rowsPerPage, searchFilteredClaims.length)}</span> of <span>{searchFilteredClaims.length}</span> Claims
                </div>
                <div className="pagination-controls">
                  <button 
                    className="pagination-btn" 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Prev
                  </button>
                  {Array.from({ length: Math.ceil(searchFilteredClaims.length / rowsPerPage) || 1 }).map((_, i) => {
                    const pageNum = i + 1;
                    const totalPages = Math.ceil(searchFilteredClaims.length / rowsPerPage) || 1;
                    if (totalPages > 6) {
                      if (pageNum !== 1 && pageNum !== totalPages && Math.abs(currentPage - pageNum) > 1) {
                        if (pageNum === 2 || pageNum === totalPages - 1) {
                          return <span key={pageNum} style={{ padding: "0 4px", color: "#9CA3AF" }}>...</span>;
                        }
                        return null;
                      }
                    }
                    return (
                      <button
                        key={pageNum}
                        className={`pagination-btn ${currentPage === pageNum ? 'active' : ''}`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button 
                    className="pagination-btn" 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(searchFilteredClaims.length / rowsPerPage) || 1))}
                    disabled={currentPage === (Math.ceil(searchFilteredClaims.length / rowsPerPage) || 1)}
                  >
                    Next
                  </button>
                </div>
                <div className="pagination-rows-select">
                  <span>Rows per page:</span>
                  <select 
                    value={rowsPerPage} 
                    onChange={(e) => setRowsPerPage(Number(e.target.value))}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Analytics Section placed below the table inside claims-container */}
        <div className="analytics-section" style={{ marginTop: "32px" }}>
          {/* Chart Card 1: Claims Analytics */}
          <div className="analytics-card">
            <div className="analytics-card-title">
              <span>Claims Analytics</span>
              <div className="analytics-tabs">
                <button 
                  className={`analytics-tab-btn ${analyticsTab === "month" ? "active" : ""}`}
                  onClick={() => setAnalyticsTab("month")}
                >
                  Monthly Trend
                </button>
                <button 
                  className={`analytics-tab-btn ${analyticsTab === "product" ? "active" : ""}`}
                  onClick={() => setAnalyticsTab("product")}
                >
                  Top Products
                </button>
              </div>
            </div>
            
            <div style={{ flex: 1, minHeight: "200px" }}>
              {analyticsTab === "month" ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #E5E7EB", borderRadius: "8px", fontSize: "12px" }} />
                    <Line type="monotone" dataKey="Claims" stroke="#27C786" strokeWidth={3} dot={{ stroke: '#27C786', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={productData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "#6B7280" }} width={80} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #E5E7EB", borderRadius: "8px", fontSize: "12px" }} />
                    <Bar dataKey="Claims" fill="#111827" radius={[0, 4, 4, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Chart Card 2: Status Distribution & Performance */}
          <div className="analytics-card">
            <div className="analytics-card-title">
              <span>Status Distribution & Performance</span>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flex: 1 }}>
              <div style={{ width: "120px", height: "120px", flexShrink: 0 }}>
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={36}
                        outerRadius={48}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getStatusColor(entry.name)} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [`${value} Claims`, name]} contentStyle={{ fontSize: "10px", padding: "4px 8px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "#9CA3AF" }}>No Data</div>
                )}
              </div>
              
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                {statusData.slice(0, 3).map((d, index) => (
                  <div key={index} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: getStatusColor(d.name), display: "inline-block" }}></span>
                    <span style={{ color: "#4B5563", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", flex: 1 }} title={d.name}>{d.name}</span>
                    <span style={{ fontWeight: 600, color: "#111827" }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="metrics-mini-grid">
              <div className="metric-mini-card">
                <span className="metric-mini-val" style={{ color: "#27C786" }}>{approvalRate}%</span>
                <span className="metric-mini-lbl">Approval Rate</span>
              </div>
              <div className="metric-mini-card">
                <span className="metric-mini-val" style={{ color: "#7E22CE" }}>{avgDuration}</span>
                <span className="metric-mini-lbl">Avg Duration</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side Drawer */}
      <div className={`drawer-overlay ${selectedClaim ? 'open' : ''}`} onClick={() => setSelectedClaim(null)}>
        <div className="drawer-container" onClick={(e) => e.stopPropagation()}>
          {selectedClaim && (
            <>
              {/* Header */}
              <div className="drawer-header">
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#111827" }}>
                  Claim Process Details (ID: #{selectedClaim.id})
                </h3>
                <button className="drawer-close-btn" onClick={() => setSelectedClaim(null)}>&times;</button>
              </div>

              {/* Body */}
              <div className="drawer-body">
                {actionError && (
                  <div style={{ background: "#fef2f2", color: "#b91c1c", padding: "12px 16px", borderRadius: "8px", fontSize: "13px", border: "1px solid #fecaca", marginBottom: "16px", fontWeight: "500" }}>
                    {actionError}
                  </div>
                )}

                <div className="detail-box">
                  <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 12px" }}>
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
                    <div style={{ gridColumn: "span 2" }}>
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
                  <div className="detail-value" style={{ whiteSpace: "pre-wrap", fontWeight: 400, color: "#374151" }}>
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
                      style={{ cursor: "pointer", width: "100%", borderRadius: "8px", border: "1px solid #E5E7EB", maxHeight: "200px", objectFit: "cover" }}
                      title="Click to view full size"
                    />
                  </div>
                )}

                {/* Claims Timeline log */}
                <div style={{ padding: "16px 0", borderTop: "1px solid #E5E7EB", marginTop: "24px" }}>
                  <h4 style={{ margin: "0 0 16px 0", fontSize: "13px", fontWeight: "600", color: "#111827" }}>Claim Logs & Timeline</h4>
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
                        <div className="timeline-dot completed" style={{ backgroundColor: "#dc2626" }} />
                        <div className="timeline-title" style={{ color: "#dc2626" }}>Claim Rejected</div>
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
                              <div style={{ fontSize: "11px", color: "#4B5563", marginTop: "6px", background: "#F3F4F6", padding: "6px 10px", borderRadius: "6px", border: "1px solid #E5E7EB", lineHeight: "1.5" }}>
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
                      <h4 style={{ margin: "0 0 12px 0", fontSize: "11px", fontWeight: "700", color: "#111827", textTransform: "uppercase", letterSpacing: "0.5px" }}>Process Duration Metrics</h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div>
                          <div className="detail-label">Process Start Date & Time</div>
                          <div className="detail-value">{formatTimestamp(startDateTime) || "-"}</div>
                        </div>
                        <div>
                          <div className="detail-label">Process Close Date & Time</div>
                          <div className="detail-value" style={{ color: isTerminal ? "#111827" : "#d97706", fontWeight: isTerminal ? "500" : "600" }}>
                            {isTerminal ? (formatTimestamp(closeDateTime) || "-") : "In Progress"}
                          </div>
                        </div>
                        <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: "10px" }}>
                          <div className="detail-label">Total Processing Time</div>
                          <div style={{ fontSize: "14px", fontWeight: "700", color: isTerminal ? "#047857" : "#d97706" }}>
                            {isTerminal ? getProcessingTime(startDateTime, closeDateTime) : "In Progress"}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Footer Actions */}
              <div className="drawer-footer" style={{ padding: "20px 24px", borderTop: "1px solid #E5E7EB", display: "flex", justifyContent: "flex-end", background: "#F9FAFB" }}>
                {modalLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#6B7280' }}>
                    <div style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(39, 199, 134, 0.1)', borderTopColor: '#27C786', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                    Processing transaction...
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {selectedClaim.status === "request_created" && !showRejectForm && (
                      <>
                        <button className="maint-btn" onClick={() => handleWorkflowAction("approve")}>
                          Approve Claim
                        </button>
                        <button className="action-btn" style={{ color: "#dc2626", borderColor: "#fca5a5" }} onClick={() => setShowRejectForm(true)}>
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
                        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "12px" }}>
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
                        Mark Product Received
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
                        <h4 style={{ margin: "0 0 12px 0", fontSize: "13px", fontWeight: "600", color: "#111827" }}>Enter Courier Details</h4>
                        <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 12px", marginBottom: "12px" }}>
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
                          <div className="form-group" style={{ gridColumn: "span 2" }}>
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
                      <div style={{ color: "#065f46", fontWeight: 500, fontSize: "13px", background: "#ecfdf5", border: "1px solid #a7f3d0", padding: "10px 14px", borderRadius: "8px", width: "100%" }}>
                        ✓ Repaired product delivered. Awaiting customer confirmation.
                      </div>
                    )}

                    {selectedClaim.status === "rejected" && (
                      <div style={{ color: "#991b1b", fontWeight: 500, fontSize: "13px", background: "#fef2f2", border: "1px solid #fecaca", padding: "10px 14px", borderRadius: "8px", width: "100%" }}>
                        <strong>Claim Rejected.</strong> Reason: {selectedClaim.rejectReason || "-"}
                      </div>
                    )}

                    {(selectedClaim.status === "closed" || selectedClaim.status === "user_confirmed") && (
                      <div style={{ color: "#065f46", fontWeight: 500, fontSize: "13px", background: "#ecfdf5", border: "1px solid #a7f3d0", padding: "10px 14px", borderRadius: "8px", width: "100%" }}>
                        ✓ This warranty claim is closed and complete.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
