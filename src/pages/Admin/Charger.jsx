import React, { useState, useEffect, Suspense, lazy } from "react";
import { useNavigate } from "react-router-dom";
import plusIcon from "../../assets/icons/stafficon/plus.svg";
import VectorIcon from "../../assets/icons/stafficon/Vector-3.svg";
import editIcon from "../../assets/icons/stationicon/edit.svg";
import deleteIcon from "../../assets/icons/stationicon/delete.svg";
import sortIcon from "../../assets/icons/stationicon/upndown.svg";
import DeleteConfirmationModal from "../../components/admin/DeleteConfirmationModal";

const AddCharger = lazy(() => import('./form/AddCharger'));

const LoadingSpinner = () => {
  return (
    <div className="loading-spinner">
      Loading data...
    </div>
  );
}

const Model = ({ children, onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {children}
      </div>
    </div>
  );
};

// Search Bar Component equivalent inline to match design exactly
const SearchBar = ({ searchTerm, setSearchTerm }) => (
  <div className="search-bar-container">
    <div className="search-input-wrapper">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <input
        type="text"
        placeholder="Search"
        className="search-input"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
    </div>
    <div className="filter-export-buttons">
      <button className="filter-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
        </svg>
        Filter
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto' }}>
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      <button className="export-btn">Export</button>
    </div>
  </div>
);

