import React, { useState, lazy, Suspense, useCallback } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Topbar from "../../components/admin/topbar";
import Sidebar from "../../components/admin/Sidebar";
import Card from "../../components/card/card.jsx";
import LogoutModal from "../../components/admin/LogoutModal";

const Stations = lazy(() => import("../pages/Admin/Stations"));
const Charger = lazy(() => import("../pages/Admin/Charger"));
const Sessions = lazy(() => import("../pages/Admin/Sessions"));
const Slot = lazy(() => import("../pages/Admin/Slot"));
const Users = lazy(() => import("../pages/Admin/Users"));

export default function Dashboard() {
  const [isSidebarOpen] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    setShowLogoutModal(true);
  }, []);

  const confirmLogout = useCallback(() => {
    setShowLogoutModal(false);
    localStorage.removeItem("token");
    navigate("/login");
  }, [navigate]);

  const cancelLogout = useCallback(() => {
    setShowLogoutModal(false);
  }, []);

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} />

      <div className="flex flex-col flex-1">
        {/* Topbar with logout handler */}
        <Topbar onLogout={handleLogout} />

        {/* Main Content */}
        <main className="flex-1 p-4 overflow-y-auto">
          <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
            <Routes>
              <Route path="/stations" element={<Stations />} />
              <Route path="/charger" element={<Charger />} />
              <Route path="/sessions" element={<Sessions />} />
              <Route path="/slot" element={<Slot />} />
              <Route path="/users" element={<Users />} />
              <Route path="/" element={<Card />} />
            </Routes>
          </Suspense>
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <LogoutModal onClose={cancelLogout} onConfirm={confirmLogout} />
      )}
    </div>
  );
}

