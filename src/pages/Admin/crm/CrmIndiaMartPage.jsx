import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  RefreshCw,
  CheckCircle2,
  Search,
  Filter,
  ShieldCheck,
  Clock,
  Settings,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Info
} from "lucide-react";
import { Toast } from "../../../components/common/Toast";
import { crmService } from "../../../services/crmService";
import { LeadDetailDrawer } from "../../../components/crm/LeadDetailDrawer";

const PAGE_SIZE = 10;

export default function CrmIndiaMartPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [leads, setLeads] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLeadId, setSelectedLeadId] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  const fetchIndiaMartLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await crmService.getIndiaMartLeads();
      setLeads(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load IndiaMART leads:", err);
      setError(err.message || "Failed to load IndiaMART leads");
      showToast(err.message || "Failed to load IndiaMART leads", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchIndiaMartLeads();
  }, [fetchIndiaMartLeads]);

  // Honest on-demand sync handler
  const handleSyncNow = () => {
    showToast(
      "Backend Required: On-demand polling API (/api/crm/indiamart/sync) is not implemented on the server. The backend ingests IndiaMART inquiries asynchronously via POST /api/webhooks/indiamart.",
      "info"
    );
  };

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (l.name || l.contactName || l.contactPerson || "").toLowerCase().includes(q) ||
        (l.company || l.companyName || "").toLowerCase().includes(q) ||
        (l.phone || l.contactPhone || "").includes(q) ||
        (l.product || l.requirement || "").toLowerCase().includes(q)
      );
    });
  }, [leads, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.ceil(filteredLeads.length / PAGE_SIZE) || 1;
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredLeads.slice(start, start + PAGE_SIZE);
  }, [filteredLeads, currentPage]);

  return (
    <div style={{ maxWidth: "1480px", margin: "0 auto", padding: "16px 20px" }}>
      <style>{`
        .crm-im-kpis {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 20px;
        }
        @media (max-width: 992px) {
          .crm-im-kpis {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 480px) {
          .crm-im-kpis {
            grid-template-columns: 1fr;
          }
        }
        .crm-im-skeleton {
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
            IndiaMART Lead Capture
          </h1>
          <p style={{ fontSize: "13px", color: "#64748B", margin: "4px 0 0 0" }}>
            Inquiry ingestion, mapping, assignment and live directory
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={fetchIndiaMartLeads}
            disabled={loading}
            title="Refresh Inquiries"
            style={{
              padding: "9px 14px",
              borderRadius: "8px",
              backgroundColor: "#ffffff",
              border: "1px solid #CBD5E1",
              fontSize: "13px",
              fontWeight: 600,
              color: "#475569",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleSyncNow}
            title="Backend API required for on-demand pull sync"
            style={{
              padding: "9px 18px",
              borderRadius: "8px",
              backgroundColor: "#F8FAFC",
              border: "1px dashed #CBD5E1",
              color: "#64748B",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <RefreshCw size={14} />
            <span>Sync Now (Backend Req.)</span>
          </button>
        </div>
      </div>

      {/* Ingestion status notice */}
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
          <strong>Live Webhook Ingestion:</strong> IndiaMART pushes new inquiries asynchronously to <code>/api/webhooks/indiamart</code>. Inquiries appear in this directory automatically upon webhook receipt.
        </span>
      </div>

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
            onClick={fetchIndiaMartLeads}
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

      {/* 4 Status KPI Cards */}
      <div className="crm-im-kpis">
        <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", padding: "18px 20px", border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>Webhook Endpoint</span>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "#0F172A", marginTop: "4px" }}>
            /api/webhooks/indiamart
          </div>
          <span style={{ fontSize: "11px", color: "#64748B", marginTop: "2px", display: "block" }}>
            Configured on backend
          </span>
        </div>

        <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", padding: "18px 20px", border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>Inquiries Ingested</span>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#2563EB", marginTop: "4px" }}>
            {leads.length}
          </div>
          <span style={{ fontSize: "11px", color: "#64748B", marginTop: "2px", display: "block" }}>
            Total IndiaMART leads in CRM
          </span>
        </div>

        <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", padding: "18px 20px", border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>Auto-Assignment</span>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "#0F172A", marginTop: "4px" }}>
            Round-Robin / Admin
          </div>
          <span style={{ fontSize: "11px", color: "#64748B", marginTop: "2px", display: "block" }}>
            Active assignment rule
          </span>
        </div>

        <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", padding: "18px 20px", border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>Deduplication</span>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "#0F172A", marginTop: "4px" }}>
            Phone + Email
          </div>
          <span style={{ fontSize: "11px", color: "#64748B", marginTop: "2px", display: "block" }}>
            Duplicate match key
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: "16px", position: "relative", maxWidth: "360px" }}>
        <Search size={15} color="#94A3B8" style={{ position: "absolute", left: "10px", top: "10px" }} />
        <input
          type="text"
          placeholder="Search by buyer, company, phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 12px 8px 32px",
            borderRadius: "8px",
            border: "1px solid #CBD5E1",
            fontSize: "13px",
            boxSizing: "border-box"
          }}
        />
      </div>

      {/* IndiaMART Leads Table */}
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
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>BUYER NAME</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>COMPANY</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>PHONE</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>PRODUCT INQUIRY</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>LOCATION</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>ASSIGNED TO</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>DATE</th>
                <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "right" }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1, 2, 3, 4].map((i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <td style={{ padding: "14px 16px" }}><div className="crm-im-skeleton" style={{ width: "110px" }} /></td>
                    <td style={{ padding: "14px 16px" }}><div className="crm-im-skeleton" style={{ width: "130px" }} /></td>
                    <td style={{ padding: "14px 16px" }}><div className="crm-im-skeleton" style={{ width: "90px" }} /></td>
                    <td style={{ padding: "14px 16px" }}><div className="crm-im-skeleton" style={{ width: "150px" }} /></td>
                    <td style={{ padding: "14px 16px" }}><div className="crm-im-skeleton" style={{ width: "70px" }} /></td>
                    <td style={{ padding: "14px 16px" }}><div className="crm-im-skeleton" style={{ width: "80px" }} /></td>
                    <td style={{ padding: "14px 16px" }}><div className="crm-im-skeleton" style={{ width: "70px" }} /></td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}><div className="crm-im-skeleton" style={{ width: "45px", marginLeft: "auto" }} /></td>
                  </tr>
                ))
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
                    No IndiaMART inquiries found in the CRM.
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((lead) => (
                  <tr key={lead.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 600, color: "#0F172A" }}>
                      {lead.name || lead.contactPerson || lead.contactName || lead.title || "—"}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#334155" }}>
                      {lead.company || lead.companyName || "—"}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#334155" }}>
                      {lead.phone || lead.contactPhone || "—"}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#334155" }}>
                      {lead.product || lead.requirement || lead.subject || "IndiaMART Inquiry"}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#64748B" }}>
                      {lead.city || lead.location || "—"}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#334155" }}>
                      {lead.assignedTo || lead.ownerAdminName || "Unassigned"}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#64748B" }}>
                      {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short' }) : "—"}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <button
                        onClick={() => setSelectedLeadId(lead.id)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: "6px",
                          backgroundColor: "#F1F5F9",
                          color: "#2563EB",
                          border: "1px solid #CBD5E1",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer"
                        }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && filteredLeads.length > PAGE_SIZE && (
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
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(filteredLeads.length, currentPage * PAGE_SIZE)} of {filteredLeads.length}
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
              <span style={{ padding: "0 6px", lineHeight: "26px", fontWeight: 600 }}>{currentPage} / {totalPages}</span>
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

      {/* Slide-over Lead Detail Drawer */}
      {selectedLeadId && (
        <LeadDetailDrawer
          leadId={selectedLeadId}
          isOpen={!!selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
          onLeadUpdated={fetchIndiaMartLeads}
          showToast={showToast}
        />
      )}
    </div>
  );
}
