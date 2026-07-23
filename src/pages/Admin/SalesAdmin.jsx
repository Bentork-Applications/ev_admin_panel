import React from "react";
import RoleStaffManagement from "./components/RoleStaffManagement";

export default function SalesAdmin({ baseUrl }) {
  return (
    <RoleStaffManagement
      roleKey="SALES_ADMIN"
      roleTitle="Sales Admin Management"
      subtitle="Manage Sales Admin accounts for order tracking and sales operations."
      addBtnText="Add Sales Admin"
      roleStyle={{ background: "#F3E8FF", color: "#6B21A8", border: "#E9D5FF" }}
      baseUrl={baseUrl}
    />
  );
}
