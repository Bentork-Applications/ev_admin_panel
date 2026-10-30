import React, { useState, useRef } from "react";
import {
  X,
  MessageSquare,
  Send,
  Users,
  AlertCircle,
  Paperclip,
  UploadCloud,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Film,
  File,
  Trash2,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { crmService } from "../../services/crmService";
import {
  validateAttachmentFile,
  generateImageThumbnail,
  serializeMessageWithAttachments,
  formatFileSize,
  registerSessionAttachment
} from "../../utils/crmAttachmentUtils";

const MESSAGE_TYPES = [
  { value: "whatsapp_outbound", label: "WhatsApp Message (Outbound)" },
  { value: "campaign_message", label: "Campaign Message" },
  { value: "note", label: "General Note / SMS Log" },
  { value: "email", label: "Email Interaction" }
];

export const LogLeadMessageModal = ({
  isOpen,
  onClose,
  selectedLeads = [],
  onSuccess,
  showToast
}) => {
  const [messageType, setMessageType] = useState("whatsapp_outbound");
  const [subject, setSubject] = useState("");
  const [messageText, setMessageText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [processingFiles, setProcessingFiles] = useState(false);
  const [fileError, setFileError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showRecipientsList, setShowRecipientsList] = useState(false);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleClose = () => {
    if (saving || processingFiles) return;
    setMessageText("");
    setSubject("");
    setMessageType("whatsapp_outbound");
    setAttachments([]);
    setFileError("");
    setShowRecipientsList(false);
    onClose();
  };

  // Process incoming file list (from file input or drag-and-drop)
  const processFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    setFileError("");
    setProcessingFiles(true);

    const newAttachments = [];
    let rejectedCount = 0;
    let lastError = "";

    for (const file of Array.from(fileList)) {
      // Validate type & size
      const validation = validateAttachmentFile(file);
      if (!validation.valid) {
        rejectedCount++;
        lastError = validation.error;
        continue;
      }

      // Generate unique identifier
      const id = `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      // Cache session object URL for active session downloads
      const previewUrl = registerSessionAttachment(id, file);

      // Generate thumbnail for image files
      let thumbnail = null;
      if (validation.category === "image") {
        thumbnail = await generateImageThumbnail(file, 300, 300);
      }

      newAttachments.push({
        id,
        file,
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        category: validation.category,
        previewUrl,
        thumbnail,
        uploadedAt: new Date().toISOString()
      });
    }

    if (rejectedCount > 0) {
      const errText = rejectedCount === 1
        ? lastError
        : `${rejectedCount} files were skipped due to size (>15MB) or unsupported format.`;
      setFileError(errText);
      showToast?.(errText, "warning");
    }

    if (newAttachments.length > 0) {
      setAttachments((prev) => [...prev, ...newAttachments]);
    }

    setProcessingFiles(false);
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    processFiles(files);
    // Reset file input so same file can be re-selected if removed
    if (e.target) e.target.value = "";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer && e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveAttachment = (idToRemove) => {
    setAttachments((prev) => prev.filter((a) => a.id !== idToRemove));
  };

  const handleClearAllAttachments = () => {
    setAttachments([]);
    setFileError("");
  };

  const renderFileIcon = (category) => {
    switch (category) {
      case "image":
        return <ImageIcon size={18} color="#2563EB" />;
      case "pdf":
        return <FileText size={18} color="#DC2626" />;
      case "video":
        return <Film size={18} color="#7C3AED" />;
      case "document":
        return <FileSpreadsheet size={18} color="#059669" />;
      default:
        return <File size={18} color="#64748B" />;
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!messageText.trim()) {
      showToast?.("Please enter the message content before saving", "error");
      return;
    }

    if (!selectedLeads || selectedLeads.length === 0) {
      showToast?.("No leads selected to record message for", "warning");
      return;
    }

    setSaving(true);

    try {
      let successCount = 0;
      let failCount = 0;
      const errors = [];

      // Serialize message body with attachments metadata
      const serializedNotes = serializeMessageWithAttachments(messageText, attachments);

      // Loop through each selected lead and persist activity via backend API
      const promises = selectedLeads.map(async (lead) => {
        try {
          const finalSubject =
            subject.trim() ||
            `Sent Message: ${messageText.trim().slice(0, 35)}${messageText.length > 35 ? "..." : ""}`;

          await crmService.logActivity({
            leadId: lead.id,
            companyId: lead.companyId || undefined,
            contactId: lead.contactId || undefined,
            activityType: messageType,
            subject: finalSubject,
            notes: serializedNotes,
            activityDate: new Date().toISOString().slice(0, 19)
          });

          successCount++;
        } catch (err) {
          failCount++;
          errors.push(err.message || `Lead ID ${lead.id} failed`);
        }
      });

      await Promise.all(promises);

      if (successCount > 0) {
        const attInfo = attachments.length > 0 ? ` with ${attachments.length} attachment(s)` : "";
        showToast?.(
          `Message successfully recorded for ${successCount} lead${successCount > 1 ? "s" : ""}${attInfo}!`,
          "success"
        );
        onSuccess?.({ successCount, failCount, attachmentsCount: attachments.length });
        handleClose();
      } else {
        showToast?.(`Failed to record messages: ${errors[0] || "Backend error"}`, "error");
      }
    } catch (err) {
      console.error("Failed to log messages:", err);
      showToast?.(err.message || "An unexpected error occurred while saving message history", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 1350,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px"
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving && !processingFiles) handleClose();
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "600px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden"
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
                backgroundColor: "#EFF6FF",
                color: "#2563EB",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <MessageSquare size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
                Record Sent Message
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748B" }}>
                Log interaction history & attachments for selected leads in CRM timeline
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            disabled={saving || processingFiles}
            style={{
              background: "transparent",
              border: "none",
              color: "#94A3B8",
              cursor: saving || processingFiles ? "not-allowed" : "pointer",
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

        {/* Form Body */}
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", overflowY: "auto", flex: 1 }}>
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Recipient summary pill */}
            <div
              style={{
                padding: "12px 14px",
                backgroundColor: "#F1F5F9",
                borderRadius: "10px",
                border: "1px solid #E2E8F0"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Users size={16} color="#475569" />
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#1E293B" }}>
                    Selected Leads: {selectedLeads.length}
                  </span>
                  {selectedLeads.length === 1 && (
                    <span style={{ fontSize: "12px", color: "#64748B", marginLeft: "4px" }}>
                      ({selectedLeads[0].contactName || selectedLeads[0].title || `Lead #${selectedLeads[0].id}`} - {selectedLeads[0].contactPhone || selectedLeads[0].phone || "No phone"})
                    </span>
                  )}
                </div>

                {selectedLeads.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setShowRecipientsList(!showRecipientsList)}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#2563EB",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: 0
                    }}
                  >
                    {showRecipientsList ? "Hide List" : "View List"}
                  </button>
                )}
              </div>

              {showRecipientsList && selectedLeads.length > 1 && (
                <div
                  style={{
                    marginTop: "10px",
                    paddingTop: "10px",
                    borderTop: "1px solid #E2E8F0",
                    maxHeight: "130px",
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px"
                  }}
                >
                  {selectedLeads.map((l) => (
                    <div
                      key={l.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: "12px",
                        color: "#475569"
                      }}
                    >
                      <span style={{ fontWeight: 500, color: "#0F172A" }}>
                        {l.contactName || l.title || `Lead #${l.id}`}
                        {l.companyName && <span style={{ color: "#94A3B8" }}> ({l.companyName})</span>}
                      </span>
                      <span style={{ fontFamily: "monospace", color: "#64748B" }}>
                        {l.contactPhone || l.phone || "No phone"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Message Type */}
            <div>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                Message Type <span style={{ color: "#EF4444" }}>*</span>
              </label>
              <select
                value={messageType}
                onChange={(e) => setMessageType(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  fontSize: "13px",
                  outline: "none",
                  backgroundColor: "#ffffff",
                  color: "#0F172A",
                  fontWeight: 500
                }}
              >
                {MESSAGE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject / Title */}
            <div>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                Subject / Reference Title (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g., Bentork EV Battery Product Catalog Follow-up"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  fontSize: "13px",
                  outline: "none",
                  backgroundColor: "#ffffff"
                }}
              />
            </div>

            {/* Message Content */}
            <div>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                Message Content <span style={{ color: "#EF4444" }}>*</span>
              </label>
              <textarea
                rows={4}
                required
                placeholder="Enter the exact message text that was sent to these contacts (e.g. promotional details, quotation follow-up, pricing details)..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  fontSize: "13px",
                  outline: "none",
                  backgroundColor: "#ffffff",
                  resize: "vertical",
                  lineHeight: "1.5"
                }}
              />
            </div>

            {/* 3. Attachments (Optional) */}
            <div
              style={{
                backgroundColor: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "12px",
                padding: "16px"
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "8px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Paperclip size={15} color="#2563EB" />
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#1E293B" }}>
                    Attachments (Optional)
                  </span>
                  {attachments.length > 0 && (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        backgroundColor: "#EFF6FF",
                        color: "#2563EB",
                        padding: "1px 7px",
                        borderRadius: "10px"
                      }}
                    >
                      {attachments.length} selected
                    </span>
                  )}
                </div>

                {attachments.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllAttachments}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#DC2626",
                      fontSize: "11.5px",
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: 0
                    }}
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.mp4,.webm,.mov"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />

              {/* Drag & Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  border: isDragging ? "2px dashed #2563EB" : "1.5px dashed #CBD5E1",
                  backgroundColor: isDragging ? "#EFF6FF" : "#ffffff",
                  borderRadius: "10px",
                  padding: "14px 16px",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                {processingFiles ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#2563EB", padding: "8px 0" }}>
                    <Loader2 size={18} className="animate-spin" />
                    <span style={{ fontSize: "12.5px", fontWeight: 600 }}>Processing attachments...</span>
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        backgroundColor: "#F1F5F9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#475569"
                      }}
                    >
                      <UploadCloud size={20} />
                    </div>
                    <div>
                      <span style={{ fontSize: "12.5px", fontWeight: 600, color: "#1E293B" }}>
                        Click to attach files
                      </span>
                      <span style={{ fontSize: "12px", color: "#64748B" }}> or drag & drop</span>
                    </div>
                    <div style={{ fontSize: "11px", color: "#94A3B8" }}>
                      Images (JPG, PNG, WEBP), PDF, Word, Excel, Videos (MP4) • Max 15 MB each
                    </div>
                  </>
                )}
              </div>

              {/* File validation error banner */}
              {fileError && (
                <div
                  style={{
                    marginTop: "10px",
                    padding: "8px 12px",
                    backgroundColor: "#FEF2F2",
                    border: "1px solid #FECACA",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "12px",
                    color: "#DC2626"
                  }}
                >
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  <span>{fileError}</span>
                </div>
              )}

              {/* Selected Files List with Previews & Remove Actions */}
              {attachments.length > 0 && (
                <div
                  style={{
                    marginTop: "12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    maxHeight: "180px",
                    overflowY: "auto",
                    paddingRight: "2px"
                  }}
                >
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 10px",
                        backgroundColor: "#ffffff",
                        borderRadius: "8px",
                        border: "1px solid #E2E8F0"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden" }}>
                        {/* Thumbnail or Category Icon */}
                        {att.category === "image" && (att.previewUrl || att.thumbnail) ? (
                          <div
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "6px",
                              overflow: "hidden",
                              backgroundColor: "#F1F5F9",
                              flexShrink: 0,
                              border: "1px solid #CBD5E1",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}
                          >
                            <img
                              src={att.previewUrl || att.thumbnail}
                              alt={att.name}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          </div>
                        ) : (
                          <div
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "6px",
                              backgroundColor:
                                att.category === "pdf"
                                  ? "#FEF2F2"
                                  : att.category === "document"
                                  ? "#ECFDF5"
                                  : att.category === "video"
                                  ? "#F5F3FF"
                                  : "#F1F5F9",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0
                            }}
                          >
                            {renderFileIcon(att.category)}
                          </div>
                        )}

                        <div style={{ overflow: "hidden" }}>
                          <div
                            style={{
                              fontSize: "12.5px",
                              fontWeight: 600,
                              color: "#0F172A",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: "340px"
                            }}
                            title={att.name}
                          >
                            {att.name}
                          </div>
                          <div style={{ fontSize: "11px", color: "#64748B", display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ textTransform: "uppercase", fontWeight: 500 }}>
                              {att.category}
                            </span>
                            <span>•</span>
                            <span>{formatFileSize(att.size)}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(att.id)}
                        disabled={saving}
                        title="Remove file"
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#94A3B8",
                          cursor: saving ? "not-allowed" : "pointer",
                          padding: "6px",
                          borderRadius: "6px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "color 0.15s, background-color 0.15s"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "#DC2626";
                          e.currentTarget.style.backgroundColor = "#FEF2F2";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "#94A3B8";
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
            <div style={{ fontSize: "12px", color: "#64748B" }}>
              {attachments.length > 0 ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#059669", fontWeight: 500 }}>
                  <CheckCircle2 size={13} />
                  {attachments.length} attachment{attachments.length > 1 ? "s" : ""} included
                </span>
              ) : (
                <span>No files attached (Optional)</span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                type="button"
                onClick={handleClose}
                disabled={saving || processingFiles}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  backgroundColor: "#ffffff",
                  color: "#475569",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: saving || processingFiles ? "not-allowed" : "pointer"
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving || processingFiles || !messageText.trim()}
                style={{
                  padding: "9px 20px",
                  borderRadius: "8px",
                  backgroundColor: saving || processingFiles || !messageText.trim() ? "#94A3B8" : "#2563EB",
                  color: "#ffffff",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: saving || processingFiles || !messageText.trim() ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 2px 6px rgba(37, 99, 235, 0.25)"
                }}
              >
                {saving ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Saving Message...</span>
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    <span>Save Message ({selectedLeads.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
