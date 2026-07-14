import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

function AnimatedCounter({ value }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const end = parseInt(value, 10);
    if (isNaN(end) || end === 0) {
      setCount(value);
      return;
    }
    const duration = 1000; // 1 second duration
    const frameRate = 1000 / 60; // 60fps
    const totalFrames = Math.round(duration / frameRate);
    let frame = 0;
    
    const counter = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      // Ease out quad
      const currentCount = Math.round(end * (progress * (2 - progress)));
      
      if (frame >= totalFrames) {
        setCount(end);
        clearInterval(counter);
      } else {
        setCount(currentCount);
      }
    }, frameRate);
    
    return () => clearInterval(counter);
  }, [value]);

  return <>{count}</>;
}

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

  // Toast notifications state
  const [toast, setToast] = useState({ message: "", type: "" });
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "" }), 4000);
  };

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
        showToast("Support request raised successfully!", "success");
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
        showToast(errorText || "Failed to submit request.", "error");
      }
    } catch (err) {
      console.error("Create request error:", err);
      setFormError("Network error: Could not submit request.");
      showToast("Network error: Could not submit request.", "error");
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
        showToast(`Request status advanced to ${nextStatus?.replace("_", " ")} successfully!`, "success");
      } else {
        const errText = await response.text();
        showToast(`Failed to update status: ${errText}`, "error");
      }
    } catch (err) {
      console.error("Status update error:", err);
      showToast("Network error: Could not update status", "error");
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
    <div className="support-page-wrapper">
      <style>{`
        @keyframes fadeInPage {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes slideUpFade {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes statIconRotate {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(-8deg); }
          75% { transform: rotate(8deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes pulseIllustration {
          0% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 0.7; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes fadeInOverlay {
          from { background: rgba(0, 0, 0, 0); }
          to { background: rgba(0, 0, 0, 0.5); }
        }
        @keyframes scaleUpModal {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .support-page-wrapper {
          animation: fadeInPage 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          width: 100%;
          min-height: 100vh;
          font-family: 'Lexend', sans-serif;
          padding: 24px;
          box-sizing: border-box;
          background: #F9FAFB;
          position: relative;
          overflow: hidden;
        }

        /* Decorative Background Elements */
        .decorative-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.12;
          z-index: 0;
          pointer-events: none;
        }
        .blob-1 {
          width: 320px;
          height: 320px;
          background: #3B82F6;
          top: 8%;
          left: -80px;
        }
        .blob-2 {
          width: 280px;
          height: 280px;
          background: #10B981;
          bottom: 15%;
          right: -80px;
        }

        .support-container {
          max-width: 1200px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        /* Staggered load animations */
        .animate-header {
          animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-stats {
          animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: 0.08s;
          opacity: 0;
        }
        .animate-filters {
          animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: 0.16s;
          opacity: 0;
        }
        .animate-table {
          animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: 0.24s;
          opacity: 0;
        }

        .top-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
        }

        .header-left h2 {
          font-size: 28px;
          font-weight: 700;
          margin: 0;
        }

        .gradient-header-text {
          background: linear-gradient(135deg, #111827, #374151);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .primary-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 22px;
          background: #111827;
          color: white;
          border: none;
          border-radius: 9999px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: inherit;
          box-shadow: 0 4px 6px rgba(17, 24, 39, 0.05);
        }

        .primary-btn:hover {
          background: #374151;
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(17, 24, 39, 0.15);
        }

        .primary-btn:active {
          transform: scale(0.96) translateY(0);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 16px;
          margin-bottom: 32px;
        }

        @media (max-width: 1200px) {
          .stats-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }
        }

        .stat-card {
          background: linear-gradient(135deg, #ffffff, #F9FAFB);
          border: 1px solid #E5E7EB;
          border-radius: 16px;
          padding: 20px 24px;
          box-shadow: 0 4px 15px -3px rgba(0, 0, 0, 0.015);
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 110px;
          transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
          box-sizing: border-box;
        }

        .stat-card:hover {
          transform: translateY(-5px) scale(1.03);
          box-shadow: 0 16px 32px rgba(17, 24, 39, 0.08);
          border-color: #3B82F6;
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
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border: 1px solid transparent;
          transition: all 0.3s ease;
        }

        .stat-card:hover .stat-icon-circle {
          animation: statIconRotate 0.6s ease-in-out infinite;
        }

        .stat-icon-svg {
          width: 22px;
          height: 22px;
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

        /* Glassmorphic filter block */
        .filters-section {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(229, 231, 235, 0.6);
          border-radius: 16px;
          padding: 20px 24px;
          margin-bottom: 28px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
          display: flex;
          gap: 24px;
          align-items: center;
          flex-wrap: wrap;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .filter-group label {
          font-size: 12px;
          font-weight: 600;
          color: #4B5563;
        }

        .filter-select {
          padding: 10px 16px;
          border: 1px solid #D1D5DB;
          border-radius: 8px;
          font-size: 13px;
          outline: none;
          min-width: 180px;
          background: #ffffff;
          font-family: 'Lexend', sans-serif;
          color: #374151;
          transition: all 0.2s ease;
        }

        .filter-select:focus {
          border-color: #3B82F6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
        }

        .records-section {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(8px);
          border-radius: 16px;
          padding: 24px;
          border: 1px solid rgba(229, 231, 235, 0.5);
          box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.03);
        }

        .table-wrapper {
          overflow-x: auto;
          border-radius: 12px;
          border: 1px solid #E5E7EB;
          background: #ffffff;
        }

        .records-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }

        .records-table th {
          text-align: left;
          padding: 14px 16px;
          color: #4B5563;
          font-weight: 600;
          font-size: 13px;
          border-bottom: 1px solid #E5E7EB;
          background: #F9FAFB;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .records-table tr td {
          transition: background-color 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          border-bottom: 1px solid #E5E7EB;
          padding: 16px;
          font-size: 14px;
          color: #111827;
        }

        /* Zebra rows configuration */
        .records-table tr:nth-child(odd) td {
          background-color: #ffffff;
        }

        .records-table tr:nth-child(even) td {
          background-color: #F9FAFB;
        }

        .records-table tr td:first-child {
          border-left: 3px solid transparent;
          transition: border-left-color 0.25s ease, background-color 0.25s ease;
        }

        .records-table tr:hover td {
          background-color: #F3F4F6 !important;
        }

        .records-table tr:hover td:first-child {
          border-left-color: #111827;
        }

        .records-table tr:last-child td {
          border-bottom: none;
        }

        /* Soft gradient status badges */
        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 6px 14px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 600;
          text-transform: capitalize;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .status-badge:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
        }

        .status-pending {
          background: linear-gradient(135deg, #FEF3C7, #FDE68A);
          color: #B45309;
        }
        .status-approved {
          background: linear-gradient(135deg, #DBEAFE, #BFDBFE);
          color: #1D4ED8;
        }
        .status-in_progress {
          background: linear-gradient(135deg, #F3E8FF, #E9D5FF);
          color: #6D28D9;
        }
        .status-completed {
          background: linear-gradient(135deg, #D1FAE5, #A7F3D0);
          color: #047857;
        }

        .badge-icon {
          flex-shrink: 0;
        }

        .type-badge {
          display: inline-flex;
          align-items: center;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
        }
        
        .type-dealer { background: #EDE7F6; color: #512DA8; }
        .type-user { background: #E0F2F1; color: #00796B; }

        .action-btn {
          padding: 6px 14px;
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
          border-color: #9CA3AF;
          color: #111827;
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.03);
        }

        .action-btn:active {
          transform: scale(0.96);
        }

        /* Modals and Overlays */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
          animation: fadeInOverlay 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .modal-content {
          background: #ffffff;
          padding: 32px;
          border-radius: 20px;
          width: 550px;
          max-width: 90%;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          max-height: 90vh;
          overflow-y: auto;
          font-family: 'Lexend', sans-serif;
          animation: scaleUpModal 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          border-bottom: 1px solid #E5E7EB;
          padding-bottom: 14px;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          color: #111827;
        }

        .close-icon-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #9CA3AF;
          transition: all 0.2s;
        }

        .close-icon-btn:hover {
          color: #111827;
          transform: scale(1.1);
        }

        .close-icon-btn:active {
          transform: scale(0.9);
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
        }

        .form-input, .form-textarea, .form-select {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid #D1D5DB;
          border-radius: 8px;
          outline: none;
          font-size: 14px;
          box-sizing: border-box;
          font-family: 'Lexend', sans-serif;
          background: #ffffff;
          color: #1F2937;
          transition: all 0.2s ease;
        }

        .form-input:focus, .form-textarea:focus, .form-select:focus {
          border-color: #3B82F6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
        }

        .form-textarea {
          resize: vertical;
          min-height: 120px;
        }

        .char-counter {
          display: block;
          text-align: right;
          font-size: 11px;
          color: #6B7280;
          margin-top: 6px;
        }

        .error-banner {
          background: #FEF2F2;
          border: 1px solid #FCA5A5;
          color: #B91C1C;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 13px;
          margin-bottom: 20px;
          font-weight: 500;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 28px;
          border-top: 1px solid #E5E7EB;
          padding-top: 20px;
        }

        .sec-btn {
          padding: 10px 20px;
          background: #ffffff;
          color: #374151;
          border: 1px solid #D1D5DB;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
          font-family: inherit;
        }

        .sec-btn:hover {
          background: #F9FAFB;
          border-color: #9CA3AF;
          transform: translateY(-1px);
        }

        .sec-btn:active {
          transform: scale(0.96);
        }

        .form-actions button[type="submit"] {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 22px;
          background: #111827;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
          font-family: inherit;
        }

        .form-actions button[type="submit"]:hover {
          background: #374151;
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(0,0,0,0.05);
        }

        .form-actions button[type="submit"]:active {
          transform: scale(0.96);
        }

        /* Details View Grid */
        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px 24px;
          margin-bottom: 24px;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .detail-item-label {
          font-size: 11px;
          color: #6B7280;
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        .detail-item-value {
          font-size: 14px;
          font-weight: 500;
          color: #111827;
        }

        .desc-box {
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 10px;
          padding: 16px;
          font-size: 13.5px;
          color: #374151;
          line-height: 1.6;
          margin-top: 8px;
          margin-bottom: 28px;
          white-space: pre-wrap;
          max-height: 200px;
          overflow-y: auto;
        }

        /* Stepper styles */
        .stepper-container {
          margin: 28px 0;
          padding: 10px 0;
        }

        .stepper-header {
          font-size: 12px;
          font-weight: 700;
          color: #374151;
          margin-bottom: 20px;
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
          top: 16px;
          left: 0;
          right: 0;
          height: 3px;
          background: #E5E7EB;
          z-index: 1;
        }

        .stepper-progress-line {
          position: absolute;
          top: 16px;
          left: 0;
          height: 3px;
          background: #10B981;
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
          background: #ffffff;
          border: 2px solid #E5E7EB;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          color: #9CA3AF;
          transition: all 0.3s ease;
        }

        .step.completed .step-circle {
          background: #10B981;
          border-color: #10B981;
          color: white;
        }

        .step.active .step-circle {
          border-color: #111827;
          color: #111827;
          box-shadow: 0 0 0 4px rgba(17, 24, 39, 0.08);
          font-weight: 800;
        }

        .step-label {
          margin-top: 8px;
          font-size: 12px;
          font-weight: 500;
          color: #9CA3AF;
          text-align: center;
          transition: color 0.3s ease;
        }

        .step.active .step-label {
          color: #111827;
          font-weight: 700;
        }

        .step.completed .step-label {
          color: #374151;
          font-weight: 600;
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

        /* Skeletons and Shimmers */
        .skeleton-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 10px 0;
        }
        .skeleton-row {
          display: flex;
          justify-content: space-between;
          padding: 16px;
          border-bottom: 1px solid #E5E7EB;
          align-items: center;
        }
        .skeleton-header {
          background: #F9FAFB;
          border-radius: 8px;
        }
        .skeleton-bar {
          height: 16px;
          background: linear-gradient(90deg, #E5E7EB 25%, #F3F4F6 50%, #E5E7EB 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite linear;
          border-radius: 4px;
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        /* Toast Popup styling */
        .ss-toast {
          position: fixed;
          bottom: 28px;
          right: 28px;
          padding: 14px 20px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
          display: flex;
          align-items: center;
          gap: 10px;
          z-index: 10000;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
          animation: slideUpFade 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          max-width: 360px;
          font-family: inherit;
        }
        .ss-toast-success {
          background: linear-gradient(135deg, #059669, #10B981);
        }
        .ss-toast-error {
          background: linear-gradient(135deg, #DC2626, #EF4444);
        }
        .ss-toast-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          flex-shrink: 0;
          font-size: 12px;
        }
      `}</style>

      {/* Blurry decorative background blobs */}
      <div className="decorative-blob blob-1"></div>
      <div className="decorative-blob blob-2"></div>

      <div className="support-container">
        <div className="top-header animate-header">
          <div className="header-left">
            <h2 className="gradient-header-text">Support Requests</h2>
            <span style={{ fontSize: "13px", color: "#6B7280", display: "block", marginTop: 4 }}>Manage and track dealer and customer support tickets</span>
          </div>
          {isDealer && (
            <button className="primary-btn" onClick={() => setShowCreateModal(true)}>
              <span style={{ fontSize: 18, fontWeight: "bold" }}>+</span> Raise Support Request
            </button>
          )}
        </div>

        {/* Stats Grid */}
        <div className="stats-grid animate-stats">
          <div className="stat-card">
            <div className="stat-card-left">
              <div className="stat-icon-circle" style={{ background: "rgba(17, 24, 39, 0.05)", borderColor: "rgba(17, 24, 39, 0.1)" }}>
                <svg className="stat-icon-svg" style={{ color: "#111827" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </div>
              <div className="stat-info-group">
                <span className="stat-label-text">Total Requests</span>
                <span className="stat-value-text"><AnimatedCounter value={totalCount} /></span>
              </div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-card-left">
              <div className="stat-icon-circle" style={{ background: "rgba(245, 158, 11, 0.08)", borderColor: "rgba(245, 158, 11, 0.15)" }}>
                <svg className="stat-icon-svg" style={{ color: "#D97706" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <div className="stat-info-group">
                <span className="stat-label-text">Pending</span>
                <span className="stat-value-text" style={{ color: "#D97706" }}><AnimatedCounter value={pendingCount} /></span>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-left">
              <div className="stat-icon-circle" style={{ background: "rgba(59, 130, 246, 0.08)", borderColor: "rgba(59, 130, 246, 0.15)" }}>
                <svg className="stat-icon-svg" style={{ color: "#2563EB" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <div className="stat-info-group">
                <span className="stat-label-text">Approved</span>
                <span className="stat-value-text" style={{ color: "#2563EB" }}><AnimatedCounter value={approvedCount} /></span>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-left">
              <div className="stat-icon-circle" style={{ background: "rgba(139, 92, 246, 0.08)", borderColor: "rgba(139, 92, 246, 0.15)" }}>
                <svg className="stat-icon-svg" style={{ color: "#7C3AED" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <polyline points="1 20 1 14 7 14"></polyline>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
              </div>
              <div className="stat-info-group">
                <span className="stat-label-text">In Progress</span>
                <span className="stat-value-text" style={{ color: "#7C3AED" }}><AnimatedCounter value={inProgressCount} /></span>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-left">
              <div className="stat-icon-circle" style={{ background: "rgba(16, 185, 129, 0.08)", borderColor: "rgba(16, 185, 129, 0.15)" }}>
                <svg className="stat-icon-svg" style={{ color: "#059669" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <div className="stat-info-group">
                <span className="stat-label-text">Completed</span>
                <span className="stat-value-text"><AnimatedCounter value={completedCount} /></span>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="filters-section animate-filters">
          <div className="filter-group">
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg style={{ width: 14, height: 14, color: "#6B7280" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              Date Range
            </label>
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
                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <svg style={{ width: 14, height: 14, color: "#6B7280" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  Status
                </label>
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
                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <svg style={{ width: 14, height: 14, color: "#6B7280" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                  User Type
                </label>
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
        <div className="records-section animate-table">
          <div className="records-header">
          </div>

          {loading ? (
            <div className="skeleton-container">
              <div className="skeleton-row skeleton-header">
                <div className="skeleton-bar" style={{ width: "8%" }}></div>
                <div className="skeleton-bar" style={{ width: "22%" }}></div>
                <div className="skeleton-bar" style={{ width: "18%" }}></div>
                <div className="skeleton-bar" style={{ width: "14%" }}></div>
                <div className="skeleton-bar" style={{ width: "12%" }}></div>
                <div className="skeleton-bar" style={{ width: "10%" }}></div>
              </div>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="skeleton-row">
                  <div className="skeleton-bar" style={{ width: "8%" }}></div>
                  <div className="skeleton-bar" style={{ width: "22%" }}></div>
                  <div className="skeleton-bar" style={{ width: "18%" }}></div>
                  <div className="skeleton-bar" style={{ width: "14%" }}></div>
                  <div className="skeleton-bar" style={{ width: "12%" }}></div>
                  <div className="skeleton-bar" style={{ width: "10%" }}></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div style={{ padding: 30, textAlign: 'center', color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 16 }}>
              <div>{error}</div>
              <button onClick={fetchRequests} style={{ marginTop: 12, padding: '6px 14px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Retry</button>
            </div>
          ) : (
            <div className="table-wrapper">
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
                            {req.status === "pending" && (
                              <svg className="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12, marginRight: 6 }}>
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                              </svg>
                            )}
                            {req.status === "approved" && (
                              <svg className="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12, marginRight: 6 }}>
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                              </svg>
                            )}
                            {req.status === "in_progress" && (
                              <svg className="badge-icon animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12, marginRight: 6, animation: "spin 2s linear infinite" }}>
                                <polyline points="23 4 23 10 17 10"></polyline>
                                <polyline points="1 20 1 14 7 14"></polyline>
                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                              </svg>
                            )}
                            {req.status === "completed" && (
                              <svg className="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12, marginRight: 6 }}>
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                              </svg>
                            )}
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
                      <td colSpan={isDealer ? 6 : 8}>
                        <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center' }}>
                          <svg className="empty-state-illustration" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ width: 80, height: 80, color: '#9CA3AF', marginBottom: 16 }}>
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="8" y1="12" x2="16" y2="12"></line>
                          </svg>
                          <h3 style={{ margin: '0 0 6px 0', fontSize: 16, fontWeight: 600, color: '#374151' }}>No Requests Found</h3>
                          <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>Try adjusting your filters or raise a new support request.</p>
                        </div>
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

      {/* Toast Notification */}
      {toast.message && (
        <div className={`ss-toast ss-toast-${toast.type}`}>
          <span className="ss-toast-icon">
            {toast.type === "success" ? "✓" : "✕"}
          </span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
