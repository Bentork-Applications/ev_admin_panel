import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import StaffSummaryCards from "../../components/card/StaffSummaryCards";
import editIcon from "../../assets/icons/stafficon/edit.svg";
import AddStaffForm from "./form/AddStaffForm";
import StaffEditForm from "./form/staffedit";

const LoadingSpinner = () =>
  <div style={{ textAlign: 'center', padding: '50px' }}>
    Loading...
  </div>;

const ErrorDisplay = ({ message }) =>
  <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>
    {message}
  </div>;




const roleStyles = {
  Admin: { background: "#D1FAE5", color: "#065F46" },
  Dealer: { background: "#DBEAFE", color: "#1E40AF" },
  DEFAULT: { background: "#F3F4F6", color: "#4B5563" },
};

function PageAccessDropdown({ staff }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(() => {
    const stored = localStorage.getItem("staff_page_access_" + staff.email);
    if (stored) {
      return JSON.parse(stored);
    }
    // Default pages for ADMIN_STAFF
    return ["batteries", "warranty-claims", "maintenance", "support-requests"];
  });
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = (path) => {
    let updated;
    if (selected.includes(path)) {
      updated = selected.filter(p => p !== path);
    } else {
      updated = [...selected, path];
    }
    setSelected(updated);
    localStorage.setItem("staff_page_access_" + staff.email, JSON.stringify(updated));
  };

  const AVAILABLE_PAGES = [
    { name: "Battery Inventory", path: "batteries" },
    { name: "Warranty Claims", path: "warranty-claims" },
    { name: "Stations & Locations", path: "stations" },
    { name: "Charger & QR Management", path: "charger" },
    { name: "Sessions & Bookings", path: "sessions" },
    { name: "Slot Management", path: "slot" },
    { name: "Slot Bookings", path: "slot-bookings" },
    { name: "Users & RFID Cards", path: "users" },
    { name: "Login Users", path: "login-users" },
    { name: "Plans", path: "plans" },
    { name: "Revenue & Transactions", path: "revenue" },
    { name: "Maintenance & Emergency", path: "maintenance" },
    { name: "Raise Request", path: "support-requests" },
    { name: "Admin Staff", path: "staff" },
    { name: "Dealers Management", path: "dealers" },
    { name: "Café Configuration", path: "cafes" },
    { name: "Order Tracking", path: "orders" },
  ];

  const getDisplayText = () => {
    if (selected.length === 0) return "No access";
    if (selected.length === AVAILABLE_PAGES.length) return "All Pages";
    if (selected.length <= 2) {
      return selected
        .map(path => AVAILABLE_PAGES.find(p => p.path === path)?.name || path)
        .join(", ");
    }
    return `${selected.length} Pages Selected`;
  };

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-block", width: "170px" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          padding: "8px 12px",
          background: "#fff",
          border: "1px solid #ddd",
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          fontSize: "12px",
          fontWeight: "500",
          color: selected.length === 0 ? "#888" : "#111",
          textAlign: "left",
          transition: "all 0.2s ease"
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: "4px" }}>
          {getDisplayText()}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#666"
          strokeWidth="2"
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
            flexShrink: 0
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "105%",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #e0e0e0",
            borderRadius: "12px",
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
            zIndex: 1000,
            maxHeight: "220px",
            overflowY: "auto",
            padding: "6px"
          }}
        >
          {AVAILABLE_PAGES.map((page) => {
            const isChecked = selected.includes(page.path);
            return (
              <label
                key={page.path}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "500",
                  color: isChecked ? "#111" : "#555",
                  background: isChecked ? "#f0fdf4" : "transparent",
                  transition: "all 0.15s ease",
                  marginBottom: "2px",
                  userSelect: "none"
                }}
                onMouseEnter={(e) => {
                  if (!isChecked) e.currentTarget.style.background = "#f5f5f5";
                }}
                onMouseLeave={(e) => {
                  if (!isChecked) e.currentTarget.style.background = "transparent";
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleToggle(page.path)}
                  style={{
                    width: "14px",
                    height: "14px",
                    accentColor: "#10b981",
                    cursor: "pointer"
                  }}
                />
                {page.name}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AdminStaff({ baseUrl: propBaseUrl }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [staffData, setStaffData] = useState([]);
  const [summaryStats, setSummaryStats] = useState({ admins: 0, dealers: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(null);

  useEffect(() => {
    if (location.state?.openAddForm) {
      setIsFormOpen("add");
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);
  const [editingStaff, setEditingStaff] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const getStaffStatus = (staff) => {
    return staff.active !== false ? "Active" : "Suspended";
  };

  const baseUrl = propBaseUrl || import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchAllStaffData();
  }, [navigate]);

  const fetchAllStaffData = async () => {
    setLoading(true);
    setError(null);

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    try {
      const res = await fetch(baseUrl + "/admin/alladmin", { headers });
      if (res.status === 401 || res.status === 403) throw new Error('Auth failed');
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const records = await res.json();
      const list = Array.isArray(records) ? records : [];
      setStaffData(list);

      const adminsCount = list.filter(a => a.role === "ADMIN" || a.role === "admin").length;
      const staffCount = list.filter(a => a.role === "ADMIN_STAFF" || a.role === "admin_staff").length;
      setSummaryStats({
        admins: adminsCount,
        staff: staffCount
      });
    } catch (err) {
      console.error("Failed to fetch records:", err);
      if (err.message === 'Auth failed') {
        localStorage.removeItem("token");
        navigate("/");
      }
    } finally {
      setLoading(false);
    }
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
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        alert(`${staff.name || "Staff member"} has been deleted successfully.`);
        fetchAllStaffData();
      } else {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to delete staff member");
      }
    } catch (err) {
      console.error("Delete staff error:", err);
      alert("Error: " + err.message);
    }
  };

  const closeForm = () => {
    setIsFormOpen(null);
    setEditingStaff(null);
    fetchAllStaffData();
  };

  const filteredStaff = staffData
    .filter(staff => staff.role?.toUpperCase() !== "DEALER")
    .filter(staff =>
      staff.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "#f1f1f1", position: "relative" }}>
      <style>{`
        .management-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
          font-family: 'Lexend', sans-serif;
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
          margin: 0;
        }
        .header-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .icon-btn {
          background: #fff;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 8px;
          cursor: pointer;
        }
        .profile-chip {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #fff;
          padding: 6px 12px;
          border-radius: 24px;
          border: 1px solid #e0e0e0;
        }
        .directory-box {
          background: #fff;
          border-radius: 24px;
          padding: 24px;
          margin-top: 24px;
          border: 1px solid #eee;
        }
        .search-bar {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid #ddd;
          border-radius: 12px;
          margin: 20px 0;
          font-size: 14px;
        }
        .staff-table {
          width: 100%;
          border-collapse: collapse;
        }
        .staff-table th {
          text-align: left;
          padding: 12px;
          color: #111;
          font-weight: 600;
          font-size: 14px;
        }
        .staff-table td {
          padding: 16px 12px;
          border-bottom: 1px solid #f9f9f9;
          font-size: 14px;
        }
        .role-pill {
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }
        .action-btns {
          display: flex;
          gap: 12px;
        }
        .side-buttons {
          position: fixed;
          bottom: 24px;
          left: 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          z-index: 100;
        }
        .add-btn {
          background: #111;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          width: 160px;
          text-align: center;
        }
      `}</style>

      <div className="management-container">
        <div className="header-row">
          <div className="header-left">
            <h2>Management Console</h2>
          </div>
          <button className="add-btn" style={{ width: "auto", background: "#111", color: "white" }} onClick={() => setIsFormOpen("add")}>Add Staff</button>
        </div>

        <StaffSummaryCards stats={{ admins: summaryStats.admins, staff: summaryStats.staff }} />

        <div className="directory-box">
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Staff Directory</h3>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#666' }}>View and manage staff members and their permissions</p>

          <input
            type="text"
            placeholder="Search"
            className="search-bar"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {loading ? <LoadingSpinner /> : error ? <ErrorDisplay message={error} /> : (
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th>Page Access</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((staff) => {
                  const style = roleStyles[staff.role] || (staff.role?.includes('DEALER') ? roleStyles.Dealer : roleStyles.DEFAULT);
                  return (
                    <tr key={staff.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{staff.name || 'User Name'}</div>
                            <div style={{ fontSize: 11, color: '#999' }}>{staff.email || 'user@xyz.com'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="role-pill" style={{ background: style.background, color: style.color }}>
                          {staff.role || 'Admin'}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', padding: '4px 12px',
                          borderRadius: '999px', fontSize: '12px', fontWeight: 600,
                          background: getStaffStatus(staff) === 'Active' ? '#D1FAE5' : '#FEE2E2',
                          color: getStaffStatus(staff) === 'Active' ? '#065F46' : '#991B1B',
                          border: `1px solid ${getStaffStatus(staff) === 'Active' ? '#A7F3D0' : '#FECACA'}`
                        }}>
                          {getStaffStatus(staff)}
                        </span>
                      </td>
                      <td>{staff.lastLogin ? new Date(staff.lastLogin).toLocaleString() : '2024-01-15 14:30'}</td>
                      <td>
                        {staff.role?.toUpperCase() === "ADMIN_STAFF" ? (
                          <PageAccessDropdown staff={staff} />
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '4px 12px',
                            borderRadius: '999px',
                            fontSize: '11px',
                            fontWeight: 600,
                            background: '#FEF3C7',
                            color: '#D97706',
                            border: '1px solid #FDE68A'
                          }}>
                            Full Access
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="action-btns">
                          <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => { setEditingStaff(staff); setIsFormOpen('edit'); }}>
                            <img src={editIcon} alt="Edit" style={{ width: 18 }} />
                          </button>
                          <button
                            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                            title="Delete"
                            onClick={() => handleDeleteStaff(staff)}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>



      {isFormOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          {isFormOpen === "add" && <AddStaffForm onClose={closeForm} />}
          {isFormOpen === "edit" && <StaffEditForm staff={editingStaff} onClose={closeForm} />}
        </div>
      )}
    </div>
  );
}

export default AdminStaff;
