import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AddStaffForm from "../form/AddStaffForm";
import StaffEditForm from "../form/staffedit";

const LoadingSpinner = () => (
  <div style={{ padding: "8px 0" }}>
    {[...Array(5)].map((_, i) => (
      <div
        key={i}
        className="staff-skeleton-row"
        style={{
          height: "48px",
          borderRadius: "8px",
          marginBottom: "8px",
          backgroundColor: "#f3f4f6",
          backgroundImage: "linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)",
          backgroundSize: "200% 100%",
          animation: "staff-shimmer-anim 1.5s infinite linear",
          animationDelay: `${i * 0.08}s`
        }}
      />
    ))}
  </div>
);

const ErrorDisplay = ({ message }) => (
  <div style={{ textAlign: "center", padding: "50px", color: "#EF4444", fontFamily: "'Lexend', sans-serif", fontWeight: 600 }}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8, verticalAlign: "middle" }}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
    {message}
  </div>
);

const Toast = ({ message, type = "success", onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        top: "24px",
        right: "24px",
        zIndex: 9999,
        background: type === "success" ? "#065F46" : "#991B1B",
        color: "#fff",
        padding: "12px 20px",
        borderRadius: "12px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        fontSize: "14px",
        fontWeight: "500",
        fontFamily: "'Lexend', sans-serif",
        animation: "toast-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
      }}
    >
      <span>{type === "success" ? "✓" : "⚠️"}</span>
      <span>{message}</span>
      <button
        onClick={onClose}
        style={{
          background: "none",
          border: "none",
          color: "#fff",
          fontSize: "16px",
          cursor: "pointer",
          marginLeft: "8px"
        }}
      >
        ✕
      </button>
    </div>
  );
};

