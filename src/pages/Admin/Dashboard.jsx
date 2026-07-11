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

const AnimatedNumber = ({ value }) => {
  const [displayValue, setDisplayValue] = useState("0");

  useEffect(() => {
    if (value === undefined || value === null || value === "...") {
      setDisplayValue("...");
      return;
    }

    const cleanStr = value.toString();
    const prefixMatch = cleanStr.match(/^[^\d]*/);
    const suffixMatch = cleanStr.match(/[^\d]*$/);
    const prefix = prefixMatch ? prefixMatch[0] : "";
    const suffix = suffixMatch ? suffixMatch[0] : "";
    const numericStr = cleanStr.replace(/[^\d.]/g, "");
    const targetValue = parseFloat(numericStr);

    if (isNaN(targetValue)) {
      setDisplayValue(value);
      return;
    }

    const decimalPlaces = (numericStr.split(".")[1] || "").length;

    let startTimestamp = null;
    const duration = 1000; // Animation duration: 1 second

    let animationFrameId;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = progress * (2 - progress); // Easing out quadratic
      const currentVal = easeProgress * targetValue;

      let formattedVal = currentVal.toFixed(decimalPlaces);
      if (decimalPlaces === 0) {
        formattedVal = parseInt(formattedVal).toLocaleString('en-IN');
      } else {
        formattedVal = parseFloat(formattedVal).toLocaleString('en-IN', {
          minimumFractionDigits: decimalPlaces,
          maximumFractionDigits: decimalPlaces
        });
      }

      setDisplayValue(`${prefix}${formattedVal}${suffix}`);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [value]);

  return <span>{displayValue}</span>;
};

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
        } catch (e) { }
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

        await Promise.all([
          fetchCardData("users", 0, (v) => parseInt(v).toLocaleString('en-IN')),
          fetchCardData("revenue", 1, (v) => `₹${parseInt(v).toLocaleString('en-IN')}`),
          fetchCardData("sessions", 2, (v) => parseInt(v).toLocaleString('en-IN')),
          fetchCardData("stations", 3, (v) => parseInt(v).toLocaleString('en-IN')),
          fetchCardData("energy", 4, (v) => `${parseFloat(v).toFixed(2)}kW`),
          fetchStaffAndDealers()
        ]);
      }

      setLoading(false);
    };

    fetchDashboardData();
  }, [navigate, isDealer, isAdminStaff]);

  const getCardIcon = (title) => {
    const t = title.toLowerCase();
    if (t.includes("user")) {
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="card-icon-svg">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    }
    if (t.includes("revenue")) {
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="card-icon-svg">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    }
    if (t.includes("session")) {
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="card-icon-svg">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </svg>
      );
    }
    if (t.includes("station")) {
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="card-icon-svg">
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
          <line x1="12" y1="18" x2="12" y2="18.01" />
          <path d="M10 6h4v8h-4z" />
        </svg>
      );
    }
    if (t.includes("units") || t.includes("energy") || t.includes("consum")) {
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="card-icon-svg">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    }
    if (t.includes("dealer")) {
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="card-icon-svg">
          <path d="M17 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
        </svg>
      );
    }
    if (t.includes("staff")) {
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="card-icon-svg">
          <path d="M17 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          <path d="M21 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M20 3.13a4 4 0 0 1 0 7.75" />
          <path d="M9 21v-2a4 4 0 0 0-4-4H3a4 4 0 0 0-4 4v2" />
          <circle cx="6" cy="7" r="3" />
        </svg>
      );
    }
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="card-icon-svg">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    );
  };

  const allMenuItems = [
    { name: "Dashboard", path: "", roles: ["ADMIN", "DEALER", "ADMIN_STAFF"] },
    { name: "Battery Inventory", path: "batteries", roles: ["ADMIN", "ADMIN_STAFF"] },
    { name: "Warranty Claims", path: "warranty-claims", roles: ["ADMIN", "ADMIN_STAFF"] },
    { name: "Stations & Locations", path: "stations", roles: ["ADMIN", "DEALER"] },
    { name: "Charger & QR Management", path: "charger", roles: ["ADMIN", "DEALER"] },
    { name: "Session History", path: "sessions", roles: ["ADMIN", "DEALER"] },
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

  const cardRouteMap = {
    "total users": "login-users",
    "total revenue": "revenue",
    "total sessions": "sessions",
    "stations": "stations",
    "total dealers": "dealers",
    "total staff": "staff",
    "chargers": "charger",
    "registered batteries": "batteries",
    "active warranties": "batteries",
    "total claims": "warranty-claims",
    "pending claims": "warranty-claims",
    "under service": "warranty-claims"
  };

  const isPathAllowed = (path) => {
    if (!path) return false;
    if (userRole === "ADMIN_STAFF") {
      return allowedPages.includes(path);
    }
    const menuItem = allMenuItems.find(item => item.path === path);
    if (!menuItem) return false;
    return menuItem.roles.includes(userRole);
  };

  const handleCardClick = (cardTitle) => {
    const path = cardRouteMap[cardTitle.toLowerCase().trim()];
    if (path && isPathAllowed(path)) {
      navigate(path);
    }
  };

  const handleQuickAction = (action) => {
    if (action === "Add Station" && isPathAllowed("stations")) {
      navigate("stations", { state: { openAddModal: true } });
    } else if (action === "Register Dealer" && isPathAllowed("dealers")) {
      navigate("dealers", { state: { openAddModal: true } });
    } else if (action === "Add User" && isPathAllowed("staff")) {
      navigate("staff", { state: { openAddForm: true } });
    } else if (action === "Raise Ticket" && isPathAllowed("support-requests")) {
      navigate("support-requests", { state: { openCreateModal: true } });
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

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
            .dashboard-container { display: flex; flex-direction: column; height: 100vh; font-family: 'Inter', sans-serif; overflow: hidden; }
            .content-wrapper { flex: 1; display: flex; overflow: hidden; }
            .sidebar-wrapper { transition: width 0.3s; height: 100%; display: flex; flex-direction: column; }
            .sidebar-open { width: 250px; }
            .sidebar-closed { width: 0px; }
            .main-content { flex: 1; min-height: 0; padding: 24px; margin: 10px; border-top-left-radius: 28px; background: #F9FAFB; overflow-y: auto; }
            .page-title { font-size: 28px; margin-bottom: 16px; font-weight: 700; color: #111827; }
            .cards-container { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 24px; }
            @media (max-width: 1200px) { .cards-container { grid-template-columns: repeat(2, 1fr); } }
            @media (max-width: 768px) { .cards-container { grid-template-columns: 1fr; } }
            .card-box { display: flex; align-items: center; background: #ffffff; border: 1px solid #E5E7EB; border-radius: 12px; padding: 18px 20px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02); cursor: pointer; transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1); }
            .card-box:hover { transform: translateY(-4px) scale(1.02); box-shadow: 0 12px 24px rgba(0, 0, 0, 0.06); border-color: #27C786; }
            .card-icon-circle { width: 48px; height: 48px; border-radius: 50%; background: rgba(39, 199, 134, 0.08); display: flex; align-items: center; justify-content: center; margin-right: 16px; flex-shrink: 0; }
            .card-icon-svg { width: 22px; height: 22px; color: #27C786; opacity: 0.85; }
            .card-info-group { display: flex; flex-direction: column; flex: 1; }
            .card-box-title { font-size: 13px; color: #6B7280; font-weight: 500; margin-bottom: 4px; }
            .card-box-value { font-size: 24px; font-weight: 700; color: #111827; line-height: 1.2; }
            .card-box-subtext { font-size: 11px; color: #05B86B; margin-top: 4px; font-weight: 500; }
            .card-box-arrow { display: flex; align-items: center; justify-content: center; color: #05B86B; font-size: 22px; font-weight: 600; margin-left: auto; transition: transform 0.3s ease; }
            .card-box:hover .card-box-arrow { transform: translateX(3px) translateY(-3px); }
            .middle-section-grid { display: grid; grid-template-columns: 7fr 3fr; gap: 20px; margin-bottom: 20px; align-items: start; }
            @media (max-width: 1024px) { .middle-section-grid { grid-template-columns: 1fr; } }
            .quick-actions-card { background: #ffffff; border: 1px solid #E5E7EB; border-radius: 12px; padding: 24px; display: flex; flex-direction: column; box-sizing: border-box; margin-top: 20px; }
            .quick-actions-card h3 { font-size: 16px; font-weight: 600; color: #111827; margin: 0 0 20px 0; }
            .action-buttons-list { display: flex; flex-direction: column; gap: 12px; }
            .action-btn-item { width: 100%; height: 46px; border: 1px solid #27C786; background: transparent; color: #27C786; font-size: 14px; font-weight: 500; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1); font-family: inherit; position: relative; overflow: hidden; }
            .action-btn-item:hover { background: rgba(39, 199, 134, 0.08); transform: translateY(-2px) scale(1.02); box-shadow: 0 4px 12px rgba(39, 199, 134, 0.1); }
            .action-btn-item:active { transform: translateY(0) scale(0.96); background: rgba(39, 199, 134, 0.15); }

            /* Premium Animations & Skeletons */
            @keyframes fadeInUp {
              from {
                opacity: 0;
                transform: translateY(16px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            .animated-fade-in {
              opacity: 0;
              animation: fadeInUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }

            .skeleton-shimmer {
              background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
              background-size: 200% 100%;
              animation: skeleton-shimmer-animation 1.5s infinite linear;
            }
            @keyframes skeleton-shimmer-animation {
              0% { background-position: 200% 0; }
              100% { background-position: -200% 0; }
            }
            
            .skeleton-card {
              height: 90px;
              border-radius: 12px;
              background: white;
              border: 1px solid #E5E7EB;
              padding: 18px 20px;
              display: flex;
              align-items: center;
              box-sizing: border-box;
            }
            .skeleton-card-icon {
              width: 48px;
              height: 48px;
              border-radius: 50%;
              margin-right: 16px;
              flex-shrink: 0;
            }
            .skeleton-card-info {
              flex: 1;
              display: flex;
              flex-direction: column;
              gap: 8px;
            }
            .skeleton-text-sm {
              height: 12px;
              width: 50%;
              border-radius: 4px;
            }
            .skeleton-text-lg {
              height: 24px;
              width: 35%;
              border-radius: 4px;
            }
            .skeleton-text-xs {
              height: 10px;
              width: 60%;
              border-radius: 4px;
            }
            
            .skeleton-chart-container {
              height: 380px;
              background: white;
              border: 1px solid #E5E7EB;
              border-radius: 16px;
              padding: 24px;
              display: flex;
              flex-direction: column;
              gap: 16px;
              box-sizing: border-box;
            }
            .skeleton-chart-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .skeleton-chart-title {
              height: 18px;
              width: 100px;
              border-radius: 4px;
            }
            .skeleton-chart-dropdown {
              height: 28px;
              width: 150px;
              border-radius: 6px;
            }
            .skeleton-chart-body {
              flex: 1;
              border-radius: 8px;
            }
            
            .skeleton-quick-actions {
              background: #ffffff;
              border: 1px solid #E5E7EB;
              border-radius: 12px;
              padding: 24px;
              height: 250px;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              gap: 16px;
              margin-top: 20px;
            }
            .skeleton-quick-title {
              height: 16px;
              width: 120px;
              border-radius: 4px;
            }
            .skeleton-quick-btn {
              height: 46px;
              border-radius: 8px;
              width: 100%;
            }

            .skeleton-bottom-card {
              background: #ffffff;
              border: 1px solid #E5E7EB;
              border-radius: 12px;
              padding: 24px;
              height: 240px;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              gap: 16px;
            }
            .bottom-section-grid { display: grid; grid-template-columns: 6fr 4fr; gap: 20px; margin-top: 20px; align-items: start; }
            @media (max-width: 1024px) { .bottom-section-grid { grid-template-columns: 1fr; } }
            .activity-card { background: #ffffff; border: 1px solid #E5E7EB; border-radius: 12px; padding: 24px; box-sizing: border-box; }
            .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
            .card-header h3 { font-size: 16px; font-weight: 600; color: #111827; margin: 0; }
            .view-all-btn { background: transparent; border: none; color: #27C786; font-size: 13px; font-weight: 600; cursor: pointer; padding: 0; outline: none; }
            .view-all-btn:hover { text-decoration: underline; }
            .activity-list { display: flex; flex-direction: column; }
            .activity-item { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid #F3F4F6; }
            .activity-item:last-child { border-bottom: none; padding-bottom: 0; }
            .activity-text { font-size: 14px; color: #111827; font-weight: 500; }
            .activity-time { font-size: 12px; color: #6B7280; font-weight: 500; }
            .status-card { background: #ffffff; border: 1px solid #E5E7EB; border-radius: 12px; padding: 24px; display: flex; flex-direction: column; box-sizing: border-box; }
            .status-indicator { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #27C786; font-weight: 600; }
            .status-dot { width: 8px; height: 8px; background: #27C786; border-radius: 50%; display: inline-block; }
            .status-list { display: flex; flex-direction: column; gap: 16px; margin-bottom: 20px; }
            .status-item { display: flex; justify-content: space-between; align-items: center; }
            .status-item-left { display: flex; align-items: center; gap: 10px; font-size: 14px; color: #111827; font-weight: 500; }
            .status-item-icon { color: #27C786; }
            .status-value-label { font-size: 12px; color: #27C786; font-weight: 500; }
            .status-details-link { background: transparent; border: none; color: #27C786; font-size: 13px; font-weight: 600; cursor: pointer; padding: 0; outline: none; text-align: left; margin-top: auto; align-self: flex-start; }
            .status-details-link:hover { text-decoration: underline; }
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
                  <div style={{ padding: "10px 20px" }}>
                    <div style={{ marginBottom: "24px" }}>
                      <p style={{ fontSize: "14px", color: "#6B7280", margin: "0 0 4px 0", fontWeight: "500" }}>
                        {getGreeting()}, <span style={{ color: "#27C786", fontWeight: "600" }}>{isDealer ? "Dealer!" : isAdminStaff ? "Staff!" : "Admin!"}</span>
                      </p>
                      <h1 style={{ fontSize: "28px", fontWeight: "700", color: "#111827", margin: 0 }}>
                        {isDealer ? "Dealer Dashboard" : isAdminStaff ? "Staff Dashboard" : "Fleet Overview Dashboard"}
                      </h1>
                    </div>
                    {loading ? (
                      <>
                        <div className="cards-container">
                          {Array.from({ length: isDealer ? 4 : 7 }).map((_, i) => (
                            <div key={i} className="skeleton-card">
                              <div className="skeleton-card-icon skeleton-shimmer"></div>
                              <div className="skeleton-card-info">
                                <div className="skeleton-text-sm skeleton-shimmer"></div>
                                <div className="skeleton-text-lg skeleton-shimmer" style={{ width: i % 2 === 0 ? "45%" : "30%" }}></div>
                                <div className="skeleton-text-xs skeleton-shimmer"></div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {!isAdminStaff && (
                          <div className="middle-section-grid">
                            <div className="skeleton-chart-container">
                              <div className="skeleton-chart-header">
                                <div className="skeleton-chart-title skeleton-shimmer"></div>
                                <div className="skeleton-chart-dropdown skeleton-shimmer"></div>
                              </div>
                              <div className="skeleton-chart-body skeleton-shimmer"></div>
                            </div>
                            <div className="skeleton-quick-actions">
                              <div className="skeleton-quick-title skeleton-shimmer"></div>
                              <div className="skeleton-quick-btn skeleton-shimmer"></div>
                              <div className="skeleton-quick-btn skeleton-shimmer"></div>
                              <div className="skeleton-quick-btn skeleton-shimmer"></div>
                              <div className="skeleton-quick-btn skeleton-shimmer"></div>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="cards-container">
                          {dashboardCards.filter(c => !c.hidden).map((card, index) => (
                            <div
                              key={index}
                              className="card-box animated-fade-in"
                              style={{ animationDelay: `${index * 60}ms` }}
                              onClick={() => handleCardClick(card.title)}
                            >
                              <div className="card-icon-circle">
                                {getCardIcon(card.title)}
                              </div>
                              <div className="card-info-group">
                                <span className="card-box-title">{card.title}</span>
                                <span className="card-box-value">
                                  <AnimatedNumber value={card.value} />
                                </span>
                                <span className="card-box-subtext">{card.value1}</span>
                              </div>
                              <div className="card-box-arrow">
                                ↑
                              </div>
                            </div>
                          ))}
                        </div>

                        {!isAdminStaff && (
                          <div className="middle-section-grid animated-fade-in" style={{ animationDelay: "250ms" }}>
                            <div className="overview-chart-container">
                              <OverviewChart
                                users={!isDealer ? getCardValue("Total Users") : null}
                                revenue={getCardValue("Total Revenue")}
                                sessions={getCardValue("Total Sessions")}
                                energy={!isDealer ? getCardValue("Units Consumed") : null}
                              />
                            </div>
                            <div className="quick-actions-container">
                              <div className="quick-actions-card">
                                <h3>Quick Actions</h3>
                                <div className="action-buttons-list">
                                  <button className="action-btn-item" onClick={() => handleQuickAction("Add Station")}>
                                    <span>+</span> Add Station
                                  </button>
                                  <button className="action-btn-item" onClick={() => handleQuickAction("Register Dealer")}>
                                    <span>+</span> Register Dealer
                                  </button>
                                  <button className="action-btn-item" onClick={() => handleQuickAction("Add User")}>
                                    <span>+</span> Add User
                                  </button>
                                  <button className="action-btn-item" onClick={() => handleQuickAction("Raise Ticket")}>
                                    <span>+</span> Raise Ticket
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
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
