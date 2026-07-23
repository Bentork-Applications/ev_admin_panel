import React from "react";
import RoleStaffManagement from "./components/RoleStaffManagement";

export default function ProductionAdmin({ baseUrl }) {
  return (
    <RoleStaffManagement
      roleKey="PRODUCTION_ADMIN"
      roleTitle="Production Admin Management"
      subtitle="Manage Production Admin accounts for order manufacturing and tracking."
      addBtnText="Add Production Admin"
      roleStyle={{ background: "#FEF3C7", color: "#92400E", border: "#FDE68A" }}
      baseUrl={baseUrl}
    />
  );
}
