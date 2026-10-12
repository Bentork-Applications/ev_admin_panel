import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Phone,
  Search,
  UserCheck,
  UserPlus,
  Building,
  CheckCircle2,
  Clock,
  Calendar,
  ArrowRight,
  Check,
  RefreshCw,
  AlertCircle,
  X,
  Mail,
  Briefcase,
  MapPin,
  Tag
} from "lucide-react";
import { crmService } from "../../../services/crmService";
import { Toast } from "../../../components/common/Toast";

const PRODUCT_INTEREST_OPTIONS = [
  "EV Battery Pack",
  "BMS",
  "Charging Solution",
  "BESS",
  "Connectors",
  "Custom Battery Module"
];

const INDUSTRIES = [
  "Automotive / EV",
  "Industrial",
  "Renewable Energy",
  "Electronics",
  "OEM Manufacturing",
  "Dealer / Distribution",
  "Other"
];

const LOCATIONS = [
  "Pune, Maharashtra",
  "Mumbai, Maharashtra",
  "Delhi, NCR",
  "Bengaluru, Karnataka",
  "Ahmedabad, Gujarat",
  "Chennai, Tamil Nadu",
  "Hyderabad, Telangana",
  "Nagpur, Maharashtra",
  "Other"
];

const LEAD_SOURCES = [
  "Phone Call",
  "IndiaMART",
  "Website",
  "Referral",
  "Exhibition",
  "Cold Call",
  "WhatsApp",
  "Email",
  "Other"
];

const CALL_OUTCOMES = [
  "Interested",
  "Call Back",
  "No Answer",
  "Not Interested",
  "Meeting Scheduled",
  "Wrong Number"
];

const NEXT_ACTIONS = [
  "Send Quotation",
  "Schedule Meeting",
  "Call Back",
  "Technical Discussion",
  "Send Brochure"
];

export const formatINR = (amount) => {
  if (amount == null || amount === "" || isNaN(Number(amount))) return "₹0";
  const num = Number(amount);
  return "₹" + num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
};

// Validation helpers
const isValidIndianPhone = (phone) => {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-\+]/g, "");
  return /^(?:(?:\+|0{0,2})91(\s*[\-]\s*)?|[0]?)?[6789]\d{9}$/.test(cleaned) || /^\d{10}$/.test(cleaned);
};

