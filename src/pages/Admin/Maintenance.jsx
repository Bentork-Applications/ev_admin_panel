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
          background: #f1f1f1;
          padding: 24px;
          box-sizing: border-box;
          font-family: 'Lexend', sans-serif;
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
          margin-bottom: 24px;
        }

        .header-left h2 {
          font-size: 24px;
          font-weight: 600;
          color: #1a1a1a;
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
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .profile-chip {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #fff;
          padding: 6px 12px;
          border-radius: 20px;
          border: 1px solid #e0e0e0;
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
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
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

        .graph-container {
          background: #fff;
          border-radius: 16px;
          padding: 24px;
          border: 1px solid #eee;
          margin-bottom: 24px;
        }

        .graph-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .records-section {
          background: #fff;
          border-radius: 24px;
          padding: 24px;
          border: 1px solid #eee;
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
          background: #ffe5ea;
          color: #ff3b5c;
        }

        .action-btn {
          padding: 6px 14px;
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }

        .action-btn:hover {
          background: #f5f5f5;
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
          border-radius: 16px;
          width: 500px;
          max-width: 90%;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-size: 14px;
          color: #333;
        }

        .form-group input {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 8px;
          outline: none;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
        }

        .switch-maint-container {
          position: fixed;
          bottom: 24px;
          left: 24px;
          z-index: 100;
        }

        .switch-maint-btn {
          background: #111;
          color: white;
          padding: 12px 24px;
          border-radius: 30px;
          border: none;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          transition: transform 0.2s;
        }

        .switch-maint-btn:hover {
          transform: translateY(-2px);
        }
      `}</style>

      <div className="maintenance-dashboard-container">
        <div className="top-header">
          <div className="header-left">
            <h2>Emergency & Maintenance</h2>
          </div>

        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Active Cases <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg></span>
            <span className="stat-value">14</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Scheduled Today <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg></span>
            <span className="stat-value">1</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">In Progress <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M12 2v4" /><path d="M12 18v4" /><path d="M4.93 4.93l2.83 2.83" /><path d="M16.24 16.24l2.83 2.83" /><path d="M2 12h4" /><path d="M18 12h4" /><path d="M4.93 19.07l2.83-2.83" /><path d="M16.24 7.76l2.83-2.83" /></svg></span>
            <span className="stat-value">1</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Completed This Week <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#db2777" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg></span>
            <span className="stat-value">3</span>
          </div>
        </div>

        <div className="graph-container">
          <div className="graph-header">
            <div>
              <h3 style={{ margin: 0, fontSize: 16 }}>Graphical Overview</h3>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#666' }}>Real-time monitoring data</p>
            </div>
            <div className="icon-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
            </div>
          </div>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorCases" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dy={10} />
                <YAxis hide />
                <Tooltip />
                <Area type="monotone" dataKey="cases" stroke="#8884d8" fillOpacity={1} fill="url(#colorCases)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="records-section">
          <div className="records-header">
            <h3 style={{ margin: 0, fontSize: 18 }}>Emergency Contacts</h3>
            {!isDealer && (
              <button className="maint-btn" onClick={() => handleOpenModal()}>Add Contact</button>
            )}
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <div style={{ display: 'inline-block', width: 24, height: 24, border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 12 }}></div>
              <div style={{ color: '#64748b' }}>Loading contacts...</div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
