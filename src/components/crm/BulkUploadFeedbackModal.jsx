import React, { useEffect } from "react";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  X,
  ArrowRight,
  Download,
  FileSpreadsheet
} from "lucide-react";

export const BulkUploadFeedbackModal = ({
  isOpen,
  status, // "loading" | "success" | "partial" | "error"
  fileName,
  fileSize,
  importedCount = 0,
  skippedCount = 0,
  totalRows = 0,
  errors = [],
  errorMessage = "",
  details = [],
  canRetry = false,
  onRetry,
  onClose,
  onViewLeads,
  onDownloadSample
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && status !== "loading") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, status, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = () => {
    if (status !== "loading") {
      onClose();
    }
  };

  const allDetails = [
    ...(Array.isArray(details) ? details : details ? [String(details)] : []),
    ...(Array.isArray(errors) ? errors : errors ? [String(errors)] : [])
  ].filter(Boolean);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1200,
        padding: "16px",
        animation: "feedbackFadeIn 0.15s ease-out"
      }}
      onClick={handleOverlayClick}
    >
      <style>{`
        @keyframes feedbackFadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes feedbackPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "520px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          border: "1px solid #E2E8F0",
          overflow: "hidden"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid #F1F5F9"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FileSpreadsheet size={18} color="#2563EB" />
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#1E293B" }}>
              Bulk Lead Ingestion Feedback
            </span>
          </div>

          {status !== "loading" && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                borderRadius: "6px",
                color: "#64748B",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#F1F5F9";
                e.currentTarget.style.color = "#0F172A";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#64748B";
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div style={{ padding: "24px 20px", overflowY: "auto", maxHeight: "calc(90vh - 140px)" }}>
          {/* ==================== 1. LOADING STATE ==================== */}
          {status === "loading" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  backgroundColor: "#EFF6FF",
                  border: "2px solid #BFDBFE",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#2563EB",
                  marginBottom: "18px"
                }}
              >
                <RefreshCw size={28} className="animate-spin" />
              </div>

              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#0F172A", margin: "0 0 8px 0" }}>
                Uploading Leads to CRM...
              </h3>
              <p style={{ fontSize: "13px", color: "#64748B", margin: "0 0 16px 0", maxWidth: "400px", lineHeight: "1.5" }}>
                Processing <strong>{fileName || "file"}</strong> {fileSize ? `(${fileSize})` : ""}. Ingesting lead data, linking companies, and creating contacts.
              </p>

              {/* Ingestion Steps Indicator */}
              <div
                style={{
                  width: "100%",
                  backgroundColor: "#F8FAFC",
                  borderRadius: "10px",
                  padding: "14px",
                  border: "1px solid #E2E8F0",
                  textAlign: "left"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#2563EB", animation: "feedbackPulse 1.5s infinite" }} />
                  <span style={{ fontSize: "12px", color: "#334155", fontWeight: 600 }}>
                    1. Uploading file stream to backend endpoint...
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#3B82F6", animation: "feedbackPulse 1.5s infinite", animationDelay: "0.3s" }} />
                  <span style={{ fontSize: "12px", color: "#334155", fontWeight: 600 }}>
                    2. Parsing rows & validating contact data...
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#60A5FA", animation: "feedbackPulse 1.5s infinite", animationDelay: "0.6s" }} />
                  <span style={{ fontSize: "12px", color: "#334155", fontWeight: 600 }}>
                    3. Persisting records into Bentork CRM database...
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ==================== 2. SUCCESS STATE ==================== */}
          {status === "success" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  backgroundColor: "#DCFCE7",
                  border: "2px solid #86EFAC",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#16A34A",
                  marginBottom: "16px"
                }}
              >
                <CheckCircle2 size={32} />
              </div>

              <h3 style={{ fontSize: "19px", fontWeight: 700, color: "#166534", margin: "0 0 6px 0" }}>
                Leads uploaded successfully!
              </h3>
              <p style={{ fontSize: "13px", color: "#475569", margin: "0 0 20px 0", maxWidth: "420px", lineHeight: "1.5" }}>
                All leads have been successfully parsed, deduplicated, and synchronized with Bentork Sales CRM.
              </p>

              {/* Metrics Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "10px",
                  width: "100%",
                  marginBottom: "16px"
                }}
              >
                <div
                  style={{
                    backgroundColor: "#F0FDF4",
                    borderRadius: "10px",
                    padding: "12px 8px",
                    border: "1px solid #BBF7D0",
                    textAlign: "center"
                  }}
                >
                  <div style={{ fontSize: "11px", fontWeight: 600, color: "#166534", textTransform: "uppercase" }}>
                    Uploaded
                  </div>
                  <div style={{ fontSize: "22px", fontWeight: 700, color: "#16A34A", marginTop: "2px" }}>
                    {importedCount}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: "#F8FAFC",
                    borderRadius: "10px",
                    padding: "12px 8px",
                    border: "1px solid #E2E8F0",
                    textAlign: "center"
                  }}
                >
                  <div style={{ fontSize: "11px", fontWeight: 600, color: "#64748B", textTransform: "uppercase" }}>
                    Failed / Skipped
                  </div>
                  <div style={{ fontSize: "22px", fontWeight: 700, color: "#64748B", marginTop: "2px" }}>
                    {skippedCount}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: "#F8FAFC",
                    borderRadius: "10px",
                    padding: "12px 8px",
                    border: "1px solid #E2E8F0",
                    textAlign: "center"
                  }}
                >
                  <div style={{ fontSize: "11px", fontWeight: 600, color: "#64748B", textTransform: "uppercase" }}>
                    Total Processed
                  </div>
                  <div style={{ fontSize: "22px", fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>
                    {totalRows}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== 3. PARTIAL SUCCESS STATE ==================== */}
          {status === "partial" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  backgroundColor: "#FEF3C7",
                  border: "2px solid #FCD34D",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#D97706",
                  marginBottom: "16px"
                }}
              >
                <AlertTriangle size={30} />
              </div>

              <h3 style={{ fontSize: "19px", fontWeight: 700, color: "#92400E", margin: "0 0 6px 0" }}>
                Partial Upload Completed
              </h3>
              <p style={{ fontSize: "13px", color: "#475569", margin: "0 0 18px 0", maxWidth: "420px", lineHeight: "1.5" }}>
                <strong>{importedCount}</strong> lead{importedCount === 1 ? "" : "s"} were imported successfully, but <strong>{skippedCount}</strong> failed or were skipped due to formatting or validation issues.
              </p>

              {/* Metrics Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "10px",
                  width: "100%",
                  marginBottom: "16px"
                }}
              >
                <div
                  style={{
                    backgroundColor: "#F0FDF4",
                    borderRadius: "10px",
                    padding: "12px 8px",
                    border: "1px solid #BBF7D0",
                    textAlign: "center"
                  }}
                >
                  <div style={{ fontSize: "11px", fontWeight: 600, color: "#166534", textTransform: "uppercase" }}>
                    Uploaded
                  </div>
                  <div style={{ fontSize: "22px", fontWeight: 700, color: "#16A34A", marginTop: "2px" }}>
                    {importedCount}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: "#FFFBEB",
                    borderRadius: "10px",
                    padding: "12px 8px",
                    border: "1px solid #FDE68A",
                    textAlign: "center"
                  }}
                >
                  <div style={{ fontSize: "11px", fontWeight: 600, color: "#B45309", textTransform: "uppercase" }}>
                    Failed / Skipped
                  </div>
                  <div style={{ fontSize: "22px", fontWeight: 700, color: "#D97706", marginTop: "2px" }}>
                    {skippedCount}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: "#F8FAFC",
                    borderRadius: "10px",
                    padding: "12px 8px",
                    border: "1px solid #E2E8F0",
                    textAlign: "center"
                  }}
                >
                  <div style={{ fontSize: "11px", fontWeight: 600, color: "#64748B", textTransform: "uppercase" }}>
                    Total Processed
                  </div>
                  <div style={{ fontSize: "22px", fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>
                    {totalRows}
                  </div>
                </div>
              </div>

              {/* Failed Details List */}
              {allDetails.length > 0 && (
                <div
                  style={{
                    width: "100%",
                    textAlign: "left",
                    backgroundColor: "#FEF2F2",
                    borderRadius: "10px",
                    padding: "12px 14px",
                    border: "1px solid #FECACA",
                    marginBottom: "12px"
                  }}
                >
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#991B1B", marginBottom: "6px" }}>
                    Failed Upload Details & Warnings ({allDetails.length}):
                  </div>
                  <div style={{ maxHeight: "130px", overflowY: "auto", fontSize: "12px", color: "#DC2626" }}>
                    <ul style={{ margin: 0, paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "4px" }}>
                      {allDetails.map((item, idx) => (
                        <li key={idx} style={{ lineHeight: "1.4" }}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================== 4. ERROR STATE ==================== */}
          {status === "error" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  backgroundColor: "#FEE2E2",
                  border: "2px solid #FCA5A5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#DC2626",
                  marginBottom: "16px"
                }}
              >
                <AlertCircle size={32} />
              </div>

              <h3 style={{ fontSize: "19px", fontWeight: 700, color: "#991B1B", margin: "0 0 6px 0" }}>
                Upload Failed
              </h3>

              <div
                style={{
                  width: "100%",
                  backgroundColor: "#FEF2F2",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  border: "1px solid #FECACA",
                  margin: "10px 0 16px 0",
                  textAlign: "left"
                }}
              >
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#991B1B", marginBottom: "4px" }}>
                  Reason for Failure:
                </div>
                <div style={{ fontSize: "13px", color: "#B91C1C", lineHeight: "1.4" }}>
                  {errorMessage || "Failed to process bulk lead upload. Please check your file and backend connection."}
                </div>
              </div>

              {/* Detailed Breakdown if provided */}
              {allDetails.length > 0 && (
                <div
                  style={{
                    width: "100%",
                    textAlign: "left",
                    backgroundColor: "#F8FAFC",
                    borderRadius: "10px",
                    padding: "12px 14px",
                    border: "1px solid #E2E8F0",
                    marginBottom: "12px"
                  }}
                >
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                    Failed Upload Details ({allDetails.length}):
                  </div>
                  <div style={{ maxHeight: "130px", overflowY: "auto", fontSize: "12px", color: "#475569" }}>
                    <ul style={{ margin: 0, paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "4px" }}>
                      {allDetails.map((item, idx) => (
                        <li key={idx} style={{ lineHeight: "1.4" }}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "10px",
            padding: "14px 20px",
            backgroundColor: "#F8FAFC",
            borderTop: "1px solid #F1F5F9"
          }}
        >
          {status === "loading" && (
            <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 500, marginRight: "auto" }}>
              Upload in progress — please do not close or navigate away...
            </span>
          )}

          {status !== "loading" && (
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "9px 16px",
                borderRadius: "8px",
                backgroundColor: "#ffffff",
                border: "1px solid #CBD5E1",
                fontSize: "13px",
                fontWeight: 600,
                color: "#475569",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#F1F5F9";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#ffffff";
              }}
            >
              Close
            </button>
          )}

          {/* Action buttons based on status */}
          {(status === "success" || status === "partial") && onViewLeads && (
            <button
              type="button"
              onClick={onViewLeads}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "9px 18px",
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
              <span>View Leads in CRM</span>
              <ArrowRight size={14} />
            </button>
          )}

          {status === "error" && canRetry && onRetry && (
            <button
              type="button"
              onClick={onRetry}
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
              <RefreshCw size={14} />
              <span>Retry Upload</span>
            </button>
          )}

          {status === "error" && !canRetry && onDownloadSample && (
            <button
              type="button"
              onClick={onDownloadSample}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "9px 16px",
                borderRadius: "8px",
                backgroundColor: "#2563EB",
                border: "none",
                fontSize: "13px",
                fontWeight: 600,
                color: "#ffffff",
                cursor: "pointer"
              }}
            >
              <Download size={14} />
              <span>Download Sample CSV</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkUploadFeedbackModal;
