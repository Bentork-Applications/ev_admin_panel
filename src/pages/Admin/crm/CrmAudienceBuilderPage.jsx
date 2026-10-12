import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  AlertCircle
} from "lucide-react";
import { Toast } from "../../../components/common/Toast";
import { crmService } from "../../../services/crmService";

const PAGE_SIZE = 10;

export default function CrmAudienceBuilderPage() {
  const [activeStep, setActiveStep] = useState("builder"); // 'builder' | 'preview'
  const [toast, setToast] = useState(null);
  const [audienceList, setAudienceList] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalMatched, setTotalMatched] = useState(0);
  const [previewPage, setPreviewPage] = useState(1);

  // Builder criteria state
  const [criteria, setCriteria] = useState({
    campaign: "Post #02 — Product Update",
    receivedPrevious: "Post #01 — Yes",
    alreadyReceivedCurrent: "No",
    customerType: "All",
    industry: "All",
    location: "All"
  });

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  // Calculate audience using backend query or leads fallback
  const calculateAudience = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filterPayload = {
        companyIndustry: criteria.industry === "All" ? null : criteria.industry,
        city: criteria.location === "All" ? null : criteria.location,
        companyType: criteria.customerType === "All" ? null : criteria.customerType,
        industry: criteria.industry === "All" ? null : criteria.industry,
        location: criteria.location === "All" ? null : criteria.location,
        customerType: criteria.customerType === "All" ? null : criteria.customerType,
        campaign: criteria.campaign,
        receivedPrevious: criteria.receivedPrevious,
        alreadyReceivedCurrent: criteria.alreadyReceivedCurrent
      };

      const res = await crmService.buildAudience(filterPayload).catch(() => null);

      if (res && typeof res === "object" && (res.totalMatched !== undefined || res.leads)) {
        setTotalMatched(res.totalMatched || (res.matchedLeadIds ? res.matchedLeadIds.length : 0));
        if (Array.isArray(res.leads)) {
          setAudienceList(res.leads);
          setSelectedIds(res.leads.map((l) => l.id));
        }
      } else {
        // Fallback: fetch live leads from database and filter
        const allLeads = await crmService.getAllLeads();
        if (Array.isArray(allLeads)) {
          const matched = allLeads.filter((l) => {
            const indMatch =
              criteria.industry === "All" ||
              (l.industry || "").toLowerCase() === criteria.industry.toLowerCase();
            const locMatch =
              criteria.location === "All" ||
              (l.city || l.location || "").toLowerCase().includes(criteria.location.toLowerCase());
            return indMatch && locMatch;
          });
          const mapped = matched.map((l) => ({
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
          setTotalMatched(mapped.length);
        }
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

  const handleSaveAudienceClick = () => {
    showToast(
      "Backend Required: Dynamic audience segment storage endpoint (POST /api/crm/audience/segments) is pending on backend.",
      "info"
    );
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
            {activeStep === "builder" ? "Audience Builder" : "Campaign Audience Preview"}
          </h1>
          <p style={{ fontSize: "13px", color: "#64748B", margin: "4px 0 0 0" }}>
            {activeStep === "builder"
              ? "Build customized targeting segments from real CRM customer history"
              : "Review matched audience list and export to Excel/CSV"}
          </p>
        </div>

        {activeStep === "preview" ? (
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              onClick={() => setActiveStep("builder")}
              style={{
                padding: "9px 16px",
                borderRadius: "8px",
                backgroundColor: "#ffffff",
                border: "1px solid #CBD5E1",
                fontSize: "13px",
                fontWeight: 600,
                color: "#475569",
                cursor: "pointer"
              }}
            >
              ← Back to Builder
            </button>

            <button
              onClick={handleSaveAudienceClick}
              title="Backend API required for persistent segment saving"
              style={{
                padding: "9px 14px",
                borderRadius: "8px",
                backgroundColor: "#F8FAFC",
                border: "1px dashed #CBD5E1",
                color: "#64748B",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px"
              }}
            >
              <Save size={14} />
              <span>Save Segment (Backend Req.)</span>
            </button>

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
          </div>
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
            <span>Preview Audience ({selectedIds.length || totalMatched || audienceList.length})</span>
            <ArrowRight size={15} />
          </button>
        )}
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

      {activeStep === "builder" ? (
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

              <div className="crm-aud-row-3">
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                    Customer Type
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
                    Location
                  </label>
                  <select
                    value={criteria.location}
                    onChange={(e) => setCriteria({ ...criteria, location: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", backgroundColor: "#fff" }}
                  >
                    <option value="All">All Locations</option>
                    <option value="Pune">Pune</option>
                    <option value="Mumbai">Mumbai</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Bengaluru">Bengaluru</option>
                    <option value="Hyderabad">Hyderabad</option>
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
    </div>
  );
}
