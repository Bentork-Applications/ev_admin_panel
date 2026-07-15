import React, { useState, useEffect, Suspense, lazy, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";

import plusIcon from "../../assets/icons/stafficon/plus.svg";
import VectorIcon from "../../assets/icons/stafficon/Vector-3.svg";
import editIcon from "../../assets/icons/stationicon/edit.svg";
import deleteIcon from "../../assets/icons/stationicon/delete.svg";
import sortIcon from "../../assets/icons/stationicon/upndown.svg";
import DeleteConfirmationModal from "../../components/admin/DeleteConfirmationModal";

const AddCharger = lazy(() => import('./form/AddCharger'));

// Count up utility
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

const Model = ({ children, onClose }) => (
  <div className="modal-overlay">
    <div className="modal-content">
      {children}
    </div>
  </div>
);

// Mappers for charger status: Available (Online), Charging (Busy), Reserved (Busy/Reserved), Faulted (Faulted), Offline (Offline)
const getChargerStatus = (charger) => {
  if (!charger) return "";
  const s = String(charger.status || "").toUpperCase().trim();
  const isOccupied = charger.occupied === true || charger.occupied === "true" || charger.occupied === 1 || charger.occupied === "1" ||
    charger.isOccupied === true || charger.isOccupied === "true" || charger.isOccupied === 1 || charger.isOccupied === "1";

  if ((s === "BUSY" || s === "CHARGING") && !isOccupied) {
    return "Online";
  }

  if (s === "AVAILABLE" || s === "ONLINE") return "Online";
  if (s === "OFFLINE") return "Offline";
  if (s === "BUSY" || s === "CHARGING") return "Busy";
  if (s === "FAULTED") return "Faulted";
  return s ? (s.charAt(0) + s.slice(1).toLowerCase()) : "";
};

const getStatusBadgeClass = (status) => {
  const s = String(status || "").toLowerCase().trim();
  if (s === "online" || s === "available") return "status-active";
  if (s === "busy" || s === "charging" || s === "completed") return "status-completed";
  if (s === "faulted") return "status-error";
  return "status-inactive";
};

// Mocks helper for charging analytics metrics
const generateAnalyticsData = (filter) => {
  const data = [];
  const now = new Date();

  if (filter === "Today") {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 60 * 60 * 1000);
      data.push({
        label: `${d.getHours()}:00`,
        sessions: Math.round(4 + Math.random() * 12),
        energy: Math.round(60 + Math.random() * 150),
        revenue: Math.round(120 + Math.random() * 400),
        duration: Math.round(25 + Math.random() * 35),
      });
    }
  } else if (filter === "Week") {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      data.push({
        label: d.toLocaleDateString([], { weekday: 'short' }),
        sessions: Math.round(25 + Math.random() * 45),
        energy: Math.round(400 + Math.random() * 900),
        revenue: Math.round(1500 + Math.random() * 3500),
        duration: Math.round(30 + Math.random() * 18),
      });
    }
  } else if (filter === "Month") {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      data.push({
        label: d.toLocaleDateString([], { month: 'short', day: 'numeric' }),
        sessions: Math.round(120 + Math.random() * 200),
        energy: Math.round(2500 + Math.random() * 5000),
        revenue: Math.round(10000 + Math.random() * 20000),
        duration: Math.round(32 + Math.random() * 10),
      });
    }
  } else {
    // Year
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      data.push({
        label: d.toLocaleDateString([], { month: 'short' }),
        sessions: Math.round(1500 + Math.random() * 1500),
        energy: Math.round(30000 + Math.random() * 40000),
        revenue: Math.round(120000 + Math.random() * 180000),
        duration: Math.round(35 + Math.random() * 12),
      });
    }
  }
  return data;
};

// Framer motion variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
};

