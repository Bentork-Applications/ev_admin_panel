import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

// ── SVG Icon Components ──────────────────────────────────────────────────────
const TotalIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);
const TodayIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const ActiveIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);
const CancelledIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="15" y1="9" x2="9" y2="15"/>
    <line x1="9" y1="9" x2="15" y2="15"/>
  </svg>
);
const AvailableIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const CalendarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const ChevronLeftIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
);
const ChevronRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
);
const EyeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
);

// ── Premium Shimmer Skeleton ──────────────────────────────────────────────────
const LoadingSkeleton = () => (
  <div style={{ padding: "8px 0" }}>
    {[...Array(6)].map((_, i) => (
      <div
        key={i}
        style={{
          height: "52px",
          borderRadius: "10px",
          marginBottom: "8px",
          background: "linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)",
          backgroundSize: "200% 100%",
          animation: `sb-shimmer 1.4s ease infinite`,
          animationDelay: `${i * 0.07}s`
        }}
      />
    ))}
  </div>
);

// ── Animated Counter ──────────────────────────────────────────────────────────
const AnimatedNumber = ({ value }) => {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const target = parseInt(value, 10) || 0;
    if (target === 0) { setCurrent(0); return; }
    let start = 0;
    const duration = 500;
    const stepTime = Math.max(Math.floor(duration / target), 10);
    const timer = setInterval(() => {
      start += Math.ceil(target / 40);
      if (start >= target) { setCurrent(target); clearInterval(timer); }
      else setCurrent(start);
    }, stepTime);
    return () => clearInterval(timer);
  }, [value]);
  return <>{current}</>;
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function SlotBookings({ baseUrl }) {
  const navigate = useNavigate();

  // ── Data State (unchanged) ────────────────────────────────────────────────
  const [stations, setStations] = useState([]);
  const [chargers, setChargers] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [availableSlotsCount, setAvailableSlotsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // ── Filters State (unchanged) ─────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStation, setFilterStation] = useState("ALL");
  const [filterCharger, setFilterCharger] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterDate, setFilterDate] = useState("");

  // ── Pagination State (unchanged) ──────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // ── Modal State (unchanged) ───────────────────────────────────────────────
  const [selectedBooking, setSelectedBooking] = useState(null);

  // ── UI-only State ─────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("This Week");

  // ── Parallel Fetching Logic (unchanged) ───────────────────────────────────
  useEffect(() => {
    const fetchGlobalData = async () => {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) { navigate("/"); return; }

      try {
        const stRes = await fetch(`${baseUrl}/stations/all`, { headers: { Authorization: `Bearer ${token}` } });
        const stData = await stRes.json();
        const validStations = Array.isArray(stData) ? stData : [];
        setStations(validStations);

        const chRes = await fetch(`${baseUrl}/chargers/all`, { headers: { Authorization: `Bearer ${token}` } });
        const chData = await chRes.json();
        const validChargers = Array.isArray(chData) ? chData : [];
        setChargers(validChargers);

        if (validStations.length > 0) {
          const bookingPromises = validStations.map(st =>
            fetch(`${baseUrl}/slot-bookings/station/${st.id}`, { headers: { Authorization: `Bearer ${token}` } })
              .then(res => res.json())
              .then(data => Array.isArray(data) ? data : [])
              .catch(() => [])
          );
          const bookingsResults = await Promise.all(bookingPromises);
          let combinedBookings = [];
          bookingsResults.forEach(res => { combinedBookings = combinedBookings.concat(res); });
          combinedBookings.sort((a, b) => (b.id || b._id) - (a.id || a._id));
          setAllBookings(combinedBookings);
        }

        if (validChargers.length > 0) {
          const slotsPromises = validChargers.map(ch =>
            fetch(`${baseUrl}/slots/charger/${ch.id}/available`, { headers: { Authorization: `Bearer ${token}` } })
              .then(res => res.json())
              .then(data => Array.isArray(data) ? data.length : 0)
              .catch(() => 0)
          );
          const slotsResults = await Promise.all(slotsPromises);
          const totalAvail = slotsResults.reduce((sum, count) => sum + count, 0);
          setAvailableSlotsCount(totalAvail);
        }
      } catch (err) {
        console.error("Error fetching global slot data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGlobalData();
  }, [baseUrl, navigate, refreshKey]);

  // ── Analytics Computation (unchanged) ────────────────────────────────────
  const stats = useMemo(() => {
    let todayCount = 0;
    let activeCount = 0;
    let cancelledCount = 0;
    const todayStr = new Date().toISOString().split('T')[0];
    allBookings.forEach(b => {
      if (b.bookingDate === todayStr || (b.booking_time && b.booking_time.startsWith(todayStr))) todayCount++;
      const status = (b.status || "BOOKED").toUpperCase();
      if (status === "BOOKED") activeCount++;
      if (status === "CANCELLED") cancelledCount++;
    });
    return {
      total: allBookings.length,
      today: todayCount,
      active: activeCount,
      cancelled: cancelledCount,
      available: availableSlotsCount
    };
  }, [allBookings, availableSlotsCount]);

  // ── Filtering Logic (unchanged) ───────────────────────────────────────────
  const filteredBookings = useMemo(() => {
    return allBookings.filter(b => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const idMatch = (b.id || b._id || "").toString().includes(term);
        const userMatch = (b.user_id || b.userId || b.User_id || "").toString().toLowerCase().includes(term);
        if (!idMatch && !userMatch) return false;
      }
      const stId = (b.station_id || b.stationId || "").toString();
      if (filterStation !== "ALL" && stId !== filterStation) return false;
      const chId = (b.charger_id || b.chargerId || "").toString();
      if (filterCharger !== "ALL" && chId !== filterCharger) return false;
      const status = (b.status || "BOOKED").toUpperCase();
      if (filterStatus !== "ALL" && status !== filterStatus) return false;
      if (filterDate) {
        const bDate = b.bookingDate || (b.booking_time ? b.booking_time.split(' ')[0] : "");
        if (bDate !== filterDate) return false;
      }
      return true;
    });
  }, [allBookings, searchTerm, filterStation, filterCharger, filterStatus, filterDate]);

  // Reset pagination when filters change (unchanged)
  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterStation, filterCharger, filterStatus, filterDate]);

  // ── Pagination Logic (unchanged) ──────────────────────────────────────────
  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentBookings = filteredBookings.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredBookings.length / rowsPerPage);

  // ── Business Logic Functions (unchanged) ─────────────────────────────────
  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${baseUrl}/slot-bookings/${bookingId}/cancel`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setRefreshKey(prev => prev + 1);
        if (selectedBooking && (selectedBooking.id || selectedBooking._id) === bookingId) {
          setSelectedBooking(null);
        }
      } else {
        const err = await res.text();
        alert(`Failed to cancel booking: ${err}`);
      }
    } catch (err) {
      console.error("Error cancelling booking:", err);
    }
  };

  const formatDateTime = (dtStr) => {
    if (!dtStr) return { date: "—", time: "—", full: "—" };
    try {
      const d = new Date(dtStr);
      if (isNaN(d.getTime())) return { date: dtStr, time: "", full: dtStr };
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const dateFormatted = `${day}/${month}/${year}`;
      const timeFormatted = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      return { date: dateFormatted, time: timeFormatted, full: `${dateFormatted} ${timeFormatted}` };
    } catch {
      return { date: dtStr, time: "", full: dtStr };
    }
  };

  const formatSlotTiming = (b) => {
    const start = b.slotStartTime || b.slot_start_time;
    const end = b.slotEndTime || b.slot_end_time;
    if (start && end) {
      const startFmt = formatDateTime(start);
      const endFmt = formatDateTime(end);
      return { date: startFmt.date, time: startFmt.time, duration: `${startFmt.time} – ${endFmt.time}` };
    }
    const bkTime = b.bookingTime || b.booking_time;
    if (bkTime) {
      const bkFmt = formatDateTime(bkTime);
      return { date: bkFmt.date, time: bkFmt.time, duration: bkFmt.time };
    }
    return { date: "—", time: "—", duration: "—" };
  };

  const getStationName = (id) => {
    const s = stations.find(st => st.id.toString() === id?.toString());
    return s ? s.name : "N/A";
  };

  const formatStatus = (status) => {
    const s = (status || "BOOKED").toUpperCase();
    if (s === "BOOKED") return { label: "Booked", cls: "sb-badge-booked" };
    if (s === "CANCELLED") return { label: "Cancelled", cls: "sb-badge-cancelled" };
    if (s === "COMPLETED") return { label: "Completed", cls: "sb-badge-completed" };
    return { label: s, cls: "sb-badge-default" };
  };

  // ── Analytics card data ───────────────────────────────────────────────────
  const analyticsCards = [
    {
      id: "total",
      label: "Total Bookings",
      value: stats.total,
      subtitle: "All-time reservations",
      color: "#4F46E5",
      bg: "#EEF2FF",
      icon: <TotalIcon />,
    },
    {
      id: "today",
      label: "Today's Bookings",
      value: stats.today,
      subtitle: "Scheduled for today",
      color: "#059669",
      bg: "#ECFDF5",
      icon: <TodayIcon />,
    },
    {
      id: "active",
      label: "Active Slots",
      value: stats.active,
      subtitle: "Currently booked",
      color: "#D97706",
      bg: "#FFFBEB",
      icon: <ActiveIcon />,
    },
    {
      id: "cancelled",
      label: "Cancelled",
      value: stats.cancelled,
      subtitle: "Cancelled bookings",
      color: "#DC2626",
      bg: "#FEF2F2",
      icon: <CancelledIcon />,
    },
    {
      id: "available",
      label: "Available Slots",
      value: stats.available,
      subtitle: "Open for booking",
      color: "#2563EB",
      bg: "#EFF6FF",
      icon: <AvailableIcon />,
    },
  ];

  const hasActiveFilters = searchTerm || filterStation !== "ALL" || filterStatus !== "ALL" || filterDate;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="sb-container">
      {/* ── Inline Styles ─────────────────────────────────────────────── */}
      <style>{`
        /* ── Reset & Base ─────────────────────────────────────────────── */
        @keyframes sb-fadeInPage {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes sb-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes sb-fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes sb-slideUp {
          from { opacity: 0; transform: scale(0.97) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        .sb-container {
          padding: 24px;
          font-family: 'Lexend', sans-serif;
          background-color: #F9FAFB;
          min-height: 100vh;
          animation: sb-fadeInPage 400ms ease-out forwards;
        }

        /* ── Page Header ──────────────────────────────────────────────── */
        .sb-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
          flex-wrap: wrap;
          gap: 16px;
        }
        .sb-header-left h2 {
          font-size: 28px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 4px 0;
        }
        .sb-header-left p {
          font-size: 13px;
          color: #6B7280;
          margin: 0;
        }
        .sb-tab-group {
          display: flex;
          background: #F3F4F6;
          border-radius: 10px;
          padding: 3px;
          gap: 2px;
        }
        .sb-tab {
          border: none;
          background: transparent;
          color: #6B7280;
          font-size: 12px;
          font-weight: 600;
          padding: 7px 14px;
          border-radius: 8px;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .sb-tab:hover { color: #111827; }
        .sb-tab.active {
          background: #fff;
          color: #111827;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }

        /* ── Analytics Cards Grid ─────────────────────────────────────── */
        .sb-stats-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 20px;
          margin-bottom: 24px;
        }
        @media (max-width: 1200px) { .sb-stats-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 768px)  { .sb-stats-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 480px)  { .sb-stats-grid { grid-template-columns: 1fr; } }

        .sb-stat-card {
          background: #fff;
          border-radius: 16px;
          padding: 22px 20px;
          border: 1px solid #E5E7EB;
          box-shadow: 0 1px 3px rgba(0,0,0,0.03);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 136px;
          box-sizing: border-box;
          transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
          cursor: default;
        }
        .sb-stat-card:hover {
          transform: translateY(-5px) scale(1.02);
          box-shadow: 0 12px 24px rgba(0,0,0,0.08);
          border-color: #10b981;
        }
        .sb-stat-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .sb-stat-meta {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .sb-stat-label {
          font-size: 12px;
          font-weight: 600;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .sb-stat-subtitle {
          font-size: 11px;
          color: #9CA3AF;
          font-weight: 500;
        }
        .sb-stat-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .sb-stat-value {
          font-size: 32px;
          font-weight: 700;
          color: #111827;
          line-height: 1;
          margin-top: 12px;
          padding-left: 2px;
        }

        /* ── Controls Section ─────────────────────────────────────────── */
        .sb-controls {
          background: #fff;
          border-radius: 16px;
          border: 1px solid #E5E7EB;
          padding: 20px 24px;
          margin-bottom: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }
        .sb-controls-row {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          align-items: flex-end;
        }
        .sb-filter-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
          min-width: 160px;
        }
        .sb-filter-group.wide { flex: 2; }
        .sb-filter-label {
          font-size: 11px;
          font-weight: 600;
          color: #4B5563;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .sb-search-wrap {
          position: relative;
        }
        .sb-search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
        }
        .sb-input, .sb-select {
          width: 100%;
          padding: 10px 14px;
          border: 1.5px solid #E5E7EB;
          border-radius: 10px;
          font-size: 14px;
          font-family: inherit;
          outline: none;
          background: #F9FAFB;
          color: #111827;
          box-sizing: border-box;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
          appearance: none;
          -webkit-appearance: none;
        }
        .sb-input.with-icon { padding-left: 38px; }
        .sb-input:focus, .sb-select:focus {
          border-color: #10b981;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12);
        }
        .sb-select {
          background-image: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' strokeWidth='2' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          padding-right: 36px;
          cursor: pointer;
        }
        .sb-clear-btn {
          height: 42px;
          padding: 0 16px;
          background: #FEF2F2;
          border: 1.5px solid #FECACA;
          color: #DC2626;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
          align-self: flex-end;
        }
        .sb-clear-btn:hover { background: #DC2626; color: #fff; border-color: #DC2626; }

        /* ── Table Wrapper Card ───────────────────────────────────────── */
        .sb-table-card {
          background: #fff;
          border-radius: 16px;
          border: 1px solid #E5E7EB;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          overflow: hidden;
          transition: box-shadow 0.3s ease;
        }
        .sb-table-card:hover {
          box-shadow: 0 8px 24px rgba(0,0,0,0.06);
        }
        .sb-table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #F3F4F6;
          flex-wrap: wrap;
          gap: 12px;
        }
        .sb-table-title {
          font-size: 16px;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }
        .sb-table-count {
          font-size: 12px;
          color: #6B7280;
          background: #F3F4F6;
          padding: 4px 10px;
          border-radius: 20px;
          font-weight: 600;
        }

        /* ── Data Table ───────────────────────────────────────────────── */
        .sb-table-scroll { overflow-x: auto; }
        .sb-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 14px;
        }
        .sb-table th {
          text-align: left;
          padding: 13px 16px;
          font-size: 11px;
          font-weight: 600;
          color: #4B5563;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #E5E7EB;
          background: #F9FAFB;
          white-space: nowrap;
        }
        .sb-table td {
          padding: 15px 16px;
          color: #374151;
          border-bottom: 1px solid #F3F4F6;
          vertical-align: middle;
          transition: background-color 0.2s ease;
        }
        .sb-table tr td:first-child {
          border-left: 3px solid transparent;
          transition: border-left-color 0.2s ease, background-color 0.2s ease;
        }
        .sb-table tr:hover td { background-color: #F0FDF4 !important; }
        .sb-table tr:hover td:first-child { border-left-color: #10b981; }
        .sb-table tr:last-child td { border-bottom: none; }

        /* ── Status Badges ────────────────────────────────────────────── */
        .sb-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
        }
        .sb-badge::before {
          content: '';
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .sb-badge-booked    { background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0; }
        .sb-badge-booked::before    { background: #10B981; }
        .sb-badge-cancelled { background: #FEF2F2; color: #991B1B; border: 1px solid #FECACA; }
        .sb-badge-cancelled::before { background: #EF4444; }
        .sb-badge-completed { background: #EEF2FF; color: #3730A3; border: 1px solid #C7D2FE; }
        .sb-badge-completed::before { background: #6366F1; }
        .sb-badge-default   { background: #F3F4F6; color: #4B5563; border: 1px solid #E5E7EB; }
        .sb-badge-default::before   { background: #9CA3AF; }

        /* ── Action Buttons ───────────────────────────────────────────── */
        .sb-btn-view {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          background: #fff;
          border: 1.5px solid #E5E7EB;
          color: #374151;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s ease;
        }
        .sb-btn-view:hover {
          border-color: #10b981;
          color: #059669;
          background: #F0FDF4;
          transform: scale(1.03);
        }
        .sb-btn-cancel-action {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          background: #FEF2F2;
          border: 1.5px solid #FECACA;
          color: #DC2626;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s ease;
        }
        .sb-btn-cancel-action:hover { background: #DC2626; color: #fff; border-color: #DC2626; transform: scale(1.03); }

        /* ── Pagination ───────────────────────────────────────────────── */
        .sb-pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          border-top: 1px solid #E5E7EB;
          background: #FAFAFA;
          flex-wrap: wrap;
          gap: 12px;
        }
        .sb-pagination-info { font-size: 13px; color: #6B7280; }
        .sb-pagination-controls { display: flex; gap: 6px; align-items: center; }
        .sb-page-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 8px 12px;
          border: 1.5px solid #E5E7EB;
          border-radius: 8px;
          background: #fff;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s ease;
        }
        .sb-page-btn:hover:not(:disabled) { background: #F3F4F6; transform: scale(1.03); }
        .sb-page-btn.active { background: #111827; color: #fff; border-color: #111827; }
        .sb-page-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

        /* ── Empty State ──────────────────────────────────────────────── */
        .sb-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 24px;
          text-align: center;
          animation: sb-fadeIn 0.3s ease;
        }
        .sb-empty-icon {
          font-size: 52px;
          margin-bottom: 16px;
          line-height: 1;
        }
        .sb-empty h3 {
          margin: 0 0 8px;
          font-size: 18px;
          font-weight: 700;
          color: #111827;
        }
        .sb-empty p {
          margin: 0;
          font-size: 14px;
          color: #6B7280;
          max-width: 300px;
        }

        /* ── Booking Details Drawer (side panel) ──────────────────────── */
        .sb-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(5px);
          display: flex;
          justify-content: flex-end;
          z-index: 1000;
          animation: sb-fadeIn 0.2s ease;
        }
        .sb-drawer {
          width: 520px;
          max-width: 92vw;
          height: 100%;
          background: #fff;
          box-shadow: -12px 0 40px rgba(0,0,0,0.10);
          display: flex;
          flex-direction: column;
          border-left: 1px solid #E5E7EB;
          animation: sb-slideDrawer 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes sb-slideDrawer {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        .sb-drawer-header {
          padding: 24px;
          border-bottom: 1px solid #F3F4F6;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-shrink: 0;
        }
        .sb-drawer-title {
          margin: 0 0 4px;
          font-size: 18px;
          font-weight: 700;
          color: #111827;
        }
        .sb-drawer-subtitle {
          font-size: 12px;
          color: #6B7280;
          margin: 0;
        }
        .sb-drawer-close {
          background: #F3F4F6;
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          font-size: 16px;
          color: #6B7280;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }
        .sb-drawer-close:hover { background: #E5E7EB; color: #111827; }
        .sb-drawer-body {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .sb-drawer-section-title {
          font-size: 11px;
          font-weight: 700;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin: 0 0 12px;
          padding-bottom: 8px;
          border-bottom: 1.5px solid #F3F4F6;
        }
        .sb-drawer-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .sb-drawer-field {
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .sb-drawer-field.full { grid-column: span 2; }
        .sb-drawer-field-label {
          font-size: 10px;
          font-weight: 600;
          color: #9CA3AF;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .sb-drawer-field-value {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
        }
        .sb-drawer-footer {
          padding: 20px 24px;
          border-top: 1px solid #E5E7EB;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-shrink: 0;
        }
        .sb-btn-close {
          padding: 10px 20px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          background: #fff;
          border: 1.5px solid #E5E7EB;
          color: #374151;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s ease;
        }
        .sb-btn-close:hover { background: #F3F4F6; border-color: #D1D5DB; }
        .sb-btn-cancel-modal {
          padding: 10px 20px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          background: #FEF2F2;
          border: 1.5px solid #FECACA;
          color: #DC2626;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s ease;
        }
        .sb-btn-cancel-modal:hover { background: #DC2626; color: #fff; border-color: #DC2626; }

        /* ── Status Banner in Drawer ──────────────────────────────────── */
        .sb-status-banner {
          border-radius: 12px;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .sb-status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .sb-status-banner-text { font-size: 15px; font-weight: 700; }

        /* ── Charger/Slot cell ────────────────────────────────────────── */
        .sb-chg-cell { display: flex; flex-direction: column; gap: 2px; }
        .sb-chg-primary { font-size: 13px; font-weight: 600; }
        .sb-chg-secondary { font-size: 11px; color: #6B7280; }
        .sb-id-chip {
          display: inline-block;
          background: #EEF2FF;
          color: #4F46E5;
          border-radius: 6px;
          padding: 2px 8px;
          font-size: 12px;
          font-weight: 700;
        }
      `}</style>

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="sb-header">
        <div className="sb-header-left">
          <h2>Slot Booking Management</h2>
          <p>Monitor and manage all EV charging slot bookings efficiently.</p>
        </div>
        <div className="sb-tab-group">
          {["Today", "This Week", "This Month", "This Year"].map(tab => (
            <button
              key={tab}
              className={`sb-tab${activeTab === tab ? " active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── Analytics Cards ─────────────────────────────────────────────── */}
      <div className="sb-stats-grid">
        {analyticsCards.map(card => (
          <div className="sb-stat-card" key={card.id}>
            <div className="sb-stat-top">
              <div className="sb-stat-meta">
                <span className="sb-stat-label">{card.label}</span>
                <span className="sb-stat-subtitle">{card.subtitle}</span>
              </div>
              <div className="sb-stat-icon" style={{ background: card.bg, color: card.color }}>
                {card.icon}
              </div>
            </div>
            <div className="sb-stat-value" style={{ color: "#111827" }}>
              <AnimatedNumber value={card.value} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters & Search ────────────────────────────────────────────── */}
      <div className="sb-controls">
        <div className="sb-controls-row">
          {/* Search */}
          <div className="sb-filter-group wide">
            <label className="sb-filter-label">Search Booking / User</label>
            <div className="sb-search-wrap">
              <span className="sb-search-icon"><SearchIcon /></span>
              <input
                type="text"
                className="sb-input with-icon"
                placeholder="Search by booking ID or user ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Date */}
          <div className="sb-filter-group">
            <label className="sb-filter-label">Date</label>
            <input
              type="date"
              className="sb-input"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>

          {/* Station */}
          <div className="sb-filter-group">
            <label className="sb-filter-label">Station</label>
            <select
              className="sb-select"
              value={filterStation}
              onChange={(e) => setFilterStation(e.target.value)}
            >
              <option value="ALL">All Stations</option>
              {stations.map(st => (
                <option key={st.id} value={st.id}>{st.name}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="sb-filter-group">
            <label className="sb-filter-label">Status</label>
            <select
              className="sb-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="BOOKED">Booked</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              className="sb-clear-btn"
              onClick={() => {
                setSearchTerm("");
                setFilterStation("ALL");
                setFilterCharger("ALL");
                setFilterStatus("ALL");
                setFilterDate("");
              }}
            >
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Table Card ──────────────────────────────────────────────────── */}
      <div className="sb-table-card">
        <div className="sb-table-header">
          <h3 className="sb-table-title">All Slot Bookings</h3>
          <span className="sb-table-count">{filteredBookings.length} records</span>
        </div>

        {loading ? (
          <div style={{ padding: "16px 24px" }}>
            <LoadingSkeleton />
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="sb-empty">
            <div className="sb-empty-icon">📅</div>
            <h3>No Slot Bookings Found</h3>
            <p>
              {hasActiveFilters
                ? "Try adjusting your filters or search criteria."
                : "Slot booking records will appear here once available."}
            </p>
          </div>
        ) : (
          <>
            <div className="sb-table-scroll">
              <table className="sb-table">
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>User ID</th>
                    <th>Station</th>
                    <th>Charger / Slot</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentBookings.map(b => {
                    const statusInfo = formatStatus(b.status);
                    const stName = getStationName(b.station_id || b.stationId);
                    const timingInfo = formatSlotTiming(b);
                    return (
                      <tr key={b.id || b._id}>
                        <td>
                          <span className="sb-id-chip">#{b.id || b._id}</span>
                        </td>
                        <td style={{ color: "#6B7280" }}>{b.user_id || b.userId || b.User_id || "—"}</td>
                        <td style={{ fontWeight: 500 }}>{stName}</td>
                        <td>
                          <div className="sb-chg-cell">
                            <span className="sb-chg-primary" style={{ color: "#4F46E5" }}>
                              Chg: {b.charger_id || b.chargerId || "N/A"}
                            </span>
                            <span className="sb-chg-secondary">Slot: {b.slot_id || b.slotId || "N/A"}</span>
                          </div>
                        </td>
                        <td style={{ color: "#374151" }}>{timingInfo.date}</td>
                        <td style={{ color: "#374151" }}>{timingInfo.time}</td>
                        <td style={{ color: "#6B7280", fontSize: "12px" }}>{timingInfo.duration}</td>
                        <td>
                          <span className={`sb-badge ${statusInfo.cls}`}>{statusInfo.label}</span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                            <button className="sb-btn-view" onClick={() => setSelectedBooking(b)}>
                              <EyeIcon /> View
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="sb-pagination">
                <div className="sb-pagination-info">
                  Showing <strong>{indexOfFirst + 1}</strong> to <strong>{Math.min(indexOfLast, filteredBookings.length)}</strong> of <strong>{filteredBookings.length}</strong> bookings
                </div>
                <div className="sb-pagination-controls">
                  <button
                    className="sb-page-btn"
                    onClick={() => setCurrentPage(c => c - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeftIcon /> Prev
                  </button>

                  {[...Array(totalPages)].map((_, i) => {
                    if (i === 0 || i === totalPages - 1 || Math.abs(currentPage - 1 - i) <= 1) {
                      return (
                        <button
                          key={i}
                          className={`sb-page-btn${currentPage === i + 1 ? " active" : ""}`}
                          onClick={() => setCurrentPage(i + 1)}
                        >
                          {i + 1}
                        </button>
                      );
                    } else if (Math.abs(currentPage - 1 - i) === 2) {
                      return <span key={i} style={{ color: "#9CA3AF", padding: "0 4px" }}>…</span>;
                    }
                    return null;
                  })}

                  <button
                    className="sb-page-btn"
                    onClick={() => setCurrentPage(c => c + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next <ChevronRightIcon />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Booking Details Drawer ───────────────────────────────────────── */}
      {selectedBooking && (() => {
        const sb = selectedBooking;
        const statusInfo = formatStatus(sb.status);
        const timingInfo = formatSlotTiming(sb);
        const statusColors = {
          "sb-badge-booked":    { bg: "#ECFDF5", color: "#065F46", dot: "#10B981" },
          "sb-badge-cancelled": { bg: "#FEF2F2", color: "#991B1B", dot: "#EF4444" },
          "sb-badge-completed": { bg: "#EEF2FF", color: "#3730A3", dot: "#6366F1" },
          "sb-badge-default":   { bg: "#F3F4F6", color: "#4B5563", dot: "#9CA3AF" },
        };
        const sc = statusColors[statusInfo.cls] || statusColors["sb-badge-default"];

        return (
          <div className="sb-modal-overlay" onClick={() => setSelectedBooking(null)}>
            <div className="sb-drawer" onClick={e => e.stopPropagation()}>
              {/* Drawer Header */}
              <div className="sb-drawer-header">
                <div>
                  <h3 className="sb-drawer-title">Booking Details</h3>
                  <p className="sb-drawer-subtitle">Booking #{sb.id || sb._id}</p>
                </div>
                <button className="sb-drawer-close" onClick={() => setSelectedBooking(null)}>✕</button>
              </div>

              {/* Drawer Body */}
              <div className="sb-drawer-body">
                {/* Status Banner */}
                <div className="sb-status-banner" style={{ background: sc.bg }}>
                  <div className="sb-status-dot" style={{ background: sc.dot }} />
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 600, color: sc.color, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "2px" }}>
                      Current Status
                    </div>
                    <div className="sb-status-banner-text" style={{ color: sc.color }}>
                      {statusInfo.label}
                    </div>
                  </div>
                </div>

                {/* User & Station Info */}
                <div>
                  <p className="sb-drawer-section-title">Booking Information</p>
                  <div className="sb-drawer-grid">
                    <div className="sb-drawer-field">
                      <span className="sb-drawer-field-label">User ID</span>
                      <span className="sb-drawer-field-value">{sb.user_id || sb.userId || sb.User_id || "N/A"}</span>
                    </div>
                    <div className="sb-drawer-field">
                      <span className="sb-drawer-field-label">Station</span>
                      <span className="sb-drawer-field-value">{getStationName(sb.station_id || sb.stationId)}</span>
                    </div>
                    <div className="sb-drawer-field">
                      <span className="sb-drawer-field-label">Charger ID</span>
                      <span className="sb-drawer-field-value" style={{ color: "#4F46E5" }}>{sb.charger_id || sb.chargerId || "N/A"}</span>
                    </div>
                    <div className="sb-drawer-field">
                      <span className="sb-drawer-field-label">Slot ID</span>
                      <span className="sb-drawer-field-value">{sb.slot_id || sb.slotId || "N/A"}</span>
                    </div>
                  </div>
                </div>

                {/* Timing Info */}
                <div>
                  <p className="sb-drawer-section-title">Timing Details</p>
                  <div className="sb-drawer-grid">
                    <div className="sb-drawer-field">
                      <span className="sb-drawer-field-label">Booking Date</span>
                      <span className="sb-drawer-field-value">{timingInfo.date}</span>
                    </div>
                    <div className="sb-drawer-field">
                      <span className="sb-drawer-field-label">Slot Time</span>
                      <span className="sb-drawer-field-value">{timingInfo.time}</span>
                    </div>
                    <div className="sb-drawer-field full">
                      <span className="sb-drawer-field-label">Booking Duration</span>
                      <span className="sb-drawer-field-value">{timingInfo.duration}</span>
                    </div>
                    <div className="sb-drawer-field full">
                      <span className="sb-drawer-field-label">Created At</span>
                      <span className="sb-drawer-field-value" style={{ fontSize: "13px" }}>
                        {formatDateTime(sb.bookingTime || sb.booking_time).full}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Info */}
                <div>
                  <p className="sb-drawer-section-title">Payment</p>
                  <div className="sb-drawer-field">
                    <span className="sb-drawer-field-label">Payment Status</span>
                    <span className="sb-drawer-field-value" style={{ color: "#059669" }}>Paid (Wallet)</span>
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="sb-drawer-footer">
                <button className="sb-btn-close" onClick={() => setSelectedBooking(null)}>Close</button>
                {(sb.status || "BOOKED").toUpperCase() === "BOOKED" && (
                  <button
                    className="sb-btn-cancel-modal"
                    onClick={() => handleCancelBooking(sb.id || sb._id)}
                  >
                    Cancel Booking
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
