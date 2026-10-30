import React, { useState, useEffect } from "react";
import { X, Building2, MapPin, Phone, Mail, Globe, FileText, AlertCircle } from "lucide-react";
import { crmService } from "../../services/crmService";

const COMPANY_TYPES = [
  { id: "PRIVATE_LIMITED", label: "Private Limited" },
  { id: "PUBLIC_LIMITED", label: "Public Limited" },
  { id: "LLP", label: "LLP" },
  { id: "PARTNERSHIP", label: "Partnership" },
  { id: "PROPRIETORSHIP", label: "Proprietorship" },
  { id: "DEALER", label: "Dealer / Distributor" },
  { id: "OEM", label: "OEM Manufacturer" },
  { id: "FLEET_OPERATOR", label: "Fleet Operator / Logistics" },
  { id: "END_USER", label: "End User" },
  { id: "OTHER", label: "Other" }
];

const LEAD_SOURCES = [
  { id: "website", label: "Website Inquiry" },
  { id: "referral", label: "Referral / Client" },
  { id: "phone_call", label: "Phone Call / Cold Outreach" },
  { id: "indiamart", label: "IndiaMART" },
  { id: "exhibition", label: "Exhibition / Trade Fair" },
  { id: "walk_in", label: "Walk-In" },
  { id: "social_media", label: "Social Media / LinkedIn" },
  { id: "whatsapp_campaign", label: "WhatsApp Campaign" },
  { id: "campaign_import", label: "Campaign Import" },
  { id: "direct", label: "Direct / Other" }
];

export const CreateCompanyModal = ({
  isOpen,
  onClose,
  companyToEdit = null,
  onCompanySaved,
  showToast
}) => {
  const [formData, setFormData] = useState({
    name: "",
    industry: "",
    companyType: "PRIVATE_LIMITED",
    gstNumber: "",
    phone: "",
    email: "",
    website: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    source: "direct",
    notes: ""
  });
  const [customCompanyType, setCustomCompanyType] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    setFormError(null);
    if (companyToEdit) {
      const isPredefined = COMPANY_TYPES.some(
        (t) => t.id !== "OTHER" && t.id === companyToEdit.companyType
      );
      const isOther = companyToEdit.companyType === "OTHER" || (!isPredefined && !!companyToEdit.companyType);
      
      setFormData({
        name: companyToEdit.name || "",
        industry: companyToEdit.industry || "",
        companyType: isOther ? "OTHER" : (companyToEdit.companyType || "PRIVATE_LIMITED"),
        gstNumber: companyToEdit.gstNumber || "",
        phone: companyToEdit.phone || "",
        email: companyToEdit.email || "",
        website: companyToEdit.website || "",
        address: companyToEdit.address || "",
        city: companyToEdit.city || "",
        state: companyToEdit.state || "",
        pincode: companyToEdit.pincode || "",
        source: companyToEdit.source || "direct",
        notes: companyToEdit.notes || ""
      });
      setCustomCompanyType(!isPredefined && companyToEdit.companyType !== "OTHER" ? companyToEdit.companyType || "" : "");
    } else {
      setFormData({
        name: "",
        industry: "",
        companyType: "PRIVATE_LIMITED",
        gstNumber: "",
        phone: "",
        email: "",
        website: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        source: "direct",
        notes: ""
      });
      setCustomCompanyType("");
    }
  }, [companyToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.name.trim()) {
      setFormError("Please enter company name");
      showToast?.("Please enter company name", "error");
      return;
    }

    if (formData.phone && formData.phone.trim().length > 0) {
      const cleanPhone = formData.phone.trim().replace(/[\s\-()]/g, "");
      if (cleanPhone.length < 7) {
        setFormError("Company phone number must be at least 7 digits");
        showToast?.("Company phone number must be at least 7 digits", "error");
        return;
      }
    }

    if (formData.email && formData.email.trim().length > 0) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        setFormError("Please enter a valid email address");
        showToast?.("Please enter a valid email address", "error");
        return;
      }
    }

    setSubmitting(true);
    try {
      const submitPayload = {
        ...formData,
        companyType: formData.companyType === "OTHER" ? (customCompanyType.trim() || "OTHER") : formData.companyType
      };

      if (companyToEdit?.id) {
        await crmService.updateCompany(companyToEdit.id, submitPayload);
        showToast?.("Company updated successfully", "success");
      } else {
        await crmService.createCompany(submitPayload);
        showToast?.("Company created successfully", "success");
      }
      onCompanySaved?.();
      onClose();
    } catch (err) {
      console.error("Error saving company:", err);
      const msg = err.message || "Failed to save company";
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
          maxWidth: "600px",
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
              <Building2 size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#111827" }}>
                {companyToEdit ? "Edit Company" : "Add New Company"}
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#6B7280" }}>
                Company master record for B2B leads & accounts
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
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "12px", marginBottom: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
                Company Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Apex EV Mobility Pvt Ltd"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                Company Type
              </label>
              <select
                value={formData.companyType}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({ ...formData, companyType: val });
                  if (val !== "OTHER") setCustomCompanyType("");
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
                {COMPANY_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              {formData.companyType === "OTHER" && (
                <input
                  type="text"
                  placeholder="Specify Custom Company Type"
                  value={customCompanyType}
                  onChange={(e) => setCustomCompanyType(e.target.value)}
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
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
                Industry / Domain
              </label>
              <input
                type="text"
                placeholder="e.g. Electric 3-Wheeler OEM"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
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
                GST Number
              </label>
              <input
                type="text"
                placeholder="e.g. 29AAAAA0000A1Z5"
                value={formData.gstNumber}
                onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
                Primary Phone
              </label>
              <input
                type="tel"
                placeholder="e.g. +91 9876543210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
                Email
              </label>
              <input
                type="email"
                placeholder="e.g. contact@apexev.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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

          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "12px", marginBottom: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
                Website
              </label>
              <input
                type="text"
                placeholder="e.g. https://apexev.com"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
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
                Lead / Account Source
              </label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #D1D5DB",
                  fontSize: "13px",
                  backgroundColor: "#fff"
                }}
              >
                {LEAD_SOURCES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
              Address
            </label>
            <input
              type="text"
              placeholder="e.g. Plot 42, Electronic City Phase 1"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
                City
              </label>
              <input
                type="text"
                placeholder="Bengaluru"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
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
                placeholder="Karnataka"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
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
                Pincode
              </label>
              <input
                type="text"
                placeholder="560100"
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
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

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
              Notes
            </label>
            <textarea
              rows={2}
              placeholder="Internal notes about the company..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
              {submitting ? "Saving..." : companyToEdit ? "Update Company" : "Add Company"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
