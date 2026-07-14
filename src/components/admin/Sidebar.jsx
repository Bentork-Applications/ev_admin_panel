import React, { useState, useEffect } from "react";
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

export default function Sidebar({ onLogout, userRole, baseUrl: propBaseUrl }) {
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const baseUrl = propBaseUrl || import.meta.env.VITE_API_URL;

  let resolvedRole = userRole || localStorage.getItem("userRole") || "ADMIN";
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
      console.error("Sidebar token decode failed:", e);
    }
  }

  const rawRole = resolvedRole.toUpperCase();
  const currentRole = (rawRole === "ADMINISTRATOR" || rawRole === "ADMIN") ? "ADMIN" : rawRole;

  let allowedPages = [];
  if (currentRole === "ADMIN_STAFF" && token) {
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
      console.error("Sidebar allowed pages error:", e);
      allowedPages = ["batteries", "warranty-claims", "maintenance", "support-requests", "orders"];
    }
  }

  const allGroups = [
    {
      title: "Overview",
      items: [
        { name: "Dashboard", icon: dashboardIcon, path: "/dashboard", roles: ["ADMIN", "DEALER", "ADMIN_STAFF"] }
      ]
    },
    {
      title: "Battery Management",
      items: [
        { name: "Battery Inventory", icon: chargerIcon, path: "/dashboard/batteries", roles: ["ADMIN", "ADMIN_STAFF"] },
        {
          name: "Warranty Claims",
          icon: maintenanceIcon,
          path: "/dashboard/warranty-claims",
          roles: ["ADMIN", "ADMIN_STAFF"],
          getPendingCount: async (baseUrl, token) => {
            const response = await fetch(`${baseUrl}/warranty-claims/admin/all`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
              const data = await response.json();
              return Array.isArray(data) ? data.filter(c => c.status === "request_created").length : 0;
            }
            return 0;
          }
        }
      ]
    },
    {
      title: "Order Management",
      items: [
        { 
          name: "Order Tracking", 
          icon: sessionsIcon, 
          path: "/dashboard/orders", 
          roles: ["ADMIN", "ADMIN_STAFF"],
          getPendingCount: async (baseUrl, token) => {
            try {
              const response = await fetch(`${baseUrl}/orders/admin/status/pending`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              if (response.ok) {
                const data = await response.json();
                return Array.isArray(data) ? data.length : 0;
              }
            } catch (err) {
              console.error("Error fetching pending orders count:", err);
            }
            return 0;
          }
        }
      ]
    },
    {
      title: "Charging Operations",
      items: [
        { name: "Stations & Locations", icon: stationsIcon, path: "/dashboard/stations", roles: ["ADMIN", "DEALER"] },
        { name: "Charger & QR Management", icon: chargerIcon, path: "/dashboard/charger", roles: ["ADMIN", "DEALER"] },
        { name: "Slot Management", icon: slotIcon, path: "/dashboard/slot", roles: ["ADMIN"] },
        { name: "Slot Bookings", icon: sessionsIcon, path: "/dashboard/slot-bookings", roles: ["ADMIN"] },
        { name: "Session History", icon: sessionsIcon, path: "/dashboard/sessions", roles: ["ADMIN", "DEALER"] }
      ]
    },
    {
      title: "User Management",
      items: [
        {
          name: "Users & RFID Cards",
          icon: usersIcon,
          path: "/dashboard/users",
          roles: ["ADMIN"],
          getPendingCount: async (baseUrl, token) => {
            const response = await fetch(`${baseUrl}/rfid-applications`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
              const data = await response.json();
              return Array.isArray(data) ? data.filter(a => a.status === "PENDING").length : 0;
            }
            return 0;
          }
        },
        { name: "Dealers", icon: staffIcon, path: "/dashboard/dealers", roles: ["ADMIN"] },
        { name: "Login Users", icon: staffIcon, path: "/dashboard/login-users", roles: ["ADMIN"] },
        { name: "Admin Staff", icon: staffIcon, path: "/dashboard/staff", roles: ["ADMIN"] }
      ]
    },
    {
      title: "Business",
      items: [
        { name: "Plans", icon: plansIcon, path: "/dashboard/plans", roles: ["ADMIN"] },
        { name: "Revenue & Transactions", icon: revenueIcon, path: "/dashboard/revenue", roles: ["ADMIN", "DEALER"] }
      ]
    },
    {
      title: "Support",
      items: [
        {
          name: "Raise Request",
          icon: maintenanceIcon,
          path: "/dashboard/support-requests",
          roles: ["ADMIN", "DEALER", "ADMIN_STAFF"],
          getPendingCount: async (baseUrl, token, isDealer) => {
            const endpoint = isDealer
              ? `${baseUrl}/support-requests/dealer/my-requests`
              : `${baseUrl}/support-requests/admin/all`;
            const response = await fetch(endpoint, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
              const data = await response.json();
              return Array.isArray(data) ? data.filter(r => r.status === "pending").length : 0;
            }
            return 0;
          }
        },
        { name: "Maintenance & Emergency", icon: maintenanceIcon, path: "/dashboard/maintenance", roles: ["ADMIN", "DEALER", "ADMIN_STAFF"] }
      ]
    },
    {
      title: "Settings",
      items: [
        { name: "Café Configuration", icon: stationsIcon, path: "/dashboard/cafes", roles: ["ADMIN"] }
      ]
    },
    {
      title: "Account",
      items: [
        { name: "Dealer Profile", icon: staffIcon, path: "/dashboard/profile", roles: ["DEALER"] },
        { name: "Log Out", icon: logoutIcon, path: null, roles: ["ADMIN", "DEALER", "ADMIN_STAFF"], isLogout: true }
      ]
    }
  ];

  const filteredGroups = allGroups.map(group => {
    const visibleItems = group.items.filter(item => {
      if (currentRole === "ADMIN_STAFF") {
        if (item.path === "/dashboard" || item.path === null) return true;
        const pageKey = item.path.replace("/dashboard/", "");
        return allowedPages.includes(pageKey);
      }
      return item.roles.includes(currentRole);
    });
    return { ...group, items: visibleItems };
  }).filter(group => group.items.length > 0);

  const menuItems = filteredGroups.reduce((acc, g) => [...acc, ...g.items], []);

  const [pendingCounts, setPendingCounts] = useState({});

  const fetchPendingCounts = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const counts = {};
    const promises = menuItems.map(async (item) => {
      if (item.getPendingCount) {
        try {
          const count = await item.getPendingCount(baseUrl, token, currentRole === "DEALER");
          counts[item.path] = count;
        } catch (err) {
          console.error(`Error fetching pending count for ${item.name}:`, err);
          counts[item.path] = 0;
        }
      }
    });

    await Promise.all(promises);
    setPendingCounts(counts);
  };

  useEffect(() => {
    fetchPendingCounts();

    const handleRefreshEvent = () => {
      fetchPendingCounts();
    };

    window.addEventListener("refresh-pending-counts", handleRefreshEvent);

    const interval = setInterval(fetchPendingCounts, 10000); // 10s auto-refresh

    return () => {
      window.removeEventListener("refresh-pending-counts", handleRefreshEvent);
      clearInterval(interval);
    };
  }, [currentRole, baseUrl]);

  // 🔹 Open logout modal or call parent
  const handleLogoutClick = () => {
    if (typeof onLogout === "function") {
      onLogout();
    } else {
      setShowLogoutModal(true);
    }
  };

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
      <style>{`
        .sidebar-scroll {
          overflow-y: auto;
          overflow-x: hidden;
        }
        .sidebar-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 4px;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
      <aside
        className="sidebar-scroll"
        style={{
          width: 235,
          height: "100%",
          background: "#fff",
          borderRight: "1px solid #e0e0e0",
          padding: "16px 10px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        {filteredGroups.map((group, groupIdx) => (
          <div key={groupIdx} style={{ display: "flex", flexDirection: "column", gap: "2px", marginBottom: "8px" }}>
            <span
              style={{
                fontFamily: "Roboto, sans-serif",
                fontSize: "10px",
                fontWeight: "700",
                color: "#888",
                textTransform: "uppercase",
                letterSpacing: "1px",
                paddingLeft: "12px",
                marginBottom: "4px",
                userSelect: "none"
              }}
            >
              {group.title}
            </span>

            {group.items.map((item, itemIdx) => {
              if (item.isLogout) {
                return (
                  <div
                    key={itemIdx}
                    onClick={handleLogoutClick}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      height: 40,
                      padding: "0 12px",
                      borderTopRightRadius: 80,
                      borderBottomRightRadius: 80,
                      fontFamily: "Roboto, sans-serif",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.2s ease-in-out",
                      color: "#000",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#f5f5f5";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <img
                      src={item.icon}
                      alt="Log Out"
                      style={{ width: 22, height: 22, objectFit: "contain" }}
                    />
                    <span>{item.name}</span>
                  </div>
                );
              }

              return (
                <NavLink
                  key={itemIdx}
                  to={item.path}
                  end={item.path === "/dashboard"}
                  style={({ isActive }) => ({
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    height: 40,
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
                      {pendingCounts[item.path] > 0 && (
                        <span
                          style={{
                            marginLeft: "auto",
                            backgroundColor: isActive ? "#ef4444" : "#fee2e2",
                            color: isActive ? "#fff" : "#ef4444",
                            padding: "2px 8px",
                            borderRadius: "12px",
                            fontSize: "10px",
                            fontWeight: "bold",
                            whiteSpace: "nowrap",
                            marginRight: "10px",
                            boxShadow: isActive ? "none" : "0 1px 2px rgba(239, 68, 68, 0.2)",
                            transition: "all 0.2s ease",
                          }}
                        >
                          {pendingCounts[item.path]} Pending
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </aside>

      {/* 🔹 Logout Modal */}
      {showLogoutModal && (
        <LogoutModal onClose={cancelLogout} onConfirm={confirmLogout} />
      )}
    </>
  );
}