export default function RoleStaffManagement({
  roleKey,
  roleTitle,
  subtitle,
  addBtnText,
  roleStyle = { background: "#ECFDF5", color: "#065F46", border: "#A7F3D0" },
  baseUrl: propBaseUrl
}) {
  const navigate = useNavigate();
  const [staffData, setStaffData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(null);
  const [editingStaff, setEditingStaff] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedStaffForDrawer, setSelectedStaffForDrawer] = useState(null);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [toast, setToast] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const baseUrl = propBaseUrl || import.meta.env.VITE_API_URL;

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  const getStaffStatus = (staff) => {
    const overrides = JSON.parse(localStorage.getItem("admin_staff_status") || "{}");
    if (overrides[staff.id]) {
      return overrides[staff.id];
    }
    return staff.active !== false ? "Active" : "Suspended";
  };

  useEffect(() => {
    const handleGlobalClick = () => setActiveDropdownId(null);
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  useEffect(() => {
    fetchStaffData();
  }, [roleKey]);

  const fetchStaffData = async () => {
    setLoading(true);
    setError(null);

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    try {
      const res = await fetch(baseUrl + "/admin/alladmin", { headers });
      if (res.status === 401 || res.status === 403) throw new Error("Auth failed");
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const records = await res.json();
      const list = Array.isArray(records) ? records : [];
      // Filter list specifically for this roleKey
      const filteredForRole = list.filter(
        (a) => a.role && a.role.toUpperCase() === roleKey.toUpperCase()
      );
      setStaffData(filteredForRole);
    } catch (err) {
      console.error("Failed to fetch role staff:", err);
      if (err.message === "Auth failed") {
        localStorage.removeItem("token");
        navigate("/");
      } else {
        setError(err.message || "Failed to load staff list");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = (staff) => {
    const currentStatus = getStaffStatus(staff);
    const newStatus = currentStatus === "Active" ? "Suspended" : "Active";
    if (!window.confirm(`Are you sure you want to change ${staff.name || "this user"}'s status to ${newStatus}?`)) {
      return;
    }

    const overrides = JSON.parse(localStorage.getItem("admin_staff_status") || "{}");
    overrides[staff.id] = newStatus;
    localStorage.setItem("admin_staff_status", JSON.stringify(overrides));

    setStaffData((prev) => [...prev]);
    showToast(`${staff.name || "User"} is now ${newStatus}`);
  };

  const handleDeleteStaff = async (staff) => {
    if (!window.confirm(`Are you sure you want to delete ${staff.name || "this staff member"}?`)) {
      return;
    }

    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`${baseUrl}/admin/deactivate/${staff.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        showToast(`${staff.name || "Staff member"} has been deleted successfully.`);
        fetchStaffData();
      } else {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to delete staff member");
      }
    } catch (err) {
      console.error("Delete staff error:", err);
      showToast("Error: " + err.message, "error");
    }
  };

  const closeForm = () => {
    setIsFormOpen(null);
    setEditingStaff(null);
    fetchStaffData();
  };

  // Filtered staff based on search query & status
  const filteredStaff = staffData.filter((staff) => {
    const term = searchQuery.toLowerCase();
    const matchesSearch =
      (staff.name || "").toLowerCase().includes(term) ||
      (staff.email || "").toLowerCase().includes(term) ||
      (staff.mobile || "").toLowerCase().includes(term);

    const statusVal = getStaffStatus(staff);
    const matchesStatus =
      statusFilter === "ALL" ||
      statusVal.toUpperCase() === statusFilter.toUpperCase();

    return matchesSearch && matchesStatus;
  });

  // Calculate summary metrics
  const totalCount = staffData.length;
  const activeCount = staffData.filter((s) => getStaffStatus(s) === "Active").length;
  const suspendedCount = staffData.filter((s) => getStaffStatus(s) === "Suspended").length;

  // Pagination logic
  const totalPages = Math.ceil(filteredStaff.length / itemsPerPage) || 1;
  const validPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (validPage - 1) * itemsPerPage;
  const paginatedStaff = filteredStaff.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "#F9FAFB", position: "relative" }}>
      <style>{`
        @keyframes staff-fadeInPage {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes staff-shimmer-anim {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes toast-slide-in {
          from { opacity: 0; transform: translateY(-20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .management-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
          font-family: 'Lexend', sans-serif;
          animation: staff-fadeInPage 400ms ease-out forwards;
        }
        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .header-left h2 {
          font-size: 28px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }
        .header-left p {
          margin: 4px 0 0;
          font-size: 13px;
          color: #6B7280;
        }
        .add-btn {
          background: #111827;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          font-family: inherit;
          transition: transform 0.2s, background-color 0.2s, box-shadow 0.2s;
        }
        .add-btn:hover {
          background: #374151;
          transform: scale(1.02);
          box-shadow: 0 4px 12px rgba(17, 24, 39, 0.15);
        }

        .cards-container {
          width: 100%;
          display: flex;
          gap: 20px;
          margin-bottom: 24px;
        }
        .card-box {
          flex: 1;
          background-color: white;
          border-radius: 16px;
          padding: 20px 24px;
          border: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 100px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .card-box:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.06);
          border-color: #10b981;
        }

        .directory-box {
          background: #fff;
          border-radius: 16px;
          padding: 24px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0,0,0,.02);
        }

        .search-bar {
          width: 100%;
          padding: 10px 16px;
          border: 1.5px solid #d1d5db;
          border-radius: 10px;
          font-size: 14px;
          outline: none;
          font-family: inherit;
          background: #F9FAFB;
          transition: border-color 0.2s ease, background-color 0.2s ease;
        }
        .search-bar:focus {
          border-color: #10b981;
          background: #fff;
        }

        .staff-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }
        .staff-table th {
          text-align: left;
          padding: 12px 14px;
          color: #4B5563;
          font-weight: 600;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #E5E7EB;
          background: #F9FAFB;
        }
        .staff-table td {
          padding: 16px 12px;
          border-bottom: 1px solid #E5E7EB;
          font-size: 14px;
          color: #374151;
        }
        .staff-table tr:hover td { background: #F0FDF4 !important; }

        .role-pill {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
        }

        .staff-dropdown-container { position: relative; display: inline-block; }
        .staff-dropdown-menu {
          position: absolute;
          right: 0;
          top: 100%;
          background: #fff;
          border: 1px solid #E5E7EB;
          border-radius: 10px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.08);
          z-index: 1000;
          width: 170px;
          padding: 6px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .staff-dropdown-item {
          background: none;
          border: none;
          text-align: left;
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 500;
          color: #374151;
          border-radius: 6px;
          cursor: pointer;
          width: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: background-color 0.15s ease;
        }
        .staff-dropdown-item:hover { background-color: #F3F4F6; color: #111827; }
        .staff-dropdown-item.danger { color: #EF4444; }
        .staff-dropdown-item.danger:hover { background-color: #FEF2F2; color: #DC2626; }

        .empty-state {
          text-align: center;
          padding: 48px 24px;
          color: #6B7280;
        }
        .empty-state-icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 16px;
          background: #F3F4F6;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pagination-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid #E5E7EB;
          font-size: 13px;
          color: #6B7280;
        }
        .page-btn {
          padding: 6px 12px;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          background: #fff;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          color: #374151;
          transition: all 0.15s ease;
        }
        .page-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .page-btn:not(:disabled):hover {
          background: #F3F4F6;
        }

        /* Drawer styles */
        .staff-drawer-overlay {
          position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(4px); z-index: 2000;
          display: flex; justify-content: flex-end;
        }
        .staff-drawer {
          width: 480px; max-width: 90vw; height: 100%; background: #fff;
          box-shadow: -10px 0 30px rgba(0,0,0,0.08);
          display: flex; flex-direction: column;
        }
        .staff-drawer-header {
          padding: 24px; border-bottom: 1px solid #F3F4F6;
          display: flex; justify-content: space-between; align-items: center;
        }
      `}</style>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="management-container">
        <div className="header-row">
          <div className="header-left">
            <h2>{roleTitle}</h2>
            <p>{subtitle}</p>
          </div>
          <button className="add-btn" onClick={() => setIsFormOpen("add")}>
            + {addBtnText || "Add Staff Member"}
          </button>
        </div>

        {/* Summary Metric Cards */}
        <div className="cards-container">
          <div className="card-box">
            <div>
              <div style={{ fontSize: 13, color: "#6B7280", fontWeight: 500 }}>Total Accounts</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#111827", marginTop: 4 }}>{totalCount}</div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
            </div>
          </div>
          <div className="card-box">
            <div>
              <div style={{ fontSize: 13, color: "#6B7280", fontWeight: 500 }}>Active Accounts</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#065F46", marginTop: 4 }}>{activeCount}</div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#D1FAE5", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#065F46" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
            </div>
          </div>
          <div className="card-box">
            <div>
              <div style={{ fontSize: 13, color: "#6B7280", fontWeight: 500 }}>Suspended Accounts</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#991B1B", marginTop: 4 }}>{suspendedCount}</div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
            </div>
          </div>
        </div>

        {/* Directory Section */}
        <div className="directory-box">
          <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap", width: "100%" }}>
            <div style={{ position: "relative", flex: 1, minWidth: "240px" }}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#6B7280"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search by name, email, or mobile"
                className="search-bar"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                style={{ margin: 0, paddingLeft: "38px", paddingRight: "32px", boxSizing: "border-box" }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", color: "#9CA3AF", cursor: "pointer", fontSize: "16px"
                  }}
                >
                  ✕
                </button>
              )}
            </div>
            <select
              style={{
                height: "40px", padding: "0 12px", border: "1.5px solid #E5E7EB",
                borderRadius: "10px", fontSize: "13px", outline: "none", background: "#fff",
                cursor: "pointer", fontFamily: "inherit", color: "#374151"
              }}
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <ErrorDisplay message={error} />
          ) : filteredStaff.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: "0 0 6px 0" }}>
                No {roleTitle} accounts found
              </h3>
              <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 20px 0" }}>
                {searchQuery || statusFilter !== "ALL"
                  ? "Try adjusting your search or filters to find what you are looking for."
                  : `Get started by adding a new ${roleTitle} user account.`}
              </p>
              <button className="add-btn" onClick={() => setIsFormOpen("add")}>
                + {addBtnText || "Add User"}
              </button>
            </div>
          ) : (
            <>
              <table className="staff-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Mobile</th>
                    <th>Status</th>
                    <th>Last Login</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStaff.map((staff) => {
                    const status = getStaffStatus(staff);
                    return (
                      <tr key={staff.id} style={{ cursor: "pointer" }}>
                        <td onClick={() => setSelectedStaffForDrawer(staff)}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: "50%",
                                background: roleStyle.background,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                border: `1px solid ${roleStyle.border}`
                              }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={roleStyle.color} strokeWidth="2.5">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                              </svg>
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: "#0f172a" }}>{staff.name || "User Name"}</div>
                              <div style={{ fontSize: 11, color: "#6B7280" }}>{staff.email || "user@xyz.com"}</div>
                            </div>
                          </div>
                        </td>
                        <td onClick={() => setSelectedStaffForDrawer(staff)}>
                          <span
                            className="role-pill"
                            style={{
                              background: roleStyle.background,
                              color: roleStyle.color,
                              border: `1px solid ${roleStyle.border}`
                            }}
                          >
                            {roleTitle.replace(" Management", "")}
                          </span>
                        </td>
                        <td onClick={() => setSelectedStaffForDrawer(staff)}>
                          <span style={{ fontSize: 13, color: "#4B5563" }}>{staff.mobile || "—"}</span>
                        </td>
                        <td onClick={() => setSelectedStaffForDrawer(staff)}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "4px 12px",
                              borderRadius: "999px",
                              fontSize: "11px",
                              fontWeight: 600,
                              background: status === "Active" ? "#ECFDF5" : "#FEF2F2",
                              color: status === "Active" ? "#065F46" : "#991B1B",
                              border: `1px solid ${status === "Active" ? "#A7F3D0" : "#FECACA"}`
                            }}
                          >
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: status === "Active" ? "#10B981" : "#EF4444",
                                flexShrink: 0
                              }}
                            />
                            {status}
                          </span>
                        </td>
                        <td onClick={() => setSelectedStaffForDrawer(staff)}>
                          <span style={{ fontSize: 13, color: "#6B7280" }}>
                            {staff.lastLogin ? new Date(staff.lastLogin).toLocaleString() : "2024-01-15 14:30"}
                          </span>
                        </td>
                        <td>
                          <div className="staff-dropdown-container">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownId(activeDropdownId === staff.id ? null : staff.id);
                              }}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: "6px 12px",
                                fontSize: "18px",
                                fontWeight: "bold",
                                color: "#64748B",
                                borderRadius: "6px"
                              }}
                            >
                              ⋮
                            </button>
                            {activeDropdownId === staff.id && (
                              <div className="staff-dropdown-menu">
                                <button
                                  className="staff-dropdown-item"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedStaffForDrawer(staff);
                                    setActiveDropdownId(null);
                                  }}
                                >
                                  👁️ View Details
                                </button>
                                <button
                                  className="staff-dropdown-item"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingStaff(staff);
                                    setIsFormOpen("edit");
                                    setActiveDropdownId(null);
                                  }}
                                >
                                  ✏️ Edit Staff
                                </button>
                                <button
                                  className="staff-dropdown-item"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleStatus(staff);
                                    setActiveDropdownId(null);
                                  }}
                                >
                                  {status === "Active" ? "🚫 Deactivate Account" : "⚡ Activate Account"}
                                </button>
                                <button
                                  className="staff-dropdown-item danger"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteStaff(staff);
                                    setActiveDropdownId(null);
                                  }}
                                >
                                  🗑️ Delete Staff
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination Bar */}
              <div className="pagination-bar">
                <div>
                  Showing <strong style={{ color: "#111827" }}>{startIndex + 1}</strong> to{" "}
                  <strong style={{ color: "#111827" }}>{Math.min(startIndex + itemsPerPage, filteredStaff.length)}</strong> of{" "}
                  <strong style={{ color: "#111827" }}>{filteredStaff.length}</strong> entries
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    className="page-btn"
                    disabled={validPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  >
                    Previous
                  </button>
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "#374151" }}>
                    Page {validPage} of {totalPages}
                  </span>
                  <button
                    className="page-btn"
                    disabled={validPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add / Edit Form Modal */}
      {isFormOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          {isFormOpen === "add" && (
            <AddStaffForm
              defaultRole={roleKey}
              onClose={closeForm}
              onSuccess={(msg) => showToast(msg, "success")}
            />
          )}
          {isFormOpen === "edit" && (
            <StaffEditForm
              staff={editingStaff}
              onClose={closeForm}
            />
          )}
        </div>
      )}

      {/* Staff Drawer */}
      {selectedStaffForDrawer && (
        <div className="staff-drawer-overlay" onClick={() => setSelectedStaffForDrawer(null)}>
          <div className="staff-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="staff-drawer-header">
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#111827" }}>User Profile</h3>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6B7280" }}>{roleTitle} User Details</p>
              </div>
              <button
                style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#6B7280" }}
                onClick={() => setSelectedStaffForDrawer(null)}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, background: "#F9FAFB", padding: 16, borderRadius: 12, border: "1px solid #E5E7EB" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: roleStyle.background, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: roleStyle.color, fontSize: 18 }}>
                  {(selectedStaffForDrawer.name || "U")[0]}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{selectedStaffForDrawer.name || "—"}</h4>
                  <p style={{ margin: "2px 0 0", fontSize: 13, color: "#6B7280" }}>{selectedStaffForDrawer.email || "—"}</p>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ background: "#F9FAFB", padding: 12, borderRadius: 8, border: "1px solid #E5E7EB" }}>
                  <span style={{ fontSize: 11, color: "#6B7280", fontWeight: 600 }}>ROLE</span>
                  <div style={{ fontSize: 14, fontWeight: 700, color: roleStyle.color, marginTop: 4 }}>{roleKey}</div>
                </div>
                <div style={{ background: "#F9FAFB", padding: 12, borderRadius: 8, border: "1px solid #E5E7EB" }}>
                  <span style={{ fontSize: 11, color: "#6B7280", fontWeight: 600 }}>STATUS</span>
                  <div style={{ fontSize: 14, fontWeight: 700, color: getStaffStatus(selectedStaffForDrawer) === "Active" ? "#10b981" : "#EF4444", marginTop: 4 }}>
                    {getStaffStatus(selectedStaffForDrawer)}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <h5 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#111827", textTransform: "uppercase", letterSpacing: "0.05em" }}>User Information</h5>
                <div style={{ fontSize: 13, display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F3F4F6" }}>
                  <span style={{ color: "#6B7280" }}>Mobile Number</span>
                  <span style={{ fontWeight: 600 }}>{selectedStaffForDrawer.mobile || "—"}</span>
                </div>
                <div style={{ fontSize: 13, display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F3F4F6" }}>
                  <span style={{ color: "#6B7280" }}>Email</span>
                  <span style={{ fontWeight: 600 }}>{selectedStaffForDrawer.email || "—"}</span>
                </div>
                <div style={{ fontSize: 13, display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F3F4F6" }}>
                  <span style={{ color: "#6B7280" }}>Created Date</span>
                  <span style={{ fontWeight: 600 }}>{selectedStaffForDrawer.createdAt ? new Date(selectedStaffForDrawer.createdAt).toLocaleDateString() : "2024-01-10"}</span>
                </div>
                <div style={{ fontSize: 13, display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
                  <span style={{ color: "#6B7280" }}>Last Login</span>
                  <span style={{ fontWeight: 600 }}>{selectedStaffForDrawer.lastLogin ? new Date(selectedStaffForDrawer.lastLogin).toLocaleString() : "2024-01-15 14:30"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
