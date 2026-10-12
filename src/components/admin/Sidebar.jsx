import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";

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

import LogoutModal from "../../components/admin/LogoutModal";
import { warrantyService } from "../../services/warrantyService";
import { orderService } from "../../services/orderService";
import { authService } from "../../services/authService";
import { apiClient } from "../../services/apiClient";
import { safeDecodeJwt, extractRoleFromToken } from "../../utils/jwtUtils";

const ALL_GROUPS = [
  {
    title: "Overview",
    isDirect: true,
    items: [
      { name: "Dashboard", icon: dashboardIcon, path: "/dashboard", roles: ["ADMIN", "DEALER", "ADMIN_STAFF", "SALES_ADMIN", "SALES", "PRODUCTION_ADMIN", "SCM_ADMIN"] }
    ]
  },
  {
    title: "SALES",
    icon: staffIcon,
    items: [
      { name: "CRM Dashboard", icon: dashboardIcon, path: "/dashboard/crm/dashboard", roles: ["ADMIN", "SALES_ADMIN", "SALES"] },
      { name: "New Call / Add Lead", icon: staffIcon, path: "/dashboard/crm/new-call", roles: ["ADMIN", "SALES_ADMIN", "SALES"] },
      { name: "Leads", icon: staffIcon, path: "/dashboard/crm/leads", roles: ["ADMIN", "SALES_ADMIN", "SALES"] },
      { name: "Companies & Contacts", icon: stationsIcon, path: "/dashboard/crm/companies-contacts", roles: ["ADMIN", "SALES_ADMIN", "SALES"] },
      { name: "Activities & Follow-ups", icon: maintenanceIcon, path: "/dashboard/crm/activities", roles: ["ADMIN", "SALES_ADMIN", "SALES"] },
      { name: "Requirements", icon: plansIcon, path: "/dashboard/crm/requirements", roles: ["ADMIN", "SALES_ADMIN", "SALES"] },
      { name: "Opportunities", icon: plansIcon, path: "/dashboard/crm/opportunities", roles: ["ADMIN", "SALES_ADMIN", "SALES"] },
      { name: "Quotations", icon: revenueIcon, path: "/dashboard/crm/quotations", roles: ["ADMIN", "SALES_ADMIN", "SALES"] },
      { name: "Orders & Payments", icon: sessionsIcon, path: "/dashboard/crm/orders-payments", roles: ["ADMIN", "SALES_ADMIN", "SALES"] }
    ]
  },
  {
    title: "MARKETING",
    icon: plansIcon,
    items: [
      { name: "Campaigns / Posts", icon: plansIcon, path: "/dashboard/crm/campaigns", roles: ["ADMIN", "SALES_ADMIN", "SALES"] },
      { name: "Audience Builder", icon: usersIcon, path: "/dashboard/crm/audience-builder", roles: ["ADMIN", "SALES_ADMIN", "SALES"] }
    ]
  },
  {
    title: "SYSTEM",
    icon: stationsIcon,
    items: [
      { name: "IndiaMART", icon: stationsIcon, path: "/dashboard/crm/indiamart", roles: ["ADMIN", "SALES_ADMIN", "SALES"] },
      { name: "Reports", icon: revenueIcon, path: "/dashboard/crm/reports", roles: ["ADMIN", "SALES_ADMIN", "SALES"] },
      { name: "Settings", icon: maintenanceIcon, path: "/dashboard/crm/settings", roles: ["ADMIN", "SALES_ADMIN", "SALES"] }
    ]
  },
  {
    title: "Battery Management",
    icon: chargerIcon,
    items: [
      { name: "Battery Inventory", icon: chargerIcon, path: "/dashboard/batteries", roles: ["ADMIN", "ADMIN_STAFF"] },
      {
        name: "Warranty Claims",
        icon: maintenanceIcon,
        path: "/dashboard/warranty-claims",
        roles: ["ADMIN", "ADMIN_STAFF"],
        getPendingCount: async () => {
          return await warrantyService.getPendingCount();
        }
      }
    ]
  },
  {
    title: "SCM",
    icon: stationsIcon,
    items: [
      { name: "Vendors", icon: staffIcon, path: "/dashboard/vendors", roles: ["ADMIN", "SCM_ADMIN", "SCM"] },
      { name: "Purchase Orders", icon: plansIcon, path: "/dashboard/purchase-orders", roles: ["ADMIN", "SCM_ADMIN", "SCM"] },
      { name: "Material IN", icon: stationsIcon, path: "/dashboard/material-in", roles: ["ADMIN", "SCM_ADMIN", "SCM"] },
      { name: "Material OUT", icon: chargerIcon, path: "/dashboard/material-out", roles: ["ADMIN", "SCM_ADMIN", "SCM"] },
      { name: "Inventory Stock", icon: dashboardIcon, path: "/dashboard/inventory-stock", roles: ["ADMIN", "SCM_ADMIN", "SCM"] },
      { name: "Material Reports", icon: maintenanceIcon, path: "/dashboard/material-reports", roles: ["ADMIN", "SCM_ADMIN", "SCM"] }
    ]
  },
  {
    title: "Order Management",
    icon: sessionsIcon,
    items: [
      {
        name: "Order Tracking",
        icon: sessionsIcon,
        path: "/dashboard/orders",
        roles: ["ADMIN", "ADMIN_STAFF", "SALES_ADMIN", "SALES", "PRODUCTION_ADMIN", "SCM_ADMIN", "SCM"],
        getPendingCount: async () => {
          const role = localStorage.getItem("userRole") || "";
          return await orderService.getPendingCount(role);
        }
      }
    ]
  },
  {
    title: "Charging Operations",
    icon: stationsIcon,
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
    icon: usersIcon,
    items: [
      {
        name: "Users & RFID Cards",
        icon: usersIcon,
        path: "/dashboard/users",
        roles: ["ADMIN"],
        getPendingCount: async () => {
          try {
            const data = await apiClient.get("/rfid-applications");
            return Array.isArray(data) ? data.filter((a) => a.status === "PENDING").length : 0;
          } catch {
            return 0;
          }
        }
      },
      { name: "Dealers", icon: staffIcon, path: "/dashboard/dealers", roles: ["ADMIN"] },
      { name: "Login Users", icon: staffIcon, path: "/dashboard/login-users", roles: ["ADMIN"] },
      { name: "Admin Staff", icon: staffIcon, path: "/dashboard/staff", roles: ["ADMIN"] },
      { name: "Sales Admin", icon: staffIcon, path: "/dashboard/sales-admin", roles: ["ADMIN"] },
      { name: "Production Admin", icon: staffIcon, path: "/dashboard/production-admin", roles: ["ADMIN"] },
      { name: "SCM Admin", icon: staffIcon, path: "/dashboard/scm-admin", roles: ["ADMIN"] }
    ]
  },
  {
    title: "Business",
    icon: revenueIcon,
    items: [
      { name: "Plans", icon: plansIcon, path: "/dashboard/plans", roles: ["ADMIN"] },
      { name: "Revenue & Transactions", icon: revenueIcon, path: "/dashboard/revenue", roles: ["ADMIN", "DEALER"] }
    ]
  },
  {
    title: "Support",
    icon: maintenanceIcon,
    items: [
      {
        name: "Raise Request",
        icon: maintenanceIcon,
        path: "/dashboard/support-requests",
        roles: ["ADMIN", "DEALER", "ADMIN_STAFF"],
        getPendingCount: async (baseUrl, token, isDealer) => {
          try {
            const endpoint = isDealer
              ? "/support-requests/dealer/my-requests"
              : "/support-requests/admin/all";
            const data = await apiClient.get(endpoint);
            return Array.isArray(data) ? data.filter((r) => r.status === "pending").length : 0;
          } catch {
            return 0;
          }
        }
      },
      { name: "Maintenance & Emergency", icon: maintenanceIcon, path: "/dashboard/maintenance", roles: ["ADMIN", "DEALER", "ADMIN_STAFF"] }
    ]
  },
  {
    title: "Settings",
    icon: stationsIcon,
    items: [
      { name: "Café Configuration", icon: stationsIcon, path: "/dashboard/cafes", roles: ["ADMIN"] }
    ]
  },
  {
    title: "Account",
    icon: staffIcon,
    items: [
      { name: "Dealer Profile", icon: staffIcon, path: "/dashboard/profile", roles: ["DEALER"] },
      { name: "Log Out", icon: logoutIcon, path: null, roles: ["ADMIN", "DEALER", "ADMIN_STAFF", "SALES_ADMIN", "SALES", "PRODUCTION_ADMIN", "SCM_ADMIN"], isLogout: true }
    ]
  }
];

