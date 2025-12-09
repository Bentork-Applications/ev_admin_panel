import React from "react";
import iconEdit from "../../assets/icons/edit.png";
import iconDelete from "../../assets/icons/delete.png";
import iconLocation from "../../assets/icons/location.png";
import iconGroup from "../../assets/icons/group.png";
import iconTime from "../../assets/icons/time.png";

export default function Slot() {
  const slots = [
    {
      title: "Morning Slot",
      city: "Pune",
      time: "06:00 - 12:00",
      capacity: "8/8",
      multiplier: "1.5x",
      lastBooking: "10/12/2025, 23:00:00 PM",
    },
    {
      title: "Afternoon Slot",
      city: "Pune",
      time: "12:00 - 16:00",
      capacity: "1/4",
      multiplier: "1.5x",
      lastBooking: "10/12/2025, 23:00:00 PM",
    },
    {
      title: "Evening Slot",
      city: "Pune",
      time: "16:00 - 21:00",
      capacity: "—",
      multiplier: "1.5x",
      lastBooking: "10/12/2025, 23:00:00 PM",
    },
  ];

  return (
    <div
      style={{
        fontFamily: "Roboto, sans-serif",
        backgroundColor: "#f5f5f5",
        minHeight: "100vh",
        padding: "20px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div>
          <h2
            style={{
              margin: "0",
              fontWeight: "500",
              color: "#111",
            }}
          >
            Slot Management
          </h2>
          <p style={{ margin: "5px 0", color: "#444" }}>
            Manage charging slots for peak hours across cities
          </p>
        </div>
        <button
          style={{
            backgroundColor: "#000",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "8px 16px",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          + Add Slot
        </button>
      </div>

      {/* Slot Cards */}
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        {slots.map((slot, i) => (
          <div
            key={i}
            style={{
              backgroundColor: "#fff",
              borderRadius: "12px",
              padding: "16px",
              flex: "1",
              minWidth: "280px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
              color: "#222",
              fontWeight: "400",
              fontSize: "14px",
            }}
          >
            {/* Title + Edit/Delete */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "16px",
                  fontWeight: "500",
                  color: "#222",
                }}
              >
                {slot.title}
              </h3>
              <div style={{ display: "flex", gap: "10px" }}>
                <img src={iconEdit} alt="edit" style={{ width: "18px" }} />
                <img src={iconDelete} alt="delete" style={{ width: "18px" }} />
              </div>
            </div>

            {/* City, Time, Capacity — One Line */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "8px",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <img
                  src={iconLocation}
                  alt="location"
                  style={{ width: "16px" }}
                />
                <span>{slot.city}</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <img src={iconTime} alt="time" style={{ width: "16px" }} />
                <span>{slot.time}</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <img src={iconGroup} alt="group" style={{ width: "16px" }} />
                <span>{slot.capacity}</span>
              </div>
            </div>

            {/* Multiplier and last booking */}
            <p style={{ margin: "6px 0" }}>
              Price Multiplier: {slot.multiplier}
            </p>
            <p style={{ marginTop: "4px", fontSize: "13px", color: "#444" }}>
              Last Booking: {slot.lastBooking}
            </p>
          </div>
        ))}
      </div>

      {/* Graphical Overview */}
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: "12px",
          padding: "16px",
          marginTop: "20px",
          boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
          color: "#222",
        }}
      >
        <h4 style={{ margin: "0 0 8px 0", fontWeight: "500" }}>
          Graphical Overview
        </h4>
        <p style={{ fontSize: "14px", color: "#444" }}>
          Real-time monitoring data
        </p>
        <div
          style={{
            height: "200px",
            backgroundColor: "#f8f8f8",
            borderRadius: "8px",
            border: "1px solid #ddd",
            marginTop: "10px",
          }}
        ></div>
      </div>
    </div>
  );
}
