import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import RegisterCard from "./form/RegisterCard";
import plusIcon from "../../assets/icons/stafficon/plus.svg";

import totalIcon from "../../assets/icons/stationicon/Vector.svg";
import activeIcon from "../../assets/icons/stationicon/green.svg";
import uptimeIcon from "../../assets/icons/stationicon/yellow.svg";
import errorIcon from "../../assets/icons/stationicon/red.svg";
import sortIcon from "../../assets/icons/stationicon/upndown.svg";
import editIcon from "../../assets/icons/stationicon/edit.svg";
import deleteIcon from "../../assets/icons/stationicon/delete.svg";

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

function Users({baseUrl}) {
  const navigate = useNavigate();

  // State to store user details
  const [users, setUsers] = useState([]);
  const [summaryData, setSummaryData] = useState({
    totalCards: '...',
    activeCards: '...',
    inactiveCards: '...',
    recentyAdded: '...',
  });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  // const [isActive, setIsActive] = useState();
  // const [statusText, setStatusText] = useState();


  useEffect(() => {
    const fetchSessionData = async () => {
      setLoading(true);

      setSummaryData({
        totalCards: '...',
        activeCards: '...',
        inactiveCards: '...',
        recentyAdded: '...',
      });
      setUsers([]);

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
        total: "/rfid-card/total",
        active: "/rfid-card/active",
        inactive: "/rfid-card/inactive",
        recently: "/rfid-card/recent",
        records: "/rfid-card/all",
      };

      try {
        const [totalRes,activeRes,inactiveRes,recentlyRes,recordsRes] = await Promise.all([
                                                                                  fetch(baseUrl + endpoints.total, { headers }),
                                                                                  fetch(baseUrl + endpoints.active, { headers }),
                                                                                  fetch(baseUrl + endpoints.inactive, { headers }),
                                                                                  fetch(baseUrl + endpoints.recently, { headers }),
                                                                                  fetch(baseUrl + endpoints.records, { headers }),
        ]);

        for (const res of [totalRes, activeRes, inactiveRes, recentlyRes, recordsRes]) {
          if (res.status === 401 || res.status === 403) {
            throw new Error('Authentication failed. Please log in again.');
          }
           if (!res.ok) {
            throw new Error(`A network request failed: ${res.status}`);
          }
        }

        const totalCards = await totalRes.text();
        const activeCards = await activeRes.text();
        const inactiveCards = await inactiveRes.text();
        const recentyAdded = await recentlyRes.text();
        const userRecords = await recordsRes.json();

        setSummaryData({
          totalCards,
          activeCards,
          inactiveCards : `${parseFloat(inactiveCards)}%`,
          recentyAdded,
        });

        const trans = userRecords.map(temp => ({
          ...temp,
          active: temp.active ? "ACTIVE" : "INACTIVE"
        }))

        setUsers(trans);
        //setIsActive(users.active);
        // setStatusText(isActive ? "ACTIVE" : "INACTIVE");

      } catch (err) {
        console.error("Error fetching User/Card data:", err);
        if (err.message.includes('Authentication failed')) {
            localStorage.removeItem("token");
            navigate("/");
            return;
        }
        setUsers([]);
        setSummaryData({
        totalCards: 'Error',
        activeCards: 'Error',
        inactiveCards: 'Error',
        recentyAdded: 'Error',
      });
      } finally {
        setLoading(false);
      }
    };

    fetchSessionData();
  }, [navigate, refreshKey, baseUrl]);

  const handleCardRegistered = () => {
    setIsModalOpen(false);
    setRefreshKey(prevKey => prevKey + 1);
  };

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
          RFID Manager
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
                        
            Register
          </button>
      </div>

      {isModalOpen && (
        <Modal onClose={() => setIsModalOpen(false)}>
          <RegisterCard 
            onClose={() => setIsModalOpen(false)}
            onCardRegistered={handleCardRegistered}
            baseUrl = {baseUrl}
          />
        </Modal>
      )}

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
              <Card title="Total Cards" value={summaryData.totalCards} icon={totalIcon} />
              <Card title="Active Cards" value={summaryData.activeCards} icon={activeIcon} />
              <Card title="Inactive Cards" value={summaryData.inactiveCards} icon={uptimeIcon} />
              <Card title="Recently Added" value={summaryData.recentyAdded} icon={errorIcon} />
            </div>
          </div>

      {/* System Health Section */}

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
            Directory
          </h3>

          {loading ? (
            <LoadingSpinner />
          ) : users.length === 0 ? (
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
                  {["Name", "ID", "Status", "Registration Date", "Action"].map(
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
                {users.map((rec) => (
                  <tr key={rec.id} style={{backgroundColor: "#fff",borderRadius: "12px",}}>
                    <td style={{ padding: "12px" }}>{rec.user?.name || 'N/A'}</td>
                    <td style={{ padding: "12px" }}>{rec.cardNumber}</td>
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
                          color: rec.active === "ACTIVE" ? "#2E7D32" : "#D32F2F",
                          backgroundColor: rec.active === "ACTIVE" ? "#C8E6C9" : "#FFCDD2",
                        }}>
                        {rec.active}
                      </span>
                    </td>
                    <td style={{ padding: "12px" }}>{rec.createdAt ? `${new Date(rec.createdAt).toLocaleDateString()}` : 'N/A'}</td>
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

export default Users;