const isValidEmail = (email) => {
  if (!email || !email.trim()) return true; // Optional field
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

export default function CrmNewCallPage() {
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const [searchPhone, setSearchPhone] = useState("");
  const [matchedContact, setMatchedContact] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successInfo, setSuccessInfo] = useState({ title: "", description: "", type: "lead" });

  // Custom Dropdown values
  const [customIndustry, setCustomIndustry] = useState("");
  const [customLocation, setCustomLocation] = useState("");
  const [customLeadSource, setCustomLeadSource] = useState("");

  // Validation errors
  const [errors, setErrors] = useState({});

  // Form State
  const [formData, setFormData] = useState({
    companyName: "",
    contactPerson: "",
    phone: "",
    email: "",
    designation: "",
    industry: "Automotive / EV",
    location: "Pune, Maharashtra",
    leadSource: "Phone Call",
    selectedProducts: [],
    callType: "Inbound",
    callOutcome: "Interested",
    interestLevel: "High",
    requirementType: "Product Enquiry",
    expectedQuantity: "",
    estimatedValue: "",
    expectedTimeline: "Immediate",
    discussionSummary: "",
    callDurationMinutes: "10",
    nextAction: "Send Quotation",
    followUpDate: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
    assignTo: ""
  });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  const handleSearch = async (e) => {
    e?.preventDefault();
    const phoneInput = searchPhone.trim();

    if (!phoneInput) {
      showToast("Please enter a phone number to search", "error");
      return;
    }

    if (!isValidIndianPhone(phoneInput)) {
      showToast("Please enter a valid 10-digit phone number", "error");
      return;
    }

    setSearching(true);
    setErrors({});
    try {
      const res = await crmService.searchContactByPhone(phoneInput);
      if (res && res.id) {
        setMatchedContact(res);
        setFormData((prev) => ({
          ...prev,
          contactPerson: res.name || "",
          phone: res.phone || phoneInput,
          email: res.email || "",
          designation: res.designation || "",
          companyName: res.companyName || "",
          industry: res.industry || prev.industry
        }));
        showToast(`Existing contact found: ${res.name}`, "success");
      } else {
        setMatchedContact(null);
        setFormData((prev) => ({
          ...prev,
          phone: phoneInput
        }));
      }
      setSearchDone(true);
    } catch (err) {
      console.warn("Search phone error:", err);
      setMatchedContact(null);
      setFormData((prev) => ({
        ...prev,
        phone: phoneInput
      }));
      setSearchDone(true);
    } finally {
      setSearching(false);
    }
  };

  const handleResetSearch = () => {
    setSearchPhone("");
    setMatchedContact(null);
    setSearchDone(false);
    setErrors({});
    setFormData((prev) => ({
      ...prev,
      contactPerson: "",
      phone: "",
      email: "",
      designation: "",
      companyName: "",
      discussionSummary: ""
    }));
  };

  const toggleProduct = (prod) => {
    setFormData((prev) => {
      const exists = prev.selectedProducts.includes(prod);
      return {
        ...prev,
        selectedProducts: exists
          ? prev.selectedProducts.filter((p) => p !== prod)
          : [...prev.selectedProducts, prod]
      };
    });
  };

  const validateForm = () => {
    const errs = {};
    const today = new Date().toISOString().split("T")[0];

    // Phone validation
    if (!formData.phone.trim()) {
      errs.phone = "Phone number is required";
    } else if (!isValidIndianPhone(formData.phone.trim())) {
      errs.phone = "Enter a valid 10-digit mobile number";
    }

    // Email validation
    if (formData.email && !isValidEmail(formData.email)) {
      errs.email = "Enter a valid email address (e.g. name@company.com)";
    }

    // Contact person (if new lead)
    if (!matchedContact && !formData.contactPerson.trim()) {
      errs.contactPerson = "Contact person name is required";
    }

    // Follow-up Date validation (cannot be in the past)
    if (formData.followUpDate && formData.followUpDate < today) {
      errs.followUpDate = "Follow-up date cannot be in the past";
    }

    // Discussion summary required for existing contact
    if (matchedContact && !formData.discussionSummary.trim()) {
      errs.discussionSummary = "Please enter call notes / discussion summary";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast("Please resolve the validation errors before submitting", "error");
      return;
    }

    setSubmitting(true);
    try {
      if (matchedContact) {
        // ==================== FLOW A: EXISTING CONTACT -> LOG ACTIVITY ====================
        const activityPayload = {
          activityType: "call",
          callOutcome: formData.callOutcome,
          subject: `Call with ${matchedContact.name}`,
          notes:
            formData.discussionSummary.trim() ||
            `Call with ${matchedContact.name}. Outcome: ${formData.callOutcome}. Interest: ${formData.interestLevel}. Next Action: ${formData.nextAction}.`,
          durationMinutes: formData.callDurationMinutes ? parseInt(formData.callDurationMinutes, 10) : 10,
          followUpDate: formData.followUpDate || null,
          contactId: matchedContact.id,
          companyId: matchedContact.companyId || null
        };

        await crmService.logActivity(activityPayload);
        showToast("Call activity logged successfully!", "success");
        setSuccessInfo({
          title: "Call Logged Successfully",
          description: `Call activity with ${matchedContact.name} (${matchedContact.companyName || "Direct"}) has been logged without duplicate records.`,
          type: "activity"
        });
        setShowSuccessModal(true);
      } else {
        // ==================== FLOW B: NEW LEAD -> COMBINED CALL & LEAD ====================
        const finalIndustry =
          formData.industry === "Other" ? (customIndustry.trim() || "Other") : formData.industry;
        const finalLocation =
          formData.location === "Other" ? (customLocation.trim() || "Other") : formData.location;
        const finalSource =
          formData.leadSource === "Other" ? (customLeadSource.trim() || "Other") : formData.leadSource;

        const cityPart = finalLocation.includes(",") ? finalLocation.split(",")[0].trim() : finalLocation;
        const statePart = finalLocation.includes(",") ? finalLocation.split(",")[1].trim() : "Maharashtra";

        const parsedEstValue =
          formData.estimatedValue && !isNaN(Number(formData.estimatedValue))
            ? parseFloat(formData.estimatedValue)
            : null;

        const payload = {
          contactName: formData.contactPerson.trim(),
          contactPhone: formData.phone.trim(),
          contactEmail: formData.email.trim() || null,
          contactDesignation: formData.designation.trim() || null,
          companyName: formData.companyName.trim() || null,
          industry: finalIndustry,
          companyType: "PRIVATE_LIMITED",
          city: cityPart || "Pune",
          state: statePart || "Maharashtra",
          leadTitle: `${formData.requirementType} — ${
            formData.selectedProducts.join(", ") || "EV Battery Inquiry"
          }`,
          source: finalSource.toLowerCase().replace(/\s+/g, "_"),
          estimatedValue: parsedEstValue,
          callOutcome: formData.callOutcome,
          callNotes:
            formData.discussionSummary.trim() ||
            `Initial ${formData.callType} call. Outcome: ${formData.callOutcome}. Interest: ${formData.interestLevel}. Next Action: ${formData.nextAction}.`,
          callDurationMinutes: formData.callDurationMinutes ? parseInt(formData.callDurationMinutes, 10) : 10,
          followUpDate: formData.followUpDate || null
        };

        await crmService.combinedCallAndLead(payload);
        showToast("Lead, Contact & Call #1 saved successfully!", "success");
        setSuccessInfo({
          title: "Lead Created & Call #1 Saved",
          description: `New lead for "${formData.contactPerson}" (${formData.companyName || "Individual"}) has been created and Call #1 is recorded.`,
          type: "lead"
        });
        setShowSuccessModal(true);
      }
    } catch (err) {
      console.error("Failed to save call/lead:", err);
      showToast(err.message || "Failed to process call workflow", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForAnotherCall = () => {
    setShowSuccessModal(false);
    handleResetSearch();
    setFormData({
      companyName: "",
      contactPerson: "",
      phone: "",
      email: "",
      designation: "",
      industry: "Automotive / EV",
      location: "Pune, Maharashtra",
      leadSource: "Phone Call",
      selectedProducts: [],
      callType: "Inbound",
      callOutcome: "Interested",
      interestLevel: "High",
      requirementType: "Product Enquiry",
      expectedQuantity: "",
      estimatedValue: "",
      expectedTimeline: "Immediate",
      discussionSummary: "",
      callDurationMinutes: "10",
      nextAction: "Send Quotation",
      followUpDate: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
      assignTo: ""
    });
  };

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "16px 24px", fontFamily: "inherit" }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#0F172A", margin: 0 }}>
          New Call / Add Lead
        </h1>
        <p style={{ fontSize: "13px", color: "#64748B", margin: "4px 0 0 0" }}>
          Search phone first. If existing, log call activity. If new, create company, contact, lead & Call #1 in one workflow.
        </p>
      </div>

      {/* Interactive 4-Step Stepper Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "12px 18px",
          backgroundColor: "#F8FAFC",
          borderRadius: "10px",
          border: "1px solid #E2E8F0",
          marginBottom: "24px",
          fontSize: "13px",
          fontWeight: 600,
          overflowX: "auto"
        }}
      >
        <span style={{ color: searchDone ? "#16A34A" : "#2563EB", display: "flex", alignItems: "center", gap: "4px" }}>
          {searchDone ? <Check size={14} /> : null} 1. Find Existing Record
        </span>
        <span style={{ color: "#94A3B8" }}>→</span>
        <span style={{ color: matchedContact ? "#16A34A" : searchDone ? "#2563EB" : "#475569" }}>
          2. {matchedContact ? "Existing Contact" : "New Contact Info"}
        </span>
        <span style={{ color: "#94A3B8" }}>→</span>
        <span style={{ color: searchDone ? "#2563EB" : "#475569" }}>3. Call Details & Outcome</span>
        <span style={{ color: "#94A3B8" }}>→</span>
        <span style={{ color: "#475569" }}>4. Follow-up & Next Action</span>
      </div>

      {/* Step 1: Search Input Bar */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          padding: "20px",
          border: "1px solid #E2E8F0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          marginBottom: "20px"
        }}
      >
        <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#0F172A", marginBottom: "8px" }}>
          Step 1: Check If Contact Already Exists
        </label>
        <form onSubmit={handleSearch} style={{ display: "flex", gap: "10px", maxWidth: "520px", alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
              <input
                type="tel"
                placeholder="Enter 10-digit mobile number e.g. 9876543210"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box"
                }}
              />
            </div>
            {searchPhone && !isValidIndianPhone(searchPhone) && (
              <span style={{ fontSize: "11px", color: "#DC2626", marginTop: "4px", display: "block" }}>
                Please enter a valid 10-digit number
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={searching}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              backgroundColor: "#2563EB",
              color: "#ffffff",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            {searching ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Searching...</span>
              </>
            ) : (
              <>
                <Search size={14} />
                <span>Search</span>
              </>
            )}
          </button>
        </form>

        {/* Existing Contact Summary Card or New Lead Banner */}
        {searchDone && (
          <div style={{ marginTop: "16px" }}>
            {matchedContact ? (
              <div
                style={{
                  backgroundColor: "#F0FDF4",
                  borderRadius: "10px",
                  border: "1px solid #BBF7D0",
                  padding: "16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px"
                }}
              >
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "50%",
                      backgroundColor: "#DCFCE7",
                      color: "#16A34A",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <UserCheck size={22} />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <strong style={{ fontSize: "15px", color: "#0F172A" }}>{matchedContact.name}</strong>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "#16A34A",
                          backgroundColor: "#DCFCE7",
                          padding: "2px 8px",
                          borderRadius: "12px"
                        }}
                      >
                        Existing Contact
                      </span>
                    </div>
                    <div style={{ fontSize: "12px", color: "#475569", marginTop: "3px", display: "flex", gap: "14px", flexWrap: "wrap" }}>
                      {matchedContact.companyName && (
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <Building size={13} /> {matchedContact.companyName}
                        </span>
                      )}
                      {matchedContact.phone && (
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <Phone size={13} /> {matchedContact.phone}
                        </span>
                      )}
                      {matchedContact.email && (
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <Mail size={13} /> {matchedContact.email}
                        </span>
                      )}
                      {matchedContact.designation && (
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <Briefcase size={13} /> {matchedContact.designation}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleResetSearch}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    backgroundColor: "#ffffff",
                    border: "1px solid #CBD5E1",
                    color: "#475569",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Search Again / Change Number
                </button>
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: "#EFF6FF",
                  borderRadius: "10px",
                  border: "1px solid #BFDBFE",
                  padding: "14px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#1E40AF", fontSize: "13px", fontWeight: 500 }}>
                  <UserPlus size={18} />
                  <span>
                    No existing contact found for <strong>{searchPhone}</strong>. Fill in details below to register new lead and log Call #1.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleResetSearch}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "6px",
                    backgroundColor: "#ffffff",
                    border: "1px solid #BFDBFE",
                    color: "#1E40AF",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Clear Search
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* Section 1: Contact Information (Only editable when creating a New Lead) */}
        {!matchedContact && (
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              padding: "24px",
              border: "1px solid #E2E8F0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
            }}
          >
            <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
              Step 2: Contact & Company Information
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                  Company Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Shree EV Mobility Pvt Ltd"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                  Contact Person *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amit Sharma"
                  value={formData.contactPerson}
                  onChange={(e) => {
                    setFormData({ ...formData, contactPerson: e.target.value });
                    if (errors.contactPerson) setErrors((prev) => ({ ...prev, contactPerson: null }));
                  }}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: errors.contactPerson ? "1px solid #DC2626" : "1px solid #CBD5E1",
                    fontSize: "13px",
                    boxSizing: "border-box"
                  }}
                />
                {errors.contactPerson && (
                  <span style={{ fontSize: "11px", color: "#DC2626", marginTop: "3px", display: "block" }}>
                    {errors.contactPerson}
                  </span>
                )}
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="9876543210"
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, phone: e.target.value });
                    if (errors.phone) setErrors((prev) => ({ ...prev, phone: null }));
                  }}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: errors.phone ? "1px solid #DC2626" : "1px solid #CBD5E1",
                    fontSize: "13px",
                    boxSizing: "border-box"
                  }}
                />
                {errors.phone && (
                  <span style={{ fontSize: "11px", color: "#DC2626", marginTop: "3px", display: "block" }}>
                    {errors.phone}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="amit@company.com"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                  }}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: errors.email ? "1px solid #DC2626" : "1px solid #CBD5E1",
                    fontSize: "13px",
                    boxSizing: "border-box"
                  }}
                />
                {errors.email && (
                  <span style={{ fontSize: "11px", color: "#DC2626", marginTop: "3px", display: "block" }}>
                    {errors.email}
                  </span>
                )}
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                  Designation / Role
                </label>
                <input
                  type="text"
                  placeholder="e.g. Purchase Manager, CEO"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                  Industry
                </label>
                <select
                  value={formData.industry}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ ...formData, industry: val });
                    if (val !== "Other") setCustomIndustry("");
                  }}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", backgroundColor: "#fff", boxSizing: "border-box" }}
                >
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
                {formData.industry === "Other" && (
                  <input
                    type="text"
                    placeholder="Specify Custom Industry"
                    value={customIndustry}
                    onChange={(e) => setCustomIndustry(e.target.value)}
                    style={{ width: "100%", marginTop: "6px", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", boxSizing: "border-box" }}
                  />
                )}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                  Location / City
                </label>
                <select
                  value={formData.location}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ ...formData, location: val });
                    if (val !== "Other") setCustomLocation("");
                  }}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", backgroundColor: "#fff", boxSizing: "border-box" }}
                >
                  {LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
                {formData.location === "Other" && (
                  <input
                    type="text"
                    placeholder="Specify Location (e.g. Nashik, Maharashtra)"
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                    style={{ width: "100%", marginTop: "6px", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", boxSizing: "border-box" }}
                  />
                )}
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                  Lead Source
                </label>
                <select
                  value={formData.leadSource}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ ...formData, leadSource: val });
                    if (val !== "Other") setCustomLeadSource("");
                  }}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", backgroundColor: "#fff", boxSizing: "border-box" }}
                >
                  {LEAD_SOURCES.map((src) => (
                    <option key={src} value={src}>{src}</option>
                  ))}
                </select>
                {formData.leadSource === "Other" && (
                  <input
                    type="text"
                    placeholder="Specify Custom Lead Source"
                    value={customLeadSource}
                    onChange={(e) => setCustomLeadSource(e.target.value)}
                    style={{ width: "100%", marginTop: "6px", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", boxSizing: "border-box" }}
                  />
                )}
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "8px" }}>
                Product Interest Tags
              </label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {PRODUCT_INTEREST_OPTIONS.map((prod) => {
                  const selected = formData.selectedProducts.includes(prod);
                  return (
                    <button
                      key={prod}
                      type="button"
                      onClick={() => toggleProduct(prod)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: 600,
                        border: `1px solid ${selected ? "#93C5FD" : "#CBD5E1"}`,
                        backgroundColor: selected ? "#EFF6FF" : "#F8FAFC",
                        color: selected ? "#2563EB" : "#475569",
                        cursor: "pointer"
                      }}
                    >
                      {prod}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Section 2: Call Details & Opportunity Estimates */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "14px",
            padding: "24px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
          }}
        >
          <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
            Step 3: Call Details & Discussion Notes
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                Call Type *
              </label>
              <select
                value={formData.callType}
                onChange={(e) => setFormData({ ...formData, callType: e.target.value })}
                style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", backgroundColor: "#fff", boxSizing: "border-box" }}
              >
                <option value="Inbound">Inbound</option>
                <option value="Outbound">Outbound</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                Call Outcome *
              </label>
              <select
                value={formData.callOutcome}
                onChange={(e) => setFormData({ ...formData, callOutcome: e.target.value })}
                style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", backgroundColor: "#fff", boxSizing: "border-box" }}
              >
                {CALL_OUTCOMES.map((out) => (
                  <option key={out} value={out}>{out}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                Interest Level
              </label>
              <select
                value={formData.interestLevel}
                onChange={(e) => setFormData({ ...formData, interestLevel: e.target.value })}
                style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", backgroundColor: "#fff", boxSizing: "border-box" }}
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                Call Duration (Minutes)
              </label>
              <input
                type="number"
                min="1"
                placeholder="10"
                value={formData.callDurationMinutes}
                onChange={(e) => setFormData({ ...formData, callDurationMinutes: e.target.value })}
                style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", boxSizing: "border-box" }}
              />
            </div>
          </div>

          {!matchedContact && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                  Requirement Type
                </label>
                <input
                  type="text"
                  placeholder="e.g. 48V NMC Battery Pack for 2-Wheeler"
                  value={formData.requirementType}
                  onChange={(e) => setFormData({ ...formData, requirementType: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                  Expected Quantity (Units)
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 50"
                  value={formData.expectedQuantity}
                  onChange={(e) => setFormData({ ...formData, expectedQuantity: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>

              {/* Explicit Manual Estimated Deal Value Input */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                  Estimated Deal Value (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="e.g. 400000"
                  value={formData.estimatedValue}
                  onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", boxSizing: "border-box" }}
                />
                {formData.estimatedValue && (
                  <span style={{ fontSize: "11px", color: "#16A34A", fontWeight: 600, marginTop: "3px", display: "block" }}>
                    Formatted: {formatINR(formData.estimatedValue)}
                  </span>
                )}
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                  Expected Timeline
                </label>
                <select
                  value={formData.expectedTimeline}
                  onChange={(e) => setFormData({ ...formData, expectedTimeline: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", backgroundColor: "#fff", boxSizing: "border-box" }}
                >
                  <option value="Immediate">Immediate (&lt; 15 days)</option>
                  <option value="1-3 Months">1–3 Months</option>
                  <option value="3-6 Months">3–6 Months</option>
                </select>
              </div>
            </div>
          )}

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
              Discussion Summary / Call Notes {matchedContact && "*"}
            </label>
            <textarea
              rows={3}
              placeholder="Enter discussion notes, specific customer requirements, objections, or commitments..."
              value={formData.discussionSummary}
              onChange={(e) => {
                setFormData({ ...formData, discussionSummary: e.target.value });
                if (errors.discussionSummary) setErrors((prev) => ({ ...prev, discussionSummary: null }));
              }}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: errors.discussionSummary ? "1px solid #DC2626" : "1px solid #CBD5E1",
                fontSize: "13px",
                boxSizing: "border-box",
                outline: "none"
              }}
            />
            {errors.discussionSummary && (
              <span style={{ fontSize: "11px", color: "#DC2626", marginTop: "3px", display: "block" }}>
                {errors.discussionSummary}
              </span>
            )}
          </div>
        </div>

        {/* Section 3: Follow-up & Next Action */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "14px",
            padding: "24px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
          }}
        >
          <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
            Step 4: Follow-up & Next Action
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                Next Action *
              </label>
              <select
                value={formData.nextAction}
                onChange={(e) => setFormData({ ...formData, nextAction: e.target.value })}
                style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", backgroundColor: "#fff", boxSizing: "border-box" }}
              >
                {NEXT_ACTIONS.map((act) => (
                  <option key={act} value={act}>{act}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                Follow-up Date *
              </label>
              <input
                type="date"
                required
                min={todayStr}
                value={formData.followUpDate}
                onChange={(e) => {
                  setFormData({ ...formData, followUpDate: e.target.value });
                  if (errors.followUpDate) setErrors((prev) => ({ ...prev, followUpDate: null }));
                }}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: errors.followUpDate ? "1px solid #DC2626" : "1px solid #CBD5E1",
                  fontSize: "13px",
                  boxSizing: "border-box"
                }}
              />
              {errors.followUpDate && (
                <span style={{ fontSize: "11px", color: "#DC2626", marginTop: "3px", display: "block" }}>
                  {errors.followUpDate}
                </span>
              )}
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                Assigned Sales Rep
              </label>
              <input
                type="text"
                placeholder="Self / Sales Executive"
                value={formData.assignTo}
                onChange={(e) => setFormData({ ...formData, assignTo: e.target.value })}
                style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", boxSizing: "border-box" }}
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginBottom: "40px" }}>
          <button
            type="button"
            onClick={() => navigate("/dashboard/crm/dashboard")}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              backgroundColor: "#ffffff",
              color: "#475569",
              border: "1px solid #CBD5E1",
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
              backgroundColor: matchedContact ? "#16A34A" : "#2563EB",
              color: "#ffffff",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: matchedContact
                ? "0 2px 4px rgba(22, 163, 74, 0.2)"
                : "0 2px 4px rgba(37, 99, 235, 0.2)"
            }}
          >
            {submitting
              ? "Saving..."
              : matchedContact
              ? "Log Call for Existing Contact"
              : "Save New Lead & Call #1"}
          </button>
        </div>
      </form>

      {/* Success Modal */}
      {showSuccessModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(4px)",
            zIndex: 1300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px"
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              padding: "24px",
              width: "100%",
              maxWidth: "480px",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
              textAlign: "center"
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                backgroundColor: "#F0FDF4",
                color: "#16A34A",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px auto"
              }}
            >
              <CheckCircle2 size={32} />
            </div>

            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#0F172A", margin: "0 0 8px 0" }}>
              {successInfo.title}
            </h3>
            <p style={{ fontSize: "13px", color: "#64748B", margin: "0 0 24px 0", lineHeight: 1.5 }}>
              {successInfo.description}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                type="button"
                onClick={() => navigate(successInfo.type === "lead" ? "/dashboard/crm/leads" : "/dashboard/crm/activities")}
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  backgroundColor: "#2563EB",
                  color: "#ffffff",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                {successInfo.type === "lead" ? "View Leads Pipeline →" : "View Activities & Follow-ups →"}
              </button>

              <button
                type="button"
                onClick={handleResetForAnotherCall}
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  backgroundColor: "#F8FAFC",
                  color: "#334155",
                  border: "1px solid #CBD5E1",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                + Log Another Call / Add Lead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
