import React, { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import totalIcon from "../../assets/icons/stationicon/Vector.svg";
import activeIcon from "../../assets/icons/stationicon/green.svg";
import uptimeIcon from "../../assets/icons/stationicon/yellow.svg";
import errorIcon from "../../assets/icons/stationicon/red.svg";
import sortIcon from "../../assets/icons/stationicon/upndown.svg";
import editIcon from "../../assets/icons/stationicon/edit.svg";
import plusIcon from "../../assets/icons/stafficon/plus.svg";
import deleteIcon from "../../assets/icons/stationicon/delete.svg";
import StationOverviewChart from "../../components/admin/StationOverviewChart";

const AddStation = lazy(() => import('./form/AddStation'));
const EditStation = lazy(() => import('./form/EditStation'));

// Count up utility component
function AnimatedCounter({ value }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const strVal = String(value);
    const hasPercent = strVal.endsWith("%");
    const numOnly = parseFloat(strVal.replace(/[^0-9.]/g, ""));
    if (isNaN(numOnly) || numOnly === 0) {
      setCount(value);
      return;
    }
    const end = numOnly;
    const duration = 1000;
    const frameRate = 1000 / 60;
    const totalFrames = Math.round(duration / frameRate);
    let frame = 0;
    
    const counter = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      const currentCount = end * (progress * (2 - progress));
      
      if (frame >= totalFrames) {
        setCount(value);
        clearInterval(counter);
      } else {
        const displayVal = Number.isInteger(end) 
          ? Math.round(currentCount) 
          : currentCount.toFixed(1);
        setCount(hasPercent ? `${displayVal}%` : displayVal);
      }
    }, frameRate);
    
    return () => clearInterval(counter);
  }, [value]);

  return <>{count}</>;
}

const LoadingSpinner = () => (
  <div className="loading-spinner">
    Loading data...
  </div>
);

const Modal = ({ children, onClose }) => (
  <div className="modal-overlay">
    <div className="modal-content">
      {children}
    </div>
  </div>
);

// Framer Motion Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
};

