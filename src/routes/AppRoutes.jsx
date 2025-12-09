// pages/admin/Dashboard.jsx
import React, { useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Topbar from "../../components/admin/topbar";
import Sidebar from "../../components/admin/Sidebar";
import Card from "../../components/card/card.jsx";
import Stations from "./Stations";
import Charger from "./Charger";
import Sessions from "./Sessions";
import Slot from "./Slot";
import Users from "./Users";
import LogoutModal from "../../components/common/LogoutModal"; // ✅ import modal

export default function Dashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false); // ✅ state for modal
  const navigate = useNavigate();

  const handleLogout = () => {
    setShowLogoutModal(true); // ✅ show modal instead of direct logout
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    localStorage.removeItem("token"); // or your auth key
    navigate("/login"); // ✅ go to login page
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} />

      <div className="flex flex-col flex-1">
        {/* Topbar with logout handler */}
        <Topbar onLogout={handleLogout} />

        {/* Main Content */}
        <main className="flex-1 p-4 overflow-y-auto">
          <Routes>
            <Route path="/stations" element={<Stations />} />
            <Route path="/charger" element={<Charger />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="/slot" element={<Slot />} />
            <Route path="/users" element={<Users />} />
            <Route path="/" element={<Card />} />
          </Routes>
        </main>
      </div>

      {/* ✅ Logout Confirmation Modal */}
      {showLogoutModal && (
        <LogoutModal onClose={cancelLogout} onConfirm={confirmLogout} />
      )}
    </div>
  );
}
