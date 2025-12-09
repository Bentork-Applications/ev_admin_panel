import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Topbar from "../../components/admin/topbar";
import Sidebar from "../../components/admin/Sidebar";
import OverviewChart from "../../components/admin/OverviewChart";
import LogoutModal from "../../components/admin/LogoutModal";
import VectorIcon from "../../assets/icons/stafficon/Vector-3.svg";


// Pages
import Stations from "./Stations";
import Charger from "./Charger";
import Sessions from "./Sessions";
import Slot from "./Slot";
import Users from "./Users";
import Plans from "./Plans";
import Revenue from "./Revenue";
import Maintenance from "./Maintenance";
import AdminStaff from "./AdminStaff";

const LoadingSpinner = () => (
  <div style={{ textAlign: "center", padding: "50px", fontSize: "18px", color: "#555" }}>
    Loading data...
  </div>
);

export default function Dashboard({ onLogout }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showLogout, setShowLogout] = useState(false);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const baseUrl = "http://localhost:8080/api";

  const [dashboardCards, setDashboardCards] = useState([
    { title: "Total Users", value: "...", value1: "Fetching data...", icon: VectorIcon },
    { title: "Total Revenue", value: "...", value1: "Fetching data...", icon: VectorIcon },
    { title: "Sessions", value: "...", value1: "Fetching data...", icon: VectorIcon },
    { title: "Units Consumed", value: "...", value1: "Fetching data...", icon: VectorIcon },
  ]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      
      // const token = localStorage.getItem("token");
      // if (!token) {
      //   console.error("No token found, redirecting to login.");
      //   navigate("/");
      //   return;
      // }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const endpoints = {
        users: "/users/total",
        revenue: "/revenue/total",
        sessions: "/sessions/total",
        energy: "/sessions/energy",
      };

      try {
        const [users,revenue,sessions,energy] = await Promise.all([fetch(baseUrl + endpoints.users, { headers }),
                                                                  fetch(baseUrl + endpoints.revenue, { headers }),
                                                                  fetch(baseUrl + endpoints.sessions, { headers }),
                                                                  fetch(baseUrl + endpoints.energy, { headers }),
                                                                ]);
        for (const res of [users, revenue, sessions, energy]) {
          if (res.status === 401 || res.status === 403) {
            throw new Error('Authentication failed. Please log in again.');
          }
           if (!res.ok) {
            throw new Error(`A network request failed: ${res.status}`);
          }
        }

        const totalUsers = await users.text();
        const totalRevenue = await revenue.text();
        const totalSessions = await sessions.text();
        const energyConsumed = await energy.text();

        setDashboardCards([
          { 
            title: "Total Users", 
            value: totalUsers.toLocaleString('en-IN'),
            value1: "+23 from last month",
            icon: VectorIcon 
          },
          { 
            title: "Total Revenue", 
            value: `₹${totalRevenue.toLocaleString('en-IN')}`,
            value1: "+23 from last month",
            icon: VectorIcon 
          },
          { 
            title: "Sessions", 
            value: totalSessions.toLocaleString('en-IN'),
            value1: "+23 from last month",
            icon: VectorIcon 
          },
          { 
            title: "Units Consumed", 
            value: `${energyConsumed}kW`,
            value1: "+23 from last month",
            icon: VectorIcon 
          },
        ]);

      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        if (error.message.includes('Authentication')) {
            localStorage.removeItem("token");
            navigate("/");
            return;
        }
        setDashboardCards(prevCards => prevCards.map(card => ({
          ...card,
          value: "Error",
          value1: "Could not load data"
        })));
      }finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate]);

  const menuItems = [
    { name: "Dashboard", path: "" },
    { name: "Stations & Locations", path: "stations" },
    { name: "Charger & QR Management", path: "charger" },
    { name: "Sessions / Bookings", path: "sessions" },
    { name: "Slot Management", path: "slot" },
    { name: "Users & RFID Cards", path: "users" },
    { name: "Plans", path: "plans" },
    { name: "Revenue & Transactions", path: "revenue" },
    { name: "Maintenance & Emergency", path: "maintenance" },
    { name: "Admin Staff", path: "staff" },
    { name: "Log Out", path: null },
  ];

  const handleClick = (item) => {
    if (item.name === "Log Out") setShowLogout(true);
    else if (item.path) navigate(item.path);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setShowLogout(false);
    if (onLogout) onLogout();
    navigate("/login", { replace: true });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        fontFamily: "'Lexend', sans-serif",
      }}
    >
      <Topbar
        onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
        onLogout={() => setShowLogout(true)}
      />

      <div style={{ flex: 1, display: "flex" }}>
        <div
          style={{
            width: isSidebarOpen ? "250px" : "0px",
            transition: "width 0.3s",
            overflow: "hidden",
          }}
        >
          <Sidebar menuItems={menuItems} onItemClick={handleClick} />
        </div>

        <main
          style={{
            flex: 1,
            padding: "20px",
            margin: "10px",
            borderTopLeftRadius: "28px",
            background: "#F1F1F1",
            overflowY: "auto",
          }}
        >
          <Routes>
            <Route
              index
              element={
                <div>
                  <h1 className="text-2xl mb-4">Dashboard</h1>

                  {/* Cards Section */}
                  <div className="cards-container" style={{ display: "flex", gap: "15px" }}>
                    {dashboardCards.map((card, index) => (
                      <div
                        key={index}
                        className="card-box"
                        style={{
                          flex: 1,
                          maxWidth: "250px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          borderRadius: "14px",
                          padding: "18px 40px",
                          backgroundColor: "white",
                          border: "0.2px solid #ddd",
                          height: "90px",
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontSize: "12px", fontWeight: "400" }}>{card.title}</span>
                          <span style={{ fontSize: "24px", fontWeight: "500" }}>{card.value}</span>
                          <span style={{ fontSize: "12px", fontWeight: "400" }}>{card.value1}</span>
                        </div>
                        <img src={card.icon} alt={card.title} style={{ width: "22px", height: "22px" }} />
                      </div>
                    ))}
                  </div>

                  {/* ✅ Overview Chart Section */}
                  <OverviewChart />
                
                </div>
              }
            />
            <Route path="stations" element={<Stations baseUrl = {baseUrl} />} />
            <Route path="charger" element={<Charger baseUrl = {baseUrl} />} />
            <Route path="sessions" element={<Sessions baseUrl = {baseUrl} />} />
            <Route path="slot" element={<Slot />} />
            <Route path="users" element={<Users baseUrl = {baseUrl} />} />
            <Route path="plans" element={<Plans baseUrl = {baseUrl} />} />
            <Route path="revenue" element={<Revenue baseUrl = {baseUrl} />} />
            <Route path="maintenance" element={<Maintenance />} />
        


            <Route path="staff" element={<AdminStaff />} />
          </Routes>
 

        </main>
      </div>

      {showLogout && (
        <LogoutModal onClose={() => setShowLogout(false)} onConfirm={handleLogout} />
      )}
    </div>
  );
}
