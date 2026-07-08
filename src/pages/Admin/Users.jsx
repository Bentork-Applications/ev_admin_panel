import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import RegisterCard from "./form/RegisterCard";

import totalIcon from "../../assets/icons/stationicon/Vector.svg";
import activeIcon from "../../assets/icons/stationicon/green.svg";
import inactiveIcon from "../../assets/icons/stationicon/red.svg";
import recentIcon from "../../assets/icons/stationicon/yellow.svg";
import editIcon from "../../assets/icons/stationicon/edit.svg";
import deleteIcon from "../../assets/icons/stationicon/delete.svg";

// ─── Utility ───────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Status Config ──────────────────────────────────────────────────────────────
const APPLICATION_STATUSES = ["PENDING", "APPROVED", "DISPATCHED", "DELIVERED"];

const STATUS_CONFIG = {
  PENDING:    { label: "Pending",    bg: "#FEF3C7", color: "#92400E", dot: "#F59E0B", border: "#FCD34D" },
  APPROVED:   { label: "Approved",   bg: "#ECFDF5", color: "#065F46", dot: "#10B981", border: "#A7F3D0" },
  DISPATCHED: { label: "Dispatched", bg: "#EFF6FF", color: "#1E40AF", dot: "#3B82F6", border: "#BFDBFE" },
  DELIVERED:  { label: "Delivered",  bg: "#F0FDF4", color: "#14532D", dot: "#22C55E", border: "#86EFAC" },
  ACTIVE:     { label: "Active",     bg: "#ECFDF5", color: "#065F46", dot: "#10B981", border: "#A7F3D0" },
  INACTIVE:   { label: "Deactivated", bg: "#FEF2F2", color: "#991B1B", dot: "#EF4444", border: "#FECACA" },
  UNKNOWN:    { label: "Unknown",    bg: "#F3F4F6", color: "#374151", dot: "#9CA3AF", border: "#E5E7EB" },
};

const getStatusConf = (status) => STATUS_CONFIG[status?.toUpperCase()] || STATUS_CONFIG.UNKNOWN;

// ─── Sub-Components ─────────────────────────────────────────────────────────────

const LoadingSpinner = () => (
  <div style={{ textAlign: "center", padding: "60px 20px" }}>
    <div style={{
      width: 40, height: 40, border: "3px solid #E5E7EB",
      borderTopColor: "#111", borderRadius: "50%",
      animation: "spin 0.8s linear infinite",
      margin: "0 auto 16px",
    }} />
    <p style={{ color: "#6B7280", fontSize: 14 }}>Loading data...</p>
  </div>
);

const StatusBadge = ({ status }) => {
  const conf = getStatusConf(status);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 12px", borderRadius: 999,
      background: conf.bg, color: conf.color,
      border: `1px solid ${conf.border}`,
      fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: conf.dot, flexShrink: 0 }} />
      {conf.label}
    </span>
  );
};

const StatCard = ({ title, value, icon, subtext, accent }) => (
  <div style={{
    background: "#fff", borderRadius: 16, padding: "20px 24px",
    border: "1px solid #E5E7EB", display: "flex", flexDirection: "column",
    gap: 4, boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    transition: "box-shadow 0.2s",
  }}
    onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"}
    onMouseLeave={e => e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"}
  >
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 500 }}>{title}</span>
      {icon && <img src={icon} alt="" style={{ width: 20, height: 20, opacity: 0.6 }} />}
    </div>
    <div style={{ fontSize: 32, fontWeight: 700, color: "#111", fontFamily: "'Lexend', sans-serif", lineHeight: 1.1 }}>
      {value ?? "—"}
    </div>
    {subtext && <div style={{ fontSize: 12, color: accent || "#6B7280" }}>{subtext}</div>}
  </div>
);

