import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";

const data = [
  { name: "Mon", cases: 4 },
  { name: "Tue", cases: 3 },
  { name: "Wed", cases: 2 },
  { name: "Thu", cases: 5 },
  { name: "Fri", cases: 6 },
  { name: "Sat", cases: 4 },
  { name: "Sun", cases: 3 },
];

const SearchableDropdown = ({ options, value, onChange, placeholder, labelKey, valueKey }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOptions = options.filter(opt => 
    String(opt[labelKey] || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(opt[valueKey] || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (opt) => {
    onChange(opt);
    setIsOpen(false);
    setSearchTerm("");
  };

  const selectedOption = options.find(opt => opt[valueKey] == value);
  const displayValue = selectedOption ? selectedOption[labelKey] : (value || placeholder);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px',
          background: '#fff', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}
      >
        <span style={{ color: selectedOption || value ? '#333' : '#999', fontSize: '14px' }}>{displayValue}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </div>
      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: '#fff',
          border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 1000,
          maxHeight: '220px', display: 'flex', flexDirection: 'column'
        }}>
          <div style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
            <input 
              type="text" placeholder="Search..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', outline: 'none', boxSizing: 'border-box', fontSize: '14px' }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
            {filteredOptions.length > 0 ? filteredOptions.map(opt => (
              <div 
                key={opt.id}
                style={{ padding: '10px 12px', cursor: 'pointer', fontSize: '14px', color: '#333' }}
                onClick={() => handleSelect(opt)}
                onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
              >
                {opt.name} <span style={{ color: '#64748b', fontSize: '12px', marginLeft: '4px' }}>(ID: {opt.id})</span>
              </div>
            )) : (
              <div style={{ padding: '12px', color: '#94a3b8', textAlign: 'center', fontSize: '13px' }}>No stations found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function MaintenanceDashboard({ baseUrl: propBaseUrl, userRole }) {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [formError, setFormError] = useState(null);
  const [formData, setFormData] = useState({
    stationId: "",
    stationName: "",
    cpoPhoneNumber: "",
    companySupportNumber: ""
  });

  const baseUrl = propBaseUrl || import.meta.env.VITE_API_URL;
  const isDealer = userRole === "DEALER" || localStorage.getItem("userRole") === "DEALER";

  useEffect(() => {
    fetchContacts();
    fetchStations();
  }, []);

  const fetchStations = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`${baseUrl}/stations/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const result = await response.json();
        setStations(result);
      }
    } catch (error) {
      console.error("Error fetching stations:", error);
    }
  };

  const fetchContacts = async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`${baseUrl}/emergency-contacts/all`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const result = await response.json();
        setContacts(result);
      } else {
        throw new Error("Failed to fetch emergency contacts");
      }
    } catch (error) {
      console.error("Error fetching contacts:", error);
      setError("Failed to load emergency contacts. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (contact = null) => {
    setFormError(null);
    if (contact) {
      setEditingContact(contact);
      setFormData({
        stationId: contact.stationId || "",
        stationName: contact.stationName || "",
        cpoPhoneNumber: contact.cpoPhoneNumber || "",
        companySupportNumber: contact.companySupportNumber || ""
      });
    } else {
      setEditingContact(null);
      setFormData({
        stationId: "",
        stationName: "",
        cpoPhoneNumber: "",
        companySupportNumber: ""
      });
    }
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this contact?")) return;
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`${baseUrl}/emergency-contacts/delete/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        fetchContacts();
      }
    } catch (error) {
      console.error("Error deleting contact:", error);
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    const token = localStorage.getItem("token");
    const url = editingContact
      ? `${baseUrl}/emergency-contacts/update/${editingContact.id}`
      : `${baseUrl}/emergency-contacts/add`;
    const method = editingContact ? "PUT" : "POST";

    const payload = {
      stationId: formData.stationId ? parseInt(formData.stationId, 10) : null,
      stationName: formData.stationName,
      cpoPhoneNumber: formData.cpoPhoneNumber,
      companySupportNumber: formData.companySupportNumber
    };

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        setShowModal(false);
        fetchContacts();
      } else if (response.status === 409) {
        // A contact already exists for this station — offer to edit it instead
        const existingContact = contacts.find(
          (c) => c.stationId === payload.stationId || c.stationName === payload.stationName
        );
        if (existingContact) {
          setFormError({
            type: "conflict",
            message: `An emergency contact already exists for "${formData.stationName}". Would you like to edit it instead?`,
            contact: existingContact,
          });
        } else {
          setFormError({
            type: "error",
            message: `An emergency contact already exists for this station. Please edit the existing record.`,
          });
        }
      } else {
        const errorText = await response.text();
        console.error("Failed API details:", response.status, errorText);
        setFormError({ type: "error", message: `Failed to save contact (${response.status}): ${errorText}` });
      }
    } catch (error) {
      console.error("Error saving contact:", error);
      setFormError({ type: "error", message: `Network error: ${error.message}` });
    }
  };

  return (
    <>
      <style>{`
        .maintenance-dashboard-container {
          width: 100%;
          background: #F9FAFB;
          padding: 24px;
          box-sizing: border-box;
          font-family: 'Lexend', sans-serif;
          min-height: 100vh;
          animation: maintenance-fadeInPage 400ms ease-out forwards;
        }

        @media (max-width: 1024px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }
        }

        @media (max-width: 768px) {
          .top-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
        }

        @media (max-width: 576px) {
          .stats-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .maintenance-dashboard-container {
            padding: 16px;
          }
          .records-section {
            padding: 16px;
          }
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
          color: #111827;
          margin: 0;
        }

        .header-left p {
          font-size: 13px;
          color: #6B7280;
          margin: 4px 0 0 0;
        }

        .maint-btn {
          height: 40px;
          padding: 0 20px;
          background: #111827;
          color: white;
          border: none;
          border-radius: 20px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .maint-btn:hover {
          background: #374151;
          transform: translateY(-1px);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
          margin-bottom: 28px;
        }

        .stat-card {
          background: #fff;
          border-radius: 16px;
          padding: 24px;
          border: 1px solid #E5E7EB;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 140px;
          box-sizing: border-box;
          transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }

        .stat-card:hover {
          transform: translateY(-5px) scale(1.02);
          box-shadow: 0 12px 24px rgba(0,0,0,0.08);
          border-color: #10b981;
        }

        .stat-value {
          font-size: 32px;
          font-weight: 700;
          color: #111827;
          line-height: 1;
        }

        .graph-container {
          background: #fff;
          border-radius: 16px;
          padding: 24px;
          border: 1px solid #E5E7EB;
          margin-bottom: 28px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .graph-container:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.08);
        }

        .graph-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .records-section {
          background: #fff;
          border-radius: 16px;
          padding: 24px;
          border: 1px solid #E5E7EB;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          margin-bottom: 28px;
        }

        .records-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .records-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }

        .records-table th {
          text-align: left;
          padding: 12px 16px;
          color: #4B5563;
          font-weight: 600;
          font-size: 13px;
          border-bottom: 1.5px solid #F3F4F6;
          background: #F9FAFB;
        }

        .records-table td {
          padding: 16px;
          font-size: 14px;
          color: #374151;
          border-bottom: 1px solid #F3F4F6;
          transition: background-color 0.2s;
        }

        .records-table tr {
          border-left: 3px solid transparent;
        }
        .records-table tr:hover td {
          background-color: #F0FDF4 !important;
        }
        .records-table tr:hover td:first-child {
          border-left: 3px solid #10b981;
        }

        .action-btn {
          padding: 6px 14px;
          background: #fff;
          border: 1.5px solid #E5E7EB;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          transition: all 0.2s;
        }

        .action-btn:hover {
          background: #F9FAFB;
          border-color: #10B981;
          color: #10B981;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: #fff;
          padding: 32px;
          border-radius: 16px;
          width: 500px;
          max-width: 90%;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          border: 1px solid #E5E7EB;
        }
        .modal-content h3 {
          margin: 0 0 24px;
          font-size: 18px;
          font-weight: 700;
          color: #111827;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
        }

        .form-group input {
          width: 100%;
          height: 40px;
          padding: 0 12px;
          border: 1.5px solid #E5E7EB;
          border-radius: 10px;
          outline: none;
          box-sizing: border-box;
          font-family: inherit;
          font-size: 13px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .form-group input:focus {
          border-color: #10B981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 28px;
        }

        .switch-maint-container {
          position: fixed;
          bottom: 24px;
          left: 24px;
          z-index: 100;
        }

        .switch-maint-btn {
          background: #111827;
          color: white;
          padding: 12px 24px;
          border-radius: 30px;
          border: none;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s, background-color 0.2s;
        }

        .switch-maint-btn:hover {
          transform: translateY(-2px);
          background-color: #374151;
        }

        @keyframes maintenance-fadeInPage {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes maint-shimmer-anim {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .maint-skeleton-shimmer {
          background: linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%);
          background-size: 200% 100%;
          animation: maint-shimmer-anim 1.5s infinite linear;
          height: 16px;
          border-radius: 4px;
        }
      `}</style>

      <div className="maintenance-dashboard-container">
        <div className="top-header">
          <div className="header-left">
            <h2>Emergency & Maintenance</h2>
            <p>Monitor emergency requests, status, and service activity</p>
          </div>
          {/* UI filter tabs */}
          <div style={{ display: "flex", background: "#F3F4F6", borderRadius: "8px", padding: "2px", gap: "2px" }}>
            {["Today", "This Week", "This Month", "This Year"].map((tab) => {
              const active = tab === "This Month";
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

        <div className="stats-grid">
          {[
            {
              label: "Active Cases",
              value: 14,
              color: "#3b82f6",
              trend: "Critical urgent cases",
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              )
            },
            {
              label: "Scheduled Today",
              value: 1,
              color: "#10b981",
              trend: "Planned runs",
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              )
            },
            {
              label: "In Progress",
              value: 1,
              color: "#f59e0b",
              trend: "Currently active tasks",
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5">
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                  <path d="M12 6v6l4 2" />
                </svg>
              )
            },
            {
              label: "Completed",
              value: 3,
              color: "#db2777",
              trend: "Resolved this week",
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#db2777" strokeWidth="2.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              )
            }
          ].map((card, idx) => (
            <div className="stat-card" key={idx}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <div style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: `${card.color}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}>
                    {card.icon}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span className="stat-label-text" style={{ fontSize: "13px", fontWeight: 600, color: "#6B7280" }}>{card.label}</span>
                    <span style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "2px", fontWeight: 500 }}>{card.trend}</span>
                  </div>
                </div>
                <div style={{ color: "#9CA3AF", fontSize: "14px", fontWeight: "bold" }}>↗</div>
              </div>
              <span className="stat-value" style={{ marginTop: "12px", paddingLeft: "4px", display: "block" }}>
                <AnimatedNumber value={card.value} />
              </span>
            </div>
          ))}
        </div>

        <div className="graph-container">
          <div className="graph-header">
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#111827" }}>Graphical Overview</h3>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6B7280' }}>Real-time monitoring emergency logs</p>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "12px", fontWeight: 500 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981" }} />
                <span style={{ color: "#4B5563" }}>Emergency Cases</span>
              </div>
            </div>
          </div>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorCases" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6B7280" }} dy={10} />
                <YAxis hide />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="cases"
                  stroke="#10B981"
                  fillOpacity={1}
                  fill="url(#colorCases)"
                  strokeWidth={3}
                  isAnimationActive={true}
                  animationDuration={800}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="records-section">
          <div className="records-header">
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#111827" }}>Emergency Contacts</h3>
            {!isDealer && (
              <button className="maint-btn" onClick={() => handleOpenModal()}>Add Contact</button>
            )}
          </div>

          {loading ? (
            <div style={{ overflowX: "auto" }}>
              <table className="records-table">
                <thead>
                  <tr>
                    <th>Station Name</th>
                    <th>Station ID</th>
                    <th>CPO Phone Number</th>
                    <th>Company Support Number</th>
                    {!isDealer && <th>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {[...Array(3)].map((_, idx) => (
                    <tr key={idx}>
                      <td><div className="maint-skeleton-shimmer" style={{ width: "150px" }} /></td>
                      <td><div className="maint-skeleton-shimmer" style={{ width: "80px" }} /></td>
                      <td><div className="maint-skeleton-shimmer" style={{ width: "120px" }} /></td>
                      <td><div className="maint-skeleton-shimmer" style={{ width: "120px" }} /></td>
                      {!isDealer && <td><div className="maint-skeleton-shimmer" style={{ width: "100px" }} /></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : error ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 16 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginBottom: 8 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <div>{error}</div>
              <button onClick={() => fetchContacts()} style={{ marginTop: 12, padding: '6px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Retry</button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="records-table">
                <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                  <tr>
                    <th>Station Name</th>
                    <th>Station ID</th>
                    <th>CPO Phone Number</th>
                    <th>Company Support Number</th>
                    {!isDealer && <th>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {contacts.length > 0 ? contacts.map((contact) => (
                    <tr key={contact.id}>
                      <td>{contact.stationName || "Unknown"}</td>
                      <td>{contact.stationId ? `#${contact.stationId}` : "-"}</td>
                      <td>{contact.cpoPhoneNumber || "-"}</td>
                      <td>{contact.companySupportNumber || "-"}</td>
                      {!isDealer && (
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="action-btn" onClick={() => handleOpenModal(contact)}>Edit</button>
                            <button className="action-btn" style={{ color: '#ff3b5c' }} onClick={() => handleDelete(contact.id)}>Delete</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={isDealer ? 4 : 5} style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginBottom: 12, opacity: 0.5, display: 'inline-block' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                        <br />
                        No emergency contacts found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>{editingContact ? "Edit Contact" : "Add Emergency Contact"}</h3>
              <form onSubmit={handleSubmit}>
                {formError && (
                  <div style={{
                    marginBottom: 16,
                    padding: '12px 16px',
                    borderRadius: 10,
                    background: formError.type === "conflict" ? "#fffbeb" : "#fef2f2",
                    border: `1px solid ${formError.type === "conflict" ? "#fcd34d" : "#fecaca"}`,
                    color: formError.type === "conflict" ? "#92400e" : "#b91c1c",
                    fontSize: 13,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}>
                    <span>{formError.message}</span>
                    {formError.type === "conflict" && formError.contact && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormError(null);
                          handleOpenModal(formError.contact);
                        }}
                        style={{
                          alignSelf: 'flex-start',
                          padding: '6px 14px',
                          background: '#111',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 8,
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        Switch to Edit
                      </button>
                    )}
                  </div>
                )}

                <div className="form-group">
                  <label>Station Name</label>
                  <SearchableDropdown 
                    options={stations}
                    value={formData.stationName}
                    onChange={(opt) => setFormData({ ...formData, stationName: opt.name, stationId: opt.id })}
                    placeholder="Search and select Station Name"
                    labelKey="name"
                    valueKey="name"
                  />
                </div>
                <div className="form-group">
                  <label>Station ID</label>
                  <SearchableDropdown 
                    options={stations}
                    value={formData.stationId}
                    onChange={(opt) => setFormData({ ...formData, stationId: opt.id, stationName: opt.name })}
                    placeholder="Search and select Station ID"
                    labelKey="id"
                    valueKey="id"
                  />
                </div>
                <div className="form-group">
                  <label>CPO Phone Number</label>
                  <input
                    type="text"
                    value={formData.cpoPhoneNumber}
                    onChange={(e) => setFormData({ ...formData, cpoPhoneNumber: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Company Support Number</label>
                  <input
                    type="text"
                    value={formData.companySupportNumber}
                    onChange={(e) => setFormData({ ...formData, companySupportNumber: e.target.value })}
                    required
                  />
                </div>
                <div className="form-actions">
                  <button type="button" className="action-btn" onClick={() => { setFormError(null); setShowModal(false); }}>Cancel</button>
                  <button type="submit" className="maint-btn">Save Contact</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="switch-maint-container">
          <button
            className="switch-maint-btn"
            onClick={() => navigate("/dashboard/maintenance-dashboard")}
          >
            Switch to Maintenance
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Stat Card Number Count Up Animation ─────────────────────────────────────
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
