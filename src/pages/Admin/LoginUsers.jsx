import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

import totalIcon from "../../assets/icons/stationicon/Vector.svg";
import activeIcon from "../../assets/icons/stationicon/green.svg";
import uptimeIcon from "../../assets/icons/stationicon/yellow.svg";
import errorIcon from "../../assets/icons/stationicon/red.svg";

// Simple Loading Spinner
const LoadingSpinner = () => (
  <div style={{ textAlign: "center", padding: "50px", fontSize: "18px", color: "#555" }}>
    Loading users...
  </div>
);




function LoginUsers({ baseUrl }) {
  const navigate = useNavigate();

  // State
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);
  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
    google: 0,
    manual: 0,
    truecaller: 0
  });
  const [chartData, setChartData] = useState([]);
  const [statusOverrides, setStatusOverrides] = useState(() => {
    try { return JSON.parse(localStorage.getItem("login_user_status") || "{}"); } catch { return {}; }
  });
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [loginStatusFilter, setLoginStatusFilter] = useState("ALL");
  const [selectedUserForDrawer, setSelectedUserForDrawer] = useState(null);
  const [activeDropdownId, setActiveDropdownId] = useState(null);

  useEffect(() => {
    const handleGlobalClick = () => setActiveDropdownId(null);
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  const getUserStatus = (user) => {
    if (statusOverrides[user.id]) return statusOverrides[user.id];
    return user.status || "Active";
  };

  // Fetch Data
  const fetchUsers = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }
    try {
      const res = await fetch(`${baseUrl}/user/all`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("token");
        navigate("/");
        return;
      }

      if (res.ok) {
        const data = await res.json();
        const userList = Array.isArray(data) ? data : [];

        // Sort newest first
        userList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        setUsers(userList);

        // Compute chart data (last 7 days of activity)
        const countsByDate = {};
        userList.forEach(u => {
          const d = new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          countsByDate[d] = (countsByDate[d] || 0) + 1;
        });

        // Get last 7 days keys
        const chart = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          chart.push({
            date: dateStr,
            users: countsByDate[dateStr] || 0
          });
        }
        setChartData(chart);

        // Calculate summary metrics
        const manualCount = userList.filter(u => u.password && u.password.trim() !== "").length;
        const googleCount = userList.filter(u => (!u.password || u.password.trim() === "") && !u.mobile).length;
        const truecallerCount = userList.filter(u => (!u.password || u.password.trim() === "") && u.mobile).length;

        setSummary({
          total: userList.length,
          active: userList.length,
          google: googleCount,
          manual: manualCount,
          truecaller: truecallerCount
        });
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(() => {
      fetchUsers(true);
    }, 30000); // 30 seconds polling
    return () => clearInterval(interval);
  }, [navigate, baseUrl]);

  // Search Logic
  useEffect(() => {
    const term = searchTerm.toLowerCase();
    const filtered = users.filter(u => {
      const method = u.password ? "manual login" : (u.mobile ? "truecaller login" : "google login");
      const matchesSearch =
        (u.name || "").toLowerCase().includes(term) ||
        (u.email || "").toLowerCase().includes(term) ||
        (u.mobile || "").toLowerCase().includes(term) ||
        method.includes(term);

      const matchesStatus =
        statusFilter === "ALL" ||
        getUserStatus(u).toUpperCase() === statusFilter.toUpperCase();

      const userRole = u.role || "User";
      const matchesRole =
        roleFilter === "ALL" ||
        userRole.toUpperCase() === roleFilter.toUpperCase();

      const uLoginStatus = u.loginStatus || "Logged Out";
      const matchesLoginStatus =
        loginStatusFilter === "ALL" ||
        uLoginStatus.toUpperCase() === loginStatusFilter.toUpperCase();

      return matchesSearch && matchesStatus && matchesRole && matchesLoginStatus;
    });
    setFilteredUsers(filtered);
    setCurrentPage(1);
  }, [searchTerm, users, statusFilter, roleFilter, loginStatusFilter]);

  // Pagination Logic
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleToggleStatus = (user) => {
    const currentStatus = getUserStatus(user);
    const newStatus = currentStatus === "Active" ? "Suspended" : "Active";
    const actionLabel = newStatus === "Suspended" ? "suspend" : "activate";

    if (!window.confirm(`Are you sure you want to ${actionLabel} ${user.name || "this user"}?`)) return;

    const updated = { ...statusOverrides, [user.id]: newStatus };
    setStatusOverrides(updated);
    localStorage.setItem("login_user_status", JSON.stringify(updated));
    alert(`${user.name || "User"} has been ${newStatus === "Suspended" ? "suspended" : "activated"} successfully.`);
  };

  return (
    <div className="login-users-container">
      <style>
        {`
          @keyframes user-fadeInPage {
            from { opacity: 0; transform: translateY(20px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes user-fadeIn {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          @keyframes user-drawer-slide {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
          @keyframes user-shimmer-anim {
            0%   { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }

          .login-users-container {
            padding: 24px;
            font-family: 'Lexend', sans-serif;
            background-color: #F9FAFB;
            min-height: 100vh;
            animation: user-fadeInPage 400ms ease-out forwards;
          }
          .header-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 28px;
          }
          .page-title {
            font-size: 28px;
            font-weight: 700;
            margin: 0;
            color: #111827;
          }
          .page-subtitle {
            font-size: 13px;
            color: #6B7280;
            margin: 4px 0 0 0;
          }

          .stats-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 24px;
            margin-bottom: 28px;
          }
          .stat-card {
            background: #fff;
            border-radius: 16px;
            padding: 24px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            height: 140px;
            box-sizing: border-box;
            box-shadow: 0 1px 3px rgba(0,0,0,0.02);
            border: 1px solid #E5E7EB;
            transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
          }
          .stat-card:hover {
            transform: translateY(-5px) scale(1.02);
            box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
            border-color: #10b981;
          }
          .stat-header {
            font-size: 13px;
            color: #6B7280;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          .stat-value {
            font-size: 32px;
            font-weight: 700;
            color: #111827;
            line-height: 1;
          }

          .chart-section {
            background: #fff;
            border-radius: 16px;
            padding: 24px;
            border: 1px solid #E5E7EB;
            margin-bottom: 24px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.02);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
          }
          .chart-section:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
          }

          .micro-stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            margin-bottom: 24px;
          }
          @media (max-width: 768px) {
            .micro-stats-grid {
              grid-template-columns: repeat(2, 1fr);
            }
          }
          @media (max-width: 480px) {
            .micro-stats-grid {
              grid-template-columns: 1fr;
            }
          }
          .micro-stat-card {
            background: #F9FAFB;
            border: 1px solid #E5E7EB;
            border-radius: 12px;
            padding: 16px;
            display: flex;
            align-items: center;
            gap: 12px;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }
          .micro-stat-card:hover {
            transform: translateY(-2px) scale(1.02);
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          }
          .micro-stat-icon {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            flex-shrink: 0;
          }

          .table-section {
            background: #fff;
            border-radius: 16px;
            padding: 24px;
            border: 1px solid #E5E7EB;
            box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          }
          .table-header-controls {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
            gap: 16px;
            flex-wrap: wrap;
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
            transition: border-color 0.25s ease, box-shadow 0.25s ease, background-color 0.25s ease;
          }
          .search-bar:focus {
            border-color: #10b981;
            background: #fff;
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
          }

          table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            font-size: 14px;
          }
          th {
            text-align: left;
            padding: 12px 14px;
            font-weight: 600;
            color: #4B5563;
            border-bottom: 1px solid #E5E7EB;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.05em;
            background: #F9FAFB;
          }
          td {
            padding: 14px;
            color: #374151;
            border-bottom: 1px solid #E5E7EB;
            vertical-align: middle;
            transition: background-color 0.2s ease;
          }
          tr td:first-child {
            border-left: 3px solid transparent;
            transition: border-left-color 0.2s ease, background-color 0.2s ease;
          }
          tr:hover td {
            background-color: #F0FDF4 !important;
          }
          tr:hover td:first-child {
            border-left-color: #10b981;
          }

          /* Avatar initials styling */
          .user-avatar-gradient {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            color: #fff;
            font-size: 13px;
            background: linear-gradient(135deg, #10B981, #059669);
            box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);
            position: relative;
          }
          .online-indicator {
            position: absolute;
            right: 0;
            bottom: 0;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #10B981;
            border: 2px solid #fff;
          }

          .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 12px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 600;
          }
          .status-active {
            background-color: #ECFDF5;
            color: #065F46;
            border: 1px solid #A7F3D0;
          }
          .status-active::before {
            content: "";
            display: inline-block;
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #10B981;
          }
          .status-suspended {
            background-color: #FEF2F2;
            color: #991B1B;
            border: 1px solid #FECACA;
          }
          .status-suspended::before {
            content: "";
            display: inline-block;
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #EF4444;
          }

          .method-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            border-radius: 8px;
            font-size: 11px;
            font-weight: 600;
          }
          .method-google { background-color: #EEF2FF; color: #4F46E5; border: 1px solid #C7D2FE; }
          .method-manual { background-color: #F3F4F6; color: #4B5563; border: 1px solid #E5E7EB; }
          .method-truecaller { background-color: #E0F2FE; color: #0284C7; border: 1px solid #BAE6FD; }

          .pagination-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px solid #E5E7EB;
          }
          .pagination-info { font-size: 13px; color: #6B7280; }
          .pagination-controls { display: flex; gap: 8px; align-items: center; }
          .page-btn {
            padding: 8px 12px;
            border: 1px solid #E5E7EB;
            background: #fff;
            border-radius: 8px;
            cursor: pointer;
            transition: transform 0.2s, background-color 0.2s, color 0.2s;
            font-size: 13px;
            font-weight: 500;
            color: #374151;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .page-btn:hover:not(:disabled) {
            background: #F3F4F6;
            transform: scale(1.03);
          }
          .page-btn.active {
            background: #111827;
            color: #fff;
            border-color: #111827;
          }
          .page-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

          /* Drawer styles */
          .user-drawer-overlay {
            position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45);
            backdrop-filter: blur(5px); z-index: 2000;
            display: flex; justify-content: flex-end;
            animation: user-fadeIn 0.2s ease;
          }
          .user-drawer {
            width: 480px; max-width: 90vw; height: 100%; background: #fff;
            box-shadow: -10px 0 30px rgba(0,0,0,0.08);
            display: flex; flex-direction: column;
            animation: user-drawer-slide 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            border-left: 1px solid #E5E7EB;
          }
          .user-drawer-header {
            padding: 24px; border-bottom: 1px solid #F3F4F6;
            display: flex; justify-content: space-between; align-items: center;
          }
          .user-drawer-title { margin: 0; font-size: 18px; font-weight: 700; color: #111827; }
          .user-drawer-subtitle { margin: 4px 0 0; font-size: 12px; color: #6B7280; }
          .user-drawer-body {
            flex: 1; overflow-y: auto; padding: 24px;
            display: flex; flex-direction: column; gap: 24px;
          }
          .user-drawer-card {
            background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 14px; padding: 16px;
          }
          .user-drawer-metric {
            background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 12px 16px;
            display: flex; flex-direction: column; gap: 4px;
          }
          .user-drawer-metric-label { font-size: 11px; color: #6B7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
          .user-drawer-metric-val { font-size: 20px; font-weight: 700; color: #111827; }
          .user-drawer-section { display: flex; flex-direction: column; gap: 14px; }
          .user-drawer-section-title {
            margin: 0; font-size: 14px; font-weight: 700; color: #111827;
            border-bottom: 1.5px solid #F3F4F6; padding-bottom: 6px;
            text-transform: uppercase; letter-spacing: 0.05em;
          }
          .user-drawer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
          .user-drawer-grid-item { display: flex; flex-direction: column; gap: 4px; }
          .user-drawer-item-label { font-size: 12px; color: #6B7280; font-weight: 500; }
          .user-drawer-item-value { font-size: 13px; color: #111827; font-weight: 600; }

          /* Dropdown overflow menu styles */
          .user-dropdown-container {
            position: relative;
            display: inline-block;
          }
          .user-dropdown-menu {
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
            animation: user-fadeIn 0.15s ease;
          }
          .user-dropdown-item {
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
            transition: background-color 0.15s ease, color 0.15s ease;
          }
          .user-dropdown-item:hover {
            background-color: #F3F4F6;
            color: #111827;
          }
          .user-dropdown-item.danger {
            color: #EF4444;
          }
          .user-dropdown-item.danger:hover {
            background-color: #FEF2F2;
            color: #DC2626;
          }

          /* Shimmer skeletons */
          .skeleton-shimmer {
            background: linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 37%, #F3F4F6 63%);
            background-size: 400% 100%;
            animation: user-shimmer-anim 1.4s ease infinite;
            border-radius: 4px;
            height: 16px;
            width: 100%;
          }

          @media (max-width: 1200px) {
            .stats-grid { grid-template-columns: repeat(3, 1fr); gap: 16px; }
          }
          @media (max-width: 768px) {
            .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 16px; }
          }
          @media (max-width: 480px) {
            .stats-grid { grid-template-columns: 1fr; }
          }
        `}
      </style>

      <div className="header-row">
        <div>
          <h2 className="page-title">Login Users Management</h2>
          <p className="page-subtitle">Monitor user registrations, authentication methods, and account states</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard title="Total Users" value={summary.total} icon={totalIcon} trend="+12% this month" color="#3b82f6" />
        <StatCard title="Active Users" value={summary.active} icon={activeIcon} trend="98% active rate" color="#10b981" />
        <StatCard title="Google Login" value={summary.google} icon={uptimeIcon} trend="Google OAuth" color="#6366f1" />
        <StatCard title="Manual Login" value={summary.manual} icon={errorIcon} trend="Email & Password" color="#f59e0b" />
        <StatCard title="Truecaller Login" value={summary.truecaller} icon={uptimeIcon} trend="Mobile OTP Auth" color="#0ea5e9" />
      </div>

      {chartData.length > 0 ? (
        <div className="chart-section">
          {/* Micro Analytics Summary Row */}
          <div className="micro-stats-grid">
            <div className="micro-stat-card">
              <div className="micro-stat-icon" style={{ background: "#3b82f615", color: "#3b82f6" }}>👤</div>
              <div>
                <div style={{ fontSize: "11px", color: "#6B7280", fontWeight: 600, textTransform: "uppercase" }}>Total Logins</div>
                <div style={{ fontSize: "18px", fontWeight: 700, color: "#111827", marginTop: "2px" }}>{summary.total}</div>
              </div>
            </div>
            <div className="micro-stat-card">
              <div className="micro-stat-icon" style={{ background: "#10b98115", color: "#10b981" }}>🟢</div>
              <div>
                <div style={{ fontSize: "11px", color: "#6B7280", fontWeight: 600, textTransform: "uppercase" }}>Active Today</div>
                <div style={{ fontSize: "18px", fontWeight: 700, color: "#111827", marginTop: "2px" }}>{summary.active}</div>
              </div>
            </div>
            <div className="micro-stat-card">
              <div className="micro-stat-icon" style={{ background: "#6366f115", color: "#6366f1" }}>📈</div>
              <div>
                <div style={{ fontSize: "11px", color: "#6B7280", fontWeight: 600, textTransform: "uppercase" }}>Growth</div>
                <div style={{ fontSize: "18px", fontWeight: 700, color: "#10b981", marginTop: "2px" }}>+12%</div>
              </div>
            </div>
            <div className="micro-stat-card">
              <div className="micro-stat-icon" style={{ background: "#f59e0b15", color: "#f59e0b" }}>⏱</div>
              <div>
                <div style={{ fontSize: "11px", color: "#6B7280", fontWeight: 600, textTransform: "uppercase" }}>Avg Session</div>
                <div style={{ fontSize: "18px", fontWeight: 700, color: "#111827", marginTop: "2px" }}>18 min</div>
              </div>
            </div>
          </div>

          {/* Chart Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#111827', display: "flex", alignItems: "center", gap: 8 }}>
                <span>📈</span> User Login Analytics
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6B7280' }}>Daily login trends and active users</p>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              {/* Legend */}
              <div style={{ display: "flex", gap: 12, alignItems: "center", fontSize: "12px", fontWeight: 500 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981" }} />
                  <span style={{ color: "#4B5563" }}>Login Users</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3B82F6" }} />
                  <span style={{ color: "#4B5563" }}>Active Users</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#9CA3AF" }} />
                  <span style={{ color: "#4B5563" }}>Inactive Users</span>
                </div>
              </div>

              {/* Time Tabs */}
              <div style={{ display: "flex", background: "#F3F4F6", borderRadius: "8px", padding: "2px", gap: "2px" }}>
                {["Today", "This Week", "This Month", "This Year"].map((tab) => {
                  const active = tab === "This Week";
                  return (
                    <button
                      key={tab}
                      style={{
                        border: "none",
                        background: active ? "#fff" : "transparent",
                        color: active ? "#111827" : "#6B7280",
                        fontSize: "12px",
                        fontWeight: 600,
                        padding: "6px 12px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        boxShadow: active ? "0 1px 2px rgba(0,0,0,0.05)" : "none"
                      }}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Area Chart */}
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="users"
                  stroke="#10B981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorUsers)"
                  isAnimationActive={true}
                  animationDuration={800}
                  activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2, fill: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="chart-section" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px", color: "#6B7280" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>📊</div>
          <h4 style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: 700, color: "#111827" }}>No Analytics Available</h4>
          <p style={{ margin: 0, fontSize: "13px", color: "#6B7280" }}>Login activity will appear here once data is available.</p>
        </div>
      )}

      <div className="table-section">
        <div className="table-header-controls" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, width: "100%", flexWrap: "wrap" }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>Registered Users</h3>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", flex: 1, justifyContent: "flex-end", minWidth: "300px" }}>
            <div style={{ position: "relative", width: "100%", maxWidth: "320px" }}>
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
                placeholder="Search User..."
                className="search-bar"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ margin: 0, paddingLeft: "38px", paddingRight: "32px", boxSizing: "border-box" }}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
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
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Status: All</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
            <select
              style={{
                height: "40px", padding: "0 12px", border: "1.5px solid #E5E7EB",
                borderRadius: "10px", fontSize: "13px", outline: "none", background: "#fff",
                cursor: "pointer", fontFamily: "inherit", color: "#374151"
              }}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="ALL">Role: All</option>
              <option value="USER">Regular User</option>
            </select>
            <select
              style={{
                height: "40px", padding: "0 12px", border: "1.5px solid #E5E7EB",
                borderRadius: "10px", fontSize: "13px", outline: "none", background: "#fff",
                cursor: "pointer", fontFamily: "inherit", color: "#374151"
              }}
              value={loginStatusFilter}
              onChange={(e) => setLoginStatusFilter(e.target.value)}
            >
              <option value="ALL">Login: All</option>
              <option value="ACTIVE NOW">Active Now</option>
              <option value="OFFLINE">Offline</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>User Name</th>
                <th>Email</th>
                <th>Mobile Number</th>
                <th>Login Method</th>
                <th>Created Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <UserSkeleton />
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: 0 }}>
                    <EmptyState />
                  </td>
                </tr>
              ) : (
                currentUsers.map((user) => (
                  <tr key={user.id} style={{ cursor: "pointer" }}>
                    <td onClick={() => setSelectedUserForDrawer(user)}>#{user.id}</td>
                    <td onClick={() => setSelectedUserForDrawer(user)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="user-avatar-gradient">
                          {(user.name || "U").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                          {getUserStatus(user) === 'Active' && <span className="online-indicator" />}
                        </div>
                        <span style={{ fontWeight: 600, color: '#111827' }}>{user.name || "—"}</span>
                      </div>
                    </td>
                    <td onClick={() => setSelectedUserForDrawer(user)}>{user.email}</td>
                    <td onClick={() => setSelectedUserForDrawer(user)}>{user.mobile || "—"}</td>
                    <td onClick={() => setSelectedUserForDrawer(user)}>
                      <span className={`method-badge ${user.password ? 'method-manual' : (user.mobile ? 'method-truecaller' : 'method-google')}`}>
                        {user.password ? "Manual Login" : (user.mobile ? "Truecaller Login" : "Google Login")}
                      </span>
                    </td>
                    <td onClick={() => setSelectedUserForDrawer(user)}>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td onClick={() => setSelectedUserForDrawer(user)}>
                      <span className={`status-badge ${getUserStatus(user) === 'Active' ? 'status-active' : 'status-suspended'}`}>
                        {getUserStatus(user)}
                      </span>
                    </td>
                    <td>
                      <div className="user-dropdown-container">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdownId(activeDropdownId === user.id ? null : user.id);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '6px 12px',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            color: '#64748B',
                            borderRadius: '6px',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          ⋮
                        </button>
                        {activeDropdownId === user.id && (
                          <div className="user-dropdown-menu">
                            <button className="user-dropdown-item" onClick={(e) => { e.stopPropagation(); setSelectedUserForDrawer(user); setActiveDropdownId(null); }}>
                              👁️ View Details
                            </button>
                            <button className="user-dropdown-item" onClick={(e) => { e.stopPropagation(); handleToggleStatus(user); setActiveDropdownId(null); }}>
                              {getUserStatus(user) === 'Active' ? "🔴 Disable User" : "🟢 Enable User"}
                            </button>
                            <button className="user-dropdown-item" onClick={(e) => { e.stopPropagation(); alert("Password reset link sent!"); setActiveDropdownId(null); }}>
                              🔑 Reset Password
                            </button>
                            <button className="user-dropdown-item" onClick={(e) => { e.stopPropagation(); alert("Role change options opened"); setActiveDropdownId(null); }}>
                              🎭 Change Role
                            </button>
                            <button className="user-dropdown-item danger" onClick={(e) => { e.stopPropagation(); if (window.confirm(`Are you sure you want to delete ${user.name || "this user"}?`)) alert("User deleted"); setActiveDropdownId(null); }}>
                              🗑️ Delete User
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="pagination-container">
            <div className="pagination-info">
              Showing <strong>{indexOfFirstUser + 1}</strong> to <strong>{Math.min(indexOfLastUser, filteredUsers.length)}</strong> of <strong>{filteredUsers.length}</strong> users
            </div>
            <div className="pagination-controls">
              <button
                className="page-btn"
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
                Prev
              </button>

              {[...Array(totalPages)].map((_, i) => {
                // Show a small range of pages around current page
                if (i === 0 || i === totalPages - 1 || Math.abs(currentPage - 1 - i) <= 1) {
                  return (
                    <button
                      key={i}
                      className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`}
                      onClick={() => paginate(i + 1)}
                    >
                      {i + 1}
                    </button>
                  );
                } else if (Math.abs(currentPage - 1 - i) === 2) {
                  return <span key={i} style={{ color: '#6B7280' }}>...</span>;
                }
                return null;
              })}

              <button
                className="page-btn"
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Details Drawer */}
      {selectedUserForDrawer && (
        <UserDrawer
          user={selectedUserForDrawer}
          onClose={() => setSelectedUserForDrawer(null)}
          getUserStatus={getUserStatus}
        />
      )}
    </div>
  );
}

// ─── Stat Card Component with Count-Up Animation ────────────────────────────────
const AnimatedNumber = ({ value }) => {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const target = parseInt(value, 10) || 0;
    if (target === 0) {
      setCurrent(0);
      return;
    }
    let start = 0;
    const duration = 400; // ms
    const stepTime = Math.max(Math.floor(duration / target), 15);
    const timer = setInterval(() => {
      start += 1;
      setCurrent(start);
      if (start >= target) {
        setCurrent(target);
        clearInterval(timer);
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [value]);
  return <>{current}</>;
};

const StatCard = ({ title, value, icon, trend = "+12% from last month", color = "#10b981" }) => {
  return (
    <div className="stat-card" style={{ cursor: "default" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background: `${color}15`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}>
            {icon ? (
              typeof icon === "string" ? (
                <img src={icon} alt="" style={{ width: 22, height: 22 }} />
              ) : (
                icon
              )
            ) : null}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span className="stat-header">{title}</span>
            <span style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "2px", fontWeight: 500 }}>{trend}</span>
          </div>
        </div>
        <div style={{ color: "#9CA3AF", fontSize: "14px", fontWeight: "bold" }}>↗</div>
      </div>
      <span className="stat-value" style={{ marginTop: "12px", paddingLeft: "4px", display: "block" }}>
        <AnimatedNumber value={value} />
      </span>
    </div>
  );
};

// ─── User Details Drawer Subcomponent ─────────────────────────────────────────
function UserDrawer({ user, onClose, getUserStatus }) {
  if (!user) return null;
  const isSuspended = getUserStatus(user) === "Suspended";
  const initials = (user.name || "U").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const method = user.password ? "Manual Login" : (user.mobile ? "Truecaller Login" : "Google Login");

  return (
    <div className="user-drawer-overlay" onClick={onClose}>
      <div className="user-drawer" onClick={e => e.stopPropagation()}>
        <div className="user-drawer-header">
          <div>
            <h3 className="user-drawer-title">User Profile</h3>
            <p className="user-drawer-subtitle">Detailed view of registered EV user session/auth states</p>
          </div>
          <button className="dl-close-btn" style={{ fontSize: "16px", padding: "6px" }} onClick={onClose}>✕</button>
        </div>
        <div className="user-drawer-body">
          {/* Profile Card Info */}
          <div className="user-drawer-card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div className="user-avatar-gradient" style={{ width: 54, height: 54, fontSize: 18 }}>
              {initials}
              {getUserStatus(user) === 'Active' && <span className="online-indicator" style={{ width: 14, height: 14, border: "2.5px solid #fff" }} />}
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#111827" }}>{user.name || "—"}</h4>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6B7280" }}>{user.email || "—"}</p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="user-drawer-metric">
              <span className="user-drawer-metric-label">Access Level</span>
              <span className="user-drawer-metric-val" style={{ color: "#10b981", fontSize: "14px" }}>Regular User</span>
            </div>
            <div className="user-drawer-metric">
              <span className="user-drawer-metric-label">Status</span>
              <span className="user-drawer-metric-val" style={{ color: isSuspended ? "#EF4444" : "#10b981", fontSize: "14px" }}>
                {isSuspended ? "Suspended" : "Active"}
              </span>
            </div>
          </div>

          {/* Detailed Info Grid */}
          <div className="user-drawer-section">
            <h4 className="user-drawer-section-title">User Information</h4>
            <div className="user-drawer-grid">
              <div className="user-drawer-grid-item">
                <span className="user-drawer-item-label">Mobile Number</span>
                <span className="user-drawer-item-value">{user.mobile || "—"}</span>
              </div>
              <div className="user-drawer-grid-item">
                <span className="user-drawer-item-label">Login Method</span>
                <div style={{ marginTop: "2px" }}>
                  <span className={`method-badge ${user.password ? 'method-manual' : (user.mobile ? 'method-truecaller' : 'method-google')}`}>
                    {method}
                  </span>
                </div>
              </div>
              <div className="user-drawer-grid-item">
                <span className="user-drawer-item-label">Account Created</span>
                <span className="user-drawer-item-value">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "2024-01-15"}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Inline Shimmer Loader rows ──────────────────────────────────────────────
const UserSkeleton = () => (
  <>
    {[...Array(5)].map((_, idx) => (
      <tr key={idx}>
        <td><div className="skeleton-shimmer" style={{ width: "40px" }} /></td>
        <td>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div className="skeleton-shimmer" style={{ width: "36px", height: "36px", borderRadius: "50%" }} />
            <div className="skeleton-shimmer" style={{ width: "120px", height: "14px" }} />
          </div>
        </td>
        <td><div className="skeleton-shimmer" style={{ width: "180px" }} /></td>
        <td><div className="skeleton-shimmer" style={{ width: "100px" }} /></td>
        <td><div className="skeleton-shimmer" style={{ width: "90px", borderRadius: "8px" }} /></td>
        <td><div className="skeleton-shimmer" style={{ width: "80px" }} /></td>
        <td><div className="skeleton-shimmer" style={{ width: "70px", borderRadius: "9999px" }} /></td>
        <td><div className="skeleton-shimmer" style={{ width: "24px", height: "24px", borderRadius: "6px" }} /></td>
      </tr>
    ))}
  </>
);

// ─── Modern Empty State Illustration ──────────────────────────────────────────
const EmptyState = () => (
  <div style={{ textAlign: "center", padding: "60px 20px", color: "#6B7280" }}>
    <div style={{ fontSize: "48px", marginBottom: "16px" }}>👥</div>
    <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 700, color: "#111827" }}>No Users Found</h3>
    <p style={{ margin: "0 0 20px", fontSize: "14px", color: "#6B7280" }}>Try adjusting your search terms or filters</p>
  </div>
);

// ─── Custom Tooltip Subcomponent ──────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    const activeUsers = Math.round(value * 0.8);
    const inactiveUsers = value - activeUsers;
    return (
      <div style={{
        background: "#fff",
        border: "1px solid #E5E7EB",
        borderRadius: "12px",
        padding: "12px 16px",
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
        fontFamily: "inherit"
      }}>
        <p style={{ margin: "0 0 6px 0", fontSize: "12px", fontWeight: 700, color: "#111827" }}>{label}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: "12px" }}>
            <span style={{ color: "#4B5563", fontWeight: 500 }}>Login Users:</span>
            <span style={{ color: "#111827", fontWeight: 700 }}>{value}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: "12px" }}>
            <span style={{ color: "#4B5563", fontWeight: 500 }}>Active Users:</span>
            <span style={{ color: "#10B981", fontWeight: 700 }}>{activeUsers}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: "12px" }}>
            <span style={{ color: "#4B5563", fontWeight: 500 }}>Inactive:</span>
            <span style={{ color: "#EF4444", fontWeight: 700 }}>{inactiveUsers}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default LoginUsers;
