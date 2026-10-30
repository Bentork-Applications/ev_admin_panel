import React, { useState } from "react";
import { X, UserPlus, Phone, Mail, Building, Tag, AlertCircle } from "lucide-react";
import { crmService } from "../../services/crmService";

export const CreateContactModal = ({
  isOpen,
  onClose,
  companyId: propCompanyId,
  companyName: propCompanyName,
  onContactSaved,
  showToast
}) => {
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState(propCompanyId ? String(propCompanyId) : "");
  const [companiesList, setCompaniesList] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [isPrimary, setIsPrimary] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  React.useEffect(() => {
    if (propCompanyId) {
      setSelectedCompanyId(String(propCompanyId));
    }
  }, [propCompanyId]);

  React.useEffect(() => {
    if (!isOpen) {
      setName("");
      setDesignation("");
      setPhone("");
      setEmail("");
      setIsPrimary(false);
      setFormError(null);
      setSelectedCompanyId(propCompanyId ? String(propCompanyId) : "");
      return;
    }

    // Load companies list if companyId is not fixed
    if (!propCompanyId) {
      const loadCompanies = async () => {
        setLoadingCompanies(true);
        try {
          const data = await crmService.getAllCompanies();
          setCompaniesList(Array.isArray(data) ? data : []);
        } catch (err) {
          console.warn("Failed to load companies for contact modal:", err);
        } finally {
          setLoadingCompanies(false);
        }
      };
      loadCompanies();
    }
  }, [isOpen, propCompanyId]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim()) {
      setFormError("Please enter contact name");
      showToast?.("Please enter contact name", "error");
      return;
    }
    if (!phone.trim()) {
      setFormError("Please enter phone number");
      showToast?.("Please enter phone number", "error");
      return;
    }
    const cleanPhone = phone.trim().replace(/[\s\-()]/g, "");
    if (cleanPhone.length < 10) {
      setFormError("Phone number must have at least 10 digits");
      showToast?.("Phone number must have at least 10 digits", "error");
      return;
    }
    if (email && email.trim().length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError("Please enter a valid email address");
      showToast?.("Please enter a valid email address", "error");
      return;
    }

    setSubmitting(true);
    try {
      const finalCompanyId = propCompanyId || selectedCompanyId;
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        designation: designation.trim() || null,
        companyId: finalCompanyId ? Number(finalCompanyId) : null,
        isPrimary
      };

      await crmService.createContact(payload);
      showToast?.("Contact created successfully", "success");
      onContactSaved?.();
      onClose();
    } catch (err) {
      console.error("Error creating contact:", err);
      const msg = err.message || "Failed to create contact";
      setFormError(msg);
      showToast?.(msg, "error");
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
          maxWidth: "480px",
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
                Add Contact Person
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#6B7280" }}>
                {propCompanyName ? `Linked to ${propCompanyName}` : "New contact entry"}
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

        <form onSubmit={handleSubmit} style={{ padding: "20px 24px" }}>
          {formError && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 14px",
                borderRadius: "8px",
                backgroundColor: "#FEF2F2",
                border: "1px solid #FECACA",
                color: "#DC2626",
                fontSize: "12.5px",
                marginBottom: "14px"
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{formError}</span>
            </div>
          )}
          {/* Company Selection Dropdown when not fixed by prop */}
          {!propCompanyId && (
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
                Associated Company
              </label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                disabled={loadingCompanies}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #D1D5DB",
                  fontSize: "13px",
                  backgroundColor: "#fff"
                }}
              >
                <option value="">{loadingCompanies ? "Loading companies..." : "-- Select Company (Optional) --"}</option>
                {companiesList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.city ? `(${c.city})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
              Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Anand Mahindra"
              value={name}
              onChange={(e) => setName(e.target.value)}
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

          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
              Designation / Role
            </label>
            <input
              type="text"
              placeholder="e.g. Chief Procurement Officer"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
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
                Phone Number *
              </label>
              <input
                type="tel"
                required
                placeholder="e.g. +91 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
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
                Email Address
              </label>
              <input
                type="email"
                placeholder="e.g. anand@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: "#374151" }}>
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                style={{ width: "16px", height: "16px", accentColor: "#10B981" }}
              />
              <span>Set as primary contact for this company</span>
            </label>
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
              {submitting ? "Adding..." : "Add Contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
