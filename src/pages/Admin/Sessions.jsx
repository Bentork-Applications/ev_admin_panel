import React, { useState, useEffect } from "react";
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
  <div style={{ textAlign: "center", padding: "50px", fontSize: "18px", color: "#555" }}>
    Loading data...
  </div>
);

function Sessions({baseUrl}) {
  const navigate = useNavigate();

  // State to store sessions
  const [sessions, setSessions] = useState([]);
  const [summaryData, setSummaryData] = useState({
    totalSessions: '...',
    activeSessions: '...',
    averageUptime: '...',
    errorToday: '...',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessionData = async () => {
      setLoading(true);

      setSummaryData({
        totalSessions: '...',
        activeSessions: '...',
        averageUptime: '...',
        errorToday: '...',
      });
      setSessions([]);

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
        total: "/sessions/total",
        active: "/sessions/active",
        uptime: "/sessions/uptime",
        errors: "/sessions/error/today",
        records: "/sessions/all/records",
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

        const totalSessions = await totalRes.text();
        const activeSessions = await activeRes.text();
        const averageUptime = await uptimeRes.text();
        const errorToday = await errorsRes.text();
        const sessionRecords = await recordsRes.json();

        setSummaryData({
          totalSessions,
          activeSessions,
          averageUptime: `${parseFloat(averageUptime)}%`,
          errorToday,
        });
        setSessions(sessionRecords);

      } catch (err) {
        console.error("Error fetching session data:", err);
        if (err.message.includes('Authentication failed')) {
            localStorage.removeItem("token");
            navigate("/");
            return;
        }
        setSummaryData({
        totalSessions: 'Error',
        activeSessions: 'Error',
        averageUptime: 'Error',
        errorToday: 'Error',
      });
      } finally {
        setLoading(false);
      }
    };

    fetchSessionData();
  }, [navigate, baseUrl]);


  return (
    <div style={{ padding: "20px", fontFamily: "Roboto, sans-serif" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2
          style={{
            fontSize: "32px",
            fontWeight: "700",
            marginBottom: "0px",
            fontFamily: "Lexend, sans-serif",
          }}
        >
          Sessions
        </h2>
      </div>

      <p
          style={{
            fontSize: "14px",
            color: "#4B5563",
            marginBottom: "32px",
          }}
        >
          Manage RFID cards & registration
        </p>

          {/* Summary Cards */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "20px",
            }}>
            <div
              style={{
                display: "flex",
                gap: "20px",
                maxWidth: "1106px",
                width: "100%",
              }}>
              <Card title="Total Sessions" value={summaryData.totalSessions} icon={totalIcon} />
              <Card title="Active Sessions" value={summaryData.activeSessions} icon={activeIcon} />
              <Card title="Average Uptime" value={summaryData.averageUptime} icon={uptimeIcon} />
              <Card title="Error Today" value={summaryData.errorToday} icon={errorIcon} />
            </div>
          </div>

      {/* System Health Section */}
          <SessionChart />

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
            Records
          </h3>

          {loading ? (
            <LoadingSpinner />
          ) : sessions.length === 0 ? (
            <p style={{ textAlign: "center", padding: "20px", color: "#888" }}>
              No sessions available.
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
                  {["Name", "Session ID", "Status", "Energy", "Cost (INR)", "Action"].map(
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
                {sessions.map((rec) => (
                  <tr key={rec.id} style={{backgroundColor: "#fff",borderRadius: "12px",}}>
                    <td style={{ padding: "12px" }}>{rec.charger?.ocppId || 'N/A'}</td>
                    <td style={{ padding: "12px" }}>{rec.id}</td>
                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          justifyContent: "center",
                          alignItems: "center",
                          width: "82px",
                          height: "26px",
                          borderRadius: "15px",
                          fontWeight: 600,
                          fontSize: "12px",
                          color: rec.status === "ACTIVE" ? "#2E7D32" : rec.status === "COMPLETED" ? "#1976D2" : "#D32F2F",
                          backgroundColor: rec.status === "ACTIVE" ? "#C8E6C9" : rec.status === "COMPLETED" ? "#BBDEFB" : "#FFCDD2",
                        }}>
                        {rec.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px" }}>{rec.energyKwh ? `${rec.energyKwh} kWh` : 'N/A'}</td>
                    <td style={{ padding: "12px" }}>{`₹${rec.cost.toLocaleString('en-IN')}`}</td>
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

export default Sessions;
