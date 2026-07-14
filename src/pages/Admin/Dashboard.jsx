import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import Topbar from "../../components/admin/topbar";
import Sidebar from "../../components/admin/Sidebar";
import OverviewChart from "../../components/admin/OverviewChart";
import LogoutModal from "../../components/admin/LogoutModal";
import VectorIcon from "../../assets/icons/stafficon/Vector-3.svg";
import StationIcon from "../../assets/icons/station.svg";
import AdminIcon from "../../assets/icons/admin.svg";
import UserIcon from "../../assets/icons/users.svg";import { ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
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
const Orders = React.lazy(() => import("./Orders"));
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
        allowedPages = ["batteries", "warranty-claims", "maintenance", "support-requests", "orders"];
      }
    } catch (e) {
      console.error("Dashboard allowed pages error:", e);
      allowedPages = ["batteries", "warranty-claims", "maintenance", "support-requests", "orders"];
    }
  }

  const [dashboardCards, setDashboardCards] = useState(() => {
    if (localStorage.getItem("userRole") === "ADMIN_STAFF") {
      let allowed = ["batteries", "warranty-claims", "maintenance", "support-requests", "orders"];
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

  const [rawClaims, setRawClaims] = useState([]);
  const [rawBatteries, setRawBatteries] = useState([]);
  const [staffName, setStaffName] = useState("Staff");
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [qrCodeInput, setQrCodeInput] = useState("");
  const [qrScanResult, setQrScanResult] = useState(null);

  const staffStats = React.useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const computedBatteries = rawBatteries.map(b => {
      const active = b.warrantyEndDate ? today <= b.warrantyEndDate : false;
      const claim = rawClaims.find(c => c.batteryDataId === b.id);
      let status = "Available";
      if (claim) {
        if (["request_created", "approved", "product_received", "processing", "dispatched", "delivered"].includes(claim.status)) {
          status = "Under Service";
        } else if (["closed", "user_confirmed"].includes(claim.status)) {
          status = "Replaced";
        }
      }
      return { ...b, warrantyActive: active, status };
    });

    const totalB = computedBatteries.length;
    const availB = computedBatteries.filter(b => b.status === "Available").length;
    const activeW = computedBatteries.filter(b => b.warrantyActive).length;
    
    const submittedC = rawClaims.length;
    const pendingC = rawClaims.filter(c => c.status === "request_created").length;
    const underServiceB = computedBatteries.filter(b => b.status === "Under Service").length;

    const statusData = [
      { name: "Available", value: availB, color: "#10B981" },
      { name: "Under Service", value: underServiceB, color: "#F59E0B" },
      { name: "Replaced", value: computedBatteries.filter(b => b.status === "Replaced").length, color: "#3B82F6" }
    ];

    const approvedC = rawClaims.filter(c => c.status !== "request_created" && c.status !== "rejected").length;
    const rejectedC = rawClaims.filter(c => c.status === "rejected").length;
    const statusChartData = [
      { status: "Pending", count: pendingC, color: "#F59E0B" },
      { status: "Approved", count: approvedC, color: "#10B981" },
      { status: "Rejected", count: rejectedC, color: "#EF4444" }
    ];

    const trendData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = rawClaims.filter(c => c.createdAt && c.createdAt.startsWith(dateStr)).length;
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      trendData.push({ date: label, claims: count });
    }

    const activities = [];
    rawBatteries.forEach(b => {
      activities.push({
        id: `bat-${b.id}`,
        type: "New Battery Added",
        text: `Registered battery (Barcode: ${b.barcode})`,
        timestamp: new Date(b.createdAt || b.updatedAt || Date.now())
      });
    });
    rawClaims.forEach(c => {
      activities.push({
        id: `claim-new-${c.id}`,
        type: "Warranty Claim Submitted",
        text: `Claim raised for Barcode: ${c.barcode || 'ID: ' + c.batteryDataId}`,
        timestamp: new Date(c.createdAt || Date.now())
      });
      if (c.updatedAt && c.updatedAt !== c.createdAt) {
        activities.push({
          id: `claim-upd-${c.id}`,
          type: "Claim Status Updated",
          text: `Claim status set to "${c.status?.replace('_', ' ')}"`,
          timestamp: new Date(c.updatedAt)
        });
      }
      if (["approved", "product_received", "processing", "dispatched", "delivered"].includes(c.status)) {
        activities.push({
          id: `claim-serv-${c.id}`,
          type: "Battery Service Updated",
          text: `Battery (ID: ${c.batteryDataId}) service status: ${c.status?.replace('_', ' ')}`,
          timestamp: new Date(c.updatedAt || c.createdAt || Date.now())
        });
      }
    });

    activities.sort((a, b) => b.timestamp - a.timestamp);
    const recentActivities = activities.slice(0, 8);

    return {
      totalBatteries: totalB,
      availableBatteries: availB,
      activeWarranties: activeW,
      claimsSubmitted: submittedC,
      pendingClaims: pendingC,
      underService: underServiceB,
      statusData,
      statusChartData,
      trendData,
      recentActivities
    };
  }, [rawBatteries, rawClaims]);

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
              if (currentAdmin.name) {
                setStaffName(currentAdmin.name);
              }
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
          promises.push(
            fetch(`${baseUrl}/warranty-claims/admin/all`, { headers })
              .then(res => res.ok ? res.json() : [])
              .then(data => { claims = data; })
              .catch(e => console.error("Error fetching claims:", e))
          );
          promises.push(
            fetch(`${baseUrl}/battery-data/admin/all`, { headers })
              .then(res => res.ok ? res.json() : [])
              .then(data => { batteries = data; })
              .catch(e => console.error("Error fetching batteries:", e))
          );

          await Promise.all(promises);
          
          setRawClaims(claims);
          setRawBatteries(batteries);

          const todayStr = new Date().toISOString().split('T')[0];
          const computedBatteries = batteries.map(b => {
            const active = b.warrantyEndDate ? todayStr <= b.warrantyEndDate : false;
            const claim = claims.find(c => c.batteryDataId === b.id);
            let status = "Available";
            if (claim) {
              if (["request_created", "approved", "product_received", "processing", "dispatched", "delivered"].includes(claim.status)) {
                status = "Under Service";
              } else if (["closed", "user_confirmed"].includes(claim.status)) {
                status = "Replaced";
              }
            }
            return { ...b, warrantyActive: active, status };
          });

          const totalB = computedBatteries.length;
          const availB = computedBatteries.filter(b => b.status === "Available").length;
          const activeW = computedBatteries.filter(b => b.warrantyActive).length;
          const submittedC = claims.length;
          const pendingC = claims.filter(c => c.status === "request_created").length;
          const underServiceB = computedBatteries.filter(b => b.status === "Under Service").length;

          setDashboardCards([
            { title: "Total Batteries", value: totalB, value1: "Registered batteries", icon: StationIcon },
            { title: "Available Batteries", value: availB, value1: "Ready for deployment", icon: StationIcon },
            { title: "Active Warranties", value: activeW, value1: "Active warranty period", icon: VectorIcon },
            { title: "Warranty Claims Submitted", value: submittedC, value1: "Total claims raised", icon: VectorIcon },
            { title: "Pending Warranty Claims", value: pendingC, value1: "Awaiting approval", icon: VectorIcon },
            { title: "Batteries Under Service", value: underServiceB, value1: "In service center", icon: VectorIcon },
          ]);
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

            .staff-dashboard-grid {
              display: grid;
              grid-template-columns: 6.5fr 3.5fr;
              gap: 24px;
              margin-bottom: 24px;
              align-items: start;
            }
            @media (max-width: 1024px) {
              .staff-dashboard-grid {
                grid-template-columns: 1fr;
              }
            }
            .staff-analytics-section {
              display: flex;
              flex-direction: column;
              gap: 24px;
            }
            .staff-card {
              background: #ffffff;
              border: 1px solid #E5E7EB;
              border-radius: 16px;
              padding: 24px;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
              box-sizing: border-box;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .staff-card:hover {
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            }
            .staff-card-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 20px;
              border-bottom: 1px solid #F3F4F6;
              padding-bottom: 12px;
            }
            .staff-card-title {
              font-size: 16px;
              font-weight: 600;
              color: #111827;
              margin: 0;
            }
            .staff-card-subtitle {
              font-size: 12px;
              color: #6B7280;
              font-weight: 500;
            }
            .staff-donut-legend {
              display: flex;
              justify-content: center;
              gap: 20px;
              margin-top: 16px;
              flex-wrap: wrap;
            }
            .legend-item {
              display: flex;
              align-items: center;
              gap: 6px;
              font-size: 13px;
              font-weight: 500;
              color: #374151;
            }
            .legend-color {
              width: 12px;
              height: 12px;
              border-radius: 3px;
            }
            .activity-timeline {
              display: flex;
              flex-direction: column;
              gap: 16px;
              position: relative;
            }
            .activity-timeline::before {
              content: '';
              position: absolute;
              left: 19px;
              top: 8px;
              bottom: 8px;
              width: 2px;
              background: #E5E7EB;
            }
            .activity-node {
              display: flex;
              gap: 16px;
              align-items: flex-start;
              position: relative;
            }
            .activity-dot {
              width: 40px;
              height: 40px;
              border-radius: 50%;
              background: #F3F4F6;
              border: 2px solid #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 16px;
              z-index: 1;
              flex-shrink: 0;
              box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }
            .activity-node-content {
              flex: 1;
              display: flex;
              flex-direction: column;
              padding-top: 4px;
            }
            .activity-node-title {
              font-size: 14px;
              font-weight: 600;
              color: #111827;
              margin-bottom: 2px;
            }
            .activity-node-desc {
              font-size: 13px;
              color: #4B5563;
              margin-bottom: 4px;
            }
            .activity-node-time {
              font-size: 11px;
              color: #9CA3AF;
              font-weight: 500;
            }
            .empty-state-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 40px 20px;
              text-align: center;
              color: #6B7280;
            }
            .empty-state-icon {
              font-size: 40px;
              margin-bottom: 12px;
            }
            .empty-state-text {
              font-size: 14px;
              font-weight: 500;
            }
            .scanner-modal-overlay {
              position: fixed;
              top: 0; left: 0; right: 0; bottom: 0;
              background: rgba(0, 0, 0, 0.4);
              backdrop-filter: blur(4px);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 1000;
            }
            .scanner-modal-box {
              background: #ffffff;
              border-radius: 16px;
              padding: 24px;
              width: 420px;
              max-width: 90%;
              box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            }
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
                        {getGreeting()}{isAdminStaff ? `, ${staffName}` : ""}, <span style={{ color: "#27C786", fontWeight: "600" }}>{isDealer ? "Dealer!" : isAdminStaff ? "Staff Member!" : "Admin!"}</span>
                      </p>
                      <h1 style={{ fontSize: "28px", fontWeight: "700", color: "#111827", margin: 0 }}>
                        {isDealer ? "Dealer Dashboard" : isAdminStaff ? "Staff Dashboard" : "Fleet Overview Dashboard"}
                      </h1>
                      <div style={{ fontSize: "13px", color: "#9CA3AF", marginTop: "4px", fontWeight: "500" }}>
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                    </div>
                    {loading ? (
                      <>
                        <div className="cards-container">
                          {Array.from({ length: isDealer ? 4 : isAdminStaff ? 6 : 7 }).map((_, i) => (
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

                        {/* Helper function to render empty states in staff charts */}
                        {(() => {
                          const renderEmptyState = (message) => (
                            <div className="empty-state-container">
                              <span className="empty-state-icon" style={{ fontSize: "36px" }}>📊</span>
                              <span className="empty-state-text" style={{ fontSize: "14px", color: "#6B7280" }}>{message}</span>
                            </div>
                          );

                          return (
                            <>
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

                              {isAdminStaff && (
                                <div className="staff-dashboard-grid animated-fade-in" style={{ animationDelay: "250ms", marginTop: "24px" }}>
                                  <div className="staff-analytics-section">
                                    {/* 1. Donut Chart Box */}
                                    <div className="staff-card">
                                      <div className="staff-card-header">
                                        <div>
                                          <h3 className="staff-card-title">Battery Inventory Status</h3>
                                          <span className="staff-card-subtitle" style={{ fontSize: "11px", color: "#6B7280" }}>Current stock allocation</span>
                                        </div>
                                      </div>
                                      {rawBatteries.length === 0 ? (
                                        renderEmptyState("No Battery Inventory data available.")
                                      ) : (
                                        <>
                                          <ResponsiveContainer width="100%" height={240}>
                                            <PieChart>
                                              <Pie
                                                data={staffStats.statusData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                              >
                                                {staffStats.statusData.map((entry, index) => (
                                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                              </Pie>
                                              <Tooltip formatter={(value) => [`${value} Batteries`, 'Count']} />
                                            </PieChart>
                                          </ResponsiveContainer>
                                          <div className="staff-donut-legend">
                                            {staffStats.statusData.map((entry, index) => (
                                              <div key={index} className="legend-item">
                                                <div className="legend-color" style={{ background: entry.color }}></div>
                                                <span>{entry.name} ({entry.value})</span>
                                              </div>
                                            ))}
                                          </div>
                                        </>
                                      )}
                                    </div>

                                    {/* 2. Charts Row */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                      <div className="staff-card">
                                        <div className="staff-card-header">
                                          <div>
                                            <h3 className="staff-card-title">Warranty Claims Trend</h3>
                                            <span className="staff-card-subtitle" style={{ fontSize: "11px", color: "#6B7280" }}>Last 7 Days</span>
                                          </div>
                                        </div>
                                        {rawClaims.length === 0 ? (
                                          renderEmptyState("No claims submitted in the last 7 days.")
                                        ) : (
                                          <ResponsiveContainer width="100%" height={220}>
                                            <LineChart data={staffStats.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                              <XAxis dataKey="date" stroke="#9CA3AF" fontSize={11} tickLine={false} />
                                              <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} allowDecimals={false} />
                                              <Tooltip />
                                              <Line type="monotone" dataKey="claims" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#ffffff' }} activeDot={{ r: 6 }} />
                                            </LineChart>
                                          </ResponsiveContainer>
                                        )}
                                      </div>

                                      <div className="staff-card">
                                        <div className="staff-card-header">
                                          <div>
                                            <h3 className="staff-card-title">Claims by Status</h3>
                                            <span className="staff-card-subtitle" style={{ fontSize: "11px", color: "#6B7280" }}>Status distribution</span>
                                          </div>
                                        </div>
                                        {rawClaims.length === 0 ? (
                                          renderEmptyState("No claims data available.")
                                        ) : (
                                          <ResponsiveContainer width="100%" height={220}>
                                            <BarChart data={staffStats.statusChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                              <XAxis dataKey="status" stroke="#9CA3AF" fontSize={11} tickLine={false} />
                                              <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} allowDecimals={false} />
                                              <Tooltip cursor={{ fill: 'rgba(243, 244, 246, 0.5)' }} />
                                              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                                {staffStats.statusChartData.map((entry, index) => (
                                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                              </Bar>
                                            </BarChart>
                                          </ResponsiveContainer>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                    {/* Quick Actions Card */}
                                    <div className="staff-card">
                                      <div className="staff-card-header">
                                        <h3 className="staff-card-title">Quick Actions</h3>
                                      </div>
                                      <div className="action-buttons-list">
                                        <button className="action-btn-item" onClick={() => navigate("batteries")}>
                                          <span style={{ fontSize: "16px" }}>🔋</span> View Battery Inventory
                                        </button>
                                        <button className="action-btn-item" onClick={() => navigate("warranty-claims", { state: { openCreateModal: true } })}>
                                          <span style={{ fontSize: "16px" }}>📝</span> Submit Warranty Claim
                                        </button>
                                        <button className="action-btn-item" onClick={() => navigate("warranty-claims")}>
                                          <span style={{ fontSize: "16px" }}>📋</span> View My Warranty Claims
                                        </button>
                                        <button className="action-btn-item" onClick={() => setShowQRScanner(true)}>
                                          <span style={{ fontSize: "16px" }}>📷</span> Scan Battery QR Code
                                        </button>
                                      </div>
                                    </div>

                                    {/* Recent Activity Card */}
                                    <div className="staff-card">
                                      <div className="staff-card-header">
                                        <h3 className="staff-card-title">Recent Activity</h3>
                                      </div>
                                      {staffStats.recentActivities.length === 0 ? (
                                        renderEmptyState("No recent activity logged.")
                                      ) : (
                                        <div className="activity-timeline" style={{ maxHeight: "380px", overflowY: "auto", paddingRight: "4px" }}>
                                          {staffStats.recentActivities.map((act) => (
                                            <div key={act.id} className="activity-node">
                                              <div className="activity-dot">
                                                {act.type === "New Battery Added" ? "🔋" : act.type === "Warranty Claim Submitted" ? "📝" : act.type === "Claim Status Updated" ? "⚙️" : "🛠️"}
                                              </div>
                                              <div className="activity-node-content">
                                                <span className="activity-node-title">{act.type}</span>
                                                <span className="activity-node-desc">{act.text}</span>
                                                <span className="activity-node-time">{act.timestamp.toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        })()}
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
                  <Route path="orders" element={<Orders baseUrl={baseUrl} userRole={userRole} />} />
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
                  {allowedPages.includes("orders") && <Route path="orders" element={<Orders baseUrl={baseUrl} userRole={userRole} />} />}
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

      {showQRScanner && (
        <div className="scanner-modal-overlay" onClick={() => { setShowQRScanner(false); setQrCodeInput(""); setQrScanResult(null); }}>
          <div className="scanner-modal-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Scan Battery QR Code</h3>
              <button 
                onClick={() => { setShowQRScanner(false); setQrCodeInput(""); setQrScanResult(null); }} 
                style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#6B7280' }}
              >
                ×
              </button>
            </div>
            
            {!qrScanResult && (
              <div style={{ position: 'relative', width: '100%', height: 160, background: '#111827', borderRadius: 8, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <div style={{ position: 'absolute', width: 120, height: 120, border: '2px solid #27C786', borderRadius: 8 }}></div>
                <div style={{ position: 'absolute', width: '100%', height: 2, background: 'rgba(39, 199, 134, 0.8)', boxShadow: '0 0 8px #27C786', animation: 'scanLine 2s linear infinite' }}></div>
                <span style={{ color: '#9CA3AF', fontSize: 13, zIndex: 1 }}>Position QR Code within frame</span>
              </div>
            )}

            <style>{`
              @keyframes scanLine {
                0% { top: 0px; }
                50% { top: 160px; }
                100% { top: 0px; }
              }
            `}</style>

            <form onSubmit={(e) => {
              e.preventDefault();
              const found = rawBatteries.find(b => b.barcode?.toLowerCase() === qrCodeInput.trim().toLowerCase());
              if (found) {
                // Calculate b.warrantyActive
                const today = new Date().toISOString().split('T')[0];
                const active = found.warrantyEndDate ? today <= found.warrantyEndDate : false;
                setQrScanResult({ success: true, battery: { ...found, warrantyActive: active } });
              } else {
                setQrScanResult({ success: false, msg: "Battery barcode not found in inventory." });
              }
            }}>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Enter Barcode Manually</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input 
                    type="text" 
                    placeholder="e.g. BAT001" 
                    value={qrCodeInput} 
                    onChange={(e) => setQrCodeInput(e.target.value)}
                    style={{ flex: 1, padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 14 }}
                    required
                  />
                  <button type="submit" className="primary-btn" style={{ height: 'auto', padding: '0 16px' }}>Submit</button>
                </div>
              </div>

              {!qrScanResult && (
                <button 
                  type="button" 
                  className="sec-btn" 
                  onClick={() => {
                    if (rawBatteries.length > 0) {
                      const randomB = rawBatteries[Math.floor(Math.random() * rawBatteries.length)];
                      setQrCodeInput(randomB.barcode || "");
                      // Calculate b.warrantyActive
                      const today = new Date().toISOString().split('T')[0];
                      const active = randomB.warrantyEndDate ? today <= randomB.warrantyEndDate : false;
                      setQrScanResult({ success: true, battery: { ...randomB, warrantyActive: active } });
                    } else {
                      setQrScanResult({ success: false, msg: "No batteries in inventory to simulate." });
                    }
                  }}
                  style={{ width: '100%', marginBottom: 10 }}
                >
                  ⚡ Simulate Random Scan
                </button>
              )}
            </form>

            {qrScanResult && (
              <div style={{ background: qrScanResult.success ? '#ECFDF5' : '#FEF2F2', border: `1px solid ${qrScanResult.success ? '#A7F3D0' : '#FECACA'}`, borderRadius: 8, padding: 16, marginTop: 16 }}>
                {qrScanResult.success ? (
                  <div>
                    <h4 style={{ margin: '0 0 10px 0', color: '#065F46', fontSize: 15 }}>✓ Battery Scan Successful</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '8px 4px', fontSize: 12, color: '#374151', textAlign: 'left' }}>
                      <strong>Barcode:</strong> <span>{qrScanResult.battery.barcode}</span>
                      <strong>Customer:</strong> <span>{qrScanResult.battery.customerName || "-"}</span>
                      <strong>Invoice:</strong> <span>{qrScanResult.battery.invoiceNumber || "-"}</span>
                      <strong>Warranty:</strong> <span style={{ color: qrScanResult.battery.warrantyActive ? '#10B981' : '#EF4444', fontWeight: 600 }}>{qrScanResult.battery.warrantyActive ? "Active" : "Expired"}</span>
                      <strong style={{ gridColumn: 'span 2' }}>Product Description:</strong>
                      <span style={{ gridColumn: 'span 2', color: '#6B7280' }}>{qrScanResult.battery.productDetails}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: '#991B1B', fontSize: 13, textAlign: 'left' }}>
                    ✖ {qrScanResult.msg}
                  </div>
                )}
                
                <button 
                  onClick={() => { setQrScanResult(null); setQrCodeInput(""); }}
                  className="sec-btn"
                  style={{ width: '100%', marginTop: 12, padding: '6px 12px', fontSize: 12 }}
                >
                  Scan Again
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showLogout && (
        <LogoutModal onClose={() => setShowLogout(false)} onConfirm={handleLogout} />
      )}
    </div>
  );
}
