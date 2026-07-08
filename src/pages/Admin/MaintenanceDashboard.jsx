import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from "recharts";

export default function MaintenanceDashboard({ baseUrl: propBaseUrl } = {}) {
  const navigate = useNavigate();
  const [stations, setStations] = useState([]);
  const [activeSchedules, setActiveSchedules] = useState([]);
  const [history, setHistory] = useState([]);
  const [stationChargerCount, setStationChargerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  // Form State
  const [selectedStationId, setSelectedStationId] = useState("");
  const [chargers, setChargers] = useState([]);
  const [selectedChargerIds, setSelectedChargerIds] = useState([]);
  const [reason, setReason] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // UI State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [modalType, setModalType] = useState("ENABLE"); // ENABLE or DISABLE

  const [allChargers, setAllChargers] = useState([]);
  const [overviewStationId, setOverviewStationId] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const baseUrl = propBaseUrl || import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let intervalId;
    if (autoRefresh) {
      intervalId = setInterval(() => {
        fetchData(true);
      }, 15000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefresh]);

  const fetchData = async (isSilent = false) => {
    if (!isSilent) {
      setLoading(true);
      setError(null);
    }
    try {
      const [stationsRes, activeRes, chargersRes] = await Promise.all([
        fetch(`${baseUrl}/stations/all`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${baseUrl}/maintenance/active`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${baseUrl}/chargers/all`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      let loadedStations = [];
      if (stationsRes.ok) {
        const data = await stationsRes.json();
        setStations(data);
        loadedStations = data;
      }
      if (activeRes.ok) {
        const data = await activeRes.json();
        setActiveSchedules(data);
      }
      if (chargersRes.ok) {
        const data = await chargersRes.json();
        setAllChargers(data);
      }

      setLastUpdated(new Date());

      const currentStations = loadedStations.length > 0 ? loadedStations : stations;
      if (currentStations.length > 0) {
        const promises = currentStations.map(st =>
          fetch(`${baseUrl}/maintenance/station/${st.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then(res => res.ok ? res.json() : []).then(data => {
            if (Array.isArray(data)) {
              return data.map(item => ({ ...item, stationName: st.name, stationId: st.id }));
            }
            return [];
          })
        );
        const results = await Promise.all(promises);
        let allData = [];
        results.forEach(data => {
          allData = allData.concat(data);
        });
        allData.sort((a, b) => new Date(b.createdAt || b.scheduledStart) - new Date(a.createdAt || a.scheduledStart));
        setHistory(allData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to load maintenance history. Please try again later.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedStationId) {
      const stationChargers = allChargers.filter(c => c.stationId === parseInt(selectedStationId));
      setChargers(stationChargers);
      setStationChargerCount(stationChargers.length);
    } else {
      setChargers([]);
      setSelectedChargerIds([]);
      setStationChargerCount(0);
    }
  }, [selectedStationId, allChargers]);

  const handleOpenModal = (type) => {
    if (type === "ENABLE" && !selectedStationId) {
      alert("Please select a station first.");
      return;
    }
    if (type === "ENABLE" && selectedChargerIds.length === 0) {
      alert("Please select at least one charger.");
      return;
    }
    if (type === "ENABLE" && !reason) {
      alert("Please provide a reason for maintenance.");
      return;
    }
    setModalType(type);
    setShowConfirmModal(true);
  };

  const activeSelectedSchedules = activeSchedules.filter(
    (s) => s.targetType === "CHARGER" && selectedChargerIds.includes(s.targetId.toString())
  );
  const isAnyActive = activeSelectedSchedules.length > 0;

  const handleToggleMaintenance = async () => {
    setShowConfirmModal(false);
    setActionLoading(true);
    try {
      if (modalType === "ENABLE") {
        const promises = selectedChargerIds.map(id =>
          fetch(`${baseUrl}/maintenance/charger/${id}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              reason: reason,
              scheduledStart: new Date().toISOString(),
              scheduledEnd: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Default 24h
            }),
          })
        );
        const results = await Promise.all(promises);
        const allOk = results.every(res => res.ok);

        if (allOk) {
          alert("Maintenance mode enabled successfully for selected chargers!");
          setReason("");
          fetchData();
        } else {
          alert("Failed to enable maintenance for one or more chargers.");
        }
      } else {
        const promises = activeSelectedSchedules.map(schedule =>
          fetch(`${baseUrl}/maintenance/${schedule.id}/cancel`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
          })
        );
        const results = await Promise.all(promises);

        if (results.every(res => res.ok)) {
          // Restore Specific Charger Status
          try {
            const restorePromises = activeSelectedSchedules.map(schedule => {
              const chargerToRestore = chargers.find(c => c.id === schedule.targetId);
              if (chargerToRestore) {
                return fetch(`${baseUrl}/chargers/update/${chargerToRestore.id}`, {
                  method: "PUT",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    ...chargerToRestore,
                    availability: true,
                    status: "available"
                  }),
                });
              }
              return Promise.resolve();
            });
            await Promise.all(restorePromises);
          } catch (restoreErr) {
            console.error("Error during automated restoration:", restoreErr);
          }

          alert("Maintenance mode disabled. Selected chargers have been restored to active status.");
          fetchData();
        } else {
          alert("Failed to disable maintenance.");
        }
      }
    } catch (error) {
      console.error("Action error:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const toggleChargerSelection = (chargerId) => {
    setSelectedChargerIds(prev =>
      prev.includes(chargerId) ? prev.filter(id => id !== chargerId) : [...prev, chargerId]
    );
  };

  const handleSelectAllChargers = () => {
    if (selectedChargerIds.length === chargers.length) {
      setSelectedChargerIds([]);
    } else {
      setSelectedChargerIds(chargers.map(c => c.id.toString()));
    }
  };


  // Filter chargers for overview based on overviewStationId
  const overviewFilteredChargers = overviewStationId
    ? allChargers.filter(c => c.stationId === parseInt(overviewStationId))
    : allChargers;

  // Filter active schedules: station schedules vs charger schedules
  const stationMaintenanceActive = activeSchedules.filter(s => s.targetType === "STATION");
  const chargerMaintenanceActive = activeSchedules.filter(s => s.targetType === "CHARGER");

  // Status counters
  let activeCount = 0;
  let maintenanceCount = 0;
  let offlineCount = 0;
  let faultCount = 0;

  overviewFilteredChargers.forEach(charger => {
    // 1. Is Under Maintenance
    const isUnderMaintenance =
      chargerMaintenanceActive.some(s => s.targetId === charger.id) ||
      stationMaintenanceActive.some(s => s.targetId === charger.stationId);

    if (isUnderMaintenance) {
      maintenanceCount++;
    } else {
      const statusLower = charger.status?.toLowerCase();
      // 2. Is Fault
      const isFault = statusLower === "faulted" || statusLower === "error";

      if (isFault) {
        faultCount++;
      } else {
        const isOccupied =
          charger.occupied === true ||
          String(charger.occupied).toLowerCase() === "true" ||
          charger.occupied === 1 ||
          charger.occupied === "1" ||
          charger.isOccupied === true ||
          String(charger.isOccupied).toLowerCase() === "true" ||
          charger.isOccupied === 1 ||
          charger.isOccupied === "1";

        const availability =
          charger.availability === true ||
          String(charger.availability).toLowerCase() === "true" ||
          charger.availability === 1 ||
          charger.availability === "1" ||
          charger.isAvailability === true ||
          String(charger.isAvailability).toLowerCase() === "true" ||
          charger.isAvailability === 1 ||
          charger.isAvailability === "1" ||
          charger.available === true ||
          String(charger.available).toLowerCase() === "true" ||
          charger.available === 1 ||
          charger.available === "1" ||
          charger.isAvailable === true ||
          String(charger.isAvailable).toLowerCase() === "true" ||
          charger.isAvailable === 1 ||
          charger.isAvailable === "1";

        if (isOccupied) {
          activeCount++;
        } else if (availability) {
          activeCount++;
        } else if (
          statusLower === "available" ||
          statusLower === "online" ||
          statusLower === "preparing" ||
          statusLower === "reserved"
        ) {
          activeCount++;
        } else {
          offlineCount++;
        }
      }
    }
  });

  const totalCount = overviewFilteredChargers.length;

  const chartData = [
    { name: "Active", value: activeCount, color: "#10b981" },
    { name: "Under Maintenance", value: maintenanceCount, color: "#f59e0b" },
    { name: "Offline", value: offlineCount, color: "#64748b" },
    { name: "Fault", value: faultCount, color: "#ef4444" }
  ];

  // Filter history for recent activity based on overviewStationId
  const overviewFilteredHistory = overviewStationId
    ? history.filter(h => h.stationId === parseInt(overviewStationId))
    : history;

  const recentActivities = overviewFilteredHistory.slice(0, 5);

  const filteredHistory = history.filter(item =>
    item.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.status?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="maintenance-page">
      <style>{`
        .maintenance-page {
          background: #f8fafc;
          min-height: 100vh;
          padding: 32px;
          font-family: 'Lexend', sans-serif;
        }

        /* Premium Dashboard Components CSS */
        .controls-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #ffffff;
          padding: 16px 24px;
          border-radius: 16px;
          box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
          margin-bottom: 24px;
          border: 1px solid #f1f5f9;
        }

        .controls-left, .controls-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .filter-select {
          padding: 10px 16px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          font-family: inherit;
          font-size: 14px;
          font-weight: 500;
          color: #334155;
          background-color: #f8fafc;
          cursor: pointer;
          outline: none;
          min-width: 220px;
          transition: all 0.2s ease;
        }

        .filter-select:hover, .filter-select:focus {
          border-color: #94a3b8;
          background-color: #fff;
        }

        .refresh-btn-premium {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          padding: 10px 18px;
          border-radius: 12px;
          font-family: inherit;
          font-size: 14px;
          font-weight: 600;
          color: #334155;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .refresh-btn-premium:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          color: #0f172a;
        }

        .auto-refresh-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f8fafc;
          padding: 8px 14px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }

        .auto-refresh-toggle span {
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
        }

        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 38px;
          height: 22px;
        }

        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #cbd5e1;
          transition: .3s;
          border-radius: 34px;
        }

        .slider:before {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .3s;
          border-radius: 50%;
        }

        input:checked + .slider {
          background-color: #10b981;
        }

        input:checked + .slider:before {
          transform: translateX(16px);
        }

        .pulse-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #94a3b8;
          margin-right: 6px;
        }

        .pulse-active {
          background: #10b981;
          box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          animation: pulse-animation 1.6s infinite;
        }

        @keyframes pulse-animation {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          }
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
          }
        }

        .last-updated-text {
          font-size: 12px;
          color: #64748b;
          display: flex;
          align-items: center;
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
          padding: 22px 24px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.04);
          border: 1px solid #f1f5f9;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08);
        }

        .stat-card::after {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 5px;
          border-radius: 5px 0 0 5px;
        }

        .card-total::after { background: #6366f1; }
        .card-active::after { background: #10b981; }
        .card-maintenance::after { background: #f59e0b; }
        .card-offline::after { background: #64748b; }

        .stat-label {
          font-size: 13px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
          display: block;
        }

        .stat-value {
          font-size: 32px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.1;
        }

        .overview-grid {
          display: grid;
          grid-template-columns: 1.4fr 1.6fr;
          gap: 24px;
          margin-bottom: 32px;
        }

        .graph-container {
          background: #fff;
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.04);
          border: 1px solid #f1f5f9;
          display: flex;
          flex-direction: column;
        }

        .graph-container h3 {
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        .chart-layout {
          display: flex;
          align-items: center;
          gap: 24px;
          flex: 1;
        }

        .chart-wrapper {
          position: relative;
          width: 170px;
          height: 170px;
          flex-shrink: 0;
        }

        .chart-center-label {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }

        .chart-center-value {
          font-size: 32px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1;
        }

        .chart-center-text {
          font-size: 11px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-top: 4px;
        }

        .breakdown-list {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .breakdown-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .breakdown-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
        }

        .breakdown-title-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .breakdown-color-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .breakdown-name {
          font-weight: 600;
          color: #475569;
        }

        .breakdown-stats {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .breakdown-count {
          font-weight: 700;
          color: #0f172a;
        }

        .breakdown-percent {
          color: #94a3b8;
          font-size: 11px;
        }

        .breakdown-bar-bg {
          height: 6px;
          background: #f1f5f9;
          border-radius: 3px;
          width: 100%;
          overflow: hidden;
        }

        .breakdown-bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.8s ease-out;
        }

        .activity-card-container {
          background: #fff;
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.04);
          border: 1px solid #f1f5f9;
          display: flex;
          flex-direction: column;
          max-height: 380px;
        }

        .activity-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .activity-card-header h3 {
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          overflow-y: auto;
          flex: 1;
          padding-right: 4px;
        }

        .activity-list::-webkit-scrollbar {
          width: 6px;
        }
        .activity-list::-webkit-scrollbar-track {
          background: transparent;
        }
        .activity-list::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 4px;
        }

        .activity-item {
          display: flex;
          gap: 14px;
          padding: 12px;
          border-radius: 14px;
          transition: all 0.2s ease;
          border: 1px solid transparent;
        }

        .activity-item:hover {
          background: #f8fafc;
          border-color: #f1f5f9;
        }

        .activity-icon-wrapper {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .activity-info {
          flex: 1;
          min-width: 0;
        }

        .activity-title {
          font-size: 13.5px;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 4px 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .activity-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .activity-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 20px;
          text-transform: uppercase;
        }

        .activity-badge-active { background: #dcfce7; color: #15803d; }
        .activity-badge-completed { background: #f1f5f9; color: #64748b; }
        .activity-badge-scheduled { background: #fef9c3; color: #854d0e; }

        .activity-time {
          font-size: 11px;
          color: #94a3b8;
          font-weight: 500;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
        }

        .page-header h2 {
          font-size: 28px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        .back-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fff;
          border: 1px solid #e2e8f0;
          padding: 8px 16px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 500;
          color: #64748b;
          transition: all 0.2s;
        }

        .back-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: 400px 1fr;
          gap: 24px;
          align-items: start;
        }

        .control-panel {
          background: #fff;
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          height: fit-content;
        }

        .active-card {
          background: #1e293b;
          color: #fff;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 24px;
        }

        .active-card h3 {
          font-size: 14px;
          font-weight: 500;
          color: #94a3b8;
          margin: 0 0 12px 0;
        }

        .active-count {
          font-size: 32px;
          font-weight: 700;
          display: flex;
          align-items: baseline;
          gap: 8px;
        }

        .active-count span {
          font-size: 14px;
          font-weight: 400;
          color: #94a3b8;
        }

        .form-section {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #475569;
          margin-bottom: 8px;
        }

        .form-group select, .form-group textarea, .form-group input {
          width: 100%;
          padding: 12px;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          font-family: inherit;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }

        .form-group select:focus, .form-group textarea:focus {
          border-color: #3b82f6;
        }

        .action-btn {
          width: 100%;
          padding: 14px;
          border-radius: 12px;
          border: none;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .btn-enable {
          background: #ef4444;
          color: white;
        }

        .btn-enable:hover {
          background: #dc2626;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
        }

        .btn-disable {
          background: #10b981;
          color: white;
        }

        .btn-disable:hover {
          background: #059669;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
        }

        .history-section {
          background: #fff;
          border-radius: 24px;
          padding: 32px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }

        .charger-select-list {
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
        }
        .charger-select-header {
          padding: 12px 16px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .charger-options {
          max-height: 200px;
          overflow-y: auto;
          padding: 8px;
        }
        .charger-option {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s;
          margin-bottom: 4px;
        }
        .charger-option:hover {
          background: #f1f5f9;
        }
        .charger-option.selected {
          background: #e0f2fe;
        }

        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .search-bar {
          position: relative;
          width: 300px;
        }

        .search-bar input {
          width: 100%;
          padding: 10px 16px 10px 40px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          font-size: 14px;
        }

        .history-table {
          width: 100%;
          border-collapse: collapse;
        }

        .history-table th {
          text-align: left;
          padding: 16px;
          font-size: 13px;
          font-weight: 600;
          color: #64748b;
          border-bottom: 1px solid #f1f5f9;
        }

        .history-table td {
          padding: 16px;
          font-size: 14px;
          color: #1e293b;
          border-bottom: 1px solid #f1f5f9;
        }

        .status-pill {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status-active { background: #dcfce7; color: #15803d; }
        .status-completed { background: #f1f5f9; color: #64748b; }
        .status-scheduled { background: #fef9c3; color: #854d0e; }

        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: #fff;
          border-radius: 24px;
          padding: 32px;
          width: 450px;
          text-align: center;
        }

        .modal-icon {
          width: 64px;
          height: 64px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
        }

        .modal-content h3 {
          font-size: 20px;
          font-weight: 700;
          margin: 0 0 12px 0;
        }

        .modal-content p {
          color: #64748b;
          line-height: 1.6;
          margin: 0 0 24px 0;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
        }

        .modal-btn {
          flex: 1;
          padding: 12px;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          border: none;
        }

        .modal-btn-cancel { background: #f1f5f9; color: #64748b; }
        .modal-btn-confirm { color: white; }

        @media (max-width: 1024px) {
          .dashboard-grid { grid-template-columns: 1fr; }
          .history-section { grid-column: span 1; }
        }
      `}</style>

      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="back-btn" onClick={() => navigate("/dashboard/maintenance")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
            Emergency Panel
          </button>
          <h2>Maintenance Mode</h2>
        </div>

        <div className="active-card" style={{ marginBottom: 0, padding: '12px 24px' }}>
          <h3>Total Offline Stations</h3>
          <div className="active-count">
            {activeSchedules.length} <span>Active Cases</span>
          </div>
        </div>
      </div>

      <div className="controls-header">
        <div className="controls-left">
          <select
            className="filter-select"
            value={overviewStationId}
            onChange={(e) => setOverviewStationId(e.target.value)}
          >
            <option value="">All Stations</option>
            {stations.map(st => (
              <option key={st.id} value={st.id}>{st.name}</option>
            ))}
          </select>
          <button className="refresh-btn-premium" onClick={() => fetchData(false)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" /></svg>
            Refresh
          </button>
        </div>
        <div className="controls-right">
          {lastUpdated && (
            <span className="last-updated-text">
              <span className={`pulse-dot ${autoRefresh ? 'pulse-active' : ''}`}></span>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <div className="auto-refresh-toggle">
            <span>Auto Refresh</span>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card card-total">
          <span className="stat-label">Total Chargers</span>
          <span className="stat-value">{totalCount}</span>
        </div>
        <div className="stat-card card-active">
          <span className="stat-label">Active Chargers</span>
          <span className="stat-value">{activeCount}</span>
        </div>
        <div className="stat-card card-maintenance">
          <span className="stat-label">Under Maintenance</span>
          <span className="stat-value">{maintenanceCount}</span>
        </div>
        <div className="stat-card card-offline">
          <span className="stat-label">Offline Chargers</span>
          <span className="stat-value">{offlineCount}</span>
        </div>
      </div>

      <div className="overview-grid">
        <div className="graph-container">
          <div className="graph-header">
            <h3>Charger Status Distribution</h3>
          </div>
          <div className="chart-layout">
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.filter(d => d.value > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="chart-center-label">
                <span className="chart-center-value">{totalCount}</span>
                <span className="chart-center-text">Total</span>
              </div>
            </div>

            <div className="breakdown-list">
              {chartData.map((item, idx) => {
                const percentage = totalCount > 0 ? ((item.value / totalCount) * 100).toFixed(0) : 0;
                return (
                  <div key={idx} className="breakdown-item">
                    <div className="breakdown-header">
                      <div className="breakdown-title-group">
                        <span className="breakdown-color-dot" style={{ backgroundColor: item.color }}></span>
                        <span className="breakdown-name">{item.name}</span>
                      </div>
                      <div className="breakdown-stats">
                        <span className="breakdown-count">{item.value}</span>
                        <span className="breakdown-percent">{percentage}%</span>
                      </div>
                    </div>
                    <div className="breakdown-bar-bg">
                      <div className="breakdown-bar-fill" style={{ backgroundColor: item.color, width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="activity-card-container">
          <div className="activity-card-header">
            <h3>Recent Maintenance Activity</h3>
          </div>
          <div className="activity-list">
            {recentActivities.length > 0 ? (
              recentActivities.map(act => (
                <div key={act.id} className="activity-item">
                  <div className="activity-icon-wrapper">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>
                  </div>
                  <div className="activity-info">
                    <h4 className="activity-title">{act.reason || "Scheduled Maintenance"}</h4>
                    <div className="activity-meta">
                      <span className={`activity-badge activity-badge-${act.status?.toLowerCase()}`}>
                        {act.status}
                      </span>
                      <span className="activity-time">
                        {act.stationName} • {act.targetType === 'CHARGER' ? `Charger ID: ${act.targetId}` : 'Station-wide'}
                      </span>
                      <span className="activity-time" style={{ marginLeft: 'auto' }}>
                        {new Date(act.createdAt || act.scheduledStart).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8", fontSize: "14px", border: "1px dashed #cbd5e1", borderRadius: "16px", margin: "auto" }}>
                No recent maintenance activities found.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="control-panel">
          <div className="form-section">
            <div className="form-group">
              <label>Target Station</label>
              <select
                value={selectedStationId}
                onChange={(e) => {
                  setSelectedStationId(e.target.value);
                  setSelectedChargerIds([]); // reset chargers when station changes
                }}
                disabled={actionLoading}
              >
                <option value="">-- Select Station --</option>
                {stations.map(st => (
                  <option key={st.id} value={st.id}>{st.name} (ID: {st.id})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Target Chargers</label>
              {!selectedStationId ? (
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '12px', fontSize: '13px', color: '#94a3b8', border: '1.5px dashed #e2e8f0', textAlign: 'center' }}>
                  Please select a station first.
                </div>
              ) : chargers.length === 0 ? (
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '12px', fontSize: '13px', color: '#94a3b8', border: '1.5px dashed #e2e8f0', textAlign: 'center' }}>
                  No chargers found for this station.
                </div>
              ) : (
                <div className="charger-select-list">
                  <div className="charger-select-header">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, color: '#0f172a' }}>
                      <input
                        type="checkbox"
                        checked={selectedChargerIds.length === chargers.length && chargers.length > 0}
                        onChange={handleSelectAllChargers}
                      />
                      <span style={{ fontWeight: 600, fontSize: '13px' }}>Select All Chargers</span>
                    </label>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>{selectedChargerIds.length}/{chargers.length} selected</span>
                  </div>
                  <div className="charger-options">
                    {chargers.map(ch => {
                      const isActive = activeSchedules.some(s => s.targetType === "CHARGER" && s.targetId === ch.id);
                      return (
                        <label key={ch.id} className={`charger-option ${selectedChargerIds.includes(ch.id.toString()) ? 'selected' : ''}`}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                              type="checkbox"
                              checked={selectedChargerIds.includes(ch.id.toString())}
                              onChange={() => toggleChargerSelection(ch.id.toString())}
                            />
                            <span style={{ fontSize: '14px', color: '#1e293b' }}>Charger {ch.id} <span style={{ color: '#94a3b8', fontSize: '12px' }}>(OCPP: {ch.ocppId})</span></span>
                          </div>
                          {isActive && <span className="status-pill status-active" style={{ background: '#fee2e2', color: '#ef4444' }}>In Maintenance</span>}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Maintenance Reason</label>
              <textarea
                rows={4}
                placeholder="Describe the issue or scheduled work..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={actionLoading}
              />
            </div>

            {isAnyActive ? (
              <div className="status-info" style={{ background: '#fef2f2', padding: 16, borderRadius: 12, border: '1px solid #fecaca', marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: '#b91c1c', fontWeight: 600 }}>Active Maintenance Selected</div>
                <div style={{ fontSize: 12, color: '#991b1b', marginTop: 4 }}>You have selected {activeSelectedSchedules.length} charger(s) currently under maintenance. Disable maintenance to bring them back online.</div>
              </div>
            ) : (
              <div className="form-group">
                <label>Affected Estimations</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: '#64748b' }}>Chargers</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{selectedChargerIds.length}</div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: '#64748b' }}>Bookings</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>Auto-Cancel</div>
                  </div>
                </div>
              </div>
            )}

            {isAnyActive ? (
              <button
                className="action-btn btn-disable"
                onClick={() => handleOpenModal("DISABLE")}
                disabled={actionLoading}
              >
                {actionLoading ? "Processing..." : "Disable Maintenance"}
              </button>
            ) : (
              <button
                className="action-btn btn-enable"
                onClick={() => handleOpenModal("ENABLE")}
                disabled={actionLoading}
              >
                {actionLoading ? "Processing..." : "Enable Maintenance"}
              </button>
            )}
          </div>
        </div>

        <div className="history-section">
          <div className="history-header">
            <h3 style={{ margin: 0 }}>Maintenance History</h3>
            <div className="search-bar">
              <svg style={{ position: 'absolute', left: 12, top: 12 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input
                type="text"
                placeholder="Search history..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
              <div style={{ display: 'inline-block', width: 24, height: 24, border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 12 }}></div>
              <div>Loading maintenance history...</div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : error ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 16 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginBottom: 8 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              <div>{error}</div>
              <button onClick={() => fetchData()} style={{ marginTop: 12, padding: '6px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Retry</button>
            </div>
          ) : filteredHistory.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Date and Time</th>
                    <th>Station Name</th>
                    <th>Admin Name</th>
                    <th>Charger ID</th>
                    <th>Booking Cancellation</th>
                    <th>Status</th>
                    <th>End Date and Time</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map(item => (
                    <tr key={item.id}>
                      <td>{new Date(item.createdAt || item.scheduledStart).toLocaleString()}</td>
                      <td>{item.stationName}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: '#475569' }}>
                            {(item.createdByAdminName || 'System').charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 500 }}>{item.createdByAdminName || 'System Admin'}</span>
                        </div>
                      </td>
                      <td>{item.targetType === 'CHARGER' ? item.targetId : 'All'}</td>
                      <td>{item.cancelledBookingsCount}</td>
                      <td>
                        <span className={`status-pill status-${item.status?.toLowerCase()}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>{item.scheduledEnd ? new Date(item.scheduledEnd).toLocaleString() : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', border: '1px dashed #e2e8f0', borderRadius: 16 }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginBottom: 12, opacity: 0.5, display: 'inline-block' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
              <div>No maintenance history found.</div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-icon" style={{ background: modalType === "ENABLE" ? '#fee2e2' : '#dcfce7' }}>
              {modalType === "ENABLE" ? (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
              ) : (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
              )}
            </div>
            <h3>{modalType === "ENABLE" ? "Enable Maintenance?" : "Restore Chargers?"}</h3>
            <p>
              {modalType === "ENABLE"
                ? "This will immediately close the selected charger(s), cancel their future bookings, and notify users. This action cannot be undone automatically."
                : "This will bring the selected charger(s) back online and allow new bookings. They will return to normal operation."}
            </p>
            <div className="modal-actions">
              <button className="modal-btn modal-btn-cancel" onClick={() => setShowConfirmModal(false)}>Cancel</button>
              <button
                className="modal-btn modal-btn-confirm"
                style={{ background: modalType === "ENABLE" ? '#ef4444' : '#10b981' }}
                onClick={handleToggleMaintenance}
              >
                Confirm {modalType === "ENABLE" ? "Enable" : "Restore"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