// Consistently map charger states across the application:
// - Active Charging Session (status: charging/occupied or isOccupied: true) -> Busy
// - Connected & Available (availability: true or status: available/online/preparing/reserved, not occupied) -> Online
// - Not Connected / Unavailable (availability: false or status: offline/unavailable/faulted/error) -> Offline
export const getChargerStatus = (charger) => {
  if (!charger) return "Offline";

  const statusStr = charger.status ? String(charger.status).toLowerCase().trim() : "";

  // 1. Prioritize explicit status from backend database if present and recognized
  if (statusStr === "faulted" || statusStr === "error") {
    return "Faulted";
  }
  if (
    statusStr === "busy" ||
    statusStr === "occupied" ||
    statusStr === "charging" ||
    statusStr === "preparing" ||
    statusStr === "finishing" ||
    statusStr === "reserved"
  ) {
    return "Busy";
  }
  if (statusStr === "available" || statusStr === "online") {
    return "Online";
  }
  if (statusStr === "offline" || statusStr === "unavailable") {
    return "Offline";
  }

  // 2. Fall back to live WebSocket connection status if available
  if (charger.wsConnected !== undefined) {
    if (charger.wsConnected === true || charger.wsConnected === "true" || charger.wsConnected === 1 || charger.wsConnected === "1") {
      const isOccupied = charger.occupied === true || 
                         charger.occupied === "true" || 
                         charger.isOccupied === true || 
                         charger.isOccupied === "true" ||
                         charger.occupied === 1 ||
                         charger.occupied === "1" ||
                         charger.isOccupied === 1 ||
                         charger.isOccupied === "1";
      return isOccupied ? "Busy" : "Online";
    } else {
      return "Offline";
    }
  }

  // 3. Fall back to parsed occupied/available boolean flags
  const isOccupied = charger.occupied === true || 
                     charger.occupied === "true" || 
                     charger.isOccupied === true || 
                     charger.isOccupied === "true" ||
                     charger.occupied === 1 ||
                     charger.occupied === "1" ||
                     charger.isOccupied === 1 ||
                     charger.isOccupied === "1";

  const isAvailable = charger.availability === true || 
                      charger.availability === "true" || 
                      charger.isAvailability === true || 
                      charger.isAvailability === "true" || 
                      charger.available === true || 
                      charger.available === "true" ||
                      charger.isAvailable === true || 
                      charger.isAvailable === "true" ||
                      charger.availability === 1 ||
                      charger.availability === "1" ||
                      charger.isAvailability === 1 ||
                      charger.isAvailability === "1" ||
                      charger.available === 1 ||
                      charger.available === "1" ||
                      charger.isAvailable === 1 ||
                      charger.isAvailable === "1";

  if (isOccupied) {
    return "Busy";
  }
  if (isAvailable) {
    return "Online";
  }

  return "Offline";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'asc' });

  // Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingCharger, setDeletingCharger] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Memoized fetch function to support both initial load and background polling
  const fetchData = React.useCallback(async (isSilent = false) => {
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
      // ✅ Fetch full list once and derive all counts from it
      const listEndpoint = isDealer ? '/dealer/chargers' : '/chargers/all';
      const res = await fetch(`${baseUrl}${listEndpoint}`, { headers });
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data = await res.json();
      let list = Array.isArray(data) ? data : [];

      // Fetch live connections and un-cached status to bypass Redis cache
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
        console.warn("Failed to fetch live debug status, falling back to cached list:", debugErr);
      }

      setChargerRecoards(list);

      // Derive all 4 card counts from the list
      const total = list.length;
      const available = list.filter(c => getChargerStatus(c) === "Online").length;
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

  // Initial and refreshKey-triggered load
  useEffect(() => {
    fetchData(false);
  }, [fetchData, refreshKey]);

  // Data polling every 15 seconds to keep status in sync with the backend real-time state
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleChargerAdded = () => {
    setIsModelOpen(false);
    setRefreshKey(prevKey => prevKey + 1);
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
        // Using a temporary alert for success feedback, could be replaced with toast
        setTimeout(() => alert("Charger deleted successfully"), 100);
      } else {
        const errorText = await res.text();
        alert(errorText || "Failed to delete charger. Please try again.");
      }
    } catch (error) {
      console.error("Error deleting charger:", error);
      alert("Error deleting charger. Check your network connection.");
    } finally {
      setIsDeleting(false);
      if (!isDeleting) setDeletingCharger(null);
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
      charger.isAvailability === "1" ||
      charger.available === true || 
      String(charger.available).toLowerCase() === "true" || 
      charger.available === 1 || 
      charger.available === "1" ||
      charger.isAvailable === true || 
      String(charger.isAvailable).toLowerCase() === "true" || 
      charger.isAvailable === 1 || 
      charger.isAvailable === "1";
    const newAvailability = !currentAvailability;

    // Optimistic UI Update
    setChargerRecoards(prev =>
      prev.map(c => c.id === charger.id ? { ...c, availability: newAvailability } : c)
    );

    // Update summary counts
    setChargerData(prev => {
      const wasOnline = getChargerStatus(charger) === "Online";
      const updatedCharger = { ...charger, availability: newAvailability };
      const isOnlineNow = getChargerStatus(updatedCharger) === "Online";
      let diff = 0;
      if (wasOnline && !isOnlineNow) diff = -1;
      if (!wasOnline && isOnlineNow) diff = 1;

      return {
        ...prev,
        availableData: typeof prev.availableData === 'number' ? prev.availableData + diff : prev.availableData
      };
    });

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

      if (!res.ok) {
        throw new Error("Failed to update availability");
      }
    } catch (error) {
      console.error("Error updating charger status:", error);
      alert("Error updating charger status. Rolling back status in UI.");

      // Rollback UI update
      setChargerRecoards(prev =>
        prev.map(c => c.id === charger.id ? { ...c, availability: !newAvailability } : c)
      );
      setRefreshKey(prev => prev + 1);
    }
  };

  // Double check fetching logic here if needed, but keeping existing one...
  // The second useEffect in original file was redundant/duplicate. Removed for cleaner code.

  const cards = [
    { title: "Total Chargers", value: chargerData.totalData, value1: "+317 from last month", icon: VectorIcon },
    { title: "Available Chargers", value: chargerData.availableData, value1: "+224 from last month", icon: VectorIcon },
    { title: "AC Chargers", value: chargerData.acChargerData, value1: "+124 from last month", icon: VectorIcon },
    { title: "DC Chargers", value: chargerData.dcChargerData, value1: "+84 from last month", icon: VectorIcon },
  ];

  const filteredRecords = chargerRecoards.filter(charger => {
    if (!searchTerm.trim()) return true;
    const searchLow = searchTerm.toLowerCase().trim();

    const statusStr = getChargerStatus(charger).toLowerCase();

    return (
      (charger.ocppId && charger.ocppId.toString().toLowerCase().includes(searchLow)) ||
      (charger.stationId && charger.stationId.toString().toLowerCase().includes(searchLow)) ||
      (charger.chargerType && charger.chargerType.toLowerCase().includes(searchLow)) ||
      (charger.connectorType && charger.connectorType.toLowerCase().includes(searchLow)) ||
      statusStr.includes(searchLow)
    );
  });

  const sortedRecords = [...filteredRecords].sort((a, b) => {
    if (!sortConfig.key) return 0;

    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    // Handle string/number comparison
    if (typeof aValue === 'string') aValue = aValue.toLowerCase();
    if (typeof bValue === 'string') bValue = bValue.toLowerCase();

    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <>
      <style>
        {`
            .charger-page-container {
                width: 100%;
                min-height: 100vh;
                font-family: 'Roboto', sans-serif;
                background-color: #F1F1F1;
                padding: 30px;
            }
            .page-header {
                display: flex;
                align-items: center;
                margin-bottom: 24px;
            }
            .page-title {
                font-size: 24px;
                font-weight: 700;
                font-family: 'Lexend', sans-serif;
                margin: 0;
                color: #111;
            }
            .loading-spinner {
                text-align: center;
                padding: 50px;
                font-size: 18px;
                color: #555;
            }
            .modal-overlay {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            }
            .modal-content {
                background-color: white;
                border-radius: 16px;
                width: 90%;
                max-width: 900px;
                max-height: 90vh;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }
            .cards-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 20px;
                margin-bottom: 30px;
            }
            .stat-card {
                background-color: white;
                border-radius: 12px;
                padding: 20px;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                min-height: 110px;
                position: relative;
            }
            .card-title {
                font-size: 13px;
                color: #666;
                font-weight: 500;
                margin-bottom: 8px;
            }
            .card-value {
                font-size: 28px;
                font-weight: 700;
                color: #111;
                margin-bottom: 4px;
            }
            .card-subtext {
                font-size: 11px;
                color: #2E7D32; /* Green text for growth */
                font-weight: 500;
            }
            .card-arrow {
                position: absolute;
                bottom: 20px;
                right: 20px;
                color: #2E7D32;
            }
            .search-bar-container {
                display: flex;
                gap: 16px;
                margin-bottom: 30px;
                align-items: center;
            }
            .search-input-wrapper {
                flex: 1;
                background-color: #F3F4F6;
                border-radius: 20px; /* Fully rounded */
                padding: 10px 16px;
                display: flex;
                align-items: center;
            }
            .search-input {
                border: none;
                background: none;
                outline: none;
                width: 100%;
                font-size: 14px;
            }
            .filter-export-buttons {
                display: flex;
                gap: 12px;
            }
            .filter-btn {
                background-color: #F3F4F6;
                border: none;
                border-radius: 20px;
                padding: 10px 20px;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                color: #333;
                min-width: 100px;
            }
            .export-btn {
                background-color: #111;
                color: white;
                border: none;
                border-radius: 20px;
                padding: 10px 24px;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
            }
            .table-container {
                background-color: white;
                border-radius: 12px; /* Less rounded than before to match image */
                padding: 20px;
                box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            }
            .table-header-actions {
                display: flex;
                justify-content: flex-end;
                margin-bottom: 20px;
                gap: 12px;
            }
            .add-charger-btn {
                background-color: #222;
                color: white;
                border: none;
                border-radius: 20px;
                padding: 8px 20px;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .manage-btn {
                background-color: white;
                color: #333;
                border: 1px solid #eee;
                border-radius: 20px;
                padding: 8px 20px;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
            }
            .charger-table {
                width: 100%;
                border-collapse: separate;
                border-spacing: 0;
            }
            .table-th {
                text-align: left;
                font-size: 12px;
                font-weight: 700;
                color: #111;
                padding: 12px;
                border-bottom: 1px solid #f0f0f0;
            }
            .table-td {
                padding: 16px 12px;
                font-size: 13px;
                color: #333;
                border-bottom: 1px solid #f9f9f9;
            }
            .status-badge {
                display: inline-block;
                padding: 6px 16px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 600;
                text-align: center;
            }
            .badge-online {
                background-color: #D1FAE5;
                color: #065F46;
            }
            .badge-offline {
                background-color: #FFE4E6;
                color: #BE123C;
            }
            .badge-busy {
                background-color: #FEF3C7;
                color: #D97706;
            }
            .badge-faulted {
                background-color: #FEE2E2;
                color: #991B1B;
                border: 1px solid #F87171;
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
            .charge-mode-badge {
                padding: 6px 16px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 600;
                text-align: center;
                display: inline-block;
                width: 80px;
            }
            .mode-fast {
                background-color: #DBEAFE;
                color: #1E40AF;
            }
            .mode-standard {
                background-color: #E0F2FE;
                color: #0369A1;
            }
            .connector-badge {
                border: 1px solid #eee;
                padding: 4px 12px;
                border-radius: 6px;
                font-size: 12px;
                background: white;
                display: inline-block;
            }
            .type-badge {
                background-color: #111;
                color: white;
                padding: 4px 16px;
                border-radius: 20px;
                font-size: 11px;
                display: inline-block;
            }
            .type-badge-ac {
                background-color: #F3F4F6;
                color: #111;
            }
            .action-icons {
                display: flex;
                gap: 12px;
                justify-content: center;
            }
            .icon-btn {
                background: none;
                border: none;
                cursor: pointer;
                padding: 0;
            }
        `}
      </style>

      <div className="charger-page-container">
        {/* Header */}
        <div className="page-header">
          <h2 className="page-title">Charger Management</h2>
        </div>

        {/* Cards */}
        <div className="cards-grid">
          {cards.map((card, index) => (
            <div key={index} className="stat-card">
              <div>
                <div className="card-title">{card.title}</div>
                <div className="card-value">{card.value}</div>
                <div className="card-subtext">{card.value1}</div>
              </div>
              <div className="card-arrow">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5"></line>
                  <polyline points="5 12 12 5 19 12"></polyline>
                </svg>
              </div>
            </div>
          ))}
        </div>

        {/* Search and Filter */}
        <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

        {/* Table Section */}
        <div className="table-container">
          {!isDealer && (
            <div className="table-header-actions">
              <button className="add-charger-btn" onClick={() => {
                setEditingCharger(null);
                setIsModelOpen(true);
              }}>
                Add Charger
              </button>
              <button className="manage-btn">Manage</button>
            </div>
          )}

          {loading ? (
            <LoadingSpinner />
          ) : sortedRecords.length === 0 ? (
            <p style={{ textAlign: "center", padding: "40px", color: "#888" }}>
              {searchTerm ? `No chargers found matching "${searchTerm}"` : "No chargers available."}
            </p>
          ) : (
            <table className="charger-table">
              <thead>
                <tr>
                  {["ID", "Station ID", "OCPP ID", "Connector", "Type", "Rate", "PST (%)", "Charge Mode", "Status"].map((h, i) => (
                    <th
                      key={i}
                      className="table-th"
                      style={{
                        textAlign: "left",
                        cursor: h === "ID" ? "pointer" : "default"
                      }}
                      onClick={h === "ID" ? () => requestSort('id') : undefined}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {h}
                        {h === "ID" && (
                          <img
                            src={sortIcon}
                            alt="sort"
                            style={{
                              width: '12px',
                              opacity: sortConfig.key === 'id' ? 1 : 0.3,
                              transform: sortConfig.key === 'id' && sortConfig.direction === 'desc' ? 'rotate(180deg)' : 'none',
                              transition: 'transform 0.2s'
                            }}
                          />
                        )}
                      </div>
                    </th>
                  ))}
                  {!isDealer && <th className="table-th" style={{ textAlign: "center" }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {sortedRecords.map((charger) => {
                  const isFast = charger.chargeMode === 'Fast' || charger.chargeMode === 'Ultra Fast';

                  return (
                    <tr key={charger.id}>
                      <td className="table-td">{charger.id}</td>
                      <td className="table-td">{charger.stationId || 'N/A'}</td>
                      <td className="table-td" style={{ textAlign: "left" }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                          <span>{charger.ocppId || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="table-td">
                        <span className="connector-badge">{charger.connectorType || "CCS2"}</span>
                      </td>
                      <td className="table-td">
                        <span className={`type-badge ${charger.chargerType === 'AC' ? 'type-badge-ac' : ''}`}>
                          {charger.chargerType || "DC"}
                        </span>
                      </td>
                      <td className="table-td">₹{charger.rate || "8.50"}</td>
                      <td className="table-td">{charger.pstPercent != null ? `${charger.pstPercent}%` : '0%'}</td>
                      <td className="table-td">
                        <span className={`charge-mode-badge ${isFast ? 'mode-fast' : 'mode-standard'}`}>
                          {charger.chargeMode || 'Standard'}
                        </span>
                      </td>
                      <td className="table-td">
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {(() => {
                            const status = getChargerStatus(charger);
                            if (status === "Online") {
                              return <span className="status-badge badge-online">Online</span>;
                            } else if (status === "Busy") {
                              return <span className="status-badge badge-busy">Busy</span>;
                            } else if (status === "Faulted") {
                              return <span className="status-badge badge-faulted">Faulted</span>;
                            } else {
                              return <span className="status-badge badge-offline">{status}</span>;
                            }
                          })()}
                        </div>
                      </td>
                      {!isDealer && (
                        <td className="table-td">
                          <div className="action-icons">
                            <button className="icon-btn" onClick={() => {
                              setEditingCharger(charger);
                              setIsModelOpen(true);
                            }}><img src={editIcon} alt="Edit" style={{ width: "16px" }} /></button>
                            <button className="icon-btn" onClick={() => openDeleteModal(charger)}>
                              <img src={deleteIcon} alt="Del" style={{ width: "14px" }} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {isDeleteModalOpen && (
          <DeleteConfirmationModal
            onClose={() => setIsDeleteModalOpen(false)}
            onConfirm={handleDeleteConfirm}
            itemName={deletingCharger?.ocppId || `Charger ${deletingCharger?.id}`}
            isLoading={isDeleting}
          />
        )}

        {isModelOpen && (
          <Model onClose={() => setIsModelOpen(false)}>
            <Suspense fallback={<LoadingSpinner />}>
              <AddCharger
                onClose={() => setIsModelOpen(false)}
                onChargerAdded={handleChargerAdded}
                baseUrl={baseUrl}
                initialData={editingCharger}
              />
            </Suspense>
          </Model>
        )}
      </div>
    </>
  );
};

export default Charger;