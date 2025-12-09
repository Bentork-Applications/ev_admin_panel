import React, { useState } from "react";
import administrationIcon from "../../../assets/icons/staffediticon/administration.svg";
import currentRoleIcon from "../../../assets/icons/staffediticon/currentrole.svg";
import reportIcon from "../../../assets/icons/staffediticon/report.svg";
import systemSettingIcon from "../../../assets/icons/staffediticon/systemsetting.svg";
import fullAccessIcon from "../../../assets/icons/staffediticon/fullaccess.svg";

const StaffEdit = ({ onClose }) => {
  const [selectedRole, setSelectedRole] = useState("Current Role");

  return (
    <div
      style={{
        background: "white",
        borderRadius: "20px",
        width: "650px",
        maxHeight: "90vh",
        overflowY: "auto",
        padding: "24px",
        fontFamily: "Lexend, sans-serif",
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
      }}
    >
      {/* Hide scrollbar */}
      <style>
        {`
          ::-webkit-scrollbar { display: none; }
          * { scrollbar-width: none; -ms-overflow-style: none; }
        `}
      </style>

      {/* Title */}
      <h2
        style={{
          fontSize: "24px",
          fontWeight: "700",
          margin: 0,
        }}
      >
        Assign Role
      </h2>
      <p
        style={{
          fontSize: "14px",
          fontWeight: "500",
          color: "#111827",
          margin: "2px 0 20px 0",
        }}
      >
        Update the role and permissions for this staff member
      </p>

      {/* User Card */}
      <div
        style={{
          border: "1px solid #D1D5DB",
          borderRadius: "16px",
          padding: "24px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: "#D1D5DB",
          }}
        ></div>
        <div>
          <h3
            style={{
              fontSize: "20px",
              fontWeight: "700",
              margin: 0,
            }}
          >
            Joeyy
          </h3>
          <p
            style={{
              fontSize: "14px",
              margin: "4px 0",
              color: "#111827",
            }}
          >
            joey@xyz.com
          </p>
          <span
            style={{
              display: "inline-block",
              padding: "4px 10px",
              background: "#fff",
              border: "1px solid #D1D5DB",
              borderRadius: "6px",
              fontSize: "12px",
              color: "#111827",
            }}
          >
            Current: Employee
          </span>
        </div>
      </div>

      {/* Select Role */}
      <div style={{ marginBottom: "24px" }}>
        <p style={{ fontSize: "14px", fontWeight: "500", marginBottom: "8px" }}>
          Select New Role:
        </p>
        <div
          style={{
            border: "1px solid #D1D5DB",
            borderRadius: "12px",
            padding: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <img src={currentRoleIcon} alt="role" width={20} height={20} />
            {/* Dropdown box */}
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              style={{
                border: "none",
                outline: "none",
                fontSize: "14px",
                fontFamily: "Lexend, sans-serif",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              <option value="Current Role">(Current Role)</option>
              <option value="Administrator">Administrator</option>
              <option value="Manager">Manager</option>
              <option value="Employee">Employee</option>
            </select>
          </div>
        </div>
      </div>

      {/* Role + Permissions Combined */}
      <div
        style={{
          border: "1px solid #D1D5DB", // ✅ same as Joeyy card
          borderRadius: "16px",
          padding: "20px",
          marginBottom: "24px",
        }}
      >
        {/* Administrator / Role Section */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img
            src={administrationIcon}
            alt="admin"
            width={24}
            height={24}
            style={{ flexShrink: 0 }}
          />
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: "20px",
                fontWeight: "700",
              }}
            >
              {selectedRole}
            </h3>
            <p
              style={{
                margin: "4px 0 0 0",
                fontSize: "14px",
                color: "#111827",
              }}
            >
              {selectedRole === "Administrator"
                ? "Full system access with all administrative privileges"
                : selectedRole === "Manager"
                ? "Can manage users, reports, and limited settings"
                : selectedRole === "Employee"
                ? "Basic access to assigned tasks"
                : "Select a role to see details"}
            </p>
          </div>
        </div>

        {/* Permissions */}
        {selectedRole !== "Current Role" && (
          <div style={{ marginTop: "20px" }}>
            <p
              style={{
                fontSize: "14px",
                fontWeight: "500",
                marginBottom: "12px",
              }}
            >
              Permission includes:
            </p>

            {[
              { icon: fullAccessIcon, title: "Full Access", desc: "Complete System Access" },
              { icon: currentRoleIcon, title: "User Management", desc: "Add, edit, and remove users" },
              { icon: systemSettingIcon, title: "System Settings", desc: "Configure system parameters" },
              { icon: reportIcon, title: "Reports", desc: "View and generate reports" },
              { icon: administrationIcon, title: "Station Management", desc: "Manage station configurations" },
              { icon: currentRoleIcon, title: "Data Entry", desc: "Enter and modify data" },
            ].map((perm, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  background: "#F9FAFB",
                  padding: "12px",
                  borderRadius: "10px",
                  marginBottom: "10px",
                }}
              >
                <img src={perm.icon} alt={perm.title} width={22} height={22} />
                <div>
                  <h4
                    style={{
                      margin: 0,
                      fontSize: "14px",
                      fontWeight: "600",
                    }}
                  >
                    {perm.title}
                  </h4>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "12px",
                      color: "#374151",
                    }}
                  >
                    {perm.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Warning */}
      {selectedRole !== "Current Role" && (
        <div
          style={{
            background: "#FEF3C7",
            borderRadius: "8px",
            padding: "12px",
            fontSize: "12px",
            marginBottom: "20px",
            color: "#92400E",
          }}
        >
          ⚠️ Role will be changed to <b>{selectedRole}</b>
        </div>
      )}

      {/* Buttons */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "12px",
        }}
      >
        <button
          onClick={onClose}
          style={{
            width: "150px",
            height: "46px",
            borderRadius: "12px",
            border: "1px solid #D1D5DB",
            background: "#fff",
            cursor: "pointer",
            fontWeight: "500",
            fontSize: "14px",
            fontFamily: "Lexend, sans-serif",
          }}
        >
          Cancel
        </button>
        <button
          onClick={() => {
            console.log("Saved new role:", selectedRole);
            onClose();
          }}
          style={{
            width: "150px",
            height: "46px",
            borderRadius: "12px",
            border: "none",
            background: "#000",
            color: "white",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "14px",
            fontFamily: "Lexend, sans-serif",
          }}
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default StaffEdit;
