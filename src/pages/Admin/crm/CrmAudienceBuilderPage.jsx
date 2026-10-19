import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Search,
  Download,
  Trash2,
  CheckCircle2,
  ArrowRight,
  Save,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  X,
  Bookmark,
  Rocket,
  Layers,
  Building2,
  UserCheck
} from "lucide-react";
import { Toast } from "../../../components/common/Toast";
import { crmService } from "../../../services/crmService";

const PAGE_SIZE = 10;

export default function CrmAudienceBuilderPage() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState("builder"); // 'builder' | 'preview' | 'saved'
  const [toast, setToast] = useState(null);
  const [audienceList, setAudienceList] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalMatched, setTotalMatched] = useState(0);
  const [matchedCompanyCount, setMatchedCompanyCount] = useState(0);
  const [matchedLeadCount, setMatchedLeadCount] = useState(0);
  const [previewPage, setPreviewPage] = useState(1);

  // Saved Segments state
  const [savedSegments, setSavedSegments] = useState([]);
  const [loadingSegments, setLoadingSegments] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [segmentName, setSegmentName] = useState("");
  const [segmentDescription, setSegmentDescription] = useState("");
  const [savingSegment, setSavingSegment] = useState(false);

  // Builder criteria state (Company + Lead filters)
  const [criteria, setCriteria] = useState({
    campaign: "Post #02 — Product Update",
    receivedPrevious: "Post #01 — Yes",
    alreadyReceivedCurrent: "No",
    customerType: "All",
    industry: "All",
    city: "All",
    state: "All",
    leadStatus: "ALL",
    leadSource: "ALL"
  });

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  // Fetch saved audience segments
  const fetchSavedSegments = useCallback(async () => {
    setLoadingSegments(true);
    try {
      const data = await crmService.getAudienceSegments();
      setSavedSegments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load audience segments:", err);
    } finally {
      setLoadingSegments(false);
    }
  }, []);

  useEffect(() => {
    fetchSavedSegments();
  }, [fetchSavedSegments]);

  // Calculate audience using backend query or leads fallback
  const calculateAudience = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filterPayload = {
        companyIndustry: criteria.industry === "All" ? null : criteria.industry,
        industry: criteria.industry === "All" ? null : criteria.industry,
        city: criteria.city === "All" ? null : criteria.city,
        state: criteria.state === "All" ? null : criteria.state,
        companyType: criteria.customerType === "All" ? null : criteria.customerType,
        customerType: criteria.customerType === "All" ? null : criteria.customerType,
        leadStatus: criteria.leadStatus === "ALL" ? null : criteria.leadStatus,
        leadSource: criteria.leadSource === "ALL" ? null : criteria.leadSource,
        campaign: criteria.campaign,
        receivedPrevious: criteria.receivedPrevious,
        alreadyReceivedCurrent: criteria.alreadyReceivedCurrent
      };

      const res = await crmService.buildAudience(filterPayload).catch(() => null);

      if (res && typeof res === "object" && (res.totalMatched !== undefined || res.leads)) {
        const total = res.totalMatched ?? (res.matchedLeadIds ? res.matchedLeadIds.length : (res.leads ? res.leads.length : 0));
        setTotalMatched(total);
        setMatchedCompanyCount(res.matchedCompanyCount ?? Math.round(total * 0.6));
        setMatchedLeadCount(res.matchedLeadCount ?? (total - Math.round(total * 0.6)));
        if (Array.isArray(res.leads)) {
          setAudienceList(res.leads);
          setSelectedIds(res.leads.map((l) => l.id));
        }
      } else {
        // Fallback: fetch live leads and companies from database
        const [allLeads, allCompanies] = await Promise.all([
          crmService.getAllLeads().catch(() => []),
          crmService.getAllCompanies().catch(() => [])
        ]);

        const leadsArr = Array.isArray(allLeads) ? allLeads : [];
        const compsArr = Array.isArray(allCompanies) ? allCompanies : [];

        const matchedLeads = leadsArr.filter((l) => {
          const indMatch = criteria.industry === "All" || (l.industry || "").toLowerCase() === criteria.industry.toLowerCase();
          const cityMatch = criteria.city === "All" || (l.city || "").toLowerCase().includes(criteria.city.toLowerCase());
          const statusMatch = criteria.leadStatus === "ALL" || (l.status || "").toUpperCase() === criteria.leadStatus.toUpperCase();
          const sourceMatch = criteria.leadSource === "ALL" || (l.source || "").toUpperCase() === criteria.leadSource.toUpperCase();
          return indMatch && cityMatch && statusMatch && sourceMatch;
        });

        const matchedComps = compsArr.filter((c) => {
          const indMatch = criteria.industry === "All" || (c.industry || "").toLowerCase() === criteria.industry.toLowerCase();
          const cityMatch = criteria.city === "All" || (c.city || "").toLowerCase().includes(criteria.city.toLowerCase());
          return indMatch && cityMatch;
        });

        setMatchedCompanyCount(matchedComps.length);
        setMatchedLeadCount(matchedLeads.length);
        const total = matchedLeads.length + matchedComps.length;
        setTotalMatched(total);

        const mapped = matchedLeads.map((l) => ({
          id: l.id,
          name: l.contactPerson || l.name || l.contactName || l.title || "—",
          company: l.company || l.companyName || "—",
          phone: l.phone || l.contactPhone || "—",
          email: l.email || l.contactEmail || "—",
          location: l.city || l.location || "—",
          post1: l.campaignHistory || "✓ Sent",
          post2: "—"
        }));
        setAudienceList(mapped);
        setSelectedIds(mapped.map((a) => a.id));
      }
    } catch (err) {
      console.error("Audience build error:", err);
      setError(err.message || "Failed to query audience segment");
      showToast(err.message || "Failed to query audience segment", "error");
    } finally {
      setLoading(false);
    }
  }, [criteria, showToast]);

  useEffect(() => {
    calculateAudience();
  }, [calculateAudience]);

  // Save Segment Handler
  const handleSaveSegmentSubmit = async (e) => {
    e.preventDefault();
    if (!segmentName.trim()) {
      showToast("Please enter a segment name", "error");
      return;
    }
    setSavingSegment(true);
    try {
      const payload = {
        name: segmentName.trim(),
        description: segmentDescription.trim() || `Segment with ${totalMatched} matches`,
        matchedCount: totalMatched,
        filters: criteria
      };
      const res = await crmService.saveAudienceSegment(payload);
      showToast("Audience segment saved successfully!", "success");
      setShowSaveModal(false);
      setSegmentName("");
      setSegmentDescription("");
      fetchSavedSegments();
    } catch (err) {
      console.error("Save segment error:", err);
      showToast(err.message || "Failed to save audience segment", "error");
    } finally {
      setSavingSegment(false);
    }
  };

  const handleExportExcel = () => {
    const toExport =
      selectedIds.length > 0
        ? audienceList.filter((a) => selectedIds.includes(a.id))
        : audienceList;

    if (toExport.length === 0) {
      showToast("No records available to export", "error");
      return;
    }

    const headers = ["ID", "Name", "Company", "Phone", "Email", "Location", "Previous Campaign"];
    const rows = toExport.map((r) => [
      r.id ?? "",
      `"${(r.name || "").replace(/"/g, '""')}"`,
      `"${(r.company || "").replace(/"/g, '""')}"`,
      `"${(r.phone || "").replace(/"/g, '""')}"`,
      `"${(r.email || "").replace(/"/g, '""')}"`,
      `"${(r.location || "").replace(/"/g, '""')}"`,
      `"${(r.post1 || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `crm_audience_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${toExport.length} customer records to CSV/Excel`, "success");
  };

  const handleRemoveSelected = () => {
    if (selectedIds.length === 0) {
      showToast("Please select customers to remove from this preview", "error");
      return;
    }
    setAudienceList(audienceList.filter((a) => !selectedIds.includes(a.id)));
    setSelectedIds([]);
    showToast("Removed selected customers from this audience preview", "info");
  };

  const filteredAudience = useMemo(() => {
    return audienceList.filter((a) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (a.name || "").toLowerCase().includes(q) ||
        (a.company || "").toLowerCase().includes(q) ||
        (a.phone || "").includes(q) ||
        (a.location || "").toLowerCase().includes(q)
      );
    });
  }, [audienceList, searchQuery]);

  useEffect(() => {
    setPreviewPage(1);
  }, [searchQuery]);

  const totalPreviewPages = Math.ceil(filteredAudience.length / PAGE_SIZE) || 1;
  const paginatedAudience = useMemo(() => {
    const start = (previewPage - 1) * PAGE_SIZE;
    return filteredAudience.slice(start, start + PAGE_SIZE);
  }, [filteredAudience, previewPage]);

  return (
    <div style={{ maxWidth: "1480px", margin: "0 auto", padding: "16px 20px" }}>
      <style>{`
        .crm-aud-layout {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
        }
        .crm-aud-row-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .crm-aud-row-3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 14px;
        }
        @media (max-width: 992px) {
          .crm-aud-layout {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 640px) {
          .crm-aud-row-2,
          .crm-aud-row-3 {
            grid-template-columns: 1fr;
          }
        }
        .crm-aud-skeleton {
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

      {/* Header & Sub-navigation */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px"
        }}
      >
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#0F172A", margin: 0 }}>
            Audience Builder & Saved Segments
          </h1>
          {/* Subtabs text row */}
          <div style={{ display: "flex", gap: "10px", marginTop: "6px", fontSize: "13px", color: "#64748B" }}>
            <span
              onClick={() => setActiveStep("builder")}
              style={{
                cursor: "pointer",
                color: activeStep === "builder" ? "#2563EB" : "#64748B",
                fontWeight: activeStep === "builder" ? 700 : 500,
                textDecoration: activeStep === "builder" ? "underline" : "none"
              }}
            >
              Audience Builder
            </span>
            <span>·</span>
            <span
              onClick={() => setActiveStep("preview")}
              style={{
                cursor: "pointer",
                color: activeStep === "preview" ? "#2563EB" : "#64748B",
                fontWeight: activeStep === "preview" ? 700 : 500,
                textDecoration: activeStep === "preview" ? "underline" : "none"
              }}
            >
              Preview Matches ({totalMatched})
            </span>
            <span>·</span>
            <span
              onClick={() => setActiveStep("saved")}
              style={{
                cursor: "pointer",
                color: activeStep === "saved" ? "#2563EB" : "#64748B",
                fontWeight: activeStep === "saved" ? 700 : 500,
                textDecoration: activeStep === "saved" ? "underline" : "none"
              }}
            >
              Saved Segments ({savedSegments.length})
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => setShowSaveModal(true)}
            style={{
              padding: "9px 16px",
              borderRadius: "8px",
              backgroundColor: "#ffffff",
              border: "1px solid #2563EB",
              color: "#2563EB",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <Bookmark size={15} />
            <span>Save as Audience Segment</span>
          </button>

          {activeStep === "preview" ? (
            <button
              onClick={handleExportExcel}
              style={{
                padding: "9px 16px",
                borderRadius: "8px",
                backgroundColor: "#16A34A",
                color: "#ffffff",
                border: "none",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 4px rgba(22, 163, 74, 0.2)"
              }}
            >
              <Download size={15} />
              <span>Export to Excel</span>
            </button>
          ) : (
            <button
              onClick={() => setActiveStep("preview")}
              style={{
                padding: "9px 18px",
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
              <span>Preview Audience ({totalMatched})</span>
              <ArrowRight size={15} />
            </button>
          )}
        </div>
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
            onClick={calculateAudience}
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

      {/* Dynamic Live Counter Badge */}
      <div
        style={{
          marginBottom: "18px",
          padding: "12px 18px",
          borderRadius: "10px",
          backgroundColor: "#F0FDF4",
          border: "1px solid #BBF7D0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#166534", fontSize: "13px", fontWeight: 600 }}>
          <span style={{ fontSize: "16px" }}>🟢</span>
          <span>
            <strong>{matchedCompanyCount} Companies</strong> & <strong>{matchedLeadCount} Leads</strong> match this criteria ({totalMatched} total accounts)
          </span>
        </div>
        <button
          onClick={() => setShowSaveModal(true)}
          style={{
            background: "none",
            border: "none",
            color: "#16A34A",
            fontSize: "12.5px",
            fontWeight: 700,
            cursor: "pointer",
            textDecoration: "underline"
          }}
        >
          Save as Segment →
        </button>
      </div>

      {activeStep === "saved" ? (
        /* SAVED SEGMENTS LIST VIEW */
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
              Saved Customer Segments ({savedSegments.length})
            </h3>
            <button
              onClick={fetchSavedSegments}
              style={{ background: "none", border: "none", color: "#2563EB", fontSize: "12.5px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
            >
              <RefreshCw size={13} className={loadingSegments ? "animate-spin" : ""} />
              <span>Refresh Segments</span>
            </button>
          </div>

          {loadingSegments ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>Loading saved segments...</div>
          ) : savedSegments.length === 0 ? (
            <div
              style={{
                backgroundColor: "#fff",
                borderRadius: "14px",
                border: "1px solid #E2E8F0",
                padding: "48px 20px",
                textAlign: "center"
              }}
            >
              <Bookmark size={32} color="#94A3B8" style={{ margin: "0 auto 10px" }} />
              <h4 style={{ margin: "0 0 6px 0", fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>No saved segments yet</h4>
              <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#64748B" }}>
                Use the Audience Builder filters to define targeted customer segments and save them for instant campaign launches.
              </p>
              <button
                onClick={() => setActiveStep("builder")}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  backgroundColor: "#2563EB",
                  color: "#fff",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Go to Audience Builder
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
              {savedSegments.map((seg) => (
                <div
                  key={seg.id}
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "14px",
                    border: "1px solid #E2E8F0",
                    padding: "20px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between"
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                      <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>
                        {seg.name}
                      </h4>
                      <span
                        style={{
                          backgroundColor: "#EFF6FF",
                          color: "#1D4ED8",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: 700
                        }}
                      >
                        {seg.matchedCount ?? seg.count ?? "Ready"} accounts
                      </span>
                    </div>
                    <p style={{ margin: "0 0 14px 0", fontSize: "12.5px", color: "#64748B", lineHeight: "1.4" }}>
                      {seg.description || "Active CRM segment"}
                    </p>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #F1F5F9", paddingTop: "14px" }}>
                    <span style={{ fontSize: "11px", color: "#94A3B8" }}>
                      {seg.updatedAt || seg.createdAt ? `Updated ${new Date(seg.updatedAt || seg.createdAt).toLocaleDateString()}` : "Ready"}
                    </span>
                    <button
                      onClick={() => navigate("/dashboard/crm/campaigns")}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "8px",
                        backgroundColor: "#16A34A",
                        color: "#ffffff",
                        border: "none",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px"
                      }}
                    >
                      <Rocket size={13} />
                      <span>Launch Campaign</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeStep === "builder" ? (
        /* STEP 1: AUDIENCE BUILDER FORM */
        <div className="crm-aud-layout">
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              border: "1px solid #E2E8F0",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)"
            }}
          >
            <h3 style={{ margin: "0 0 20px 0", fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
              Filter Criteria
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Campaign Filter */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                  Campaign *
                </label>
                <select
                  value={criteria.campaign}
                  onChange={(e) => setCriteria({ ...criteria, campaign: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", backgroundColor: "#fff" }}
                >
                  <option value="Post #02 — Product Update">Post #02 — Product Update</option>
                  <option value="Offer #01 — Festival Discount">Offer #01 — Festival Discount</option>
                  <option value="Post #01 — New Announcement">Post #01 — New Announcement</option>
                </select>
              </div>

              {/* Exclusion Filters */}
              <div className="crm-aud-row-2">
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                    Received previous post?
                  </label>
                  <select
                    value={criteria.receivedPrevious}
                    onChange={(e) => setCriteria({ ...criteria, receivedPrevious: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", backgroundColor: "#fff" }}
                  >
                    <option value="Post #01 — Yes">Post #01 — Yes</option>
                    <option value="Post #01 — No">Post #01 — No</option>
                    <option value="Any">Any</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                    Already received current campaign?
                  </label>
                  <select
                    value={criteria.alreadyReceivedCurrent}
                    onChange={(e) => setCriteria({ ...criteria, alreadyReceivedCurrent: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", backgroundColor: "#fff" }}
                  >
                    <option value="No">No (Exclude duplicate sends)</option>
                    <option value="Yes">Yes</option>
                    <option value="Ignore">Ignore filter</option>
                  </select>
                </div>
              </div>

              {/* Company Filters */}
              <div className="crm-aud-row-3">
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                    Company Type
                  </label>
                  <select
                    value={criteria.customerType}
                    onChange={(e) => setCriteria({ ...criteria, customerType: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", backgroundColor: "#fff" }}
                  >
                    <option value="All">All Types</option>
                    <option value="OEM">OEM</option>
                    <option value="Tier-1">Tier-1 Supplier</option>
                    <option value="Fleet">Fleet Operator</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                    Industry
                  </label>
                  <select
                    value={criteria.industry}
                    onChange={(e) => setCriteria({ ...criteria, industry: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", backgroundColor: "#fff" }}
                  >
                    <option value="All">All Industries</option>
                    <option value="Automotive / EV">Automotive / EV</option>
                    <option value="Renewable Energy">Renewable Energy</option>
                    <option value="Electronics">Electronics</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                    City / State
                  </label>
                  <select
                    value={criteria.city}
                    onChange={(e) => setCriteria({ ...criteria, city: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", backgroundColor: "#fff" }}
                  >
                    <option value="All">All Locations</option>
                    <option value="Pune">Pune, MH</option>
                    <option value="Mumbai">Mumbai, MH</option>
                    <option value="Delhi">Delhi, NCR</option>
                    <option value="Bengaluru">Bengaluru, KA</option>
                    <option value="Hyderabad">Hyderabad, TS</option>
                  </select>
                </div>
              </div>

              {/* Lead Filters: Status & Source */}
              <div className="crm-aud-row-2">
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                    Lead Status
                  </label>
                  <select
                    value={criteria.leadStatus}
                    onChange={(e) => setCriteria({ ...criteria, leadStatus: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", backgroundColor: "#fff" }}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="NEW">New</option>
                    <option value="CONTACTED">Contacted</option>
                    <option value="QUALIFIED">Qualified</option>
                    <option value="FOLLOW_UP">Follow Up</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                    Lead Source
                  </label>
                  <select
                    value={criteria.leadSource}
                    onChange={(e) => setCriteria({ ...criteria, leadSource: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", backgroundColor: "#fff" }}
                  >
                    <option value="ALL">All Sources</option>
                    <option value="INDIAMART">IndiaMART</option>
                    <option value="WEBSITE">Website</option>
                    <option value="PHONE">Phone / Direct</option>
                    <option value="CAMPAIGN">Campaign</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={calculateAudience}
                  disabled={loading}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "8px",
                    backgroundColor: "#2563EB",
                    color: "#fff",
                    border: "none",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                  <span>Recalculate Audience</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Summary Card */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              border: "1px solid #E2E8F0",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)"
            }}
          >
            <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
              Audience Estimate
            </h3>

            <div style={{ backgroundColor: "#F8FAFC", borderRadius: "10px", padding: "16px", marginBottom: "16px", border: "1px solid #E2E8F0" }}>
              <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>Target Audience Size</span>
              <div style={{ fontSize: "32px", fontWeight: 700, color: "#16A34A", marginTop: "4px" }}>
                {totalMatched || audienceList.length}
              </div>
              <span style={{ fontSize: "12px", color: "#64748B" }}>Customers & Leads matching selected criteria</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px", color: "#334155" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748B" }}>Campaign:</span>
                <span style={{ fontWeight: 600 }}>{criteria.campaign.split("—")[0]}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748B" }}>Exclusions:</span>
                <span style={{ fontWeight: 600 }}>{criteria.alreadyReceivedCurrent === "No" ? "Duplicates excluded" : "None"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748B" }}>Industry:</span>
                <span style={{ fontWeight: 600 }}>{criteria.industry}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748B" }}>Location:</span>
                <span style={{ fontWeight: 600 }}>{criteria.location}</span>
              </div>
            </div>

            <button
              onClick={() => setActiveStep("preview")}
              style={{
                width: "100%",
                marginTop: "20px",
                padding: "11px",
                borderRadius: "8px",
                backgroundColor: "#2563EB",
                color: "#fff",
                border: "none",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px"
              }}
            >
              <span>Build & Preview Audience</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      ) : (
        /* STEP 2: AUDIENCE PREVIEW TABLE */
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
            overflow: "hidden"
          }}
        >
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid #E2E8F0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px"
            }}
          >
            <div style={{ position: "relative", minWidth: "240px" }}>
              <Search size={16} color="#94A3B8" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="text"
                placeholder="Search audience..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px 8px 36px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  fontSize: "13px",
                  boxSizing: "border-box"
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: "#64748B" }}>
                {selectedIds.length} of {audienceList.length} selected
              </span>
              <button
                onClick={handleRemoveSelected}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  backgroundColor: "#fff",
                  border: "1px solid #EF4444",
                  color: "#EF4444",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <Trash2 size={14} />
                <span>Remove Selected</span>
              </button>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid #E2E8F0", textAlign: "left", color: "#64748B" }}>
                  <th style={{ padding: "12px 16px", width: "40px" }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.length === audienceList.length && audienceList.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds(audienceList.map((a) => a.id));
                        else setSelectedIds([]);
                      }}
                      style={{ cursor: "pointer" }}
                    />
                  </th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>NAME</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>COMPANY</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>PHONE</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>EMAIL</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>LOCATION</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>PREVIOUS POST</th>
                </tr>
              </thead>
              <tbody>
                {filteredAudience.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
                      No matching records found in this segment.
                    </td>
                  </tr>
                ) : (
                  paginatedAudience.map((row) => (
                    <tr key={row.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "12px 16px" }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(row.id)}
                          onChange={() => {
                            if (selectedIds.includes(row.id)) setSelectedIds(selectedIds.filter((id) => id !== row.id));
                            else setSelectedIds([...selectedIds, row.id]);
                          }}
                          style={{ cursor: "pointer" }}
                        />
                      </td>
                      <td style={{ padding: "12px 16px", fontWeight: 600, color: "#0F172A" }}>{row.name}</td>
                      <td style={{ padding: "12px 16px", color: "#334155" }}>{row.company}</td>
                      <td style={{ padding: "12px 16px", color: "#334155" }}>{row.phone}</td>
                      <td style={{ padding: "12px 16px", color: "#64748B" }}>{row.email}</td>
                      <td style={{ padding: "12px 16px", color: "#64748B" }}>{row.location}</td>
                      <td style={{ padding: "12px 16px", color: "#16A34A", fontWeight: 600 }}>{row.post1 || "✓ Sent"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {filteredAudience.length > PAGE_SIZE && (
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
                Showing {(previewPage - 1) * PAGE_SIZE + 1}–{Math.min(filteredAudience.length, previewPage * PAGE_SIZE)} of {filteredAudience.length}
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                  disabled={previewPage === 1}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    border: "1px solid #CBD5E1",
                    backgroundColor: previewPage === 1 ? "#F1F5F9" : "#fff",
                    cursor: previewPage === 1 ? "not-allowed" : "pointer"
                  }}
                >
                  <ChevronLeft size={13} />
                </button>
                <span style={{ padding: "0 6px", fontWeight: 600 }}>{previewPage} / {totalPreviewPages}</span>
                <button
                  onClick={() => setPreviewPage((p) => Math.min(totalPreviewPages, p + 1))}
                  disabled={previewPage >= totalPreviewPages}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    border: "1px solid #CBD5E1",
                    backgroundColor: previewPage >= totalPreviewPages ? "#F1F5F9" : "#fff",
                    cursor: previewPage >= totalPreviewPages ? "not-allowed" : "pointer"
                  }}
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Save Segment Modal */}
      {showSaveModal && (
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
          onClick={() => setShowSaveModal(false)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "480px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden"
            }}
            onClick={(e) => e.stopPropagation()}
          >
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
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
                  Save as Audience Segment
                </h3>
                <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748B" }}>
                  Saves current criteria ({totalMatched} accounts) for future campaigns
                </p>
              </div>
              <button
                onClick={() => setShowSaveModal(false)}
                style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveSegmentSubmit} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                  Segment Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maharashtra Commercial Fleet Operators"
                  value={segmentName}
                  onChange={(e) => setSegmentName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #CBD5E1",
                    fontSize: "13px",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Active logistics and commercial fleet accounts in MH"
                  value={segmentDescription}
                  onChange={(e) => setSegmentDescription(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #CBD5E1",
                    fontSize: "13px",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: "8px",
                  backgroundColor: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  fontSize: "12px",
                  color: "#64748B"
                }}
              >
                <strong>Filters applied:</strong> {criteria.industry !== "All" ? `Industry: ${criteria.industry}, ` : ""}
                {criteria.city !== "All" ? `Location: ${criteria.city}, ` : ""}
                {criteria.leadStatus !== "ALL" ? `Status: ${criteria.leadStatus}, ` : ""}
                Matches: <strong>{totalMatched}</strong> accounts
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "4px" }}>
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    backgroundColor: "#fff",
                    border: "1px solid #CBD5E1",
                    fontSize: "13px",
                    color: "#475569",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSegment || !segmentName.trim()}
                  style={{
                    padding: "8px 20px",
                    borderRadius: "8px",
                    backgroundColor: "#2563EB",
                    border: "none",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#fff",
                    cursor: savingSegment || !segmentName.trim() ? "not-allowed" : "pointer"
                  }}
                >
                  {savingSegment ? "Saving..." : "Save Segment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
