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
  Info
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

  const [newCampaign, setNewCampaign] = useState({
    name: "",
    type: "Post",
    targetAudience: "All Automotive / EV",
    scheduledDate: "",
    content: "",
    description: ""
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

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

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
        targetAudience: newCampaign.targetAudience,
        scheduledDate: newCampaign.scheduledDate || null,
        description: newCampaign.description || newCampaign.content,
        content: newCampaign.content,
        status: newCampaign.scheduledDate ? "SCHEDULED" : "DRAFT"
      };

      const res = await crmService.createCampaign(payload);
      const createdItem =
        res && typeof res === "object" && res.id
          ? res
          : {
              id: Date.now(),
              name: newCampaign.name,
              type: newCampaign.type,
              targetAudience: newCampaign.targetAudience,
              date: newCampaign.scheduledDate || "Draft",
              recipients: "0",
              responses: "0",
              quotes: "0",
              status: newCampaign.scheduledDate ? "SCHEDULED" : "DRAFT"
            };

      setCampaigns((prev) => [createdItem, ...prev]);
      showToast("Campaign created successfully", "success");
      setShowCreateModal(false);
      setNewCampaign({
        name: "",
        type: "Post",
        targetAudience: "All Automotive / EV",
        scheduledDate: "",
        content: "",
        description: ""
      });
    } catch (err) {
      console.error("Failed to create campaign:", err);
      showToast(err.message || "Failed to create campaign", "error");
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await crmService.updateCampaignStatus(id, newStatus);
      setCampaigns((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
      );
      showToast(`Campaign status recorded as ${newStatus}`, "success");
    } catch (err) {
      showToast(err.message || "Failed to update campaign status", "error");
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
                        {status === "DRAFT" ? (
                          <button
                            onClick={() => handleStatusUpdate(c.id, "SENT")}
                            style={{
                              padding: "4px 10px",
                              borderRadius: "6px",
                              backgroundColor: "#2563EB",
                              color: "#fff",
                              border: "none",
                              fontSize: "11px",
                              fontWeight: 600,
                              cursor: "pointer"
                            }}
                          >
                            Mark Sent
                          </button>
                        ) : (
                          <span style={{ fontSize: "11px", color: "#94A3B8" }}>Dispatched</span>
                        )}
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

      {/* Create Campaign Modal */}
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
              maxWidth: "520px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>Create Campaign / Post</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Campaign Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 72V 100Ah High-Performance Launch"
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
                    <option value="Post">Post</option>
                    <option value="Offer">Offer</option>
                    <option value="Email">Email</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Scheduled Date</label>
                  <input
                    type="date"
                    value={newCampaign.scheduledDate}
                    onChange={(e) => setNewCampaign({ ...newCampaign, scheduledDate: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Target Audience Segment</label>
                <select
                  value={newCampaign.targetAudience}
                  onChange={(e) => setNewCampaign({ ...newCampaign, targetAudience: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", backgroundColor: "#fff" }}
                >
                  <option value="All Automotive / EV">All Automotive / EV OEMs</option>
                  <option value="BESS Operators">BESS Operators & Storage</option>
                  <option value="Solar Integrators">Solar & Renewable Integrators</option>
                  <option value="All Leads & Customers">All Leads & Customers</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Campaign Content / Note</label>
                <textarea
                  rows={3}
                  placeholder="Marketing copy, key specifications, promo message..."
                  value={newCampaign.content}
                  onChange={(e) => setNewCampaign({ ...newCampaign, content: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "6px" }}>
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
    </div>
  );
}
