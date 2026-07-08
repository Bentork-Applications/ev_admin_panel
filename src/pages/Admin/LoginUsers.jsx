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
      return u.name?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term) ||
        u.mobile?.toLowerCase().includes(term) ||
        method.includes(term);
    });
    setFilteredUsers(filtered);
    setCurrentPage(1);
  }, [searchTerm, users]);

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
          .login-users-container { padding: 24px; font-family: 'Roboto', sans-serif; background-color: #F8F9FA; min-height: 100vh; }
          .header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
          .page-title { font-size: 28px; font-weight: 500; margin: 0; font-family: 'Lexend', sans-serif; color: #111; }
          
          .stats-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 20px; margin-bottom: 24px; }
          .stat-card { background: #fff; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; box-shadow: 0 2px 4px rgba(0,0,0,0.02); border: 1px solid #E5E7EB; }
          .stat-header { font-size: 13px; color: #6B7280; font-weight: 500; margin-bottom: 12px; }
          .stat-value { font-size: 32px; font-weight: 700; color: #111; font-family: 'Lexend', sans-serif; margin-bottom: 4px; }
          
          .table-section { background: #fff; border-radius: 16px; padding: 24px; border: 1px solid #E5E7EB; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }
          .table-header-controls { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
          .search-bar { width: 100%; max-width: 350px; padding: 12px 20px; border: 1.5px solid #E5E7EB; border-radius: 12px; font-size: 14px; outline: none; transition: border-color 0.2s, box-shadow 0.2s; background: #F9FAFB; }
          .search-bar:focus { border-color: #4F46E5; background: #fff; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1); }
          
          table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 14px; }
          th { text-align: left; padding: 16px 20px; font-weight: 600; color: #6B7280; border-bottom: 1px solid #E5E7EB; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em; }
          td { padding: 16px 20px; color: #111827; border-bottom: 1px solid #F3F4F6; vertical-align: middle; }
          tr { transition: background-color 0.2s; }
          tr:hover td { background-color: #F9FAFB; }
          
          .status-badge { display: inline-flex; align-items: center; padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; }
          .status-active { background-color: #ECFDF5; color: #059669; border: 1px solid #A7F3D0; }
          .status-suspended { background-color: #FEF2F2; color: #991B1B; border: 1px solid #FECACA; }
          .method-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; }
          .method-google { background-color: #EEF2FF; color: #4F46E5; border: 1px solid #C7D2FE; }
          .method-manual { background-color: #F3F4F6; color: #4B5563; border: 1px solid #E5E7EB; }
          .method-truecaller { background-color: #E0F2FE; color: #0284C7; border: 1px solid #BAE6FD; }
          
          .pagination-container { display: flex; justify-content: space-between; align-items: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #E5E7EB; }
          .pagination-info { font-size: 13px; color: #6B7280; }
          .pagination-controls { display: flex; gap: 8px; align-items: center; }
          .page-btn { padding: 8px 12px; border: 1px solid #E5E7EB; background: #fff; border-radius: 8px; cursor: pointer; transition: all 0.2s; font-size: 13px; font-weight: 500; color: #374151; display: flex; align-items: center; gap: 6px; }
          .page-btn:hover:not(:disabled) { background: #F3F4F6; }
          .page-btn.active { background: #4F46E5; color: #fff; border-color: #4F46E5; }
          .page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
          
          @media (max-width: 1024px) {
            .stats-grid { grid-template-columns: repeat(2, 1fr); }
          }
          @media (max-width: 640px) {
            .stats-grid { grid-template-columns: 1fr; }
            .header-row { flex-direction: column; align-items: flex-start; gap: 16px; }
            .table-section { overflow-x: auto; }
          }
        `}
      </style>

      <div className="header-row">
        <h2 className="page-title">Login Users Management</h2>
      </div>

      <div className="stats-grid">
        <StatCard title="Total Users" value={summary.total} icon={totalIcon} />
        <StatCard title="Active Users" value={summary.active} icon={activeIcon} />
        <StatCard title="Google Login" value={summary.google} icon={uptimeIcon} />
        <StatCard title="Manual Login" value={summary.manual} icon={errorIcon} />
        <StatCard title="Truecaller Login" value={summary.truecaller} icon={uptimeIcon} />
      </div>

      {chartData.length > 0 && (
        <div className="chart-section" style={{ background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #E5E7EB', marginBottom: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111' }}>User Registrations (Last 7 Days)</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6B7280' }}>Daily breakdown of new user signups.</p>
          </div>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  cursor={{ stroke: '#E5E7EB', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area type="monotone" dataKey="users" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="table-section">
        <div className="table-header-controls">
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111' }}>Registered Users</h3>
          <input
            type="text"
            placeholder="Search by Name, Email, Mobile or Method..."
            className="search-bar"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : (
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
                {currentUsers.map((user) => (
                  <tr key={user.id}>
                    <td>#{user.id}</td>
                    <td style={{ fontWeight: 500 }}>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.mobile || "N/A"}</td>
                    <td>
                      <span className={`method-badge ${user.password ? 'method-manual' : (user.mobile ? 'method-truecaller' : 'method-google')}`}>
                        {user.password ? "Manual Login" : (user.mobile ? "Truecaller Login" : "Google Login")}
                      </span>
                    </td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>
                      <span className={`status-badge ${getUserStatus(user) === 'Active' ? 'status-active' : 'status-suspended'}`}>
                        {getUserStatus(user)}
                      </span>
                    </td>
                    <td>
                      <button
                        style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.8 }}
                        title={getUserStatus(user) === 'Active' ? 'Suspend User' : 'Activate User'}
                        onClick={() => handleToggleStatus(user)}
                      >
                        {getUserStatus(user) === 'Active' ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="7 13 10 16 17 9" /></svg>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ textAlign: "center", padding: "40px", color: "#6B7280" }}>
                      No users found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

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
    </div>
  );
}

const StatCard = ({ title, value, icon }) => (
  <div className="stat-card">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div className="stat-header">{title}</div>
        <div className="stat-value">{value}</div>
      </div>
      <img src={icon} alt="" style={{ width: 24, height: 24, opacity: 0.6 }} />
    </div>
  </div>
);

export default LoginUsers;
