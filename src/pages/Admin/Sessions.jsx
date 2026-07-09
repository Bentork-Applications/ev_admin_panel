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

const LoadingSpinner = () => (
  <div className="dl-loading-container">
    Loading session data...
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

  return (
    <div className="sessions-container">
      <style>
        {`
          .sessions-container {
            padding: 30px;
            font-family: 'Lexend', sans-serif;
            background-color: #F1F1F1;
            min-height: 100vh;
          }
          .sessions-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
          }
          .sessions-title {
            font-size: 28px;
            font-weight: 700;
            margin: 0;
            color: #111;
          }
          .sessions-subtitle {
            font-size: 14px;
            color: #666;
            margin-top: 4px;
          }
          .summary-wrapper {
            display: flex;
            gap: 20px;
            margin-bottom: 24px;
            flex-wrap: wrap;
          }
          .summary-card {
            flex: 1;
            min-width: 200px;
            display: flex;
            align-items: center;
            gap: 16px;
            background-color: #FFFFFF;
            border-radius: 14px;
            padding: 18px 22px;
            border: 1px solid #e5e7eb;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          }
          .card-icon { width: 32px; height: 32px; }
          .card-title { font-size: 13px; color: #6B7280; margin-bottom: 4px; font-weight: 500; }
          .card-value { font-size: 22px; font-weight: 700; color: #111827; margin: 0; }
          
          .records-container {
            background-color: #FFFFFF;
            border-radius: 14px;
            padding: 24px;
            border: 1px solid #e5e7eb;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          }
          .records-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
          }
          .records-title { font-weight: 700; margin: 0; font-size: 18px; color: #111; }
          .search-box {
            padding: 10px 16px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            font-size: 14px;
            outline: none;
            width: 300px;
            font-family: inherit;
          }
          .search-box:focus { border-color: #6366f1; }

          .filters-wrapper {
            display: flex;
            gap: 12px;
            align-items: center;
          }
          .month-filter {
            padding: 10px 16px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            font-size: 14px;
            outline: none;
            background-color: white;
            cursor: pointer;
            font-family: inherit;
            min-width: 160px;
          }
          .month-filter:focus { border-color: #6366f1; }
          
          .month-group { margin-bottom: 30px; }
          .month-header {
            background: #f9fafb;
            padding: 12px 16px;
            border-radius: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            border: 1px solid #f3f4f6;
          }
          .month-name { font-weight: 700; font-size: 15px; color: #374151; }
          .month-stats { display: flex; gap: 20px; font-size: 13px; color: #6B7280; }
          .month-stat-item { display: flex; align-items: center; gap: 6px; }
          .month-stat-value { font-weight: 600; color: #111; }

          .sessions-table { width: 100%; border-collapse: collapse; }
          .table-th {
            padding: 12px;
            font-weight: 600;
            color: #6B7280;
            font-size: 12px;
            text-align: left;
            border-bottom: 1px solid #f3f4f6;
            cursor: pointer;
            transition: color 0.2s;
          }
          .table-th:hover { color: #111; }
          .table-tr { border-bottom: 1px solid #f9fafb; transition: background 0.1s; }
          .table-tr:hover { background-color: #fafafa; }
          .table-td { padding: 14px 12px; font-size: 13px; color: #374151; }
          
          .status-badge {
            padding: 4px 10px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 11px;
          }
          .status-active { background-color: #D1FAE5; color: #065F46; }
          .status-initiated { background-color: #FEF3C7; color: #92400E; }
          .status-completed { background-color: #DBEAFE; color: #1E40AF; }
          .status-error { background-color: #FEE2E2; color: #991B1B; }
          
          .dl-loading-container { text-align: center; padding: 50px; color: #6B7280; font-size: 15px; }

          /* ── Stop Session Button ─────────────────────────────────────── */
          .stop-session-btn {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
            color: #fff;
            border: none;
            padding: 5px 11px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.18s ease;
            box-shadow: 0 1px 3px rgba(239,68,68,0.35);
            min-width: 76px;
            height: 28px;
            justify-content: center;
            font-family: inherit;
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
            border-top-color: #fff;
            border-radius: 50%;
            animation: ss-spin 0.75s linear infinite;
            display: inline-block;
          }
          @keyframes ss-spin { to { transform: rotate(360deg); } }

          /* ── Confirmation Modal ──────────────────────────────────────── */
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
            background: #FEF2F2;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            margin-bottom: 16px;
            border: 2px solid #FECACA;
          }
          .ss-modal-title {
            font-size: 18px; font-weight: 700; color: #111827;
            margin: 0 0 10px;
          }
          .ss-modal-desc {
            font-size: 14px; color: #4B5563; line-height: 1.6;
            margin: 0 0 22px;
          }
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
            background: linear-gradient(135deg,#EF4444,#DC2626);
            color: #fff;
            box-shadow: 0 2px 8px rgba(239,68,68,0.3);
          }
          .ss-btn-confirm:hover {
            background: linear-gradient(135deg,#DC2626,#B91C1C);
            box-shadow: 0 4px 14px rgba(239,68,68,0.4);
          }

          /* ── Toast Notification ──────────────────────────────────────── */
          .ss-toast {
            position: fixed; bottom: 28px; right: 28px;
            padding: 13px 18px; border-radius: 12px;
            font-size: 14px; font-weight: 500; color: #fff;
            display: flex; align-items: center; gap: 10px;
            z-index: 10000;
            box-shadow: 0 8px 24px rgba(0,0,0,0.18);
            animation: ss-slide-up 0.3s cubic-bezier(0.16,1,0.3,1);
            max-width: 340px;
            font-family: inherit;
          }
          .ss-toast-success { background: linear-gradient(135deg,#059669,#10B981); }
          .ss-toast-error   { background: linear-gradient(135deg,#DC2626,#EF4444); }
          .ss-toast-icon {
            display: flex; align-items: center; justify-content: center;
            width: 22px; height: 22px;
            background: rgba(255,255,255,0.2); border-radius: 50%;
            flex-shrink: 0;
          }

          @keyframes ss-fade-in  { from { opacity:0 } to { opacity:1 } }
          @keyframes ss-slide-in {
            from { opacity:0; transform:translateY(20px) scale(0.97) }
            to   { opacity:1; transform:translateY(0) scale(1) }
          }
          @keyframes ss-slide-up {
            from { opacity:0; transform:translateY(16px) }
            to   { opacity:1; transform:translateY(0) }
          }
        `}
      </style>

      {/* Header */}
      <div className="sessions-header">
        <div>
          <h2 className="sessions-title">Session History</h2>
          <p className="sessions-subtitle">Monitor charging activity and session history.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-wrapper">
        <Card title="Total Sessions" value={summaryData.totalSessions} icon={totalIcon} />
        <Card title="Active Sessions" value={summaryData.activeSessions} icon={activeIcon} />
        <Card title="Average Uptime" value={summaryData.averageUptime} icon={uptimeIcon} />
        <Card title="Errors Today" value={summaryData.errorToday} icon={errorIcon} />
      </div>

      {/* Trend Chart */}
      <SessionChart data={chartData} />

      {/* Records Section */}
      <div className="records-container">
        <div className="records-header">
          <h3 className="records-title">Session Records</h3>
          <div className="filters-wrapper">
            <select
              className="month-filter"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="All">All Months</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Search by OCPP ID or Session ID..."
              className="search-box"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : Object.keys(processedData).length === 0 ? (
          <p style={{ textAlign: "center", padding: "40px", color: "#6B7280" }}>
            No sessions found matching your search.
          </p>
        ) : (
          Object.keys(processedData).map(month => (
            <div key={month} className="month-group">
              <div className="month-header">
                <span className="month-name">{month}</span>
                <div className="month-stats">
                  <div className="month-stat-item">Sessions: <span className="month-stat-value">{processedData[month].sessions.length}</span></div>
                  <div className="month-stat-item">Energy: <span className="month-stat-value">{processedData[month].energy.toFixed(2)} kWh</span></div>
                  <div className="month-stat-item">Cost: <span className="month-stat-value">₹{processedData[month].cost.toLocaleString('en-IN')}</span></div>
                </div>
              </div>
              <table className="sessions-table">
                <thead>
                  <tr>
                    <th className="table-th" onClick={() => handleSort('charger')}>OCPP ID <img src={sortIcon} alt="" style={{ width: 10 }} /></th>
                    <th className="table-th" onClick={() => handleSort('id')}>Session ID <img src={sortIcon} alt="" style={{ width: 10 }} /></th>
                    <th className="table-th">Status</th>
                    <th className="table-th" onClick={() => handleSort('energyKwh')}>Energy <img src={sortIcon} alt="" style={{ width: 10 }} /></th>
                    <th className="table-th" onClick={() => handleSort('cost')}>Cost <img src={sortIcon} alt="" style={{ width: 10 }} /></th>
                    <th className="table-th">Duration</th>
                    <th className="table-th" style={{ textAlign: "center", cursor: "default" }}>Actions</th>
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

                    return (
                      <tr key={rec.id} className="table-tr">
                        <td className="table-td" style={{ fontWeight: 600 }}>{rec.charger?.ocppId || 'N/A'}</td>
                        <td className="table-td">{rec.id}</td>
                        <td className="table-td">
                          <span className={`status-badge ${rec.status === "ACTIVE" ? "status-active" :
                            rec.status === "INITIATED" ? "status-initiated" :
                              rec.status === "COMPLETED" ? "status-completed" :
                                "status-error"
                            }`}>
                            {rec.status}
                          </span>
                        </td>
                        <td className="table-td">{rec.energyKwh ? `${rec.energyKwh.toFixed(2)} kWh` : '0 kWh'}</td>
                        <td className="table-td">{`₹${rec.cost?.toLocaleString('en-IN')}`}</td>
                        <td className="table-td">{duration}</td>
                        <td className="table-td" style={{ textAlign: "center" }}>
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
                            <span style={{ color: "#D1D5DB", fontSize: 18, lineHeight: 1 }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>

      {/* ── Confirmation Modal ─────────────────────────────────────────── */}
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

      {/* ── Toast Notification ─────────────────────────────────────────── */}
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

const Card = ({ title, value, icon }) => (
  <div className="summary-card">
    <img src={icon} alt="" className="card-icon" />
    <div>
      <p className="card-title">{title}</p>
      <h3 className="card-value">{value}</h3>
    </div>
  </div>
);

export default Sessions;
