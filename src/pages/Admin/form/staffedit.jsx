import React, { useState } from "react";
import administrationIcon from "../../../assets/icons/staffediticon/administration.svg";
import currentRoleIcon from "../../../assets/icons/staffediticon/currentrole.svg";
import reportIcon from "../../../assets/icons/staffediticon/report.svg";
import systemSettingIcon from "../../../assets/icons/staffediticon/systemsetting.svg";
import fullAccessIcon from "../../../assets/icons/staffediticon/fullaccess.svg";

const StaffEdit = ({ staff, onClose }) => {
  const [selectedRole, setSelectedRole] = useState(staff?.role || "Admin");
  const [loading, setLoading] = useState(false);
  const baseUrl = import.meta.env.VITE_API_URL;

  const handleSave = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`${baseUrl}/admin/update-role`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          adminId: staff.id,
          role: selectedRole.toUpperCase()
        })
      });

      if (response.ok) {
        alert("Role updated successfully!");
        onClose();
      } else {
        const errorData = await response.text();
        throw new Error(errorData || "Failed to update role");
      }
    } catch (error) {
      console.error("Error updating role:", error);
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        background: "white",
        borderRadius: "20px",
        width: "600px",
        maxHeight: "90vh",
        overflowY: "auto",
        padding: "28px",
        fontFamily: "Lexend, sans-serif",
        boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
      }}
    >
      <style>{`::-webkit-scrollbar { display: none; }`}</style>

      <h2 style={{ fontSize: "24px", fontWeight: "700", margin: 0 }}>Assign Role</h2>
      <p style={{ fontSize: "14px", color: "#666", margin: "4px 0 24px 0" }}>
        Update the role and permissions for this staff member
      </p>

      {/* User Card */}
      <div style={{ border: "1px solid #eee", borderRadius: "16px", padding: "20px", display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
        <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
        </div>
        <div>
          <h3 style={{ fontSize: "18px", fontWeight: "700", margin: 0 }}>{staff?.name || "User Name"}</h3>
          <p style={{ fontSize: "13px", color: "#666", margin: "4px 0" }}>{staff?.email || "user@xyz.com"}</p>
          <span style={{ fontSize: "11px", color: "#999", border: "1px solid #eee", padding: "2px 8px", borderRadius: "4px" }}>
            Current: {staff?.role || "Employee"}
          </span>
        </div>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <p style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px" }}>Select New Role:</p>
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #ddd", fontSize: "14px", outline: "none" }}
        >
          <option value="ADMIN">Administrator</option>
          <option value="DEALER">Dealer</option>
          <option value="ADMIN_STAFF">Staff (Admin Staff)</option>
        </select>
      </div>

      <div style={{ border: "1px solid #eee", borderRadius: "16px", padding: "20px", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <img src={administrationIcon} alt="role" width={24} />
          <div>
            <h4 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>{selectedRole}</h4>
            <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#666" }}>
              {selectedRole === "ADMIN" ? "Full system access with all administrative privileges" : "Can manage users and specific operations."}
            </p>
          </div>
        </div>

        <p style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px" }}>Permissions include:</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          {[
            { icon: fullAccessIcon, title: "Full Access" },
            { icon: currentRoleIcon, title: "User Management" },
            { icon: systemSettingIcon, title: "System Settings" },
            { icon: reportIcon, title: "Reports" },
          ].map((perm, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px", background: "#f9f9f9", borderRadius: "8px" }}>
              <img src={perm.icon} alt="" width={18} />
              <span style={{ fontSize: "12px", fontWeight: "500" }}>{perm.title}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
        <button onClick={onClose} style={{ padding: "10px 24px", borderRadius: "10px", border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontWeight: "600" }}>
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          style={{ padding: "10px 24px", borderRadius: "10px", border: "none", background: "#000", color: "#fff", cursor: "pointer", fontWeight: "600" }}
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
};

export default StaffEdit;

