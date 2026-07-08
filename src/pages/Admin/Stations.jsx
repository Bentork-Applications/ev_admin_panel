import React, { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
// import AddStation from "./form/AddStation";

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

function Stations({ baseUrl, userRole }) {
  const navigate = useNavigate();
  const isDealer = userRole === "DEALER";

  const [stations, setStations] = useState([]);
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
      const uptimeEndpoint = "/stations/uptime";
      const errorsEndpoint = "/stations/error/today";

      try {
        // ✅ Fetch the full station list first, then derive counts from it
        const fetchRecords = async () => {
          try {
            const res = await fetch(baseUrl + recordsEndpoint, { headers });
            if (res.status === 401 || res.status === 403) throw new Error('Auth failed');
            if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
            const data = await res.json();
            const list = Array.isArray(data) ? data : [];
            setStations(list);

            // Derive counts from the list — no dependency on separate count endpoints
            const total = list.length;
            const active = list.filter(s => s.status === 'ACTIVE').length;
            setSummaryData(prev => ({
              ...prev,
              totalStations: total,
              activeStations: active,
            }));
          } catch (err) {
            console.error("Failed to fetch station records:", err);
            setSummaryData(prev => ({
              ...prev,
              totalStations: 'N/A',
              activeStations: 'N/A',
            }));
          } finally {
            setLoading(false);
          }
        };

        // Fetch uptime/errors from their server-side endpoints (admin only)
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
  };

  const handleEdit = (sta) => {
    setSelectedStation(sta);
    setIsEditModalOpen(true);
  };

  const handleStationUpdated = () => {
    setIsEditModalOpen(false);
    setSelectedStation(null);
    setRefreshKey(prevKey => prevKey + 1);
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
          alert("Station deleted successfully");
          setRefreshKey(prevKey => prevKey + 1);
        } else {
          alert("Failed to delete station");
        }
      } catch (error) {
        console.error("Error deleting station:", error);
        alert("Error deleting station");
      }
    }
  };

  const handleToggleStatus = async (sta) => {
    const newStatus = sta.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    
    // Optimistic UI Update
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
    } catch (error) {
      console.error("Error updating station status:", error);
      alert("Error updating station status. Rolling back status in UI.");
      // Rollback UI update
      setStations(prev => prev.map(s => s.id === sta.id ? { ...s, status: sta.status } : s));
      setRefreshKey(prev => prev + 1);
    }
  };

  const getStatusClass = (status) => {
    if (status === "ACTIVE") return "status-active";
    if (status === "COMPLETED") return "status-completed";
    if (status === "INACTIVE") return "status-inactive";
    return "status-error";
  };


  return (
    <>
      <style>
        {`
            .stations-page-container {
                padding: 30px;
                font-family: 'Roboto', sans-serif;
                background-color: #F3F4F6;
                min-height: 100vh;
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
                height: 90%;
                max-width: 1200px;
                max-height: 800px;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }
            .summary-cards-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 20px;
                margin-bottom: 30px;
            }
            .station-card {
                background-color: white;
                border-radius: 16px;
                padding: 24px;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                box-shadow: 0 2px 4px rgba(0,0,0,0.02);
                min-height: 130px;
            }
            .card-header {
                display: flex;
                justify-content: space-between;
                width: 100%;
                margin-bottom: 8px;
            }
            .card-title {
                font-size: 12px;
                color: #666;
                font-weight: 500;
            }
            .card-icon {
                width: 20px;
                height: auto;
            }
            .card-value {
                font-size: 32px;
                font-weight: 700;
                color: #111;
                line-height: 1.2;
                margin-bottom: 8px;
            }
            .card-subtext {
                font-size: 11px;
                color: #888;
            }
            .system-health-section {
                background-color: white;
                border-radius: 16px;
                padding: 20px;
                margin-bottom: 30px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.02);
            }
            .health-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 20px;
            }
            .health-title {
                font-size: 16px;
                font-weight: 600;
                color: #111;
                margin: 0;
            }
            .health-subtitle {
                font-size: 12px;
                color: #666;
                margin-top: 4px;
            }
            .health-chart-container {
                min-height: 300px;
            }
            .stations-list-section {
                background-color: #fff;
                border-radius: 16px;
                padding: 24px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.02);
                font-family: 'Lexend', sans-serif;
            }
            .list-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 30px;
            }
            .list-title {
                font-size: 20px;
                font-weight: 600;
                color: #111;
                margin: 0;
            }
            .create-btn {
                background-color: #222;
                color: #fff;
                border-radius: 20px;
                padding: 8px 24px;
                font-size: 13px;
                font-weight: 500;
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .create-plus {
                font-size: 16px;
                font-weight: 400;
            }
            .empty-state {
                text-align: center;
                padding: 20px;
                color: #888;
            }
            .stations-table {
                width: 100%;
                border-collapse: separate;
                border-spacing: 0;
            }
            .table-header-row {
                text-align: left;
            }
            .table-th {
                font-size: 12px;
                font-weight: 700;
                color: #111;
                padding: 10px 10px;
                padding-bottom: 20px;
            }
            .table-row {
                font-size: 13px;
                color: #333;
            }
            .table-td {
                padding: 20px 10px;
            }
            .td-name {
                font-weight: 600;
            }
            .status-badge {
                display: inline-block;
                padding: 6px 20px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 600;
                text-align: center;
                min-width: 80px;
            }
            .status-active {
                background-color: #E8F5E9;
                color: #2E7D32;
            }
            .status-completed {
                background-color: #E3F2FD;
                color: #1565C0;
            }
            .status-error {
                background-color: #FFCDD2;
                color: #C62828;
            }
            .status-inactive {
                background-color: #E2E8F0;
                color: #475569;
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
                color: #666;
                text-decoration: none;
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
            }
            .search-bar-container {
                display: flex;
                gap: 16px;
                margin-bottom: 30px;
                align-items: center;
                width: 100%;
            }
            .search-input-wrapper {
                flex: 1;
                background-color: #fff;
                border-radius: 20px;
                padding: 10px 16px;
                display: flex;
                align-items: center;
                box-shadow: 0 1px 3px rgba(0,0,0,0.05);
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
                background-color: #fff;
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
                box-shadow: 0 1px 3px rgba(0,0,0,0.05);
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
        `}
      </style>
      <div className="stations-page-container">

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
        <h1>STATIONS & LOCATIONS</h1>
        {/* Summary Cards */}
        <div className="summary-cards-grid">

          <Card title="Total Stations" value={summaryData.totalStations} icon={totalIcon} subtext="+2 from last month" />
          <Card title="Active Stations" value={summaryData.activeStations} icon={activeIcon} subtext="+75 operational" />
          <Card title="Average Uptime" value={summaryData.averageUptime} icon={uptimeIcon} subtext="-1.8% from last week" />
          <Card title="Errors" value={summaryData.errorToday} icon={errorIcon} subtext="+1 from last month" />
        </div>



        {/* System Health Section */}
        <div className="system-health-section">
          <div className="health-header">
            <div>
              <h3 className="health-title">System Health Overview</h3>
              <p className="health-subtitle">Real-time monitoring of station performance</p>
            </div>
            <img src={activeIcon} alt="" style={{ width: "20px", opacity: 0.8 }} />
          </div>
          <div className="health-chart-container">
            <StationOverviewChart />
          </div>
        </div>
        {/* Search Bar */}
        <div className="search-bar-container">
          <div className="search-input-wrapper">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search by Name or Location ID"
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
        {/* Stations List Section */}
        <div className="stations-list-section">

          <div className="list-header">
            <h3 className="list-title">Stations</h3>
            {!isDealer && (
              <button
                className="create-btn"
                onClick={() => setIsModalOpen(true)}>
                <span className="create-plus">+</span> Create
              </button>
            )}
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : stations.filter(sta =>
            (sta.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (sta.locationId && sta.locationId.toString().toLowerCase().includes(searchTerm.toLowerCase()))
          ).length === 0 ? (
            <p className="empty-state">
              {searchTerm ? `No stations found matching "${searchTerm}"` : "No station available."}
            </p>
          ) : (
            <table className="stations-table">
              <thead>
                <tr className="table-header-row">
                  {["Name", "Location ID", "Status", "Created at", "Direction Link"].map((h, i) => (
                    <th key={i} className="table-th">
                      {h}
                    </th>
                  ))}
                  {!isDealer && <th className="table-th" style={{ textAlign: "center" }}>Action</th>}
                </tr>
              </thead>
              <tbody>
                {stations
                  .filter(sta =>
                    (sta.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (sta.locationId && sta.locationId.toString().toLowerCase().includes(searchTerm.toLowerCase()))
                  )
                  .map((sta) => (
                    <tr key={sta.id} className="table-row">
                      <td className="table-td td-name">{sta.name || 'N/A'}</td>
                      <td className="table-td">{sta.locationId || 'N/A'}</td>
                      <td className="table-td">
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span className={`status-badge ${getStatusClass(sta.status)}`}>
                            {sta.status === "ACTIVE" ? "Active" : sta.status === "COMPLETED" ? "Completed" : sta.status === "INACTIVE" ? "Inactive" : "Error"}
                          </span>
                          {!isDealer && (
                            <label className="status-toggle-switch">
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
                      <td className="table-td">
                        <a href={sta.directionLink || "#"} target="_blank" rel="noopener noreferrer" className="link-text">(LINK GOES HERE)</a>
                      </td>
                      {!isDealer && (
                        <td className="table-td">
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
                  ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </>
  );
}

const Card = ({ title, value, icon, subtext }) => (
  <div className="station-card">
    <div className="card-header">
      <span className="card-title">{title}</span>
      <img src={icon} alt="" className="card-icon" />
    </div>

    <div>
      <div className="card-value">{value}</div>
      <div className="card-subtext">{subtext}</div>
    </div>
  </div>
);

export default Stations;