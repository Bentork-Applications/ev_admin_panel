import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FileText,
  Plus,
  RefreshCw,
  Search,
  Eye,
  Send,
  CheckCircle2,
  XCircle,
  Building,
  DollarSign,
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import { crmService } from "../../../services/crmService";
import { Toast } from "../../../components/common/Toast";
import { QuotationBuilderModal } from "../../../components/crm/QuotationBuilderModal";
import { QuotationDetailModal } from "../../../components/crm/QuotationDetailModal";

const TABS = [
  { id: "ALL", label: "All" },
  { id: "DRAFT", label: "Draft" },
  { id: "APPROVAL", label: "Approval" },
  { id: "SENT", label: "Sent" },
  { id: "NEGOTIATION", label: "Negotiation" },
  { id: "ACCEPTED", label: "Accepted" }
];

const PAGE_SIZE = 10;

export default function CrmQuotationsPage() {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [toast, setToast] = useState(null);

  // Modals
  const [showBuilderModal, setShowBuilderModal] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const allCompanies = await crmService.getAllCompanies().catch(() => []);
      const companyPromises = (Array.isArray(allCompanies) ? allCompanies : []).map((comp) =>
        crmService.getCompany360(comp.id).catch(() => ({ quotations: [] }))
      );

      const responses = await Promise.all(companyPromises);
      const allQuotes = responses.flatMap((res) => res.quotations || []);

      const quoteMap = new Map();
      allQuotes.forEach((q) => {
        if (q && q.id) quoteMap.set(q.id, q);
      });

      const list = Array.from(quoteMap.values());
      setQuotations(list);
    } catch (err) {
      console.error("Failed to load quotations:", err);
      setError(err.message || "Failed to load quotations");
      showToast(err.message || "Failed to load quotations", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const filteredQuotes = useMemo(() => {
    return quotations.filter((q) => {
      if (activeTab !== "ALL" && (q.status || "").toUpperCase() !== activeTab) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchQuoteNo = (q.quoteNumber || "").toLowerCase().includes(query);
        const matchComp = (q.companyName || "").toLowerCase().includes(query);
        const matchOpp = (q.opportunityTitle || "").toLowerCase().includes(query);
        if (!matchQuoteNo && !matchComp && !matchOpp) return false;
      }
      return true;
    });
  }, [quotations, activeTab, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  const totalPages = Math.ceil(filteredQuotes.length / PAGE_SIZE) || 1;
  const paginatedQuotes = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredQuotes.slice(start, start + PAGE_SIZE);
  }, [filteredQuotes, currentPage]);

  return (
    <div style={{ maxWidth: "1480px", margin: "0 auto", padding: "16px 20px" }}>
      <style>{`
        .crm-quote-skeleton {
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
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px"
        }}
      >
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#0F172A", margin: 0 }}>
            Quotations
          </h1>
          <p style={{ fontSize: "13px", color: "#64748B", margin: "4px 0 0 0" }}>
            Create, revise, approve and track commercial proposals
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={() => setShowBuilderModal(true)}
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
            <span>+ New Quotation</span>
          </button>

          <button
            onClick={fetchQuotations}
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
            onClick={fetchQuotations}
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

      {/* Search and Tabs Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "16px"
        }}
      >
        {/* Tabs */}
        <div style={{ display: "flex", gap: "6px", borderBottom: "1px solid #E2E8F0", flexWrap: "wrap" }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "8px 14px",
                border: "none",
                background: "transparent",
                borderBottom: activeTab === tab.id ? "2px solid #2563EB" : "2px solid transparent",
                color: activeTab === tab.id ? "#2563EB" : "#64748B",
                fontSize: "13px",
                fontWeight: activeTab === tab.id ? 700 : 500,
                cursor: "pointer"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div style={{ position: "relative", minWidth: "240px" }}>
          <Search size={15} color="#94A3B8" style={{ position: "absolute", left: "10px", top: "10px" }} />
          <input
            type="text"
            placeholder="Search quote#, company, opp..."
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
      </div>

      {/* Quotations Table */}
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
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>QUOTE</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>COMPANY</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>OPPORTUNITY</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>VALUE</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>VERSION</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>STATUS</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>VALIDITY</th>
                <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "right" }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1, 2, 3, 4].map((i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <td style={{ padding: "14px 16px" }}><div className="crm-quote-skeleton" style={{ width: "80px" }} /></td>
                    <td style={{ padding: "14px 16px" }}><div className="crm-quote-skeleton" style={{ width: "120px" }} /></td>
                    <td style={{ padding: "14px 16px" }}><div className="crm-quote-skeleton" style={{ width: "140px" }} /></td>
                    <td style={{ padding: "14px 16px" }}><div className="crm-quote-skeleton" style={{ width: "70px" }} /></td>
                    <td style={{ padding: "14px 16px" }}><div className="crm-quote-skeleton" style={{ width: "30px" }} /></td>
                    <td style={{ padding: "14px 16px" }}><div className="crm-quote-skeleton" style={{ width: "60px" }} /></td>
                    <td style={{ padding: "14px 16px" }}><div className="crm-quote-skeleton" style={{ width: "70px" }} /></td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}><div className="crm-quote-skeleton" style={{ width: "45px", marginLeft: "auto" }} /></td>
                  </tr>
                ))
              ) : filteredQuotes.length > 0 ? (
                paginatedQuotes.map((q) => (
                  <tr key={q.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 700, color: "#2563EB" }}>
                      {q.quoteNumber || `Q-${q.id}`}
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: 600, color: "#0F172A" }}>
                      {q.companyName || q.customerName || "—"}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#334155" }}>
                      {q.opportunityTitle || "—"}
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: 600, color: "#0F172A" }}>
                      ₹{(q.finalAmount ?? q.totalAmount ?? 0).toLocaleString("en-IN")}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#64748B" }}>
                      {q.version || "v1"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: "12px",
                          backgroundColor:
                            (q.status || "").toUpperCase() === "ACCEPTED"
                              ? "#DCFCE7"
                              : (q.status || "").toUpperCase() === "SENT"
                              ? "#DBEAFE"
                              : "#FEF3C7",
                          color:
                            (q.status || "").toUpperCase() === "ACCEPTED"
                              ? "#16A34A"
                              : (q.status || "").toUpperCase() === "SENT"
                              ? "#2563EB"
                              : "#D97706"
                        }}
                      >
                        {q.status || "Draft"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#64748B" }}>
                      {q.validUntil || "—"}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <button
                        onClick={() => setSelectedQuoteId(q.id)}
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
                        Open
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
                    No quotations found for this criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && filteredQuotes.length > PAGE_SIZE && (
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
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(filteredQuotes.length, currentPage * PAGE_SIZE)} of {filteredQuotes.length}
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

      {/* Quotation Detail Modal */}
      {selectedQuoteId && (
        <QuotationDetailModal
          isOpen={!!selectedQuoteId}
          onClose={() => setSelectedQuoteId(null)}
          quotationId={selectedQuoteId}
          onStatusUpdated={() => {
            fetchQuotations();
            setSelectedQuoteId(null);
          }}
          showToast={showToast}
        />
      )}

      {/* Quotation Builder Modal */}
      {showBuilderModal && (
        <QuotationBuilderModal
          isOpen={showBuilderModal}
          onClose={() => setShowBuilderModal(false)}
          onQuotationCreated={() => {
            fetchQuotations();
            setShowBuilderModal(false);
            showToast("Quotation created successfully", "success");
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
}
