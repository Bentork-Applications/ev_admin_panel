import React, { useState } from "react";

const AddStaffForm = ({ onClose, defaultRole = "ADMIN", onSuccess }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    mobile: "",
    role: defaultRole
  });
  const [loading, setLoading] = useState(false);
  const baseUrl = import.meta.env.VITE_API_URL;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.mobile.trim() || !formData.password.trim()) {
      alert("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const signupPayload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        mobile: formData.mobile.trim(),
        password: formData.password,
        confirmPassword: formData.password,
      };

      const response = await fetch(`${baseUrl}/admin/signup`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(signupPayload)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || "Registration failed");
      }

      // Chain role update
      const allAdminsRes = await fetch(`${baseUrl}/admin/alladmin`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!allAdminsRes.ok) {
        throw new Error("User registered, but failed to fetch admin ID for role update. Please update the role manually.");
      }

      const adminsList = await allAdminsRes.json();
      const newAdmin = adminsList.find(a => a.email.toLowerCase() === formData.email.trim().toLowerCase());

      if (!newAdmin) {
        throw new Error("User registered, but not found in list. Please update role manually.");
      }

      const roleResponse = await fetch(`${baseUrl}/admin/update-role`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          adminId: newAdmin.id,
          role: formData.role
        })
      });

      if (roleResponse.ok) {
        const roleLabel = 
          formData.role === "SALES_ADMIN" ? "Sales Admin" :
          formData.role === "PRODUCTION_ADMIN" ? "Production Admin" :
          formData.role === "SCM_ADMIN" ? "SCM Admin" :
          formData.role === "ADMIN_STAFF" ? "Admin Staff" :
          formData.role === "DEALER" ? "Dealer" : "Administrator";
        if (onSuccess) {
          onSuccess(`${roleLabel} registered successfully!`);
        } else {
          alert(`${roleLabel} registered and role assigned successfully!`);
        }
        onClose();
      } else {
        const errorText = await roleResponse.text();
        throw new Error(errorText || "Registration succeeded but role assignment failed.");
      }
    } catch (error) {
      console.error("Signup error:", error);
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#fff",
        borderRadius: "24px",
        padding: "32px",
        width: "500px",
        maxWidth: "95%",
        boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
        fontFamily: "Lexend, sans-serif"
      }}
    >
      <h2 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "8px" }}>Create User Account</h2>
      <p style={{ fontSize: "14px", color: "#666", marginBottom: "24px" }}>Add a new administrator, staff, or role-based user</p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <label style={{ fontSize: "12px", fontWeight: "600", color: "#374151", display: "block", marginBottom: "4px" }}>Full Name</label>
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            required
            value={formData.name}
            onChange={handleChange}
            style={{ width: "100%", padding: "12px 16px", borderRadius: "12px", border: "1px solid #ddd", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <div>
          <label style={{ fontSize: "12px", fontWeight: "600", color: "#374151", display: "block", marginBottom: "4px" }}>Email Address</label>
          <input
            type="email"
            name="email"
            placeholder="Email Address"
            required
            value={formData.email}
            onChange={handleChange}
            style={{ width: "100%", padding: "12px 16px", borderRadius: "12px", border: "1px solid #ddd", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <div>
          <label style={{ fontSize: "12px", fontWeight: "600", color: "#374151", display: "block", marginBottom: "4px" }}>Mobile Number</label>
          <input
            type="text"
            name="mobile"
            placeholder="Mobile Number"
            required
            value={formData.mobile}
            onChange={handleChange}
            style={{ width: "100%", padding: "12px 16px", borderRadius: "12px", border: "1px solid #ddd", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <div>
          <label style={{ fontSize: "12px", fontWeight: "600", color: "#374151", display: "block", marginBottom: "4px" }}>Password</label>
          <input
            type="password"
            name="password"
            placeholder="Password"
            required
            value={formData.password}
            onChange={handleChange}
            style={{ width: "100%", padding: "12px 16px", borderRadius: "12px", border: "1px solid #ddd", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
          />
        </div>

        <div>
          <label style={{ fontSize: "12px", fontWeight: "600", color: "#374151", display: "block", marginBottom: "4px" }}>Role:</label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "1px solid #ddd", fontSize: "14px", background: "#fff", outline: "none", boxSizing: "border-box" }}
          >
            <option value="ADMIN">Administrator</option>
            <option value="ADMIN_STAFF">Admin Staff</option>
            <option value="SALES_ADMIN">Sales Admin</option>
            <option value="PRODUCTION_ADMIN">Production Admin</option>
            <option value="SCM_ADMIN">SCM Admin</option>
            <option value="DEALER">Dealer</option>
          </select>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "20px" }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: "10px 24px", borderRadius: "30px", border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontWeight: "600" }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{ padding: "10px 24px", borderRadius: "30px", border: "none", background: "#1E1E1E", color: "#fff", cursor: "pointer", fontWeight: "600" }}
          >
            {loading ? "Registering..." : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddStaffForm;


