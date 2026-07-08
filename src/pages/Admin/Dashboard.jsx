import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import Topbar from "../../components/admin/topbar";
import Sidebar from "../../components/admin/Sidebar";
import OverviewChart from "../../components/admin/OverviewChart";
import LogoutModal from "../../components/admin/LogoutModal";
import VectorIcon from "../../assets/icons/stafficon/Vector-3.svg";
import StationIcon from "../../assets/icons/station.svg";
import AdminIcon from "../../assets/icons/admin.svg";
import UserIcon from "../../assets/icons/users.svg";


// Pages
const Stations = React.lazy(() => import("./Stations"));
const Charger = React.lazy(() => import("./Charger"));
const Sessions = React.lazy(() => import("./Sessions"));
const Slot = React.lazy(() => import("./Slot"));
const Users = React.lazy(() => import("./Users"));
const Plans = React.lazy(() => import("./Plans"));
const Revenue = React.lazy(() => import("./Revenue"));
const Maintenance = React.lazy(() => import("./Maintenance"));
const MaintenanceDashboardPage = React.lazy(() => import("./MaintenanceDashboard"));
const AdminStaff = React.lazy(() => import("./AdminStaff"));
const SlotBookings = React.lazy(() => import("./SlotBookings"));
const Dealers = React.lazy(() => import("./Dealers"));
const LoginUsers = React.lazy(() => import("./LoginUsers"));
const DealerProfile = React.lazy(() => import("./DealerProfile"));
const CafeConfig = React.lazy(() => import("./CafeConfig"));
const SupportRequests = React.lazy(() => import("./SupportRequests"));
const Batteries = React.lazy(() => import("./Batteries"));
const WarrantyClaims = React.lazy(() => import("./WarrantyClaims"));

const LoadingSpinner = () => (
  <div className="loading-spinner">
    Loading data...
  </div>
);

