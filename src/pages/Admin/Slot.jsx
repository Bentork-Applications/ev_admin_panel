import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";

const AddSlot = lazy(() => import("./form/AddSlot"));
const EditSlot = lazy(() => import("./form/EditSlot"));

// ── Icons ──────────────────────────────────────────────────────────────
const TotalIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const BookedIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const AvailableIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const ExpiredIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
const DeleteIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" /><path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);
const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);
const ChevronIcon = ({ isOpen }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    style={{
      transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
      transition: "transform 0.2s ease"
    }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// ── Helpers ────────────────────────────────────────────────────────────
const formatDisplayTime = (slot) => {
  if (slot.allDay) {
    // All-day recurring: use time-only fields
    const s = slot.startTimeOnly;
    const e = slot.endTimeOnly;
    if (!s) return "All Day";
    return `${s.substring(0, 5)} – ${e ? e.substring(0, 5) : "?"}`;
  }
  // Date-specific: parse full LocalDateTime
  const s = slot.startTime;
  const e = slot.endTime;
  if (!s) return "—";
  const fmt = (dt) => {
    try {
      return new Date(dt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return dt;
    }
  };
  return `${fmt(s)} – ${fmt(e)}`;
};

const formatDate = (slot) => {
  if (slot.allDay) return "Every day (recurring)";
  if (!slot.startTime) return "—";
  try {
    return new Date(slot.startTime).toLocaleDateString([], {
      weekday: "short", year: "numeric", month: "short", day: "numeric",
    });
  } catch {
    return slot.startTime;
  }
};

const computeStatus = (slot) => {
  if (slot.booked) return "BOOKED";

  const now = new Date();

  if (slot.allDay) {
    // Recurring: compare time-of-day only
    try {
      const [eh, em, es] = (slot.endTimeOnly || "23:59:59").split(":").map(Number);
      const endToday = new Date();
      endToday.setHours(eh, em, es || 0, 0);
      return now > endToday ? "EXPIRED" : "AVAILABLE";
    } catch (e) {
      console.error(e);
      return "AVAILABLE";
    }
  }

  // Date-specific: compare full datetime
  if (!slot.endTime) return "AVAILABLE";
  try {
    const endTime = new Date(slot.endTime);
    return now > endTime ? "EXPIRED" : "AVAILABLE";
  } catch (e) {
    console.error(e);
    return "AVAILABLE";
  }
};

// ── Toast ──────────────────────────────────────────────────────────────
function Toast({ message, type, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const bg = type === "error" ? "#FEF2F2" : type === "success" ? "#ECFDF5" : "#EFF6FF";
  const color = type === "error" ? "#DC2626" : type === "success" ? "#059669" : "#1D4ED8";
  const border = type === "error" ? "#FECACA" : type === "success" ? "#A7F3D0" : "#BFDBFE";
  const icon = type === "error" ? "⚠️" : type === "success" ? "✅" : "ℹ️";

  return (
    <div style={{
      position: "fixed", bottom: "24px", right: "24px", zIndex: 2000,
      background: bg, color, border: `1px solid ${border}`,
      borderRadius: "12px", padding: "14px 18px", fontSize: "14px", fontWeight: "500",
      display: "flex", alignItems: "center", gap: "10px",
      boxShadow: "0 10px 25px -5px rgba(0,0,0,0.12)",
      animation: "slideIn 0.3s ease",
      fontFamily: "'Lexend', sans-serif",
      maxWidth: "380px",
    }}>
      <span>{icon}</span>
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onDismiss} style={{ background: "none", border: "none", cursor: "pointer", color, fontSize: "16px", padding: 0, lineHeight: 1 }}>✕</button>
    </div>
  );
}

// ── Delete Confirm Modal ───────────────────────────────────────────────
function DeleteConfirmModal({ slot, onConfirm, onCancel, isDeleting }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100,
    }}>
      <div style={{
        background: "#fff", borderRadius: "20px", padding: "32px", maxWidth: "400px", width: "90%",
        boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
      }}>
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div style={{ width: "52px", height: "52px", background: "#FEF2F2", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: "700", color: "#111827" }}>Delete Slot?</h3>
          <p style={{ margin: 0, fontSize: "14px", color: "#6B7280", lineHeight: 1.5 }}>
            This will permanently delete slot #{slot.id}.
            {slot.booked && " ⚠️ This slot appears to be booked."}
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={onCancel} disabled={isDeleting}
            style={{ flex: 1, padding: "11px", borderRadius: "12px", border: "1.5px solid #E5E7EB", background: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: "14px", fontWeight: "500" }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={isDeleting}
            style={{ flex: 1, padding: "11px", borderRadius: "12px", border: "none", background: "#DC2626", color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: "14px", fontWeight: "600", opacity: isDeleting ? 0.7 : 1 }}>
            {isDeleting ? "Deleting…" : "Delete Slot"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────
export default function Slot({ baseUrl }) {
  const navigate = useNavigate();

  // Data
  const [stations, setStations] = useState([]);
  const [chargers, setChargers] = useState([]);
  const [selectedChargerId, setSelectedChargerId] = useState("");
  const [slots, setSlots] = useState([]);
  const [viewMode, setViewMode] = useState("all"); // "all" | "available" | "booked" | "expired"
  const [layoutView, setLayoutView] = useState("cards"); // "cards" | "table"
  const [searchQuery, setSearchQuery] = useState("");

  // Collapsible Date Groups Tracker
  const [collapsedGroups, setCollapsedGroups] = useState({});

  // UI State
  const [loadingChargers, setLoadingChargers] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [slotToEdit, setSlotToEdit] = useState(null);
  const [slotToDelete, setSlotToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState(null); // { message, type }
  const [refreshKey, setRefreshKey] = useState(0);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  const toggleGroup = (key) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // ── Fetch Chargers & Stations ────────────────────────────────────
  useEffect(() => {
    const fetchMeta = async () => {
      setLoadingChargers(true);
      const token = localStorage.getItem("token");
      if (!token) { navigate("/"); return; }

      try {
        const [stRes, chRes] = await Promise.all([
          fetch(`${baseUrl}/stations/all`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${baseUrl}/chargers/all`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (stRes.status === 401 || chRes.status === 401) {
          localStorage.removeItem("token");
          navigate("/");
          return;
        }

        const stData = await stRes.json();
        const chData = await chRes.json();

        const validStations = Array.isArray(stData) ? stData : [];
        const validChargers = Array.isArray(chData) ? chData : [];

        setStations(validStations);
        setChargers(validChargers);

        if (validChargers.length > 0) {
          setSelectedChargerId(String(validChargers[0].id));
        }
      } catch (err) {
        console.error("Failed to fetch meta:", err);
        showToast("Failed to load charger data.", "error");
      } finally {
        setLoadingChargers(false);
      }
    };
    fetchMeta();
  }, [baseUrl, navigate, showToast]);

  // ── Fetch Slots ───────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedChargerId) return;

    const fetchSlots = async () => {
      setLoadingSlots(true);
      const token = localStorage.getItem("token");
      // Always fetch all slots so that client can correctly group, calculate expired/available, and compute stats
      const endpoint = `/slots/charger/${selectedChargerId}`;

      try {
        const res = await fetch(`${baseUrl}${endpoint}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setSlots(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch slots:", err);
        showToast("Failed to load slots.", "error");
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [selectedChargerId, baseUrl, refreshKey, showToast]);

  // ── Auto-Refresh status every 60 seconds ───────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      // Trigger a state update or recalculation of status
      setRefreshKey((k) => k + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // ── Stats (Total, Available, Booked, Expired) ────────────────────
  const stats = useMemo(() => {
    let total = 0;
    let available = 0;
    let booked = 0;
    let expired = 0;

    slots.forEach((s) => {
      total++;
      const status = computeStatus(s);
      if (status === "BOOKED") {
        booked++;
      } else if (status === "EXPIRED") {
        expired++;
      } else {
        available++;
      }
    });

    return { total, available, booked, expired };
  }, [slots, refreshKey]);

  // ── Client-Side Filtered Slots ──────────────────────────────────
  const filteredSlots = useMemo(() => {
    return slots.filter((slot) => {
      const status = computeStatus(slot);
      if (viewMode === "all") return true;
      if (viewMode === "available") return status === "AVAILABLE";
      if (viewMode === "booked") return status === "BOOKED";
      if (viewMode === "expired") return status === "EXPIRED";
      return true;
    });
  }, [slots, viewMode, refreshKey]);

  // ── Client-Side Searched Slots ──────────────────────────────────
  const searchedSlots = useMemo(() => {
    if (!searchQuery) return filteredSlots;
    const query = searchQuery.toLowerCase().trim();
    return filteredSlots.filter((slot) => {
      if (String(slot.id).includes(query)) return true;
      const status = computeStatus(slot).toLowerCase();
      if (status.includes(query)) return true;
      const typeStr = slot.allDay ? "recurring every day" : "date-specific";
      if (typeStr.includes(query)) return true;
      const dateText = formatDate(slot).toLowerCase();
      if (dateText.includes(query)) return true;
      const timeText = formatDisplayTime(slot).toLowerCase();
      if (timeText.includes(query)) return true;
      return false;
    });
  }, [filteredSlots, searchQuery, refreshKey]);

  // ── Date-wise Grouping and Sorting ──────────────────────────────
  const groupedSlots = useMemo(() => {
    // Process each slot to attach computed status
    const processed = searchedSlots.map((s) => ({
      ...s,
      computedStatus: computeStatus(s),
    }));

    const groups = {};
    processed.forEach((s) => {
      let groupKey;
      let groupLabel;

      if (s.allDay) {
        groupKey = "recurring";
        groupLabel = "Recurring (Every Day)";
      } else {
        const dateStr = s.startTime ? s.startTime.split("T")[0] : "no-date";
        groupKey = dateStr;

        if (dateStr !== "no-date") {
          const today = new Date();
          const dateObj = new Date(dateStr);
          const isToday = today.toDateString() === dateObj.toDateString();

          const tomorrow = new Date();
          tomorrow.setDate(today.getDate() + 1);
          const isTomorrow = tomorrow.toDateString() === dateObj.toDateString();

          if (isToday) {
            groupLabel = "Today";
          } else if (isTomorrow) {
            groupLabel = "Tomorrow";
          } else {
            groupLabel = dateObj.toLocaleDateString([], {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
            });
          }
        } else {
          groupLabel = "Unknown Date";
        }
      }

      if (!groups[groupKey]) {
        groups[groupKey] = {
          key: groupKey,
          label: groupLabel,
          slots: [],
        };
      }
      groups[groupKey].slots.push(s);
    });

    // Time-wise Sorting (ascending) within each group
    Object.values(groups).forEach((g) => {
      g.slots.sort((a, b) => {
        const timeA = a.allDay
          ? a.startTimeOnly || "00:00:00"
          : a.startTime
            ? a.startTime.split("T")[1] || "00:00:00"
            : "00:00:00";
        const timeB = b.allDay
          ? b.startTimeOnly || "00:00:00"
          : b.startTime
            ? b.startTime.split("T")[1] || "00:00:00"
            : "00:00:00";
        return timeA.localeCompare(timeB);
      });
    });

    // Sort groups: recurring first, then dates chronologically
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === "recurring") return -1;
      if (b === "recurring") return 1;
      return a.localeCompare(b);
    });

    return sortedKeys.map((k) => groups[k]);
  }, [filteredSlots, refreshKey]);

  // ── Charger Grouped by Station ────────────────────────────────────
  const groupedChargers = useMemo(() => {
    const map = {};
    chargers.forEach((c) => {
      const stId = c.stationId || c.station_id || "unknown";
      if (!map[stId]) map[stId] = [];
      map[stId].push(c);
    });
    return map;
  }, [chargers]);

  const getStationName = (stId) => {
    const st = stations.find((s) => String(s.id) === String(stId));
    return st ? st.name : `Station ${stId}`;
  };

  // ── Delete ──────────────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!slotToDelete) return;
    setIsDeleting(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${baseUrl}/slots/${slotToDelete.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setSlotToDelete(null);
        setRefreshKey((k) => k + 1);
        showToast("Slot deleted successfully.", "success");
      } else if (res.status === 409) {
        setSlotToDelete(null);
        showToast(
          "Cannot delete — this slot has an active booking. Cancel the booking first.",
          "error"
        );
      } else {
        let msg = "Failed to delete slot.";
        try {
          const d = await res.json();
          msg = d.error || msg;
        } catch { }
        setSlotToDelete(null);
        showToast(msg, "error");
      }
    } catch (err) {
      console.error("Delete error:", err);
      setSlotToDelete(null);
      showToast("Network error while deleting.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditClick = (slot) => {
    setSlotToEdit(slot);
  };

  // ── Selected Charger Info ──────────────────────────────────────────
  const selectedCharger = chargers.find((c) => String(c.id) === String(selectedChargerId));

  return (
    <div className="slot-page">
      {/* ── Styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700&display=swap');

        @keyframes slideIn {
          from { transform: translateX(40px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }

        .slot-page {
          font-family: 'Lexend', sans-serif;
          background: #F8F9FA;
          min-height: 100vh;
          padding: 24px;
        }

        /* Header */
        .sp-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 28px;
          flex-wrap: wrap;
          gap: 16px;
        }
        .sp-title { font-size: 28px; font-weight: 700; color: #111827; margin: 0 0 4px 0; }
        .sp-subtitle { font-size: 14px; color: #6B7280; margin: 0; }

        /* Stats */
        .sp-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .sp-stat-card {
          background: #fff;
          border-radius: 16px;
          padding: 18px 20px;
          border: 1px solid #E5E7EB;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.03);
          animation: fadeIn 0.4s ease;
        }
        .sp-stat-icon {
          width: 44px; height: 44px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .sp-stat-label { font-size: 12px; font-weight: 500; color: #6B7280; margin: 0 0 4px 0; }
        .sp-stat-val { font-size: 24px; font-weight: 700; color: #111827; margin: 0; }

        /* Controls */
        .sp-controls {
          background: #fff;
          border-radius: 16px;
          border: 1px solid #E5E7EB;
          padding: 16px 20px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .sp-charger-label {
          font-size: 13px; font-weight: 600; color: #374151; white-space: nowrap;
        }
        .sp-charger-select {
          flex: 1; min-width: 220px; max-width: 300px;
          padding: 10px 14px;
          border: 1.5px solid #E5E7EB;
          border-radius: 10px;
          font-family: inherit;
          font-size: 14px;
          background: #F9FAFB;
          outline: none;
          cursor: pointer;
        }
        .sp-charger-select:focus { border-color: #111827; background: #fff; }

        .sp-search-input {
          padding: 10px 14px;
          border: 1.5px solid #E5E7EB;
          border-radius: 10px;
          font-family: inherit;
          font-size: 14px;
          background: #F9FAFB;
          outline: none;
          min-width: 180px;
          max-width: 240px;
          transition: border-color 0.2s, background-color 0.2s;
        }
        .sp-search-input:focus {
          border-color: #111827;
          background: #fff;
        }

        .sp-view-toggle {
          display: flex;
          background: #F3F4F6;
          border-radius: 10px;
          padding: 3px;
          gap: 2px;
        }
        .sp-view-btn {
          padding: 7px 14px;
          border: none;
          border-radius: 8px;
          background: transparent;
          font-family: inherit;
          font-size: 13px;
          font-weight: 500;
          color: #6B7280;
          cursor: pointer;
          transition: all 0.2s;
        }
        .sp-view-btn.active {
          background: #fff;
          color: #111827;
          font-weight: 600;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }

        .sp-layout-toggle {
          display: flex;
          background: #F3F4F6;
          border-radius: 10px;
          padding: 3px;
          gap: 2px;
        }
        .sp-layout-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border: none;
          border-radius: 8px;
          background: transparent;
          font-family: inherit;
          font-size: 13px;
          font-weight: 500;
          color: #6B7280;
          cursor: pointer;
          transition: all 0.2s;
        }
        .sp-layout-btn.active {
          background: #fff;
          color: #111827;
          font-weight: 600;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }

        /* Add Button */
        .sp-add-btn {
          margin-left: auto;
          background: #111827;
          color: #fff;
          border: none;
          border-radius: 12px;
          padding: 10px 20px;
          font-family: inherit;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: background 0.2s, transform 0.15s;
          white-space: nowrap;
        }
        .sp-add-btn:hover { background: #1F2937; transform: translateY(-1px); }
        .sp-add-btn:active { transform: translateY(0); }

        /* Charger Info Banner */
        .sp-charger-info {
          background: linear-gradient(135deg, #1F2937 0%, #374151 100%);
          border-radius: 16px;
          padding: 18px 24px;
          margin-bottom: 20px;
          color: #fff;
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .sp-charger-info-main { flex: 1; }
        .sp-charger-info-name { font-size: 16px; font-weight: 700; margin: 0 0 4px 0; }
        .sp-charger-info-sub { font-size: 13px; color: rgba(255,255,255,0.7); margin: 0; }
        .sp-charger-badge {
          background: rgba(255,255,255,0.15);
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 13px;
          font-weight: 600;
          color: #fff;
        }

        /* Collapsible group styles */
        .sp-group-container {
          margin-bottom: 24px;
          animation: fadeIn 0.3s ease;
        }
        .sp-group-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #111827;
          color: #fff;
          padding: 12px 20px;
          border-radius: 14px;
          cursor: pointer;
          user-select: none;
          margin-bottom: 16px;
          transition: background-color 0.2s;
        }
        .sp-group-header:hover {
          background: #1f2937;
        }
        .sp-group-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          font-weight: 600;
        }
        .sp-group-badge {
          background: rgba(255,255,255,0.2);
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 999px;
        }

        /* Slot Grid */
        .sp-slot-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
          animation: fadeIn 0.4s ease;
        }

        /* Slot Card */
        .sp-slot-card {
          background: #fff;
          border-radius: 16px;
          border: 1px solid #E5E7EB;
          padding: 18px;
          transition: transform 0.2s, box-shadow 0.2s;
          position: relative;
          overflow: hidden;
        }
        .sp-slot-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.06);
        }

        /* Left color accent bars */
        .sp-slot-card::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 5px;
          transition: background-color 0.2s;
        }
        .sp-slot-card.status-available::before {
          background-color: #10B981; /* green */
        }
        .sp-slot-card.status-booked::before {
          background-color: #D97706; /* amber */
        }
        .sp-slot-card.status-expired::before {
          background-color: #9CA3AF; /* gray */
        }

        .sp-slot-card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 14px;
        }
        .sp-slot-id { font-size: 11px; font-weight: 600; color: #9CA3AF; }
        .sp-slot-badges { display: flex; gap: 6px; flex-wrap: wrap; }

        .sp-badge {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 4px 10px; border-radius: 999px;
          font-size: 11px; font-weight: 600;
        }
        .sp-badge-booked { background: #FEF3C7; color: #D97706; border: 1px solid #FDE68A; }
        .sp-badge-available { background: #ECFDF5; color: #059669; border: 1px solid #A7F3D0; }
        .sp-badge-expired { background: #F3F4F6; color: #4B5563; border: 1px solid #E5E7EB; }
        .sp-badge-allday { background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE; }
        .sp-badge-datespec { background: #F5F3FF; color: #7C3AED; border: 1px solid #DDD6FE; }

        .sp-slot-time {
          font-size: 20px; font-weight: 700; color: #111827;
          margin-bottom: 8px; line-height: 1.2;
        }
        .sp-slot-date {
          font-size: 13px; color: #6B7280; margin-bottom: 14px;
        }

        .sp-slot-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 14px;
          border-top: 1px solid #F3F4F6;
        }
        .sp-slot-created { font-size: 11px; color: #9CA3AF; }

        /* Table View styling */
        .sp-table-wrapper {
          width: 100%;
          overflow-x: auto;
          background: #fff;
          border-radius: 16px;
          border: 1px solid #E5E7EB;
          box-shadow: 0 1px 3px rgba(0,0,0,0.03);
          margin-bottom: 8px;
        }
        .sp-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 13px;
        }
        .sp-table th {
          background: #F9FAFB;
          padding: 14px 18px;
          font-weight: 600;
          color: #374151;
          border-bottom: 1.5px solid #E5E7EB;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.05em;
        }
        .sp-table td {
          padding: 14px 18px;
          color: #4B5563;
          border-bottom: 1px solid #F3F4F6;
          vertical-align: middle;
        }
        .sp-table tr:last-child td {
          border-bottom: none;
        }
        .sp-table tr:hover td {
          background-color: #F9FAFB;
        }
        .sp-actions-cell {
          display: flex;
          gap: 8px;
        }
        .sp-btn-action {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 12px;
          border-radius: 8px;
          border: 1.5px solid #E5E7EB;
          background: #fff;
          color: #6B7280;
          font-family: inherit;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .sp-btn-action:hover:not(:disabled) {
          border-color: #111827;
          color: #111827;
          background: #F9FAFB;
        }
        .sp-btn-action-delete:hover:not(:disabled) {
          border-color: #DC2626;
          color: #DC2626;
          background: #FEF2F2;
        }
        .sp-btn-action:disabled {
          color: #9CA3AF;
          background: #F3F4F6;
          border-color: #E5E7EB;
          cursor: not-allowed;
          opacity: 0.6;
        }

        /* Loading Skeleton */
        .sp-skeleton {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 800px 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 12px;
        }

        /* Empty */
        .sp-empty {
          grid-column: 1 / -1;
          text-align: center; padding: 60px 20px;
          color: #6B7280;
        }
        .sp-empty svg { margin: 0 auto 16px; display: block; opacity: 0.4; }
        .sp-empty h3 { margin: 0 0 8px; color: #374151; font-size: 18px; }
        .sp-empty p { margin: 0; font-size: 14px; }

        /* Breakdown */
        .sp-breakdown {
          background: #fff;
          border-radius: 16px;
          border: 1px solid #E5E7EB;
          padding: 20px 24px;
          margin-top: 24px;
        }
        .sp-breakdown-title {
          font-size: 16px; font-weight: 700; color: #111827;
          margin: 0 0 16px 0;
        }
        .sp-breakdown-bar-wrap {
          display: flex; align-items: center; gap: 12px; margin-bottom: 12px;
        }
        .sp-breakdown-label {
          font-size: 13px; font-weight: 500; color: #374151;
          width: 90px; flex-shrink: 0;
        }
        .sp-breakdown-track {
          flex: 1; height: 10px; background: #F3F4F6;
          border-radius: 999px; overflow: hidden;
        }
        .sp-breakdown-fill {
          height: 100%; border-radius: 999px;
          transition: width 0.6s ease;
        }
        .sp-breakdown-count {
          font-size: 13px; font-weight: 700; color: #111827;
          width: 30px; text-align: right; flex-shrink: 0;
        }

        /* Modal */
        .sp-modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000;
        }
        .sp-modal-box {
          background: #fff; border-radius: 24px;
          width: 90%; max-width: 560px;
          max-height: 90vh; overflow-y: auto;
          padding: 28px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.15);
          animation: fadeIn 0.25s ease;
        }
      `}</style>

      {/* ── Page Header ── */}
      <div className="sp-header">
        <div>
          <h1 className="sp-title">Slot Management</h1>
          <p className="sp-subtitle">Create and manage charging time slots across all chargers</p>
        </div>
      </div>

      {/* ── Stats Grid (Total, Available, Booked, Expired) ── */}
      <div className="sp-stats-grid">
        <div className="sp-stat-card">
          <div className="sp-stat-icon" style={{ background: "#EEF2FF", color: "#4F46E5" }}>
            <TotalIcon />
          </div>
          <div>
            <p className="sp-stat-label">Total Slots</p>
            <p className="sp-stat-val">{loadingSlots ? "—" : stats.total}</p>
          </div>
        </div>
        <div className="sp-stat-card">
          <div className="sp-stat-icon" style={{ background: "#ECFDF5", color: "#059669" }}>
            <AvailableIcon />
          </div>
          <div>
            <p className="sp-stat-label">Available</p>
            <p className="sp-stat-val">{loadingSlots ? "—" : stats.available}</p>
          </div>
        </div>
        <div className="sp-stat-card">
          <div className="sp-stat-icon" style={{ background: "#FEF3C7", color: "#D97706" }}>
            <BookedIcon />
          </div>
          <div>
            <p className="sp-stat-label">Booked</p>
            <p className="sp-stat-val">{loadingSlots ? "—" : stats.booked}</p>
          </div>
        </div>
        <div className="sp-stat-card">
          <div className="sp-stat-icon" style={{ background: "#F3F4F6", color: "#4B5563" }}>
            <ExpiredIcon />
          </div>
          <div>
            <p className="sp-stat-label">Expired</p>
            <p className="sp-stat-val">{loadingSlots ? "—" : stats.expired}</p>
          </div>
        </div>
      </div>

      {/* ── Controls Bar ── */}
      <div className="sp-controls">
        <label className="sp-charger-label">Charger:</label>

        {loadingChargers ? (
          <div className="sp-skeleton" style={{ height: "40px", flex: 1, maxWidth: "300px" }} />
        ) : (
          <select
            className="sp-charger-select"
            value={selectedChargerId}
            onChange={(e) => setSelectedChargerId(e.target.value)}
          >
            {Object.entries(groupedChargers).map(([stId, chList]) => (
              <optgroup key={stId} label={getStationName(stId)}>
                {chList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.ocppId || `Charger #${c.id}`} — {c.chargerType || "Unknown"}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        )}

        {/* View Mode Filters */}
        <div className="sp-view-toggle">
          <button
            className={`sp-view-btn ${viewMode === "all" ? "active" : ""}`}
            onClick={() => setViewMode("all")}
          >
            All
          </button>
          <button
            className={`sp-view-btn ${viewMode === "available" ? "active" : ""}`}
            onClick={() => setViewMode("available")}
          >
            Available
          </button>
          <button
            className={`sp-view-btn ${viewMode === "booked" ? "active" : ""}`}
            onClick={() => setViewMode("booked")}
          >
            Booked
          </button>
          <button
            className={`sp-view-btn ${viewMode === "expired" ? "active" : ""}`}
            onClick={() => setViewMode("expired")}
          >
            Expired
          </button>
        </div>

        {/* Layout Switcher (Grid vs Table) */}
        <div className="sp-layout-toggle">
          <button
            className={`sp-layout-btn ${layoutView === "cards" ? "active" : ""}`}
            onClick={() => setLayoutView("cards")}
            title="Grid Card View"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
            </svg>
            Grid
          </button>
          <button
            className={`sp-layout-btn ${layoutView === "table" ? "active" : ""}`}
            onClick={() => setLayoutView("table")}
            title="Horizontal Scrolling Table View"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            Table
          </button>
        </div>

        <input
          type="text"
          placeholder="Search slots..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="sp-search-input"
        />

        <button className="sp-add-btn" onClick={() => setIsAddModalOpen(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Slot
        </button>
      </div>

      {/* ── Charger Info Banner ── */}
      {selectedCharger && (
        <div className="sp-charger-info">
          <div className="sp-charger-info-main">
            <p className="sp-charger-info-name">
              {selectedCharger.ocppId || `Charger #${selectedCharger.id}`}
            </p>
            <p className="sp-charger-info-sub">
              {viewMode === "all"
                ? "Showing all slots (including booked & expired)"
                : `Showing ${viewMode} slots only`}
            </p>
          </div>
          {selectedCharger.chargerType && (
            <span className="sp-charger-badge">{selectedCharger.chargerType}</span>
          )}
          {selectedCharger.connectorType && (
            <span className="sp-charger-badge">{selectedCharger.connectorType}</span>
          )}
          {selectedCharger.powerKw && (
            <span className="sp-charger-badge">{selectedCharger.powerKw} kW</span>
          )}
        </div>
      )}

      {/* ── Grouped Slots Container ── */}
      <div className="sp-slot-groups-list">
        {loadingSlots ? (
          <div className="sp-slot-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="sp-skeleton" style={{ height: "160px" }} />
            ))}
          </div>
        ) : groupedSlots.length === 0 ? (
          <div className="sp-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <h3>No Slots Found</h3>
            <p>
              {viewMode === "all"
                ? "No slots created for this charger yet. Click 'Add Slot' to get started."
                : `No slots match the filter: "${viewMode}".`}
            </p>
          </div>
        ) : (
          groupedSlots.map((group) => {
            const isCollapsed = !!collapsedGroups[group.key];
            return (
              <div key={group.key} className="sp-group-container">
                {/* Group Header (Collapsible) */}
                <div className="sp-group-header" onClick={() => toggleGroup(group.key)}>
                  <div className="sp-group-title">
                    <ChevronIcon isOpen={!isCollapsed} />
                    <span>{group.label}</span>
                    <span className="sp-group-badge">{group.slots.length}</span>
                  </div>
                </div>

                {/* Group Content */}
                {!isCollapsed && (
                  layoutView === "cards" ? (
                    <div className="sp-slot-grid">
                      {group.slots.map((slot) => {
                        const createdAt = slot.createdAt
                          ? new Date(slot.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
                          : null;
                        const status = slot.computedStatus;

                        return (
                          <div key={slot.id} className={`sp-slot-card status-${status.toLowerCase()}`}>
                            <div className="sp-slot-card-top">
                              <span className="sp-slot-id">SLOT #{slot.id}</span>
                              <div className="sp-slot-badges">
                                <span className={`sp-badge sp-badge-${status.toLowerCase()}`}>
                                  ● {status === "BOOKED" ? "Busy/Booked" : status.charAt(0) + status.slice(1).toLowerCase()}
                                </span>
                                <span className={`sp-badge ${slot.allDay ? "sp-badge-allday" : "sp-badge-datespec"}`}>
                                  {slot.allDay ? "↻ Recurring" : "📅 Date-Specific"}
                                </span>
                              </div>
                            </div>

                            <div className="sp-slot-time">{formatDisplayTime(slot)}</div>
                            <div className="sp-slot-date">{formatDate(slot)}</div>

                            <div className="sp-slot-footer">
                              <span className="sp-slot-created">
                                {createdAt ? `Created ${createdAt}` : ""}
                              </span>
                              <div style={{ display: "flex", gap: "8px" }}>
                                <button
                                  className="sp-btn-action"
                                  onClick={() => handleEditClick(slot)}
                                  disabled={slot.booked}
                                  title={slot.booked ? "Booked slots cannot be edited" : "Edit slot"}
                                >
                                  <EditIcon />
                                  Edit
                                </button>
                                <button
                                  className="sp-btn-action sp-btn-action-delete"
                                  onClick={() => setSlotToDelete(slot)}
                                  title="Delete slot"
                                >
                                  <DeleteIcon />
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="sp-table-wrapper">
                      <table className="sp-table">
                        <thead>
                          <tr>
                            <th>Slot ID</th>
                            <th>Time Window</th>
                            <th>Type</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.slots.map((slot) => {
                            const status = slot.computedStatus;
                            return (
                              <tr key={slot.id}>
                                <td><strong>#{slot.id}</strong></td>
                                <td>{formatDisplayTime(slot)}</td>
                                <td>
                                  <span className={`sp-badge ${slot.allDay ? "sp-badge-allday" : "sp-badge-datespec"}`}>
                                    {slot.allDay ? "↻ Recurring" : "📅 Date-Specific"}
                                  </span>
                                </td>
                                <td>
                                  <span className={`sp-badge sp-badge-${status.toLowerCase()}`}>
                                    ● {status === "BOOKED" ? "Busy/Booked" : status.charAt(0) + status.slice(1).toLowerCase()}
                                  </span>
                                </td>
                                <td>
                                  <div className="sp-actions-cell">
                                    <button
                                      className="sp-btn-action"
                                      onClick={() => handleEditClick(slot)}
                                      disabled={slot.booked}
                                      title={slot.booked ? "Booked slots cannot be edited" : "Edit slot"}
                                    >
                                      <EditIcon />
                                      Edit
                                    </button>
                                    <button
                                      className="sp-btn-action sp-btn-action-delete"
                                      onClick={() => setSlotToDelete(slot)}
                                      title="Delete slot"
                                    >
                                      <DeleteIcon />
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Breakdown Panel ── */}
      {!loadingSlots && slots.length > 0 && (
        <div className="sp-breakdown">
          <h4 className="sp-breakdown-title">Slot Breakdown — {selectedCharger?.ocppId || `Charger #${selectedChargerId}`}</h4>

          {[
            { label: "Available", count: stats.available, total: stats.total, color: "#10B981" },
            { label: "Booked", count: stats.booked, total: stats.total, color: "#D97706" },
            { label: "Expired", count: stats.expired, total: stats.total, color: "#9CA3AF" },
          ].map(({ label, count, total, color }) => (
            <div key={label} className="sp-breakdown-bar-wrap">
              <span className="sp-breakdown-label">{label}</span>
              <div className="sp-breakdown-track">
                <div
                  className="sp-breakdown-fill"
                  style={{
                    width: total > 0 ? `${(count / total) * 100}%` : "0%",
                    background: color,
                  }}
                />
              </div>
              <span className="sp-breakdown-count">{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Slot Modal ── */}
      {isAddModalOpen && (
        <div className="sp-modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="sp-modal-box" onClick={(e) => e.stopPropagation()}>
            <Suspense fallback={<div style={{ padding: "40px", textAlign: "center", color: "#6B7280" }}>Loading form…</div>}>
              <AddSlot
                onClose={() => setIsAddModalOpen(false)}
                onSlotAdded={() => {
                  setIsAddModalOpen(false);
                  setRefreshKey((k) => k + 1);
                  showToast("Slot(s) created successfully!", "success");
                }}
                baseUrl={baseUrl}
                chargers={chargers}
                initialChargerId={selectedChargerId}
              />
            </Suspense>
          </div>
        </div>
      )}

      {/* ── Edit Slot Modal ── */}
      {slotToEdit && (
        <div className="sp-modal-overlay" onClick={() => setSlotToEdit(null)}>
          <div className="sp-modal-box" onClick={(e) => e.stopPropagation()}>
            <Suspense fallback={<div style={{ padding: "40px", textAlign: "center", color: "#6B7280" }}>Loading form…</div>}>
              <EditSlot
                slot={slotToEdit}
                onClose={() => setSlotToEdit(null)}
                onSlotUpdated={() => {
                  setSlotToEdit(null);
                  setRefreshKey((k) => k + 1);
                  showToast("Slot updated successfully!", "success");
                }}
                baseUrl={baseUrl}
                chargers={chargers}
              />
            </Suspense>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {slotToDelete && (
        <DeleteConfirmModal
          slot={slotToDelete}
          onConfirm={handleConfirmDelete}
          onCancel={() => setSlotToDelete(null)}
          isDeleting={isDeleting}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
