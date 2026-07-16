import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import totalIcon from "../../assets/icons/stationicon/Vector.svg";
import activeIcon from "../../assets/icons/stationicon/green.svg";
import uptimeIcon from "../../assets/icons/stationicon/yellow.svg";
import errorIcon from "../../assets/icons/stationicon/red.svg";
import sortIcon from "../../assets/icons/stationicon/upndown.svg";
import editIcon from "../../assets/icons/stationicon/edit.svg";
import deleteIcon from "../../assets/icons/stationicon/delete.svg";
import SessionChart from "../../components/admin/SessionChart";

// ── Skeleton Loader ────────────────────────────────────────────────────────────
const LoadingSpinner = () => (
  <div className="ses-skeleton-wrapper">
    {[...Array(6)].map((_, i) => (
      <div
        key={i}
        className="ses-skeleton-row ses-skeleton-shimmer"
        style={{ animationDelay: `${i * 0.08}s`, opacity: Math.max(0.3, 1 - i * 0.12) }}
      />
    ))}
  </div>
);

function Sessions({ baseUrl, userRole }) {
  const navigate = useNavigate();
  const isDealer = userRole === "DEALER";

  const [sessions, setSessions] = useState([]);
  const [summaryData, setSummaryData] = useState({
    totalSessions: '...',
    activeSessions: '...',
    averageUptime: '...',
    errorToday: '...',
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' });
  const [selectedMonth, setSelectedMonth] = useState("All");

  // ── Stop Session feature state ─────────────────────────────────────────────
  const [stoppingId, setStoppingId] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ show: false, session: null });
  const [toast, setToast] = useState({ message: "", type: "" });

  // ── UI-only state (no logic) ───────────────────────────────────────────────
  const [exportOpen, setExportOpen] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "" }), 4000);
  };

  // Extracted outside useEffect so it can be re-called after stopping a session
  const fetchSessionData = async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setLoading(true);
    const token = localStorage.getItem("token");
    if (!token) { navigate("/"); return; }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const fetchSummaryItem = async (key, endpoint, transform = (v) => v) => {
      try {
        const res = await fetch(baseUrl + endpoint, { headers });
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        const text = await res.text();
        setSummaryData(prev => ({ ...prev, [key]: transform(text) }));
      } catch (err) {
        console.error(`Failed to fetch ${key}:`, err);
        setSummaryData(prev => ({ ...prev, [key]: 'N/A' }));
      }
    };

    const fetchRecords = async () => {
      try {
        const endpoint = isDealer ? "/dealer/sessions" : "/sessions/all/records";
        const [res, stationsRes] = await Promise.all([
          fetch(baseUrl + endpoint, { headers }),
          isDealer ? fetch(baseUrl + "/dealer/stations", { headers }) : Promise.resolve(null)
        ]);

        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        let data = await res.json();

        if (Array.isArray(data)) {
          data = data.map(s => ({
            ...s,
            status: s.status ? s.status.toUpperCase() : ""
          }));
        }

        if (isDealer && stationsRes && stationsRes.ok) {
          const stations = await stationsRes.json();
          if (Array.isArray(stations)) {
            const validStationIds = stations.map(s => s.id?.toString());
            data = (Array.isArray(data) ? data : []).filter(s => {
              const stationId = s.stationId?.toString() || s.charger?.stationId?.toString();
              return validStationIds.includes(stationId);
            });
          }
        }

        const list = Array.isArray(data) ? data : [];
        setSessions(list);

        // Derive total and active sessions from the list
        const total = list.length;
        const active = list.filter(s => s.status === 'ACTIVE').length;

        setSummaryData(prev => ({
          ...prev,
          totalSessions: total.toString(),
          activeSessions: active.toString(),
        }));
      } catch (err) {
        console.error("Failed to fetch sessions:", err);
      } finally {
        setLoading(false);
      }
    };

    if (isDealer) {
      setSummaryData(prev => ({ ...prev, totalSessions: '...', activeSessions: '...', averageUptime: '...', errorToday: '...' }));
    } else {
      fetchSummaryItem('averageUptime', "/sessions/uptime", (v) => `${parseFloat(v)}%`);
      fetchSummaryItem('errorToday', "/sessions/error/today");
    }
    fetchRecords();
  };

  useEffect(() => {
    fetchSessionData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, baseUrl, isDealer]);

  // ── Stop Session handlers ──────────────────────────────────────────────────
  const handleStopClick = (session) => {
    setConfirmModal({ show: true, session });
  };

  const handleConfirmStop = async (session) => {
    if (!session) return;
    const sessionId = session.id;
    setStoppingId(sessionId);
    setConfirmModal({ show: false, session: null });

    let stopToken = localStorage.getItem("token");

    // Attempt to get the session owner's email to fetch their token
    const userEmail = session.user?.email;
    if (userEmail) {
      try {
        const tokenRes = await fetch(`${baseUrl}/user/google-login-success?email=${encodeURIComponent(userEmail)}`);
        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          if (tokenData.token) {
            stopToken = tokenData.token;
          }
        }
      } catch (tokenErr) {
        console.error("Failed to fetch user token for stop session, proceeding with admin token:", tokenErr);
      }
    }

    const headers = {
      'Authorization': `Bearer ${stopToken}`,
      'Content-Type': 'application/json',
    };
    try {
      const res = await fetch(`${baseUrl}/sessions/stop`, {
        method: "POST",
        headers,
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error (HTTP ${res.status})`);
      }
      // Instantly reflect stopped status in the table (optimistic update)
      setSessions(prev =>
        prev.map(s =>
          s.id === sessionId
            ? {
              ...s,
              status: "COMPLETED",
              endTime: new Date().toISOString(),
              charger: s.charger ? { ...s.charger, status: "AVAILABLE" } : s.charger
            }
            : s
        )
      );
      // Decrement active session counter in the summary card
      setSummaryData(prev => {
        const count = parseInt(prev.activeSessions);
        return !isNaN(count)
          ? { ...prev, activeSessions: String(Math.max(0, count - 1)) }
          : prev;
      });
      showToast("Session stopped successfully.", "success");
      // Background refresh after 1.5 s to sync final energy/cost from backend
      setTimeout(() => fetchSessionData(false), 1500);
    } catch (err) {
      console.error("Stop session error:", err);
      showToast(err.message || "Failed to stop session. Please try again.", "error");
    } finally {
      setStoppingId(null);
    }
  };

  // Get available months for the filter
  const availableMonths = useMemo(() => {
    const months = new Set();
    sessions.forEach(session => {
      const date = new Date(session.startTime || session.createdAt);
      const month = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      months.add(month);
    });
    return Array.from(months).sort((a, b) => new Date(b) - new Date(a));
  }, [sessions]);

  // Data processing
  const processedData = useMemo(() => {
    let filtered = sessions.filter(s =>
      s.charger?.ocppId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id?.toString().includes(searchQuery)
    );

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        if (sortConfig.key === 'charger') {
          valA = a.charger?.ocppId || "";
          valB = b.charger?.ocppId || "";
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Grouping
    const groups = {};
    filtered.forEach(session => {
      const date = new Date(session.startTime || session.createdAt);
      const month = date.toLocaleString('default', { month: 'long', year: 'numeric' });

      // Filter by selected month
      if (selectedMonth !== "All" && month !== selectedMonth) return;

      if (!groups[month]) groups[month] = { sessions: [], energy: 0, cost: 0 };
      groups[month].sessions.push(session);
      groups[month].energy += session.energyKwh || 0;
      groups[month].cost += session.cost || 0;
    });

    return groups;
  }, [sessions, searchQuery, sortConfig, selectedMonth]);

  const chartData = useMemo(() => {
    const months = Object.keys(processedData).reverse();
    return months.map(m => ({
      month: m.split(' ')[0], // Just the month name for X axis
      count: processedData[m].sessions.length,
      energy: parseFloat(processedData[m].energy.toFixed(2))
    }));
  }, [processedData]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const totalFilteredSessions = Object.values(processedData).reduce(
    (acc, g) => acc + g.sessions.length, 0
  );

  // ── Active session (first ACTIVE, UI-only) ─────────────────────────────────
  const activeSession = useMemo(() => sessions.find(s => s.status === 'ACTIVE') || null, [sessions]);

  // ── Peak Charging Hours (derived purely from sessions — no new API) ────────
  const peakHoursData = useMemo(() => {
    const hourCounts = Array(24).fill(0);
    sessions.forEach(s => {
      const h = new Date(s.startTime || s.createdAt).getHours();
      if (!isNaN(h)) hourCounts[h]++;
    });
    const max = Math.max(...hourCounts, 1);
    const slots = [6,8,10,12,14,16,18,20,22];
    return slots.map(h => ({
      hour: h,
      label: h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`,
      count: hourCounts[h],
      intensity: hourCounts[h] / max,
    }));
  }, [sessions]);

  return (
    <div className="sessions-page-wrapper" onClick={() => exportOpen && setExportOpen(false)}>
      <style>{`
        @keyframes ses-fadeInPage {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ses-shimmer-anim {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes ss-spin { to { transform: rotate(360deg); } }
        @keyframes ss-fade-in  { from { opacity:0 } to { opacity:1 } }
        @keyframes ss-slide-in {
          from { opacity:0; transform:translateY(20px) scale(0.97) }
          to   { opacity:1; transform:translateY(0) scale(1) }
        }
        @keyframes ss-slide-up {
          from { opacity:0; transform:translateY(16px) }
          to   { opacity:1; transform:translateY(0) }
        }
        @keyframes ses-pulse {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.5; }
        }
        @keyframes ses-dropdown-in {
          from { opacity:0; transform: translateY(-6px) scale(0.97); }
          to   { opacity:1; transform: translateY(0) scale(1); }
        }

        /* ── Page wrapper ───────────────────────────────────────────────── */
        .sessions-page-wrapper {
          animation: ses-fadeInPage 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          width: 100%;
          min-height: 100vh;
          font-family: 'Lexend', sans-serif;
          padding: 24px;
          box-sizing: border-box;
          background: #F9FAFB;
        }

        /* ── Header ─────────────────────────────────────────────────────── */
        .sessions-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
        }
        .sessions-title {
          font-size: 28px;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }
        .sessions-subtitle {
          font-size: 14px;
          color: #6B7280;
          margin-top: 4px;
          font-weight: 500;
        }

        /* ── Summary Cards ───────────────────────────────────────────────── */
        .ses-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 28px;
        }
        @media (max-width: 1200px) { .ses-stats-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 640px)  { .ses-stats-grid { grid-template-columns: 1fr; } }

        .ses-stat-card {
          background: #ffffff;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 20px 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 100px;
          transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
          box-sizing: border-box;
          cursor: default;
        }
        .ses-stat-card:hover {
          transform: translateY(-4px) scale(1.01);
          box-shadow: 0 12px 24px rgba(0,0,0,0.05);
          border-color: #27C786;
        }
        .ses-stat-card-left { display: flex; align-items: center; gap: 16px; }
        .ses-stat-icon-circle {
          width: 48px; height: 48px;
          border-radius: 50%;
          background: rgba(39,199,134,0.08);
          border: 1px solid rgba(39,199,134,0.15);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .ses-stat-icon-img { width: 22px; height: 22px; }
        .ses-stat-info-group { display: flex; flex-direction: column; }
        .ses-stat-label-text {
          font-size: 13px; color: #6B7280; font-weight: 500; margin: 0 0 4px 0;
        }
        .ses-stat-value-text {
          font-size: 26px; font-weight: 700; color: #111827;
          line-height: 1.2; margin: 0;
        }
        .ses-stat-card-arrow {
          color: #27C786; display: flex; align-items: center;
          transition: transform 0.3s ease; opacity: 0.7;
          flex-shrink: 0;
        }
        .ses-stat-card:hover .ses-stat-card-arrow {
          transform: translateX(3px) translateY(-3px); opacity: 1;
        }

        /* ── Records Section ─────────────────────────────────────────────── */
        .ses-records-section {
          background: #ffffff;
          border-radius: 16px;
          padding: 24px;
          border: 1px solid #E5E7EB;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }
        .ses-records-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .ses-records-title {
          font-size: 18px; font-weight: 700; color: #111827; margin: 0;
        }
        .ses-records-count {
          font-size: 13px; color: #6B7280; font-weight: 500; margin-top: 3px;
        }
        .ses-filters-wrapper {
          display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
        }

        /* ── Search Bar ──────────────────────────────────────────────────── */
        .ses-search-wrapper { position: relative; }
        .ses-search-icon {
          position: absolute; left: 14px; top: 50%;
          transform: translateY(-50%); color: #27C786;
          display: flex; align-items: center; pointer-events: none;
        }
        .ses-search-input {
          padding: 10px 36px 10px 40px;
          border: 1px solid #E5E7EB;
          border-radius: 9999px;
          font-size: 14px; outline: none;
          width: 280px; font-family: inherit;
          background: #fff; color: #111827;
          transition: all 0.3s ease;
        }
        .ses-search-input::placeholder { color: #9CA3AF; }
        .ses-search-input:focus {
          border-color: #27C786;
          box-shadow: 0 0 0 3px rgba(39,199,134,0.15);
        }
        .ses-search-clear {
          position: absolute; right: 12px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none; color: #9CA3AF;
          cursor: pointer; display: flex; align-items: center;
          padding: 3px; border-radius: 50%; transition: all 0.2s;
        }
        .ses-search-clear:hover { background: #F3F4F6; color: #111827; }

        /* ── Month Filter ────────────────────────────────────────────────── */
        .ses-filter-select-wrapper { position: relative; }
        .ses-month-filter {
          appearance: none; -webkit-appearance: none;
          padding: 10px 36px 10px 14px;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          font-size: 14px; outline: none;
          background: #fff; cursor: pointer;
          font-family: inherit; min-width: 160px;
          color: #374151; transition: all 0.3s ease;
        }
        .ses-month-filter:hover { border-color: #27C786; }
        .ses-month-filter:focus {
          border-color: #27C786;
          box-shadow: 0 0 0 3px rgba(39,199,134,0.15);
        }
        .ses-filter-caret {
          position: absolute; right: 12px; top: 50%;
          transform: translateY(-50%); pointer-events: none; color: #6B7280;
          display: flex; align-items: center;
        }

        /* ── Month Group ─────────────────────────────────────────────────── */
        .ses-month-group { margin-bottom: 36px; }

        /* Month header – title row */
        .ses-month-header-row {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 18px 12px;
          background: linear-gradient(135deg, #F0FDF4 0%, #F9FAFB 100%);
          border: 1px solid rgba(39,199,134,0.2);
          border-radius: 12px 12px 0 0;
          border-left: 4px solid #27C786;
          border-bottom: none;
        }
        .ses-month-cal-icon {
          width: 32px; height: 32px;
          background: rgba(39,199,134,0.12);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          color: #27C786;
        }
        .ses-month-name { font-weight: 700; font-size: 16px; color: #111827; }

        /* Month KPI cards strip */
        .ses-month-kpi-strip {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          border: 1px solid rgba(39,199,134,0.2);
          border-left: 4px solid #27C786;
          border-radius: 0 0 12px 12px;
          overflow: hidden;
          margin-bottom: 16px;
          background: #fff;
        }
        @media (max-width: 900px) { .ses-month-kpi-strip { grid-template-columns: repeat(2,1fr); } }
        .ses-month-kpi-card {
          padding: 14px 18px;
          border-right: 1px solid #F3F4F6;
          display: flex; align-items: center; gap: 12px;
          background: #fff;
          transition: background 0.2s ease;
        }
        .ses-month-kpi-card:last-child { border-right: none; }
        .ses-month-kpi-card:hover { background: #F0FDF4; }
        .ses-month-kpi-icon {
          width: 36px; height: 36px;
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .ses-month-kpi-label {
          font-size: 11px; color: #6B7280; font-weight: 500; margin: 0 0 3px;
          text-transform: uppercase; letter-spacing: 0.04em;
        }
        .ses-month-kpi-value {
          font-size: 18px; font-weight: 700; color: #111827; margin: 0; line-height: 1.2;
        }

        /* ── Export Button ──────────────────────────────────────────────── */
        .ses-export-wrapper { position: relative; }
        .ses-export-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 16px;
          background: #111827; color: #fff;
          border: none; border-radius: 9999px;
          font-size: 13px; font-weight: 600; cursor: pointer;
          font-family: inherit;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(17,24,39,0.18);
          white-space: nowrap;
        }
        .ses-export-btn:hover {
          background: #374151;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(17,24,39,0.25);
        }
        .ses-export-chevron {
          transition: transform 0.2s ease;
        }
        .ses-export-chevron.open { transform: rotate(180deg); }
        .ses-export-dropdown {
          position: absolute; right: 0; top: calc(100% + 6px);
          background: #fff;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.06);
          overflow: hidden; z-index: 200;
          min-width: 170px;
          animation: ses-dropdown-in 0.18s cubic-bezier(0.16,1,0.3,1);
        }
        .ses-export-item {
          width: 100%; padding: 11px 16px;
          border: none; background: none;
          font-size: 13px; font-weight: 500; color: #374151;
          cursor: pointer; font-family: inherit;
          display: flex; align-items: center; gap: 10px;
          transition: background 0.15s ease;
          text-align: left;
        }
        .ses-export-item:hover { background: #F9FAFB; color: #111827; }
        .ses-export-item + .ses-export-item { border-top: 1px solid #F3F4F6; }

        /* ── Active Session Widget ──────────────────────────────────────── */
        .ses-active-widget {
          background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%);
          border: 1px solid #6EE7B7;
          border-radius: 14px;
          padding: 16px 20px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          box-shadow: 0 2px 8px rgba(16,185,129,0.12);
          position: relative;
          overflow: hidden;
        }
        .ses-active-widget::before {
          content: '';
          position: absolute; left: 0; top: 0; bottom: 0;
          width: 4px; background: #10B981;
          border-radius: 4px 0 0 4px;
        }
        .ses-active-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: #10B981; color: #fff;
          padding: 4px 10px; border-radius: 9999px;
          font-size: 11px; font-weight: 700;
          letter-spacing: 0.05em; white-space: nowrap;
          flex-shrink: 0;
        }
        .ses-active-pulse {
          width: 7px; height: 7px; border-radius: 50%;
          background: #fff;
          animation: ses-pulse 1.4s infinite ease-in-out;
        }
        .ses-active-metrics {
          display: flex; gap: 24px; flex-wrap: wrap; flex: 1;
        }
        .ses-active-metric {
          display: flex; flex-direction: column; gap: 1px;
        }
        .ses-active-metric-label {
          font-size: 11px; color: #065F46; font-weight: 500; opacity: 0.8;
        }
        .ses-active-metric-value {
          font-size: 15px; font-weight: 700; color: #064E3B;
        }
        .ses-active-view-btn {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 7px 16px;
          background: #10B981; color: #fff;
          border: none; border-radius: 9999px;
          font-size: 12px; font-weight: 600;
          cursor: pointer; font-family: inherit;
          transition: all 0.2s ease;
          box-shadow: 0 2px 6px rgba(16,185,129,0.3);
          white-space: nowrap; flex-shrink: 0;
          text-decoration: none;
        }
        .ses-active-view-btn:hover {
          background: #059669;
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(16,185,129,0.4);
        }

        /* ── Peak Heatmap ────────────────────────────────────────────────── */
        .ses-peak-card {
          background: #fff;
          border: 1px solid #E5E7EB;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          transition: box-shadow 0.3s ease;
        }
        .ses-peak-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
        .ses-peak-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          margin-bottom: 20px; padding-bottom: 16px;
          border-bottom: 1px solid #F3F4F6;
          flex-wrap: wrap; gap: 12px;
        }
        .ses-peak-title { font-size: 16px; font-weight: 700; color: #111827; margin: 0 0 3px; }
        .ses-peak-subtitle { font-size: 13px; color: #6B7280; margin: 0; font-weight: 500; }
        .ses-peak-legend {
          display: flex; align-items: center; gap: 8px; flex-shrink: 0;
        }
        .ses-peak-legend-label { font-size: 12px; color: #9CA3AF; font-weight: 500; }
        .ses-peak-legend-bar {
          width: 80px; height: 10px;
          border-radius: 5px;
          background: linear-gradient(to right, rgba(39,199,134,0.1), #27C786);
        }
        .ses-peak-heatmap {
          display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end;
        }
        .ses-peak-slot {
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          flex: 1; min-width: 60px;
        }
        .ses-peak-bar-wrap {
          width: 100%; height: 80px;
          display: flex; align-items: flex-end;
          background: #F9FAFB; border-radius: 8px;
          overflow: hidden;
          border: 1px solid #F3F4F6;
        }
        .ses-peak-bar {
          width: 100%;
          border-radius: 6px 6px 0 0;
          transition: height 0.6s cubic-bezier(0.16,1,0.3,1);
        }
        .ses-peak-count { font-size: 12px; font-weight: 700; color: #374151; }
        .ses-peak-label { font-size: 11px; color: #9CA3AF; font-weight: 500; white-space: nowrap; }
        .ses-peak-empty {
          text-align: center; padding: 32px; color: #9CA3AF;
          font-size: 14px; font-weight: 500;
        }

        /* ── Table ───────────────────────────────────────────────────────── */
        .ses-table-wrapper {
          overflow-x: auto;
          border-radius: 12px;
          border: 1px solid #E5E7EB;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.04);
          background: #fff;
          margin-bottom: 8px;
        }
        .ses-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }
        .ses-table th {
          text-align: left;
          padding: 12px 16px;
          color: #4B5563; font-weight: 600; font-size: 11px;
          text-transform: uppercase; letter-spacing: 0.06em;
          border-bottom: 1px solid #E5E7EB;
          background: #F9FAFB;
          cursor: pointer;
          position: sticky; top: 0; z-index: 1;
          white-space: nowrap;
          transition: color 0.2s;
          box-shadow: inset 0 -1px 0 #E5E7EB;
          user-select: none;
        }
        .ses-table th:hover { color: #111827; }
        .ses-table th.ses-no-sort { cursor: default; }
        .ses-table tr td { transition: background-color 0.2s ease; }
        .ses-table tr:nth-child(odd) td  { background-color: #ffffff; }
        .ses-table tr:nth-child(even) td { background-color: #F9FAFB; }
        .ses-table tr td:first-child {
          border-left: 3px solid transparent;
          transition: border-left-color 0.2s ease, background-color 0.2s ease;
        }
        .ses-table tr:hover td             { background-color: #F0FDF4 !important; }
        .ses-table tr:hover td:first-child { border-left-color: #27C786; }
        .ses-table tr:last-child td        { border-bottom: none; }
        .ses-table td {
          padding: 14px 16px; font-size: 13px;
          color: #374151; border-bottom: 1px solid #E5E7EB;
        }
        .ses-td-bold { font-weight: 600; color: #111827; }
        .ses-td-id   { font-family: 'Courier New', monospace; font-size: 12px; color: #4B5563; }
        .ses-td-dim  { color: #D1D5DB; font-size: 18px; line-height: 1; }

        .ses-sort-icon {
          display: inline-flex; align-items: center;
          margin-left: 4px; opacity: 0.4; transition: opacity 0.2s;
          vertical-align: middle;
        }
        .ses-table th:hover .ses-sort-icon { opacity: 1; }

        /* ── Status Badges ───────────────────────────────────────────────── */
        .ses-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 3px 10px; border-radius: 9999px;
          font-size: 11px; font-weight: 600; white-space: nowrap;
        }
        .ses-badge-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .ses-badge-active   { background: #D1FAE5; color: #065F46; }
        .ses-badge-active   .ses-badge-dot { background: #10B981; }
        .ses-badge-initiated { background: #FEF3C7; color: #92400E; }
        .ses-badge-initiated .ses-badge-dot { background: #F59E0B; }
        .ses-badge-completed { background: #DBEAFE; color: #1E40AF; }
        .ses-badge-completed .ses-badge-dot { background: #3B82F6; }
        .ses-badge-error    { background: #FEE2E2; color: #991B1B; }
        .ses-badge-error    .ses-badge-dot { background: #EF4444; }

        /* ── Skeleton ────────────────────────────────────────────────────── */
        .ses-skeleton-wrapper { padding: 8px 0; }
        .ses-skeleton-row {
          height: 52px; border-radius: 8px; margin-bottom: 8px;
        }
        .ses-skeleton-shimmer {
          background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
          background-size: 200% 100%;
          animation: ses-shimmer-anim 1.5s infinite linear;
        }

        /* ── Empty State ─────────────────────────────────────────────────── */
        .ses-empty-state {
          text-align: center; padding: 60px 24px;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
        }
        .ses-empty-icon {
          width: 64px; height: 64px;
          background: #F3F4F6; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 16px; color: #9CA3AF;
        }
        .ses-empty-title  { font-size: 16px; font-weight: 600; color: #111827; margin: 0 0 6px; }
        .ses-empty-subtitle { font-size: 14px; color: #6B7280; margin: 0; }

        /* ── Stop Session Button ─────────────────────────────────────────── */
        .stop-session-btn {
          display: inline-flex; align-items: center; gap: 5px;
          background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
          color: #fff; border: none;
          padding: 5px 12px; border-radius: 6px;
          font-size: 12px; font-weight: 600; cursor: pointer;
          transition: all 0.18s ease;
          box-shadow: 0 1px 3px rgba(239,68,68,0.35);
          min-width: 76px; height: 30px;
          justify-content: center; font-family: inherit;
        }
        .stop-session-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(239,68,68,0.4);
        }
        .stop-session-btn:active:not(:disabled) { transform: translateY(0); }
        .stop-session-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .btn-spinner {
          width: 13px; height: 13px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff; border-radius: 50%;
          animation: ss-spin 0.75s linear infinite;
          display: inline-block;
        }

        /* ── Confirmation Modal ──────────────────────────────────────────── */
        .ss-modal-overlay {
          position: fixed; inset: 0;
          background: rgba(15,23,42,0.45);
          backdrop-filter: blur(5px);
          display: flex; align-items: center; justify-content: center;
          z-index: 9999;
          animation: ss-fade-in 0.18s ease;
        }
        .ss-modal-box {
          background: #fff;
          border-radius: 18px;
          width: 92%; max-width: 430px;
          padding: 28px 24px 24px;
          display: flex; flex-direction: column; align-items: center; text-align: center;
          box-shadow: 0 24px 48px rgba(0,0,0,0.14), 0 6px 12px rgba(0,0,0,0.08);
          animation: ss-slide-in 0.25s cubic-bezier(0.16,1,0.3,1);
        }
        .ss-modal-icon-wrap {
          width: 58px; height: 58px;
          background: #FEF2F2; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 16px; border: 2px solid #FECACA;
        }
        .ss-modal-title { font-size: 18px; font-weight: 700; color: #111827; margin: 0 0 10px; }
        .ss-modal-desc  { font-size: 14px; color: #4B5563; line-height: 1.6; margin: 0 0 22px; }
        .ss-modal-actions { display: flex; gap: 12px; width: 100%; }
        .ss-btn {
          flex: 1; padding: 10px 0; border-radius: 8px;
          font-size: 14px; font-weight: 600; cursor: pointer;
          border: none; transition: all 0.15s ease;
          display: inline-flex; align-items: center; justify-content: center; gap: 6px;
          font-family: inherit;
        }
        .ss-btn-cancel { background: #F3F4F6; color: #374151; }
        .ss-btn-cancel:hover { background: #E5E7EB; }
        .ss-btn-confirm {
          background: linear-gradient(135deg,#EF4444,#DC2626); color: #fff;
          box-shadow: 0 2px 8px rgba(239,68,68,0.3);
        }
        .ss-btn-confirm:hover {
          background: linear-gradient(135deg,#DC2626,#B91C1C);
          box-shadow: 0 4px 14px rgba(239,68,68,0.4);
        }

        /* ── Toast Notification ──────────────────────────────────────────── */
        .ss-toast {
          position: fixed; bottom: 28px; right: 28px;
          padding: 13px 18px; border-radius: 12px;
          font-size: 14px; font-weight: 500; color: #fff;
          display: flex; align-items: center; gap: 10px;
          z-index: 10000;
          box-shadow: 0 8px 24px rgba(0,0,0,0.18);
          animation: ss-slide-up 0.3s cubic-bezier(0.16,1,0.3,1);
          max-width: 340px; font-family: inherit;
        }
        .ss-toast-success { background: linear-gradient(135deg,#059669,#10B981); }
        .ss-toast-error   { background: linear-gradient(135deg,#DC2626,#EF4444); }
        .ss-toast-icon {
          display: flex; align-items: center; justify-content: center;
          width: 22px; height: 22px;
          background: rgba(255,255,255,0.2); border-radius: 50%; flex-shrink: 0;
        }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="sessions-header">
        <div>
          <h2 className="sessions-title">Session History</h2>
          <p className="sessions-subtitle">Monitor charging activity and session history.</p>
        </div>
      </div>

      {/* ── Summary Cards ──────────────────────────────────────────────────── */}
      <div className="ses-stats-grid">
        <Card title="Total Sessions"  value={summaryData.totalSessions}  icon={totalIcon} />
        <Card title="Active Sessions" value={summaryData.activeSessions} icon={activeIcon} />
        <Card title="Average Uptime"  value={summaryData.averageUptime}  icon={uptimeIcon} />
        <Card title="Errors Today"    value={summaryData.errorToday}     icon={errorIcon} />
      </div>

      {/* ── Trend Chart ────────────────────────────────────────────────────── */}
      <SessionChart data={chartData} />

      {/* ── Peak Charging Hours ────────────────────────────────────────────── */}
      <div className="ses-peak-card">
        <div className="ses-peak-header">
          <div>
            <h3 className="ses-peak-title">Peak Charging Hours</h3>
            <p className="ses-peak-subtitle">Charging activity distribution by time of day</p>
          </div>
          <div className="ses-peak-legend">
            <span className="ses-peak-legend-label">Low</span>
            <div className="ses-peak-legend-bar" />
            <span className="ses-peak-legend-label">High</span>
          </div>
        </div>
        {sessions.length === 0 ? (
          <div className="ses-peak-empty">No session data available yet.</div>
        ) : (
          <div className="ses-peak-heatmap">
            {peakHoursData.map(slot => {
              const alpha = 0.08 + slot.intensity * 0.92;
              const barColor = `rgba(39,199,134,${alpha.toFixed(2)})`;
              const barHeight = Math.max(6, Math.round(slot.intensity * 100));
              return (
                <div key={slot.hour} className="ses-peak-slot">
                  <span className="ses-peak-count">{slot.count}</span>
                  <div className="ses-peak-bar-wrap">
                    <div
                      className="ses-peak-bar"
                      style={{ height: `${barHeight}%`, background: barColor }}
                      title={`${slot.label}: ${slot.count} sessions`}
                    />
                  </div>
                  <span className="ses-peak-label">{slot.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Records Section ────────────────────────────────────────────────── */}
      <div className="ses-records-section">
        <div className="ses-records-header">
          <div>
            <h3 className="ses-records-title">Session Records</h3>
            {!loading && (
              <p className="ses-records-count">
                {totalFilteredSessions} {totalFilteredSessions === 1 ? 'session' : 'sessions'} found
              </p>
            )}
          </div>

          <div className="ses-filters-wrapper">
            {/* Month Filter */}
            <div className="ses-filter-select-wrapper">
              <select
                className="ses-month-filter"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                <option value="All">All Months</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <span className="ses-filter-caret">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </div>

            {/* Search */}
            <div className="ses-search-wrapper">
              <span className="ses-search-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search by OCPP ID or Session ID..."
                className="ses-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="ses-search-clear" onClick={() => setSearchQuery("")} title="Clear search">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>

            {/* Export Button */}
            <div className="ses-export-wrapper" onClick={e => e.stopPropagation()}>
              <button
                className="ses-export-btn"
                onClick={() => setExportOpen(o => !o)}
                title="Export session data"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Export
                <svg className={`ses-export-chevron${exportOpen ? ' open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {exportOpen && (
                <div className="ses-export-dropdown">
                  <button className="ses-export-item" onClick={() => { setExportOpen(false); }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#27C786" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                    </svg>
                    Export as CSV
                  </button>
                  <button className="ses-export-item" onClick={() => { setExportOpen(false); }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <path d="M3 9h18M3 15h18M9 3v18"/>
                    </svg>
                    Export as Excel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Active Session Widget ─────────────────────────────────────────── */}
        {!loading && activeSession && (
          <div className="ses-active-widget">
            <span className="ses-active-badge">
              <span className="ses-active-pulse" />
              ACTIVE NOW
            </span>
            <div className="ses-active-metrics">
              <div className="ses-active-metric">
                <span className="ses-active-metric-label">Station</span>
                <span className="ses-active-metric-value">{activeSession.charger?.ocppId || '—'}</span>
              </div>
              <div className="ses-active-metric">
                <span className="ses-active-metric-label">Energy</span>
                <span className="ses-active-metric-value">{activeSession.energyKwh ? `${activeSession.energyKwh.toFixed(2)} kWh` : '— kWh'}</span>
              </div>
              <div className="ses-active-metric">
                <span className="ses-active-metric-label">Session ID</span>
                <span className="ses-active-metric-value">#{activeSession.id}</span>
              </div>
              <div className="ses-active-metric">
                <span className="ses-active-metric-label">Started</span>
                <span className="ses-active-metric-value">
                  {activeSession.startTime
                    ? new Date(activeSession.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                    : '—'}
                </span>
              </div>
            </div>
            <button className="ses-active-view-btn" onClick={() => handleStopClick(activeSession)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <rect x="5" y="5" width="14" height="14" rx="2"/>
              </svg>
              Stop
            </button>
          </div>
        )}


        {/* Content */}
        {loading ? (
          <LoadingSpinner />
        ) : Object.keys(processedData).length === 0 ? (
          <div className="ses-empty-state">
            <div className="ses-empty-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M3 9h18M9 21V9"/>
              </svg>
            </div>
            <p className="ses-empty-title">No sessions found</p>
            <p className="ses-empty-subtitle">
              {searchQuery || selectedMonth !== "All"
                ? "Try adjusting your search or filter to find sessions."
                : "No session data is available yet."}
            </p>
          </div>
        ) : (
          Object.keys(processedData).map(month => {
            const grp = processedData[month];
            // Compute average duration for this month from existing data
            const durations = grp.sessions.map(s => {
              let secs = s.chargingDurationSeconds || 0;
              if (!secs && s.startTime) {
                const st = new Date(s.startTime);
                const en = s.endTime ? new Date(s.endTime) : (s.status === 'ACTIVE' ? new Date() : null);
                if (en) secs = Math.max(0, Math.floor((en - st) / 1000));
              }
              return secs;
            }).filter(d => d > 0);
            const avgSecs = durations.length ? Math.round(durations.reduce((a,b) => a+b,0) / durations.length) : 0;
            const avgDur = avgSecs ? `${Math.floor(avgSecs/60)}m ${avgSecs%60}s` : '—';

            return (
            <div key={month} className="ses-month-group">
              {/* Month Header Title Row */}
              <div className="ses-month-header-row">
                <div className="ses-month-cal-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                <span className="ses-month-name">{month}</span>
              </div>

              {/* Month KPI Cards Strip */}
              <div className="ses-month-kpi-strip">
                <div className="ses-month-kpi-card">
                  <div className="ses-month-kpi-icon" style={{ background: 'rgba(99,102,241,0.08)' }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
                    </svg>
                  </div>
                  <div>
                    <p className="ses-month-kpi-label">Total Sessions</p>
                    <p className="ses-month-kpi-value">{grp.sessions.length}</p>
                  </div>
                </div>
                <div className="ses-month-kpi-card">
                  <div className="ses-month-kpi-icon" style={{ background: 'rgba(16,185,129,0.08)' }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                    </svg>
                  </div>
                  <div>
                    <p className="ses-month-kpi-label">Total Energy</p>
                    <p className="ses-month-kpi-value">{grp.energy.toFixed(1)} kWh</p>
                  </div>
                </div>
                <div className="ses-month-kpi-card">
                  <div className="ses-month-kpi-icon" style={{ background: 'rgba(245,158,11,0.08)' }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="1" x2="12" y2="23"/>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                  </div>
                  <div>
                    <p className="ses-month-kpi-label">Total Revenue</p>
                    <p className="ses-month-kpi-value">₹{grp.cost.toLocaleString('en-IN')}</p>
                  </div>
                </div>
                <div className="ses-month-kpi-card">
                  <div className="ses-month-kpi-icon" style={{ background: 'rgba(239,68,68,0.08)' }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </div>
                  <div>
                    <p className="ses-month-kpi-label">Avg Duration</p>
                    <p className="ses-month-kpi-value">{avgDur}</p>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="ses-table-wrapper">
                <table className="ses-table">
                  <thead>
                    <tr>
                      <th onClick={() => handleSort('charger')}>
                        OCPP ID
                        <span className="ses-sort-icon">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M7 15l5 5 5-5M7 9l5-5 5 5"/>
                          </svg>
                        </span>
                      </th>
                      <th onClick={() => handleSort('id')}>
                        Session ID
                        <span className="ses-sort-icon">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M7 15l5 5 5-5M7 9l5-5 5 5"/>
                          </svg>
                        </span>
                      </th>
                      <th className="ses-no-sort">Status</th>
                      <th onClick={() => handleSort('energyKwh')}>
                        Energy
                        <span className="ses-sort-icon">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M7 15l5 5 5-5M7 9l5-5 5 5"/>
                          </svg>
                        </span>
                      </th>
                      <th onClick={() => handleSort('cost')}>
                        Cost
                        <span className="ses-sort-icon">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M7 15l5 5 5-5M7 9l5-5 5 5"/>
                          </svg>
                        </span>
                      </th>
                      <th className="ses-no-sort">Duration</th>
                      <th className="ses-no-sort" style={{ textAlign: "center" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedData[month].sessions.map((rec) => {
                      let durationSeconds = rec.chargingDurationSeconds || 0;
                      if (!durationSeconds && rec.startTime) {
                        const start = new Date(rec.startTime);
                        const end = rec.endTime ? new Date(rec.endTime) : (rec.status === "ACTIVE" ? new Date() : null);
                        if (end) {
                          durationSeconds = Math.max(0, Math.floor((end - start) / 1000));
                        }
                      }
                      const duration = durationSeconds
                        ? `${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`
                        : '—';

                      const badgeClass =
                        rec.status === "ACTIVE"     ? "ses-badge-active"    :
                        rec.status === "INITIATED"  ? "ses-badge-initiated" :
                        rec.status === "COMPLETED"  ? "ses-badge-completed" :
                        "ses-badge-error";

                      return (
                        <tr key={rec.id}>
                          <td className="ses-td-bold">{rec.charger?.ocppId || 'N/A'}</td>
                          <td className="ses-td-id">#{rec.id}</td>
                          <td>
                            <span className={`ses-badge ${badgeClass}`}>
                              <span className="ses-badge-dot" />
                              {rec.status}
                            </span>
                          </td>
                          <td>{rec.energyKwh ? `${rec.energyKwh.toFixed(2)} kWh` : '0 kWh'}</td>
                          <td>₹{rec.cost?.toLocaleString('en-IN')}</td>
                          <td>{duration}</td>
                          <td style={{ textAlign: "center" }}>
                            {!isDealer && (rec.status === "ACTIVE" || rec.status === "INITIATED") ? (
                              <button
                                className="stop-session-btn"
                                onClick={() => handleStopClick(rec)}
                                disabled={stoppingId !== null}
                                title="Stop this session"
                              >
                                {stoppingId === rec.id ? (
                                  <span className="btn-spinner" />
                                ) : (
                                  <>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                                      <rect x="5" y="5" width="14" height="14" rx="2" />
                                    </svg>
                                    Stop
                                  </>
                                )}
                              </button>
                            ) : (
                              <span className="ses-td-dim">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            );
          })
        )}
      </div>

      {/* ── Confirmation Modal ─────────────────────────────────────────────── */}
      {confirmModal.show && (
        <div className="ss-modal-overlay" onClick={() => setConfirmModal({ show: false, session: null })}>
          <div className="ss-modal-box" onClick={e => e.stopPropagation()}>
            <div className="ss-modal-icon-wrap">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h3 className="ss-modal-title">Stop Charging Session?</h3>
            <p className="ss-modal-desc">
              You are about to stop <strong>Session #{confirmModal.session?.id}</strong> on charger&nbsp;
              <strong>{confirmModal.session?.charger?.ocppId || "N/A"}</strong>.<br />
              This will immediately terminate the physical charging output.
            </p>
            <div className="ss-modal-actions">
              <button
                className="ss-btn ss-btn-cancel"
                onClick={() => setConfirmModal({ show: false, session: null })}
              >
                Cancel
              </button>
              <button
                className="ss-btn ss-btn-confirm"
                onClick={() => handleConfirmStop(confirmModal.session)}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="5" y="5" width="14" height="14" rx="2" />
                </svg>
                Stop Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Notification ─────────────────────────────────────────────── */}
      {toast.message && (
        <div className={`ss-toast ss-toast-${toast.type}`}>
          <span className="ss-toast-icon">
            {toast.type === "success"
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            }
          </span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

// ── Summary Card Component ────────────────────────────────────────────────────
const Card = ({ title, value, icon }) => (
  <div className="ses-stat-card">
    <div className="ses-stat-card-left">
      <div className="ses-stat-icon-circle">
        <img src={icon} alt="" className="ses-stat-icon-img" />
      </div>
      <div className="ses-stat-info-group">
        <p className="ses-stat-label-text">{title}</p>
        <h3 className="ses-stat-value-text">{value}</h3>
      </div>
    </div>
    <div className="ses-stat-card-arrow">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="7" y1="17" x2="17" y2="7"/>
        <polyline points="7 7 17 7 17 17"/>
      </svg>
    </div>
  </div>
);

export default Sessions;
