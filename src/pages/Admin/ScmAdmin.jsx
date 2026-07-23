import React from "react";
import RoleStaffManagement from "./components/RoleStaffManagement";

export default function ScmAdmin({ baseUrl }) {
  return (
    <RoleStaffManagement
      roleKey="SCM_ADMIN"
      roleTitle="SCM Admin Management"
      subtitle="Manage Supply Chain Management (SCM) Admin accounts and logistics."
      addBtnText="Add SCM Admin"
      roleStyle={{ background: "#E0F2FE", color: "#075985", border: "#BAE6FD" }}
      baseUrl={baseUrl}
    />
  );
}
