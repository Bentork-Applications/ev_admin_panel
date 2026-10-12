import React, { useState, useEffect } from "react";
import { X, UserPlus, Building, Phone, MapPin, DollarSign, Calendar, FileText } from "lucide-react";
import { crmService } from "../../services/crmService";

const SOURCES = [
  { id: "indiamart", label: "IndiaMART" },
  { id: "website", label: "Website Inquiry" },
  { id: "phone_call", label: "Phone Call" },
  { id: "referral", label: "Referral" },
  { id: "exhibition", label: "Exhibition / Expo" },
  { id: "cold_call", label: "Cold Call" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "email", label: "Email" },
  { id: "other", label: "Other" }
];

export const CreateLeadModal = ({ isOpen, onClose, onLeadCreated, showToast }) => {
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("indiamart");
  const [customSource, setCustomSource] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [contactId, setContactId] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [notes, setNotes] = useState("");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");

  const [companies, setCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch companies on open
  useEffect(() => {
    if (!isOpen) return;

    const fetchCompanies = async () => {
      setLoadingCompanies(true);
      try {
        const data = await crmService.getAllCompanies();
        setCompanies(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn("Failed to fetch companies:", err);
      } finally {
        setLoadingCompanies(false);
      }
    };

    fetchCompanies();
  }, [isOpen]);

  // Fetch contacts whenever company changes
  useEffect(() => {
    if (!companyId) {
      setContacts([]);
      setContactId("");
      return;
    }

    const fetchContacts = async () => {
      setLoadingContacts(true);
      try {
        const data = await crmService.getContactsByCompany(companyId);
        setContacts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn("Failed to fetch contacts for company:", err);
        setContacts([]);
      } finally {
        setLoadingContacts(false);
      }
    };

    fetchContacts();
  }, [companyId]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast?.("Please enter a lead title", "error");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        source: source === "other" ? (customSource.trim() || "other") : source,
        companyId: companyId ? Number(companyId) : null,
        contactId: contactId ? Number(contactId) : null,
        city: city.trim() || null,
        state: state.trim() || null,
        estimatedValue: estimatedValue ? parseFloat(estimatedValue) : null,
        notes: notes.trim() || null,
        nextFollowUpDate: nextFollowUpDate || null
      };

      await crmService.createLead(payload);
      showToast?.("Lead created successfully", "success");
      onLeadCreated?.();
      onClose();
    } catch (err) {
      console.error("Error creating lead:", err);
      showToast?.(err.message || "Failed to create lead", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
        padding: "16px"
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "580px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px",
            borderBottom: "1px solid #F3F4F6"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                backgroundColor: "#ECFDF5",
                color: "#10B981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <UserPlus size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#111827" }}>
                Create New Lead
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#6B7280" }}>
                Register a new sales inquiry or prospect
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
              padding: "4px"
            }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          {/* Title */}
          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
              Lead Title / Requirement Summary *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 48V 30Ah Battery Enquiry for Fleet"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "1px solid #D1D5DB",
                fontSize: "13px",
                boxSizing: "border-box"
              }}
            />
          </div>

          {/* Source & Estimated Value Row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
                Lead Source
              </label>
              <select
                value={source}
                onChange={(e) => {
                  const val = e.target.value;
                  setSource(val);
                  if (val !== "other") setCustomSource("");
                }}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #D1D5DB",
                  fontSize: "13px",
                  backgroundColor: "#fff"
                }}
              >
                {SOURCES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              {source === "other" && (
                <input
                  type="text"
                  placeholder="Specify Custom Lead Source"
                  value={customSource}
                  onChange={(e) => setCustomSource(e.target.value)}
                  style={{
                    width: "100%",
                    marginTop: "6px",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #D1D5DB",
                    fontSize: "13px",
                    boxSizing: "border-box"
                  }}
                />
              )}
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
                Estimated Value (₹)
              </label>
              <input
                type="number"
                placeholder="250000"
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #D1D5DB",
                  fontSize: "13px",
                  boxSizing: "border-box"
                }}
              />
            </div>
          </div>

          {/* Company & Contact Row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
                Associated Company
              </label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #D1D5DB",
                  fontSize: "13px",
                  backgroundColor: "#fff"
                }}
              >
                <option value="">-- Select Company (Optional) --</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
                Contact Person
              </label>
              <select
                value={contactId}
                disabled={!companyId || loadingContacts}
                onChange={(e) => setContactId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #D1D5DB",
                  fontSize: "13px",
                  backgroundColor: !companyId ? "#F3F4F6" : "#fff"
                }}
              >
                <option value="">
                  {loadingContacts
                    ? "Loading contacts..."
                    : !companyId
                    ? "Select company first"
                    : "-- Select Contact (Optional) --"}
                </option>
                {contacts.map((ct) => (
                  <option key={ct.id} value={ct.id}>
                    {ct.name} {ct.designation ? `(${ct.designation})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Location: City & State */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
                City
              </label>
              <input
                type="text"
                placeholder="e.g. Pune"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
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
                placeholder="e.g. Maharashtra"
                value={state}
                onChange={(e) => setState(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #D1D5DB",
                  fontSize: "13px",
                  boxSizing: "border-box"
                }}
              />
            </div>
          </div>

          {/* Next Follow-up Date */}
          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
              Next Follow-up Date
            </label>
            <input
              type="date"
              value={nextFollowUpDate}
              onChange={(e) => setNextFollowUpDate(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "1px solid #D1D5DB",
                fontSize: "13px",
                boxSizing: "border-box"
              }}
            />
          </div>

          {/* Notes */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
              Requirement Notes / Client Details
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Needs sample cells for testing before bulk delivery of 100 units..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "1px solid #D1D5DB",
                fontSize: "13px",
                boxSizing: "border-box",
                resize: "vertical"
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: "9px 16px",
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
                padding: "9px 22px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "#10B981",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 600,
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.7 : 1,
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              {submitting ? "Adding..." : "Add Lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
