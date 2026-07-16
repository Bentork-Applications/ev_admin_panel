// src/pages/Admin/form/SessionPage.jsx
import React from "react";

const inputStyle = {
  width: "100%",
  border: "1.5px solid #E5E7EB",
  borderRadius: "8px",
  padding: "10px 14px",
  marginTop: "6px",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "'Lexend', sans-serif",
  color: "#111827",
  background: "#fff",
  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
};

const labelStyle = {
  fontSize: "12px",
  fontWeight: "600",
  color: "#374151",
  display: "block",
  marginBottom: "0",
};

function FormField({ label, children }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

export default function SessionPage({ open, setOpen }) {
  if (!open) return null;

  const handleFocus = (e) => {
    e.target.style.borderColor = "#27C786";
    e.target.style.boxShadow = "0 0 0 3px rgba(39,199,134,0.12)";
  };
  const handleBlur = (e) => {
    e.target.style.borderColor = "#E5E7EB";
    e.target.style.boxShadow = "none";
  };

  return (
    <>
      <style>{`
        @keyframes sp-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes sp-slide-in {
          from { opacity: 0; transform: scale(0.97) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      {/* Overlay */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position: "fixed",
          top: 0, left: 0,
          width: "100vw", height: "100vh",
          backgroundColor: "rgba(15,23,42,0.45)",
          backdropFilter: "blur(5px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          animation: "sp-fade-in 0.2s ease",
        }}
      >
        {/* Modal card */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: "#fff",
            borderRadius: "20px",
            padding: "0",
            width: "100%",
            maxWidth: "600px",
            maxHeight: "90vh",
            overflowY: "auto",
            boxShadow: "0 24px 48px rgba(0,0,0,0.14), 0 6px 12px rgba(0,0,0,0.08)",
            fontFamily: "'Lexend', sans-serif",
            animation: "sp-slide-in 0.25s cubic-bezier(0.16,1,0.3,1)",
            border: "1px solid #F3F4F6",
          }}
        >
          {/* Header */}
          <div style={{
            padding: "24px 28px 20px",
            borderBottom: "1px solid #F3F4F6",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}>
            <div style={{
              width: "42px", height: "42px",
              borderRadius: "10px",
              background: "rgba(99,102,241,0.08)",
              border: "1px solid rgba(99,102,241,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
              </svg>
            </div>
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: "700", margin: 0, color: "#111827" }}>
                Edit Session
              </h2>
              <p style={{ fontSize: "13px", color: "#6B7280", margin: "3px 0 0", fontWeight: "500" }}>
                Modify session details below
              </p>
            </div>
          </div>

          {/* Form body */}
          <form
            style={{ padding: "24px 28px" }}
            onSubmit={(e) => {
              e.preventDefault();
              alert("Changes saved successfully!");
              setOpen(false);
            }}
          >
            {/* Start & End Time */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginBottom: "20px",
            }}>
              <FormField label="Start Time">
                <input
                  type="text"
                  name="startTime"
                  placeholder="e.g. 2024-01-01 10:00"
                  style={inputStyle}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </FormField>
              <FormField label="End Time">
                <input
                  type="text"
                  name="endTime"
                  placeholder="e.g. 2024-01-01 11:30"
                  style={inputStyle}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </FormField>
            </div>

            {/* Energy */}
            <div style={{ marginBottom: "20px" }}>
              <FormField label="Energy Consumed">
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    name="energy"
                    placeholder="0.00"
                    style={{ ...inputStyle, paddingRight: "52px" }}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                  <span style={{
                    position: "absolute",
                    right: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    marginTop: "3px",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#9CA3AF",
                    pointerEvents: "none",
                    userSelect: "none",
                  }}>kWh</span>
                </div>
              </FormField>
            </div>

            {/* Status & Cost */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginBottom: "28px",
            }}>
              <FormField label="Status">
                <input
                  type="text"
                  name="status"
                  placeholder="e.g. COMPLETED"
                  style={inputStyle}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </FormField>
              <FormField label="Cost (₹)">
                <input
                  type="text"
                  name="cost"
                  placeholder="0.00"
                  style={inputStyle}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </FormField>
            </div>

            {/* Footer */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid #F3F4F6",
              paddingTop: "20px",
            }}>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#6B7280",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontFamily: "'Lexend', sans-serif",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 0",
                  transition: "color 0.2s",
                }}
                onMouseEnter={e => e.currentTarget.style.color = "#111827"}
                onMouseLeave={e => e.currentTarget.style.color = "#6B7280"}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  backgroundColor: "#111827",
                  color: "#fff",
                  padding: "10px 28px",
                  border: "none",
                  borderRadius: "9999px",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontFamily: "'Lexend', sans-serif",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 4px 12px rgba(17,24,39,0.2)",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#374151"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#111827"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