export default function Sidebar({ onLogout, isMobileOpen: _isMobileOpen, setIsMobileOpen: _setIsMobileOpen, userRole, baseUrl: propBaseUrl }) {
  void _isMobileOpen;
  void _setIsMobileOpen;
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const baseUrl = propBaseUrl || import.meta.env.VITE_API_URL;

  const token = localStorage.getItem("token");
  let resolvedRole = userRole || localStorage.getItem("userRole") || "";

  if (token) {
    const roleFromToken = extractRoleFromToken(token);
    if (roleFromToken) {
      resolvedRole = roleFromToken;
      localStorage.setItem("userRole", resolvedRole);
    }
  }
  if (!resolvedRole) resolvedRole = "ADMIN";

  const rawRole = resolvedRole.toUpperCase();
  const currentRole = (rawRole === "ADMINISTRATOR" || rawRole === "ADMIN") ? "ADMIN" : rawRole;

  const allowedPages = useMemo(() => {
    if (currentRole !== "ADMIN_STAFF" || !token) return [];
    try {
      const payload = safeDecodeJwt(token);
      const email = payload?.sub;
      const stored = localStorage.getItem("staff_page_access_" + email);
      if (stored) {
        return JSON.parse(stored);
      }
      return ["batteries", "warranty-claims", "maintenance", "support-requests", "orders"];
    } catch (e) {
      console.error("Sidebar allowed pages error:", e);
      return ["batteries", "warranty-claims", "maintenance", "support-requests", "orders"];
    }
  }, [currentRole, token]);

  const filteredGroups = useMemo(() => {
    return ALL_GROUPS.map((group) => {
      const visibleItems = group.items.filter((item) => {
        if (currentRole === "ADMIN_STAFF") {
          if (item.path === "/dashboard" || item.path === null) return true;
          const pageKey = item.path.replace("/dashboard/", "");
          return allowedPages.includes(pageKey);
        }
        return item.roles.includes(currentRole);
      });
      return { ...group, items: visibleItems };
    }).filter((group) => group.items.length > 0);
  }, [currentRole, allowedPages]);

  const menuItems = useMemo(() => {
    return filteredGroups.reduce((acc, g) => [...acc, ...g.items], []);
  }, [filteredGroups]);

  // Collapsible Accordion State
  const [expandedGroups, setExpandedGroups] = useState({});

  // Auto-expand group if currently on an active child route
  useEffect(() => {
    const currentPath = location.pathname;
    const activeGroup = filteredGroups.find((group) => {
      if (group.isDirect) return false;
      return group.items.some((item) => {
        if (!item.path) return false;
        if (item.path === "/dashboard") return currentPath === "/dashboard";
        return currentPath === item.path || currentPath.startsWith(item.path + "/");
      });
    });

    if (activeGroup) {
      setExpandedGroups((prev) => {
        if (prev[activeGroup.title]) return prev;
        return { ...prev, [activeGroup.title]: true };
      });
    }
  }, [location.pathname, filteredGroups]);

  const toggleGroup = useCallback((groupTitle) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupTitle]: !prev[groupTitle]
    }));
  }, []);

  const [pendingCounts, setPendingCounts] = useState({});

  const fetchPendingCounts = useCallback(async () => {
    const activeToken = localStorage.getItem("token");
    if (!activeToken) return;

    const counts = {};
    const promises = menuItems.map(async (item) => {
      if (item.getPendingCount) {
        try {
          const count = await item.getPendingCount(baseUrl, activeToken, currentRole === "DEALER");
          counts[item.path] = count;
        } catch (err) {
          console.error(`Error fetching pending count for ${item.name}:`, err);
          counts[item.path] = 0;
        }
      }
    });

    await Promise.all(promises);
    setPendingCounts(counts);
  }, [baseUrl, currentRole, menuItems]);

  useEffect(() => {
    fetchPendingCounts();

    const handleRefreshEvent = () => {
      fetchPendingCounts();
    };

    window.addEventListener("refresh-pending-counts", handleRefreshEvent);
    const interval = setInterval(fetchPendingCounts, 30000); // 30s auto-refresh

    return () => {
      window.removeEventListener("refresh-pending-counts", handleRefreshEvent);
      clearInterval(interval);
    };
  }, [fetchPendingCounts]);

  // Open logout modal
  const handleLogoutClick = () => {
    if (typeof onLogout === "function") {
      onLogout();
    } else {
      setShowLogoutModal(true);
    }
  };

  // Confirm logout
  const confirmLogout = () => {
    setShowLogoutModal(false);
    if (typeof onLogout === "function") {
      onLogout();
    } else {
      authService.logout();
      navigate("/");
    }
  };

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
        .sidebar-group-header:hover {
          background-color: #f8fafc !important;
        }
        .sidebar-child-item:hover {
          background-color: #f1f5f9;
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
          gap: "2px",
          boxSizing: "border-box"
        }}
      >
        {filteredGroups.map((group) => {
          // Direct item (Dashboard)
          if (group.isDirect) {
            const item = group.items[0];
            if (!item) return null;
            return (
              <div key={group.title || "Dashboard"} style={{ marginBottom: "6px" }}>
                <NavLink
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
                    backgroundColor: isActive ? "#10b86feb" : "transparent",
                    color: isActive ? "#fff" : "#000",
                    textDecoration: "none"
                  })}
                >
                  {({ isActive }) => (
                    <>
                      <img
                        src={item.icon}
                        alt={item.name}
                        style={{
                          width: 20,
                          height: 20,
                          objectFit: "contain",
                          filter: isActive ? "invert(1)" : "none"
                        }}
                      />
                      <span>{item.name}</span>
                    </>
                  )}
                </NavLink>
              </div>
            );
          }

          const isExpanded = !!expandedGroups[group.title];

          // Compute if any item in this group has pending count
          const groupPendingCount = group.items.reduce(
            (sum, it) => sum + (pendingCounts[it.path] || 0),
            0
          );

          // Check if any child item in this group is currently active
          const isGroupActive = group.items.some((it) => {
            if (!it.path) return false;
            return location.pathname === it.path || location.pathname.startsWith(it.path + "/");
          });

          return (
            <div key={group.title} style={{ display: "flex", flexDirection: "column", marginBottom: "2px" }}>
              {/* Accordion Group Header Button */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggleGroup(group.title)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleGroup(group.title);
                  }
                }}
                className="sidebar-group-header"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  height: 38,
                  padding: "0 10px 0 12px",
                  borderRadius: "8px",
                  fontFamily: "Roboto, sans-serif",
                  fontSize: 12,
                  fontWeight: isGroupActive ? 700 : 600,
                  color: isGroupActive ? "#047857" : "#1e293b",
                  backgroundColor: isGroupActive && !isExpanded ? "#f0fdf4" : "transparent",
                  cursor: "pointer",
                  userSelect: "none",
                  transition: "all 0.15s ease"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden" }}>
                  {group.icon && (
                    <img
                      src={group.icon}
                      alt={group.title}
                      style={{
                        width: 18,
                        height: 18,
                        objectFit: "contain",
                        opacity: isGroupActive ? 1 : 0.75
                      }}
                    />
                  )}
                  <span
                    style={{
                      textTransform: ["SALES", "MARKETING", "SYSTEM", "SCM"].includes(group.title) ? "uppercase" : "none",
                      letterSpacing: ["SALES", "MARKETING", "SYSTEM", "SCM"].includes(group.title) ? "0.5px" : "normal",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}
                  >
                    {group.title}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {!isExpanded && groupPendingCount > 0 && (
                    <span
                      style={{
                        backgroundColor: "#fee2e2",
                        color: "#ef4444",
                        padding: "1px 6px",
                        borderRadius: "10px",
                        fontSize: "9px",
                        fontWeight: "bold"
                      }}
                    >
                      {groupPendingCount}
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronDown size={14} color="#64748b" />
                  ) : (
                    <ChevronRight size={14} color="#64748b" />
                  )}
                </div>
              </div>

              {/* Collapsible Child Menu Items */}
              {isExpanded && (
                <div style={{ display: "flex", flexDirection: "column", gap: "2px", paddingLeft: "10px", marginTop: "2px", marginBottom: "4px" }}>
                  {group.items.map((item) => {
                    if (item.isLogout) {
                      return (
                        <div
                          key="Logout"
                          role="button"
                          tabIndex={0}
                          onClick={handleLogoutClick}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleLogoutClick();
                            }
                          }}
                          className="sidebar-child-item"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            height: 36,
                            padding: "0 10px",
                            borderTopRightRadius: 80,
                            borderBottomRightRadius: 80,
                            fontFamily: "Roboto, sans-serif",
                            fontSize: 11.5,
                            fontWeight: 600,
                            cursor: "pointer",
                            transition: "all 0.15s ease-in-out",
                            color: "#334155"
                          }}
                        >
                          <img
                            src={item.icon}
                            alt="Log Out"
                            style={{ width: 16, height: 16, objectFit: "contain" }}
                          />
                          <span>{item.name}</span>
                        </div>
                      );
                    }

                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === "/dashboard"}
                        className="sidebar-child-item"
                        style={({ isActive }) => ({
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          height: 36,
                          padding: "0 10px",
                          borderTopRightRadius: 80,
                          borderBottomRightRadius: 80,
                          fontFamily: "Roboto, sans-serif",
                          fontSize: 11.5,
                          fontWeight: isActive ? 600 : 500,
                          cursor: "pointer",
                          transition: "all 0.15s ease-in-out",
                          backgroundColor: isActive ? "#10b86feb" : "transparent",
                          color: isActive ? "#fff" : "#334155",
                          textDecoration: "none"
                        })}
                      >
                        {({ isActive }) => (
                          <>
                            <img
                              src={item.icon}
                              alt={item.name}
                              style={{
                                width: 16,
                                height: 16,
                                objectFit: "contain",
                                filter: isActive ? "invert(1)" : "none",
                                opacity: isActive ? 1 : 0.8
                              }}
                            />
                            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {item.name}
                            </span>
                            {pendingCounts[item.path] > 0 && (
                              <span
                                style={{
                                  marginLeft: "auto",
                                  backgroundColor: isActive ? "#ef4444" : "#fee2e2",
                                  color: isActive ? "#fff" : "#ef4444",
                                  padding: "2px 6px",
                                  borderRadius: "10px",
                                  fontSize: "9px",
                                  fontWeight: "bold",
                                  whiteSpace: "nowrap",
                                  marginRight: "6px",
                                  pointerEvents: "none"
                                }}
                              >
                                {pendingCounts[item.path]}
                              </span>
                            )}
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </aside>

      {/* Logout Modal */}
      {showLogoutModal && (
        <LogoutModal onClose={cancelLogout} onConfirm={confirmLogout} />
      )}
    </>
  );
}
