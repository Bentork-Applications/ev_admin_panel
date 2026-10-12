import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  RefreshCw,
  Filter,
  Download,
  Upload,
  UserCheck,
  Tag,
  Eye,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import { crmService } from "../../../services/crmService";
import { Toast } from "../../../components/common/Toast";
import { LeadStatusBadge } from "../../../components/crm/CrmBadge";
import { LeadDetailDrawer } from "../../../components/crm/LeadDetailDrawer";

const SUB_VIEWS = [
  { id: "all", label: "All leads" },
  { id: "my", label: "My leads" },
  { id: "indiamart", label: "IndiaMART" },
  { id: "unassigned", label: "Unassigned" },
  { id: "duplicates", label: "Duplicates" }
];

const PAGE_SIZE = 15;

export default function CrmLeadsPage() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Sub-view toggle
  const [activeSubView, setActiveSubView] = useState("all");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [industryFilter, setIndustryFilter] = useState("ALL");
  const [ownerFilter, setOwnerFilter] = useState("ALL");
  const [locationFilter, setLocationFilter] = useState("ALL");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Selection
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals & Drawers
  const [selectedLeadId, setSelectedLeadId] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data = [];
      if (activeSubView === "my") {
        data = await crmService.getMyLeads();
      } else {
        data = await crmService.getAllLeads();
      }

      let arr = Array.isArray(data) ? data : [];
      if (activeSubView === "indiamart") {
        arr = arr.filter((l) => (l.source || "").toLowerCase().includes("indiamart"));
      } else if (activeSubView === "unassigned") {
        arr = arr.filter((l) => !l.ownerAdminName && !l.assignedTo);
      } else if (activeSubView === "duplicates") {
        const phoneMap = {};
        const dupIds = new Set();
        arr.forEach((l) => {
          const ph = (l.contactPhone || l.phone || "").trim();
          if (ph) {
            if (phoneMap[ph]) {
              dupIds.add(l.id);
              dupIds.add(phoneMap[ph]);
            } else {
              phoneMap[ph] = l.id;
            }
          }
        });
        arr = arr.filter((l) => dupIds.has(l.id));
      }

      setLeads(arr);
    } catch (err) {
      console.error("Failed to load leads:", err);
      setError(err.message || "Failed to load leads");
      showToast(err.message || "Failed to load leads", "error");
    } finally {
      setLoading(false);
    }
  }, [activeSubView, showToast]);

  useEffect(() => {
    fetchLeads();
    setCurrentPage(1);
    setSelectedIds([]);
  }, [fetchLeads]);

  // Dynamically derived filter options from real data (no hardcoding)
  const sources = useMemo(() => ["ALL", ...new Set(leads.map((l) => l.source).filter(Boolean))], [leads]);
  const statuses = useMemo(() => ["ALL", ...new Set(leads.map((l) => l.status).filter(Boolean))], [leads]);
  const locations = useMemo(() => ["ALL", ...new Set(leads.map((l) => l.city).filter(Boolean))], [leads]);
  const industries = useMemo(() => ["ALL", ...new Set(leads.map((l) => l.industry).filter(Boolean))], [leads]);
  const owners = useMemo(() => ["ALL", ...new Set(leads.map((l) => l.ownerAdminName || l.assignedTo).filter(Boolean))], [leads]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (sourceFilter !== "ALL" && (lead.source || "").toUpperCase() !== sourceFilter.toUpperCase()) {
        return false;
      }
      if (statusFilter !== "ALL" && (lead.status || "").toUpperCase() !== statusFilter.toUpperCase()) {
        return false;
      }
      if (locationFilter !== "ALL" && (lead.city || "").toUpperCase() !== locationFilter.toUpperCase()) {
        return false;
      }
      if (industryFilter !== "ALL" && (lead.industry || "").toUpperCase() !== industryFilter.toUpperCase()) {
        return false;
      }
      if (ownerFilter !== "ALL") {
        const leadOwner = lead.ownerAdminName || lead.assignedTo || "";
        if (leadOwner.toUpperCase() !== ownerFilter.toUpperCase()) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (lead.title || "").toLowerCase().includes(q);
        const matchName = (lead.contactName || "").toLowerCase().includes(q);
        const matchComp = (lead.companyName || "").toLowerCase().includes(q);
        const matchPhone = (lead.contactPhone || "").toLowerCase().includes(q);
        if (!matchTitle && !matchName && !matchComp && !matchPhone) return false;
      }
      return true;
    });
  }, [leads, sourceFilter, statusFilter, locationFilter, industryFilter, ownerFilter, searchQuery]);

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sourceFilter, statusFilter, locationFilter, industryFilter, ownerFilter]);

  // Paginated subset
  const totalPages = Math.ceil(filteredLeads.length / PAGE_SIZE) || 1;
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredLeads.slice(start, start + PAGE_SIZE);
  }, [filteredLeads, currentPage]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredLeads.length && filteredLeads.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredLeads.map((l) => l.id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  // Real client-side CSV export of filtered or selected leads
  const handleExportCSV = () => {
    const toExport = selectedIds.length > 0
      ? filteredLeads.filter((l) => selectedIds.includes(l.id))
      : filteredLeads;

    if (toExport.length === 0) {
      showToast("No leads available to export", "error");
      return;
    }

    const headers = ["ID", "Name", "Company", "Phone", "Email", "Source", "Status", "Owner", "City", "Industry", "Created"];
    const rows = toExport.map((l) => [
      l.id ?? "",
      `"${(l.contactName || l.title || "").replace(/"/g, '""')}"`,
      `"${(l.companyName || "").replace(/"/g, '""')}"`,
      `"${(l.contactPhone || "").replace(/"/g, '""')}"`,
      `"${(l.contactEmail || "").replace(/"/g, '""')}"`,
      `"${(l.source || "").replace(/"/g, '""')}"`,
      `"${(l.status || "").replace(/"/g, '""')}"`,
      `"${(l.ownerAdminName || l.assignedTo || "").replace(/"/g, '""')}"`,
      `"${(l.city || "").replace(/"/g, '""')}"`,
      `"${(l.industry || "").replace(/"/g, '""')}"`,
      `"${(l.createdAt || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bentork_leads_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${toExport.length} lead(s) to CSV successfully`, "success");
  };

  const handleBackendRequiredAction = (actionName) => {
    showToast(`Backend Required: ${actionName} endpoint is pending server implementation`, "info");
  };

  return (
    <div style={{ maxWidth: "1480px", margin: "0 auto", padding: "16px 20px" }}>
      <style>{`
        .crm-lead-filter-grid {
          display: flex;
          gap: 10px;
          align-items: center;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        .crm-lead-filter-grid select,
        .crm-lead-filter-grid input {
          box-sizing: border-box;
          border-radius: 8px;
          border: 1px solid #CBD5E1;
          font-size: 13px;
        }
        .crm-skeleton-row td {
          padding: 16px 14px;
        }
        .crm-skeleton-box {
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
          alignItems: "flex-start",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "12px"
        }}
      >
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#0F172A", margin: 0 }}>
            Leads
          </h1>
          {/* Subtabs text row */}
          <div style={{ display: "flex", gap: "8px", marginTop: "4px", fontSize: "13px", color: "#64748B", flexWrap: "wrap" }}>
            {SUB_VIEWS.map((sv, idx) => (
              <React.Fragment key={sv.id}>
                <span
                  onClick={() => setActiveSubView(sv.id)}
                  style={{
                    cursor: "pointer",
                    color: activeSubView === sv.id ? "#2563EB" : "#64748B",
                    fontWeight: activeSubView === sv.id ? 700 : 500,
                    textDecoration: activeSubView === sv.id ? "underline" : "none"
                  }}
                >
                  {sv.label}
                </span>
                {idx < SUB_VIEWS.length - 1 && <span>·</span>}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={() => navigate("/dashboard/crm/new-call")}
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
            <span>+ Add Lead / New Call</span>
          </button>

          <button
            onClick={fetchLeads}
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

      {/* Error banner with retry */}
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
            onClick={fetchLeads}
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

      {/* Filter Row with Dynamic Dropdowns */}
      <div className="crm-lead-filter-grid">
        <div style={{ position: "relative", minWidth: "220px", flex: 1 }}>
          <Search size={15} color="#94A3B8" style={{ position: "absolute", left: "10px", top: "11px" }} />
          <input
            type="text"
            placeholder="Search name, company, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: "100%", padding: "9px 12px 9px 34px" }}
          />
        </div>

        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          style={{ padding: "9px 12px", backgroundColor: "#fff" }}
        >
          <option value="ALL">All Sources</option>
          {sources.filter((s) => s !== "ALL").map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: "9px 12px", backgroundColor: "#fff" }}
        >
          <option value="ALL">All Status</option>
          {statuses.filter((s) => s !== "ALL").map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={industryFilter}
          onChange={(e) => setIndustryFilter(e.target.value)}
          style={{ padding: "9px 12px", backgroundColor: "#fff" }}
        >
          <option value="ALL">All Industries</option>
          {industries.filter((i) => i !== "ALL").map((ind) => (
            <option key={ind} value={ind}>{ind}</option>
          ))}
        </select>

        <select
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          style={{ padding: "9px 12px", backgroundColor: "#fff" }}
        >
          <option value="ALL">All Owners</option>
          {owners.filter((o) => o !== "ALL").map((owner) => (
            <option key={owner} value={owner}>{owner}</option>
          ))}
        </select>

        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          style={{ padding: "9px 12px", backgroundColor: "#fff" }}
        >
          <option value="ALL">All Locations</option>
          {locations.filter((l) => l !== "ALL").map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </div>

      {/* Action Bar Buttons */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          alignItems: "center",
          marginBottom: "16px",
          flexWrap: "wrap"
        }}
      >
        <button
          onClick={handleExportCSV}
          style={{
            padding: "6px 12px",
            borderRadius: "6px",
            backgroundColor: "#ffffff",
            border: "1px solid #CBD5E1",
            fontSize: "12px",
            fontWeight: 600,
            color: "#334155",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "5px"
          }}
        >
          <Download size={13} />
          <span>Export {selectedIds.length > 0 ? `(${selectedIds.length})` : "All"} to CSV</span>
        </button>

        <button
          onClick={() => handleBackendRequiredAction("Bulk Assign")}
          title="Backend API required for bulk lead owner assignment"
          style={{
            padding: "6px 12px",
            borderRadius: "6px",
            backgroundColor: "#F8FAFC",
            border: "1px dashed #CBD5E1",
            fontSize: "12px",
            fontWeight: 500,
            color: "#64748B",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "5px"
          }}
        >
          <UserCheck size={13} />
          <span>Assign (Backend Req.)</span>
        </button>

        <button
          onClick={() => handleBackendRequiredAction("Bulk Tag")}
          title="Backend API required for bulk tagging"
          style={{
            padding: "6px 12px",
            borderRadius: "6px",
            backgroundColor: "#F8FAFC",
            border: "1px dashed #CBD5E1",
            fontSize: "12px",
            fontWeight: 500,
            color: "#64748B",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "5px"
          }}
        >
          <Tag size={13} />
          <span>Bulk Tag (Backend Req.)</span>
        </button>

        <button
          onClick={() => handleBackendRequiredAction("Import Leads")}
          title="Backend API required for CSV file ingestion"
          style={{
            padding: "6px 12px",
            borderRadius: "6px",
            backgroundColor: "#F8FAFC",
            border: "1px dashed #CBD5E1",
            fontSize: "12px",
            fontWeight: 500,
            color: "#64748B",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "5px"
          }}
        >
          <Upload size={13} />
          <span>Import CSV (Backend Req.)</span>
        </button>

        {selectedIds.length > 0 && (
          <span style={{ fontSize: "12px", color: "#2563EB", fontWeight: 600, marginLeft: "auto" }}>
            {selectedIds.length} lead(s) selected
          </span>
        )}
      </div>

      {/* Leads Table */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          border: "1px solid #E2E8F0",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
          overflow: "hidden"
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid #E2E8F0", textAlign: "left", color: "#64748B" }}>
                <th style={{ padding: "12px 14px", width: "30px" }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === filteredLeads.length}
                    onChange={toggleSelectAll}
                    style={{ cursor: "pointer" }}
                  />
                </th>
                <th style={{ padding: "12px 14px", fontWeight: 600 }}>NAME</th>
                <th style={{ padding: "12px 14px", fontWeight: 600 }}>COMPANY</th>
                <th style={{ padding: "12px 14px", fontWeight: 600 }}>PHONE</th>
                <th style={{ padding: "12px 14px", fontWeight: 600 }}>SOURCE</th>
                <th style={{ padding: "12px 14px", fontWeight: 600 }}>STATUS</th>
                <th style={{ padding: "12px 14px", fontWeight: 600 }}>OWNER</th>
                <th style={{ padding: "12px 14px", fontWeight: 600 }}>LOCATION</th>
                <th style={{ padding: "12px 14px", fontWeight: 600 }}>CREATED</th>
                <th style={{ padding: "12px 14px", fontWeight: 600, textAlign: "right" }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1, 2, 3, 4, 5].map((idx) => (
                  <tr key={idx} className="crm-skeleton-row" style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <td><div className="crm-skeleton-box" style={{ width: "16px" }} /></td>
                    <td><div className="crm-skeleton-box" style={{ width: "110px" }} /></td>
                    <td><div className="crm-skeleton-box" style={{ width: "130px" }} /></td>
                    <td><div className="crm-skeleton-box" style={{ width: "90px" }} /></td>
                    <td><div className="crm-skeleton-box" style={{ width: "70px" }} /></td>
                    <td><div className="crm-skeleton-box" style={{ width: "80px" }} /></td>
                    <td><div className="crm-skeleton-box" style={{ width: "80px" }} /></td>
                    <td><div className="crm-skeleton-box" style={{ width: "60px" }} /></td>
                    <td><div className="crm-skeleton-box" style={{ width: "70px" }} /></td>
                    <td style={{ textAlign: "right" }}><div className="crm-skeleton-box" style={{ width: "45px", marginLeft: "auto" }} /></td>
                  </tr>
                ))
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: "60px 20px", textAlign: "center", color: "#64748B" }}>
                    <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
                      No leads found
                    </h3>
                    <p style={{ margin: "0 0 16px 0", fontSize: "13px" }}>
                      Try adjusting your search criteria or add a new lead.
                    </p>
                    <button
                      onClick={() => navigate("/dashboard/crm/new-call")}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "8px",
                        backgroundColor: "#2563EB",
                        color: "#ffffff",
                        border: "none",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      + Add Lead
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    style={{ borderBottom: "1px solid #F1F5F9", transition: "background-color 0.15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F8FAFC")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <td style={{ padding: "12px 14px" }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(lead.id)}
                        onChange={() => toggleSelectOne(lead.id)}
                        style={{ cursor: "pointer" }}
                      />
                    </td>
                    <td style={{ padding: "12px 14px", fontWeight: 600, color: "#0F172A" }}>
                      {lead.contactName || lead.title || "—"}
                    </td>
                    <td style={{ padding: "12px 14px", color: "#334155" }}>
                      {lead.companyName || "—"}
                    </td>
                    <td style={{ padding: "12px 14px", color: "#334155" }}>
                      {lead.contactPhone || "—"}
                    </td>
                    <td style={{ padding: "12px 14px", color: "#64748B", textTransform: "capitalize" }}>
                      {lead.source?.replace("_", " ") || "—"}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <LeadStatusBadge status={lead.status || "NEW"} />
                    </td>
                    <td style={{ padding: "12px 14px", color: "#334155" }}>
                      {lead.ownerAdminName || lead.assignedTo || "—"}
                    </td>
                    <td style={{ padding: "12px 14px", color: "#64748B" }}>
                      {lead.city || "—"}
                    </td>
                    <td style={{ padding: "12px 14px", color: "#64748B" }}>
                      {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short' }) : "—"}
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "right" }}>
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

        {/* Frontend Pagination Footer */}
        {!loading && filteredLeads.length > 0 && (
          <div
            style={{
              padding: "12px 18px",
              borderTop: "1px solid #E2E8F0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px",
              backgroundColor: "#FAFBFD",
              fontSize: "12px",
              color: "#64748B"
            }}
          >
            <div>
              Showing {Math.min(filteredLeads.length, (currentPage - 1) * PAGE_SIZE + 1)} to{" "}
              {Math.min(filteredLeads.length, currentPage * PAGE_SIZE)} of {filteredLeads.length} leads
            </div>

            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: "5px 10px",
                  borderRadius: "6px",
                  border: "1px solid #CBD5E1",
                  backgroundColor: currentPage === 1 ? "#F1F5F9" : "#ffffff",
                  color: currentPage === 1 ? "#94A3B8" : "#334155",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "3px"
                }}
              >
                <ChevronLeft size={14} />
                <span>Prev</span>
              </button>

              <span style={{ padding: "0 8px", fontWeight: 600, color: "#0F172A" }}>
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                style={{
                  padding: "5px 10px",
                  borderRadius: "6px",
                  border: "1px solid #CBD5E1",
                  backgroundColor: currentPage >= totalPages ? "#F1F5F9" : "#ffffff",
                  color: currentPage >= totalPages ? "#94A3B8" : "#334155",
                  cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "3px"
                }}
              >
                <span>Next</span>
                <ChevronRight size={14} />
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
          onLeadUpdated={fetchLeads}
          showToast={showToast}
        />
      )}
    </div>
  );
}
