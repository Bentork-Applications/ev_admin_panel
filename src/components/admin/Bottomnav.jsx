import React from "react";

function BottomNav({ onBack, onSubmit }) {
  // fallback if parent didn't pass onBack
  const handleBack = () => {
    if (onBack) {
      onBack(); // parent will control closing
    } else {
      window.history.back(); // default browser back
    }
  };

  return (
    <div
      style={{
        height: "92px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 40px",
        borderTop: "1px solid #ddd",
        background: "#fff",
        flexShrink: 0, // ✅ ensures it stays at bottom
      }}
    >
      <button
        onClick={handleBack}
        style={{
          width: "168px",
          height: "48px",
          borderRadius: "18px",
          border: "1.5px solid #000",
          background: "transparent",
          fontWeight: 600,
          fontSize: "12px",
          cursor: "pointer",
        }}
      >
        Back
      </button>

      <button
        onClick={onSubmit}
        style={{
          width: "168px",
          height: "48px",
          borderRadius: "18px",
          background: "#000",
          color: "#fff",
          fontWeight: 600,
          fontSize: "12px",
          cursor: "pointer",
          border: "none",
        }}
      >
        Submit
      </button>
    </div>
  );
}

export default BottomNav;
