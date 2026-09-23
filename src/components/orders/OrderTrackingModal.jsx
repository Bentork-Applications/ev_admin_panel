import React, { useState, useEffect } from "react";
import { X, MapPin, Clock, Tag, AlignLeft, AlertCircle } from "lucide-react";

const PRESET_STATUSES = [
  { value: "ORDER_PLACED", label: "Order Placed / Registered" },
  { value: "PAYMENT_CONFIRMED", label: "Payment Confirmed" },
  { value: "IN_PRODUCTION", label: "In Production" },
  { value: "PRODUCTION_COMPLETED", label: "Production Completed" },
  { value: "QUALITY_CHECK_PASSED", label: "Quality Check Passed" },
  { value: "PACKED_AND_READY", label: "Packed & Ready for Dispatch" },
  { value: "DISPATCHED", label: "Dispatched / Shipped" },
  { value: "IN_TRANSIT", label: "In Transit" },
  { value: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "CUSTOM", label: "Custom Status..." }
];

export const OrderTrackingModal = ({
  showModal,
  onClose,
  onSubmit,
  isSubmitting,
  trackingItem, // If provided, mode is 'edit'
  orderId,
  orderNumber
}) => {
  const [statusSelect, setStatusSelect] = useState("IN_TRANSIT");
  const [customStatus, setCustomStatus] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const [error, setError] = useState("");

  const isEdit = Boolean(trackingItem && trackingItem.id);

  // Initialize or reset form values
  useEffect(() => {
    if (!showModal) {
      setError("");
      return;
    }

    if (trackingItem) {
      const matchPreset = PRESET_STATUSES.find(
        (p) => p.value === trackingItem.status || p.label.toLowerCase() === (trackingItem.status || "").toLowerCase()
      );
      if (matchPreset && matchPreset.value !== "CUSTOM") {
        setStatusSelect(matchPreset.value);
        setCustomStatus("");
      } else {
        setStatusSelect("CUSTOM");
        setCustomStatus(trackingItem.status || "");
      }
      setLocation(trackingItem.location || "");
      setDescription(trackingItem.description || "");

      // Format ISO timestamp to datetime-local
      if (trackingItem.timestamp) {
        try {
          const d = new Date(trackingItem.timestamp);
          const offset = d.getTimezoneOffset();
          const localD = new Date(d.getTime() - offset * 60000);
          setTimestamp(localD.toISOString().slice(0, 16));
        } catch {
          setTimestamp(new Date().toISOString().slice(0, 16));
        }
      } else {
        setTimestamp(new Date().toISOString().slice(0, 16));
      }
    } else {
      setStatusSelect("IN_TRANSIT");
      setCustomStatus("");
      setLocation("");
      setDescription("");
      // Default to current local time in YYYY-MM-DDTHH:mm
      const now = new Date();
      const offset = now.getTimezoneOffset();
      const localNow = new Date(now.getTime() - offset * 60000);
      setTimestamp(localNow.toISOString().slice(0, 16));
    }
    setError("");
  }, [showModal, trackingItem]);

  if (!showModal) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalStatus = statusSelect === "CUSTOM" ? customStatus.trim() : statusSelect;

    if (!finalStatus) {
      setError("Please select or enter a tracking status.");
      return;
    }

    const payload = {
      status: finalStatus,
      location: location.trim(),
      description: description.trim(),
      timestamp: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString()
    };

    onSubmit(payload, trackingItem?.id);
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px"
      }}
      onClick={onClose}
    >
      <div
        className="modal-content"
        style={{
          background: "#ffffff",
          borderRadius: "14px",
          width: "100%",
          maxWidth: "520px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          overflow: "hidden"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #E2E8F0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#F8FAFC"
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#0F172A" }}>
              {isEdit ? "Edit Tracking Event" : "Add Order Tracking Event"}
            </h3>
            <span style={{ fontSize: "12px", color: "#64748B" }}>
              Order #{orderNumber || orderId}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#64748B",
              padding: "4px",
              borderRadius: "6px"
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ padding: "20px 24px" }}>
          {error && (
            <div
              style={{
                marginBottom: "16px",
                padding: "10px 14px",
                background: "#FEF2F2",
                border: "1px solid #FCA5A5",
                borderRadius: "8px",
                color: "#991B1B",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Status Selection */}
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#334155",
                marginBottom: "6px"
              }}
            >
              <Tag size={15} color="#475569" /> Status *
            </label>
            <select
              value={statusSelect}
              onChange={(e) => setStatusSelect(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "1px solid #CBD5E1",
                fontSize: "14px",
                color: "#1E293B",
                background: "#ffffff",
                outline: "none"
              }}
            >
              {PRESET_STATUSES.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>

            {statusSelect === "CUSTOM" && (
              <input
                type="text"
                placeholder="Enter custom status (e.g. Re-routed to Hub 4)"
                value={customStatus}
                onChange={(e) => setCustomStatus(e.target.value)}
                required
                style={{
                  marginTop: "8px",
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  fontSize: "14px",
                  color: "#1E293B",
                  boxSizing: "border-box"
                }}
              />
            )}
          </div>

          {/* Location */}
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#334155",
                marginBottom: "6px"
              }}
            >
              <MapPin size={15} color="#475569" /> Location / Checkpoint
            </label>
            <input
              type="text"
              placeholder="e.g. Pune Hub, Maharashtra or In Transit"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "1px solid #CBD5E1",
                fontSize: "14px",
                color: "#1E293B",
                boxSizing: "border-box"
              }}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#334155",
                marginBottom: "6px"
              }}
            >
              <AlignLeft size={15} color="#475569" /> Description / Activity Notes
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Order arrived at primary sorting hub. Scheduled for departure."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "1px solid #CBD5E1",
                fontSize: "14px",
                color: "#1E293B",
                fontFamily: "inherit",
                resize: "vertical",
                boxSizing: "border-box"
              }}
            />
          </div>

          {/* Event Timestamp */}
          <div style={{ marginBottom: "24px" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#334155",
                marginBottom: "6px"
              }}
            >
              <Clock size={15} color="#475569" /> Event Date & Time *
            </label>
            <input
              type="datetime-local"
              value={timestamp}
              onChange={(e) => setTimestamp(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "1px solid #CBD5E1",
                fontSize: "14px",
                color: "#1E293B",
                boxSizing: "border-box"
              }}
            />
          </div>

          {/* Form Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: "9px 18px",
                borderRadius: "8px",
                border: "1px solid #CBD5E1",
                background: "#ffffff",
                color: "#475569",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: "9px 20px",
                borderRadius: "8px",
                border: "none",
                background: "#2563EB",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 600,
                cursor: isSubmitting ? "not-allowed" : "pointer",
                opacity: isSubmitting ? 0.7 : 1,
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              {isSubmitting ? (
                <>Saving...</>
              ) : isEdit ? (
                "Update Tracking"
              ) : (
                "Add Tracking Event"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