// Status Timeline for an application
const StatusTimeline = ({ status }) => {
  const steps = APPLICATION_STATUSES;
  const currentIdx = steps.indexOf(status?.toUpperCase());

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, width: "100%" }}>
      {steps.map((step, i) => {
        const conf = getStatusConf(step);
        const done = currentIdx >= i;
        const active = currentIdx === i;
        return (
          <React.Fragment key={step}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: done ? conf.dot : "#E5E7EB",
                display: "flex", alignItems: "center", justifyContent: "center",
                border: active ? `3px solid ${conf.dot}` : "3px solid transparent",
                transition: "all 0.3s",
                boxShadow: active ? `0 0 0 4px ${conf.bg}` : "none",
              }}>
                {done && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span style={{
                fontSize: 10, marginTop: 4, fontWeight: active ? 700 : 500,
                color: done ? conf.color : "#9CA3AF", textAlign: "center",
              }}>
                {conf.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 2, height: 2, background: currentIdx > i ? conf.dot : "#E5E7EB",
                marginBottom: 16, transition: "background 0.3s",
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// Application Detail Drawer
const ApplicationDrawer = ({ app, onClose, onProcess, baseUrl }) => {
  const [updateStatus, setUpdateStatus] = useState("");
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState(null);

  if (!app) return null;

  const handleStatusUpdate = async (newStatus) => {
    if (newStatus === "APPROVE") {
      onProcess(app);
      return;
    }
    setUpdating(true);
    setUpdateMsg(null);
    const token = localStorage.getItem("token");
    try {
      let endpoint = "";
      let method = "PUT";
      if (newStatus === "DISPATCHED") {
        endpoint = `${baseUrl}/rfid-applications/${app.id}/status?status=DISPATCHED`;
      } else if (newStatus === "DELIVERED") {
        endpoint = `${baseUrl}/rfid-applications/${app.id}/status?status=DELIVERED`;
      } else {
        setUpdateMsg({ type: "error", text: "Unsupported action." });
        setUpdating(false);
        return;
      }
      const res = await fetch(endpoint, {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Update failed");
      }
      setUpdateMsg({ type: "success", text: `Status updated to ${newStatus}` });
      setTimeout(() => onClose(true), 1200);
    } catch (e) {
      setUpdateMsg({ type: "error", text: e.message });
    } finally {
      setUpdating(false);
    }
  };

  const conf = getStatusConf(app.status);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 2000,
      display: "flex", alignItems: "center", justifyContent: "flex-end",
    }} onClick={(e) => e.target === e.currentTarget && onClose(false)}>
      <div style={{
        width: 480, height: "100%", background: "#fff", overflowY: "auto",
        boxShadow: "-8px 0 32px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column",
        animation: "slideIn 0.25s ease",
      }}>
        {/* Header */}
        <div style={{ padding: "24px 28px 20px", borderBottom: "1px solid #F3F4F6" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Request Details</h3>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6B7280" }}>
                Application #{app.id}
              </p>
            </div>
            <button onClick={() => onClose(false)} style={{
              background: "#F3F4F6", border: "none", borderRadius: 8,
              width: 32, height: 32, display: "flex", alignItems: "center",
              justifyContent: "center", cursor: "pointer", fontSize: 18, color: "#374151",
            }}>×</button>
          </div>
          <div style={{ marginTop: 16 }}>
            <StatusBadge status={app.status} />
          </div>
        </div>

        {/* Timeline */}
        <div style={{ padding: "24px 28px", borderBottom: "1px solid #F3F4F6" }}>
          <p style={{ margin: "0 0 16px", fontSize: 12, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Request Progress
          </p>
          <StatusTimeline status={app.status} />
        </div>

        {/* Details */}
        <div style={{ padding: "24px 28px", flex: 1 }}>
          <p style={{ margin: "0 0 16px", fontSize: 12, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Applicant Information
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <InfoRow label="Full Name" value={app.fullName || app.user?.name || "—"} />
            <InfoRow label="Email" value={app.email || app.user?.email || "—"} />
            <InfoRow label="Mobile" value={app.mobile || app.user?.mobile || "—"} />
            <InfoRow label="Shipping Address" value={app.address || "—"} multiline />
            <InfoRow label="Submitted" value={`${formatDate(app.createdAt)} (${timeAgo(app.createdAt)})`} />
            {app.updatedAt && app.updatedAt !== app.createdAt && (
              <InfoRow label="Last Updated" value={`${formatDate(app.updatedAt)} (${timeAgo(app.updatedAt)})`} />
            )}
            {(app.assignedCard?.cardNumber || app.cardNumber) && (
              <InfoRow label="Assigned Card #" value={app.assignedCard?.cardNumber || app.cardNumber} mono />
            )}
            {app.assignedCard && (
              <InfoRow label="Card Status" value={app.assignedCard.active ? "Active" : "Inactive"} />
            )}
          </div>

          {/* Action Buttons */}
          {updateMsg && (
            <div style={{
              marginTop: 20, padding: "10px 14px", borderRadius: 8,
              background: updateMsg.type === "success" ? "#ECFDF5" : "#FEF2F2",
              color: updateMsg.type === "success" ? "#065F46" : "#991B1B",
              fontSize: 13, fontWeight: 500,
            }}>
              {updateMsg.type === "success" ? "✓" : "✗"} {updateMsg.text}
            </div>
          )}

          <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
            {app.status === "PENDING" && (
              <button
                onClick={() => onProcess(app)}
                disabled={updating}
                style={{
                  background: "#111", color: "#fff", border: "none",
                  borderRadius: 10, padding: "12px 20px", fontSize: 14,
                  fontWeight: 600, cursor: "pointer", width: "100%",
                  opacity: updating ? 0.6 : 1,
                }}
              >
                ✓ Approve & Assign Card
              </button>
            )}
            {app.status === "APPROVED" && (
              <button
                onClick={() => handleStatusUpdate("DISPATCHED")}
                disabled={updating}
                style={{
                  background: "#1D4ED8", color: "#fff", border: "none",
                  borderRadius: 10, padding: "12px 20px", fontSize: 14,
                  fontWeight: 600, cursor: "pointer", width: "100%",
                  opacity: updating ? 0.6 : 1,
                }}
              >
                {updating ? "Updating..." : "🚚 Mark as Dispatched"}
              </button>
            )}
            {app.status === "DISPATCHED" && (
              <button
                onClick={() => handleStatusUpdate("DELIVERED")}
                disabled={updating}
                style={{
                  background: "#059669", color: "#fff", border: "none",
                  borderRadius: 10, padding: "12px 20px", fontSize: 14,
                  fontWeight: 600, cursor: "pointer", width: "100%",
                  opacity: updating ? 0.6 : 1,
                }}
              >
                {updating ? "Updating..." : "✅ Mark as Delivered"}
              </button>
            )}
            {app.status === "DELIVERED" && app.assignedCard && !app.assignedCard.active && (
              <button
                onClick={async () => {
                  setUpdating(true);
                  const token = localStorage.getItem("token");
                  try {
                    const res = await fetch(`${baseUrl}/rfid-card/${app.assignedCard.id}/status`, {
                      method: "PUT",
                      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                      body: JSON.stringify({ active: true }),
                    });
                    if (!res.ok) throw new Error("Failed to activate card");
                    setUpdateMsg({ type: "success", text: "RFID Card activated successfully!" });
                    setTimeout(() => onClose(true), 1200);
                  } catch (err) {
                    setUpdateMsg({ type: "error", text: err.message });
                  } finally {
                    setUpdating(false);
                  }
                }}
                disabled={updating}
                style={{
                  background: "#10B981", color: "#fff", border: "none",
                  borderRadius: 10, padding: "12px 20px", fontSize: 14,
                  fontWeight: 600, cursor: "pointer", width: "100%",
                  opacity: updating ? 0.6 : 1,
                }}
              >
                {updating ? "Activating..." : "⚡ Activate RFID Card"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoRow = ({ label, value, mono, multiline }) => (
  <div style={{ display: "flex", gap: 12, alignItems: multiline ? "flex-start" : "center" }}>
    <span style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 500, minWidth: 120, flexShrink: 0 }}>{label}</span>
    <span style={{
      fontSize: 13, color: "#111", fontWeight: 500,
      fontFamily: mono ? "'Courier New', monospace" : "inherit",
      wordBreak: "break-word",
    }}>
      {value}
    </span>
  </div>
);

// Confirm Delete Modal
const ConfirmDeleteModal = ({ onCancel, onConfirm, loading }) => (
  <div style={{
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000,
  }}>
    <div style={{
      background: "#fff", borderRadius: 20, padding: 32, width: 380,
      boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: "50%", background: "#FEF2F2",
        display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
      </div>
      <h3 style={{ margin: "0 0 8px", textAlign: "center", fontSize: 18 }}>Delete Card?</h3>
      <p style={{ margin: "0 0 24px", textAlign: "center", fontSize: 14, color: "#6B7280" }}>
        This action cannot be undone. The RFID card will be permanently removed.
      </p>
      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: "11px", borderRadius: 10, border: "1px solid #E5E7EB",
          background: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#374151",
        }}>Cancel</button>
        <button onClick={onConfirm} disabled={loading} style={{
          flex: 1, padding: "11px", borderRadius: 10, border: "none",
          background: "#DC2626", color: "#fff", fontSize: 14, fontWeight: 600,
          cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
        }}>
          {loading ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  </div>
);

// Register Card Modal Wrapper
const RegisterModal = ({ onClose, onCardRegistered, baseUrl, application }) => (
  <div style={{
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2500,
  }} onClick={(e) => e.target === e.currentTarget && onClose()}>
    <div style={{ background: "#fff", borderRadius: 20, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
      <RegisterCard
        onClose={onClose}
        onCardRegistered={onCardRegistered}
        baseUrl={baseUrl}
        application={application}
      />
    </div>
  </div>
);

// ─── Main Page ──────────────────────────────────────────────────────────────────

function Users({ baseUrl }) {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("registered");
  const [cards, setCards] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [appsLoading, setAppsLoading] = useState(false);
  const [summaryData, setSummaryData] = useState({ totalCards: "…", activeCards: "…", inactiveCards: "…", recentlyAdded: "…" });
  const [refreshKey, setRefreshKey] = useState(0);

  // Modal state
  const [registerModal, setRegisterModal] = useState({ open: false, application: null });
  const [drawerApp, setDrawerApp] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Filters
  const [cardSearch, setCardSearch] = useState("");
  const [appSearch, setAppSearch] = useState("");
  const [appStatusFilter, setAppStatusFilter] = useState("ALL");
  const [cardStatusFilter, setCardStatusFilter] = useState("ALL");

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Fetch Cards ────────────────────────────────────────────────────────────
  const fetchCards = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/"); return; }
    setLoading(true);
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    try {
      const res = await fetch(`${baseUrl}/rfid-card`, { headers });
      if (res.status === 401 || res.status === 403) { navigate("/"); return; }
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setCards(list);
      // Calc recently added
      const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recent = list.filter(c => new Date(c.createdAt) >= sevenDaysAgo).length;
      setSummaryData(prev => ({ ...prev, recentlyAdded: recent }));
    } catch (e) {
      console.error("Failed to fetch cards:", e);
    } finally {
      setLoading(false);
    }
  }, [baseUrl, navigate]);

  // ── Fetch Summary ──────────────────────────────────────────────────────────
  const fetchSummary = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    const endpoints = [
      ["totalCards", "/rfid-card/total"],
      ["activeCards", "/rfid-card/active"],
      ["inactiveCards", "/rfid-card/inactive"],
    ];
    for (const [key, path] of endpoints) {
      fetch(`${baseUrl}${path}`, { headers })
        .then(r => r.ok ? r.text() : null)
        .then(text => { if (text !== null) setSummaryData(prev => ({ ...prev, [key]: text })); })
        .catch(() => {});
    }
  }, [baseUrl]);

  // ── Fetch Applications ─────────────────────────────────────────────────────
  const fetchApplications = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setAppsLoading(true);
    try {
      const res = await fetch(`${baseUrl}/rfid-applications`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setApplications(Array.isArray(data) ? data : []);
        window.dispatchEvent(new CustomEvent("refresh-pending-counts"));
      }
    } catch (e) {
      console.error("Failed to fetch applications:", e);
    } finally {
      setAppsLoading(false);
    }
  }, [baseUrl]);

  useEffect(() => {
    fetchCards();
    fetchSummary();
    fetchApplications();
  }, [refreshKey, fetchCards, fetchSummary, fetchApplications]);

  const handleRefresh = () => setRefreshKey(prev => prev + 1);

  // ── Delete Card ───────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${baseUrl}/rfid-card/${deleteTarget}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast("Card deleted successfully.");
        setDeleteTarget(null);
        handleRefresh();
      } else {
        showToast("Failed to delete card.", "error");
      }
    } catch {
      showToast("Error deleting card.", "error");
    } finally {
      setDeleting(false);
    }
  };

  // ── Toggle Card Status ──────────────────────────────────────────────────
  const handleToggleActive = async (card) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const newActive = !card.active;
    try {
      const res = await fetch(`${baseUrl}/rfid-card/${card.id}/status`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ active: newActive }),
      });
      if (res.ok) {
        setCards(prevCards =>
          prevCards.map(c => c.id === card.id ? { ...c, active: newActive } : c)
        );
        showToast(`Card status updated to ${newActive ? "Active" : "Deactivated"}.`);
        fetchSummary();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.message || "Failed to update card status.", "error");
      }
    } catch (e) {
      console.error("Error updating status:", e);
      showToast("Error updating card status.", "error");
    }
  };

  // ── Filters ───────────────────────────────────────────────────────────────
  const filteredCards = cards.filter(c => {
    const term = cardSearch.toLowerCase();
    const matchSearch =
      (c.user?.name || "").toLowerCase().includes(term) ||
      (c.cardNumber || "").toLowerCase().includes(term) ||
      (c.user?.email || "").toLowerCase().includes(term);
    const matchStatus =
      cardStatusFilter === "ALL" ||
      (cardStatusFilter === "ACTIVE" && c.active) ||
      (cardStatusFilter === "INACTIVE" && !c.active);
    return matchSearch && matchStatus;
  });

  const filteredApps = applications.filter(app => {
    const term = appSearch.toLowerCase();
    const matchSearch =
      (app.fullName || app.user?.name || "").toLowerCase().includes(term) ||
      (app.email || app.user?.email || "").toLowerCase().includes(term) ||
      (app.mobile || app.user?.mobile || "").toLowerCase().includes(term) ||
      (app.address || "").toLowerCase().includes(term);
    const matchStatus = appStatusFilter === "ALL" || app.status === appStatusFilter;
    return matchSearch && matchStatus;
  });

  const pendingCount = applications.filter(a => a.status === "PENDING").length;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes fadeUp { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes toastIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        .rfid-page { padding: 24px; background: #F6F7F9; min-height: 100vh; font-family: 'Inter', sans-serif; }
        
        .rfid-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .rfid-title { font-size: 26px; font-weight: 700; color: #0F172A; font-family: 'Lexend', sans-serif; margin: 0; letter-spacing: -0.5px; }
        .rfid-subtitle { font-size: 14px; color: #64748B; margin: 4px 0 0; }
        .rfid-header-actions { display: flex; gap: 10px; align-items: center; }

        .rfid-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
        
        .rfid-card-section { background: #fff; border-radius: 20px; border: 1px solid #E9ECF0; overflow: hidden; }
        
        .tab-bar { display: flex; gap: 4px; padding: 16px 20px 0; border-bottom: 1px solid #F1F5F9; }
        .tab-btn { padding: 10px 18px; border: none; background: none; font-size: 14px; font-weight: 500; color: #64748B; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; border-radius: 8px 8px 0 0; display: flex; align-items: center; gap: 8px; transition: all 0.15s; }
        .tab-btn:hover { color: #0F172A; background: #F8FAFC; }
        .tab-btn.active { color: #0F172A; border-bottom-color: #0F172A; font-weight: 700; }
        .tab-badge { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; background: #E2E8F0; color: #475569; }
        .tab-badge.warn { background: #FEF3C7; color: #92400E; }

        .table-toolbar { display: flex; gap: 12px; align-items: center; padding: 16px 20px; flex-wrap: wrap; }
        .search-wrap { position: relative; flex: 1; min-width: 220px; }
        .search-wrap svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #9CA3AF; }
        .search-input { width: 100%; height: 40px; padding: 0 12px 0 36px; border: 1.5px solid #E5E7EB; border-radius: 10px; font-size: 14px; outline: none; background: #F8FAFC; font-family: 'Inter', sans-serif; transition: border-color 0.15s, box-shadow 0.15s; box-sizing: border-box; }
        .search-input:focus { border-color: #111; background: #fff; box-shadow: 0 0 0 3px rgba(17,17,17,0.06); }

        .filter-select { height: 40px; padding: 0 12px; border: 1.5px solid #E5E7EB; border-radius: 10px; font-size: 13px; outline: none; background: #fff; cursor: pointer; font-family: 'Inter', sans-serif; color: #374151; }
        .filter-select:focus { border-color: #111; }

        .primary-btn { height: 40px; padding: 0 18px; background: #0F172A; color: #fff; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; white-space: nowrap; font-family: 'Inter', sans-serif; transition: background 0.15s, transform 0.1s; }
        .primary-btn:hover { background: #1E293B; }
        .primary-btn:active { transform: scale(0.98); }
        .secondary-btn { height: 40px; padding: 0 16px; background: #fff; color: #374151; border: 1.5px solid #E5E7EB; border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 8px; font-family: 'Inter', sans-serif; transition: background 0.15s; }
        .secondary-btn:hover { background: #F8FAFC; }

        .data-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .data-table th { text-align: left; padding: 12px 20px; font-weight: 600; color: #64748B; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid #F1F5F9; background: #FAFBFC; }
        .data-table td { padding: 14px 20px; color: #1E293B; border-bottom: 1px solid #F8FAFC; vertical-align: middle; }
        .data-table tr:last-child td { border-bottom: none; }
        .data-table tr { transition: background 0.1s; }
        .data-table tr:hover td { background: #F8FAFC; }
        .data-table tr.clickable { cursor: pointer; }

        .user-cell { display: flex; flex-direction: column; }
        .user-name { font-weight: 600; color: #0F172A; }
        .user-email { font-size: 12px; color: #94A3B8; margin-top: 2px; }
        .card-number { font-family: 'Courier New', monospace; font-size: 13px; color: #475569; background: #F1F5F9; padding: 3px 8px; border-radius: 6px; }

        .action-cell { display: flex; gap: 4px; align-items: center; }
        .icon-btn { background: none; border: none; cursor: pointer; padding: 6px; border-radius: 8px; opacity: 0.6; transition: opacity 0.15s, background 0.15s; display: flex; align-items: center; }
        .icon-btn:hover { opacity: 1; background: #F1F5F9; }
        .icon-btn.danger:hover { background: #FEF2F2; }

        .empty-state { text-align: center; padding: 60px 20px; }
        .empty-icon { width: 60px; height: 60px; border-radius: 16px; background: #F1F5F9; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
        .empty-title { font-size: 16px; font-weight: 600; color: #374151; margin: 0 0 6px; }
        .empty-sub { font-size: 14px; color: #9CA3AF; margin: 0; }

        .toast-wrap { position: fixed; bottom: 28px; right: 28px; z-index: 9999; animation: toastIn 0.3s ease; }
        .toast { padding: 14px 20px; border-radius: 12px; font-size: 14px; font-weight: 500; display: flex; align-items: center; gap: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
        .toast.success { background: #0F172A; color: #fff; }
        .toast.error { background: #DC2626; color: #fff; }

        .app-row-info { display: flex; flex-direction: column; }
        .app-name { font-weight: 600; color: #0F172A; }
        .app-contact { font-size: 12px; color: #94A3B8; margin-top: 2px; }

        .address-cell { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #64748B; font-size: 13px; }

        .status-toggle-switch {
          position: relative;
          display: inline-block;
          width: 34px;
          height: 20px;
        }
        .status-toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .status-slider {
          position: absolute;
          cursor: pointer;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: #cbd5e1;
          transition: .3s;
          border-radius: 20px;
        }
        .status-slider:before {
          position: absolute;
          content: "";
          height: 14px;
          width: 14px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .3s;
          border-radius: 50%;
        }
        .status-toggle-switch input:checked + .status-slider {
          background-color: #10b981;
        }
        .status-toggle-switch input:checked + .status-slider:before {
          transform: translateX(14px);
        }

        @media (max-width: 1024px) {
          .rfid-stats-grid { grid-template-columns: repeat(2, 1fr); }
          .table-toolbar { flex-direction: column; align-items: stretch; }
          .search-wrap { min-width: unset; }
        }
        @media (max-width: 640px) {
          .rfid-page { padding: 16px; }
          .rfid-stats-grid { grid-template-columns: 1fr 1fr; }
          .rfid-header { flex-direction: column; align-items: flex-start; gap: 12px; }
        }
      `}</style>

      <div className="rfid-page">
        {/* ── Header ── */}
        <div className="rfid-header">
          <div>
            <h1 className="rfid-title">RFID Card Manager</h1>
            <p className="rfid-subtitle">Manage registered cards and incoming card requests</p>
          </div>
          <div className="rfid-header-actions">
            <button className="secondary-btn" onClick={handleRefresh}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              Refresh
            </button>
            <button className="primary-btn" onClick={() => setRegisterModal({ open: true, application: null })}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Register Card
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="rfid-stats-grid">
          <StatCard title="Total Cards" value={summaryData.totalCards} icon={totalIcon} subtext="All registered RFID cards" />
          <StatCard title="Active Cards" value={summaryData.activeCards} icon={activeIcon} subtext="Currently enabled" />
          <StatCard title="Inactive Cards" value={summaryData.inactiveCards} icon={inactiveIcon} subtext="Disabled cards" />
          <StatCard title="Recently Added" value={summaryData.recentlyAdded} icon={recentIcon} subtext="Last 7 days" />
        </div>

        {/* ── Main Card ── */}
        <div className="rfid-card-section">
          {/* Tab Bar */}
          <div className="tab-bar">
            <button
              className={`tab-btn ${activeTab === "registered" ? "active" : ""}`}
              onClick={() => setActiveTab("registered")}
            >
              Registered Cards
              <span className="tab-badge">{cards.length}</span>
            </button>
            <button
              className={`tab-btn ${activeTab === "requests" ? "active" : ""}`}
              onClick={() => setActiveTab("requests")}
            >
              Card Requests
              {pendingCount > 0 && <span className="tab-badge warn">{pendingCount} pending</span>}
            </button>
          </div>

          {/* ── Registered Cards Tab ── */}
          {activeTab === "registered" && (
            <>
              <div className="table-toolbar">
                <div className="search-wrap">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    className="search-input"
                    placeholder="Search by name, email or card number..."
                    value={cardSearch}
                    onChange={e => setCardSearch(e.target.value)}
                  />
                </div>
                <select className="filter-select" value={cardStatusFilter} onChange={e => setCardStatusFilter(e.target.value)}>
                  <option value="ALL">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              {loading ? <LoadingSpinner /> : filteredCards.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
                    </svg>
                  </div>
                  <p className="empty-title">{cardSearch || cardStatusFilter !== "ALL" ? "No cards match your filters" : "No RFID cards registered yet"}</p>
                  <p className="empty-sub">{cardSearch || cardStatusFilter !== "ALL" ? "Try adjusting your search or filter." : "Click \"Register Card\" to add the first RFID card."}</p>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Card Holder</th>
                        <th>Card Number</th>
                        <th>Status</th>
                        <th>Registered On</th>
                        <th style={{ textAlign: "center" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCards.map((card, idx) => (
                        <tr key={card.id}>
                          <td style={{ color: "#94A3B8", fontWeight: 500 }}>{idx + 1}</td>
                          <td>
                            <div className="user-cell">
                              <span className="user-name">{card.user?.name || "Unknown User"}</span>
                              <span className="user-email">{card.user?.email || "—"}</span>
                            </div>
                          </td>
                          <td>
                            <span className="card-number">{card.cardNumber || "N/A"}</span>
                          </td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <StatusBadge status={card.active ? "ACTIVE" : "INACTIVE"} />
                              <label className="status-toggle-switch">
                                <input
                                  type="checkbox"
                                  checked={card.active}
                                  onChange={() => handleToggleActive(card)}
                                />
                                <span className="status-slider"></span>
                              </label>
                            </div>
                          </td>
                          <td style={{ color: "#64748B", fontSize: 13 }}>
                            {formatDate(card.createdAt)}
                            <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{timeAgo(card.createdAt)}</div>
                          </td>
                          <td>
                            <div className="action-cell" style={{ justifyContent: "center" }}>
                              <button className="icon-btn danger" title="Delete Card" onClick={() => setDeleteTarget(card.id)}>
                                <img src={deleteIcon} alt="Delete" style={{ width: 16, height: 16 }} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Footer count */}
              {!loading && filteredCards.length > 0 && (
                <div style={{ padding: "12px 20px", borderTop: "1px solid #F1F5F9", fontSize: 13, color: "#64748B", display: "flex", justifyContent: "space-between" }}>
                  <span>Showing <strong>{filteredCards.length}</strong> of <strong>{cards.length}</strong> cards</span>
                  {(cardSearch || cardStatusFilter !== "ALL") && (
                    <button onClick={() => { setCardSearch(""); setCardStatusFilter("ALL"); }} style={{ background: "none", border: "none", color: "#6366F1", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
                      Clear filters
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── Card Requests Tab ── */}
          {activeTab === "requests" && (
            <>
              {/* Receipt Alert Notification Banner */}
              {applications.some(app => app.status === "DELIVERED" && app.assignedCard && !app.assignedCard.active) && (
                <div style={{
                  margin: "16px 20px 0",
                  padding: "14px 20px",
                  background: "#ECFDF5",
                  border: "1px solid #10B981",
                  borderRadius: "12px",
                  color: "#065F46",
                  fontSize: "14px",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  boxShadow: "0 4px 6px -1px rgba(16, 185, 129, 0.1)"
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <span>RFID Card received successfully. Please activate your card.</span>
                </div>
              )}

              <div className="table-toolbar">
                <div className="search-wrap">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    className="search-input"
                    placeholder="Search by name, email, mobile or address..."
                    value={appSearch}
                    onChange={e => setAppSearch(e.target.value)}
                  />
                </div>
                <select className="filter-select" value={appStatusFilter} onChange={e => setAppStatusFilter(e.target.value)}>
                  <option value="ALL">All Statuses</option>
                  {APPLICATION_STATUSES.map(s => (
                    <option key={s} value={s}>{getStatusConf(s).label}</option>
                  ))}
                </select>
              </div>

              {/* Status Overview Pills */}
              <div style={{ padding: "0 20px 16px", display: "flex", gap: 8, flexWrap: "wrap" }}>
                {APPLICATION_STATUSES.map(s => {
                  const count = applications.filter(a => a.status === s).length;
                  const conf = getStatusConf(s);
                  return count > 0 ? (
                    <button
                      key={s}
                      onClick={() => setAppStatusFilter(prev => prev === s ? "ALL" : s)}
                      style={{
                        padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                        background: appStatusFilter === s ? conf.bg : "#F8FAFC",
                        color: appStatusFilter === s ? conf.color : "#64748B",
                        border: `1px solid ${appStatusFilter === s ? conf.border : "#E5E7EB"}`,
                        cursor: "pointer", transition: "all 0.15s",
                      }}
                    >
                      {conf.label}: {count}
                    </button>
                  ) : null;
                })}
              </div>

              {appsLoading ? <LoadingSpinner /> : filteredApps.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
                    </svg>
                  </div>
                  <p className="empty-title">{appSearch || appStatusFilter !== "ALL" ? "No requests match your filters" : "No card requests yet"}</p>
                  <p className="empty-sub">{appSearch || appStatusFilter !== "ALL" ? "Try adjusting your search or filter." : "RFID card requests from users will appear here."}</p>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Applicant</th>
                        <th>Mobile</th>
                        <th>Shipping Address</th>
                        <th>Status</th>
                        <th>Submitted</th>
                        <th style={{ textAlign: "center" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredApps.map((app, idx) => (
                        <tr key={app.id} className="clickable" onClick={() => setDrawerApp(app)}>
                          <td style={{ color: "#94A3B8", fontWeight: 500 }}>{idx + 1}</td>
                          <td>
                            <div className="app-row-info">
                              <span className="app-name">{app.fullName || app.user?.name || "—"}</span>
                              <span className="app-contact">{app.email || app.user?.email || "—"}</span>
                            </div>
                          </td>
                          <td style={{ fontSize: 13, color: "#475569" }}>{app.mobile || app.user?.mobile || "—"}</td>
                          <td>
                            <span className="address-cell" title={app.address}>{app.address || "—"}</span>
                          </td>
                          <td><StatusBadge status={app.status} /></td>
                          <td style={{ fontSize: 13, color: "#64748B" }}>
                            {formatDate(app.createdAt)}
                            <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{timeAgo(app.createdAt)}</div>
                          </td>
                          <td>
                            <div className="action-cell" style={{ justifyContent: "center", gap: 8 }}>
                              {app.status === "PENDING" && (
                                <button
                                  className="primary-btn"
                                  style={{ height: 32, padding: "0 12px", fontSize: 12 }}
                                  onClick={(e) => { e.stopPropagation(); setRegisterModal({ open: true, application: app }); }}
                                >
                                  Approve
                                </button>
                              )}
                              {app.status === "DELIVERED" && app.assignedCard && !app.assignedCard.active && (
                                <button
                                  className="primary-btn"
                                  style={{ height: 32, padding: "0 12px", fontSize: 12, backgroundColor: "#10B981" }}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const token = localStorage.getItem("token");
                                    try {
                                      const res = await fetch(`${baseUrl}/rfid-card/${app.assignedCard.id}/status`, {
                                        method: "PUT",
                                        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                                        body: JSON.stringify({ active: true }),
                                      });
                                      if (!res.ok) throw new Error();
                                      showToast("RFID Card activated successfully!");
                                      handleRefresh();
                                    } catch {
                                      showToast("Failed to activate card.", "error");
                                    }
                                  }}
                                >
                                  Activate
                                </button>
                              )}
                              <button
                                  className="secondary-btn"
                                  style={{ height: 32, padding: "0 12px", fontSize: 12 }}
                                  onClick={(e) => { e.stopPropagation(); setDrawerApp(app); }}
                                >
                                  View
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Footer count */}
              {!appsLoading && filteredApps.length > 0 && (
                <div style={{ padding: "12px 20px", borderTop: "1px solid #F1F5F9", fontSize: 13, color: "#64748B", display: "flex", justifyContent: "space-between" }}>
                  <span>Showing <strong>{filteredApps.length}</strong> of <strong>{applications.length}</strong> requests</span>
                  {(appSearch || appStatusFilter !== "ALL") && (
                    <button onClick={() => { setAppSearch(""); setAppStatusFilter("ALL"); }} style={{ background: "none", border: "none", color: "#6366F1", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
                      Clear filters
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Application Detail Drawer ── */}
      {drawerApp && (
        <ApplicationDrawer
          app={drawerApp}
          onClose={(refresh) => { setDrawerApp(null); if (refresh) { handleRefresh(); showToast("Status updated successfully."); } }}
          onProcess={(app) => { setDrawerApp(null); setRegisterModal({ open: true, application: app }); }}
          baseUrl={baseUrl}
        />
      )}

      {/* ── Register Card Modal ── */}
      {registerModal.open && (
        <RegisterModal
          onClose={() => setRegisterModal({ open: false, application: null })}
          onCardRegistered={() => {
            setRegisterModal({ open: false, application: null });
            handleRefresh();
            showToast(registerModal.application ? "Application approved and card assigned!" : "Card registered successfully!");
          }}
          baseUrl={baseUrl}
          application={registerModal.application}
        />
      )}

      {/* ── Delete Confirmation ── */}
      {deleteTarget && (
        <ConfirmDeleteModal
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
          loading={deleting}
        />
      )}

      {/* ── Toast Notification ── */}
      {toast && (
        <div className="toast-wrap">
          <div className={`toast ${toast.type}`}>
            {toast.type === "success" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            )}
            {toast.message}
          </div>
        </div>
      )}

    </>
  );
}

export default Users;
