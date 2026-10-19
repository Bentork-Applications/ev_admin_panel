import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Search,
  Filter,
  RefreshCw,
  X,
  Megaphone,
  Send,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Info,
  Mail,
  MessageSquare,
  Users,
  Layers,
  ArrowRight
} from "lucide-react";
import { Toast } from "../../../components/common/Toast";
import { crmService } from "../../../services/crmService";

const PAGE_SIZE = 10;

export default function CrmCampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  // Saved Audience Segments for targeting
  const [segments, setSegments] = useState([]);

  // Campaign Detail & Live Dispatch modal state
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [sendingLoading, setSendingLoading] = useState(false);
  const [attachSegmentId, setAttachSegmentId] = useState("");
  const [attachingLoading, setAttachingLoading] = useState(false);

  // Campaign Form State
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    type: "OFFER",
    channel: "BOTH", // "EMAIL", "WHATSAPP", "BOTH"
    subject: "",
    targetAudience: "",
    segmentId: "",
    scheduledDate: "",
    content: ""
  });

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await crmService.getAllCampaigns();
      setCampaigns(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load campaigns:", err);
      setError(err.message || "Failed to load campaigns");
      showToast(err.message || "Failed to load campaigns", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Load audience segments
  const fetchSegments = useCallback(async () => {
    try {
      const data = await crmService.getAudienceSegments();
      setSegments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load audience segments:", err);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
    fetchSegments();
  }, [fetchCampaigns, fetchSegments]);

  // Load recipients when a campaign is selected
  const fetchRecipients = useCallback(async (campaignId) => {
    if (!campaignId) return;
    setRecipientsLoading(true);
    try {
      const data = await crmService.getCampaignRecipients(campaignId);
      setRecipients(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load campaign recipients:", err);
      setRecipients([]);
    } finally {
      setRecipientsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCampaign?.id) {
      fetchRecipients(selectedCampaign.id);
    }
  }, [selectedCampaign, fetchRecipients]);

  // Insert tag into campaign message
  const handleInsertTag = (tag) => {
    setNewCampaign((prev) => ({
      ...prev,
      content: prev.content ? `${prev.content} ${tag}` : tag
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newCampaign.name.trim()) {
      showToast("Please enter campaign name", "error");
      return;
    }

    try {
      const payload = {
        name: newCampaign.name,
        type: newCampaign.type,
        channel: newCampaign.channel,
        subject: newCampaign.subject,
        targetAudience: newCampaign.targetAudience || (newCampaign.segmentId ? `Segment #${newCampaign.segmentId}` : "All Contacts"),
        segmentId: newCampaign.segmentId ? Number(newCampaign.segmentId) : null,
        scheduledDate: newCampaign.scheduledDate || null,
        description: newCampaign.subject || newCampaign.content,
        content: newCampaign.content,
        status: newCampaign.scheduledDate ? "SCHEDULED" : "DRAFT"
      };

      const res = await crmService.createCampaign(payload);
      const createdItem =
        res && typeof res === "object" && res.id
          ? res
          : {
              id: Date.now(),
              ...payload,
              recipients: "0",
              responses: "0",
              quotes: "0"
            };

      // If segment selected, automatically attach it
      if (newCampaign.segmentId && createdItem.id) {
        await crmService.attachAudienceSegment(createdItem.id, newCampaign.segmentId).catch(() => {});
      }

      setCampaigns((prev) => [createdItem, ...prev]);
      showToast("Campaign created successfully", "success");
      setShowCreateModal(false);
      setNewCampaign({
        name: "",
        type: "OFFER",
        channel: "BOTH",
        subject: "",
        targetAudience: "",
        segmentId: "",
        scheduledDate: "",
        content: ""
      });
      fetchCampaigns();
    } catch (err) {
      console.error("Failed to create campaign:", err);
      showToast(err.message || "Failed to create campaign", "error");
    }
  };

  // Live Dispatch
  const handleSendCampaign = async (campaignId) => {
    setSendingLoading(true);
    try {
      const res = await crmService.sendCampaign(campaignId);
      const updatedCampaign = res && res.campaignId ? res : null;
      showToast(
        `Campaign dispatched! Total: ${res?.totalRecipients ?? 0}, Emails: ${res?.emailsSent ?? 0}, WhatsApp: ${res?.whatsAppSent ?? 0}, Failed: ${res?.failedCount ?? 0}`,
        "success"
      );
      // Update local campaign list & selected campaign
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === campaignId
            ? {
                ...c,
                status: "COMPLETED",
                recipients: res?.totalRecipients ?? c.recipients,
                emailsSent: res?.emailsSent,
                whatsAppSent: res?.whatsAppSent,
                failedCount: res?.failedCount
              }
            : c
        )
      );
      if (selectedCampaign?.id === campaignId) {
        setSelectedCampaign((prev) => ({
          ...prev,
          status: "COMPLETED",
          totalRecipients: res?.totalRecipients ?? prev?.totalRecipients,
          emailsSent: res?.emailsSent,
          whatsAppSent: res?.whatsAppSent,
          failedCount: res?.failedCount
        }));
        fetchRecipients(campaignId);
      }
    } catch (err) {
      console.error("Failed to dispatch campaign:", err);
      showToast(err.message || "Failed to send campaign", "error");
    } finally {
      setSendingLoading(false);
    }
  };

  // Attach Audience Segment
  const handleAttachSegment = async () => {
    if (!selectedCampaign?.id || !attachSegmentId) {
      showToast("Please select a segment to attach", "error");
      return;
    }
    setAttachingLoading(true);
    try {
      const res = await crmService.attachAudienceSegment(selectedCampaign.id, attachSegmentId);
      showToast(typeof res === "string" ? res : "Audience segment attached successfully", "success");
      setAttachSegmentId("");
      fetchRecipients(selectedCampaign.id);
      fetchCampaigns();
    } catch (err) {
      console.error("Failed to attach segment:", err);
      showToast(err.message || "Failed to attach audience segment", "error");
    } finally {
      setAttachingLoading(false);
    }
  };

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      const typeMatch =
        typeFilter === "ALL" || (c.type || "").toUpperCase() === typeFilter.toUpperCase();
      const searchMatch =
        !searchQuery.trim() || (c.name || "").toLowerCase().includes(searchQuery.toLowerCase());
      return typeMatch && searchMatch;
    });
  }, [campaigns, typeFilter, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, searchQuery]);

  const totalPages = Math.ceil(filteredCampaigns.length / PAGE_SIZE) || 1;
  const paginatedCampaigns = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredCampaigns.slice(start, start + PAGE_SIZE);
  }, [filteredCampaigns, currentPage]);

  return (
    <div style={{ maxWidth: "1480px", margin: "0 auto", padding: "16px 20px" }}>
      <style>{`
        .crm-camp-kpis {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }
        @media (max-width: 768px) {
          .crm-camp-kpis {
            grid-template-columns: 1fr;
          }
        }
        .crm-camp-skeleton {
          height: 14px;
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: crmPulse 1.5s infinite;
          border-radius: 4px;
        }
        @keyframes crmPulse {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "12px"
        }}
      >
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#0F172A", margin: 0 }}>
            Campaigns / Posts & Offers
          </h1>
          <p style={{ fontSize: "13px", color: "#64748B", margin: "4px 0 0 0" }}>
            Track marketing posts, offers and their commercial conversion
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: "9px 16px",
              borderRadius: "8px",
              backgroundColor: "#2563EB",
              color: "#ffffff",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)"
            }}
          >
            <Plus size={16} />
            <span>+ Create Campaign</span>
          </button>

          <button
            onClick={fetchCampaigns}
            disabled={loading}
            title="Refresh"
            style={{
              padding: "9px",
              borderRadius: "8px",
              backgroundColor: "#ffffff",
              border: "1px solid #CBD5E1",
              color: "#475569",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Disclaimer on Gateway */}
      <div
        style={{
          marginBottom: "16px",
          padding: "10px 14px",
          borderRadius: "8px",
          backgroundColor: "#F0FDF4",
          border: "1px solid #BBF7D0",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "12px",
          color: "#166534"
        }}
      >
        <Info size={16} color="#16A34A" />
        <span>
          <strong>Campaign Lifecycle Mode:</strong> Status transitions record internal dispatch states. Direct WhatsApp & Email delivery gateway dispatch requires backend gateway integration.
        </span>
      </div>

      {/* Error state with retry */}
      {error && !loading && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px 16px",
            borderRadius: "8px",
            backgroundColor: "#FEF2F2",
            border: "1px solid #FECACA",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#991B1B",
            fontSize: "13px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertCircle size={16} color="#DC2626" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchCampaigns}
            style={{
              padding: "4px 12px",
              borderRadius: "6px",
              backgroundColor: "#DC2626",
              color: "#fff",
              border: "none",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* 3 Metric Cards */}
      <div className="crm-camp-kpis">
        <div style={{ backgroundColor: "#ffffff", borderRadius: "14px", padding: "18px 20px", border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>Total Posts / Campaigns</span>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#0F172A", marginTop: "4px" }}>
            {campaigns.length}
          </div>
        </div>

        <div style={{ backgroundColor: "#ffffff", borderRadius: "14px", padding: "18px 20px", border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>Total Inquiries Logged</span>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#0F172A", marginTop: "4px" }}>
            {campaigns.reduce((sum, c) => sum + (Number(c.responses) || 0), 0)}
          </div>
        </div>

        <div style={{ backgroundColor: "#ffffff", borderRadius: "14px", padding: "18px 20px", border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>Quotes Generated</span>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#16A34A", marginTop: "4px" }}>
            {campaigns.reduce((sum, c) => sum + (Number(c.quotes) || 0), 0)}
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "center",
          marginBottom: "16px",
          flexWrap: "wrap"
        }}
      >
        <div style={{ position: "relative", minWidth: "220px", flex: "1 1 220px" }}>
          <Search size={16} color="#94A3B8" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            placeholder="Search campaign name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px 9px 36px",
              borderRadius: "8px",
              border: "1px solid #CBD5E1",
              fontSize: "13px",
              boxSizing: "border-box"
            }}
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{ padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", backgroundColor: "#fff" }}
        >
          <option value="ALL">All Types</option>
          <option value="POST">Post</option>
          <option value="OFFER">Offer</option>
          <option value="EMAIL">Email</option>
        </select>
      </div>

      {/* Table */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "14px",
          border: "1px solid #E2E8F0",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
          overflow: "hidden"
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid #E2E8F0", textAlign: "left", color: "#64748B" }}>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>CAMPAIGN / POST</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>TYPE</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>TARGET AUDIENCE</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>DATE / STATUS</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>RECIPIENTS</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>RESPONSES</th>
                <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "right" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1, 2, 3, 4].map((i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <td style={{ padding: "14px 16px" }}><div className="crm-camp-skeleton" style={{ width: "140px" }} /></td>
                    <td style={{ padding: "14px 16px" }}><div className="crm-camp-skeleton" style={{ width: "60px" }} /></td>
                    <td style={{ padding: "14px 16px" }}><div className="crm-camp-skeleton" style={{ width: "120px" }} /></td>
                    <td style={{ padding: "14px 16px" }}><div className="crm-camp-skeleton" style={{ width: "90px" }} /></td>
                    <td style={{ padding: "14px 16px" }}><div className="crm-camp-skeleton" style={{ width: "40px" }} /></td>
                    <td style={{ padding: "14px 16px" }}><div className="crm-camp-skeleton" style={{ width: "40px" }} /></td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}><div className="crm-camp-skeleton" style={{ width: "70px", marginLeft: "auto" }} /></td>
                  </tr>
                ))
              ) : filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
                    No campaigns found. Click <strong>+ Create Campaign</strong> to start.
                  </td>
                </tr>
              ) : (
                paginatedCampaigns.map((c) => {
                  const status = (c.status || "DRAFT").toUpperCase();
                  return (
                    <tr key={c.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 600, color: "#0F172A" }}>
                        {c.name || c.title || "—"}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#334155" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: "10px",
                            backgroundColor: "#F1F5F9",
                            color: "#475569"
                          }}
                        >
                          {c.type || "Post"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", color: "#64748B" }}>
                        {c.targetAudience || "All Customers"}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: 600,
                            backgroundColor:
                              status === "COMPLETED" || status === "SENT"
                                ? "#DCFCE7"
                                : status === "SCHEDULED"
                                ? "#FEF3C7"
                                : "#F1F5F9",
                            color:
                              status === "COMPLETED" || status === "SENT"
                                ? "#16A34A"
                                : status === "SCHEDULED"
                                ? "#D97706"
                                : "#475569"
                          }}
                        >
                          {c.status || "Draft"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", color: "#334155" }}>{c.recipients ?? "—"}</td>
                      <td style={{ padding: "12px 16px", color: "#334155" }}>{c.responses ?? "—"}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                          <button
                            onClick={() => setSelectedCampaign(c)}
                            style={{
                              padding: "4px 10px",
                              borderRadius: "6px",
                              backgroundColor: "#EFF6FF",
                              color: "#2563EB",
                              border: "1px solid #BFDBFE",
                              fontSize: "11px",
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            <Send size={11} />
                            <span>Dispatch / Stats</span>
                          </button>

                          {status === "DRAFT" && (
                            <button
                              onClick={() => handleSendCampaign(c.id)}
                              disabled={sendingLoading}
                              style={{
                                padding: "4px 10px",
                                borderRadius: "6px",
                                backgroundColor: "#16A34A",
                                color: "#fff",
                                border: "none",
                                fontSize: "11px",
                                fontWeight: 600,
                                cursor: sendingLoading ? "not-allowed" : "pointer"
                              }}
                            >
                              Send Now
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && filteredCampaigns.length > PAGE_SIZE && (
          <div
            style={{
              padding: "10px 16px",
              borderTop: "1px solid #E2E8F0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "#FAFBFD",
              fontSize: "12px",
              color: "#64748B"
            }}
          >
            <div>
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(filteredCampaigns.length, currentPage * PAGE_SIZE)} of {filteredCampaigns.length}
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: "4px 8px",
                  borderRadius: "4px",
                  border: "1px solid #CBD5E1",
                  backgroundColor: currentPage === 1 ? "#F1F5F9" : "#fff",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer"
                }}
              >
                <ChevronLeft size={13} />
              </button>
              <span style={{ padding: "0 6px", fontWeight: 600 }}>{currentPage} / {totalPages}</span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                style={{
                  padding: "4px 8px",
                  borderRadius: "4px",
                  border: "1px solid #CBD5E1",
                  backgroundColor: currentPage >= totalPages ? "#F1F5F9" : "#fff",
                  cursor: currentPage >= totalPages ? "not-allowed" : "pointer"
                }}
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Step 1: Create Campaign Modal */}
      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 1300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px"
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "560px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "18px 24px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>Create Campaign & Message</h3>
                <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748B" }}>
                  Configure dispatch channel, messaging template, and audience
                </p>
              </div>
              <button onClick={() => setShowCreateModal(false)} style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Campaign Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Festive Fleet Promotion 2026"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Campaign Type</label>
                  <select
                    value={newCampaign.type}
                    onChange={(e) => setNewCampaign({ ...newCampaign, type: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", backgroundColor: "#fff" }}
                  >
                    <option value="OFFER">Offer</option>
                    <option value="NEWSLETTER">Newsletter</option>
                    <option value="POST">Post</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Scheduled Date (Optional)</label>
                  <input
                    type="date"
                    value={newCampaign.scheduledDate}
                    onChange={(e) => setNewCampaign({ ...newCampaign, scheduledDate: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              {/* Channel Toggle (Radio / Pills) */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                  Delivery Channel
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                  {[
                    { id: "EMAIL", label: "✉️ Email Only" },
                    { id: "WHATSAPP", label: "💬 WhatsApp Only" },
                    { id: "BOTH", label: "🚀 Both (Email + WA)" }
                  ].map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => setNewCampaign({ ...newCampaign, channel: ch.id })}
                      style={{
                        padding: "8px 10px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: 600,
                        border: newCampaign.channel === ch.id ? "2px solid #2563EB" : "1px solid #CBD5E1",
                        backgroundColor: newCampaign.channel === ch.id ? "#EFF6FF" : "#ffffff",
                        color: newCampaign.channel === ch.id ? "#1D4ED8" : "#475569",
                        cursor: "pointer",
                        transition: "all 0.15s"
                      }}
                    >
                      {ch.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Subject / Header</label>
                <input
                  type="text"
                  placeholder="Email subject or WhatsApp alert headline"
                  value={newCampaign.subject}
                  onChange={(e) => setNewCampaign({ ...newCampaign, subject: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>Message Template</label>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={() => handleInsertTag("{{contactName}}")}
                      style={{
                        padding: "2px 8px",
                        borderRadius: "4px",
                        backgroundColor: "#F1F5F9",
                        border: "1px solid #CBD5E1",
                        fontSize: "11px",
                        color: "#2563EB",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      + Contact Name
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertTag("{{companyName}}")}
                      style={{
                        padding: "2px 8px",
                        borderRadius: "4px",
                        backgroundColor: "#F1F5F9",
                        border: "1px solid #CBD5E1",
                        fontSize: "11px",
                        color: "#2563EB",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      + Company Name
                    </button>
                  </div>
                </div>
                <textarea
                  rows={4}
                  placeholder="Hi {{contactName}}, check out our new high-density battery solutions for {{companyName}}..."
                  value={newCampaign.content}
                  onChange={(e) => setNewCampaign({ ...newCampaign, content: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                  Target Audience Segment
                </label>
                <select
                  value={newCampaign.segmentId}
                  onChange={(e) => setNewCampaign({ ...newCampaign, segmentId: e.target.value, targetAudience: e.target.selectedOptions[0]?.text })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", backgroundColor: "#fff" }}
                >
                  <option value="">-- Select Saved Audience Segment or Preset --</option>
                  {segments.map((s) => (
                    <option key={s.id} value={s.id}>
                      Saved Segment: {s.name} ({s.matchedCount ?? s.count ?? "Ready"})
                    </option>
                  ))}
                  <option value="">All Automotive / EV OEMs</option>
                  <option value="">BESS Operators & Storage</option>
                  <option value="">Solar & Renewable Integrators</option>
                  <option value="">All Leads & Contacts</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: "9px 16px", borderRadius: "8px", backgroundColor: "#fff", border: "1px solid #CBD5E1", fontSize: "13px", color: "#475569", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: "9px 20px", borderRadius: "8px", backgroundColor: "#2563EB", border: "none", fontSize: "13px", fontWeight: 600, color: "#fff", cursor: "pointer" }}
                >
                  Save Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Step 2: Campaign Detail & Live Dispatch View Modal */}
      {selectedCampaign && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 1300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px"
          }}
          onClick={() => setSelectedCampaign(null)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "840px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #E2E8F0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "#FAFBFD"
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
                    {selectedCampaign.name || selectedCampaign.title}
                  </h3>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: "10px",
                      backgroundColor: "#EFF6FF",
                      color: "#1D4ED8"
                    }}
                  >
                    {selectedCampaign.type || "CAMPAIGN"}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: "10px",
                      backgroundColor:
                        selectedCampaign.status === "COMPLETED" || selectedCampaign.status === "SENT"
                          ? "#DCFCE7"
                          : "#FEF3C7",
                      color:
                        selectedCampaign.status === "COMPLETED" || selectedCampaign.status === "SENT"
                          ? "#16A34A"
                          : "#D97706"
                    }}
                  >
                    {selectedCampaign.status || "DRAFT"}
                  </span>
                </div>
                <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#64748B" }}>
                  Channel: <strong>{selectedCampaign.channel || "Both (Email + WhatsApp)"}</strong> · Target: {selectedCampaign.targetAudience || "All Segment Contacts"}
                </p>
              </div>

              <button
                onClick={() => setSelectedCampaign(null)}
                style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Action Buttons Bar */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px",
                  padding: "14px 18px",
                  borderRadius: "12px",
                  backgroundColor: "#F8FAFC",
                  border: "1px solid #E2E8F0"
                }}
              >
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <select
                    value={attachSegmentId}
                    onChange={(e) => setAttachSegmentId(e.target.value)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid #CBD5E1",
                      fontSize: "12.5px",
                      backgroundColor: "#fff"
                    }}
                  >
                    <option value="">-- Choose Segment to Attach --</option>
                    {segments.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.matchedCount ?? "Ready"})
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleAttachSegment}
                    disabled={attachingLoading || !attachSegmentId}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "8px",
                      backgroundColor: "#ffffff",
                      border: "1px solid #CBD5E1",
                      fontSize: "12.5px",
                      fontWeight: 600,
                      color: "#334155",
                      cursor: attachingLoading || !attachSegmentId ? "not-allowed" : "pointer"
                    }}
                  >
                    {attachingLoading ? "Attaching..." : "Attach Audience Segment"}
                  </button>
                </div>

                <button
                  onClick={() => handleSendCampaign(selectedCampaign.id)}
                  disabled={sendingLoading}
                  style={{
                    padding: "9px 20px",
                    borderRadius: "8px",
                    backgroundColor: "#16A34A",
                    color: "#ffffff",
                    border: "none",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: sendingLoading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 2px 4px rgba(22, 163, 74, 0.25)"
                  }}
                >
                  <Send size={15} />
                  <span>{sendingLoading ? "Dispatching..." : "Send Campaign Now"}</span>
                </button>
              </div>

              {/* Live Stats Counters */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
                <div style={{ backgroundColor: "#F8FAFC", borderRadius: "10px", padding: "12px 14px", border: "1px solid #E2E8F0" }}>
                  <div style={{ fontSize: "11px", fontWeight: 600, color: "#64748B" }}>Total Recipients</div>
                  <div style={{ fontSize: "20px", fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>
                    {selectedCampaign.totalRecipients ?? selectedCampaign.recipients ?? recipients.length}
                  </div>
                </div>

                <div style={{ backgroundColor: "#F0FDF4", borderRadius: "10px", padding: "12px 14px", border: "1px solid #BBF7D0" }}>
                  <div style={{ fontSize: "11px", fontWeight: 600, color: "#166534" }}>Emails Sent</div>
                  <div style={{ fontSize: "20px", fontWeight: 700, color: "#16A34A", marginTop: "2px" }}>
                    {selectedCampaign.emailsSent ?? (selectedCampaign.status === "COMPLETED" ? recipients.length : 0)}
                  </div>
                </div>

                <div style={{ backgroundColor: "#F0FDF4", borderRadius: "10px", padding: "12px 14px", border: "1px solid #BBF7D0" }}>
                  <div style={{ fontSize: "11px", fontWeight: 600, color: "#166534" }}>WhatsApp Sent</div>
                  <div style={{ fontSize: "20px", fontWeight: 700, color: "#16A34A", marginTop: "2px" }}>
                    {selectedCampaign.whatsAppSent ?? (selectedCampaign.status === "COMPLETED" ? recipients.length : 0)}
                  </div>
                </div>

                <div style={{ backgroundColor: "#FEF2F2", borderRadius: "10px", padding: "12px 14px", border: "1px solid #FECACA" }}>
                  <div style={{ fontSize: "11px", fontWeight: 600, color: "#991B1B" }}>Failed</div>
                  <div style={{ fontSize: "20px", fontWeight: 700, color: "#DC2626", marginTop: "2px" }}>
                    {selectedCampaign.failedCount ?? 0}
                  </div>
                </div>
              </div>

              {/* Recipient Delivery Table */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
                    Recipient Delivery Report ({recipients.length})
                  </h4>
                  <button
                    onClick={() => fetchRecipients(selectedCampaign.id)}
                    style={{ background: "none", border: "none", color: "#2563EB", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    <RefreshCw size={12} className={recipientsLoading ? "animate-spin" : ""} />
                    <span>Refresh List</span>
                  </button>
                </div>

                <div style={{ border: "1px solid #E2E8F0", borderRadius: "10px", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid #E2E8F0", textAlign: "left", color: "#64748B" }}>
                        <th style={{ padding: "10px 12px", fontWeight: 600 }}>CONTACT NAME</th>
                        <th style={{ padding: "10px 12px", fontWeight: 600 }}>COMPANY</th>
                        <th style={{ padding: "10px 12px", fontWeight: 600 }}>EMAIL / PHONE</th>
                        <th style={{ padding: "10px 12px", fontWeight: 600 }}>CHANNEL</th>
                        <th style={{ padding: "10px 12px", fontWeight: 600 }}>STATUS</th>
                        <th style={{ padding: "10px 12px", fontWeight: 600, textAlign: "right" }}>SENT AT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recipientsLoading ? (
                        <tr>
                          <td colSpan={6} style={{ padding: "20px", textAlign: "center", color: "#64748B" }}>
                            Loading recipients report...
                          </td>
                        </tr>
                      ) : recipients.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ padding: "30px", textAlign: "center", color: "#64748B" }}>
                            No recipient list generated yet. Click <strong>"Attach Audience Segment"</strong> or <strong>"Send Campaign Now"</strong>.
                          </td>
                        </tr>
                      ) : (
                        recipients.map((r, i) => {
                          const rStatus = (r.status || "PENDING").toUpperCase();
                          return (
                            <tr key={r.id || i} style={{ borderBottom: "1px solid #F1F5F9" }}>
                              <td style={{ padding: "10px 12px", fontWeight: 600, color: "#0F172A" }}>
                                {r.contactName || r.name || "—"}
                              </td>
                              <td style={{ padding: "10px 12px", color: "#334155" }}>
                                {r.companyName || r.company || "—"}
                              </td>
                              <td style={{ padding: "10px 12px", color: "#64748B" }}>
                                {r.email || r.phone || "—"}
                              </td>
                              <td style={{ padding: "10px 12px" }}>
                                <span style={{ fontSize: "11px", fontWeight: 600, color: "#475569" }}>
                                  {r.channel || selectedCampaign.channel || "BOTH"}
                                </span>
                              </td>
                              <td style={{ padding: "10px 12px" }}>
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "2px 8px",
                                    borderRadius: "10px",
                                    fontSize: "11px",
                                    fontWeight: 600,
                                    backgroundColor:
                                      rStatus === "SENT" ? "#DCFCE7" : rStatus === "FAILED" ? "#FEE2E2" : "#F1F5F9",
                                    color:
                                      rStatus === "SENT" ? "#16A34A" : rStatus === "FAILED" ? "#DC2626" : "#64748B"
                                  }}
                                  title={r.errorMessage || ""}
                                >
                                  {rStatus}
                                </span>
                              </td>
                              <td style={{ padding: "10px 12px", textAlign: "right", color: "#64748B" }}>
                                {r.sentAt ? new Date(r.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Close Button */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
                <button
                  onClick={() => setSelectedCampaign(null)}
                  style={{
                    padding: "8px 20px",
                    borderRadius: "8px",
                    backgroundColor: "#0F172A",
                    color: "#ffffff",
                    border: "none",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
