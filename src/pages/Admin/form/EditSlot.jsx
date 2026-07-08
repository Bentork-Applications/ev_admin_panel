import React, { useState, useEffect } from "react";

const todayISO = () => new Date().toISOString().split("T")[0];

export default function EditSlot({ slot, onClose, onSlotUpdated, baseUrl, chargers }) {
    const isBooked = slot.booked;
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Helpers to parse initial times
    const getInitialDate = () => {
        if (slot.allDay) return "";
        if (!slot.startTime) return todayISO();
        return slot.startTime.split("T")[0];
    };

    const getInitialTime = (timeStr, isDateTime) => {
        if (!timeStr) return "";
        if (isDateTime) {
            const parts = timeStr.split("T");
            return parts[1] ? parts[1].substring(0, 5) : "";
        }
        return timeStr.substring(0, 5);
    };

    const [form, setForm] = useState({
        chargerId: slot.chargerId ? String(slot.chargerId) : "",
        date: getInitialDate(),
        startTime: slot.allDay
            ? getInitialTime(slot.startTimeOnly, false)
            : getInitialTime(slot.startTime, true),
        endTime: slot.allDay
            ? getInitialTime(slot.endTimeOnly, false)
            : getInitialTime(slot.endTime, true),
    });

    useEffect(() => {
        if (isBooked) {
            setError("This slot is already booked and cannot be edited.");
        } else if (slot.allDay) {
            setError("Individual recurring slots cannot be edited because they are generated in bulk. Please delete this slot and create a new date-specific or recurring slot.");
        }
    }, [isBooked, slot.allDay]);

    const handleChange = (e) => {
        if (isBooked || slot.allDay) return;
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        setError(null);
    };

    // ── Validation ──────────────────────────────────────────────────
    const validate = () => {
        if (isBooked) return "Booked slots cannot be edited.";
        if (!form.chargerId) return "Please select a charger.";
        if (!form.startTime) return "Please enter a start time.";
        if (!form.endTime) return "Please enter an end time.";

        if (!slot.allDay) {
            if (!form.date) return "Please select a date.";
            const start = new Date(`${form.date}T${form.startTime}:00`);
            const end = new Date(`${form.date}T${form.endTime}:00`);
            if (end <= start) return "End time must be after start time.";

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const slotDate = new Date(form.date);
            if (slotDate < today) return "Date must be today or in the future.";
        } else {
            // Recurring slot time validation
            const [sh, sm] = form.startTime.split(":").map(Number);
            const [eh, em] = form.endTime.split(":").map(Number);
            const startMinutes = sh * 60 + sm;
            const endMinutes = eh * 60 + em;
            if (endMinutes <= startMinutes) return "End time must be after start time.";
        }

        return null;
    };

    // ── Build Payload ────────────────────────────────────────────────
    const buildPayload = () => {
        const chargerId = parseInt(form.chargerId, 10);
        if (slot.allDay) {
            return {
                id: slot.id,
                chargerId,
                startTimeOnly: `${form.startTime}:00`,
                endTimeOnly: `${form.endTime}:00`,
                allDay: true,
                isBooked: false,
            };
        }

        return {
            id: slot.id,
            chargerId,
            startTime: `${form.date}T${form.startTime}:00`,
            endTime: `${form.date}T${form.endTime}:00`,
            allDay: false,
            isBooked: false,
        };
    };

    // ── Submit ────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isBooked || slot.allDay) return;

        setError(null);
        setSuccess(null);

        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsSubmitting(true);
        const token = localStorage.getItem("token");

        try {
            // 1. Delete the old slot first
            const deleteRes = await fetch(`${baseUrl}/slots/${slot.id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!deleteRes.ok) {
                let errMsg = "Failed to delete slot for editing.";
                try {
                    const errData = await deleteRes.json();
                    errMsg = errData.error || errMsg;
                } catch {}
                setError(errMsg);
                setIsSubmitting(false);
                return;
            }

            // 2. Create the new slot
            const postPayload = {
                chargerId: parseInt(form.chargerId, 10),
                startTime: `${form.date}T${form.startTime}:00`,
                endTime: `${form.date}T${form.endTime}:00`,
            };

            const createRes = await fetch(`${baseUrl}/slots`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(postPayload),
            });

            if (createRes.ok) {
                setSuccess("Slot updated successfully!");
                setTimeout(() => {
                    onSlotUpdated();
                }, 900);
            } else {
                let errMsg = "Failed to create new slot.";
                try {
                    const errData = await createRes.json();
                    errMsg = errData.error || errMsg;
                } catch {
                    errMsg = await createRes.text();
                }
                setError(errMsg);

                // Rollback: try to recreate the old slot
                const rollbackPayload = {
                    chargerId: slot.chargerId,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                };
                await fetch(`${baseUrl}/slots`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(rollbackPayload),
                });
            }
        } catch (err) {
            console.error("Update error:", err);
            setError("Network error. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Find the current charger's details
    const selectedCharger = chargers.find((c) => String(c.id) === String(form.chargerId));

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div>
                    <h2 style={styles.heading}>Edit Charging Slot</h2>
                    <p style={styles.subheading}>
                        {slot.allDay
                            ? "Modify a recurring time-only slot."
                            : "Modify a date-specific charging slot."}
                    </p>
                </div>
                <button onClick={onClose} style={styles.closeBtn} aria-label="Close">✕</button>
            </div>

            {/* Inline Feedback */}
            {error && (
                <div style={(isBooked || slot.allDay) ? styles.warningBox : styles.errorBox}>
                    <span style={{ marginRight: 8 }}>⚠️</span>{error}
                </div>
            )}
            {success && (
                <div style={styles.successBox}>
                    <span style={{ marginRight: 8 }}>✅</span>{success}
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={styles.form}>
                {/* Charger (Disabled/Read-only) */}
                <div style={styles.field}>
                    <label style={styles.label}>Charger</label>
                    <select
                        name="chargerId"
                        value={form.chargerId}
                        style={{ ...styles.select, ...styles.disabledInput }}
                        disabled
                    >
                        <option value={form.chargerId}>
                            {selectedCharger
                                ? `${selectedCharger.ocppId || `Charger #${selectedCharger.id}`} — ${selectedCharger.chargerType || "Unknown"}`
                                : `Charger #${form.chargerId}`}
                        </option>
                    </select>
                </div>

                {/* Date (single only) */}
                {!slot.allDay && (
                    <div style={styles.field}>
                        <label style={styles.label}>Date *</label>
                        <input
                            type="date"
                            name="date"
                            value={form.date}
                            min={todayISO()}
                            onChange={handleChange}
                            style={{
                                ...styles.input,
                                ...(isBooked ? styles.disabledInput : {}),
                            }}
                            disabled={isBooked}
                            required
                        />
                    </div>
                )}

                {/* Start / End Time */}
                <div style={styles.row}>
                    <div style={styles.field}>
                        <label style={styles.label}>Start Time *</label>
                        <input
                            type="time"
                            name="startTime"
                            value={form.startTime}
                            onChange={handleChange}
                            style={{
                                ...styles.input,
                                ...(isBooked ? styles.disabledInput : {}),
                            }}
                            disabled={isBooked}
                            required
                        />
                    </div>
                    <div style={styles.field}>
                        <label style={styles.label}>End Time *</label>
                        <input
                            type="time"
                            name="endTime"
                            value={form.endTime}
                            onChange={handleChange}
                            style={{
                                ...styles.input,
                                ...(isBooked ? styles.disabledInput : {}),
                            }}
                            disabled={isBooked}
                            required
                        />
                    </div>
                </div>

                {/* Buttons */}
                <div style={styles.buttons}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={styles.cancelBtn}
                        disabled={isSubmitting}
                    >
                        Close
                    </button>
                    {!isBooked && !slot.allDay && (
                        <button
                            type="submit"
                            style={{
                                ...styles.submitBtn,
                                opacity: isSubmitting ? 0.7 : 1,
                            }}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <span>Updating…</span> : "Save Changes"}
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}

const styles = {
    container: {
        fontFamily: "'Lexend', sans-serif",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: "20px",
    },
    heading: {
        fontSize: "20px",
        fontWeight: "700",
        margin: "0 0 4px 0",
        color: "#111827",
    },
    subheading: {
        fontSize: "13px",
        color: "#6B7280",
        margin: 0,
    },
    closeBtn: {
        background: "none",
        border: "none",
        fontSize: "18px",
        color: "#6B7280",
        cursor: "pointer",
        padding: "4px 8px",
        borderRadius: "6px",
        lineHeight: 1,
    },
    form: {
        display: "flex",
        flexDirection: "column",
        gap: "16px",
    },
    row: {
        display: "flex",
        gap: "16px",
    },
    field: {
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        flex: 1,
    },
    label: {
        fontSize: "13px",
        fontWeight: "600",
        color: "#374151",
    },
    input: {
        padding: "10px 12px",
        borderRadius: "10px",
        border: "1.5px solid #E5E7EB",
        fontSize: "14px",
        outline: "none",
        fontFamily: "inherit",
        transition: "border-color 0.2s",
        background: "#F9FAFB",
    },
    select: {
        padding: "10px 12px",
        borderRadius: "10px",
        border: "1.5px solid #E5E7EB",
        fontSize: "14px",
        backgroundColor: "#F9FAFB",
        outline: "none",
        fontFamily: "inherit",
        cursor: "pointer",
    },
    disabledInput: {
        background: "#F3F4F6",
        color: "#9CA3AF",
        cursor: "not-allowed",
        borderColor: "#E5E7EB",
    },
    errorBox: {
        backgroundColor: "#FEF2F2",
        color: "#DC2626",
        padding: "12px 14px",
        borderRadius: "10px",
        fontSize: "13px",
        border: "1px solid #FECACA",
        display: "flex",
        alignItems: "center",
    },
    warningBox: {
        backgroundColor: "#FFFBEB",
        color: "#D97706",
        padding: "12px 14px",
        borderRadius: "10px",
        fontSize: "13px",
        border: "1px solid #FDE68A",
        display: "flex",
        alignItems: "center",
    },
    successBox: {
        backgroundColor: "#ECFDF5",
        color: "#059669",
        padding: "12px 14px",
        borderRadius: "10px",
        fontSize: "13px",
        border: "1px solid #A7F3D0",
        display: "flex",
        alignItems: "center",
    },
    buttons: {
        display: "flex",
        justifyContent: "flex-end",
        gap: "12px",
        marginTop: "8px",
        paddingTop: "16px",
        borderTop: "1px solid #F3F4F6",
    },
    cancelBtn: {
        padding: "10px 22px",
        borderRadius: "20px",
        border: "1.5px solid #E5E7EB",
        background: "transparent",
        cursor: "pointer",
        fontSize: "14px",
        fontFamily: "inherit",
        color: "#374151",
        fontWeight: "500",
    },
    submitBtn: {
        padding: "10px 24px",
        borderRadius: "20px",
        border: "none",
        background: "#111827",
        color: "#fff",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: "600",
        fontFamily: "inherit",
        transition: "opacity 0.2s",
    },
};