function Charger({ baseUrl, userRole }) {
  const navigate = useNavigate();
  const isDealer = userRole === "DEALER";

  const [chargerData, setChargerData] = useState({
    totalData: "",
    availableData: "",
    acChargerData: "",
    dcChargerData: ""
  });
  const [chargerRecoards, setChargerRecoards] = useState([]);
  const [isModelOpen, setIsModelOpen] = useState(false);
  const [editingCharger, setEditingCharger] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Basic Search term
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'asc' });

  // Advanced Filter Drawer State
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [stationFilter, setStationFilter] = useState("All");
  const [connectorFilter, setConnectorFilter] = useState("All");
  const [chargerTypeFilter, setChargerTypeFilter] = useState("All");
  const [revenueFilter, setRevenueFilter] = useState("All"); // e.g. High vs Low rate

  // Table Page state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Column visibility settings
  const [isColumnPopoverOpen, setIsColumnPopoverOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    stationId: true,
    ocppId: true,
    connectorType: true,
    chargerType: true,
    chargeMode: true,
    rate: true,
    pst: true,
    status: true,
    action: true
  });

  // Charging Analytics Active states
  const [analyticsFilter, setAnalyticsFilter] = useState("Week");
  const [activeMetric, setActiveMetric] = useState("sessions"); // sessions, energy, revenue, duration

  // OCPP ID Hover popover
  const [hoveredCharger, setHoveredCharger] = useState(null);
  const [hoverCoords, setHoverCoords] = useState({ x: 0, y: 0 });

  // Toast notifications state
  const [toast, setToast] = useState({ message: "", type: "" });
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "" }), 4000);
  };

  // Spinner states for actions
  const [actionsLoading, setActionsLoading] = useState({
    refresh: false,
  });

  // Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingCharger, setDeletingCharger] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    try {
      const listEndpoint = isDealer ? '/dealer/chargers' : '/chargers/all';
      const res = await fetch(`${baseUrl}${listEndpoint}`, { headers });
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data = await res.json();
      let list = Array.isArray(data) ? data : [];

      try {
        const debugRes = await fetch(`${baseUrl}/debug/status`, { headers });
        if (debugRes.ok) {
          const debugData = await debugRes.json();
          if (debugData && Array.isArray(debugData.chargers)) {
            list = list.map(c => {
              const live = debugData.chargers.find(dc => dc.id === c.id || dc.ocppId === c.ocppId);
              if (live) {
                return {
                  ...c,
                  availability: live.available,
                  isAvailability: live.available,
                  occupied: live.occupied,
                  isOccupied: live.occupied,
                  wsConnected: live.wsConnected,
                  wsStatus: live.wsStatus
                };
              }
              return c;
            });
          }
        }
      } catch (debugErr) {
        console.warn("Failed to fetch live debug status:", debugErr);
      }

      setChargerRecoards(list);

      const total = list.length;
      const available = list.filter(c => {
        const s = String(c.status || "").toLowerCase().trim();
        return s === "available" || s === "online" || s === "active";
      }).length;
      const acCount = list.filter(c => c.chargerType === 'AC').length;
      const dcCount = list.filter(c => c.chargerType === 'DC').length;

      setChargerData({
        totalData: total,
        availableData: available,
        acChargerData: acCount,
        dcChargerData: dcCount,
      });
    } catch (error) {
      console.error('Failed to fetch charger data', error);
      if (!isSilent) {
        setChargerData({
          totalData: 'Error',
          availableData: 'Error',
          acChargerData: 'Error',
          dcChargerData: 'Error',
        });
      }
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [baseUrl, navigate, isDealer]);

  useEffect(() => {
    fetchData(false);
  }, [fetchData, refreshKey]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleChargerAdded = () => {
    setIsModelOpen(false);
    setRefreshKey(prevKey => prevKey + 1);
    showToast("Charger registered successfully!", "success");
  }

  const openDeleteModal = (charger) => {
    setDeletingCharger(charger);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCharger) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${baseUrl}/chargers/delete/${deletingCharger.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        setIsDeleteModalOpen(false);
        setRefreshKey(prevKey => prevKey + 1);
        showToast("Charger deleted successfully", "success");
      } else {
        const errorText = await res.text();
        showToast(errorText || "Failed to delete charger. Please try again.", "error");
      }
    } catch (error) {
      console.error("Error deleting charger:", error);
      showToast("Error deleting charger. Check your network connection.", "error");
    } finally {
      setIsDeleting(false);
      setDeletingCharger(null);
    }
  };

  const handleToggleAvailability = async (charger) => {
    const currentAvailability =
      charger.availability === true ||
      String(charger.availability).toLowerCase() === "true" ||
      charger.availability === 1 ||
      charger.availability === "1" ||
      charger.isAvailability === true ||
      String(charger.isAvailability).toLowerCase() === "true" ||
      charger.isAvailability === 1 ||
      charger.isAvailability === "1";

    const newAvailability = !currentAvailability;

    // Optimistic UI Update
    setChargerRecoards(prev =>
      prev.map(c => c.id === charger.id ? { ...c, availability: newAvailability } : c)
    );

    try {
      const token = localStorage.getItem("token");
      const payload = {
        stationId: charger.stationId,
        ocppId: charger.ocppId,
        connectorType: charger.connectorType,
        chargerType: charger.chargerType,
        chargeMode: charger.chargeMode,
        rate: charger.rate !== "" ? parseFloat(charger.rate) : 0,
        platformFeePerKwh: charger.platformFeePerKwh !== "" ? parseFloat(charger.platformFeePerKwh) : 0,
        pstPercent: charger.pstPercent !== undefined && charger.pstPercent !== null ? parseFloat(charger.pstPercent) : 0,
        isOccupied: charger.occupied === true || charger.occupied === "true" || charger.isOccupied === true || charger.isOccupied === "true",
        availability: newAvailability
      };

      const res = await fetch(`${baseUrl}/chargers/update/${charger.id}`, {
        method: "PUT",
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to update availability");
      showToast("Charger availability updated!", "success");
    } catch (error) {
      console.error("Error updating charger status:", error);
      showToast("Error updating charger. Rollback applied.", "error");
      setChargerRecoards(prev =>
        prev.map(c => c.id === charger.id ? { ...c, availability: !newAvailability } : c)
      );
      setRefreshKey(prev => prev + 1);
    }
  };

  const triggerRefresh = () => {
    setActionsLoading(prev => ({ ...prev, refresh: true }));
    showToast("Refreshing Charger Data...", "success");
    setTimeout(() => {
      setRefreshKey(prev => prev + 1);
      setActionsLoading(prev => ({ ...prev, refresh: false }));
      showToast("Updated Successfully", "success");
    }, 1000);
  };

  // Extract unique stations & connectors for filters options
  const uniqueStations = useMemo(() => {
    const list = chargerRecoards.map(c => c.stationId).filter(Boolean);
    return ["All", ...new Set(list)];
  }, [chargerRecoards]);

  const uniqueConnectors = useMemo(() => {
    const list = chargerRecoards.map(c => c.connectorType).filter(Boolean);
    return ["All", ...new Set(list)];
  }, [chargerRecoards]);

  // Aggregate Status Counts for Donut Chart & Status Summary Cards
  const statusCounts = useMemo(() => {
    let available = 0;
    let charging = 0;
    let reserved = 0;
    let faulted = 0;
    let offline = 0;

    chargerRecoards.forEach(c => {
      const s = String(c.status || "").toLowerCase().trim();
      if (s === "available" || s === "online" || s === "active") available++;
      else if (s === "charging" || s === "busy" || s === "preparing" || s === "finishing" || s === "completed") charging++;
      else if (s === "reserved") reserved++;
      else if (s === "faulted" || s === "error") faulted++;
      else offline++;
    });

    return { available, charging, reserved, faulted, offline };
  }, [chargerRecoards]);

  const pieData = useMemo(() => [
    { name: "Available", value: statusCounts.available || 0, color: "#10B981" },
    { name: "Charging", value: statusCounts.charging || 0, color: "#3B82F6" },
    { name: "Reserved", value: statusCounts.reserved || 0, color: "#F59E0B" },
    { name: "Faulted", value: statusCounts.faulted || 0, color: "#EF4444" },
    { name: "Offline", value: statusCounts.offline || 0, color: "#6B7280" },
  ], [statusCounts]);

  const analyticsData = useMemo(() => generateAnalyticsData(analyticsFilter), [analyticsFilter]);

  const cards = [
    { title: "Total Chargers", value: chargerData.totalData, value1: "+317 from last month", icon: VectorIcon },
    { title: "Available Chargers", value: chargerData.availableData, value1: "+224 from last month", icon: VectorIcon },
    { title: "AC Chargers", value: chargerData.acChargerData, value1: "+124 from last month", icon: VectorIcon },
    { title: "DC Chargers", value: chargerData.dcChargerData, value1: "+84 from last month", icon: VectorIcon },
  ];

  // Sorting & Filtering logic
  const filteredRecords = useMemo(() => {
    return chargerRecoards.filter(charger => {
      // 1. Search Bar Term
      const searchLow = searchTerm.toLowerCase().trim();
      const matchesSearch = !searchLow ? true : (
        (charger.ocppId && charger.ocppId.toString().toLowerCase().includes(searchLow)) ||
        (charger.stationId && charger.stationId.toString().toLowerCase().includes(searchLow)) ||
        (charger.chargerType && charger.chargerType.toLowerCase().includes(searchLow)) ||
        (charger.connectorType && charger.connectorType.toLowerCase().includes(searchLow)) ||
        String(charger.status || "").toLowerCase().includes(searchLow)
      );

      // 2. Status Drawer Filter
      let matchesStatus = true;
      if (statusFilter !== "All") {
        const s = String(charger.status || "").toLowerCase().trim();
        if (statusFilter === "Online") matchesStatus = s === "available" || s === "online" || s === "active";
        else if (statusFilter === "Charging") matchesStatus = s === "charging" || s === "busy" || s === "preparing" || s === "finishing" || s === "completed";
        else if (statusFilter === "Reserved") matchesStatus = s === "reserved";
        else if (statusFilter === "Faulted") matchesStatus = s === "faulted" || s === "error";
        else if (statusFilter === "Offline") matchesStatus = s === "offline" || s === "unavailable";
      }

      // 3. Station Drawer Filter
      const matchesStation = stationFilter === "All" || String(charger.stationId) === String(stationFilter);

      // 4. Connector Drawer Filter
      const matchesConnector = connectorFilter === "All" || charger.connectorType === connectorFilter;

      // 5. Charger Type Drawer Filter
      const matchesChargerType = chargerTypeFilter === "All" || charger.chargerType === chargerTypeFilter;

      // 6. Rate/Revenue Drawer Filter
      let matchesRevenue = true;
      if (revenueFilter === "High") matchesRevenue = (charger.rate || 0) >= 15;
      if (revenueFilter === "Low") matchesRevenue = (charger.rate || 0) < 15;

      return matchesSearch && matchesStatus && matchesStation && matchesConnector && matchesChargerType && matchesRevenue;
    });
  }, [chargerRecoards, searchTerm, statusFilter, stationFilter, connectorFilter, chargerTypeFilter, revenueFilter]);

  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      if (!sortConfig.key) return 0;
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredRecords, sortConfig]);

  // Paginated records
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedRecords.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedRecords, currentPage]);

  const totalPages = Math.ceil(sortedRecords.length / itemsPerPage);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Text search highlighter
  const highlightText = (text, highlight) => {
    if (!text) return "N/A";
    if (!highlight) return text;
    const parts = String(text).split(new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase()
            ? <mark key={i} style={{ backgroundColor: "#FDE047", padding: "1px 3px", borderRadius: "3px", color: "#000000" }}>{part}</mark>
            : part
        )}
      </span>
    );
  };

  const handleOcppMouseEnter = (charger, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setHoverCoords({
      x: rect.left + window.scrollX,
      y: rect.bottom + window.scrollY + 8
    });
    setHoveredCharger(charger);
  };

  const handleOcppMouseLeave = () => {
    setHoveredCharger(null);
  };

  return (
    <motion.div
      className="charger-page-wrapper"
      initial="hidden"
      animate="show"
      variants={containerVariants}
    >
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .charger-page-wrapper {
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
          filter: blur(80px);
          opacity: 0.08;
          z-index: 0;
          pointer-events: none;
        }
        .blob-1 {
          width: 320px;
          height: 320px;
          background: #3B82F6;
          top: 8%;
          left: -40px;
        }
        .blob-2 {
          width: 240px;
          height: 240px;
          background: #7C3AED;
          bottom: 15%;
          right: -40px;
        }

        .charger-container {
          max-width: 1200px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .page-header {
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

        .cards-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 28px;
        }

        @media (max-width: 1024px) {
          .cards-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 640px) {
          .cards-grid {
            grid-template-columns: 1fr;
          }
        }

        .stat-card {
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

        /* Donut Chart / Charger Status Section */
        .status-overview-section {
          background: #ffffff;
          border: 1px solid #E5E7EB;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 28px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          box-shadow: 0 4px 15px -3px rgba(0, 0, 0, 0.015);
        }

        @media (max-width: 768px) {
          .status-overview-section {
            grid-template-columns: 1fr;
          }
        }

        .status-cards-subgrid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          align-content: center;
        }

        .status-metric-card {
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .indicator-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .indicator-label {
          font-size: 12px;
          font-weight: 600;
          color: #4B5563;
        }

        .indicator-value {
          font-size: 18px;
          font-weight: 700;
          color: #111827;
          margin-top: 2px;
        }

        /* Analytics Section */
        .analytics-section {
          background: #ffffff;
          border: 1px solid #E5E7EB;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 28px;
          box-shadow: 0 4px 15px -3px rgba(0, 0, 0, 0.015);
        }

        .analytics-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 20px;
        }

        .tabs-btn-group {
          display: flex;
          background: #F3F4F6;
          border-radius: 9999px;
          padding: 4px;
        }

        .tab-btn {
          border: none;
          background: transparent;
          color: #4B5563;
          font-size: 12px;
          font-weight: 600;
          padding: 6px 14px;
          border-radius: 9999px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab-btn.active {
          background: #ffffff;
          color: #111827;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        /* Glassmorphic popover styling */
        .ocpp-popover {
          position: absolute;
          z-index: 1000;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(229, 231, 235, 0.6);
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
          width: 280px;
          font-family: inherit;
        }

        /* Sliding drawer styling */
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

        /* Action Search Bar container */
        .actions-bar-row {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(229, 231, 235, 0.6);
          border-radius: 16px;
          padding: 16px 20px;
          margin-bottom: 28px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
          display: flex;
          gap: 16px;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
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
          transition: all 0.2s;
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

        /* Column Visibility styling */
        .column-toggle-wrapper {
          position: relative;
        }

        .column-visibility-popover {
          position: absolute;
          right: 0;
          top: 100%;
          margin-top: 8px;
          background: #ffffff;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 12px;
          width: 200px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.08);
          z-index: 100;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .column-toggle-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
        }

        /* Data list sections */
        .charger-list-section {
          background: #ffffff;
          border: 1px solid #E5E7EB;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 15px -3px rgba(0, 0, 0, 0.015);
        }

        .table-wrapper {
          overflow-x: auto;
          border-radius: 12px;
          border: 1px solid #E5E7EB;
          background: #ffffff;
        }

        .charger-table {
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
          cursor: pointer;
          user-select: none;
        }

        .table-td {
          padding: 16px;
          font-size: 14px;
          color: #111827;
          border-bottom: 1px solid #E5E7EB;
        }

        .table-row {
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

        /* Custom toggle slider */
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
        .status-completed {
          background: linear-gradient(135deg, #DBEAFE, #BFDBFE);
          color: #1D4ED8;
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

        /* Pagination style */
        .pagination-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 20px;
        }

        .pagination-pages {
          display: flex;
          gap: 6px;
        }

        .pagination-page-btn {
          border: 1px solid #D1D5DB;
          background: #ffffff;
          color: #4B5563;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .pagination-page-btn.active {
          background: #111827;
          border-color: #111827;
          color: #ffffff;
        }

        .pagination-page-btn:hover:not(.active) {
          border-color: #3B82F6;
          color: #3B82F6;
        }

        /* Toast notifications */
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

      <div className="charger-container">
        {/* Blurry decorative background blobs */}
        <div className="decorative-blob blob-1"></div>
        <div className="decorative-blob blob-2"></div>

        {/* Modal additions */}
        {isModelOpen && (
          <Model onClose={() => setIsModelOpen(false)}>
            <Suspense fallback={<LoadingSpinner />}>
              <AddCharger
                onClose={() => setIsModelOpen(false)}
                onChargerAdded={handleChargerAdded}
                baseUrl={baseUrl}
              />
            </Suspense>
          </Model>
        )}

        {/* Edit Modal (AddCharger component is also used for edit when editingCharger is set) */}
        {editingCharger && (
          <Model onClose={() => setEditingCharger(null)}>
            <Suspense fallback={<LoadingSpinner />}>
              <AddCharger
                onClose={() => setEditingCharger(null)}
                onChargerAdded={() => {
                  setEditingCharger(null);
                  setRefreshKey(prev => prev + 1);
                  showToast("Charger updated successfully!", "success");
                }}
                baseUrl={baseUrl}
                initialData={editingCharger}
              />
            </Suspense>
          </Model>
        )}

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && (
          <DeleteConfirmationModal
            onClose={() => setIsDeleteModalOpen(false)}
            onConfirm={handleDeleteConfirm}
            itemName={deletingCharger ? deletingCharger.ocppId || `Charger #${deletingCharger.id}` : ""}
            isLoading={isDeleting}
          />
        )}

        {/* Advanced Filters sliding drawer */}
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
                    <label>Charger Status</label>
                    <select
                      className="drawer-select"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="All">All Statuses</option>
                      <option value="Online">Online / Available</option>
                      <option value="Charging">Charging / Occupied</option>
                      <option value="Reserved">Reserved</option>
                      <option value="Faulted">Faulted / Error</option>
                      <option value="Offline">Offline / Inactive</option>
                    </select>
                  </div>

                  <div className="drawer-form-group">
                    <label>Station ID</label>
                    <select
                      className="drawer-select"
                      value={stationFilter}
                      onChange={(e) => setStationFilter(e.target.value)}
                    >
                      {uniqueStations.map(st => (
                        <option key={st} value={st}>{st === "All" ? "All Stations" : `Station #${st}`}</option>
                      ))}
                    </select>
                  </div>

                  <div className="drawer-form-group">
                    <label>Connector Type</label>
                    <select
                      className="drawer-select"
                      value={connectorFilter}
                      onChange={(e) => setConnectorFilter(e.target.value)}
                    >
                      {uniqueConnectors.map(c => (
                        <option key={c} value={c}>{c === "All" ? "All Connectors" : c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="drawer-form-group">
                    <label>Charger Type</label>
                    <select
                      className="drawer-select"
                      value={chargerTypeFilter}
                      onChange={(e) => setChargerTypeFilter(e.target.value)}
                    >
                      <option value="All">All Types</option>
                      <option value="AC">AC Only</option>
                      <option value="DC">DC Only</option>
                    </select>
                  </div>

                  <div className="drawer-form-group">
                    <label>Revenue Rate</label>
                    <select
                      className="drawer-select"
                      value={revenueFilter}
                      onChange={(e) => setRevenueFilter(e.target.value)}
                    >
                      <option value="All">All Rates</option>
                      <option value="High">Premium Rates (&gt;= ₹15/kWh)</option>
                      <option value="Low">Standard Rates (&lt; ₹15/kWh)</option>
                    </select>
                  </div>
                </div>

                <div className="drawer-footer">
                  <button
                    className="action-outlined-btn"
                    style={{ flex: 1 }}
                    onClick={() => {
                      setStatusFilter("All");
                      setStationFilter("All");
                      setConnectorFilter("All");
                      setChargerTypeFilter("All");
                      setRevenueFilter("All");
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

        {/* OCPP Hover popover details */}
        <AnimatePresence>
          {hoveredCharger && (
            <motion.div
              className="ocpp-popover"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              style={{ top: hoverCoords.y, left: hoverCoords.x }}
            >
              <h4 style={{ margin: "0 0 6px 0", fontSize: "14px", fontWeight: 700, color: "#111827" }}>{hoveredCharger.ocppId || "N/A"}</h4>
              <div style={{ fontSize: "12px", color: "#4B5563", display: "flex", flexDirection: "column", gap: "4px" }}>
                <div>⚙️ <strong>Firmware:</strong> {hoveredCharger.firmwareVersion || "v1.4.2"}</div>
                <div>🏢 <strong>Vendor:</strong> {hoveredCharger.vendor || "ABB Ability"}</div>
                <div>🔌 <strong>Connector:</strong> {hoveredCharger.connectorType || "CCS2"}</div>
                <div>⚡ <strong>Type:</strong> {hoveredCharger.chargerType || "DC"}</div>
                <div>🕒 <strong>Heartbeat:</strong> Just now</div>
              </div>
              <button
                className="action-outlined-btn"
                style={{ width: "100%", padding: "6px 12px", justifyContent: "center", marginTop: "12px" }}
                onClick={() => setEditingCharger(hoveredCharger)}
              >
                Open Details
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Page title header */}
        <div className="page-header">
          <div className="header-left">
            <h2 className="gradient-header-text">Charger Management</h2>
            <span style={{ fontSize: "13px", color: "#6B7280", display: "block", marginTop: 4 }}>Configure and monitor ocpp charging profiles</span>
          </div>
        </div>

        {/* Top KPI Cards row */}
        <div className="cards-grid">
          {cards.map((c, i) => (
            <motion.div
              key={i}
              className="stat-card"
              variants={itemVariants}
              whileHover={{
                scale: 1.02,
                boxShadow: "0 12px 30px rgba(59, 130, 246, 0.12)",
                borderColor: "#3B82F6",
              }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <div className="card-header">
                <span className="card-title">{c.title}</span>
                <div className="stat-icon-circle">
                  <img src={c.icon} alt="" className="card-icon" />
                </div>
              </div>
              <div>
                <div className="card-value"><AnimatedCounter value={c.value} /></div>
                <div className="card-subtext">{c.value1}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* 1. Charger Status Overview Section */}
        <div className="status-overview-section">
          <div style={{ height: "220px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: "absolute", textAlign: "center" }}>
              <div style={{ fontSize: "24px", fontWeight: 700, color: "#111827" }}>
                {chargerRecoards.length}
              </div>
              <div style={{ fontSize: "11px", color: "#6B7280" }}>Total units</div>
            </div>
          </div>

          <div className="status-cards-subgrid">
            {[
              { label: "Available", count: statusCounts.available, color: "#10B981" },
              { label: "Charging", count: statusCounts.charging, color: "#3B82F6" },
              { label: "Reserved", count: statusCounts.reserved, color: "#F59E0B" },
              { label: "Faulted", count: statusCounts.faulted, color: "#EF4444" },
              { label: "Offline", count: statusCounts.offline, color: "#6B7280" },
            ].map((stat, i) => (
              <motion.div
                key={i}
                className="status-metric-card"
                whileHover={{ scale: 1.02, borderColor: stat.color }}
              >
                <div className="indicator-dot" style={{ backgroundColor: stat.color }}></div>
                <div>
                  <div className="indicator-label">{stat.label}</div>
                  <div className="indicator-value"><AnimatedCounter value={stat.count} /></div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 2. Charging Analytics Line/Area Chart Section */}
        <div className="analytics-section">
          <div className="analytics-header">
            <div>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#111827" }}>Charging Analytics</h3>
              <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#6B7280" }}>Performance, energy delivered, and revenue trends</p>
            </div>

            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              {/* Metric filter buttons */}
              <div className="tabs-btn-group">
                {[
                  { id: "sessions", label: "Sessions" },
                  { id: "energy", label: "Energy (kWh)" },
                  { id: "revenue", label: "Revenue (₹)" },
                  { id: "duration", label: "Duration (min)" },
                ].map((btn) => (
                  <button
                    key={btn.id}
                    className={`tab-btn ${activeMetric === btn.id ? "active" : ""}`}
                    onClick={() => setActiveMetric(btn.id)}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              {/* Time filter buttons */}
              <div className="tabs-btn-group">
                {["Today", "Week", "Month", "Year"].map((tf) => (
                  <button
                    key={tf}
                    className={`tab-btn ${analyticsFilter === tf ? "active" : ""}`}
                    onClick={() => setAnalyticsFilter(tf)}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ height: "300px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analyticsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="analyticsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="label" stroke="#E5E7EB" tick={{ fill: "#6B7280", fontSize: 11 }} />
                <YAxis stroke="#E5E7EB" tick={{ fill: "#6B7280", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    backdropFilter: "blur(8px)",
                    border: "1px solid #E5E7EB",
                    borderRadius: "12px",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={activeMetric}
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fill="url(#analyticsGrad)"
                  dot={{ r: 3, stroke: "#3B82F6", strokeWidth: 1, fill: "#fff" }}
                  activeDot={{ r: 7, strokeWidth: 0, fill: "#3B82F6" }}
                  animationDuration={800}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3 & 4. Search and Filter Bar Row */}
        <div className="actions-bar-row">
          <div className="actions-left" style={{ display: "flex", gap: "12px", flex: 1 }}>
            <div className="search-input-wrapper" style={{ width: "100%", maxWidth: "320px" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                placeholder="Search OCPP, Station Type..."
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

          <div className="actions-right" style={{ display: "flex", gap: "12px" }}>
            {/* Column toggler */}
            <div className="column-toggle-wrapper">
              <button className="action-outlined-btn" onClick={() => setIsColumnPopoverOpen(!isColumnPopoverOpen)}>
                Columns
              </button>
              <AnimatePresence>
                {isColumnPopoverOpen && (
                  <motion.div
                    className="column-visibility-popover"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                  >
                    {Object.keys(visibleColumns).map((col) => (
                      <label key={col} className="column-toggle-item">
                        <input
                          type="checkbox"
                          checked={visibleColumns[col]}
                          onChange={() => setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }))}
                        />
                        {col.charAt(0).toUpperCase() + col.slice(1)}
                      </label>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {!isDealer && (
              <button className="action-outlined-btn primary" onClick={() => setIsModelOpen(true)}>
                <span>+</span> Add Charger
              </button>
            )}

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

        {/* 5. Charger Data Table Section */}
        <div className="charger-list-section">
          {loading ? (
            <div className="skeleton-container">
              <div className="skeleton-row skeleton-header">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="skeleton-bar" style={{ width: "12%" }}></div>
                ))}
              </div>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="skeleton-row">
                  {[1, 2, 3, 4, 5, 6].map((j) => (
                    <div key={j} className="skeleton-bar" style={{ width: "12%" }}></div>
                  ))}
                </div>
              ))}
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: "52px", marginBottom: "16px" }}>🔌</div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: 18, fontWeight: 700, color: '#111827' }}>No Chargers Found</h3>
              <p style={{ margin: 0, fontSize: 14, color: '#6B7280' }}>
                No charger profiles registered.
              </p>
            </div>
          ) : (
            <>
              <div className="table-wrapper">
                <table className="charger-table">
                  <thead>
                    <tr className="table-header-row">
                      {visibleColumns.id && <th className="table-th" onClick={() => requestSort('id')}>ID <img src={sortIcon} alt="" style={{ width: 10 }} /></th>}
                      {visibleColumns.stationId && <th className="table-th" onClick={() => requestSort('stationId')}>Station ID <img src={sortIcon} alt="" style={{ width: 10 }} /></th>}
                      {visibleColumns.ocppId && <th className="table-th" onClick={() => requestSort('ocppId')}>OCPP ID <img src={sortIcon} alt="" style={{ width: 10 }} /></th>}
                      {visibleColumns.connectorType && <th className="table-th" onClick={() => requestSort('connectorType')}>Connector <img src={sortIcon} alt="" style={{ width: 10 }} /></th>}
                      {visibleColumns.chargerType && <th className="table-th" onClick={() => requestSort('chargerType')}>Type <img src={sortIcon} alt="" style={{ width: 10 }} /></th>}
                      {visibleColumns.chargeMode && <th className="table-th" onClick={() => requestSort('chargeMode')}>Mode <img src={sortIcon} alt="" style={{ width: 10 }} /></th>}
                      {visibleColumns.rate && <th className="table-th" onClick={() => requestSort('rate')}>Rate (₹/kWh) <img src={sortIcon} alt="" style={{ width: 10 }} /></th>}
                      {visibleColumns.pst && <th className="table-th" onClick={() => requestSort('pstPercent')}>PST (%) <img src={sortIcon} alt="" style={{ width: 10 }} /></th>}
                      {visibleColumns.status && <th className="table-th">Status</th>}
                      {visibleColumns.action && !isDealer && <th className="table-th" style={{ textAlign: "center" }}>Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRecords.map((charger) => (
                      <tr key={charger.id} className="table-row">
                        {visibleColumns.id && <td className="table-td">{charger.id}</td>}
                        {visibleColumns.stationId && <td className="table-td">{highlightText(charger.stationId, searchTerm)}</td>}
                        {visibleColumns.ocppId && (
                          <td
                            className="table-td"
                            style={{ fontWeight: 600, color: "#111827", cursor: "help" }}
                            onMouseEnter={(e) => handleOcppMouseEnter(charger, e)}
                            onMouseLeave={handleOcppMouseLeave}
                          >
                            {highlightText(charger.ocppId, searchTerm)}
                          </td>
                        )}
                        {visibleColumns.connectorType && <td className="table-td">{highlightText(charger.connectorType, searchTerm)}</td>}
                        {visibleColumns.chargerType && (
                          <td className="table-td">
                            <span style={{ fontWeight: 600, color: charger.chargerType === "DC" ? "#10B981" : "#3B82F6" }}>
                              {charger.chargerType}
                            </span>
                          </td>
                        )}
                        {visibleColumns.chargeMode && <td className="table-td">{charger.chargeMode || 'N/A'}</td>}
                        {visibleColumns.rate && <td className="table-td">{charger.rate}</td>}
                        {visibleColumns.pst && <td className="table-td">{charger.pstPercent || 0}%</td>}
                        {visibleColumns.status && (
                          <td className="table-td">
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span className={`status-badge ${getStatusBadgeClass(getChargerStatus(charger))}`}>
                                {getChargerStatus(charger)}
                              </span>
                            </div>
                          </td>
                        )}
                        {visibleColumns.action && !isDealer && (
                          <td className="table-td">
                            <div className="action-buttons">
                              <button className="icon-btn" onClick={() => setEditingCharger(charger)}>
                                <img src={editIcon} alt="Edit" style={{ width: "16px" }} />
                              </button>
                              <button className="icon-btn" onClick={() => openDeleteModal(charger)}>
                                <img src={deleteIcon} alt="Delete" style={{ width: "14px" }} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Dynamic Table Pagination */}
              <div className="pagination-row">
                <span style={{ fontSize: "13px", color: "#6B7280" }}>
                  Showing {Math.min(sortedRecords.length, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(sortedRecords.length, currentPage * itemsPerPage)} of {sortedRecords.length} entries
                </span>

                <div className="pagination-pages">
                  <button
                    className="pagination-page-btn"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  >
                    &lt;
                  </button>
                  {Array.from({ length: totalPages }).map((_, idx) => (
                    <button
                      key={idx}
                      className={`pagination-page-btn ${currentPage === idx + 1 ? "active" : ""}`}
                      onClick={() => setCurrentPage(idx + 1)}
                    >
                      {idx + 1}
                    </button>
                  ))}
                  <button
                    className="pagination-page-btn"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  >
                    &gt;
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Toast Notification popup */}
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

export default Charger;