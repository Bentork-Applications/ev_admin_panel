import React, { useState } from "react";
import { X, Phone, Search, UserCheck, UserPlus, Building, CheckCircle2, Clock, Calendar } from "lucide-react";
import { crmService } from "../../services/crmService";

const CALL_OUTCOMES = [
  "Interested",
  "Call Back",
  "No Answer",
  "Not Interested",
  "Meeting Scheduled",
  "Wrong Number"
];

const SOURCES = [
  "phone_call",
  "indiamart",
  "website",
  "referral",
  "exhibition",
  "cold_call",
  "whatsapp",
  "email",
  "other"
];

// Validation helpers
const isValidIndianPhone = (phone) => {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s-+]/g, "");
  return /^(?:(?:\+|0{0,2})91(\s*[-]\s*)?|[0]?)?[6789]\d{9}$/.test(cleaned) || /^\d{10}$/.test(cleaned);
};

const isValidEmail = (email) => {
  if (!email || !email.trim()) return true; // Optional field
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

export const NewCallDrawer = ({ isOpen, onClose, onSuccess, showToast }) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const [matchedContact, setMatchedContact] = useState(null);

  // Form states for existing contact call log
  const [callOutcome, setCallOutcome] = useState("Interested");
  const [callNotes, setCallNotes] = useState("");
  const [callDuration, setCallDuration] = useState(10);
  const [followUpDate, setFollowUpDate] = useState("");

  // Form states for new combined contact + company + lead + call
  const [combinedForm, setCombinedForm] = useState({
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    contactDesignation: "",
    companyName: "",
    industry: "",
    companyType: "PRIVATE_LIMITED",
    city: "",
    state: "",
    leadTitle: "",
    source: "phone_call",
    estimatedValue: ""
  });
  const [customSource, setCustomSource] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split("T")[0];

  const handleSearchPhone = async (e) => {
    e?.preventDefault();
    const phoneInput = phoneNumber.trim();
    if (!phoneInput) {
      showToast?.("Please enter a phone number", "error");
      return;
    }
    if (!isValidIndianPhone(phoneInput)) {
      showToast?.("Please enter a valid 10-digit mobile number", "error");
      return;
    }

    setSearching(true);
    setErrors({});
    try {
      const res = await crmService.searchContactByPhone(phoneInput);
      if (res && res.id) {
        setMatchedContact(res);
        setSearchDone(true);
      } else {
        setMatchedContact(null);
        setCombinedForm((prev) => ({
          ...prev,
          contactPhone: phoneInput,
          leadTitle: `Inquiry from ${phoneInput}`
        }));
        setSearchDone(true);
      }
    } catch (err) {
      console.warn("Search phone error:", err);
      // Fallback: assume contact not found
      setMatchedContact(null);
      setCombinedForm((prev) => ({
        ...prev,
        contactPhone: phoneInput,
        leadTitle: `Inquiry from ${phoneInput}`
      }));
      setSearchDone(true);
    } finally {
      setSearching(false);
    }
  };

  const handleResetSearch = () => {
    setSearchDone(false);
    setMatchedContact(null);
    setCallNotes("");
    setPhoneNumber("");
    setErrors({});
  };

  const validateDrawerForm = () => {
    const errs = {};
    const today = new Date().toISOString().split("T")[0];

    if (!callNotes.trim()) {
      errs.callNotes = "Call notes / discussion summary is required";
    }

    if (followUpDate && followUpDate < today) {
      errs.followUpDate = "Follow-up date cannot be in the past";
    }

    if (!matchedContact) {
      if (!combinedForm.contactName.trim()) {
        errs.contactName = "Contact name is required";
      }
      const p = (combinedForm.contactPhone || phoneNumber).trim();
      if (!p || !isValidIndianPhone(p)) {
        errs.contactPhone = "Valid 10-digit phone number is required";
      }
      if (combinedForm.contactEmail && !isValidEmail(combinedForm.contactEmail)) {
        errs.contactEmail = "Enter a valid email address";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateDrawerForm()) {
      showToast?.("Please resolve validation errors before submitting", "error");
      return;
    }

    setSubmitting(true);
    try {
      if (matchedContact) {
        // Contact already exists -> Log Activity (Flow A)
        await crmService.logActivity({
          activityType: "call",
          callOutcome,
          subject: `Call with ${matchedContact.name}`,
          notes: callNotes.trim(),
          durationMinutes: callDuration ? parseInt(callDuration, 10) : null,
          followUpDate: followUpDate || null,
          contactId: matchedContact.id,
          companyId: matchedContact.companyId || null
        });

        showToast?.("Call logged successfully without duplicate records", "success");
        onSuccess?.();
        onClose();
      } else {
        // Combined creation workflow (Flow B)
        const payload = {
          contactName: combinedForm.contactName.trim(),
          contactPhone: (combinedForm.contactPhone || phoneNumber).trim(),
          contactEmail: combinedForm.contactEmail?.trim() || null,
          contactDesignation: combinedForm.contactDesignation?.trim() || null,
          companyName: combinedForm.companyName?.trim() || null,
          industry: combinedForm.industry?.trim() || null,
          companyType: combinedForm.companyType || null,
          city: combinedForm.city?.trim() || null,
          state: combinedForm.state?.trim() || null,
          leadTitle: combinedForm.leadTitle?.trim() || `Inquiry from ${combinedForm.contactName.trim()}`,
          source: combinedForm.source === "other" ? (customSource.trim() || "other") : (combinedForm.source || "phone_call"),
          estimatedValue: combinedForm.estimatedValue ? parseFloat(combinedForm.estimatedValue) : null,
          callOutcome,
          callNotes: callNotes.trim(),
          callDurationMinutes: callDuration ? parseInt(callDuration, 10) : null,
          followUpDate: followUpDate || null
        };

        await crmService.combinedCallAndLead(payload);
        showToast?.("Lead, Contact & Call activity created successfully", "success");
        onSuccess?.();
        onClose();
      }
    } catch (err) {
      console.error("Error submitting call:", err);
      showToast?.(err.message || "Failed to process call workflow", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        backdropFilter: "blur(4px)",
        zIndex: 1200,
        display: "flex",
        justifyContent: "flex-end"
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "540px",
          height: "100%",
          backgroundColor: "#ffffff",
          boxShadow: "-10px 0 30px rgba(0, 0, 0, 0.15)",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          animation: "slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
        `}</style>

        {/* Drawer Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #F3F4F6",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            backgroundColor: "#ffffff",
            zIndex: 10
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                backgroundColor: "#ECFDF5",
                color: "#10B981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Phone size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#111827" }}>
                New Call Workflow
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#6B7280" }}>
                Search phone first to match contacts or auto-register new lead
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#9CA3AF",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "6px"
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: "24px", flex: 1 }}>
          {/* Step 1: Phone Search */}
          {!searchDone ? (
            <div>
              <div
                style={{
                  backgroundColor: "#F9FAFB",
                  borderRadius: "12px",
                  padding: "20px",
                  border: "1px solid #E5E7EB",
                  marginBottom: "20px"
                }}
              >
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#111827",
                    marginBottom: "8px"
                  }}
                >
                  Step 1: Enter Customer / Caller Phone Number
                </label>
                <form onSubmit={handleSearchPhone} style={{ display: "flex", gap: "10px" }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <Phone
                      size={16}
                      color="#9CA3AF"
                      style={{ position: "absolute", left: "12px", top: "12px" }}
                    />
                    <input
                      type="tel"
                      placeholder="e.g. +91 9876543210"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                      autoFocus
                      style={{
                        width: "100%",
                        padding: "10px 12px 10px 38px",
                        borderRadius: "8px",
                        border: "1px solid #D1D5DB",
                        fontSize: "14px",
                        outline: "none",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={searching}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "8px",
                      backgroundColor: "#10B981",
                      color: "#ffffff",
                      border: "none",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: searching ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    {searching ? (
                      "Searching..."
                    ) : (
                      <>
                        <Search size={15} />
                        <span>Search</span>
                      </>
                    )}
                  </button>
                </form>
                <p style={{ margin: "10px 0 0 0", fontSize: "12px", color: "#6B7280" }}>
                  Tip: If the number is already in your database, contact details will be automatically loaded.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Phone searched badge with reset */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  backgroundColor: matchedContact ? "#ECFDF5" : "#FFFBEB",
                  border: matchedContact ? "1px solid #A7F3D0" : "1px solid #FDE68A",
                  marginBottom: "20px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {matchedContact ? (
                    <UserCheck size={18} color="#059669" />
                  ) : (
                    <UserPlus size={18} color="#D97706" />
                  )}
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: matchedContact ? "#065F46" : "#92400E"
                    }}
                  >
                    {matchedContact
                      ? `Existing Contact Found: ${phoneNumber}`
                      : `New Contact (${phoneNumber})`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleResetSearch}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#6B7280",
                    fontSize: "12px",
                    cursor: "pointer",
                    textDecoration: "underline"
                  }}
                >
                  Change Number
                </button>
              </div>

              {/* Case A: Matched Contact Display */}
              {matchedContact && (
                <div
                  style={{
                    backgroundColor: "#F9FAFB",
                    border: "1px solid #E5E7EB",
                    borderRadius: "12px",
                    padding: "16px",
                    marginBottom: "20px"
                  }}
                >
                  <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: 700, color: "#111827" }}>
                    Contact Summary
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12px" }}>
                    <div>
                      <span style={{ color: "#6B7280", display: "block" }}>Name</span>
                      <strong style={{ color: "#111827" }}>{matchedContact.name || "-"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#6B7280", display: "block" }}>Company</span>
                      <strong style={{ color: "#111827" }}>{matchedContact.companyName || "Independent"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#6B7280", display: "block" }}>Phone</span>
                      <strong style={{ color: "#111827" }}>{matchedContact.phone || phoneNumber}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#6B7280", display: "block" }}>Designation</span>
                      <strong style={{ color: "#111827" }}>{matchedContact.designation || "-"}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Case B: Contact Not Found -> Show Full Form */}
              {!matchedContact && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "20px" }}>
                  <div
                    style={{
                      borderBottom: "1px solid #F3F4F6",
                      paddingBottom: "8px"
                    }}
                  >
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#111827" }}>
                      1. Contact Information
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
                        Contact Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ramesh Kumar"
                        value={combinedForm.contactName}
                        onChange={(e) => setCombinedForm({ ...combinedForm, contactName: e.target.value })}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          border: "1px solid #D1D5DB",
                          fontSize: "13px",
                          boxSizing: "border-box"
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
                        Designation / Role
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Purchase Manager"
                        value={combinedForm.contactDesignation}
                        onChange={(e) => setCombinedForm({ ...combinedForm, contactDesignation: e.target.value })}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          border: "1px solid #D1D5DB",
                          fontSize: "13px",
                          boxSizing: "border-box"
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
                        Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="e.g. ramesh@example.com"
                        value={combinedForm.contactEmail}
                        onChange={(e) => setCombinedForm({ ...combinedForm, contactEmail: e.target.value })}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          border: "1px solid #D1D5DB",
                          fontSize: "13px",
                          boxSizing: "border-box"
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
                        Source
                      </label>
                      <select
                        value={combinedForm.source}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCombinedForm({ ...combinedForm, source: val });
                          if (val !== "other") setCustomSource("");
                        }}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          border: "1px solid #D1D5DB",
                          fontSize: "13px",
                          backgroundColor: "#fff"
                        }}
                      >
                        {SOURCES.map((s) => (
                          <option key={s} value={s}>
                            {s.replace("_", " ").toUpperCase()}
                          </option>
                        ))}
                      </select>
                      {combinedForm.source === "other" && (
                        <input
                          type="text"
                          placeholder="Specify Custom Lead Source"
                          value={customSource}
                          onChange={(e) => setCustomSource(e.target.value)}
                          style={{
                            width: "100%",
                            marginTop: "6px",
                            padding: "8px 12px",
                            borderRadius: "8px",
                            border: "1px solid #D1D5DB",
                            fontSize: "13px",
                            boxSizing: "border-box"
                          }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Company Info */}
                  <div
                    style={{
                      borderBottom: "1px solid #F3F4F6",
                      paddingBottom: "8px",
                      marginTop: "8px"
                    }}
                  >
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#111827" }}>
                      2. Company Information (Optional)
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
                        Company Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Apex EV Fleet Pvt Ltd"
                        value={combinedForm.companyName}
                        onChange={(e) => setCombinedForm({ ...combinedForm, companyName: e.target.value })}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          border: "1px solid #D1D5DB",
                          fontSize: "13px",
                          boxSizing: "border-box"
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
                        Industry
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. EV Logistics / OEM"
                        value={combinedForm.industry}
                        onChange={(e) => setCombinedForm({ ...combinedForm, industry: e.target.value })}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          border: "1px solid #D1D5DB",
                          fontSize: "13px",
                          boxSizing: "border-box"
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
                        City
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Bengaluru"
                        value={combinedForm.city}
                        onChange={(e) => setCombinedForm({ ...combinedForm, city: e.target.value })}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          border: "1px solid #D1D5DB",
                          fontSize: "13px",
                          boxSizing: "border-box"
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
                        State
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Karnataka"
                        value={combinedForm.state}
                        onChange={(e) => setCombinedForm({ ...combinedForm, state: e.target.value })}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          border: "1px solid #D1D5DB",
                          fontSize: "13px",
                          boxSizing: "border-box"
                        }}
                      />
                    </div>
                  </div>

                  {/* Lead Info */}
                  <div
                    style={{
                      borderBottom: "1px solid #F3F4F6",
                      paddingBottom: "8px",
                      marginTop: "8px"
                    }}
                  >
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#111827" }}>
                      3. Lead Title & Value
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.6fr", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
                        Lead Title / Requirement
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 48V 30Ah Battery Requirement for 50 3-Wheelers"
                        value={combinedForm.leadTitle}
                        onChange={(e) => setCombinedForm({ ...combinedForm, leadTitle: e.target.value })}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          border: "1px solid #D1D5DB",
                          fontSize: "13px",
                          boxSizing: "border-box"
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
                        Est. Value (₹)
                      </label>
                      <input
                        type="number"
                        placeholder="150000"
                        value={combinedForm.estimatedValue}
                        onChange={(e) => setCombinedForm({ ...combinedForm, estimatedValue: e.target.value })}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          border: "1px solid #D1D5DB",
                          fontSize: "13px",
                          boxSizing: "border-box"
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Call Details (Applies to both existing & new) */}
              <div
                style={{
                  backgroundColor: "#F9FAFB",
                  borderRadius: "12px",
                  padding: "16px",
                  border: "1px solid #E5E7EB",
                  marginBottom: "24px"
                }}
              >
                <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: 700, color: "#111827" }}>
                  Call Details & Outcome
                </h4>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
                      Call Outcome *
                    </label>
                    <select
                      value={callOutcome}
                      onChange={(e) => setCallOutcome(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid #D1D5DB",
                        fontSize: "13px",
                        backgroundColor: "#fff"
                      }}
                    >
                      {CALL_OUTCOMES.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
                      Call Duration (mins)
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="10"
                      value={callDuration}
                      onChange={(e) => setCallDuration(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid #D1D5DB",
                        fontSize: "13px",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
                    Call Notes / Discussion Summary *
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter discussion highlights, customer requirements, agreed timeline, or follow-up reason..."
                    value={callNotes}
                    onChange={(e) => setCallNotes(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid #D1D5DB",
                      fontSize: "13px",
                      boxSizing: "border-box",
                      resize: "vertical"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
                    Next Follow-up Date
                  </label>
                  <input
                    type="date"
                    min={todayStr}
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: errors.followUpDate ? "1px solid #EF4444" : "1px solid #D1D5DB",
                      fontSize: "13px",
                      boxSizing: "border-box"
                    }}
                  />
                  {errors.followUpDate && (
                    <span style={{ fontSize: "11px", color: "#EF4444", marginTop: "3px", display: "block" }}>
                      {errors.followUpDate}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "8px",
                    border: "1px solid #D1D5DB",
                    backgroundColor: "#ffffff",
                    color: "#374151",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "10px 24px",
                    borderRadius: "8px",
                    backgroundColor: "#10B981",
                    color: "#ffffff",
                    border: "none",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: submitting ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 2px 4px rgba(16, 185, 129, 0.2)"
                  }}
                >
                  {submitting ? "Processing..." : matchedContact ? "Save Call Activity" : "Create Lead & Log Call"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
