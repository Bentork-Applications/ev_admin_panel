// src/components/admin/Sidebar.jsx
import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

import dashboardIcon from "../../assets/icons/dasboard.svg";
import stationsIcon from "../../assets/icons/station.svg";
import chargerIcon from "../../assets/icons/charger.svg";
import sessionsIcon from "../../assets/icons/booking.svg";
import slotIcon from "../../assets/icons/slot.svg";
import usersIcon from "../../assets/icons/RFID.svg";
import plansIcon from "../../assets/icons/plans.svg";
import revenueIcon from "../../assets/icons/revenue.svg";
import maintenanceIcon from "../../assets/icons/maintenance.svg";
import staffIcon from "../../assets/icons/admin.svg";
import logoutIcon from "../../assets/icons/log.svg";

import LogoutModal from "../../components/admin/LogoutModal"; // ✅ your modal

export default function Sidebar({ onLogout }) {
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const menuItems = [
    { name: "Dashboard", icon: dashboardIcon, path: "/dashboard" },
    { name: "Stations & Locations", icon: stationsIcon, path: "/dashboard/stations" },
    { name: "Charger & QR Management", icon: chargerIcon, path: "/dashboard/charger" },
    { name: "Sessions / Bookings", icon: sessionsIcon, path: "/dashboard/sessions" },
    { name: "Slot Management", icon: slotIcon, path: "/dashboard/slot" },
    { name: "Users & RFID Cards", icon: usersIcon, path: "/dashboard/users" },
    { name: "Plans", icon: plansIcon, path: "/dashboard/plans" },
    { name: "Revenue & Transactions", icon: revenueIcon, path: "/dashboard/revenue" },
    { name: "Maintenance & Emergency", icon: maintenanceIcon, path: "/dashboard/maintenance" },
    { name: "Admin Staff", icon: staffIcon, path: "/dashboard/staff" },
  ];

  // 🔹 Open logout modal
  const handleLogoutClick = () => setShowLogoutModal(true);

  // 🔹 Confirm logout
  const confirmLogout = () => {
    setShowLogoutModal(false);
    if (typeof onLogout === "function") {
      onLogout(); // call parent handler
    } else {
      localStorage.removeItem("auth"); // or token
      navigate("/"); // redirect to login
    }
  };

  // 🔹 Cancel logout
  const cancelLogout = () => setShowLogoutModal(false);

  return (
    <>
      <aside
        style={{
          width: 235,
          minHeight: "100vh",
          background: "#fff",
          borderRight: "1px solid #e0e0e0",
          padding: "20px 10px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {menuItems.map((item, index) => (
          <NavLink
            key={index}
            to={item.path}
            end={item.path === "/dashboard"} // exact match for Dashboard only
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: "10px",
              height: 60,
              padding: "0 12px",
              borderTopRightRadius: 80,
              borderBottomRightRadius: 80,
              fontFamily: "Roboto, sans-serif",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease-in-out",
              backgroundColor: isActive ? "#000" : "transparent",
              color: isActive ? "#fff" : "#000",
              textDecoration: "none",
            })}
          >
            {({ isActive }) => (
              <>
                <img
                  src={item.icon}
                  alt={item.name}
                  style={{
                    width: 22,
                    height: 22,
                    objectFit: "contain",
                    filter: isActive ? "invert(1)" : "none",
                  }}
                />
                <span>{item.name}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Log out item with modal */}
        <div
          onClick={handleLogoutClick}
          style={{
            marginTop: "auto",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            height: 60,
            padding: "0 12px",
            borderTopRightRadius: 80,
            borderBottomRightRadius: 80,
            fontFamily: "Roboto, sans-serif",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <img
            src={logoutIcon}
            alt="Log Out"
            style={{ width: 22, height: 22, objectFit: "contain" }}
          />
          <span>Log Out</span>
        </div>
      </aside>

      {/* 🔹 Logout Modal */}
      {showLogoutModal && (
        <LogoutModal onClose={cancelLogout} onConfirm={confirmLogout} />
      )}
    </>
  );
}
