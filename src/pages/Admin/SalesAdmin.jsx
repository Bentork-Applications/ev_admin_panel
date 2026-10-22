import React, { useState } from "react";
import { BarChart3, Users, ShieldAlert } from "lucide-react";
import RoleStaffManagement from "./components/RoleStaffManagement";
import SalesPerformanceOverview from "./components/sales/SalesPerformanceOverview";
import { extractRoleFromToken } from "../../utils/jwtUtils";

export default function SalesAdmin({ baseUrl: propBaseUrl }) {
  const baseUrl = propBaseUrl || import.meta.env.VITE_API_URL;
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "accounts"

  // Check role authorization
  const token = localStorage.getItem("token");
  let userRole = localStorage.getItem("userRole") || "";
  if (token) {
    const roleFromToken = extractRoleFromToken(token);
    if (roleFromToken) userRole = roleFromToken;
  }
  const normalizedRole = (userRole || "").toUpperCase();
  const isAuthorizedAdmin =
    normalizedRole.includes("ADMIN") ||
    normalizedRole === "ADMIN" ||
    normalizedRole === "SUPER_ADMIN" ||
    normalizedRole === "ADMINISTRATOR" ||
    normalizedRole === "SALES_ADMIN";

  if (!isAuthorizedAdmin) {
    return (
      <div
        style={{
          padding: "60px 20px",
          textAlign: "center",
          maxWidth: "500px",
          margin: "40px auto",
          backgroundColor: "#FFFFFF",
          borderRadius: "16px",
          border: "1px solid #E2E8F0",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)"
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            backgroundColor: "#FEF2F2",
            color: "#EF4444",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px auto"
          }}
        >
          <ShieldAlert size={28} />
        </div>
        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0F172A", margin: "0 0 8px 0" }}>
          Access Restricted
        </h2>
        <p style={{ fontSize: "14px", color: "#64748B", margin: 0, lineHeight: 1.5 }}>
          You do not have administrative permission to view the Sales Accounts Performance Overview.
          Please contact a System Administrator if you believe this is an error.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "8px 24px 32px 24px", maxWidth: "1600px", margin: "0 auto" }}>
      {/* Top Tabs Switcher */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "20px",
          borderBottom: "1px solid #E2E8F0",
          paddingBottom: "12px"
        }}
      >
        <button
          onClick={() => setActiveTab("overview")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            borderRadius: "10px",
            border: "none",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            backgroundColor: activeTab === "overview" ? "#2563EB" : "#F1F5F9",
            color: activeTab === "overview" ? "#FFFFFF" : "#475569",
            boxShadow: activeTab === "overview" ? "0 4px 12px rgba(37, 99, 235, 0.25)" : "none",
            transition: "all 0.15s ease"
          }}
        >
          <BarChart3 size={16} />
          Performance & Analytics Overview
        </button>

        <button
          onClick={() => setActiveTab("accounts")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            borderRadius: "10px",
            border: "none",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            backgroundColor: activeTab === "accounts" ? "#2563EB" : "#F1F5F9",
            color: activeTab === "accounts" ? "#FFFFFF" : "#475569",
            boxShadow: activeTab === "accounts" ? "0 4px 12px rgba(37, 99, 235, 0.25)" : "none",
            transition: "all 0.15s ease"
          }}
        >
          <Users size={16} />
          Manage Sales Accounts
        </button>
      </div>

      {/* Tab 1: Performance Overview & Analytics */}
      {activeTab === "overview" && <SalesPerformanceOverview />}

      {/* Tab 2: Sales Account Registration & Management */}
      {activeTab === "accounts" && (
        <RoleStaffManagement
          roleKey="SALES_ADMIN"
          roleTitle="Sales Admin Management"
          subtitle="Manage Sales Admin accounts for order tracking and sales operations."
          addBtnText="Add Sales Admin"
          roleStyle={{ background: "#F3E8FF", color: "#6B21A8", border: "#E9D5FF" }}
          baseUrl={baseUrl}
        />
      )}
    </div>
  );
}
