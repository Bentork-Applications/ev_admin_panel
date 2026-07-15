import React, { useState, useEffect } from "react";

import settings from "../../assets/images/setting_icon.svg";
import Profile from "../../assets/icons/Profile.svg";

export default function Topbar({ onMenuClick, onLogout }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [user, setUser] = useState({ name: "Admin", role: "Admin" });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const decoded = JSON.parse(atob(base64));

      setUser({
        name: decoded.name || decoded.sub || "Admin",
        role: decoded.role || decoded.roles?.[0] || "Admin",
      });
    } catch (err) {
      console.error("Invalid token");
    }
  }, []);

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <button className="menu-btn" onClick={onMenuClick}>☰</button>

          <img
            src="https://raw.githubusercontent.com/Bentork-Applications/assets/refs/heads/main/img/logo_transparent.png"
            alt="BENTORK"
            className="logo"
          />
        </div>

        <div className="topbar-right">
          <svg className="icon" viewBox="0 0 24 24">
            <path d="M12 8V12L15 15" />
            <path d="M3 12C3 16.97 7.03 21 12 21S21 16.97 21 12 16.97 3 12 3c-3.15 0-5.92 1.68-7.5 4.19" />
            <path d="M3 3V7.5H7.5" />
          </svg>

          <img src={settings} alt="Settings" className="icon-img" />



          <div
            className="profile-box"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <img src={Profile} className="avatar" />

            <div className="profile-text">
              <span className="name">{user.name}</span>
              <span className="role">{user.role}</span>
            </div>

            <svg className="dropdown-arrow" viewBox="0 0 10 6">
              <path d="M1 1L5 5L9 1" />
            </svg>

            {isDropdownOpen && (
              <div className="dropdown" onClick={(e) => e.stopPropagation()}>
                <div className="active-profile">
                  <div className="active-left">
                    <img src={Profile} className="avatar" />
                    <div>
                      <span className="name">{user.name}</span> <br />
                      <span className="role">{user.role}</span>
                    </div>
                  </div>
                  <span className="check">✔</span>
                </div>

                <div className="divider" />

                <button className="logout-btn" onClick={onLogout}>
                  Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ✅ ALL CSS INSIDE JSX */}
      <style>{`
        .topbar {
          width: 95%;
          height: 70px;
          background: #fff;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 20px;
          position: sticky;
          top: 0;
          z-index: 1000;
        }

        .topbar-left {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .menu-btn {
          background: transparent;
          border: none;
          font-size: 24px;
          cursor: pointer;
        }

        .logo {
          height: 100px;
          object-fit: contain;
        }

        .topbar-right {
          display: flex;
          align-items: center;
          gap: 20px;
           
        }

        .icon {
          width: 24px;
          height: 24px;
          stroke: #1c1b1f;
          stroke-width: 2;
          fill: none;
          cursor: pointer;
        }

        .icon-img {
          width: 24px;
          height: 24px;
          cursor: pointer;
        }



        .profile-box {
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid #e0e0e0;
          padding: 4px 12px;
          border-radius: 8px;
          cursor: pointer;
          position: relative;
        }

        .avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
        }

        .profile-text {
          display: flex;
          flex-direction: column;
        }

        .name {
          font-size: 16px;
          font-weight: 500;
        }

        .role {
          font-size: 12px;
          color: #757575;
        }

        .dropdown-arrow {
          width: 10px;
          height: 6px;
          stroke: #1c1b1f;
          stroke-width: 1.5;
          fill: none;
        }

        .dropdown {
          position: absolute;
          top: 50px;
          right: 0;
          width: 270px;
         height: 64px;
          background: #fff;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          border-radius: 16px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .active-profile {
          display: flex;
          justify-content: space-between;
          background: #f5f5f5;
          padding: 8px;
          border-radius: 8px;
        }

        .active-left {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .check {
          color: #2e7d32;
          font-weight: bold;
        }

        .divider {
          height: 1px;
          background: #e0e0e0;
        }

        .logout-btn {
          padding: 10px;
          border-radius: 24px;
          border: none;
          background: #333;
          color: #fff;
          cursor: pointer;
        }
      `}</style>
    </>
  );
}
