import React, { useState, useEffect, lazy } from "react";
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

const LoadingSpinner = () => (
  <div style={{ textAlign: "center", padding: "50px", fontSize: "18px", color: "#555" }}>
    Loading data...
  </div>
);

const Modal = ({ children, onClose }) => (
  <div style={{
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  }}>
    <div style={{
      backgroundColor: 'white', borderRadius: '16px',
      width: '90%', height: '90%',
      maxWidth: '1200px', maxHeight: '800px',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {children}
    </div>
  </div>
);

function Stations({baseUrl}) {
  const navigate = useNavigate();

  const [stations, setStations] = useState([]);
  const [summaryData, setSummaryData] = useState({
      totalStations: '...',
      activeStations: '...',
      averageUptime: '...',
      errorToday: '...',
    });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchStationData  = async () => {
      setLoading(true);

      setSummaryData({
        totalStations: '...',
        activeStations: '...',
        averageUptime: '...',
        errorToday: '...',
      });
      setStations([]);

    const token = localStorage.getItem("token");
    if (!token) {
        console.error("No token found, redirecting to login.");
        navigate("/");
        return;
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

      const endpoints = {
        total: "/stations/total",
        active: "/stations/active",
        uptime: "/stations/uptime",
        errors: "/stations/error/today",
        records: "/stations/all",
    };

    try {
      const [totalRes,activeRes,uptimeRes,errorsRes,recordsRes] = await Promise.all([
                                                                                  fetch(baseUrl + endpoints.total, { headers }),
                                                                                  fetch(baseUrl + endpoints.active, { headers }),
                                                                                  fetch(baseUrl + endpoints.uptime, { headers }),
                                                                                  fetch(baseUrl + endpoints.errors, { headers }),
                                                                                  fetch(baseUrl + endpoints.records, { headers }),
        ]);

      for (const res of [totalRes, activeRes, uptimeRes, errorsRes, recordsRes]) {
          if (res.status === 401 || res.status === 403) {
            throw new Error('Authentication failed. Please log in again.');
          }
           if (!res.ok) {
            throw new Error(`A network request failed: ${res.status}`);
          }
        }

      const [totalStations, 
              activeStations, 
              averageUptime, 
              errorToday, 
              stationRecords] = await Promise.all([totalRes.text(), 
                                                    activeRes.text(), 
                                                    uptimeRes.text(), 
                                                    errorsRes.text(), 
                                                    recordsRes.json()
                                                  ]);

      setSummaryData({
          totalStations,
          activeStations,
          averageUptime: `${parseFloat(averageUptime)}%`,
          errorToday,
        });
        setStations(stationRecords);


    } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
        if (err.message.includes('Authentication')) {
            localStorage.removeItem("token");
            navigate("/");
            return;
        }
        setSummaryData({
          totalStations: 'Error',
          activeStations: 'Error',
          averageUptime: 'Error',
          errorToday: 'Error',
        });
      } finally {
        setLoading(false);
      }
    };

  fetchStationData();
  }, [navigate, refreshKey, baseUrl]);

  const handleStationAdded = () => {
    setIsModalOpen(false);
    setRefreshKey(prevKey => prevKey + 1);
  };


  return (
    <div style={{ padding: "20px", fontFamily: "Roboto, sans-serif" }}>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        }}>
        <h2 style={{ 
          fontSize: "32px", 
          fontWeight: "700", 
          marginBottom: "20px", 
          fontFamily: "Lexend, sans-serif",
          }}>
          Station Management
        </h2>
        <button
            style={{
              width: "160px",
              height: "45px",
              borderRadius: "18px",
              backgroundColor: "#000",
              color: "#fff",
              fontSize: "12px",
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
            }}
            onClick={() => setIsModalOpen(true)}> 
            <img src={plusIcon} alt="Add" style={{ width: "24px", height: "24px", marginRight: "6px" }} />     
              Add Station
          </button>
      </div>

      {isModalOpen && (
        <Modal onClose={() => setIsModalOpen(false)}>
          <AddStation 
            onClose={() => setIsModalOpen(false)}
            onStationAdded={handleStationAdded}
            baseUrl = {baseUrl}
          />
        </Modal>
      )}

          {/* Summary Cards */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
            <div style={{ display: "flex", gap: "20px", maxWidth: "1106px", width: "100%" }}>
            <Card title="Active Stations" value={summaryData.activeStations} icon={totalIcon} />
              <Card title="Active Stations" value={summaryData.activeStations} icon={activeIcon} />
              <Card title="Average Uptime" value={summaryData.averageUptime} icon={uptimeIcon} />
              <Card title="Error Today" value={summaryData.errorToday} icon={errorIcon} />
            </div>
          </div>

      {/* System Health Section */}
     
      <StationOverviewChart />

      {/* Records Section */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: "30px" }}>
        <div
          style={{
            width: "1140px",
            minHeight: "324px",
            border: "0.2px solid #ddd",
            borderRadius: "14px",
            padding: "18px",
            backgroundColor: "#FFFFFF",
            fontFamily: "Lexend, sans-serif",
          }}
        >
          <h3
            style={{
              fontWeight: "700",
              marginBottom: "15px",
              fontSize: "18px",
              color: "#1A1A1A",
            }}
          >
            Stations
          </h3>

          {loading ? (
            <LoadingSpinner />
          ) : stations.length === 0 ? (
                      <p style={{ textAlign: "center", padding: "20px", color: "#888" }}>
                        No station available.
                      </p>
                    ) : (
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "separate",
                          borderSpacing: "0 12px",
                          fontFamily: "Roboto, sans-serif",
                          fontSize: "14px",
                        }}
                      >
                        <thead>
                          <tr>
                            {["Name", "Location ID", "Status", "Created At", "Direction Link", "Action"].map(
                              (header, index) => (
                                <th
                                  key={index}
                                  style={{
                                    padding: "10px 12px",
                                    fontWeight: "600",
                                    textAlign: index === 5 ? "center" : "left",
                                    color: "#333333",
                                    fontSize: "14px",
                                  }}
                                >
                                  {header !== "Action" ? (
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                      {header}
                                      <img
                                        src={sortIcon}
                                        alt="Sort"
                                        style={{
                                          width: "12px",
                                          height: "12px",
                                          cursor: "pointer",
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    header
                                  )}
                                </th>
                              )
                            )}
                          </tr>
                        </thead>
                        <tbody>

                          {stations.map((sta) => (
                            <tr key={sta.id} style={{backgroundColor: "#fff",borderRadius: "12px",}}>
                              <td style={{ padding: "12px" }}>{sta.name}</td>
                              <td style={{ padding: "12px" }}>{sta.locationId || 'N/A'}</td>
                              <td style={{ padding: "12px" }}>
                                <span
                                  style={{
                                    display: "inline-flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    width: "72px",
                                    height: "26px",
                                    borderRadius: "15px",
                                    fontWeight: 600,
                                    fontSize: "12px",
                                    color: sta.status === "ACTIVE" ? "#2E7D32" : sta.status === "COMPLETED" ? "#1976D2" : "#D32F2F",
                                    backgroundColor: sta.status === "ACTIVE" ? "#C8E6C9" : sta.status === "COMPLETED" ? "#BBDEFB" : "#FFCDD2",
                                  }}>
                                  {sta.status}
                                </span>
                              </td>
                              <td style={{ padding: "12px" }}>{new Date(sta.createdAt).toLocaleDateString()}</td>
                              <td style={{ padding: "12px" }}>
                                <a href={sta.directionLink} target="_blank" rel="Link not available">View Map</a>
                              </td>
                              <td
                                style={{
                                  display: "flex",
                                  justifyContent: "center",
                                  gap: "12px",
                                  padding: "12px",
                                  alignItems: "center",
                                }}>
                                <img
                                  src={editIcon}
                                  alt="Edit"
                                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                                />
                                <img
                                  src={deleteIcon}
                                  alt="Delete"
                                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
          </div>
        );
}

const Card = ({ title, value, icon }) => (
  <div
    style={{
      flex: 1,
      display: "flex",
      alignItems: "center",
      gap: "16px",
      backgroundColor: "#FFFFFF",
      borderRadius: "14px",
      padding: "18px 22px",
      border: "0.2px solid #ddd",
    }}
  >
    <img src={icon} alt="icon" style={{ width: "32px", height: "32px" }} />
    <div>
      <p style={{ fontSize: "14px", color: "#555", marginBottom: "6px" }}>{title}</p>
      <h3 style={{ fontSize: "22px", fontWeight: "700", color: "#000" }}>{value}</h3>
    </div>
  </div>
);

export default Stations;