export default function Dashboard({ onLogout }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showLogout, setShowLogout] = useState(false);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  let resolvedRole = localStorage.getItem("userRole") || "ADMIN";
  const token = localStorage.getItem("token");
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const authorities = [];
      if (Array.isArray(payload.authorities)) {
        authorities.push(...payload.authorities.map(a => String(a).toUpperCase()));
      } else if (typeof payload.authorities === "string") {
        authorities.push(payload.authorities.toUpperCase());
      }
      if (payload.role) authorities.push(String(payload.role).toUpperCase());
      if (payload.roles) {
        if (Array.isArray(payload.roles)) {
          authorities.push(...payload.roles.map(r => String(r).toUpperCase()));
        } else if (typeof payload.roles === "string") {
          authorities.push(payload.roles.toUpperCase());
        }
      }
      if (authorities.includes("DEALER")) {
        resolvedRole = "DEALER";
      } else if (authorities.includes("ADMIN_STAFF") || authorities.includes("ROLE_ADMIN_STAFF")) {
        resolvedRole = "ADMIN_STAFF";
      } else if (authorities.includes("ADMINISTRATOR") || authorities.includes("ADMIN") || authorities.includes("ROLE_ADMIN")) {
        resolvedRole = "ADMIN";
      }
      localStorage.setItem("userRole", resolvedRole);
    } catch (e) {
      console.error("Dashboard token decode failed:", e);
    }
  }

  const rawRole = resolvedRole.toUpperCase();
  const userRole = (rawRole === "ADMINISTRATOR" || rawRole === "ADMIN") ? "ADMIN" : rawRole;
  const isDealer = userRole === "DEALER";
  const baseUrl = import.meta.env.VITE_API_URL;

  const isAdminStaff = userRole === "ADMIN_STAFF";
  let allowedPages = [];
  if (isAdminStaff && token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const email = payload.sub;
      const stored = localStorage.getItem("staff_page_access_" + email);
      if (stored) {
        allowedPages = JSON.parse(stored);
      } else {
        allowedPages = ["batteries", "warranty-claims", "maintenance", "support-requests"];
      }
    } catch (e) {
      console.error("Dashboard allowed pages error:", e);
      allowedPages = ["batteries", "warranty-claims", "maintenance", "support-requests"];
    }
  }

  const [dashboardCards, setDashboardCards] = useState(() => {
    if (localStorage.getItem("userRole") === "ADMIN_STAFF") {
      let allowed = ["batteries", "warranty-claims", "maintenance", "support-requests"];
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const email = payload.sub;
          const stored = localStorage.getItem("staff_page_access_" + email);
          if (stored) allowed = JSON.parse(stored);
        } catch (e) {}
      }
      const cards = [];
      if (allowed.includes("batteries")) {
        cards.push(
          { title: "Registered Batteries", value: "...", value1: "Fetching data...", icon: StationIcon },
          { title: "Active Warranties", value: "...", value1: "Fetching data...", icon: VectorIcon }
        );
      }
      if (allowed.includes("warranty-claims")) {
        cards.push(
          { title: "Total Claims", value: "...", value1: "Fetching data...", icon: VectorIcon },
          { title: "Pending Claims", value: "...", value1: "Fetching data...", icon: VectorIcon },
          { title: "Under Service", value: "...", value1: "Fetching data...", icon: VectorIcon }
        );
      }
      return cards;
    }
    return [
      { title: "Total Users", value: "...", value1: "Fetching data...", icon: VectorIcon, hidden: isDealer },
      { title: "Total Revenue", value: "...", value1: "Fetching data...", icon: VectorIcon },
      { title: "Total Sessions", value: "...", value1: "Fetching data...", icon: VectorIcon },
      { title: "Stations", value: "...", value1: "Fetching data...", icon: StationIcon },
      { title: "Units Consumed", value: "...", value1: "Fetching data...", icon: VectorIcon, hidden: isDealer },
      { title: "Total Dealers", value: "...", value1: "Fetching data...", icon: UserIcon, hidden: isDealer },
      { title: "Total Staff", value: "...", value1: "Fetching data...", icon: AdminIcon, hidden: isDealer },
    ];
  });

  const getCardValue = (title) => {
    const card = dashboardCards.find(c => c.title === title);
    return card ? card.value : null;
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);

      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/");
        return;
      }

      // Decode JWT to extract email and check suspension status
      let email = "";
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        email = payload.sub;
      } catch (decodeErr) {
        console.error("Failed to decode token for email:", decodeErr);
      }

      if (email) {
        try {
          const listResponse = await fetch(`${baseUrl}/admin/alladmin`, {
            method: "GET",
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            }
          });
          if (listResponse.ok) {
            const adminsList = await listResponse.json();
            const currentAdmin = adminsList.find(admin => admin.email === email);
            if (currentAdmin) {
              const overrides = JSON.parse(localStorage.getItem("admin_staff_status") || "{}");
              const status = overrides[currentAdmin.id] || currentAdmin.status || "Active";
              if (status === "Suspended") {
                localStorage.removeItem("token");
                localStorage.removeItem("userRole");
                alert("Your account is suspended. Please contact the administrator.");
                navigate("/");
                return;
              }
            }
          }
        } catch (err) {
          console.error("Failed to fetch admin list for status check in dashboard:", err);
        }
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      if (isDealer) {
        // Dealer-specific summary endpoint
        try {
          const [dashRes, revRes, stationsRes] = await Promise.all([
            fetch(`${baseUrl}/dealer/dashboard`, { headers }),
            fetch(`${baseUrl}/dealer/revenue`, { headers }),
            fetch(`${baseUrl}/dealer/stations`, { headers })
          ]);

          if (!dashRes.ok) throw new Error("Failed to fetch dealer dashboard");

          const data = await dashRes.json();
          const revenueRecords = await revRes.json().catch(() => []);
          const dealerStations = await stationsRes.json().catch(() => []);

          let calculatedTotalRev = 0;
          if (Array.isArray(revenueRecords) && Array.isArray(dealerStations)) {
            const validStationIds = dealerStations.map(s => s.id?.toString());
            calculatedTotalRev = revenueRecords.reduce((sum, r) => {
              if (validStationIds.includes(r.stationId?.toString()) && r.paymentStatus === 'success') {
                return sum + (parseFloat(r.amount) || 0);
              }
              return sum;
            }, 0);
          }

          setDashboardCards([
            { title: "Total Revenue", value: `₹${calculatedTotalRev.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || 0}`, value1: "Assigned stations", icon: VectorIcon },
            { title: "Total Sessions", value: data.totalSessions?.toLocaleString('en-IN') || 0, value1: "Total activity", icon: VectorIcon },
            { title: "Stations", value: data.totalStations?.toLocaleString('en-IN') || 0, value1: "Assigned stations", icon: StationIcon },
            { title: "Chargers", value: data.totalChargers?.toLocaleString('en-IN') || 0, value1: "Available units", icon: VectorIcon },
          ]);
        } catch (err) {
          console.error("Dealer dashboard fetch error:", err);
        }
      } else if (isAdminStaff) {
        // Fetch Admin Staff metrics
        try {
          let claims = [];
          let batteries = [];
          
          const promises = [];
          if (allowedPages.includes("warranty-claims")) {
            promises.push(
              fetch(`${baseUrl}/warranty-claims/admin/all`, { headers })
                .then(res => res.ok ? res.json() : [])
                .then(data => { claims = data; })
                .catch(e => console.error("Error fetching claims:", e))
            );
          }
          if (allowedPages.includes("batteries")) {
            promises.push(
              fetch(`${baseUrl}/battery-data/admin/all`, { headers })
                .then(res => res.ok ? res.json() : [])
                .then(data => { batteries = data; })
                .catch(e => console.error("Error fetching batteries:", e))
            );
          }

          if (promises.length > 0) {
            await Promise.all(promises);
          }

          const cards = [];
          if (allowedPages.includes("batteries")) {
            const totalBatteries = batteries.length;
            const activeWarranties = batteries.filter(b => b.warrantyActive).length;
            cards.push(
              { title: "Registered Batteries", value: totalBatteries.toLocaleString('en-IN'), value1: "Battery inventory", icon: StationIcon },
              { title: "Active Warranties", value: activeWarranties.toLocaleString('en-IN'), value1: "In warranty period", icon: VectorIcon }
            );
          }
          if (allowedPages.includes("warranty-claims")) {
            const totalClaims = claims.length;
            const pendingClaims = claims.filter(c => c.status === "request_created").length;
            const underService = claims.filter(c => ["approved", "product_received", "processing", "completed"].includes(c.status)).length;
            cards.push(
              { title: "Total Claims", value: totalClaims.toLocaleString('en-IN'), value1: "Warranty claims submitted", icon: VectorIcon },
              { title: "Pending Claims", value: pendingClaims.toLocaleString('en-IN'), value1: "Requires review", icon: VectorIcon },
              { title: "Under Service", value: underService.toLocaleString('en-IN'), value1: "In service center", icon: VectorIcon }
            );
          }
          setDashboardCards(cards);
        } catch (err) {
          console.error("Admin Staff dashboard fetch error:", err);
        }
      } else {
        // Admin summary endpoints
        const endpoints = {
          users: "/user/total",
          revenue: "/revenue/total",
          sessions: "/sessions/all/records",
          stations: "/stations/total",
          energy: "/sessions/energy",
        };

        const fetchCardData = async (type, index, transform = (v) => v) => {
          try {
            const res = await fetch(baseUrl + endpoints[type], { headers });
            if (res.status === 401) throw new Error('Authentication failed');
            if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
            const text = await res.text();

            let rawVal = text;
            try {
              const parsed = JSON.parse(text);
              if (Array.isArray(parsed)) {
                rawVal = parsed.length;
              }
            } catch (e) {
              // Not a JSON array, use text
            }
            const val = transform(rawVal);

            setDashboardCards(prev => {
              const newCards = [...prev];
              newCards[index] = { ...newCards[index], value: val, value1: "Current status" };
              return newCards;
            });
          } catch (error) {
            console.error(`Failed to fetch ${type}:`, error);
            if (error.message === 'Authentication failed') {
              localStorage.removeItem("token");
              navigate("/");
            }
          }
        };

        const fetchStaffAndDealers = async () => {
          try {
            const res = await fetch(`${baseUrl}/admin/alladmin`, { headers });
            if (res.status === 401) throw new Error('Authentication failed');
            if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
            const data = await res.json();
            const allAdmins = Array.isArray(data) ? data : [];
            const dealersCount = allAdmins.filter(a => a.role === "DEALER" || a.role === "dealer").length;
            const staffCount = allAdmins.filter(a => a.role === "ADMIN" || a.role === "admin" || a.role === "ADMIN_STAFF" || a.role === "admin_staff").length;

            setDashboardCards(prev => {
              const newCards = [...prev];
              if (newCards[5]) {
                newCards[5] = { ...newCards[5], value: dealersCount.toLocaleString('en-IN'), value1: "Registered dealers" };
              }
              if (newCards[6]) {
                newCards[6] = { ...newCards[6], value: staffCount.toLocaleString('en-IN'), value1: "System staff" };
              }
              return newCards;
            });
          } catch (error) {
            console.error("Failed to fetch staff and dealers:", error);
            if (error.message === 'Authentication failed') {
              localStorage.removeItem("token");
              navigate("/");
            }
          }
        };

        fetchCardData("users", 0, (v) => parseInt(v).toLocaleString('en-IN'));
        fetchCardData("revenue", 1, (v) => `₹${parseInt(v).toLocaleString('en-IN')}`);
        fetchCardData("sessions", 2, (v) => parseInt(v).toLocaleString('en-IN'));
        fetchCardData("stations", 3, (v) => parseInt(v).toLocaleString('en-IN'));
        fetchCardData("energy", 4, (v) => `${parseFloat(v).toFixed(2)}kW`);
        fetchStaffAndDealers();
      }

      setLoading(false);
    };

    fetchDashboardData();
  }, [navigate, isDealer, isAdminStaff]);

  const allMenuItems = [
    { name: "Dashboard", path: "", roles: ["ADMIN", "DEALER", "ADMIN_STAFF"] },
    { name: "Battery Inventory", path: "batteries", roles: ["ADMIN", "ADMIN_STAFF"] },
    { name: "Warranty Claims", path: "warranty-claims", roles: ["ADMIN", "ADMIN_STAFF"] },
    { name: "Stations & Locations", path: "stations", roles: ["ADMIN", "DEALER"] },
    { name: "Charger & QR Management", path: "charger", roles: ["ADMIN", "DEALER"] },
    { name: "Sessions / Bookings", path: "sessions", roles: ["ADMIN", "DEALER"] },
    { name: "Slot Management", path: "slot", roles: ["ADMIN"] },
    { name: "Slot Bookings", path: "slot-bookings", roles: ["ADMIN"] },
    { name: "Users & RFID Cards", path: "users", roles: ["ADMIN"] },
    { name: "Login Users", path: "login-users", roles: ["ADMIN"] },
    { name: "Plans", path: "plans", roles: ["ADMIN"] },
    { name: "Revenue & Transactions", path: "revenue", roles: ["ADMIN", "DEALER"] },
    { name: "Maintenance & Emergency", path: "maintenance", roles: ["ADMIN", "DEALER"] },
    { name: "Raise Request", path: "support-requests", roles: ["ADMIN", "DEALER"] },
    { name: "Admin Staff", path: "staff", roles: ["ADMIN"] },
    { name: "Dealers Management", path: "dealers", roles: ["ADMIN"] },
    { name: "Café Configuration", path: "cafes", roles: ["ADMIN"] },
    { name: "Dealer Profile", path: "profile", roles: ["DEALER"] },
    { name: "Log Out", path: null, roles: ["ADMIN", "DEALER", "ADMIN_STAFF"] },
  ];

  const menuItems = allMenuItems.filter(item => {
    if (userRole === "ADMIN_STAFF") {
      if (item.path === "" || item.path === null) return true;
      return allowedPages.includes(item.path);
    }
    return item.roles.includes(userRole);
  });

  const handleClick = (item) => {
    if (item.name === "Log Out") setShowLogout(true);
    else if (item.path !== null) navigate(item.path);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    setShowLogout(false);
    if (onLogout) onLogout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="dashboard-container">
      <style>
        {`
            .loading-spinner { text-align: center; padding: 50px; font-size: 18px; color: #555; }
            .dashboard-container { display: flex; flex-direction: column; height: 100vh; font-family: 'Lexend', sans-serif; overflow: hidden; }
            .content-wrapper { flex: 1; display: flex; overflow: hidden; }
            .sidebar-wrapper { transition: width 0.3s; height: 100%; display: flex; flex-direction: column; }
            .sidebar-open { width: 250px; }
            .sidebar-closed { width: 0px; }
            .main-content { flex: 1; min-height: 0; padding: 20px; margin: 10px; border-top-left-radius: 28px; background: #F1F1F1; overflow-y: auto; }
            .page-title { font-size: 24px; margin-bottom: 16px; font-weight: 500; }
            .cards-container { display: flex; gap: 15px; flex-wrap: wrap; }
            .card-box { flex: 1; min-width: 220px; max-width: 280px; display: flex; align-items: center; justify-content: space-between; border-radius: 14px; padding: 18px 24px; background-color: white; border: 0.2px solid #ddd; height: 100px; }
            .card-content { display: flex; flex-direction: column; }
            .card-title { font-size: 12px; font-weight: 400; color: #666; }
            .card-value { font-size: 24px; font-weight: 500; margin: 4px 0; }
            .card-subtext { font-size: 11px; font-weight: 400; color: #888; }
            .card-icon { width: 22px; height: 22px; opacity: 0.7; }
            .overview-map-section { display: flex; gap: 20px; margin-top: 20px; }
            .overview-chart-container { flex: 2; }
            .map-container { flex: 1; background-color: white; border-radius: 16px; padding: 24px; border: 1px solid #e5e7eb; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }
            .map-title { font-size: 18px; font-weight: 600; margin-bottom: 12px; }
            .map-description { color: #6b7280; font-size: 14px; }
            `}
      </style>
      <Topbar
        onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
        onLogout={() => setShowLogout(true)}
      />

      <div className="content-wrapper">
        <div className={`sidebar-wrapper ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
          <Sidebar userRole={userRole} onLogout={() => setShowLogout(true)} baseUrl={baseUrl} />
        </div>

        <main className="main-content">
          <React.Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route
                index
                element={
                  <div>
                    <h1 className="page-title">{isDealer ? "Dealer Dashboard" : isAdminStaff ? "Staff Dashboard" : "Admin Dashboard"}</h1>

                    <div className="cards-container">
                      {dashboardCards.filter(c => !c.hidden).map((card, index) => (
                        <div key={index} className="card-box">
                          <div className="card-content">
                            <span className="card-title">{card.title}</span>
                            <span className="card-value">{card.value}</span>
                            <span className="card-subtext">{card.value1}</span>
                          </div>
                          <img src={card.icon} alt={card.title} className="card-icon" />
                        </div>
                      ))}
                    </div>

                    {!isAdminStaff && (
                      <div className="overview-map-section">
                        <div className="overview-chart-container">
                          <OverviewChart
                            users={!isDealer ? getCardValue("Total Users") : null}
                            revenue={getCardValue("Total Revenue")}
                            sessions={getCardValue("Total Sessions")}
                            energy={!isDealer ? getCardValue("Units Consumed") : null}
                          />
                        </div>
                        {!isDealer && (
                          <div className="map-container">
                            <h3 className="map-title">Station Overview</h3>
                            <p className="map-description">Map shows status of the stations like Active, Idle, Offline/Faulty, etc.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                }
              />

              {/* Role Protected Routes */}
              {userRole === "ADMIN" && (
                <>
                  <Route path="stations" element={<Stations baseUrl={baseUrl} userRole={userRole} />} />
                  <Route path="charger" element={<Charger baseUrl={baseUrl} userRole={userRole} />} />
                  <Route path="sessions" element={<Sessions baseUrl={baseUrl} userRole={userRole} />} />
                  <Route path="revenue" element={<Revenue baseUrl={baseUrl} userRole={userRole} />} />
                  <Route path="maintenance" element={<Maintenance baseUrl={baseUrl} userRole={userRole} />} />
                  <Route path="maintenance-dashboard" element={<MaintenanceDashboardPage baseUrl={baseUrl} />} />
                  <Route path="support-requests" element={<SupportRequests baseUrl={baseUrl} userRole={userRole} />} />
                  <Route path="slot" element={<Slot baseUrl={baseUrl} />} />
                  <Route path="slot-bookings" element={<SlotBookings baseUrl={baseUrl} />} />
                  <Route path="users" element={<Users baseUrl={baseUrl} />} />
                  <Route path="login-users" element={<LoginUsers baseUrl={baseUrl} />} />
                  <Route path="plans" element={<Plans baseUrl={baseUrl} />} />
                  <Route path="staff" element={<AdminStaff baseUrl={baseUrl} />} />
                  <Route path="dealers" element={<Dealers baseUrl={baseUrl} />} />
                  <Route path="cafes" element={<CafeConfig baseUrl={baseUrl} />} />
                  <Route path="batteries" element={<Batteries baseUrl={baseUrl} />} />
                  <Route path="warranty-claims" element={<WarrantyClaims baseUrl={baseUrl} />} />
                </>
              )}

              {isAdminStaff && (
                <>
                  {allowedPages.includes("batteries") && <Route path="batteries" element={<Batteries baseUrl={baseUrl} />} />}
                  {allowedPages.includes("warranty-claims") && <Route path="warranty-claims" element={<WarrantyClaims baseUrl={baseUrl} />} />}
                  {allowedPages.includes("maintenance") && (
                    <>
                      <Route path="maintenance" element={<Maintenance baseUrl={baseUrl} userRole={userRole} />} />
                      <Route path="maintenance-dashboard" element={<MaintenanceDashboardPage baseUrl={baseUrl} />} />
                    </>
                  )}
                  {allowedPages.includes("support-requests") && <Route path="support-requests" element={<SupportRequests baseUrl={baseUrl} userRole={userRole} />} />}
                  {allowedPages.includes("stations") && <Route path="stations" element={<Stations baseUrl={baseUrl} userRole={userRole} />} />}
                  {allowedPages.includes("charger") && <Route path="charger" element={<Charger baseUrl={baseUrl} userRole={userRole} />} />}
                  {allowedPages.includes("sessions") && <Route path="sessions" element={<Sessions baseUrl={baseUrl} userRole={userRole} />} />}
                  {allowedPages.includes("slot") && <Route path="slot" element={<Slot baseUrl={baseUrl} />} />}
                  {(allowedPages.includes("slot-bookings") || allowedPages.includes("slot")) && <Route path="slot-bookings" element={<SlotBookings baseUrl={baseUrl} />} />}
                  {allowedPages.includes("users") && <Route path="users" element={<Users baseUrl={baseUrl} />} />}
                  {allowedPages.includes("login-users") && <Route path="login-users" element={<LoginUsers baseUrl={baseUrl} />} />}
                  {allowedPages.includes("plans") && <Route path="plans" element={<Plans baseUrl={baseUrl} />} />}
                  {allowedPages.includes("revenue") && <Route path="revenue" element={<Revenue baseUrl={baseUrl} userRole={userRole} />} />}
                  {allowedPages.includes("staff") && <Route path="staff" element={<AdminStaff baseUrl={baseUrl} />} />}
                  {allowedPages.includes("dealers") && <Route path="dealers" element={<Dealers baseUrl={baseUrl} />} />}
                  {allowedPages.includes("cafes") && <Route path="cafes" element={<CafeConfig baseUrl={baseUrl} />} />}
                </>
              )}

              {isDealer && (
                <>
                  <Route path="stations" element={<Stations baseUrl={baseUrl} userRole={userRole} />} />
                  <Route path="charger" element={<Charger baseUrl={baseUrl} userRole={userRole} />} />
                  <Route path="sessions" element={<Sessions baseUrl={baseUrl} userRole={userRole} />} />
                  <Route path="revenue" element={<Revenue baseUrl={baseUrl} userRole={userRole} />} />
                  <Route path="maintenance" element={<Maintenance baseUrl={baseUrl} userRole={userRole} />} />
                  <Route path="support-requests" element={<SupportRequests baseUrl={baseUrl} userRole={userRole} />} />
                  <Route path="profile" element={<DealerProfile />} />
                </>
              )}

              {/* Catch-all for unauthorized routes */}
              <Route path="*" element={<Navigate to="" replace />} />
            </Routes>
          </React.Suspense>
        </main>
      </div>

      {showLogout && (
        <LogoutModal onClose={() => setShowLogout(false)} onConfirm={handleLogout} />
      )}
    </div>
  );
}
