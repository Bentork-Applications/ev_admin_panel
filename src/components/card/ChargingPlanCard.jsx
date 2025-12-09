import React, { useState } from "react";
import ThreeDots from "../../assets/icons/stationicon/three_dots.svg";
import EditIcon from "../../assets/icons/stafficon/edit.svg";
import DeleteIcon from "../../assets/icons/stafficon/delete.png";

const ChargingPlanCard = ({
  id,
  planName,
  rate = 0.0,
  walletDeduction = 0.0,
  description = "No description",
  chargerType = "Type 2 / Type 3",
  onEdit,
  onDelete,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const displayName = planName || "Plan name";

  return (
    <div
      style={{
        width: "282px",
        height: "170px",
        borderRadius: "18px",
        border: "0.2px solid #E0E0E0",
        backgroundColor: "#FFFFFF",
        padding: "12px",
        fontFamily: "lexend, sans-serif",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        position: "relative",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: "26px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: "600", margin: 0 }}>{displayName}</h3>
        <img
          src={ThreeDots}
          alt="menu"
          style={{ width: "18px", height: "18px", cursor: "pointer" }}
          onClick={() => setMenuOpen((prev) => !prev)}
        />
      </div>

      {/* Dropdown */}
      {menuOpen && (
        <div
          style={{
            position: "absolute",
            top: "40px",
            right: "12px",
            background: "#fff",
            border: "1px solid #E0E0E0",
            borderRadius: "8px",
            boxShadow: "0px 2px 6px rgba(0,0,0,0.15)",
            zIndex: 10,
            width: "120px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 12px",
              cursor: "pointer",
              fontSize: "13px",
            }}
            onClick={() => {
              if (onEdit)
                onEdit({
                  id,
                  planName: displayName,
                  rate,
                  walletDeduction,
                  description,
                  chargerType,
                });
              setMenuOpen(false);
            }}
          >
            <img src={EditIcon} alt="edit" style={{ width: "16px" }} />
            Edit
          </div>
          <hr style={{ margin: 0, border: "0.5px solid #E0E0E0" }} />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 12px",
              cursor: "pointer",
              fontSize: "13px",
              color: "#000",
            }}
            onClick={() => onDelete && onDelete(id)}
          >
            <img src={DeleteIcon} alt="delete" style={{ width: "16px" }} />
            Delete
          </div>
        </div>
      )}

      <hr style={{ border: "0", borderTop: "1px solid #E0E0E0", margin: "8px 0" }} />

      {/* Info */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
        <div>
          <p style={{ margin: 0, fontWeight: "500" }}>Price</p>
          <p style={{ margin: 0 }}>₹ {rate}/kWh</p>
        </div>
        <div>
          <p style={{ margin: 0, fontWeight: "00" }}>Idle Charge</p>
          <p style={{ margin: 0 }}>₹ {walletDeduction}/min</p>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
        <div>
          <p style={{ margin: 0, fontWeight: "500" }}>Description</p>
          <p style={{ margin: 0 }}>{description}</p>
        </div>
        <div>
          <p style={{ margin: 0, fontWeight: "500" }}>Charger Type</p>
          <p style={{ margin: 0 }}>{chargerType}</p>
        </div>
      </div>
    </div>
  );
};

export default ChargingPlanCard;
