import React from "react";
import iconImg from "../../assets/icons/dashboard_total_user.png"; // adjust path

export default function Card({ title, value , value1}) {
  return (
    <div
      style={{
        width: "253px",
        height: "90px",
        background: "#fff",
        padding: "18px 12px",
        borderRadius: "14px",
        border: "0.2px solid #e0e0e0",
        display: "flex",
        alignItems: "center", // vertically center
        justifyContent: "center", // horizontally center
        gap: "18px",
        boxSizing: "border-box",
        textAlign: "center", // ensure texts are centered
      }}
    >
      {/* Icon */}
      <img
        src={iconImg}
        alt="icon"
        style={{
          width: "24px",
          height: "24px",
          objectFit: "contain",
        }}
      />

      {/* Text Section */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          {/* Label */}
        <p
          style={{
            margin: "5px",
            paddingTop:"10px",
            fontFamily: "Roboto, sans-serif",
            fontWeight: 400,
            fontSize: "12px",
            lineHeight: "153%",
            color: "#666",
          }}
        >
          {title}
        </p> 
       
        {/* Number */}
        <h3
          style={{
            margin: "0",
            fontFamily: "Roboto, sans-serif",
            fontWeight: 600,
            fontSize: "28px",
            lineHeight: "153%",
          }}
        >
          {value}
        </h3>

         <h2
          style={{
            paddingBottom:"5px",
            fontFamily: "Roboto, sans-serif",
            fontWeight: 400,
            fontSize: "12px",
            lineHeight: "153%",
          }}
        >
          {value1}
        </h2>


      
      </div>
    </div>
  );
}
