import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    emailOrMobile: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("login-theme") || "dark");
  const [lang, setLang] = useState("English");
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("login-theme", nextTheme);
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
        if (authorities.includes("SALES_ADMIN") || authorities.includes("ROLE_SALES_ADMIN")) {
          role = "SALES_ADMIN";
        } else if (authorities.includes("PRODUCTION_ADMIN") || authorities.includes("ROLE_PRODUCTION_ADMIN")) {
          role = "PRODUCTION_ADMIN";
        } else if (authorities.includes("SCM_ADMIN") || authorities.includes("ROLE_SCM_ADMIN")) {
          role = "SCM_ADMIN";
        } else if (authorities.includes("DEALER")) {
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
    <div className={`admin-container ${theme === "dark" ? "dark-mode" : "light-mode"}`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Gabarito:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap');

        .admin-container {
          display: flex;
          min-height: 100vh;
          width: 100vw;
          font-family: 'Inter', sans-serif;
          margin: 0;
          padding: 0;
          overflow-x: hidden;
        }

        /* CSS variables for theme modes */
        .admin-container.dark-mode {
          --right-panel-bg: linear-gradient(135deg, #132820 0%, #17352B 40%, #23493C 100%);
          --right-radial-glow: radial-gradient(circle at center, rgba(69, 243, 176, 0.08) 0%, transparent 65%);
          --right-text-primary: #FFFFFF;
          --right-text-secondary: rgba(255, 255, 255, 0.7);
          --right-field-label: rgba(255, 255, 255, 0.72);
          --right-input-border: rgba(255, 255, 255, 0.55);
          --right-input-text: #FFFFFF;
          --right-input-placeholder: rgba(255, 255, 255, 0.4);
          --right-input-icon: rgba(255, 255, 255, 0.6);
          --right-checkbox-border: rgba(255, 255, 255, 0.6);
          --right-toggle-border: rgba(255, 255, 255, 0.18);
          --right-toggle-text: #FFFFFF;
          --right-toggle-hover: rgba(255, 255, 255, 0.05);
          --right-dropdown-bg: #17352B;
          --right-dropdown-hover: rgba(255, 255, 255, 0.08);
          --right-btn-bg: #35F5A3;
          --right-btn-text: #000000;
          --right-btn-hover-bg: #2CE194;
          --right-btn-glow: rgba(53, 245, 163, 0.28);
          --right-forgot-color: #35F5A3;
          --right-input-focus-shadow: rgba(53, 245, 163, 0.12);
        }

        .admin-container.light-mode {
          --right-panel-bg: linear-gradient(135deg, #F4FBF7 0%, #E8F7F0 50%, #DCF5E9 100%);
          --right-radial-glow: radial-gradient(circle at center, rgba(69, 243, 176, 0.12) 0%, transparent 65%);
          --right-text-primary: #0F251E;
          --right-text-secondary: #4A5D57;
          --right-field-label: #3B4C47;
          --right-input-border: #A0B2AC;
          --right-input-text: #0F251E;
          --right-input-placeholder: #8AA097;
          --right-input-icon: #5C736B;
          --right-checkbox-border: #8AA097;
          --right-toggle-border: #A0B2AC;
          --right-toggle-text: #0F251E;
          --right-toggle-hover: rgba(15, 37, 30, 0.05);
          --right-dropdown-bg: #FFFFFF;
          --right-dropdown-hover: rgba(15, 37, 30, 0.05);
          --right-btn-bg: #05B86B;
          --right-btn-text: #FFFFFF;
          --right-btn-hover-bg: #049D5B;
          --right-btn-glow: rgba(5, 184, 107, 0.2);
          --right-forgot-color: #05B86B;
          --right-input-focus-shadow: rgba(5, 184, 107, 0.12);
        }

        /* Left Panel - Branding Section */
        /* Left Panel - Branding Section */
        .left-panel {
          width: 50%;
          background: linear-gradient(135deg, #0B0F14 0%, #121A1D 100%);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: center;
          padding: 80px 48px 64px 48px;
          position: relative;
          overflow: hidden;
        }

        /* Subtle green glow from bottom center */
        .left-panel::before {
          content: '';
          position: absolute;
          width: 140%;
          height: 60%;
          bottom: -10%;
          left: 50%;
          transform: translateX(-50%);
          background: radial-gradient(circle, rgba(53, 245, 163, 0.18) 0%, transparent 70%);
          pointer-events: none;
          z-index: 1;
          filter: blur(80px);
        }

        /* Animated background particles */
        .particle {
          position: absolute;
          background: rgba(53, 245, 163, 0.35);
          border-radius: 50%;
          pointer-events: none;
          z-index: 2;
          filter: blur(2px);
          animation: floatParticle 22s infinite linear;
        }
        .particle:nth-child(1) { width: 8px; height: 8px; left: 15%; top: 40%; animation-duration: 26s; animation-delay: 0s; }
        .particle:nth-child(2) { width: 12px; height: 12px; left: 75%; top: 25%; animation-duration: 32s; animation-delay: -6s; }
        .particle:nth-child(3) { width: 6px; height: 6px; left: 45%; top: 60%; animation-duration: 20s; animation-delay: -3s; }
        .particle:nth-child(4) { width: 10px; height: 10px; left: 25%; top: 75%; animation-duration: 28s; animation-delay: -9s; }
        .particle:nth-child(5) { width: 8px; height: 8px; left: 85%; top: 65%; animation-duration: 24s; animation-delay: -12s; }

        @keyframes floatParticle {
          0% { transform: translateY(0) translateX(0) scale(1); opacity: 0.05; }
          50% { transform: translateY(-70px) translateX(25px) scale(1.15); opacity: 0.3; }
          100% { transform: translateY(-140px) translateX(0) scale(1); opacity: 0.05; }
        }

        /* Radar concentric circles/arcs */
        .radar-arcs-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 2;
          pointer-events: none;
        }

        .radar-arcs-svg {
          width: 100%;
          height: 100%;
        }

        /* Fade-in layout container */
        .left-panel-fade-in {
          opacity: 0;
          animation: leftFadeIn 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          z-index: 5;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: center;
        }

        @keyframes leftFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .left-top-branding {
          display: flex;
          flex-direction: column;
          align-items: center;
          z-index: 5;
          margin-top: 10px;
        }

        .logo-img {
          width: 200px;
          height: auto;
          object-fit: contain;
        }

        .brand-indicator {
          width: 104px;
          height: 4px;
          background-color: #35F5A3;
          border-radius: 2px;
          margin-top: 18px;
          box-shadow: 0 0 12px rgba(53, 245, 163, 0.7);
        }

        .left-mid-content {
          text-align: center;
          margin-top: 48px;
          margin-bottom: auto;
        }

        .admin-heading {
          font-family: 'Inter', 'Poppins', sans-serif;
          font-size: 56px;
          font-weight: 600;
          color: #FFFFFF;
          margin: 0;
          letter-spacing: -0.5px;
          line-height: 1.1;
        }

        .admin-heading span {
          color: #42F9B1;
          text-shadow: 0 0 20px rgba(53, 245, 163, 0.45);
        }

        .admin-subtitle {
          color: #e4e7eaff;
          font-family: 'Inter', 'Poppins', sans-serif;
          font-size: 22px;
          line-height: 1.5;
          margin-top: 20px;
          max-width: 480px;
        }

        /* City Skyline Graphic silhouette with 18% opacity */
        .city-skyline-container {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 38%;
          z-index: 3;
          pointer-events: none;
          opacity: 0.18;
        }

        .city-skyline-svg {
          width: 100%;
          height: 100%;
          fill: #0B0F14;
        }

        /* Bottom Feature Grid */
        .left-features {
          width: 100%;
          max-width: 680px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-top: auto;
          padding-bottom:100px;
        }

        .feature-card {
          display: flex;
          align-items: center;
          gap: 14px;
          flex: 1;
          transition: transform 0.3s ease;
        }

        .feature-card:hover {
          transform: translateY(-2px);
        }

        .feature-icon-box {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #070808ff;
          flex-shrink: 0;
          filter: drop-shadow(0 0 10px rgba(53, 245, 163, 0.5));
        }

        .feature-divider {
          width: 1px;
          height: 36px;
          background-color: rgba(53, 245, 163, 0.2);
          flex-shrink: 0;
        }

        .feature-text-box {
          display: flex;
          flex-direction: column;
          text-align: left;
        }

        .feature-title {
          font-family: 'Inter', 'Poppins', sans-serif;
          font-size: 20px;
          font-weight: 700;
          color: #FFFFFF;
          margin: 0;
          line-height: 1.2;
        }

        .feature-desc {
          font-family: 'Inter', 'Poppins', sans-serif;
          font-size: 16px;
          color: #B5BDC6;
          margin: 4px 0 0 0;
          line-height: 1.35;
        }

        /* Right Panel - Login Form */
        .right-panel {
          width: 50%;
        
          background: var(--right-panel-bg);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 80px;
          position: relative;
          overflow: hidden;
          transition: background 0.3s ease;
        }

        /* Top controls */
        .right-panel-header {
          position: absolute;
          top: 30px;
          right: 40px;
          display: flex;
          align-items: center;
          gap: 16px;
          z-index: 20;
        }

        .theme-toggle-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 1px solid var(--right-toggle-border);
          background: transparent;
          color: var(--right-toggle-text);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          outline: none;
        }

        .theme-toggle-btn:hover {
          background: var(--right-toggle-hover);
          transform: scale(1.04);
        }

        .lang-dropdown-wrapper {
          position: relative;
        }

        .lang-dropdown-btn {
          height: 44px;
          padding: 0 18px;
          border-radius: 22px;
          border: 1px solid var(--right-toggle-border);
          background: transparent;
          color: var(--right-toggle-text);
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          font-family: 'Inter', sans-serif;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          outline: none;
        }

        .lang-dropdown-btn:hover {
          background: var(--right-toggle-hover);
        }

        .lang-dropdown-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 130px;
          background: var(--right-dropdown-bg);
          border: 1px solid var(--right-toggle-border);
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          z-index: 50;
        }

        .lang-dropdown-item {
          padding: 10px 16px;
          font-size: 14px;
          color: var(--right-toggle-text);
          background: transparent;
          border: none;
          text-align: left;
          cursor: pointer;
          width: 100%;
          transition: background 0.2s ease;
          font-family: 'Inter', sans-serif;
        }

        .lang-dropdown-item:hover {
          background: var(--right-dropdown-hover);
        }

        /* Form styling */
        .login-form-container {
          width: 100%;
          max-width: 420px;
          display: flex;
          flex-direction: column;
          gap: 32px;
          z-index: 10;
        }

        .login-header-group {
          text-align: left;
        }

        .welcome-title {
          margin: 0;
          font-size: 36px;
          font-weight: 600;
          color: var(--right-text-primary);
          font-family: 'Inter', sans-serif;
          letter-spacing: -0.5px;
          line-height: 1.2;
        }

        .welcome-subtitle {
          margin: 8px 0 0 0;
          font-size: 16px;
          font-weight: 400;
          color: var(--right-text-secondary);
          font-family: 'Inter', sans-serif;
          line-height: 1.5;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .form-field-group {
          display: flex;
          flex-direction: column;
        }

        .field-label {
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 10px;
          color: var(--right-field-label);
          text-align: left;
        }

        .input-container {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }

        .input-icon-box {
          position: absolute;
          left: 16px;
          color: var(--right-input-icon);
          display: flex;
          align-items: center;
          pointer-events: none;
          transition: color 0.2s ease;
        }

        .field-input {
          width: 100%;
          height: 56px;
          padding: 10px 16px 10px 46px;
          border-radius: 6px;
          border: 1px solid var(--right-input-border);
          background: transparent;
          color: var(--right-input-text);
          font-family: 'Inter', sans-serif;
          font-size: 15px;
          outline: none;
          transition: all 0.2s ease;
        }

        .field-input::placeholder {
          color: var(--right-input-placeholder);
        }

        .field-input:focus {
          border-color: var(--right-forgot-color);
          box-shadow: 0 0 0 3px var(--right-input-focus-shadow);
        }

        .field-input:focus + .input-icon-box {
          color: var(--right-forgot-color);
        }

        .form-options-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
        }

        .remember-me-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          color: var(--right-text-secondary);
          font-size: 14px;
          user-select: none;
          font-family: 'Inter', sans-serif;
        }

        .remember-me-checkbox {
          position: relative;
          width: 20px;
          height: 20px;
          border: 1px solid var(--right-checkbox-border);
          border-radius: 4px;
          appearance: none;
          outline: none;
          background-color: transparent;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .remember-me-checkbox:checked {
          background-color: var(--right-forgot-color);
          border-color: var(--right-forgot-color);
        }

        .remember-me-checkbox:checked::after {
          content: "";
          position: absolute;
          width: 5px;
          height: 10px;
          border: solid #000000;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
          margin-top: -2px;
        }

        .forgot-password-link {
          color: var(--right-forgot-color);
          text-decoration: none;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .forgot-password-link:hover {
          text-decoration: underline;
          text-shadow: 0 0 10px var(--right-btn-glow);
        }

        .login-submit-btn {
          width: 100%;
          height: 58px;
          background: var(--right-btn-bg);
          color: var(--right-btn-text);
          border: none;
          border-radius: 6px;
          font-size: 20px;
          font-weight: 700;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 8px;
        }

        .login-submit-btn:hover:not(:disabled) {
          background: var(--right-btn-hover-bg);
          box-shadow: 0 15px 35px var(--right-btn-glow);
          transform: translateY(-1px);
        }

        .login-submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .login-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Responsive Layouts */
        @media (max-width: 1024px) {
          .right-panel {
            width: 100%;
            padding: 80px 48px;
          }
        }

        @media (max-width: 768px) {
          .right-panel {
            width: 100%;
            padding: 40px 24px;
          }
          .right-panel-header {
            top: 24px;
            right: 24px;
          }
          .login-form-container {
            margin-top: 40px;
          }
        }
      `}</style>

      {/* Left Branding/Illustration Panel */}
      <div className="left-panel">
        {/* Background Concentric Radar Rings */}
        <div className="radar-arcs-container">
          <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" className="radar-arcs-svg">
            <circle cx="500" cy="900" r="320" fill="none" stroke="rgba(53, 245, 163, 0.05)" strokeWidth="1.5" />
            <circle cx="500" cy="900" r="480" fill="none" stroke="rgba(53, 245, 163, 0.04)" strokeWidth="1" />
            <circle cx="500" cy="900" r="640" fill="none" stroke="rgba(53, 245, 163, 0.03)" strokeWidth="0.8" />
            <circle cx="500" cy="900" r="800" fill="none" stroke="rgba(53, 245, 163, 0.015)" strokeWidth="0.5" />
          </svg>
        </div>

        {/* Animated Particles */}
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>

        {/* City Skyline Silhouette SVG with 18% opacity */}
        <div className="city-skyline-container">
          <svg viewBox="0 0 1000 400" preserveAspectRatio="none" className="city-skyline-svg">
            <defs>
              <linearGradient id="skyline-fade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#35F5A3" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#0B0F14" stopOpacity="1" />
              </linearGradient>
            </defs>

            {/* Back Row Skyline Silhouette */}
            <path d="
              M 0 400 
              V 320 H 40 V 400 
              M 60 400 V 290 H 110 V 400 
              M 130 400 V 270 H 180 V 400 
              M 210 400 V 310 H 250 V 400 
              M 280 400 V 220 H 330 V 400 
              M 360 400 V 280 H 400 V 400 
              M 430 400 V 240 L 450 190 L 470 240 H 490 V 400 
              M 520 400 V 300 H 560 V 400 
              M 590 400 V 260 H 640 V 400 
              M 670 400 V 330 H 710 V 400 
              M 740 400 V 250 H 790 V 400 
              M 820 400 V 290 H 870 V 400 
              M 900 400 V 310 H 950 V 400 
              M 970 400 V 340 H 1000 V 400
            " fill="#35F5A3" opacity="0.3" />

            {/* Front Row Skyline Silhouette */}
            <path d="
              M 0 400 
              V 340 H 50 V 400 
              M 80 400 V 310 H 130 V 400 
              M 150 400 V 250 H 200 V 400 
              M 220 400 V 320 H 270 V 400 
              M 300 400 V 270 H 350 V 400 
              M 380 400 V 300 H 420 V 400 
              M 450 400 V 220 H 500 V 400 
              M 530 400 V 290 H 580 V 400 
              M 600 400 V 230 L 620 180 L 640 230 H 660 V 400 
              M 690 400 V 310 H 730 V 400 
              M 760 400 V 260 H 810 V 400 
              M 840 400 V 330 H 880 V 400 
              M 900 400 V 160 H 915 V 100 H 917 V 60 H 920 V 100 H 922 V 160 H 940 V 400 
              M 960 400 V 320 H 1000 V 400
            " fill="#35F5A3" opacity="0.75" />

            {/* Glowing Green Window Circles */}
            <circle cx="910" cy="180" r="1.5" fill="#35F5A3" opacity="0.95" />
            <circle cx="930" cy="180" r="1.5" fill="#35F5A3" opacity="0.95" />
            <circle cx="910" cy="200" r="1.5" fill="#35F5A3" opacity="0.95" />
            <circle cx="930" cy="200" r="1.5" fill="#35F5A3" opacity="0.95" />
            <circle cx="910" cy="220" r="1.5" fill="#35F5A3" opacity="0.95" />
            <circle cx="930" cy="220" r="1.5" fill="#35F5A3" opacity="0.95" />

            <circle cx="165" cy="270" r="1.5" fill="#35F5A3" opacity="0.8" />
            <circle cx="185" cy="270" r="1.5" fill="#35F5A3" opacity="0.8" />
            <circle cx="165" cy="290" r="1.5" fill="#35F5A3" opacity="0.8" />
            <circle cx="185" cy="290" r="1.5" fill="#35F5A3" opacity="0.8" />

            <circle cx="465" cy="240" r="1.5" fill="#35F5A3" opacity="0.85" />
            <circle cx="485" cy="240" r="1.5" fill="#35F5A3" opacity="0.85" />
            <circle cx="465" cy="260" r="1.5" fill="#35F5A3" opacity="0.85" />
            <circle cx="485" cy="260" r="1.5" fill="#35F5A3" opacity="0.85" />

            <circle cx="615" cy="260" r="1.5" fill="#35F5A3" opacity="0.8" />
            <circle cx="645" cy="260" r="1.5" fill="#35F5A3" opacity="0.8" />
          </svg>
        </div>

        {/* Content with Fade-In Animation */}
        <div className="left-panel-fade-in">
          <div className="left-top-branding">
            <img
              src="https://raw.githubusercontent.com/bentork5151/assets/refs/heads/main/Logo/logo_inverted.png"
              alt="Bentork Logo"
              className="logo-img"
            />
            <div className="brand-indicator"></div>
          </div>

          <div className="left-mid-content">
            <h2 className="admin-heading">ADMIN <span>PANEL</span></h2>
            <p className="admin-subtitle">
              Manage charging stations, users &amp;<br />
              sessions all in one place
            </p>
          </div>

          <div className="left-features">
            <div className="feature-card">
              <div className="feature-icon-box">
                {/* Shield Icon */}
                <svg width="73" height="73" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#35F5A3" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9 12.5L11 14.5L15 10.5" stroke="#35F5A3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="feature-divider"></div>
              <div className="feature-text-box">
                <span className="feature-title">Secure Access</span>
                <span className="feature-desc">Enterprise grade<br />protection</span>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon-box">
                {/* Bar Chart Icon */}
                <svg width="73" height="73" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="14" width="2.2" height="6" rx="1.1" fill="#35F5A3" />
                  <circle cx="4.1" cy="10" r="1.5" fill="#35F5A3" />
                  <rect x="8.5" y="8" width="2.2" height="12" rx="1.1" fill="#35F5A3" />
                  <circle cx="9.6" cy="4" r="1.5" fill="#35F5A3" />
                  <rect x="14" y="12" width="2.2" height="8" rx="1.1" fill="#35F5A3" />
                  <circle cx="15.1" cy="8" r="1.5" fill="#35F5A3" />
                  <rect x="19.5" y="6" width="2.2" height="14" rx="1.1" fill="#35F5A3" />
                  <circle cx="20.6" cy="2" r="1.5" fill="#35F5A3" />
                </svg>
              </div>
              <div className="feature-divider"></div>
              <div className="feature-text-box">
                <span className="feature-title">Powerful Analytics</span>
                <span className="feature-desc">Realtime insights &amp;<br />Reports</span>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon-box">
                {/* Gear Settings Icon */}
                <svg width="73" height="73" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19.14 12.94C19.18 12.63 19.2 12.32 19.2 12C19.2 11.68 19.18 11.37 19.14 11.06L21.36 9.32C21.56 9.16 21.62 8.88 21.49 8.65L19.39 5.01C19.26 4.78 18.98 4.69 18.75 4.78L16.13 5.84C15.59 5.42 14.99 5.08 14.34 4.81L13.95 2.02C13.91 1.78 13.7 1.6 13.46 1.6H9.27C9.03 1.6 8.82 1.78 8.79 2.02L8.4 4.81C7.75 5.08 7.15 5.43 6.61 5.84L3.99 4.78C3.76 4.69 3.48 4.78 3.35 5.01L1.25 8.65C1.12 8.88 1.18 9.16 1.38 9.32L3.6 11.06C3.56 11.37 3.54 11.69 3.54 12C3.54 12.31 3.56 12.63 3.6 12.94L1.38 14.68C1.18 14.84 1.12 15.12 1.25 15.35L3.35 18.99C3.48 19.22 3.76 19.31 3.99 19.22L6.61 18.16C7.15 18.58 7.75 18.92 8.4 19.19L8.79 21.98C8.82 22.22 9.03 22.4 9.27 22.4H13.46C13.7 22.4 13.91 22.22 13.95 21.98L14.34 19.19C14.99 18.92 15.59 18.57 16.13 18.16L18.75 19.22C18.98 19.31 19.26 19.22 19.39 18.99L21.49 15.35C21.62 15.12 21.56 14.84 21.36 14.68L19.14 12.94ZM12 15.6C10.01 15.6 8.4 13.99 8.4 12C8.4 10.01 10.01 8.4 12 8.4C13.99 8.4 15.6 10.01 15.6 12C15.6 13.99 13.99 15.6 12 15.6Z" stroke="#35F5A3" strokeWidth="2" fill="none" />
                </svg>
              </div>
              <div className="feature-divider"></div>
              <div className="feature-text-box">
                <span className="feature-title">Easy Management</span>
                <span className="feature-desc">Streamline operations<br />effortlessly</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Login Form Panel */}
      <div className="right-panel">
        {/* Soft radial glow */}
        <div className="absolute inset-0 pointer-events-none z-0" style={{ background: 'var(--right-radial-glow)' }}></div>

        <div className="right-panel-header">
          {/* Theme Toggle Button */}
          <button onClick={toggleTheme} className="theme-toggle-btn" title="Toggle Theme">
            {theme === "dark" ? (
              /* Sun Icon for Light Mode */
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              /* Moon Icon for Dark Mode */
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>



        </div>

        <div className="login-form-container">
          <div className="login-header-group">
            <h2 className="welcome-title">Welcome back</h2>
            <p className="welcome-subtitle">
              Enter your registered credentials to get started!
            </p>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            <div className="form-field-group">
              <label className="field-label">Email ID </label>
              <div className="input-container">
                <input
                  type="text"
                  name="emailOrMobile"
                  placeholder="Enter your email"
                  className="field-input"
                  value={formData.emailOrMobile}
                  onChange={handleChange}
                  required
                />
                <div className="input-icon-box">
                  {/* User Avatar Icon */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="form-field-group">
              <label className="field-label">Password</label>
              <div className="input-container">
                <input
                  type="password"
                  name="password"
                  placeholder="Enter your password"
                  className="field-input"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <div className="input-icon-box">
                  {/* Lock Icon */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="form-options-row">
              <label className="remember-me-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="remember-me-checkbox"
                />
                <span>Remember me</span>
              </label>
              <a href="#forgot" onClick={(e) => { e.preventDefault(); alert("Please contact system admin to reset credentials."); }} className="forgot-password-link">
                Forgot Password?
              </a>
            </div>

            <button type="submit" className="login-submit-btn" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
