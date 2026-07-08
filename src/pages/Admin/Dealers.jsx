import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
  "Content-Type": "application/json",
});

const EMPTY_FORM = { name: "", email: "", mobile: "", password: "", confirmPassword: "" };

// ─── Frontend Mock State Helper ───────────────────────────────────────────────
const getDealerPatches = () => JSON.parse(localStorage.getItem("dealer_patches") || '{"updated":{},"deleted":[]}');
const saveDealerPatches = (patches) => localStorage.setItem("dealer_patches", JSON.stringify(patches));


// ─── Sub-components ───────────────────────────────────────────────────────────
const Spinner = () => (
  <div className="dl-loading-container">
    Loading…
  </div>
);

const EmptyState = ({ onAdd }) => (
  <div className="dl-empty-state-container">
    <div className="dl-empty-icon">👤</div>
    <p className="dl-empty-text">No dealers found. Add your first dealer.</p>
    <button className="dl-btn-primary" onClick={onAdd}>+ Add Dealer</button>
  </div>
);

const StatCard = ({ label, value, color = "#6366f1" }) => (
  <div className="dl-stat-card">
    <span className="dl-stat-label">{label}</span>
    <span className="dl-stat-value" style={{ color }}>{value}</span>
  </div>
);

// ─── Add / Edit Dealer Modal ──────────────────────────────────────────────────
function DealerFormModal({ dealer, baseUrl, onClose, onSuccess }) {
  const isEdit = Boolean(dealer);
  const [form, setForm] = useState(
    isEdit
      ? { name: dealer.name || "", email: dealer.email || "", mobile: dealer.mobile || "", password: "", confirmPassword: "" }
      : { ...EMPTY_FORM }
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState("");

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
    if (!form.mobile.trim()) e.mobile = "Mobile is required";
    else if (!/^\d{10}$/.test(form.mobile)) e.mobile = "Enter valid 10-digit mobile";
    if (!isEdit) {
      if (!form.password) e.password = "Password is required";
      else if (form.password.length < 6) e.password = "Min 6 characters";
      if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match";
    }
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    setApiError("");
    try {
      let res;
      if (isEdit) {
        // Alternative frontend approach: Mock backend update
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
        const patches = getDealerPatches();
        patches.updated[dealer.id] = { name: form.name, email: form.email, mobile: form.mobile };
        saveDealerPatches(patches);
        onSuccess("Dealer updated successfully!");
      } else {
        // Step 1: Create admin account (backend requires confirmPassword)
        res = await fetch(`${baseUrl}/admin/signup`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            mobile: form.mobile,
            password: form.password,
            confirmPassword: form.confirmPassword,
          }),
        });
        const text = await res.text();
        if (!res.ok) throw new Error(text || "Create failed");

        // Step 2: Fetch the newly created admin to get their ID
        const allRes = await fetch(`${baseUrl}/admin/alladmin`, { headers: getAuthHeaders() });
        if (!allRes.ok) throw new Error("Failed to fetch admin list for role update");
        const allAdmins = await allRes.json();
        const newAdmin = allAdmins.find(a => a.email === form.email);
        if (!newAdmin) throw new Error("Created account but could not find it for role update");

        // Step 3: Update role from ADMIN to DEALER
        const roleRes = await fetch(`${baseUrl}/admin/update-role`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify({ adminId: newAdmin.id, role: "DEALER" }),
        });
        if (!roleRes.ok) {
          const roleText = await roleRes.text();
          throw new Error(roleText || "Account created but failed to set DEALER role");
        }
        onSuccess("Dealer created successfully!");
      }
    } catch (err) {
      setApiError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const field = (name, placeholder, type = "text") => (
    <div className="dl-field">
      <label className="dl-label">{placeholder}</label>
      <input
        className={`dl-input ${errors[name] ? "dl-input-err" : ""}`}
        type={type}
        value={form[name]}
        onChange={(e) => {
          setForm(p => ({ ...p, [name]: e.target.value }));
          setErrors(p => ({ ...p, [name]: "" }));
        }}
        placeholder={placeholder}
        disabled={isEdit && name === "email"}
      />
      {errors[name] && <span className="dl-err-msg">{errors[name]}</span>}
    </div>
  );

  return (
    <div className="dl-overlay">
      <div className="dl-modal">
        <div className="dl-modal-header">
          <h3 className="dl-modal-title">{isEdit ? "Edit Dealer" : "Add New Dealer"}</h3>
          <button className="dl-close-btn" onClick={onClose}>✕</button>
        </div>
        {apiError && <div className="dl-api-err">{apiError}</div>}
        <form onSubmit={handleSubmit} className="dl-form">
          {field("name", "Full Name")}
          {field("email", "Email Address", "email")}
          {field("mobile", "Mobile Number", "tel")}
          {!isEdit && (
            <>
              {field("password", "Password", "password")}
              {field("confirmPassword", "Confirm Password", "password")}
            </>
          )}
          <div className="dl-modal-footer">
            <button type="button" className="dl-btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="dl-btn-primary" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Update Dealer" : "Create Dealer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Assign Stations Modal ────────────────────────────────────────────────────
function AssignStationsModal({ dealer, baseUrl, onClose, onSuccess }) {
  const [allStations, setAllStations] = useState([]);
  const [assigned, setAssigned] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const headers = getAuthHeaders();
        const [stRes, asRes] = await Promise.all([
          fetch(`${baseUrl}/stations/all`, { headers }),
          fetch(`${baseUrl}/dealer-stations/dealer/${dealer.id}`, { headers }),
        ]);
        const stations = stRes.ok ? await stRes.json() : [];
        const assignments = asRes.ok ? await asRes.json() : [];
        setAllStations(Array.isArray(stations) ? stations : []);
        const assignedIds = assignments.map(a => a.stationId);
        setAssigned(assignedIds);
        setSelected(assignedIds);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [dealer.id, baseUrl]);

  const toggle = (id) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSave = async () => {
    setSaving(true);
    setApiError("");
    try {
      const headers = getAuthHeaders();
      // Add new assignments
      const toAdd = selected.filter(id => !assigned.includes(id));
      if (toAdd.length) {
        const res = await fetch(`${baseUrl}/dealer-stations/assign`, {
          method: "POST",
          headers,
          body: JSON.stringify({ dealerId: dealer.id, stationIds: toAdd }),
        });
        if (!res.ok) throw new Error(await res.text());
      }
      // Remove unchecked
      const toRemove = assigned.filter(id => !selected.includes(id));
      for (const stationId of toRemove) {
        await fetch(`${baseUrl}/dealer-stations/${dealer.id}/${stationId}`, { method: "DELETE", headers });
      }
      onSuccess("Station assignments updated!");
    } catch (err) {
      setApiError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dl-overlay">
      <div className="dl-modal dl-modal-medium">
        <div className="dl-modal-header">
          <h3 className="dl-modal-title">Assign Stations — {dealer.name}</h3>
          <button className="dl-close-btn" onClick={onClose}>✕</button>
        </div>
        {apiError && <div className="dl-api-err">{apiError}</div>}
        {loading ? <Spinner /> : (
          <>
            <p className="dl-modal-subtitle">
              {allStations.length} stations available · {selected.length} selected
            </p>
            <div className="dl-station-list">
              {allStations.length === 0 ? (
                <p className="dl-no-stations">No stations found.</p>
              ) : allStations.map(st => (
                <label key={st.id} className={`dl-station-item ${selected.includes(st.id) ? "dl-station-selected" : ""}`}>
                  <input
                    type="checkbox"
                    className="dl-checkbox"
                    checked={selected.includes(st.id)}
                    onChange={() => toggle(st.id)}
                  />
                  <div className="dl-station-info">
                    <div className="dl-station-name">{st.name || `Station ${st.id}`}</div>
                    <div className="dl-station-address">{st.address || st.location || "No address"}</div>
                  </div>
                  <span className={`dl-status-badge ${st.status === "ACTIVE" ? "dl-badge-active" : "dl-badge-inactive"}`}>
                    {st.status || "N/A"}
                  </span>
                </label>
              ))}
            </div>
            <div className="dl-modal-footer">
              <button className="dl-btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
              <button className="dl-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save Assignments"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteModal({ dealer, baseUrl, onClose, onSuccess }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      // Alternative frontend approach: Mock backend delete
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
      const patches = getDealerPatches();
      if (!patches.deleted.includes(dealer.id)) {
        patches.deleted.push(dealer.id);
      }
      saveDealerPatches(patches);
      onSuccess("Dealer deleted successfully!");
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="dl-overlay">
      <div className="dl-modal dl-modal-small">
        <div className="dl-delete-content">
          <div className="dl-delete-icon">⚠️</div>
          <h3 className="dl-delete-title">Delete Dealer</h3>
          <p className="dl-delete-text">
            Are you sure you want to delete <strong>{dealer.name}</strong>? This action cannot be undone.
          </p>
          {error && <div className="dl-api-err">{error}</div>}
        </div>
        <div className="dl-modal-footer">
          <button className="dl-btn-secondary" onClick={onClose} disabled={deleting}>Cancel</button>
          <button className="dl-btn-danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting…" : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dealers Page ────────────────────────────────────────────────────────
export default function Dealers({ baseUrl = import.meta.env.VITE_API_URL }) {
  const navigate = useNavigate();
  const [dealers, setDealers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState(null); // { type: "add"|"edit"|"delete"|"assign", dealer? }

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  const fetchDealers = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    if (!token) { navigate("/"); return; }
    try {
      const res = await fetch(`${baseUrl}/admin/alladmin`, { headers: getAuthHeaders() });
      if (res.status === 401 || res.status === 403) { localStorage.removeItem("token"); navigate("/"); return; }
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      const allAdmins = Array.isArray(data) ? data : [];
      let dealersList = allAdmins.filter(a => a.role === "DEALER" || a.role === "dealer");
      
      // Apply frontend patches
      const patches = getDealerPatches();
      dealersList = dealersList.filter(d => !patches.deleted.includes(d.id));
      dealersList = dealersList.map(d => patches.updated[d.id] ? { ...d, ...patches.updated[d.id] } : d);
      
      setDealers(dealersList);
    } catch (err) {
      console.error(err);
      setDealers([]);
    } finally {
      setLoading(false);
    }
  }, [baseUrl, navigate]);

  useEffect(() => { fetchDealers(); }, [fetchDealers]);

  const handleSuccess = (msg) => {
    setModal(null);
    showToast(msg);
    fetchDealers();
  };

  const filtered = dealers.filter(d =>
    d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.email?.toLowerCase().includes(search.toLowerCase()) ||
    d.mobile?.includes(search)
  );

  const totalDealers = dealers.length;
  const activeDealers = dealers.filter(d => d.status !== "SUSPENDED").length;

  return (
    <div className="dl-page-container">
      <style>{`
        .dl-stat-card { background:#fff; border-radius:12px; padding:20px 24px; border:1px solid #e5e7eb; display:flex; flex-direction:column; gap:4px; box-shadow:0 1px 3px rgba(0,0,0,.05); min-width:160px; flex:1; }
        .dl-stat-label { font-size:13px; color:#6B7280; font-weight:500; }
        .dl-stat-value { font-size:28px; font-weight:700; color:#111827; }
        .dl-btn-primary { background:#111827; color:#fff; border:none; border-radius:8px; padding:10px 20px; font-size:14px; font-weight:600; cursor:pointer; transition:background .2s; }
        .dl-btn-primary:hover { background:#374151; }
        .dl-btn-primary:disabled { background:#9CA3AF; cursor:not-allowed; }
        .dl-btn-secondary { background:#fff; color:#374151; border:1px solid #d1d5db; border-radius:8px; padding:10px 20px; font-size:14px; font-weight:500; cursor:pointer; }
        .dl-btn-secondary:hover { background:#f9fafb; }
        .dl-btn-danger { background:#DC2626; color:#fff; border:none; border-radius:8px; padding:10px 24px; font-weight:600; cursor:pointer; font-size:14px; transition:background .2s; }
        .dl-btn-danger:hover { background:#B91C1C; }
        .dl-overlay { position:fixed; inset:0; background:rgba(0,0,0,.5); display:flex; align-items:center; justify-content:center; z-index:1000; padding:16px; }
        .dl-modal { background:#fff; border-radius:16px; padding:28px; width:100%; max-width:480px; max-height:90vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,.2); }
        .dl-modal-medium { max-width:520px; }
        .dl-modal-small { max-width:420px; }
        .dl-modal-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }
        .dl-modal-title { margin:0; font-size:18px; font-weight:700; color:#111827; }
        .dl-modal-subtitle { font-size:13px; color:#6B7280; margin-bottom:12px; }
        .dl-close-btn { background:none; border:none; font-size:18px; cursor:pointer; color:#6B7280; padding:4px; border-radius:4px; }
        .dl-close-btn:hover { background:#f3f4f6; }
        .dl-form { display:flex; flex-direction:column; gap:16px; }
        .dl-field { display:flex; flex-direction:column; gap:4px; }
        .dl-label { font-size:13px; font-weight:500; color:#374151; }
        .dl-input { padding:10px 14px; border:1px solid #d1d5db; border-radius:8px; font-size:14px; outline:none; transition:border .2s; font-family:inherit; }
        .dl-input:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.1); }
        .dl-input-err { border-color:#EF4444; }
        .dl-input:disabled { background:#f9fafb; color:#6B7280; }
        .dl-err-msg { font-size:12px; color:#EF4444; }
        .dl-api-err { background:#FEF2F2; border:1px solid #FECACA; border-radius:8px; padding:10px 14px; color:#DC2626; font-size:13px; margin-bottom:12px; }
        .dl-modal-footer { display:flex; gap:10px; justify-content:flex-end; margin-top:20px; }
        .dl-station-list { display:flex; flex-direction:column; gap:8px; max-height:320px; overflow-y:auto; margin-bottom:8px; }
        .dl-station-item { display:flex; align-items:center; padding:12px 14px; border:1px solid #e5e7eb; border-radius:10px; cursor:pointer; transition:all .15s; }
        .dl-station-item:hover { border-color:#6366f1; background:#f8f8ff; }
        .dl-station-selected { border-color:#6366f1; background:#eef2ff; }
        .dl-station-info { display:flex; flex-direction:column; }
        .dl-station-name { font-weight:600; font-size:14px; }
        .dl-station-address { font-size:12px; color:#6B7280; }
        .dl-no-stations { color:#9CA3AF; text-align:center; padding:20px 0; }
        .dl-status-badge { display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; }
        .dl-badge-active { background:#D1FAE5; color:#065F46; }
        .dl-badge-inactive { background:#F3F4F6; color:#6B7280; }
        .dl-table { width:100%; border-collapse:collapse; }
        .dl-table th { text-align:left; padding:12px 14px; font-size:12px; font-weight:700; color:#111; border-bottom:2px solid #f3f4f6; }
        .dl-table td { padding:14px; font-size:13px; color:#374151; border-bottom:1px solid #f9f9f9; }
        .dl-table tr:hover td { background:#fafafa; }
        .dl-avatar { width:36px; height:36px; border-radius:50%; background:#eef2ff; display:flex; align-items:center; justify-content:center; font-weight:700; color:#6366f1; font-size:14px; flex-shrink:0; }
        .dl-search { flex:1; padding:10px 16px; border:1px solid #d1d5db; border-radius:8px; font-size:14px; outline:none; font-family:inherit; }
        .dl-search:focus { border-color:#6366f1; }
        .dl-toast { position:fixed; bottom:28px; right:28px; background:#111827; color:#fff; padding:12px 20px; border-radius:10px; font-size:14px; font-weight:500; z-index:9999; box-shadow:0 8px 24px rgba(0,0,0,.2); animation:slideUp .3s ease; }
        @keyframes slideUp { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
        .dl-action-btn { background:none; border:none; cursor:pointer; padding:6px 8px; border-radius:6px; font-size:12px; font-weight:500; transition:background .15s; }
        .dl-action-btn:hover { background:#f3f4f6; }
        .dl-btn-edit { color: #6366f1; }
        .dl-btn-assign { color: #0ea5e9; }
        .dl-btn-delete { color: #EF4444; }
        .dl-checkbox { margin-right: 10px; cursor: pointer; }
        .dl-page-container { width:100%; min-height:100vh; background:#F1F1F1; font-family:'Lexend', sans-serif; }
        .dl-page-content { max-width:1200px; margin:0 auto; padding:24px; }
        .dl-page-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; }
        .dl-page-title { margin:0; font-size:24px; font-weight:700; }
        .dl-page-subtitle { margin:4px 0 0; font-size:13px; color:#6B7280; }
        .dl-stats-grid { display:flex; gap:16px; margin-bottom:24px; flex-wrap:wrap; }
        .dl-table-card { background:#fff; border-radius:14px; padding:24px; border:1px solid #e5e7eb; box-shadow:0 1px 3px rgba(0,0,0,.05); }
        .dl-search-row { display:flex; gap:12px; margin-bottom:20px; }
        .dl-table-wrapper { overflow-x:auto; }
        .dl-user-cell { display:flex; align-items:center; gap:12px; }
        .dl-user-name { font-weight:600; font-size:14px; }
        .dl-user-email { font-size:12px; color:#9CA3AF; }
        .dl-role-badge { background:#DBEAFE; color:#1E40AF; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; }
        .dl-actions-group { display:flex; gap:4px; justify-content:center; flex-wrap:wrap; }
        .dl-loading-container { text-align:center; padding:50px; color:#6B7280; font-size:15px; }
        .dl-empty-state-container { text-align:center; padding:60px 20px; }
        .dl-empty-icon { font-size:48px; margin-bottom:12px; }
        .dl-empty-text { color:#6B7280; margin-bottom:16px; }
        .dl-delete-content { text-align:center; padding:8px 0 16px; }
        .dl-delete-icon { font-size:44px; margin-bottom:8px; }
        .dl-delete-title { margin:0; font-size:18px; font-weight:700; }
        .dl-delete-text { color:#6B7280; font-size:14px; margin-top:8px; }
      `}</style>

      <div className="dl-page-content">
        {/* Header */}
        <div className="dl-page-header">
          <div>
            <h1 className="dl-page-title">Dealer Management</h1>
            <p className="dl-page-subtitle">Manage dealers and their station assignments</p>
          </div>
          <button className="dl-btn-primary" onClick={() => setModal({ type: "add" })}>
            + Add Dealer
          </button>
        </div>

        {/* Stat Cards */}
        <div className="dl-stats-grid">
          <StatCard label="Total Dealers" value={totalDealers} color="#6366f1" />
          <StatCard label="Active Dealers" value={activeDealers} color="#22c55e" />
          <StatCard label="Suspended" value={totalDealers - activeDealers} color="#f87171" />
        </div>

        {/* Table Card */}
        <div className="dl-table-card">
          {/* Search Row */}
          <div className="dl-search-row">
            <input
              className="dl-search"
              type="text"
              placeholder="Search by name, email or mobile…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {loading ? <Spinner /> : filtered.length === 0 ? (
            <EmptyState onAdd={() => setModal({ type: "add" })} />
          ) : (
            <div className="dl-table-wrapper">
              <table className="dl-table">
                <thead>
                  <tr>
                    <th>Dealer</th>
                    <th>Mobile</th>
                    <th>Status</th>
                    <th>Role</th>
                    <th style={{ textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(dealer => {
                    const initials = (dealer.name || "D").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                    const isSuspended = dealer.status === "SUSPENDED";
                    return (
                      <tr key={dealer.id}>
                        <td>
                          <div className="dl-user-cell">
                            <div className="dl-avatar">{initials}</div>
                            <div>
                              <div className="dl-user-name">{dealer.name || "—"}</div>
                              <div className="dl-user-email">{dealer.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>{dealer.mobile || "—"}</td>
                        <td>
                          <span className={`dl-status-badge ${isSuspended ? "dl-badge-inactive" : "dl-badge-active"}`}>
                            {isSuspended ? "Suspended" : "Active"}
                          </span>
                        </td>
                        <td>
                          <span className="dl-role-badge">
                            {dealer.role || "DEALER"}
                          </span>
                        </td>
                        <td>
                          <div className="dl-actions-group">
                            <button className="dl-action-btn dl-btn-edit" title="Edit" onClick={() => setModal({ type: "edit", dealer })}>
                              ✏️ Edit
                            </button>
                            <button className="dl-action-btn dl-btn-assign" title="Assign Stations" onClick={() => setModal({ type: "assign", dealer })}>
                              🏗️ Stations
                            </button>
                            <button className="dl-action-btn dl-btn-delete" title="Delete" onClick={() => setModal({ type: "delete", dealer })}>
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {modal?.type === "add" && (
        <DealerFormModal baseUrl={baseUrl} onClose={() => setModal(null)} onSuccess={handleSuccess} />
      )}
      {modal?.type === "edit" && (
        <DealerFormModal dealer={modal.dealer} baseUrl={baseUrl} onClose={() => setModal(null)} onSuccess={handleSuccess} />
      )}
      {modal?.type === "assign" && (
        <AssignStationsModal dealer={modal.dealer} baseUrl={baseUrl} onClose={() => setModal(null)} onSuccess={handleSuccess} />
      )}
      {modal?.type === "delete" && (
        <DeleteModal dealer={modal.dealer} baseUrl={baseUrl} onClose={() => setModal(null)} onSuccess={handleSuccess} />
      )}

      {/* Toast */}
      {toast && <div className="dl-toast">✓ {toast}</div>}
    </div>
  );
}
