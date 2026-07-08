import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    emailOrMobile: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!formData.emailOrMobile || !formData.password) {
      return alert("Please enter email and password");
    }

    setIsLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Invalid login credentials";
        try {
          errorMessage = JSON.parse(errorText).message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        return alert(errorMessage);
      }

      const data = await response.json();
      localStorage.setItem("token", data.token);

      // Decode JWT to extract role and email
      let email = "";
      try {
        const payload = JSON.parse(atob(data.token.split('.')[1]));
        email = payload.sub;
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

        let role = "ADMIN";
        if (authorities.includes("DEALER")) {
          role = "DEALER";
        } else if (authorities.includes("ADMIN_STAFF") || authorities.includes("ROLE_ADMIN_STAFF")) {
          role = "ADMIN_STAFF";
        } else if (authorities.includes("ADMINISTRATOR") || authorities.includes("ADMIN") || authorities.includes("ROLE_ADMIN")) {
          role = "ADMIN";
        }
        localStorage.setItem("userRole", role);
      } catch (decodeErr) {
        console.error("Failed to decode token for role:", decodeErr);
        localStorage.setItem("userRole", "ADMIN"); // Default fallback
      }

      // Check if the user is suspended/deactivated
      if (email) {
        try {
          const listResponse = await fetch(`${import.meta.env.VITE_API_URL}/admin/alladmin`, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${data.token}`,
              "Content-Type": "application/json"
            }
          });
          if (listResponse.ok) {
            const adminsList = await listResponse.json();
            const currentAdmin = adminsList.find(admin => admin.email === email);
            if (currentAdmin) {
              const overrides = JSON.parse(localStorage.getItem("admin_staff_status") || "{}");
              const status = overrides[currentAdmin.id] || currentAdmin.status || "Active";
              if (status === "Suspended") {
                localStorage.removeItem("token");
                localStorage.removeItem("userRole");
                alert("Your account is suspended. Please contact the administrator.");
                setIsLoading(false);
                return;
              }
            }
          }
        } catch (err) {
          console.error("Failed to fetch admin list for status check:", err);
        }
      }

      navigate("/dashboard", { replace: true });
    } catch (err) {
      if (err.name === "AbortError") {
        alert("Server connection timed out. Please try again later.");
      } else {
        console.error("Login error:", err);
        alert("Something went wrong. Try again later.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-container">
      <style>{`
        .admin-container {
          display: flex;
          min-height: 100vh;
          font-family: Inter, sans-serif;
        }
        .left-panel {
          width: 50%;
          background: #1E1E1E;
          color: white;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 40px;
        }
        .logo-box {
          padding: 16px 28px;
          margin-bottom: 22px;
          text-align: center;
        }
        .logo-img {
          width: 180px;
          height: auto;
          object-fit: contain;
        }
        .panel-box {
          padding: 14px 26px;
          text-align: center;
        }
        .panel-title {
          margin: 0;
          font-size: 22px;
          letter-spacing: 1px;
        }
        .panel-desc {
          margin-top: 8px;
          font-size: 12px;
          color: #C0C0C0;
        }
        .right-panel {
          width: 50%;
          background: #FFFFFF;
          padding: 80px 100px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .login-title {
          margin: 0;
          font-size: 26px;
          font-weight: 400;
          font-family: "Gabarito", sans-serif !important;
        }
        .login-sub {
          margin-top: 6px;
          margin-bottom: 30px;
          color: #444;
        }
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }
        .input-box {
          width: 100%;
          height: 46px;
          padding: 10px 12px;
          border-radius: 6px;
          border: 1px solid #CFCFCF;
          outline: none;
          font-size: 15px;
        }
        .create-text {
          font-size: 12px;
          margin: 0 auto;
        }
        .create-link {
          font-weight: 600;
          text-decoration: underline;
          cursor: pointer;
        }
        .login-btn {
          background: #1E1E1E;
          color: white;
          border: none;
          height: 44px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 400;
          cursor: pointer;
          gap: 10px;
          width: 120px;
          margin: 0 auto;
        }
        .login-btn:disabled {
          background: #555;
          cursor: not-allowed;
        }
      `}</style>

      <div className="left-panel">
        <div className="logo-box">
          <img
            src="https://raw.githubusercontent.com/bentork5151/assets/refs/heads/main/Logo/logo_inverted.png"
            alt="Bentork Logo"
            className="logo-img"
          />
        </div>
        <div className="panel-box">
          <h2 className="panel-title">ADMIN PANEL</h2>
          <p className="panel-desc">
            Manage charging stations, users, and sessions all in one place.
          </p>
        </div>
      </div>

      <div className="right-panel">
        <h2 className="login-title">Login</h2>
        <p className="login-sub">
          Enter your registered credentials to get started!
        </p>

        <form onSubmit={handleLogin} className="login-form">
          <input
            type="text"
            name="emailOrMobile"
            placeholder="Email ID or Mobile Number"
            className="input-box"
            value={formData.emailOrMobile}
            onChange={handleChange}
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            className="input-box"
            value={formData.password}
            onChange={handleChange}
          />



          <button type="submit" className="login-btn" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
