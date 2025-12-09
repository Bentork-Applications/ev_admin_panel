// src/pages/Admin/form/SessionPage.jsx
import React from "react";

export default function SessionPage({ open, setOpen }) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: "12px",
          padding: "24px",
          width: "100%",
          maxWidth: "650px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
          fontFamily: "Lexend, sans-serif",
        }}
      >
        <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "10px" }}>
          Edit Session
        </h2>
        <hr style={{ borderColor: "#ddd", marginBottom: "20px" }} />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            alert("Changes saved successfully!");
            setOpen(false);
          }}
        >
          {/* Start & End Time */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginBottom: "20px",
            }}
          >
            <div>
              <label style={{ fontSize: "14px", color: "#555" }}>Start Time</label>
              <input
                type="text"
                name="startTime"
                placeholder="Start Time"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: "14px", color: "#555" }}>End Time</label>
              <input
                type="text"
                name="endTime"
                placeholder="End Time"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Energy */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ fontSize: "14px", color: "#555" }}>Energy</label>
            <input
              type="text"
              name="energy"
              placeholder="Energy"
              style={inputStyle}
            />
            <p style={{ fontSize: "12px", color: "#777", marginTop: "4px" }}>kW/h</p>
          </div>

          {/* Status & Cost */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginBottom: "20px",
            }}
          >
            <div>
              <label style={{ fontSize: "14px", color: "#555" }}>Status</label>
              <input
                type="text"
                name="status"
                placeholder="Status"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: "14px", color: "#555" }}>Cost</label>
              <input
                type="text"
                name="cost"
                placeholder="Cost"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid #ddd",
              paddingTop: "12px",
            }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                background: "none",
                border: "none",
                color: "#333",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Back
            </button>
            <button
              type="submit"
              style={{
                backgroundColor: "#000",
                color: "#fff",
                padding: "8px 20px",
                border: "none",
                borderRadius: "20px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  border: "1px solid #ccc",
  borderRadius: "6px",
  padding: "8px 10px",
  marginTop: "4px",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
};
