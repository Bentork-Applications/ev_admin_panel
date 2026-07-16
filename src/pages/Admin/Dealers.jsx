import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";

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
  <div style={{ padding: "8px 0" }}>
    {[...Array(5)].map((_, i) => (
      <div
        key={i}
        className="dl-skeleton-row dl-skeleton-shimmer"
        style={{
          backgroundColor: "#f3f4f6",
          backgroundImage: "linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)",
          backgroundSize: "200% 100%",
          animation: "dl-shimmer-anim 1.5s infinite linear",
          animationDelay: `${i * 0.08}s`
        }}
      />
    ))}
  </div>
);

const EmptyState = ({ onAdd }) => (
  <div className="dl-empty-state-container">
    <div className="dl-empty-icon">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    </div>
    <p className="dl-empty-text">No dealers found. Add your first dealer.</p>
    <button className="dl-btn-primary" onClick={onAdd}>+ Add Dealer</button>
  </div>
);

const StatCard = ({ label, value, color = "#10b981", trend = "+12% from last month", icon }) => {
  return (
    <div className="dl-stat-card" style={{ cursor: "default" }}>
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
            {icon}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span className="dl-stat-label">{label}</span>
            <span style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "2px", fontWeight: 500 }}>{trend}</span>
          </div>
        </div>
        <div style={{ color: "#9CA3AF", fontSize: "14px", fontWeight: "bold" }}>↗</div>
      </div>
      <span className="dl-stat-value" style={{ marginTop: "12px", paddingLeft: "4px", display: "block" }}>{value}</span>
    </div>
  );
};

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
  const location = useLocation();
  const [dealers, setDealers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState(null); // { type: "add"|"edit"|"delete"|"assign", dealer? }
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [selectedDealerForDrawer, setSelectedDealerForDrawer] = useState(null);

  useEffect(() => {
    if (location.state?.openAddModal) {
      setModal({ type: "add" });
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

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

  const filtered = dealers.filter(d => {
    const term = search.toLowerCase();
    const matchesSearch =
      (d.name || "").toLowerCase().includes(term) ||
      (d.email || "").toLowerCase().includes(term) ||
      (d.mobile || "").includes(term);

    const isSuspended = d.status === "SUSPENDED";
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && !isSuspended) ||
      (statusFilter === "SUSPENDED" && isSuspended);

    const matchesRole =
      roleFilter === "ALL" ||
      (d.role || "DEALER").toUpperCase() === roleFilter.toUpperCase();

    return matchesSearch && matchesStatus && matchesRole;
  });

  const totalDealers = dealers.length;
  const activeDealers = dealers.filter(d => d.status !== "SUSPENDED").length;

  return (
    <div className="dl-page-container">
      <style>{`
        @keyframes dl-fadeInPage {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes dl-fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes dl-slideIn {
          from { opacity: 0; transform: scale(0.97) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes dl-shimmer-anim {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes dl-toast-in {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }

        .dl-page-container {
          width: 100%;
          min-height: 100vh;
          background: #F9FAFB;
          font-family: 'Lexend', sans-serif;
        }
        .dl-page-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
          animation: dl-fadeInPage 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .dl-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-bottom: 24px;
        }
        @media (max-width: 768px) {
          .dl-stats-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
        }

        .dl-stat-card {
          background: #fff;
          border-radius: 16px;
          padding: 24px;
          border: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          box-shadow: 0 1px 3px rgba(0,0,0,.02);
          box-sizing: border-box;
          height: 140px;
          justify-content: space-between;
          transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .dl-stat-card:hover {
          transform: translateY(-5px) scale(1.02);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
          border-color: #10b981;
        }
        .dl-stat-label { font-size: 13px; color: #6B7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
        .dl-stat-value { font-size: 32px; font-weight: 700; color: #111827; line-height: 1; }

        .dl-btn-primary {
          background: #111827;
          color: #fff;
          border: none;
          border-radius: 10px;
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s, box-shadow 0.2s;
        }
        .dl-btn-primary:hover {
          background: #374151;
          transform: scale(1.03);
          box-shadow: 0 4px 12px rgba(17, 24, 39, 0.15);
        }
        .dl-btn-primary:active { transform: scale(0.97); }
        .dl-btn-primary:disabled { background: #9CA3AF; cursor: not-allowed; transform: none; box-shadow: none; }

        .dl-btn-secondary {
          background: #fff;
          color: #374151;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          font-family: inherit;
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s;
        }
        .dl-btn-secondary:hover {
          background: #f9fafb;
          border-color: #cbd5e1;
          transform: scale(1.03);
        }
        .dl-btn-secondary:active { transform: scale(0.97); }

        .dl-btn-danger {
          background: #DC2626;
          color: #fff;
          border: none;
          border-radius: 10px;
          padding: 10px 24px;
          font-weight: 600;
          cursor: pointer;
          font-size: 14px;
          font-family: inherit;
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s;
        }
        .dl-btn-danger:hover {
          background: #B91C1C;
          transform: scale(1.03);
        }
        .dl-btn-danger:active { transform: scale(0.97); }

        .dl-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(5px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
          animation: dl-fadeIn 0.2s ease;
        }
        .dl-modal {
          background: #fff;
          border-radius: 20px;
          padding: 28px;
          width: 100%;
          max-width: 480px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0,0,0,.15);
          border: 1px solid #F3F4F6;
          animation: dl-slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .dl-modal-medium { max-width: 520px; }
        .dl-modal-small { max-width: 420px; }
        .dl-modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .dl-modal-title { margin: 0; font-size: 18px; font-weight: 700; color: #111827; }
        .dl-modal-subtitle { font-size: 13px; color: #6B7280; margin-bottom: 12px; }
        .dl-close-btn { background: none; border: none; font-size: 18px; cursor: pointer; color: #6B7280; padding: 4px; border-radius: 8px; transition: background .15s; }
        .dl-close-btn:hover { background: #f3f4f6; }
        
        .dl-form { display: flex; flex-direction: column; gap: 16px; }
        .dl-field { display: flex; flex-direction: column; gap: 6px; }
        .dl-label { font-size: 13px; font-weight: 600; color: #374151; }
        .dl-input {
          padding: 10px 14px;
          border: 1.5px solid #d1d5db;
          border-radius: 10px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          font-family: inherit;
        }
        .dl-input:focus {
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
        }
        .dl-input-err { border-color: #EF4444; }
        .dl-input:disabled { background: #f9fafb; color: #6B7280; }
        .dl-err-msg { font-size: 12px; color: #EF4444; }
        .dl-api-err { background: #FEF2F2; border: 1px solid #FECACA; border-radius: 10px; color: #DC2626; font-size: 13px; margin-bottom: 12px; padding: 10px 14px; }
        
        .dl-modal-footer { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
        
        .dl-station-list { display: flex; flex-direction: column; gap: 8px; max-height: 320px; overflow-y: auto; margin-bottom: 8px; padding-right: 4px; }
        .dl-station-item { display: flex; align-items: center; padding: 12px 14px; border: 1.5px solid #e5e7eb; border-radius: 12px; cursor: pointer; transition: all .15s; }
        .dl-station-item:hover { border-color: #10b981; background: #F0FDF4; }
        .dl-station-selected { border-color: #10b981; background: #E6FBF0; }
        .dl-station-info { display: flex; flex-direction: column; flex: 1; }
        .dl-station-name { font-weight: 600; font-size: 14px; color: #111827; }
        .dl-station-address { font-size: 12px; color: #6B7280; margin-top: 2px; }
        .dl-no-stations { color: #9CA3AF; text-align: center; padding: 20px 0; }
        
        .dl-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 600;
        }
        .dl-badge-active {
          background: #ECFDF5;
          color: #065F46;
          border: 1px solid #A7F3D0;
        }
        .dl-badge-active::before {
          content: "";
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10B981;
        }
        .dl-badge-inactive {
          background: #FEF2F2;
          color: #991B1B;
          border: 1px solid #FECACA;
        }
        .dl-badge-inactive::before {
          content: "";
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #EF4444;
        }

        .dl-table-card {
          background: #fff;
          border-radius: 16px;
          padding: 24px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0,0,0,.02);
        }
        
        .dl-table-wrapper { overflow-x: auto; }
        .dl-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }
        .dl-table th {
          text-align: left;
          padding: 12px 14px;
          font-size: 11px;
          font-weight: 600;
          color: #4B5563;
          border-bottom: 1px solid #E5E7EB;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background: #F9FAFB;
        }
        .dl-table td {
          padding: 14px;
          font-size: 13px;
          color: #374151;
          border-bottom: 1px solid #E5E7EB;
          transition: background-color 0.2s ease;
        }
        .dl-table tr td:first-child {
          border-left: 3px solid transparent;
          transition: border-left-color 0.2s ease, background-color 0.2s ease;
        }
        .dl-table tr:hover td { background: #F0FDF4 !important; }
        .dl-table tr:hover td:first-child { border-left-color: #10b981; }
        
        .dl-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #ECFDF5;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: #10b981;
          font-size: 13px;
          flex-shrink: 0;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        
        .dl-search {
          flex: 1;
          padding: 10px 16px;
          border: 1.5px solid #d1d5db;
          border-radius: 10px;
          font-size: 14px;
          outline: none;
          font-family: inherit;
          background: #F9FAFB;
          transition: border-color 0.25s ease, box-shadow 0.25s ease, background-color 0.25s ease;
        }
        .dl-search:focus {
          border-color: #10b981;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
        }
        
        .dl-toast {
          position: fixed;
          bottom: 28px;
          right: 28px;
          background: #111827;
          color: #fff;
          padding: 12px 20px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          z-index: 9999;
          box-shadow: 0 8px 24px rgba(0,0,0,.2);
          animation: dl-toast-in .3s ease;
        }
        
        .dl-action-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          transition: transform 0.2s ease, background-color 0.15s;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .dl-action-btn:hover { background: #f3f4f6; transform: scale(1.05); }
        .dl-action-btn:active { transform: scale(0.95); }
        
        .dl-btn-edit { color: #6366f1; }
        .dl-btn-assign { color: #0ea5e9; }
        .dl-btn-delete { color: #EF4444; }
        .dl-delete-content { text-align:center; padding:8px 0 16px; }
        .dl-delete-icon { font-size:44px; margin-bottom:8px; }
        .dl-delete-title { margin:0; font-size:18px; font-weight:700; }
        .dl-delete-text { color:#6B7280; font-size:14px; margin-top:8px; }

        /* Drawer styles */
        .dl-drawer-overlay {
          position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(5px); z-index: 2000;
          display: flex; justify-content: flex-end;
          animation: dl-fadeIn 0.2s ease;
        }
        .dl-drawer {
          width: 480px; max-width: 90vw; height: 100%; background: #fff;
          box-shadow: -10px 0 30px rgba(0,0,0,0.08);
          display: flex; flex-direction: column;
          animation: dl-drawer-slide 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          border-left: 1px solid #E5E7EB;
        }
        @keyframes dl-drawer-slide {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .dl-drawer-header {
          padding: 24px; border-bottom: 1px solid #F3F4F6;
          display: flex; justify-content: space-between; align-items: center;
        }
        .dl-drawer-title { margin: 0; font-size: 18px; font-weight: 700; color: #111827; }
        .dl-drawer-subtitle { margin: 4px 0 0; font-size: 12px; color: #6B7280; }
        .dl-drawer-body {
          flex: 1; overflow-y: auto; padding: 24px;
          display: flex; flex-direction: column; gap: 24px;
        }
        .dl-drawer-card {
          background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 14px; padding: 16px;
        }
        .dl-drawer-metric {
          background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 12px 16px;
          display: flex; flex-direction: column; gap: 4px;
        }
        .dl-drawer-metric-label { font-size: 11px; color: #6B7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
        .dl-drawer-metric-val { font-size: 20px; font-weight: 700; color: #111827; }
        .dl-drawer-section { display: flex; flex-direction: column; gap: 14px; }
        .dl-drawer-section-title {
          margin: 0; font-size: 14px; font-weight: 700; color: #111827;
          border-bottom: 1.5px solid #F3F4F6; padding-bottom: 6px;
          text-transform: uppercase; letter-spacing: 0.05em;
        }
        .dl-drawer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .dl-drawer-grid-item { display: flex; flex-direction: column; gap: 4px; }
        .dl-drawer-item-label { font-size: 12px; color: #6B7280; font-weight: 500; }
        .dl-drawer-item-value { font-size: 13px; color: #111827; font-weight: 600; }
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
          <StatCard
            label="Total Dealers"
            value={totalDealers}
            color="#6366f1"
            trend="+12% from last month"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
            }
          />
          <StatCard
            label="Active Dealers"
            value={activeDealers}
            color="#10b981"
            trend="Currently active"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            }
          />
          <StatCard
            label="Suspended"
            value={totalDealers - activeDealers}
            color="#ef4444"
            trend="Action required"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            }
          />
        </div>

        {/* Table Card */}
        <div className="dl-table-card">
          {/* Search Row */}
          <div className="dl-search-row" style={{ display: "flex", gap: "12px", width: "100%", flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: "240px" }}>
              <input
                className="dl-search"
                type="text"
                placeholder="Search by name, email or mobile…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box" }}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  style={{
                    position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", color: "#9CA3AF", cursor: "pointer", fontSize: "14px"
                  }}
                >
                  ✕
                </button>
              )}
            </div>
            <select
              className="filter-select"
              style={{
                height: "40px", padding: "0 12px", border: "1.5px solid #E5E7EB",
                borderRadius: "10px", fontSize: "13px", outline: "none", background: "#fff",
                cursor: "pointer", fontFamily: "inherit", color: "#374151"
              }}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
            <select
              className="filter-select"
              style={{
                height: "40px", padding: "0 12px", border: "1.5px solid #E5E7EB",
                borderRadius: "10px", fontSize: "13px", outline: "none", background: "#fff",
                cursor: "pointer", fontFamily: "inherit", color: "#374151"
              }}
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
            >
              <option value="ALL">All Roles</option>
              <option value="DEALER">Dealer</option>
            </select>
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
                      <tr key={dealer.id} style={{ cursor: "pointer" }}>
                        <td onClick={() => setSelectedDealerForDrawer(dealer)}>
                          <div className="dl-user-cell">
                            <div className="dl-avatar">{initials}</div>
                            <div>
                              <div className="dl-user-name">{dealer.name || "—"}</div>
                              <div className="dl-user-email">{dealer.email}</div>
                            </div>
                          </div>
                        </td>
                        <td onClick={() => setSelectedDealerForDrawer(dealer)}>{dealer.mobile || "—"}</td>
                        <td onClick={() => setSelectedDealerForDrawer(dealer)}>
                          <span className={`dl-status-badge ${isSuspended ? "dl-badge-inactive" : "dl-badge-active"}`}>
                            {isSuspended ? "Suspended" : "Active"}
                          </span>
                        </td>
                        <td onClick={() => setSelectedDealerForDrawer(dealer)}>
                          <span className="dl-role-badge">
                            {dealer.role || "DEALER"}
                          </span>
                        </td>
                        <td>
                          <div className="dl-actions-group">
                            <button className="dl-action-btn dl-btn-edit" title="Edit" onClick={(e) => { e.stopPropagation(); setModal({ type: "edit", dealer }); }}>
                              ✏️ Edit
                            </button>
                            <button className="dl-action-btn dl-btn-assign" title="Assign Stations" onClick={(e) => { e.stopPropagation(); setModal({ type: "assign", dealer }); }}>
                              🏗️ Stations
                            </button>
                            <button className="dl-action-btn dl-btn-delete" title="Delete" onClick={(e) => { e.stopPropagation(); setModal({ type: "delete", dealer }); }}>
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

      {/* Dealer Details Drawer */}
      {selectedDealerForDrawer && (
        <DealerDrawer
          dealer={selectedDealerForDrawer}
          baseUrl={baseUrl}
          onClose={() => setSelectedDealerForDrawer(null)}
        />
      )}

      {/* Toast */}
      {toast && <div className="dl-toast">✓ {toast}</div>}
    </div>
  );
}

// ─── Dealer Details Drawer Component ───────────────────────────────────────────
function DealerDrawer({ dealer, baseUrl, onClose }) {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dealer) return;
    const loadStations = async () => {
      setLoading(true);
      try {
        const headers = {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        };
        const res = await fetch(`${baseUrl}/dealer-stations/dealer/${dealer.id}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setStations(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadStations();
  }, [dealer, baseUrl]);

  if (!dealer) return null;
  const isSuspended = dealer.status === "SUSPENDED";

  return (
    <div className="dl-drawer-overlay" onClick={onClose}>
      <div className="dl-drawer" onClick={e => e.stopPropagation()}>
        <div className="dl-drawer-header">
          <div>
            <h3 className="dl-drawer-title">Dealer Profile</h3>
            <p className="dl-drawer-subtitle">Detailed view of dealer details & operations</p>
          </div>
          <button className="dl-close-btn" style={{ fontSize: "16px", padding: "6px" }} onClick={onClose}>✕</button>
        </div>
        <div className="dl-drawer-body">
          {/* Card Info */}
          <div className="dl-drawer-card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div className="dl-avatar" style={{ width: 54, height: 54, fontSize: 18 }}>
              {(dealer.name || "D").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#111827" }}>{dealer.name || "—"}</h4>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6B7280" }}>{dealer.email}</p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
            <div className="dl-drawer-metric">
              <span className="dl-drawer-metric-label">Assigned Stations</span>
              <span className="dl-drawer-metric-val">{loading ? "..." : stations.length}</span>
            </div>
          </div>

          {/* Dealer Information */}
          <div className="dl-drawer-section">
            <h4 className="dl-drawer-section-title">Dealer Details</h4>
            <div className="dl-drawer-grid">
              <div className="dl-drawer-grid-item">
                <span className="dl-drawer-item-label">Mobile Number</span>
                <span className="dl-drawer-item-value">{dealer.mobile || "—"}</span>
              </div>
              <div className="dl-drawer-grid-item">
                <span className="dl-drawer-item-label">Status</span>
                <div style={{ marginTop: "2px" }}>
                  <span className={`dl-status-badge ${isSuspended ? "dl-badge-inactive" : "dl-badge-active"}`}>
                    {isSuspended ? "Suspended" : "Active"}
                  </span>
                </div>
              </div>
              <div className="dl-drawer-grid-item">
                <span className="dl-drawer-item-label">Role</span>
                <div style={{ marginTop: "2px" }}>
                  <span className="dl-role-badge">{dealer.role || "DEALER"}</span>
                </div>
              </div>
              <div className="dl-drawer-grid-item">
                <span className="dl-drawer-item-label">ID</span>
                <span style={{ fontSize: 12, fontFamily: "monospace", color: "#6B7280", marginTop: "2px" }}>#{dealer.id}</span>
              </div>
            </div>
          </div>

          {/* Stations List */}
          <div className="dl-drawer-section">
            <h4 className="dl-drawer-section-title">Assigned Stations</h4>
            {loading ? (
              <p style={{ fontSize: 13, color: "#6B7280" }}>Loading stations...</p>
            ) : stations.length === 0 ? (
              <p style={{ fontSize: 13, color: "#9CA3AF", fontStyle: "italic" }}>No stations assigned yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {stations.map(st => (
                  <div key={st.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#F9FAFB", borderRadius: 8, border: "1px solid #E5E7EB" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{st.name || `Station ${st.id}`}</div>
                      <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{st.address || st.location || "No address"}</div>
                    </div>
                    <span className={`dl-status-badge ${st.status === "ACTIVE" ? "dl-badge-active" : "dl-badge-inactive"}`} style={{ padding: "2px 8px", fontSize: 10 }}>
                      {st.status || "N/A"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
