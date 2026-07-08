// components/common/LogoutModal.jsx
import React, { useEffect } from "react";

export default function LogoutModal({ onClose, onConfirm }) {
  // ✅ Close on ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // ✅ Close on outside click
  const handleOverlayClick = (e) => {
    if (e.target.id === "logout-overlay") {
      onClose();
    }
  };

  return (
    <>
      <style>
        {`
          .logout-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background-color: rgba(0, 0, 0, 0.4);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            font-family: 'Roboto', sans-serif;
          }
          .logout-modal {
            background: #fff;
            border-radius: 24px;
            padding: 32px;
            width: 400px;
            box-shadow: 0px 8px 24px rgba(0, 0, 0, 0.15);
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            animation: fadeIn 0.2s ease-out;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          .logout-icon-container {
            width: 70px;
            height: 70px;
            background-color: #FFF3E0;
            border-radius: 20px;
            border: 1px solid #FFE0B2;
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 20px;
            color: #FF9800;
          }
          .logout-title {
            font-weight: 700;
            font-size: 24px;
            margin: 0 0 12px 0;
            color: #111;
          }
          .logout-desc {
            font-size: 16px;
            color: #444;
            margin-bottom: 32px;
            line-height: 1.5;
            padding: 0 10px;
          }
          .logout-actions {
            display: flex;
            gap: 16px;
            width: 100%;
          }
          .btn {
            flex: 1;
            padding: 14px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            border: none;
          }
          .btn-cancel {
            background-color: #F3F4F6;
            color: #374151;
          }
          .btn-cancel:hover {
            background-color: #E5E7EB;
          }
          .btn-confirm {
            background-color: #FF9800;
            color: white;
            box-shadow: 0 4px 12px rgba(255, 152, 0, 0.25);
          }
          .btn-confirm:hover {
            background-color: #F57C00;
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(255, 152, 0, 0.3);
          }
          .btn-confirm:active {
            transform: translateY(0);
          }
        `}
      </style>
      <div id="logout-overlay" className="logout-overlay" onClick={handleOverlayClick}>
        <div className="logout-modal">
          <div className="logout-icon-container">
            {/* Logout Icon */}
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </div>

          <h2 className="logout-title">Log Out</h2>

          <p className="logout-desc">
            You will be logged out of your account. Any unsaved changes will be lost
          </p>

          <div className="logout-actions">
            <button className="btn btn-cancel" onClick={onClose}>
              Stay Logged In
            </button>
            <button className="btn btn-confirm" onClick={onConfirm}>
              Log Out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
