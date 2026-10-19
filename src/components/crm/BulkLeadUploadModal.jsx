import React, { useState, useRef } from "react";
import {
  Upload,
  X,
  FileText,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Download,
  RotateCcw,
  Info
} from "lucide-react";
import { crmService } from "../../services/crmService";

export const BulkLeadUploadModal = ({ isOpen, onClose, onSuccess, showToast }) => {
  const [file, setFile] = useState(null);
  const [fileStats, setFileStats] = useState(null);
  const [clientErrors, setClientErrors] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [progressStage, setProgressStage] = useState("");
  const [importResult, setImportResult] = useState(null);
  const [apiError, setApiError] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Download Sample CSV
  const handleDownloadSample = () => {
    const headers = "title,source,city,state,estimatedValue,notes,contactName,contactPhone,contactEmail,companyName\n";
    const sampleRow1 = "EV Battery Fleet Inquiry,Website,Pune,Maharashtra,500000,Requires 72V 100Ah packs,Rahul Sharma,9876543210,rahul@example.com,Fleet Logistics Pvt Ltd\n";
    const sampleRow2 = "Solar Storage Integration,IndiaMART,Bengaluru,Karnataka,1200000,BESS project 48V,Ananya Patel,9823456789,ananya@example.com,SolarTech Solutions\n";
    const blob = new Blob([headers + sampleRow1 + sampleRow2], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "bentork_leads_import_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast?.("Sample CSV template downloaded", "info");
  };

  // Pre-validate file client-side
  const validateAndSetFile = (selectedFile) => {
    setClientErrors([]);
    setApiError(null);
    setImportResult(null);

    if (!selectedFile) {
      setFile(null);
      setFileStats(null);
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      setClientErrors(["Please select a file with .csv extension"]);
      setFile(null);
      setFileStats(null);
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setClientErrors(["File size exceeds the 10 MB limit"]);
      setFile(null);
      setFileStats(null);
      return;
    }

    // Read initial lines to validate headers and row count
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
      if (lines.length === 0) {
        setClientErrors(["The selected CSV file appears to be empty."]);
        return;
      }

      const headerLine = lines[0].toLowerCase();
      const detectedRows = Math.max(0, lines.length - 1);
      const warnings = [];

      // Check required or recommended headers
      if (!headerLine.includes("contactphone") && !headerLine.includes("phone")) {
        warnings.push("Notice: CSV is missing 'contactPhone' column which is recommended for lead creation.");
      }
      if (!headerLine.includes("title") && !headerLine.includes("contactname")) {
        warnings.push("Notice: Neither 'title' nor 'contactName' column was found. Leads will be titled with default numbers.");
      }

      setFile(selectedFile);
      setFileStats({
        rowCount: detectedRows,
        sizeKb: (selectedFile.size / 1024).toFixed(1),
        warnings
      });
    };
    reader.onerror = () => {
      setClientErrors(["Failed to read the selected file."]);
    };
    reader.readAsText(selectedFile);
  };

  // Drag and Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  };

  // Submit Upload to existing backend integration
  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setApiError(null);
    setImportResult(null);
    setUploadProgress(15);
    setProgressStage("Uploading file to server...");

    // Smooth progress animation while awaiting backend response
    const progressTimer = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev < 40) {
          setProgressStage("Sending leads to CRM ingestion service...");
          return prev + 15;
        } else if (prev < 80) {
          setProgressStage("Validating data rows & linking company/contact records...");
          return prev + 10;
        } else if (prev < 90) {
          setProgressStage("Finalizing import transactions...");
          return prev + 2;
        }
        return prev;
      });
    }, 300);

    try {
      const res = await crmService.importLeadsCsv(file);
      clearInterval(progressTimer);
      setUploadProgress(100);
      setProgressStage("Import complete!");
      setImportResult(res);

      const imported = res?.importedCount ?? 0;
      const skipped = res?.skippedCount ?? 0;
      if (imported > 0) {
        showToast?.(`Successfully imported ${imported} lead(s) into CRM`, "success");
      } else {
        showToast?.(`Import finished: 0 imported, ${skipped} skipped`, "info");
      }
      onSuccess?.();
    } catch (err) {
      clearInterval(progressTimer);
      console.error("Bulk CSV import error:", err);
      const msg = err.message || "Failed to process lead CSV file.";
      setApiError(msg);
      showToast?.(msg, "error");
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setFileStats(null);
    setClientErrors([]);
    setApiError(null);
    setImportResult(null);
    setUploadProgress(0);
    setProgressStage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Export failed rows as a text file
  const handleDownloadErrors = () => {
    if (!importResult?.errors?.length) return;
    const errorText = importResult.errors.join("\n");
    const blob = new Blob([errorText], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `bentork_lead_import_errors_${Date.now()}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
        zIndex: 1400,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px"
      }}
      onClick={uploading ? undefined : onClose}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "580px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #E2E8F0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#0F172A" }}>
              Bulk Lead Upload
            </h3>
            <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#64748B" }}>
              Import new leads directly into BENTORK Sales CRM using a CSV spreadsheet
            </p>
          </div>
          <button
            onClick={uploading ? undefined : onClose}
            disabled={uploading}
            style={{
              background: "none",
              border: "none",
              color: uploading ? "#CBD5E1" : "#64748B",
              cursor: uploading ? "not-allowed" : "pointer"
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Template Info Banner */}
          {!importResult && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
                borderRadius: "8px",
                backgroundColor: "#F8FAFC",
                border: "1px solid #E2E8F0",
                fontSize: "12.5px"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#334155" }}>
                <FileText size={16} color="#2563EB" />
                <span>Need the standard CSV template format?</span>
              </div>
              <button
                type="button"
                onClick={handleDownloadSample}
                style={{
                  background: "none",
                  border: "none",
                  color: "#2563EB",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                <Download size={13} />
                <span>Sample CSV</span>
              </button>
            </div>
          )}

          {/* Pre-validation or API Error Banner */}
          {(clientErrors.length > 0 || apiError) && (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "8px",
                backgroundColor: "#FEF2F2",
                border: "1px solid #FECACA",
                color: "#991B1B",
                fontSize: "12.5px"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600 }}>
                <AlertCircle size={15} color="#DC2626" />
                <span>Upload Error</span>
              </div>
              <div style={{ marginTop: "4px", paddingLeft: "23px" }}>
                {apiError && <p style={{ margin: "2px 0" }}>{apiError}</p>}
                {clientErrors.map((err, idx) => (
                  <p key={idx} style={{ margin: "2px 0" }}>{err}</p>
                ))}
              </div>
            </div>
          )}

          {/* File Selection / Drop Area (when not showing import result) */}
          {!importResult && (
            <div>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  border: `2px dashed ${isDragging ? "#2563EB" : "#CBD5E1"}`,
                  borderRadius: "12px",
                  padding: "28px 18px",
                  textAlign: "center",
                  backgroundColor: isDragging ? "#EFF6FF" : "#FAFBFD",
                  transition: "all 0.15s ease"
                }}
              >
                <Upload
                  size={32}
                  color={isDragging ? "#2563EB" : "#94A3B8"}
                  style={{ margin: "0 auto 10px" }}
                />
                <p style={{ margin: "0 0 6px 0", fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>
                  {file ? file.name : "Select or drag & drop a .csv file"}
                </p>
                <p style={{ margin: "0 0 14px 0", fontSize: "12px", color: "#64748B" }}>
                  Supported format: CSV (Max file size: 10 MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  id="crm-bulk-csv-input"
                  accept=".csv,text/csv"
                  onChange={(e) => validateAndSetFile(e.target.files?.[0] || null)}
                  style={{ display: "none" }}
                  disabled={uploading}
                />
                <label
                  htmlFor="crm-bulk-csv-input"
                  style={{
                    display: "inline-block",
                    padding: "8px 18px",
                    borderRadius: "6px",
                    backgroundColor: "#ffffff",
                    border: "1px solid #CBD5E1",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    color: "#2563EB",
                    cursor: uploading ? "not-allowed" : "pointer"
                  }}
                >
                  Browse File
                </label>
              </div>

              {/* File details & row stats preview */}
              {fileStats && (
                <div
                  style={{
                    marginTop: "12px",
                    padding: "12px 14px",
                    borderRadius: "8px",
                    backgroundColor: "#F0FDF4",
                    border: "1px solid #BBF7D0",
                    fontSize: "12.5px"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#166534", fontWeight: 600 }}>
                      <CheckCircle2 size={16} />
                      <span>{file.name}</span>
                    </div>
                    <span style={{ fontSize: "12px", color: "#64748B" }}>{fileStats.sizeKb} KB</span>
                  </div>
                  <div style={{ marginTop: "6px", fontSize: "12px", color: "#166534" }}>
                    Detected <strong>{fileStats.rowCount}</strong> data row{fileStats.rowCount === 1 ? "" : "s"} ready to ingest.
                  </div>

                  {fileStats.warnings?.length > 0 && (
                    <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px dashed #BBF7D0" }}>
                      {fileStats.warnings.map((w, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "6px", color: "#B45309", fontSize: "11.5px", marginTop: "2px" }}>
                          <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: "1px" }} />
                          <span>{w}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Upload Progress Bar */}
          {uploading && (
            <div
              style={{
                padding: "16px",
                borderRadius: "10px",
                backgroundColor: "#F8FAFC",
                border: "1px solid #E2E8F0"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "12.5px" }}>
                <span style={{ fontWeight: 600, color: "#0F172A" }}>{progressStage}</span>
                <span style={{ fontWeight: 700, color: "#2563EB" }}>{uploadProgress}%</span>
              </div>
              <div
                style={{
                  height: "8px",
                  borderRadius: "4px",
                  backgroundColor: "#E2E8F0",
                  overflow: "hidden"
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${uploadProgress}%`,
                    backgroundColor: "#2563EB",
                    transition: "width 0.25s ease",
                    borderRadius: "4px"
                  }}
                />
              </div>
              <p style={{ margin: "8px 0 0 0", fontSize: "11px", color: "#64748B", textAlign: "center" }}>
                Please do not close or refresh this window while upload is in progress...
              </p>
            </div>
          )}

          {/* Results Summary & Error Report */}
          {importResult && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div
                style={{
                  padding: "16px",
                  borderRadius: "10px",
                  backgroundColor: importResult.importedCount > 0 ? "#F0FDF4" : "#FEF2F2",
                  border: `1px solid ${importResult.importedCount > 0 ? "#BBF7D0" : "#FECACA"}`
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  {importResult.importedCount > 0 ? (
                    <CheckCircle2 size={18} color="#16A34A" />
                  ) : (
                    <AlertCircle size={18} color="#DC2626" />
                  )}
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color: importResult.importedCount > 0 ? "#166534" : "#991B1B"
                    }}
                  >
                    Import Summary
                  </span>
                </div>

                {/* 3 Metric Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                  <div style={{ backgroundColor: "#ffffff", padding: "10px", borderRadius: "8px", border: "1px solid #E2E8F0", textAlign: "center" }}>
                    <div style={{ fontSize: "11px", color: "#64748B", fontWeight: 500 }}>Total Rows</div>
                    <div style={{ fontSize: "18px", fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>
                      {importResult.totalRows ?? 0}
                    </div>
                  </div>

                  <div style={{ backgroundColor: "#ffffff", padding: "10px", borderRadius: "8px", border: "1px solid #BBF7D0", textAlign: "center" }}>
                    <div style={{ fontSize: "11px", color: "#166534", fontWeight: 600 }}>Imported</div>
                    <div style={{ fontSize: "18px", fontWeight: 700, color: "#16A34A", marginTop: "2px" }}>
                      {importResult.importedCount ?? 0}
                    </div>
                  </div>

                  <div style={{ backgroundColor: "#ffffff", padding: "10px", borderRadius: "8px", border: "1px solid #FECACA", textAlign: "center" }}>
                    <div style={{ fontSize: "11px", color: "#991B1B", fontWeight: 600 }}>Skipped / Failed</div>
                    <div style={{ fontSize: "18px", fontWeight: 700, color: "#DC2626", marginTop: "2px" }}>
                      {importResult.skippedCount ?? 0}
                    </div>
                  </div>
                </div>
              </div>

              {/* Validation errors & row failure details */}
              {Array.isArray(importResult.errors) && importResult.errors.length > 0 && (
                <div
                  style={{
                    backgroundColor: "#FFFBEB",
                    borderRadius: "10px",
                    border: "1px solid #FDE68A",
                    padding: "14px"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", fontWeight: 700, color: "#92400E" }}>
                      <AlertTriangle size={15} color="#D97706" />
                      <span>Failed Row Details ({importResult.errors.length})</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadErrors}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#B45309",
                        fontSize: "11.5px",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      <Download size={12} />
                      <span>Download Errors</span>
                    </button>
                  </div>

                  <div
                    style={{
                      maxHeight: "160px",
                      overflowY: "auto",
                      backgroundColor: "#ffffff",
                      borderRadius: "6px",
                      border: "1px solid #FEF3C7",
                      padding: "8px 12px",
                      fontSize: "11.5px",
                      color: "#78350F"
                    }}
                  >
                    <ul style={{ margin: 0, paddingLeft: "16px" }}>
                      {importResult.errors.map((err, i) => (
                        <li key={i} style={{ margin: "4px 0" }}>
                          {typeof err === "string" ? err : JSON.stringify(err)}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Expected Headers Reference helper */}
          {!importResult && (
            <div style={{ backgroundColor: "#F8FAFC", borderRadius: "8px", padding: "10px 12px", border: "1px solid #E2E8F0", fontSize: "11.5px", color: "#64748B" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "5px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                <Info size={13} />
                <span>Expected CSV Column Headers:</span>
              </div>
              <code style={{ fontSize: "11px", color: "#2563EB", wordBreak: "break-all" }}>
                title, source, city, state, estimatedValue, notes, contactName, contactPhone, contactEmail, companyName
              </code>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #E2E8F0",
            backgroundColor: "#FAFBFD",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          {importResult ? (
            <>
              <button
                type="button"
                onClick={handleReset}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  backgroundColor: "#ffffff",
                  border: "1px solid #CBD5E1",
                  fontSize: "12.5px",
                  color: "#475569",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <RotateCcw size={14} />
                <span>Upload Another File</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: "8px 20px",
                  borderRadius: "8px",
                  backgroundColor: "#2563EB",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#ffffff",
                  cursor: "pointer"
                }}
              >
                Done / View Leads
              </button>
            </>
          ) : (
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", width: "100%" }}>
              <button
                type="button"
                onClick={onClose}
                disabled={uploading}
                style={{
                  padding: "9px 16px",
                  borderRadius: "8px",
                  backgroundColor: "#ffffff",
                  border: "1px solid #CBD5E1",
                  fontSize: "13px",
                  color: "#475569",
                  cursor: uploading ? "not-allowed" : "pointer"
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={!file || uploading}
                style={{
                  padding: "9px 20px",
                  borderRadius: "8px",
                  backgroundColor: "#2563EB",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#ffffff",
                  cursor: !file || uploading ? "not-allowed" : "pointer",
                  opacity: !file || uploading ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <Upload size={14} />
                <span>{uploading ? "Importing Leads..." : "Submit CSV Import"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkLeadUploadModal;
