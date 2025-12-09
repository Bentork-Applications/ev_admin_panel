import React, { useState } from "react";
import blackIcon from "../../../assets/icons/stafficon/black.svg";

const AddStaffForm = ({ onClose }) => {
  const [role, setRole] = useState("");

  return (
    <div
      style={{
        backgroundColor: "#fff",
        borderRadius: "20px",
        padding: "30px",
        width: "700px",
        maxWidth: "95%",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
      }}
    >
      {/* Header */}
      <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "10px" }}>
        Register
      </h2>

      {/* Form */}
      <form style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Row: Name + Email */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
          }}
        >
          <input
            type="text"
            placeholder="Name"
            style={{
              padding: "12px",
              border: "1px solid #999",
              borderRadius: "6px",
              fontSize: "16px",
              outline: "none",
            }}
          />
          <input
            type="email"
            placeholder="Email ID"
            style={{
              padding: "12px",
              border: "1px solid #999",
              borderRadius: "6px",
              fontSize: "16px",
              outline: "none",
            }}
          />
        </div>

        {/* Custom Select Role */}
        <div>
          <label
            style={{
              fontFamily: "Lexend, sans-serif",
              fontWeight: "bold",
              display: "block",
              marginBottom: "8px",
            }}
          >
            Select Role:
          </label>

          <div
            style={{
              position: "relative",
              width: "100%",
            }}
          >
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{
                width: "100%",
                padding: "14px",
                paddingLeft: role === "" ? "50px" : "14px", // add space for icon only on Current Role
                borderRadius: "12px",
                border: "1px solid #999",
                background: "#f9f9f9",
                fontSize: "16px",
                outline: "none",
                fontFamily: "Lexend, sans-serif",
              }}
            >
              <option value="" disabled>
                Current Role
              </option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="staff">Staff</option>
            </select>

            {/* Icon only when current role is showing */}
            {role === "" && (
              <img
                src={blackIcon}
                alt="icon"
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "15px",
                  transform: "translateY(-50%)",
                  width: "20px",
                  height: "20px",
                }}
              />
            )}
          </div>
        </div>

        {/* Buttons */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "14px",
            marginTop: "10px",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 20px",
              border: "2px solid #000",
              borderRadius: "25px",
              background: "transparent",
              fontSize: "16px",
              fontWeight: "500",
              cursor: "pointer",
            }}
          >
            Back
          </button>
          <button
            type="submit"
            style={{
              padding: "10px 20px",
              border: "none",
              borderRadius: "25px",
              background: "#1E1E1E",
              color: "#fff",
              fontSize: "16px",
              fontWeight: "500",
              cursor: "pointer",
            }}
          >
            Submit
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddStaffForm;
