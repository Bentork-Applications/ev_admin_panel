import React, { useState, useEffect } from "react";
import { X, TrendingUp, DollarSign, Calendar, Building, User, Percent, FileText } from "lucide-react";
import { crmService } from "../../services/crmService";

export const CreateOpportunityModal = ({
  isOpen,
  onClose,
  initialCompanyId = null,
  initialContactId = null,
  initialLeadId = null,
  onOpportunityCreated,
  showToast
}) => {
  const [title, setTitle] = useState("");
  const [companyId, setCompanyId] = useState(initialCompanyId ? String(initialCompanyId) : "");
  const [contactId, setContactId] = useState(initialContactId ? String(initialContactId) : "");
  const [leadId, setLeadId] = useState(initialLeadId ? String(initialLeadId) : "");
  const [value, setValue] = useState("");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");
  const [probability, setProbability] = useState(20);
  const [notes, setNotes] = useState("");

  const [companies, setCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialCompanyId) setCompanyId(String(initialCompanyId));
      if (initialContactId) setContactId(String(initialContactId));
      if (initialLeadId) setLeadId(String(initialLeadId));
    }
  }, [isOpen, initialCompanyId, initialContactId, initialLeadId]);

  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      setLoadingCompanies(true);
      try {
        const [compData, leadData] = await Promise.all([
          crmService.getAllCompanies(),
          crmService.getAllLeads()
        ]);
        setCompanies(Array.isArray(compData) ? compData : []);
        setLeads(Array.isArray(leadData) ? leadData : []);
      } catch (err) {
        console.warn("Failed to load companies/leads:", err);
      } finally {
        setLoadingCompanies(false);
      }
    };

    loadData();
  }, [isOpen]);

  // Load contacts when company changes
  useEffect(() => {
    if (!companyId) {
      setContacts([]);
      setContactId("");
      return;
    }

    const fetchContacts = async () => {
      try {
        const data = await crmService.getContactsByCompany(companyId);
        setContacts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn("Failed to fetch contacts:", err);
        setContacts([]);
      }
    };

    fetchContacts();
  }, [companyId]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast?.("Please enter opportunity title", "error");
      return;
    }
    if (!companyId) {
      showToast?.("Please select an associated company", "error");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        companyId: Number(companyId),
        contactId: contactId ? Number(contactId) : null,
        leadId: leadId ? Number(leadId) : null,
        value: value ? parseFloat(value) : 0,
        expectedCloseDate: expectedCloseDate || null,
        probability: probability !== "" && probability !== null ? parseInt(probability, 10) : 20,
        notes: notes.trim() || null
      };

      await crmService.createOpportunity(payload);
      showToast?.("Opportunity created successfully", "success");
      onOpportunityCreated?.();
      onClose();
    } catch (err) {
      console.error("Error creating opportunity:", err);
      showToast?.(err.message || "Failed to create opportunity", "error");
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
              <TrendingUp size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#111827" }}>
                Create New Opportunity
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#6B7280" }}>
                Add a deal into the CRM sales pipeline
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
          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
              Deal / Opportunity Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 500x 48V NMC Battery Pack Supply Contract"
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
                Target Company *
              </label>
              <select
                required
                disabled={loadingCompanies}
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #D1D5DB",
                  fontSize: "13px",
                  backgroundColor: loadingCompanies ? "#F3F4F6" : "#fff"
                }}
              >
                <option value="">{loadingCompanies ? "-- Loading companies... --" : "-- Select Company --"}</option>
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
                disabled={!companyId}
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
                  {!companyId ? "Select company first" : "-- Select Contact (Optional) --"}
                </option>
                {contacts.map((ct) => (
                  <option key={ct.id} value={ct.id}>
                    {ct.name} {ct.designation ? `(${ct.designation})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "12px", marginBottom: "8px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
                Deal Value (₹) *
              </label>
              <input
                type="number"
                required
                min="0"
                placeholder="500000"
                value={value}
                onChange={(e) => setValue(e.target.value)}
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
                Win Probability (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                placeholder="20"
                value={probability}
                onChange={(e) => setProbability(e.target.value)}
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

          {/* Live Weighted Value Preview */}
          <div
            style={{
              fontSize: "12px",
              color: "#475569",
              backgroundColor: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "6px",
              padding: "6px 12px",
              marginBottom: "14px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <span>Calculated Weighted Value:</span>
            <strong style={{ color: "#2563EB" }}>
              ₹{(((Number(value) || 0) * (Number(probability) || 0)) / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </strong>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
                Expected Close Date
              </label>
              <input
                type="date"
                value={expectedCloseDate}
                onChange={(e) => setExpectedCloseDate(e.target.value)}
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
                Link Originating Lead
              </label>
              <select
                value={leadId}
                onChange={(e) => setLeadId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #D1D5DB",
                  fontSize: "13px",
                  backgroundColor: "#fff"
                }}
              >
                <option value="">-- No linked lead --</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.leadNumber} - {l.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
              Deal Notes & Strategic Points
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Client requested sample demo battery next week..."
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

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
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
                opacity: submitting ? 0.7 : 1
              }}
            >
              {submitting ? "Creating..." : "Create Opportunity"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
