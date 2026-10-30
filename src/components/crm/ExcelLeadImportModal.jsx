import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Download,
  RotateCcw,
  Users,
  Building,
  Phone,
  Search,
  Filter,
  Check,
  ArrowRight
} from "lucide-react";
import { crmService } from "../../services/crmService";

// Helper to normalize phone numbers (strip non-digits, keep last 10 digits for Indian standard)
const cleanPhoneNumber = (val) => {
  if (!val) return "";
  const cleaned = String(val).replace(/\D/g, "");
  if (cleaned.length >= 10) {
    return cleaned.slice(-10);
  }
  return cleaned;
};

// Normalize header strings to find standard columns
const findColumnValue = (row, candidates) => {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const foundKey = keys.find(
      (k) => k.toLowerCase().replace(/[\s_-]/g, "") === candidate.toLowerCase().replace(/[\s_-]/g, "")
    );
    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
      return String(row[foundKey]).trim();
    }
  }
  return "";
};

export const ExcelLeadImportModal = ({
  isOpen,
  onClose,
  onSuccess,
  existingContacts = [],
  existingLeads = [],
  showToast
}) => {
  const [file, setFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [filterView, setFilterView] = useState("all"); // "all" | "valid" | "invalid" | "duplicates"
  const [searchQuery, setSearchQuery] = useState("");
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [step, setStep] = useState("upload"); // "upload" | "preview" | "result"
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Build existing phone lookup Set
  const existingPhonesSet = new Set();
  (existingContacts || []).forEach((c) => {
    if (c.phone) existingPhonesSet.add(cleanPhoneNumber(c.phone));
  });
  (existingLeads || []).forEach((l) => {
    if (l.contactPhone) existingPhonesSet.add(cleanPhoneNumber(l.contactPhone));
    if (l.phone) existingPhonesSet.add(cleanPhoneNumber(l.phone));
  });

  // Reset modal state
  const handleReset = () => {
    setFile(null);
    setParsedRows([]);
    setFilterView("all");
    setSearchQuery("");
    setLoading(false);
    setImportResult(null);
    setStep("upload");
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Sample CSV / Excel download
  const handleDownloadTemplate = () => {
    const headers = "Contact Name,Mobile Number,Company Name,Email,City,State,Notes\n";
    const sample1 = "Rahul Verma,9876543210,Apex EV Logistics,rahul@apexev.in,Pune,Maharashtra,Fleet battery requirement\n";
    const sample2 = "Pooja Sharma,9823456789,Green Energy Tech,pooja@greenenergy.com,Mumbai,Maharashtra,48V 100Ah inquiry\n";
    const sample3 = "Vikram Patil,9988776655,SunPower Solutions,,Bengaluru,Karnataka,Looking for OEM supplier\n";
    const blob = new Blob([headers + sample1 + sample2 + sample3], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "bentork_leads_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast?.("Sample template downloaded", "info");
  };

  // Parse Excel or CSV file
  const processFile = async (selectedFile) => {
    if (!selectedFile) return;

    const fileName = selectedFile.name.toLowerCase();
    const isExcel = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");
    const isCsv = fileName.endsWith(".csv");

    if (!isExcel && !isCsv) {
      showToast?.("Please upload an Excel (.xlsx, .xls) or CSV (.csv) file", "error");
      return;
    }

    setFile(selectedFile);
    setLoading(true);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (!rawJson || rawJson.length === 0) {
        showToast?.("The selected file contains no data rows", "warning");
        setLoading(false);
        return;
      }

      // Track phones within this file to detect duplicates in-file
      const seenFilePhones = new Set();

      const processed = rawJson.map((row, index) => {
        const name = findColumnValue(row, ["contactname", "name", "contact_name", "leadname", "fullname", "customername", "person", "client"]);
        const rawPhone = findColumnValue(row, ["mobilenumber", "mobile", "contactphone", "contact_phone", "phone", "phonenumber", "cell", "contactno"]);
        const company = findColumnValue(row, ["companyname", "company", "company_name", "organization", "account", "business"]);
        const email = findColumnValue(row, ["email", "contactemail", "contact_email", "mail"]);
        const city = findColumnValue(row, ["city", "location", "town"]);
        const state = findColumnValue(row, ["state", "province", "region"]);
        const notes = findColumnValue(row, ["notes", "remarks", "comment", "description", "requirement"]);

        const cleanedPhone = cleanPhoneNumber(rawPhone);

        // Validation Rules
        const issues = [];
        if (!name || name.trim() === "") {
          issues.push("Missing contact name");
        }

        if (!cleanedPhone || cleanedPhone.length < 10) {
          issues.push(rawPhone ? "Invalid mobile number (<10 digits)" : "Missing mobile number");
        }

        let isDuplicate = false;
        let duplicateType = null;

        if (cleanedPhone && cleanedPhone.length >= 10) {
          if (seenFilePhones.has(cleanedPhone)) {
            isDuplicate = true;
            duplicateType = "file";
            issues.push("Duplicate in file");
          } else {
            seenFilePhones.add(cleanedPhone);
          }

          if (existingPhonesSet.has(cleanedPhone)) {
            isDuplicate = true;
            duplicateType = duplicateType ? "both" : "system";
            issues.push("Already exists in CRM");
          }
        }

        return {
          rowNumber: index + 2, // Excel row index considering header is row 1
          name: name.trim() || "Unknown",
          rawPhone,
          cleanedPhone,
          company: company.trim(),
          email: email.trim(),
          city: city.trim(),
          state: state.trim(),
          notes: notes.trim(),
          isValid: issues.filter((i) => !i.includes("Duplicate") && !i.includes("Already exists")).length === 0,
          isDuplicate,
          duplicateType,
          issues
        };
      });

      setParsedRows(processed);
      setStep("preview");
    } catch (err) {
      console.error("Error parsing file:", err);
      showToast?.(`Failed to parse file: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Filter rows for preview
  const validRows = parsedRows.filter((r) => r.isValid && (!skipDuplicates || !r.isDuplicate));
  const invalidRows = parsedRows.filter((r) => !r.isValid);
  const duplicateRows = parsedRows.filter((r) => r.isDuplicate);

  const displayedRows = parsedRows.filter((r) => {
    // Tab filter
    if (filterView === "valid" && (!r.isValid || (skipDuplicates && r.isDuplicate))) return false;
    if (filterView === "invalid" && r.isValid) return false;
    if (filterView === "duplicates" && !r.isDuplicate) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = r.name.toLowerCase().includes(q);
      const matchPhone = (r.cleanedPhone || r.rawPhone).includes(q);
      const matchCompany = r.company.toLowerCase().includes(q);
      return matchName || matchPhone || matchCompany;
    }

    return true;
  });

  // Submit and save through backend API
  const handleConfirmImport = async () => {
    const rowsToImport = validRows;
    if (rowsToImport.length === 0) {
      showToast?.("No valid rows to import", "warning");
      return;
    }

    setLoading(true);

    try {
      // 1. Convert valid rows into standard CSV text expected by backend CrmLeadController /import
      // Headers: title,source,city,state,estimatedValue,notes,contactName,contactPhone,contactEmail,companyName
      const csvHeader = "title,source,city,state,estimatedValue,notes,contactName,contactPhone,contactEmail,companyName\n";

      const csvLines = rowsToImport.map((r) => {
        const title = `${r.name}${r.company ? ` - ${r.company}` : " (Imported Lead)"}`;
        const source = "campaign_import";
        const city = r.city || "";
        const state = r.state || "";
        const estimatedValue = "";
        const fileTag = `[File: ${file?.name || "Excel_Import"}]`;
        const notes = r.notes ? `${fileTag} ${r.notes}` : fileTag;
        const contactName = r.name;
        const contactPhone = r.cleanedPhone;
        const contactEmail = r.email || "";
        const companyName = r.company || "";

        // Escape CSV values
        const escapeCsv = (str) => {
          if (!str) return "";
          const s = String(str).replace(/"/g, '""');
          return s.includes(",") || s.includes("\n") || s.includes('"') ? `"${s}"` : s;
        };

        return [
          escapeCsv(title),
          escapeCsv(source),
          escapeCsv(city),
          escapeCsv(state),
          escapeCsv(estimatedValue),
          escapeCsv(notes),
          escapeCsv(contactName),
          escapeCsv(contactPhone),
          escapeCsv(contactEmail),
          escapeCsv(companyName)
        ].join(",");
      });

      const csvContent = csvHeader + csvLines.join("\n");
      const csvBlob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const csvFile = new File([csvBlob], (file?.name || "leads_import").replace(/\.[^/.]+$/, "") + ".csv", {
        type: "text/csv"
      });

      // 2. Upload to existing backend endpoint POST /api/crm/leads/import
      const backendResponse = await crmService.importLeadsCsv(csvFile);

      // 3. Save import record session into localStorage as cache for quick search & file name association
      const importSession = {
        id: `import_${Date.now()}`,
        fileName: file?.name || "Uploaded_File.xlsx",
        importedAt: new Date().toISOString(),
        importedCount: backendResponse?.importedCount || rowsToImport.length,
        skippedCount: backendResponse?.skippedCount || 0,
        phones: rowsToImport.map((r) => r.cleanedPhone)
      };

      try {
        const existingSessions = JSON.parse(localStorage.getItem("crm_excel_imports") || "[]");
        localStorage.setItem("crm_excel_imports", JSON.stringify([importSession, ...existingSessions.slice(0, 19)]));
      } catch {
        // Safe fallback
      }

      setImportResult({
        total: rowsToImport.length,
        importedCount: backendResponse?.importedCount || rowsToImport.length,
        skippedCount: backendResponse?.skippedCount || 0,
        errors: backendResponse?.errors || [],
        fileName: file?.name || "Excel File"
      });

      setStep("result");
      showToast?.(`Successfully imported ${backendResponse?.importedCount || rowsToImport.length} leads!`, "success");

      // Notify parent to refresh leads & contacts directory
      onSuccess?.({
        fileName: file?.name || "Imported_Leads.xlsx",
        importedCount: backendResponse?.importedCount || rowsToImport.length,
        importedPhones: rowsToImport.map((r) => r.cleanedPhone)
      });
    } catch (err) {
      console.error("Backend import error:", err);
      showToast?.(err.message || "Failed to import leads to backend", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 1300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px"
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) handleClose();
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: step === "preview" ? "980px" : "600px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
          transition: "all 0.25s ease"
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #E2E8F0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#F8FAFC"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                backgroundColor: "#E8F9F1",
                color: "#10B981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
                {step === "upload" && "Import Leads & Contacts from Excel"}
                {step === "preview" && `Preview Import: ${file?.name}`}
                {step === "result" && "Import Complete"}
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#64748B" }}>
                {step === "upload" && "Upload .xlsx, .xls or .csv containing name and mobile number"}
                {step === "preview" && "Verify contacts and duplicate status before saving to CRM"}
                {step === "result" && "Results and summary from CRM ingestion service"}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            disabled={loading}
            style={{
              background: "transparent",
              border: "none",
              color: "#94A3B8",
              cursor: loading ? "not-allowed" : "pointer",
              padding: "6px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* STEP 1: UPLOAD VIEW */}
        {step === "upload" && (
          <div style={{ padding: "24px", overflowY: "auto" }}>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragActive ? "#10B981" : "#CBD5E1"}`,
                backgroundColor: dragActive ? "#F0FDF4" : "#F8FAFC",
                borderRadius: "14px",
                padding: "36px 20px",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    processFile(e.target.files[0]);
                  }
                }}
              />
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "14px",
                  backgroundColor: "#E8F9F1",
                  color: "#10B981",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 14px"
                }}
              >
                <Upload size={26} />
              </div>

              <div style={{ fontSize: "15px", fontWeight: 600, color: "#1E293B" }}>
                Click to browse or drag & drop file
              </div>
              <div style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>
                Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv)
              </div>
              <div
                style={{
                  display: "inline-block",
                  marginTop: "12px",
                  fontSize: "11.5px",
                  fontWeight: 600,
                  color: "#059669",
                  backgroundColor: "#ECFDF5",
                  padding: "4px 10px",
                  borderRadius: "6px"
                }}
              >
                Requires Contact Name & Mobile Number
              </div>
            </div>

            {/* Template Download Help Box */}
            <div
              style={{
                marginTop: "20px",
                padding: "16px",
                backgroundColor: "#F1F5F9",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "14px"
              }}
            >
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#1E293B" }}>
                  Need standard format guidance?
                </div>
                <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
                  Download our sample Excel/CSV template with expected columns.
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                style={{
                  padding: "7px 14px",
                  backgroundColor: "#ffffff",
                  border: "1px solid #CBD5E1",
                  borderRadius: "8px",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  color: "#0F172A",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  whiteSpace: "nowrap"
                }}
              >
                <Download size={14} />
                <span>Download Sample</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PREVIEW VIEW */}
        {step === "preview" && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
            {/* Summary Stat Pills */}
            <div
              style={{
                padding: "16px 24px",
                backgroundColor: "#ffffff",
                borderBottom: "1px solid #E2E8F0",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "12px"
              }}
            >
              <div
                onClick={() => setFilterView("all")}
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px",
                  backgroundColor: filterView === "all" ? "#F1F5F9" : "#F8FAFC",
                  border: `1.5px solid ${filterView === "all" ? "#94A3B8" : "#E2E8F0"}`,
                  cursor: "pointer"
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 600, color: "#64748B", textTransform: "uppercase" }}>
                  Total Rows
                </div>
                <div style={{ fontSize: "18px", fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>
                  {parsedRows.length}
                </div>
              </div>

              <div
                onClick={() => setFilterView("valid")}
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px",
                  backgroundColor: filterView === "valid" ? "#ECFDF5" : "#F0FDF4",
                  border: `1.5px solid ${filterView === "valid" ? "#10B981" : "#BBF7D0"}`,
                  cursor: "pointer"
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 600, color: "#059669", textTransform: "uppercase" }}>
                  Ready to Import
                </div>
                <div style={{ fontSize: "18px", fontWeight: 700, color: "#059669", marginTop: "2px" }}>
                  {validRows.length}
                </div>
              </div>

              <div
                onClick={() => setFilterView("invalid")}
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px",
                  backgroundColor: filterView === "invalid" ? "#FEF2F2" : "#FFF5F5",
                  border: `1.5px solid ${filterView === "invalid" ? "#EF4444" : "#FECACA"}`,
                  cursor: "pointer"
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 600, color: "#DC2626", textTransform: "uppercase" }}>
                  Invalid Rows
                </div>
                <div style={{ fontSize: "18px", fontWeight: 700, color: "#DC2626", marginTop: "2px" }}>
                  {invalidRows.length}
                </div>
              </div>

              <div
                onClick={() => setFilterView("duplicates")}
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px",
                  backgroundColor: filterView === "duplicates" ? "#FFFBEB" : "#FEFCE8",
                  border: `1.5px solid ${filterView === "duplicates" ? "#F59E0B" : "#FDE68A"}`,
                  cursor: "pointer"
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 600, color: "#D97706", textTransform: "uppercase" }}>
                  Duplicates
                </div>
                <div style={{ fontSize: "18px", fontWeight: 700, color: "#D97706", marginTop: "2px" }}>
                  {duplicateRows.length}
                </div>
              </div>
            </div>

            {/* Filter & Options Bar */}
            <div
              style={{
                padding: "12px 24px",
                backgroundColor: "#F8FAFC",
                borderBottom: "1px solid #E2E8F0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "12px"
              }}
            >
              <div style={{ position: "relative", minWidth: "260px" }}>
                <Search
                  size={15}
                  color="#94A3B8"
                  style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
                />
                <input
                  type="text"
                  placeholder="Filter preview by name, mobile, company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "7px 12px 7px 34px",
                    borderRadius: "8px",
                    border: "1px solid #CBD5E1",
                    fontSize: "12.5px",
                    outline: "none",
                    backgroundColor: "#ffffff"
                  }}
                />
              </div>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "12.5px",
                  color: "#334155",
                  fontWeight: 500,
                  cursor: "pointer"
                }}
              >
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  style={{ accentColor: "#10B981" }}
                />
                <span>Skip duplicate contacts (recommended)</span>
              </label>
            </div>

            {/* Preview Table */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0 24px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px", textAlign: "left" }}>
                <thead style={{ position: "sticky", top: 0, backgroundColor: "#ffffff", zIndex: 10 }}>
                  <tr style={{ borderBottom: "1.5px solid #E2E8F0" }}>
                    <th style={{ padding: "10px 8px", color: "#64748B", fontWeight: 600, width: "50px" }}>#</th>
                    <th style={{ padding: "10px 8px", color: "#64748B", fontWeight: 600 }}>CONTACT NAME</th>
                    <th style={{ padding: "10px 8px", color: "#64748B", fontWeight: 600 }}>MOBILE NUMBER</th>
                    <th style={{ padding: "10px 8px", color: "#64748B", fontWeight: 600 }}>COMPANY NAME</th>
                    <th style={{ padding: "10px 8px", color: "#64748B", fontWeight: 600 }}>LOCATION</th>
                    <th style={{ padding: "10px 8px", color: "#64748B", fontWeight: 600 }}>VALIDATION STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "#94A3B8" }}>
                        No records match the current filter.
                      </td>
                    </tr>
                  ) : (
                    displayedRows.map((row) => (
                      <tr
                        key={row.rowNumber}
                        style={{
                          borderBottom: "1px solid #F1F5F9",
                          backgroundColor: !row.isValid ? "#FFF5F5" : row.isDuplicate ? "#FFFDF5" : "transparent"
                        }}
                      >
                        <td style={{ padding: "10px 8px", color: "#94A3B8", fontWeight: 500 }}>{row.rowNumber}</td>
                        <td style={{ padding: "10px 8px", fontWeight: 600, color: "#0F172A" }}>{row.name}</td>
                        <td style={{ padding: "10px 8px", color: "#334155", fontFamily: "monospace" }}>
                          {row.cleanedPhone || row.rawPhone || "—"}
                        </td>
                        <td style={{ padding: "10px 8px", color: "#475569" }}>{row.company || "—"}</td>
                        <td style={{ padding: "10px 8px", color: "#64748B" }}>
                          {row.city || row.state ? `${row.city}${row.city && row.state ? ", " : ""}${row.state}` : "—"}
                        </td>
                        <td style={{ padding: "10px 8px" }}>
                          {row.isValid && !row.isDuplicate && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "3px 8px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: 600,
                                backgroundColor: "#ECFDF5",
                                color: "#059669"
                              }}
                            >
                              <CheckCircle2 size={12} />
                              Valid
                            </span>
                          )}

                          {row.isDuplicate && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "3px 8px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: 600,
                                backgroundColor: "#FEF3C7",
                                color: "#D97706",
                                marginRight: "4px"
                              }}
                            >
                              <AlertTriangle size={12} />
                              {row.duplicateType === "file" ? "File Duplicate" : "Existing in CRM"}
                            </span>
                          )}

                          {!row.isValid &&
                            row.issues.map((iss, idx) => (
                              <span
                                key={idx}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  backgroundColor: "#FEE2E2",
                                  color: "#DC2626",
                                  marginRight: "4px"
                                }}
                              >
                                <AlertCircle size={12} />
                                {iss}
                              </span>
                            ))}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Actions */}
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid #E2E8F0",
                backgroundColor: "#F8FAFC",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <button
                type="button"
                onClick={() => setStep("upload")}
                disabled={loading}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  backgroundColor: "#ffffff",
                  color: "#475569",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer"
                }}
              >
                Change File
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: "transparent",
                    color: "#64748B",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: loading ? "not-allowed" : "pointer"
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={loading || validRows.length === 0}
                  style={{
                    padding: "9px 20px",
                    borderRadius: "8px",
                    backgroundColor: validRows.length === 0 ? "#94A3B8" : "#10B981",
                    color: "#ffffff",
                    border: "none",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: loading || validRows.length === 0 ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    boxShadow: "0 2px 6px rgba(16, 185, 129, 0.25)"
                  }}
                >
                  {loading ? (
                    <span>Importing to CRM...</span>
                  ) : (
                    <>
                      <span>Import {validRows.length} Valid Leads</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: RESULT VIEW */}
        {step === "result" && importResult && (
          <div style={{ padding: "32px 24px", textAlign: "center" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                backgroundColor: "#ECFDF5",
                color: "#10B981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px"
              }}
            >
              <CheckCircle2 size={32} />
            </div>

            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#0F172A", margin: 0 }}>
              Import Completed Successfully!
            </h3>
            <p style={{ fontSize: "13.5px", color: "#64748B", margin: "6px 0 20px" }}>
              Leads and contacts from <strong>{importResult.fileName}</strong> have been saved to the CRM database.
            </p>

            <div
              style={{
                maxWidth: "380px",
                margin: "0 auto 24px",
                backgroundColor: "#F8FAFC",
                borderRadius: "12px",
                padding: "16px",
                border: "1px solid #E2E8F0",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                textAlign: "left"
              }}
            >
              <div>
                <div style={{ fontSize: "11px", fontWeight: 600, color: "#64748B", textTransform: "uppercase" }}>
                  Successfully Saved
                </div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: "#10B981", marginTop: "2px" }}>
                  {importResult.importedCount}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "11px", fontWeight: 600, color: "#64748B", textTransform: "uppercase" }}>
                  Skipped / Ignored
                </div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: "#64748B", marginTop: "2px" }}>
                  {importResult.skippedCount}
                </div>
              </div>
            </div>

            {importResult.errors && importResult.errors.length > 0 && (
              <div
                style={{
                  maxWidth: "480px",
                  margin: "0 auto 20px",
                  backgroundColor: "#FEF2F2",
                  borderRadius: "8px",
                  padding: "12px",
                  border: "1px solid #FECACA",
                  textAlign: "left",
                  fontSize: "12px",
                  color: "#DC2626"
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: "4px" }}>Backend Ingestion Notices:</div>
                <ul style={{ margin: 0, paddingLeft: "18px" }}>
                  {importResult.errors.slice(0, 3).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              type="button"
              onClick={handleClose}
              style={{
                padding: "10px 24px",
                borderRadius: "8px",
                backgroundColor: "#10B981",
                color: "#ffffff",
                border: "none",
                fontSize: "13.5px",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(16, 185, 129, 0.25)"
              }}
            >
              View Imported Leads & Log Messages
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
