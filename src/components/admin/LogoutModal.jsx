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
    <div
      id="logout-overlay"
      onClick={handleOverlayClick}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0,0,0,0.4)", // overlay
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
        fontFamily: "'Roboto', sans-serif",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "24px",
          padding: "24px",
          width: "340px",
          boxShadow: "0px 8px 24px rgba(0,0,0,0.15)",
        }}
      >
        <h2
          style={{
            fontWeight: "600",
            fontSize: "18px",
            marginBottom: "8px",
          }}
        >
          Log Out?
        </h2>
        <p style={{ fontSize: "14px", marginBottom: "20px", color: "#333" }}>
          Are you sure you want to logout?
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
          }}
        >
          {/* No Button */}
          <button
            onClick={onClose}
            style={{
              padding: "8px 18px",
              border: "1.5px solid #000",
              borderRadius: "999px",
              background: "transparent",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            No
          </button>

          {/* Yes Button */}
          <button
            onClick={onConfirm}
            style={{
              padding: "8px 18px",
              border: "none",
              borderRadius: "999px",
              background: "#000",
              color: "#fff",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
}
