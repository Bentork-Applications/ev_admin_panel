import React, { useState, useRef } from "react";
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
  Tag,
  Upload,
  FileSpreadsheet,
  FileText,
  Download,
  Trash2,
  AlertTriangle
} from "lucide-react";
import { crmService } from "../../../services/crmService";
import { Toast } from "../../../components/common/Toast";
import { BulkUploadFeedbackModal } from "../../../components/crm/BulkUploadFeedbackModal";

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

  // Tab mode: 'single' (default single-lead flow) or 'bulk' (bulk CSV/PDF lead upload)
  const [activeTab, setActiveTab] = useState("single");

  // Bulk Upload states
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkDragging, setBulkDragging] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkError, setBulkError] = useState(null);
  const [bulkValidationWarning, setBulkValidationWarning] = useState(null);
  const [showCsvGuide, setShowCsvGuide] = useState(false);
  const fileInputRef = useRef(null);

  // Bulk Upload Feedback Modal State
  const [bulkFeedbackModal, setBulkFeedbackModal] = useState({
    isOpen: false,
    status: null, // "loading" | "success" | "partial" | "error"
    importedCount: 0,
    skippedCount: 0,
    totalRows: 0,
    errors: [],
    details: [],
    errorMessage: "",
    canRetry: false
  });

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

  // ==================== BULK UPLOAD HANDLERS ====================
  const formatFileSize = (bytes) => {
    if (bytes == null || isNaN(bytes)) return "0 B";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const handleDownloadSampleCsv = () => {
    const headers = "title,source,city,state,estimatedValue,notes,contactName,contactPhone,contactEmail,companyName\n";
    const sampleRow1 = "EV Battery Fleet Inquiry,Website,Pune,Maharashtra,500000,Requires 72V 100Ah packs,Rahul Sharma,9876543210,rahul@example.com,Fleet Logistics Pvt Ltd\n";
    const sampleRow2 = "Solar Storage Integration,IndiaMART,Bengaluru,Karnataka,1200000,BESS project 48V,Ananya Patel,9823456789,ananya@example.com,SolarTech Solutions\n";
    const blob = new Blob([headers + sampleRow1 + sampleRow2], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "sample_leads_bentork.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Sample CSV template downloaded", "info");
  };

  const handleFileSelect = (file) => {
    setBulkError(null);
    setBulkResult(null);
    setBulkValidationWarning(null);

    if (!file) return;

    // Backend Spring Boot limit: 10MB
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setBulkError(`File size (${formatFileSize(file.size)}) exceeds the maximum 10MB limit allowed by the backend.`);
      setBulkFile(null);
      return;
    }

    if (file.size === 0) {
      setBulkError("Selected file is empty (0 bytes). Please select a valid file with lead data.");
      setBulkFile(null);
      return;
    }

    const fileNameLower = file.name.toLowerCase();
    const isCsv = fileNameLower.endsWith(".csv") || file.type === "text/csv" || file.type === "application/vnd.ms-excel";
    const isPdf = fileNameLower.endsWith(".pdf") || file.type === "application/pdf";

    if (!isCsv && !isPdf) {
      setBulkError("Unsupported file format. Please select a CSV (.csv) or PDF (.pdf) file.");
      setBulkFile(null);
      return;
    }

    if (isPdf) {
      setBulkValidationWarning(
        "Notice: Bentork CRM's backend lead ingestion engine (/api/crm/leads/import) requires CSV structured tabular data. While PDF selection is supported here for inspection, binary PDF documents cannot be parsed by the CSV engine and will be rejected by the backend. We recommend downloading the sample CSV template."
      );
    }

    setBulkFile(file);
  };

  const handleBulkUploadSubmit = async (e) => {
    e?.preventDefault();

    // Prevent duplicate submissions while upload is in progress
    if (bulkUploading) return;

    if (!bulkFile) {
      setBulkFeedbackModal({
        isOpen: true,
        status: "error",
        title: "No File Selected",
        errorMessage: "No file selected. Please select a CSV file containing lead records to upload.",
        details: ["Please select or drop a valid .csv file into the upload dropzone."],
        canRetry: false
      });
      showToast("Please select a file to upload", "error");
      return;
    }

    if (bulkFile.size === 0) {
      setBulkFeedbackModal({
        isOpen: true,
        status: "error",
        title: "Empty File",
        errorMessage: "The selected file is empty (0 bytes).",
        details: ["Uploaded file contains no data rows or header columns. Please select a valid file."],
        canRetry: false
      });
      showToast("Selected file is empty", "error");
      return;
    }

    // Check for PDF file selection
    const fileNameLower = bulkFile.name.toLowerCase();
    const isPdf = fileNameLower.endsWith(".pdf") || bulkFile.type === "application/pdf";
    if (isPdf) {
      setBulkFeedbackModal({
        isOpen: true,
        status: "error",
        title: "Unsupported File Format",
        errorMessage: "PDF documents cannot be parsed by the CSV lead ingestion engine.",
        details: [
          "Bentork CRM lead ingestion endpoint (/api/crm/leads/import) requires structured CSV data.",
          "Binary PDF documents cannot be parsed as spreadsheet rows. Please convert your leads to CSV (.csv) or download our sample CSV template."
        ],
        canRetry: false
      });
      showToast("PDF files cannot be parsed as CSV. Please use a CSV file.", "error");
      return;
    }

    setBulkUploading(true);
    setBulkError(null);
    setBulkResult(null);

    // Immediately display loading modal and indicator
    setBulkFeedbackModal({
      isOpen: true,
      status: "loading",
      fileName: bulkFile.name,
      fileSize: formatFileSize(bulkFile.size)
    });

    try {
      const res = await crmService.importLeadsCsv(bulkFile);
      setBulkResult(res);

      const imported = Number(res?.importedCount ?? 0);
      const skipped = Number(res?.skippedCount ?? 0);
      const total = Number(res?.totalRows ?? (imported + skipped));
      const errors = Array.isArray(res?.errors) ? res.errors : [];

      if (imported > 0 && skipped === 0) {
        // Full Success
        setBulkFeedbackModal({
          isOpen: true,
          status: "success",
          importedCount: imported,
          skippedCount: 0,
          totalRows: total,
          errors: [],
          details: [],
          canRetry: false
        });
        showToast("Leads uploaded successfully!", "success");
      } else if (imported > 0 && skipped > 0) {
        // Partial Success
        setBulkFeedbackModal({
          isOpen: true,
          status: "partial",
          importedCount: imported,
          skippedCount: skipped,
          totalRows: total,
          errors: errors,
          details: errors,
          canRetry: false
        });
        showToast(`Partial upload complete: ${imported} imported, ${skipped} skipped.`, "info");
      } else {
        // 0 Imported - Failure
        const errMsg =
          errors.length > 0
            ? `Upload finished with 0 imported leads. All ${skipped || total} row(s) failed validation.`
            : "No leads were imported from this file. Please verify CSV column headers and row data.";
        setBulkError(errMsg);
        setBulkFeedbackModal({
          isOpen: true,
          status: "error",
          errorMessage: errMsg,
          importedCount: 0,
          skippedCount: skipped,
          totalRows: total,
          errors: errors,
          details: errors.length > 0 ? errors : ["File did not contain any valid lead records or failed column mapping."],
          canRetry: true
        });
        showToast(errMsg, "error");
      }
    } catch (err) {
      console.error("Bulk leads upload error:", err);
      const errMsg = err?.message || "Failed to process bulk upload. Please check backend connection and file format.";
      let details = [];

      if (err?.data) {
        if (typeof err.data === "string") {
          details.push(err.data);
        } else if (Array.isArray(err.data.errors) && err.data.errors.length > 0) {
          details = err.data.errors.map((e) => e.defaultMessage || e.message || String(e));
        } else if (err.data.message) {
          details.push(err.data.message);
        }
      }

      if (details.length === 0 && errMsg) {
        details.push(errMsg);
      }

      setBulkError(errMsg);
      setBulkFeedbackModal({
        isOpen: true,
        status: "error",
        errorMessage: errMsg,
        details: details,
        canRetry: true
      });
      showToast(errMsg, "error");
    } finally {
      setBulkUploading(false);
    }
  };

  const handleClearBulkFile = () => {
    setBulkFile(null);
    setBulkError(null);
    setBulkResult(null);
    setBulkValidationWarning(null);
    setBulkFeedbackModal((prev) => ({ ...prev, isOpen: false }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCloseFeedbackModal = () => {
    setBulkFeedbackModal((prev) => ({ ...prev, isOpen: false }));
  };

  const handleRetryBulkUpload = () => {
    handleBulkUploadSubmit();
  };

  const handleViewLeadsInCrm = () => {
    setBulkFeedbackModal((prev) => ({ ...prev, isOpen: false }));
    navigate("/dashboard/crm/leads");
  };

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "16px 24px", fontFamily: "inherit" }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header with Mode Switcher */}
      <div
        style={{
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px"
        }}
      >
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#0F172A", margin: 0 }}>
            New Call / Add Lead
          </h1>
          <p style={{ fontSize: "13px", color: "#64748B", margin: "4px 0 0 0" }}>
            {activeTab === "single"
              ? "Search phone first. If existing, log call activity. If new, create company, contact, lead & Call #1 in one workflow."
              : "Bulk import leads, companies, and contacts directly into Bentork Sales CRM via CSV/PDF file upload."}
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div
          style={{
            display: "inline-flex",
            backgroundColor: "#F1F5F9",
            borderRadius: "10px",
            padding: "4px",
            border: "1px solid #CBD5E1"
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("single")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
              backgroundColor: activeTab === "single" ? "#ffffff" : "transparent",
              color: activeTab === "single" ? "#2563EB" : "#64748B",
              boxShadow: activeTab === "single" ? "0 1px 3px rgba(0,0,0,0.08)" : "none"
            }}
          >
            <Phone size={15} />
            Single Call / Lead
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("bulk")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
              backgroundColor: activeTab === "bulk" ? "#ffffff" : "transparent",
              color: activeTab === "bulk" ? "#2563EB" : "#64748B",
              boxShadow: activeTab === "bulk" ? "0 1px 3px rgba(0,0,0,0.08)" : "none"
            }}
          >
            <Upload size={15} />
            Bulk Leads Upload
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: "10px",
                backgroundColor: activeTab === "bulk" ? "#DBEAFE" : "#E2E8F0",
                color: activeTab === "bulk" ? "#1D4ED8" : "#475569"
              }}
            >
              CSV
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: SINGLE CALL / LEAD ENTRY                                         */}
      {/* ========================================================================= */}
      {activeTab === "single" && (
        <>
          {/* Quick banner linking to Bulk Upload */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "#F8FAFC",
              border: "1px dashed #CBD5E1",
              borderRadius: "10px",
              padding: "10px 16px",
              marginBottom: "18px",
              fontSize: "12px",
              color: "#475569"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <FileSpreadsheet size={16} color="#2563EB" />
              <span>Have a batch of leads from an exhibition, event, or IndiaMART?</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("bulk")}
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #CBD5E1",
                color: "#2563EB",
                fontWeight: 600,
                borderRadius: "6px",
                padding: "4px 10px",
                cursor: "pointer",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}
            >
              <Upload size={12} />
              Switch to Bulk Leads Upload →
            </button>
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
        </>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: BULK LEADS UPLOAD                                                 */}
      {/* ========================================================================= */}
      {activeTab === "bulk" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Top Info & Template Download Card */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              padding: "24px",
              border: "1px solid #E2E8F0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: "16px"
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      backgroundColor: "#EFF6FF",
                      color: "#2563EB",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <FileSpreadsheet size={20} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#0F172A", margin: 0 }}>
                      Bulk Leads Ingestion Engine
                    </h2>
                    <p style={{ fontSize: "13px", color: "#64748B", margin: "2px 0 0 0" }}>
                      Upload your spreadsheet to create leads, companies, and contacts in a single batch operation.
                    </p>
                  </div>
                </div>

                {/* Constraint & Engine Tags */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "14px" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      backgroundColor: "#F1F5F9",
                      color: "#334155",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      border: "1px solid #E2E8F0"
                    }}
                  >
                    Format: <strong>CSV (.csv)</strong> / PDF (.pdf)
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      backgroundColor: "#F1F5F9",
                      color: "#334155",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      border: "1px solid #E2E8F0"
                    }}
                  >
                    Max File Size: <strong>10 MB</strong>
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      backgroundColor: "#F0FDF4",
                      color: "#166534",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      border: "1px solid #BBF7D0"
                    }}
                  >
                    API: <code>POST /api/crm/leads/import</code>
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      backgroundColor: "#EFF6FF",
                      color: "#1E40AF",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      border: "1px solid #BFDBFE"
                    }}
                  >
                    Auto-links: Company & Contacts
                  </span>
                </div>
              </div>

              {/* Template Download Button */}
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setShowCsvGuide(!showCsvGuide)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "9px 14px",
                    borderRadius: "8px",
                    backgroundColor: "#F8FAFC",
                    border: "1px solid #CBD5E1",
                    color: "#334155",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  <Tag size={14} />
                  {showCsvGuide ? "Hide Column Guide" : "View Column Guide"}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadSampleCsv}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "9px 16px",
                    borderRadius: "8px",
                    backgroundColor: "#ffffff",
                    border: "1px solid #2563EB",
                    color: "#2563EB",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    boxShadow: "0 1px 2px rgba(37,99,235,0.06)"
                  }}
                >
                  <Download size={15} />
                  Download Sample CSV
                </button>
              </div>
            </div>

            {/* Expandable Column Guide */}
            {showCsvGuide && (
              <div
                style={{
                  marginTop: "18px",
                  padding: "16px",
                  borderRadius: "10px",
                  backgroundColor: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  fontSize: "12px"
                }}
              >
                <div style={{ fontWeight: 700, color: "#0F172A", marginBottom: "8px" }}>
                  Expected Column Headers (case-insensitive, underscores or spaces allowed):
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "10px",
                    marginTop: "8px"
                  }}
                >
                  <div style={{ padding: "8px 10px", backgroundColor: "#fff", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
                    <code style={{ color: "#2563EB", fontWeight: 700 }}>title</code>
                    <div style={{ color: "#64748B", fontSize: "11px", marginTop: "2px" }}>Lead title / enquiry description</div>
                  </div>
                  <div style={{ padding: "8px 10px", backgroundColor: "#fff", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
                    <code style={{ color: "#2563EB", fontWeight: 700 }}>contactPhone</code>
                    <div style={{ color: "#64748B", fontSize: "11px", marginTop: "2px" }}>10-digit mobile number (used for deduplication)</div>
                  </div>
                  <div style={{ padding: "8px 10px", backgroundColor: "#fff", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
                    <code style={{ color: "#2563EB", fontWeight: 700 }}>contactName</code>
                    <div style={{ color: "#64748B", fontSize: "11px", marginTop: "2px" }}>Name of primary contact person</div>
                  </div>
                  <div style={{ padding: "8px 10px", backgroundColor: "#fff", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
                    <code style={{ color: "#2563EB", fontWeight: 700 }}>companyName</code>
                    <div style={{ color: "#64748B", fontSize: "11px", marginTop: "2px" }}>Company name (created if not found)</div>
                  </div>
                  <div style={{ padding: "8px 10px", backgroundColor: "#fff", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
                    <code style={{ color: "#2563EB", fontWeight: 700 }}>contactEmail</code>
                    <div style={{ color: "#64748B", fontSize: "11px", marginTop: "2px" }}>Contact email address</div>
                  </div>
                  <div style={{ padding: "8px 10px", backgroundColor: "#fff", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
                    <code style={{ color: "#2563EB", fontWeight: 700 }}>city</code>
                    <div style={{ color: "#64748B", fontSize: "11px", marginTop: "2px" }}>Lead location city (e.g. Pune)</div>
                  </div>
                  <div style={{ padding: "8px 10px", backgroundColor: "#fff", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
                    <code style={{ color: "#2563EB", fontWeight: 700 }}>state</code>
                    <div style={{ color: "#64748B", fontSize: "11px", marginTop: "2px" }}>State (e.g. Maharashtra)</div>
                  </div>
                  <div style={{ padding: "8px 10px", backgroundColor: "#fff", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
                    <code style={{ color: "#2563EB", fontWeight: 700 }}>source</code>
                    <div style={{ color: "#64748B", fontSize: "11px", marginTop: "2px" }}>Origin (e.g. Website, IndiaMART, Exhibition)</div>
                  </div>
                  <div style={{ padding: "8px 10px", backgroundColor: "#fff", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
                    <code style={{ color: "#2563EB", fontWeight: 700 }}>estimatedValue</code>
                    <div style={{ color: "#64748B", fontSize: "11px", marginTop: "2px" }}>Numeric deal value in ₹ (e.g. 500000)</div>
                  </div>
                  <div style={{ padding: "8px 10px", backgroundColor: "#fff", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
                    <code style={{ color: "#2563EB", fontWeight: 700 }}>notes</code>
                    <div style={{ color: "#64748B", fontSize: "11px", marginTop: "2px" }}>Requirement notes and discussion specs</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Drag & Drop Upload Zone */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              padding: "24px",
              border: "1px solid #E2E8F0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,.pdf,text/csv,application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
              style={{ display: "none" }}
            />

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setBulkDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setBulkDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setBulkDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleFileSelect(file);
              }}
              onClick={() => {
                if (!bulkUploading) fileInputRef.current?.click();
              }}
              style={{
                border: `2px dashed ${bulkDragging ? "#2563EB" : bulkFile ? "#10B981" : "#CBD5E1"}`,
                borderRadius: "12px",
                padding: "36px 20px",
                textAlign: "center",
                backgroundColor: bulkDragging ? "#EFF6FF" : bulkFile ? "#F0FDF4" : "#F8FAFC",
                cursor: bulkUploading ? "not-allowed" : "pointer",
                transition: "all 0.2s ease"
              }}
            >
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  backgroundColor: bulkFile ? "#DCFCE7" : "#EFF6FF",
                  color: bulkFile ? "#16A34A" : "#2563EB",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 14px auto"
                }}
              >
                {bulkFile ? <CheckCircle2 size={30} /> : <Upload size={28} />}
              </div>

              <div style={{ fontSize: "15px", fontWeight: 700, color: "#0F172A", marginBottom: "4px" }}>
                {bulkDragging
                  ? "Drop your file to select"
                  : bulkFile
                  ? "File selected — Click or drop to replace"
                  : "Drag and drop your CSV or PDF file here, or click to browse"}
              </div>

              <p style={{ fontSize: "12px", color: "#64748B", margin: "4px 0 16px 0" }}>
                Accepted formats: <strong>.csv</strong> (tabular leads data) or <strong>.pdf</strong> • Maximum size: <strong>10MB</strong>
              </p>

              <button
                type="button"
                disabled={bulkUploading}
                style={{
                  padding: "8px 20px",
                  borderRadius: "8px",
                  backgroundColor: "#ffffff",
                  border: "1px solid #CBD5E1",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#2563EB",
                  cursor: bulkUploading ? "not-allowed" : "pointer",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                }}
              >
                Browse File from Device
              </button>
            </div>

            {/* Selected File Details Box */}
            {bulkFile && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "14px 16px",
                  borderRadius: "10px",
                  backgroundColor: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "8px",
                      backgroundColor: bulkFile.name.toLowerCase().endsWith(".pdf") ? "#FEF3C7" : "#DCFCE7",
                      color: bulkFile.name.toLowerCase().endsWith(".pdf") ? "#D97706" : "#16A34A",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    {bulkFile.name.toLowerCase().endsWith(".pdf") ? (
                      <FileText size={22} />
                    ) : (
                      <FileSpreadsheet size={22} />
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", display: "flex", alignItems: "center", gap: "8px" }}>
                      <span>{bulkFile.name}</span>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "12px",
                          backgroundColor: bulkFile.name.toLowerCase().endsWith(".pdf") ? "#FEF3C7" : "#DCFCE7",
                          color: bulkFile.name.toLowerCase().endsWith(".pdf") ? "#B45309" : "#166534"
                        }}
                      >
                        {bulkFile.name.toLowerCase().endsWith(".pdf") ? "PDF Document" : "CSV Spreadsheet"}
                      </span>
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
                      Size: <strong>{formatFileSize(bulkFile.size)}</strong> • Type: {bulkFile.type || "file"}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={handleClearBulkFile}
                    disabled={bulkUploading}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      backgroundColor: "#ffffff",
                      border: "1px solid #FECACA",
                      color: "#DC2626",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: bulkUploading ? "not-allowed" : "pointer"
                    }}
                  >
                    <Trash2 size={13} />
                    Remove
                  </button>
                </div>
              </div>
            )}

            {/* Validation Warning Notice (e.g. for PDF format) */}
            {bulkValidationWarning && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "12px 14px",
                  borderRadius: "8px",
                  backgroundColor: "#FFFBEB",
                  border: "1px solid #FDE68A",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  fontSize: "12px",
                  color: "#92400E"
                }}
              >
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <div style={{ fontWeight: 700, marginBottom: "2px" }}>Backend Ingestion Engine Advisory</div>
                  <div>{bulkValidationWarning}</div>
                </div>
              </div>
            )}

            {/* Upload Error Banner */}
            {bulkError && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "12px 14px",
                  borderRadius: "8px",
                  backgroundColor: "#FEF2F2",
                  border: "1px solid #FECACA",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  fontSize: "12px",
                  color: "#991B1B"
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <div style={{ fontWeight: 700, marginBottom: "2px" }}>Upload / Validation Error</div>
                  <div>{bulkError}</div>
                </div>
              </div>
            )}

            {/* Upload Action Buttons */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
                marginTop: "24px",
                paddingTop: "16px",
                borderTop: "1px solid #E2E8F0"
              }}
            >
              <button
                type="button"
                onClick={handleClearBulkFile}
                disabled={bulkUploading || !bulkFile}
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px",
                  backgroundColor: "#ffffff",
                  border: "1px solid #CBD5E1",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#475569",
                  cursor: bulkUploading || !bulkFile ? "not-allowed" : "pointer"
                }}
              >
                Cancel / Clear
              </button>

              <button
                type="button"
                onClick={handleBulkUploadSubmit}
                disabled={bulkUploading || !bulkFile}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 24px",
                  borderRadius: "8px",
                  backgroundColor: bulkUploading || !bulkFile ? "#94A3B8" : "#2563EB",
                  color: "#ffffff",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: bulkUploading || !bulkFile ? "not-allowed" : "pointer",
                  boxShadow: bulkUploading || !bulkFile ? "none" : "0 2px 4px rgba(37,99,235,0.2)"
                }}
              >
                {bulkUploading ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Uploading & Parsing Leads...</span>
                  </>
                ) : (
                  <>
                    <Upload size={15} />
                    <span>Upload Leads to CRM</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Summary Card */}
          {bulkResult && (
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "14px",
                padding: "24px",
                border: "1px solid #E2E8F0",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
              }}
            >
              <div
                style={{
                  padding: "14px 18px",
                  borderRadius: "10px",
                  backgroundColor: (bulkResult.importedCount ?? 0) > 0 ? "#F0FDF4" : "#FEF2F2",
                  border: `1px solid ${(bulkResult.importedCount ?? 0) > 0 ? "#BBF7D0" : "#FECACA"}`,
                  marginBottom: "20px"
                }}
              >
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: 700,
                    color: (bulkResult.importedCount ?? 0) > 0 ? "#166534" : "#991B1B",
                    marginBottom: "4px"
                  }}
                >
                  {(bulkResult.importedCount ?? 0) > 0
                    ? "Bulk Lead Ingestion Completed"
                    : "Import Finished with Warnings / Skipped Rows"}
                </div>
                <div style={{ fontSize: "13px", color: "#334155" }}>
                  {(bulkResult.importedCount ?? 0) > 0
                    ? `Successfully created ${bulkResult.importedCount} new leads and synchronized contacts in Bentork CRM.`
                    : "No leads were imported. Please check column format and headers against the expected schema."}
                </div>
              </div>

              {/* Counters Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "16px",
                  marginBottom: "20px"
                }}
              >
                <div
                  style={{
                    padding: "16px",
                    borderRadius: "10px",
                    backgroundColor: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    textAlign: "center"
                  }}
                >
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#64748B" }}>Total Rows Processed</div>
                  <div style={{ fontSize: "24px", fontWeight: 700, color: "#0F172A", marginTop: "4px" }}>
                    {bulkResult.totalRows ?? 0}
                  </div>
                </div>

                <div
                  style={{
                    padding: "16px",
                    borderRadius: "10px",
                    backgroundColor: "#F0FDF4",
                    border: "1px solid #BBF7D0",
                    textAlign: "center"
                  }}
                >
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#166534" }}>Imported Leads</div>
                  <div style={{ fontSize: "24px", fontWeight: 700, color: "#16A34A", marginTop: "4px" }}>
                    {bulkResult.importedCount ?? 0}
                  </div>
                </div>

                <div
                  style={{
                    padding: "16px",
                    borderRadius: "10px",
                    backgroundColor: (bulkResult.skippedCount ?? 0) > 0 ? "#FFFBEB" : "#F8FAFC",
                    border: `1px solid ${(bulkResult.skippedCount ?? 0) > 0 ? "#FDE68A" : "#E2E8F0"}`,
                    textAlign: "center"
                  }}
                >
                  <div style={{ fontSize: "12px", fontWeight: 600, color: (bulkResult.skippedCount ?? 0) > 0 ? "#B45309" : "#64748B" }}>
                    Skipped / Failed Rows
                  </div>
                  <div
                    style={{
                      fontSize: "24px",
                      fontWeight: 700,
                      color: (bulkResult.skippedCount ?? 0) > 0 ? "#D97706" : "#475569",
                      marginTop: "4px"
                    }}
                  >
                    {bulkResult.skippedCount ?? 0}
                  </div>
                </div>
              </div>

              {/* Detailed Row Warnings / Errors */}
              {Array.isArray(bulkResult.errors) && bulkResult.errors.length > 0 && (
                <div
                  style={{
                    padding: "14px 16px",
                    borderRadius: "8px",
                    backgroundColor: "#FEF2F2",
                    border: "1px solid #FECACA",
                    marginBottom: "20px"
                  }}
                >
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#991B1B", marginBottom: "6px" }}>
                    Backend Parser Warnings / Row Errors ({bulkResult.errors.length}):
                  </div>
                  <div style={{ maxHeight: "140px", overflowY: "auto", fontSize: "12px", color: "#DC2626" }}>
                    <ul style={{ margin: 0, paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "4px" }}>
                      {bulkResult.errors.map((err, i) => (
                        <li key={i}>{typeof err === "string" ? err : JSON.stringify(err)}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Post-Import Action Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={handleClearBulkFile}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "8px",
                    backgroundColor: "#ffffff",
                    border: "1px solid #CBD5E1",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#334155",
                    cursor: "pointer"
                  }}
                >
                  Upload Another File
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/dashboard/crm/leads")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "9px 20px",
                    borderRadius: "8px",
                    backgroundColor: "#2563EB",
                    border: "none",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#ffffff",
                    cursor: "pointer",
                    boxShadow: "0 2px 4px rgba(37,99,235,0.2)"
                  }}
                >
                  <span>View Leads Pipeline</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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

      {/* Bulk Upload Feedback Modal */}
      <BulkUploadFeedbackModal
        isOpen={bulkFeedbackModal.isOpen}
        status={bulkFeedbackModal.status}
        fileName={bulkFile?.name}
        fileSize={bulkFile ? formatFileSize(bulkFile.size) : ""}
        importedCount={bulkFeedbackModal.importedCount}
        skippedCount={bulkFeedbackModal.skippedCount}
        totalRows={bulkFeedbackModal.totalRows}
        errors={bulkFeedbackModal.errors}
        errorMessage={bulkFeedbackModal.errorMessage}
        details={bulkFeedbackModal.details}
        canRetry={bulkFeedbackModal.canRetry}
        onRetry={handleRetryBulkUpload}
        onClose={handleCloseFeedbackModal}
        onViewLeads={handleViewLeadsInCrm}
        onDownloadSample={handleDownloadSampleCsv}
      />
    </div>
  );
}