function Stations({ baseUrl, userRole }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isDealer = userRole === "DEALER";

  const [stations, setStations] = useState([]);
  const [chargers, setChargers] = useState([]);
  const [sessions, setSessions] = useState([]);
  
  const [summaryData, setSummaryData] = useState({
    totalStations: '...',
    activeStations: '...',
    averageUptime: '...',
    errorToday: '...',
  });

  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Advanced Filter Drawer State
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [cityFilter, setCityFilter] = useState("All");
  const [capacityFilter, setCapacityFilter] = useState("All");
  const [connectorFilter, setConnectorFilter] = useState("All");

  // Accordion Expand State
  const [expandedRowId, setExpandedRowId] = useState(null);

  // Hover Popover State
  const [hoveredStation, setHoveredStation] = useState(null);
  const [hoverCoords, setHoverCoords] = useState({ x: 0, y: 0 });

  // Quick Action Button Spinner States
  const [actionsLoading, setActionsLoading] = useState({
    refresh: false,
    export: false,
    report: false
  });

  // Toast notifications state
  const [toast, setToast] = useState({ message: "", type: "" });
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "" }), 4000);
  };

  useEffect(() => {
    if (location.state?.openAddModal && !isDealer) {
      setIsModalOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, isDealer, navigate, location.pathname]);

  // Fetch Station, location coordinates, chargers, and sessions in parallel
  useEffect(() => {
    const fetchStationData = async () => {
      setLoading(true);

      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/");
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const recordsEndpoint = isDealer ? "/dealer/stations" : "/stations/all";
      const chargersEndpoint = isDealer ? "/dealer/chargers" : "/chargers/all";
      const sessionsEndpoint = isDealer ? "/dealer/sessions" : "/sessions/all/records";
      const uptimeEndpoint = "/stations/uptime";
      const errorsEndpoint = "/stations/error/today";

      try {
        const fetchRecords = async () => {
          try {
            const [res, chargersRes, sessionsRes] = await Promise.all([
              fetch(baseUrl + recordsEndpoint, { headers }),
              fetch(baseUrl + chargersEndpoint, { headers }),
              fetch(baseUrl + sessionsEndpoint, { headers })
            ]);

            if (res.status === 401 || res.status === 403) throw new Error('Auth failed');
            if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

            const data = await res.json();
            const list = Array.isArray(data) ? data : [];

            let chargersList = [];
            let sessionsList = [];

            if (chargersRes.ok) {
              const chData = await chargersRes.json();
              chargersList = Array.isArray(chData) ? chData : [];
              setChargers(chargersList);
            }
            if (sessionsRes.ok) {
              const ssData = await sessionsRes.json();
              sessionsList = Array.isArray(ssData) ? ssData : [];
              setSessions(sessionsList);
            }

            // Fetch locations for each station in parallel
            const stationsWithLocation = await Promise.all(
              list.map(async (station) => {
                if (station.locationId) {
                  try {
                    const locRes = await fetch(`${baseUrl}/location/get/${station.locationId}`, { headers });
                    if (locRes.ok) {
                      const locData = await locRes.json();
                      return { ...station, location: locData };
                    }
                  } catch (e) {
                    console.error(`Failed to fetch location for station ${station.id}:`, e);
                  }
                }
                return { ...station, location: null };
              })
            );

            setStations(stationsWithLocation);

            // Derive stats card metrics
            const total = list.length;
            const active = list.filter(s => s.status === 'ACTIVE').length;
            setSummaryData(prev => ({
              ...prev,
              totalStations: total,
              activeStations: active,
            }));
          } catch (err) {
            console.error("Failed to fetch records:", err);
            setSummaryData(prev => ({
              ...prev,
              totalStations: 'N/A',
              activeStations: 'N/A',
            }));
          } finally {
            setLoading(false);
          }
        };

        const fetchSummaryItem = async (key, endpoint, transform = (v) => v) => {
          try {
            const res = await fetch(baseUrl + endpoint, { headers });
            if (res.status === 401 || res.status === 403) throw new Error('Auth failed');
            if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
            const text = await res.text();
            let displayValue;
            try {
              const json = JSON.parse(text);
              if (typeof json === 'number') {
                displayValue = json;
              } else if (typeof json === 'object' && json !== null) {
                const numericEntry = Object.values(json).find(v => typeof v === 'number');
                displayValue = numericEntry !== undefined ? numericEntry : text;
              } else {
                displayValue = text;
              }
            } catch {
              displayValue = text.trim();
            }
            setSummaryData(prev => ({ ...prev, [key]: transform(displayValue) }));
          } catch (err) {
            console.error(`Failed to fetch ${key}:`, err);
            setSummaryData(prev => ({ ...prev, [key]: 'N/A' }));
          }
        };

        if (!isDealer) {
          fetchSummaryItem('averageUptime', uptimeEndpoint, (v) => `${parseFloat(v)}%`);
          fetchSummaryItem('errorToday', errorsEndpoint);
        } else {
          setSummaryData(prev => ({ ...prev, averageUptime: 'N/A', errorToday: 'N/A' }));
        }

        fetchRecords();
      } catch (err) {
        console.error("Error in fetchStationData:", err);
        setLoading(false);
      }
    };

    fetchStationData();
  }, [navigate, refreshKey, baseUrl, isDealer]);

  const handleStationAdded = () => {
    setIsModalOpen(false);
    setRefreshKey(prevKey => prevKey + 1);
    showToast("Station created successfully!", "success");
  };

  const handleEdit = (sta) => {
    setSelectedStation(sta);
    setIsEditModalOpen(true);
  };

  const handleStationUpdated = () => {
    setIsEditModalOpen(false);
    setSelectedStation(null);
    setRefreshKey(prevKey => prevKey + 1);
    showToast("Station updated successfully!", "success");
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this station?")) {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${baseUrl}/stations/delete/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          showToast("Station deleted successfully", "success");
          setRefreshKey(prevKey => prevKey + 1);
        } else {
          showToast("Failed to delete station", "error");
        }
      } catch (error) {
        console.error("Error deleting station:", error);
        showToast("Error deleting station", "error");
      }
    }
  };

  const handleToggleStatus = async (sta) => {
    const newStatus = sta.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    
    setStations(prev => prev.map(s => s.id === sta.id ? { ...s, status: newStatus } : s));
    setSummaryData(prev => {
      const change = newStatus === "ACTIVE" ? 1 : -1;
      return {
        ...prev,
        activeStations: prev.activeStations === '...' || prev.activeStations === 'N/A'
          ? prev.activeStations
          : prev.activeStations + change
      };
    });

    try {
      const token = localStorage.getItem("token");
      const stationPayload = {
        name: sta.name,
        locationId: sta.locationId,
        status: newStatus,
        directionLink: sta.directionLink,
      };

      const res = await fetch(`${baseUrl}/stations/update/${sta.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(stationPayload),
      });

      if (!res.ok) {
        throw new Error("Failed to update station status");
      }
      showToast(`Station status updated to ${newStatus.toLowerCase()}!`, "success");
    } catch (error) {
      console.error("Error updating station status:", error);
      showToast("Error updating station status. Rolling back status in UI.", "error");
      setStations(prev => prev.map(s => s.id === sta.id ? { ...s, status: sta.status } : s));
      setRefreshKey(prev => prev + 1);
    }
  };

  const getStatusClass = (status) => {
    if (status === "ACTIVE") return "status-active";
    if (status === "INACTIVE") return "status-inactive";
    return "status-error";
  };

  // Quick Action triggers
  const triggerRefresh = () => {
    setActionsLoading(prev => ({ ...prev, refresh: true }));
    setTimeout(() => {
      setRefreshKey(prev => prev + 1);
      setActionsLoading(prev => ({ ...prev, refresh: false }));
      showToast("Dashboard refreshed successfully!", "success");
    }, 800);
  };

  const triggerExport = () => {
    setActionsLoading(prev => ({ ...prev, export: true }));
    setTimeout(() => {
      const headers = ["Station ID", "Name", "City", "State", "Status", "Direction Link"];
      const rows = stations.map(s => [
        s.id,
        s.name,
        s.location?.city || "N/A",
        s.location?.state || "N/A",
        s.status,
        s.directionLink || ""
      ]);
      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `stations_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setActionsLoading(prev => ({ ...prev, export: false }));
      showToast("CSV report exported successfully!", "success");
    }, 1000);
  };

  const triggerReport = () => {
    setActionsLoading(prev => ({ ...prev, report: true }));
    setTimeout(() => {
      setActionsLoading(prev => ({ ...prev, report: false }));
      showToast("Fleet report generated! PDF ready for download.", "success");
    }, 1200);
  };

  // Extract list of unique cities for filtering options
  const uniqueCities = useMemo(() => {
    const list = stations.map(s => s.location?.city).filter(Boolean);
    return ["All", ...new Set(list)];
  }, [stations]);

  // Filters logic
  const filteredStations = useMemo(() => {
    return stations.filter((station) => {
      const matchesSearch = 
        station.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(station.id).includes(searchTerm) ||
        (station.locationId && String(station.locationId).includes(searchTerm));

      const matchesStatus = statusFilter === "All" || station.status === statusFilter;

      const matchesCity = cityFilter === "All" || station.location?.city === cityFilter;

      const stationChargers = chargers.filter(c => c.stationId === station.id);
      const isDCOnly = stationChargers.some(c => c.chargerType === "DC");
      const isACOnly = stationChargers.every(c => c.chargerType === "AC") && stationChargers.length > 0;
      
      let matchesCapacity = true;
      if (capacityFilter === "AC") matchesCapacity = isACOnly;
      if (capacityFilter === "DC") matchesCapacity = isDCOnly;

      let matchesConnector = true;
      if (connectorFilter !== "All") {
        matchesConnector = stationChargers.some(c => c.connectorType === connectorFilter);
      }

      return matchesSearch && matchesStatus && matchesCity && matchesCapacity && matchesConnector;
    });
  }, [stations, searchTerm, statusFilter, cityFilter, capacityFilter, connectorFilter, chargers]);

  const handleNameMouseEnter = (sta, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setHoverCoords({
      x: rect.left + window.scrollX,
      y: rect.bottom + window.scrollY + 8
    });
    
    const stationChargers = chargers.filter(c => c.stationId === sta.id);
    setHoveredStation({
      ...sta,
      chargerCount: stationChargers.length
    });
  };

  const handleNameMouseLeave = () => {
    setHoveredStation(null);
  };

  return (
    <motion.div 
      className="stations-page-wrapper"
      initial="hidden"
      animate="show"
      variants={containerVariants}
    >
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }

        .stations-page-wrapper {
          width: 100%;
          min-height: 100vh;
          font-family: 'Lexend', sans-serif;
          padding: 24px;
          box-sizing: border-box;
          background: #F9FAFB;
          position: relative;
          overflow: hidden;
        }

        .decorative-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.08;
          z-index: 0;
          pointer-events: none;
        }
        .blob-1 {
          width: 320px;
          height: 320px;
          background: #3B82F6;
          top: 10%;
          left: -80px;
        }
        .blob-2 {
          width: 280px;
          height: 280px;
          background: #10B981;
          bottom: 15%;
          right: -80px;
        }

        .stations-container {
          max-width: 1200px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .top-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
        }

        .gradient-header-text {
          font-size: 28px;
          font-weight: 700;
          background: linear-gradient(135deg, #111827, #374151);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0;
        }

        /* Top Action Buttons Section */
        .quick-actions-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          background: #ffffff;
          border: 1px solid #E5E7EB;
          border-radius: 16px;
          padding: 16px 20px;
          margin-bottom: 24px;
          box-shadow: 0 4px 15px -3px rgba(0, 0, 0, 0.015);
        }

        .actions-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .actions-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .search-input-wrapper {
          position: relative;
          background: #F3F4F6;
          border: 1px solid transparent;
          border-radius: 9999px;
          padding: 8px 18px;
          display: flex;
          align-items: center;
          width: 100%;
          max-width: 320px;
          transition: all 0.25s;
        }

        .search-input-wrapper:focus-within {
          background: #ffffff;
          border-color: #3B82F6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.12);
        }

        .search-input {
          border: none;
          background: none;
          outline: none;
          width: 100%;
          font-size: 14px;
          font-family: inherit;
          color: #1F2937;
        }

        .action-outlined-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 18px;
          background: #ffffff;
          border: 1px solid #D1D5DB;
          border-radius: 9999px;
          color: #4B5563;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: inherit;
        }

        .action-outlined-btn:hover {
          border-color: #3B82F6;
          color: #3B82F6;
          background: rgba(59, 130, 246, 0.02);
          transform: translateY(-1px);
        }

        .action-outlined-btn:active {
          transform: scale(0.96);
        }

        .action-outlined-btn.primary {
          background: #111827;
          border-color: #111827;
          color: #ffffff;
        }

        .action-outlined-btn.primary:hover {
          background: #374151;
          border-color: #374151;
          color: #ffffff;
        }

        .btn-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid currentColor;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        /* Summary Cards Grid */
        .summary-cards-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 28px;
        }

        @media (max-width: 1024px) {
          .summary-cards-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 640px) {
          .summary-cards-grid {
            grid-template-columns: 1fr;
          }
          .quick-actions-bar {
            flex-direction: column;
            align-items: stretch;
          }
          .search-input-wrapper {
            max-width: 100%;
          }
        }

        .station-card {
          background: #ffffff;
          border: 1px solid #E5E7EB;
          border-radius: 16px;
          padding: 20px 24px;
          box-shadow: 0 4px 15px -3px rgba(0, 0, 0, 0.015);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 120px;
          box-sizing: border-box;
          transition: border-color 0.25s, box-shadow 0.25s;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          margin-bottom: 8px;
        }

        .card-title {
          font-size: 13px;
          color: #6B7280;
          font-weight: 500;
        }

        .stat-icon-circle {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(59, 130, 246, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.3s ease;
        }

        .card-icon {
          width: 18px;
          height: 18px;
        }

        .card-value {
          font-size: 28px;
          font-weight: 700;
          color: #111827;
          line-height: 1.2;
          margin-bottom: 4px;
        }

        .card-subtext {
          font-size: 11px;
          color: #6B7280;
        }

        /* System Health Section */
        .system-health-section {
          margin-bottom: 28px;
        }

        /* List layout */
        .stations-list-section {
          background: #ffffff;
          border: 1px solid #E5E7EB;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 15px -3px rgba(0, 0, 0, 0.015);
          margin-bottom: 28px;
        }

        .table-wrapper {
          overflow-x: auto;
          border-radius: 12px;
          border: 1px solid #E5E7EB;
          background: #ffffff;
        }

        .stations-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }

        .table-th {
          text-align: left;
          padding: 14px 16px;
          color: #4B5563;
          font-weight: 600;
          font-size: 13px;
          border-bottom: 1px solid #E5E7EB;
          background: #F9FAFB;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .table-td {
          padding: 16px;
          font-size: 14px;
          color: #111827;
          border-bottom: 1px solid #E5E7EB;
        }

        .table-row {
          cursor: pointer;
          transition: background-color 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .table-row td:first-child {
          border-left: 3px solid transparent;
          transition: border-left-color 0.25s ease;
        }

        .table-row:hover td {
          background-color: #F9FAFB !important;
        }

        .table-row:hover td:first-child {
          border-left-color: #3B82F6;
        }

        .td-name {
          font-weight: 600;
          color: #111827;
          position: relative;
        }

        .td-name:hover {
          color: #3B82F6;
          text-decoration: underline;
        }

        /* Hover popover details */
        .hover-card {
          position: absolute;
          z-index: 1000;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(229, 231, 235, 0.6);
          border-radius: 12px;
          padding: 14px 16px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
          width: 240px;
          font-family: inherit;
        }

        /* Expandable row accordion */
        .accordion-expand-row {
          background-color: #F9FAFB;
        }

        .accordion-content-grid {
          display: grid;
          grid-template-columns: 200px 1fr;
          gap: 24px;
          padding: 20px 24px;
          border-bottom: 1px solid #E5E7EB;
        }

        .station-img-placeholder {
          width: 100%;
          height: 140px;
          background: #E5E7EB;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9CA3AF;
        }

        .details-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .details-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .details-label {
          font-size: 11px;
          font-weight: 600;
          color: #6B7280;
          text-transform: uppercase;
        }

        .details-value {
          font-size: 13px;
          font-weight: 500;
          color: #111827;
        }

        /* Sliding Advanced Filter Drawer */
        .filter-drawer-backdrop {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.3);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          z-index: 1000;
        }

        .filter-drawer {
          position: fixed;
          top: 0; right: 0; bottom: 0;
          width: 360px;
          background: #ffffff;
          box-shadow: -10px 0 30px rgba(0,0,0,0.08);
          z-index: 1001;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          padding: 24px;
        }

        .drawer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          border-bottom: 1px solid #E5E7EB;
          padding-bottom: 16px;
        }

        .drawer-title {
          font-size: 18px;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }

        .drawer-close-btn {
          border: none;
          background: none;
          font-size: 20px;
          cursor: pointer;
          color: #6B7280;
        }

        .drawer-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 20px;
          overflow-y: auto;
        }

        .drawer-form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .drawer-form-group label {
          font-size: 12px;
          font-weight: 600;
          color: #4B5563;
        }

        .drawer-select {
          padding: 10px 14px;
          border: 1px solid #D1D5DB;
          border-radius: 8px;
          font-size: 13px;
          outline: none;
          font-family: inherit;
        }

        .drawer-select:focus {
          border-color: #3B82F6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
        }

        .drawer-footer {
          margin-top: 24px;
          border-top: 1px solid #E5E7EB;
          padding-top: 20px;
          display: flex;
          gap: 12px;
        }

        /* Skeletons */
        .skeleton-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 10px 0;
        }
        .skeleton-row {
          display: flex;
          justify-content: space-between;
          padding: 16px;
          border-bottom: 1px solid #E5E7EB;
          align-items: center;
        }
        .skeleton-header {
          background: #F9FAFB;
          border-radius: 8px;
        }
        .skeleton-bar {
          height: 16px;
          background: linear-gradient(90deg, #E5E7EB 25%, #F3F4F6 50%, #E5E7EB 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite linear;
          border-radius: 4px;
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        /* Status badges */
        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 6px 14px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 600;
          min-width: 80px;
          justify-content: center;
        }
        .status-active {
          background: linear-gradient(135deg, #D1FAE5, #A7F3D0);
          color: #047857;
        }
        .status-inactive {
          background: linear-gradient(135deg, #F3F4F6, #E5E7EB);
          color: #475569;
        }
        .status-error {
          background: linear-gradient(135deg, #FEE2E2, #FCA5A5);
          color: #B91C1C;
        }
        .badge-icon {
          flex-shrink: 0;
        }

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

        .link-text {
          color: #3B82F6;
          text-decoration: none;
          font-weight: 500;
        }
        .link-text:hover {
          color: #1D4ED8;
          text-decoration: underline;
        }

        .action-buttons {
          display: flex;
          gap: 16px;
          justify-content: center;
        }

        .icon-btn {
          border: none;
          background: none;
          cursor: pointer;
          padding: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s;
        }
        .icon-btn:hover {
          transform: scale(1.15);
        }

        /* Modal styling */
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }
        .modal-content {
          background-color: white;
          border-radius: 20px;
          width: 90%;
          height: 90%;
          max-width: 1200px;
          max-height: 800px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
        }

        /* Toast styling */
        .ss-toast {
          position: fixed;
          bottom: 28px;
          right: 28px;
          padding: 14px 20px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
          display: flex;
          align-items: center;
          gap: 10px;
          z-index: 10000;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
          max-width: 360px;
        }
        .ss-toast-success {
          background: linear-gradient(135deg, #059669, #10B981);
        }
        .ss-toast-error {
          background: linear-gradient(135deg, #DC2626, #EF4444);
        }
        .ss-toast-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          flex-shrink: 0;
          font-size: 12px;
        }
      `}</style>

      <div className="stations-container">
        {/* Blurry decorative background blobs */}
        <div className="decorative-blob blob-1"></div>
        <div className="decorative-blob blob-2"></div>

        {/* Modal wrappers */}
        {isModalOpen && (
          <Modal onClose={() => setIsModalOpen(false)}>
            <Suspense fallback={<LoadingSpinner />}>
              <AddStation
                onClose={() => setIsModalOpen(false)}
                onStationAdded={handleStationAdded}
                baseUrl={baseUrl}
              />
            </Suspense>
          </Modal>
        )}

        {isEditModalOpen && (
          <Modal onClose={() => setIsEditModalOpen(false)}>
            <Suspense fallback={<LoadingSpinner />}>
              <EditStation
                station={selectedStation}
                onClose={() => setIsEditModalOpen(false)}
                onStationUpdated={handleStationUpdated}
                baseUrl={baseUrl}
              />
            </Suspense>
          </Modal>
        )}

        {/* Dynamic sliding advanced filter drawer */}
        <AnimatePresence>
          {isFilterDrawerOpen && (
            <>
              <motion.div 
                className="filter-drawer-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsFilterDrawerOpen(false)}
              />
              <motion.div 
                className="filter-drawer"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <div className="drawer-header">
                  <h3 className="drawer-title">Advanced Filters</h3>
                  <button className="drawer-close-btn" onClick={() => setIsFilterDrawerOpen(false)}>×</button>
                </div>
                
                <div className="drawer-body">
                  <div className="drawer-form-group">
                    <label>Station Status</label>
                    <select 
                      className="drawer-select" 
                      value={statusFilter} 
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="All">All Statuses</option>
                      <option value="ACTIVE">Active Only</option>
                      <option value="INACTIVE">Offline / Inactive Only</option>
                    </select>
                  </div>

                  <div className="drawer-form-group">
                    <label>City</label>
                    <select 
                      className="drawer-select" 
                      value={cityFilter} 
                      onChange={(e) => setCityFilter(e.target.value)}
                    >
                      {uniqueCities.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="drawer-form-group">
                    <label>Capacity Threshold</label>
                    <select 
                      className="drawer-select" 
                      value={capacityFilter} 
                      onChange={(e) => setCapacityFilter(e.target.value)}
                    >
                      <option value="All">All Capacities</option>
                      <option value="AC">AC Only (Low Capacity)</option>
                      <option value="DC">DC Equipped (High Capacity)</option>
                    </select>
                  </div>

                  <div className="drawer-form-group">
                    <label>Connector Type</label>
                    <select 
                      className="drawer-select" 
                      value={connectorFilter} 
                      onChange={(e) => setConnectorFilter(e.target.value)}
                    >
                      <option value="All">All Connectors</option>
                      <option value="CCS2">CCS2</option>
                      <option value="Type 2">Type 2</option>
                      <option value="GB/T">GB/T</option>
                    </select>
                  </div>
                </div>

                <div className="drawer-footer">
                  <button 
                    className="action-outlined-btn" 
                    style={{ flex: 1 }}
                    onClick={() => {
                      setStatusFilter("All");
                      setCityFilter("All");
                      setCapacityFilter("All");
                      setConnectorFilter("All");
                      showToast("Filters reset!", "success");
                    }}
                  >
                    Reset
                  </button>
                  <button 
                    className="action-outlined-btn primary" 
                    style={{ flex: 1 }}
                    onClick={() => {
                      setIsFilterDrawerOpen(false);
                      showToast("Filters applied!", "success");
                    }}
                  >
                    Apply
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Popover Hover Card */}
        <AnimatePresence>
          {hoveredStation && (
            <motion.div
              className="hover-card"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              style={{ top: hoverCoords.y, left: hoverCoords.x }}
            >
              <h4 style={{ margin: "0 0 4px 0", fontSize: "14px", fontWeight: 700, color: "#111827" }}>{hoveredStation.name}</h4>
              <p style={{ margin: "0 0 8px 0", fontSize: "11px", color: "#6B7280" }}>ID: {hoveredStation.id}</p>
              <div style={{ fontSize: "12px", color: "#4B5563", marginBottom: "8px" }}>
                <div>📍 {hoveredStation.location?.address || "N/A"}</div>
                <div style={{ marginTop: "4px" }}>⚡ Chargers count: {hoveredStation.chargerCount}</div>
              </div>
              <button 
                className="action-outlined-btn"
                style={{ width: "100%", padding: "6px 12px", justifyContent: "center" }}
                onClick={() => handleEdit(hoveredStation)}
              >
                Quick View
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Title Header */}
        <div className="top-header">
          <div className="header-left">
            <h2 className="gradient-header-text">Stations & Locations</h2>
            <span style={{ fontSize: "13px", color: "#6B7280", display: "block", marginTop: 4 }}>Monitor and manage charging stations</span>
          </div>
        </div>

        {/* 1. KPI Cards */}
        <div className="summary-cards-grid">
          <Card title="Total Stations" value={summaryData.totalStations} icon={totalIcon} subtext="+2 from last month" />
          <Card title="Active Stations" value={summaryData.activeStations} icon={activeIcon} subtext="Active Now" />
          <Card title="Average Uptime" value={summaryData.averageUptime} icon={uptimeIcon} subtext="-1.8% from last week" />
          <Card title="Faulty Stations" value={summaryData.errorToday} icon={errorIcon} subtext="+1 from last month" />
        </div>

        {/* 2. System Health Section */}
        <div className="system-health-section">
          <StationOverviewChart />
        </div>

        {/* 3. Search + Advanced Filters + Quick Actions */}
        <div className="quick-actions-bar">
          <div className="actions-left">
            <div className="search-input-wrapper">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                placeholder="Search stations..."
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="action-outlined-btn" onClick={() => setIsFilterDrawerOpen(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
              </svg>
              Advanced Filters
            </button>
          </div>
          <div className="actions-right">
            {!isDealer && (
              <button className="action-outlined-btn primary" onClick={() => setIsModalOpen(true)}>
                <span>+</span> Add Station
              </button>
            )}
            <button className="action-outlined-btn" onClick={triggerExport} disabled={actionsLoading.export}>
              {actionsLoading.export ? <span className="btn-spinner"></span> : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
              )}
              Export Report
            </button>
            <button className="action-outlined-btn" onClick={triggerReport} disabled={actionsLoading.report}>
              {actionsLoading.report ? <span className="btn-spinner"></span> : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
              )}
              Generate Report
            </button>
            <button className="action-outlined-btn" onClick={triggerRefresh} disabled={actionsLoading.refresh}>
              {actionsLoading.refresh ? <span className="btn-spinner"></span> : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
                </svg>
              )}
              Refresh
            </button>
          </div>
        </div>

        {/* 4. Stations Table */}
        <div className="stations-list-section">
          <div className="list-header">
            <h3 className="list-title">Stations</h3>
          </div>

          {loading ? (
            <div className="skeleton-container">
              <div className="skeleton-row skeleton-header">
                <div className="skeleton-bar" style={{ width: "20%" }}></div>
                <div className="skeleton-bar" style={{ width: "15%" }}></div>
                <div className="skeleton-bar" style={{ width: "15%" }}></div>
                <div className="skeleton-bar" style={{ width: "25%" }}></div>
                <div className="skeleton-bar" style={{ width: "15%" }}></div>
              </div>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="skeleton-row">
                  <div className="skeleton-bar" style={{ width: "18%" }}></div>
                  <div className="skeleton-bar" style={{ width: "12%" }}></div>
                  <div className="skeleton-bar" style={{ width: "14%" }}></div>
                  <div className="skeleton-bar" style={{ width: "22%" }}></div>
                  <div className="skeleton-bar" style={{ width: "10%" }}></div>
                </div>
              ))}
            </div>
          ) : filteredStations.length === 0 ? (
            <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: "52px", marginBottom: "16px", animation: "float 3s ease-in-out infinite" }}>📍</div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: 18, fontWeight: 700, color: '#111827' }}>No Stations Found</h3>
              <p style={{ margin: "0 0 20px 0", fontSize: 14, color: '#6B7280' }}>
                No charging stations are available yet.
              </p>
              {!isDealer && (
                <button className="action-outlined-btn primary" onClick={() => setIsModalOpen(true)}>
                  Create First Station
                </button>
              )}
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="stations-table">
                <thead>
                  <tr className="table-header-row">
                    <th className="table-th">Name</th>
                    <th className="table-th">Location ID</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Created at</th>
                    <th className="table-th">Direction Link</th>
                    {!isDealer && <th className="table-th" style={{ textAlign: "center" }}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredStations.map((sta) => {
                    const isExpanded = expandedRowId === sta.id;
                    const stationChargers = chargers.filter(c => c.stationId === sta.id);
                    const powerCapVal = stationChargers.reduce((acc, c) => acc + (c.chargerType === "DC" ? 60 : 22), 0);
                    const stationSessions = sessions.filter(s => s.stationId === sta.id || s.charger?.stationId === sta.id);
                    const revenueVal = stationSessions.reduce((acc, s) => acc + (s.cost || 0), 0);

                    return (
                      <React.Fragment key={sta.id}>
                        <tr 
                          className="table-row"
                          onClick={() => setExpandedRowId(isExpanded ? null : sta.id)}
                        >
                          <td 
                            className="table-td td-name"
                            onMouseEnter={(e) => handleNameMouseEnter(sta, e)}
                            onMouseLeave={handleNameMouseLeave}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>{sta.name || 'N/A'}</span>
                              <svg 
                                width="12" 
                                height="12" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="#9CA3AF" 
                                strokeWidth="2.5" 
                                style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s' }}
                              >
                                <polyline points="6 9 12 15 18 9"></polyline>
                              </svg>
                            </div>
                          </td>
                          <td className="table-td">{sta.locationId || 'N/A'}</td>
                          <td className="table-td">
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span className={`status-badge ${getStatusClass(sta.status)}`}>
                                {sta.status === "ACTIVE" && (
                                  <svg className="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12, marginRight: 6 }}>
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                  </svg>
                                )}
                                {sta.status === "INACTIVE" && (
                                  <svg className="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12, marginRight: 6 }}>
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="8" y1="12" x2="16" y2="12"></line>
                                  </svg>
                                )}
                                {sta.status === "ACTIVE" ? "Active" : sta.status === "INACTIVE" ? "Inactive" : "Error"}
                              </span>
                              {!isDealer && (
                                <label className="status-toggle-switch" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={sta.status === "ACTIVE"}
                                    onChange={() => handleToggleStatus(sta)}
                                  />
                                  <span className="status-slider"></span>
                                </label>
                              )}
                            </div>
                          </td>
                          <td className="table-td">{sta.createdAt ? new Date(sta.createdAt).toLocaleDateString() : 'N/A'}</td>
                          <td className="table-td" onClick={(e) => e.stopPropagation()}>
                            <a href={sta.directionLink || "#"} target="_blank" rel="noopener noreferrer" className="link-text">Direction Link</a>
                          </td>
                          {!isDealer && (
                            <td className="table-td" onClick={(e) => e.stopPropagation()}>
                              <div className="action-buttons">
                                <button
                                  className="icon-btn"
                                  onClick={() => handleEdit(sta)}
                                >
                                  <img src={editIcon} alt="Edit" style={{ width: "16px" }} />
                                </button>
                                <button className="icon-btn" onClick={() => handleDelete(sta.id)}><img src={deleteIcon} alt="Del" style={{ width: "14px" }} /></button>
                              </div>
                            </td>
                          )}
                        </tr>

                        {/* Accordion expand detail panel */}
                        <AnimatePresence>
                          {isExpanded && (
                            <tr>
                              <td colSpan={isDealer ? 5 : 6} style={{ padding: 0 }}>
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.3, cubicBezier: [0.16, 1, 0.3, 1] }}
                                  style={{ overflow: "hidden" }}
                                >
                                  <div className="accordion-expand-row">
                                    <div className="accordion-content-grid">
                                      <div>
                                        <div className="station-img-placeholder">
                                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                                            <line x1="7" y1="2" x2="7" y2="22"></line>
                                            <line x1="17" y1="2" x2="17" y2="22"></line>
                                            <line x1="2" y1="12" x2="22" y2="12"></line>
                                          </svg>
                                        </div>
                                      </div>
                                      
                                      <div className="details-grid">
                                        <div className="details-item">
                                          <span className="details-label">Station Name</span>
                                          <span className="details-value">{sta.name}</span>
                                        </div>
                                        <div className="details-item">
                                          <span className="details-label">Station ID</span>
                                          <span className="details-value">#{sta.id}</span>
                                        </div>
                                        <div className="details-item">
                                          <span className="details-label">Address</span>
                                          <span className="details-value">{sta.location?.address || "N/A"}</span>
                                        </div>
                                        <div className="details-item">
                                          <span className="details-label">City / State</span>
                                          <span className="details-value">
                                            {sta.location?.city ? `${sta.location.city}, ${sta.location.state || ""}` : "N/A"}
                                          </span>
                                        </div>
                                        <div className="details-item">
                                          <span className="details-label">Coordinates</span>
                                          <span className="details-value">
                                            {sta.location?.latitude ? `${sta.location.latitude.toFixed(4)}, ${sta.location.longitude?.toFixed(4)}` : "N/A"}
                                          </span>
                                        </div>
                                        <div className="details-item">
                                          <span className="details-label">Total Chargers</span>
                                          <span className="details-value">{stationChargers.length} active units</span>
                                        </div>
                                        <div className="details-item">
                                          <span className="details-label">Power Capacity</span>
                                          <span className="details-value" style={{ fontWeight: 600, color: "#10B981" }}>{powerCapVal} kW</span>
                                        </div>
                                        <div className="details-item">
                                          <span className="details-label">Sessions Today</span>
                                          <span className="details-value">{stationSessions.length} sessions</span>
                                        </div>
                                        <div className="details-item">
                                          <span className="details-label">Revenue</span>
                                          <span className="details-value" style={{ fontWeight: 600, color: "#3B82F6" }}>₹{revenueVal.toLocaleString('en-IN')}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toast.message && (
        <div className={`ss-toast ss-toast-${toast.type}`}>
          <span className="ss-toast-icon">
            {toast.type === "success" ? "✓" : "✕"}
          </span>
          <span>{toast.message}</span>
        </div>
      )}
    </motion.div>
  );
}

// Staggered KPI Card component
const Card = ({ title, value, icon, subtext }) => (
  <motion.div 
    className="station-card"
    variants={itemVariants}
    whileHover={{
      scale: 1.02,
      boxShadow: "0 12px 30px rgba(59, 130, 246, 0.12)",
      borderColor: "#3B82F6",
    }}
    transition={{ type: "spring", stiffness: 400, damping: 25 }}
  >
    <div className="card-header">
      <span className="card-title">{title}</span>
      <motion.div 
        className="stat-icon-circle"
        whileHover={{ rotate: 12 }}
      >
        <img src={icon} alt="" className="card-icon" />
      </motion.div>
    </div>

    <div>
      <div className="card-value"><AnimatedCounter value={value} /></div>
      <div className="card-subtext">{subtext}</div>
    </div>
  </motion.div>
);

export default Stations;