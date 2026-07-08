import React, { useState } from "react";

const DURATION_OPTIONS = [
    { label: "15 minutes", value: 15 },
    { label: "30 minutes", value: 30 },
    { label: "45 minutes", value: 45 },
    { label: "1 hour", value: 60 },
    { label: "1.5 hours", value: 90 },
    { label: "2 hours", value: 120 },
];

const todayISO = () => new Date().toISOString().split("T")[0];

export default function AddSlot({ onClose, onSlotAdded, baseUrl, chargers, initialChargerId }) {
    // Mode: "single" | "bulk-date" | "bulk-allday"
    const [mode, setMode] = useState("single");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [form, setForm] = useState({
        chargerId: initialChargerId ? String(initialChargerId) : "",
        date: todayISO(),
        startTime: "09:00",
        endTime: "10:00",
        durationMinutes: 60,
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        setError(null);
    };

    // ── Validation ──────────────────────────────────────────────────
    const validate = () => {
        if (!form.chargerId) return "Please select a charger.";

        if (mode === "single") {
            if (!form.date) return "Please select a date.";
            if (!form.startTime) return "Please enter a start time.";
            if (!form.endTime) return "Please enter an end time.";

            const start = new Date(`${form.date}T${form.startTime}:00`);
            const end = new Date(`${form.date}T${form.endTime}:00`);
            if (end <= start) return "End time must be after start time.";

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const slotDate = new Date(form.date);
            if (slotDate < today) return "Date must be today or in the future.";
        }

        if (mode === "bulk-date") {
            if (!form.date) return "Please select a date for bulk generation.";
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const slotDate = new Date(form.date);
            if (slotDate < today) return "Date must be today or in the future.";
        }

        return null;
    };

    // ── Build Payload ────────────────────────────────────────────────
    const buildPayload = () => {
        const chargerId = parseInt(form.chargerId, 10);

        if (mode === "single") {
            return {
                chargerId,
                startTime: `${form.date}T${form.startTime}:00`,
                endTime: `${form.date}T${form.endTime}:00`,
            };
        }

        if (mode === "bulk-date") {
            return {
                chargerId,
                date: form.date,
                durationMinutes: parseInt(form.durationMinutes, 10),
                allDay: false,
            };
        }

        // bulk-allday
        return {
            chargerId,
            durationMinutes: parseInt(form.durationMinutes, 10),
            allDay: true,
        };
    };

    const getEndpoint = () => (mode === "single" ? "/slots" : "/slots/bulk");

    // ── Submit ────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsSubmitting(true);
        const token = localStorage.getItem("token");
        const payload = buildPayload();

        try {
            const res = await fetch(`${baseUrl}${getEndpoint()}`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                const data = await res.json();
                const count =
                    mode === "single"
                        ? 1
                        : Array.isArray(data.slots)
                            ? data.slots.length
                            : 0;

                const msg =
                    mode === "single"
                        ? "Slot created successfully!"
                        : `${count} slots generated successfully!`;

                setSuccess(msg);
                setTimeout(() => {
                    onSlotAdded();
                }, 900);
            } else {
                let errMsg = "Failed to create slot.";
                try {
                    const errData = await res.json();
                    errMsg = errData.error || errMsg;
                } catch {
                    errMsg = await res.text();
                }
                setError(errMsg);
            }
        } catch (err) {
            console.error("Submission error:", err);
            setError("Network error. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── UI helpers ────────────────────────────────────────────────────
    const modeLabels = {
        single: "Single Slot",
        "bulk-date": "Bulk — Date-Specific",
        "bulk-allday": "Bulk — All-Day Recurring",
    };

    const modeDescriptions = {
        single: "Create one slot with an exact start and end time.",
        "bulk-date": "Auto-generate equal-duration slots for an entire date.",
        "bulk-allday": "Create recurring time-only slots that repeat every day.",
    };

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div>
                    <h2 style={styles.heading}>Add Charging Slot</h2>
                    <p style={styles.subheading}>{modeDescriptions[mode]}</p>
                </div>
                <button onClick={onClose} style={styles.closeBtn} aria-label="Close">✕</button>
            </div>

            {/* Mode Tabs */}
            <div style={styles.tabs}>
                {Object.entries(modeLabels)
                    .map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => { setMode(key); setError(null); setSuccess(null); }}
                            style={{
                                ...styles.tab,
                                ...(mode === key ? styles.tabActive : {}),
                            }}
                        >
                            {label}
                        </button>
                    ))
                }
            </div>

            {/* Inline Feedback */}
            {error && (
                <div style={styles.errorBox}>
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
                {/* Charger Select */}
                <div style={styles.field}>
                    <label style={styles.label}>Charger *</label>
                    <select
                        name="chargerId"
                        value={form.chargerId}
                        onChange={handleChange}
                        style={styles.select}
                        required
                    >
                        <option value="" disabled>Select a charger</option>
                        {chargers.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.ocppId || `Charger #${c.id}`} — {c.chargerType || "Unknown"}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Date (single + bulk-date only) */}
                {(mode === "single" || mode === "bulk-date") && (
                    <div style={styles.field}>
                        <label style={styles.label}>Date *</label>
                        <input
                            type="date"
                            name="date"
                            value={form.date}
                            min={todayISO()}
                            onChange={handleChange}
                            style={styles.input}
                            required
                        />
                    </div>
                )}

                {/* Start / End Time (single only) */}
                {mode === "single" && (
                    <div style={styles.row}>
                        <div style={styles.field}>
                            <label style={styles.label}>Start Time *</label>
                            <input
                                type="time"
                                name="startTime"
                                value={form.startTime}
                                onChange={handleChange}
                                style={styles.input}
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
                                style={styles.input}
                                required
                            />
                        </div>
                    </div>
                )}

                {/* Duration (bulk modes only) */}
                {(mode === "bulk-date" || mode === "bulk-allday") && (
                    <div style={styles.field}>
                        <label style={styles.label}>Slot Duration *</label>
                        <select
                            name="durationMinutes"
                            value={form.durationMinutes}
                            onChange={handleChange}
                            style={styles.select}
                        >
                            {DURATION_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                        <span style={styles.hint}>
                            {mode === "bulk-allday"
                                ? `Will create ${Math.floor(1440 / parseInt(form.durationMinutes, 10))} recurring slots covering the full day.`
                                : `Will generate ${Math.floor(1440 / parseInt(form.durationMinutes, 10))} slots for the selected date.`}
                        </span>
                    </div>
                )}

                {/* Info note for all-day mode */}
                {mode === "bulk-allday" && (
                    <div style={styles.infoBox}>
                        <strong>ℹ️ All-Day Recurring:</strong> These slots repeat every day and do not have a specific date.
                        Each charger can have only one set of all-day slots. Delete existing ones before regenerating.
                    </div>
                )}

                {/* Buttons */}
                <div style={styles.buttons}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={styles.cancelBtn}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        style={{
                            ...styles.submitBtn,
                            opacity: isSubmitting ? 0.7 : 1,
                        }}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <span>Processing…</span>
                        ) : mode === "single" ? (
                            "Create Slot"
                        ) : (
                            "Generate Slots"
                        )}
                    </button>
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
    tabs: {
        display: "flex",
        gap: "8px",
        marginBottom: "20px",
        borderBottom: "2px solid #F3F4F6",
        paddingBottom: "0",
    },
    tab: {
        padding: "8px 14px",
        border: "none",
        background: "none",
        fontSize: "13px",
        fontWeight: "500",
        color: "#6B7280",
        cursor: "pointer",
        borderBottom: "2px solid transparent",
        marginBottom: "-2px",
        transition: "all 0.2s",
        fontFamily: "inherit",
        borderRadius: "4px 4px 0 0",
    },
    tabActive: {
        color: "#111827",
        borderBottom: "2px solid #111827",
        fontWeight: "600",
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
    hint: {
        fontSize: "12px",
        color: "#6B7280",
        marginTop: "2px",
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
    infoBox: {
        backgroundColor: "#EFF6FF",
        color: "#1D4ED8",
        padding: "12px 14px",
        borderRadius: "10px",
        fontSize: "13px",
        border: "1px solid #BFDBFE",
        lineHeight: 1.5,
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
