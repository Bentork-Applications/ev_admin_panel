import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Building2,
  Search,
  Plus,
  RefreshCw,
  Eye,
  Phone,
  Mail,
  MapPin,
  Globe,
  Layers,
  CheckCircle2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Users,
  AlertCircle
} from "lucide-react";
import { crmService } from "../../../services/crmService";
import { Toast } from "../../../components/common/Toast";
import { Customer360Modal } from "../../../components/crm/Customer360Modal";
import { CreateCompanyModal } from "../../../components/crm/CreateCompanyModal";
import { CreateOpportunityModal } from "../../../components/crm/CreateOpportunityModal";
import { LogActivityModal } from "../../../components/crm/LogActivityModal";

const PAGE_SIZE = 10;

export default function CrmCompaniesContactsPage() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [industryFilter, setIndustryFilter] = useState("ALL");
  const [cityFilter, setCityFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCompany, setSelectedCompany] = useState(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [show360Modal, setShow360Modal] = useState(false);
  const [showCreateOppModal, setShowCreateOppModal] = useState(false);
  const [showLogCallModal, setShowLogCallModal] = useState(false);
  const [targetCompanyForAction, setTargetCompanyForAction] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await crmService.getAllCompanies();
      const list = Array.isArray(data) ? data : [];
      setCompanies(list);
      if (list.length > 0) {
        setSelectedCompany((prev) => prev || list[0]);
      }
    } catch (err) {
      console.error("Failed to load companies:", err);
      setError(err.message || "Failed to load companies");
      showToast(err.message || "Failed to load companies", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Derived filter options
  const industries = useMemo(
    () => ["ALL", ...new Set(companies.map((c) => c.industry).filter(Boolean))],
    [companies]
  );
  const cities = useMemo(
    () => ["ALL", ...new Set(companies.map((c) => c.city).filter(Boolean))],
    [companies]
  );

  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      if (industryFilter !== "ALL" && (c.industry || "").toUpperCase() !== industryFilter.toUpperCase()) {
        return false;
      }
      if (cityFilter !== "ALL" && (c.city || "").toUpperCase() !== cityFilter.toUpperCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (c.name || c.companyName || "").toLowerCase().includes(q);
        const matchInd = (c.industry || "").toLowerCase().includes(q);
        const matchCity = (c.city || "").toLowerCase().includes(q);
        const matchOwner = (c.ownerAdminName || c.ownerName || "").toLowerCase().includes(q);
        if (!matchName && !matchInd && !matchCity && !matchOwner) return false;
      }
      return true;
    });
  }, [companies, industryFilter, cityFilter, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, industryFilter, cityFilter]);

  const totalPages = Math.ceil(filteredCompanies.length / PAGE_SIZE) || 1;
  const paginatedCompanies = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredCompanies.slice(start, start + PAGE_SIZE);
  }, [filteredCompanies, currentPage]);

  // Selected company fallback
  const currentSelected = selectedCompany || (filteredCompanies.length > 0 ? filteredCompanies[0] : null);

  return (
    <div style={{ maxWidth: "1480px", margin: "0 auto", padding: "16px 20px" }}>
      <style>{`
        .crm-comp-grid {
          display: grid;
          grid-template-columns: 1.7fr 1fr;
          gap: 20px;
          align-items: flex-start;
        }
        @media (max-width: 1024px) {
          .crm-comp-grid {
            grid-template-columns: 1fr;
          }
        }
        .crm-comp-filters {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }
        .crm-comp-filters select,
        .crm-comp-filters input {
          box-sizing: border-box;
          border-radius: 6px;
          border: 1px solid #CBD5E1;
          font-size: 12px;
        }
        .crm-skeleton-comp-row td {
          padding: 14px 16px;
        }
        .crm-comp-skeleton {
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
            Companies & Contacts
          </h1>
          <p style={{ fontSize: "13px", color: "#64748B", margin: "4px 0 0 0" }}>
            360° customer relationship directory and account intelligence
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
            <span>+ Add Company</span>
          </button>

          <button
            onClick={fetchCompanies}
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
            onClick={fetchCompanies}
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

      {/* 2-Column Responsive Layout */}
      <div className="crm-comp-grid">
        {/* Left Column: Companies Table */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
            overflow: "hidden"
          }}
        >
          {/* Filter Bar */}
          <div
            style={{
              padding: "14px 18px",
              borderBottom: "1px solid #E2E8F0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px"
            }}
          >
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>
              Companies ({filteredCompanies.length})
            </h3>
            <div className="crm-comp-filters">
              <div style={{ position: "relative", width: "180px" }}>
                <Search size={14} color="#94A3B8" style={{ position: "absolute", left: "9px", top: "8px" }} />
                <input
                  type="text"
                  placeholder="Search name, city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: "100%", padding: "6px 8px 6px 28px" }}
                />
              </div>

              <select
                value={industryFilter}
                onChange={(e) => setIndustryFilter(e.target.value)}
                style={{ padding: "6px 10px", backgroundColor: "#fff" }}
              >
                <option value="ALL">All Industries</option>
                {industries.filter((i) => i !== "ALL").map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>

              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                style={{ padding: "6px 10px", backgroundColor: "#fff" }}
              >
                <option value="ALL">All Cities</option>
                {cities.filter((c) => c !== "ALL").map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid #E2E8F0", textAlign: "left", color: "#64748B" }}>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>COMPANY</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>INDUSTRY</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>CITY</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>OWNER</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>OPEN OPP.</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="crm-skeleton-comp-row" style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td><div className="crm-comp-skeleton" style={{ width: "120px" }} /></td>
                      <td><div className="crm-comp-skeleton" style={{ width: "90px" }} /></td>
                      <td><div className="crm-comp-skeleton" style={{ width: "70px" }} /></td>
                      <td><div className="crm-comp-skeleton" style={{ width: "80px" }} /></td>
                      <td><div className="crm-comp-skeleton" style={{ width: "40px" }} /></td>
                    </tr>
                  ))
                ) : filteredCompanies.length > 0 ? (
                  paginatedCompanies.map((comp) => {
                    const isSelected =
                      currentSelected?.id === comp.id || (!currentSelected?.id && currentSelected?.name === comp.name);
                    return (
                      <tr
                        key={comp.id || comp.name}
                        onClick={() => setSelectedCompany(comp)}
                        style={{
                          borderBottom: "1px solid #F1F5F9",
                          cursor: "pointer",
                          backgroundColor: isSelected ? "#F0FDF4" : "transparent",
                          transition: "background-color 0.15s"
                        }}
                      >
                        <td style={{ padding: "12px 16px", fontWeight: 600, color: "#0F172A" }}>
                          {comp.name || comp.companyName || "—"}
                        </td>
                        <td style={{ padding: "12px 16px", color: "#334155" }}>
                          {comp.industry || "—"}
                        </td>
                        <td style={{ padding: "12px 16px", color: "#64748B" }}>
                          {comp.city || "—"}
                        </td>
                        <td style={{ padding: "12px 16px", color: "#334155" }}>
                          {comp.ownerAdminName || comp.ownerName || "—"}
                        </td>
                        <td style={{ padding: "12px 16px", color: "#2563EB", fontWeight: 600 }}>
                          {comp.openOppCount ?? comp.openOpportunities ?? 0}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} style={{ padding: "40px 20px", textAlign: "center", color: "#64748B" }}>
                      No companies match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {!loading && filteredCompanies.length > PAGE_SIZE && (
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
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(filteredCompanies.length, currentPage * PAGE_SIZE)} of {filteredCompanies.length}
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

        {/* Right Column: Selected Company Detail Panel */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "14px",
            padding: "24px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
            position: "sticky",
            top: "20px"
          }}
        >
          {currentSelected ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
                  {currentSelected.name || currentSelected.companyName}
                </h3>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: "12px",
                    backgroundColor: "#DCFCE7",
                    color: "#16A34A"
                  }}
                >
                  {currentSelected.status || "Active Company"}
                </span>
              </div>

              <p style={{ margin: "0 0 16px 0", fontSize: "12px", color: "#64748B" }}>
                {currentSelected.industry || "General Industry"} · {currentSelected.city || "Location not specified"}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px", marginBottom: "22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #F1F5F9", paddingBottom: "6px" }}>
                  <span style={{ color: "#64748B" }}>Contacts:</span>
                  <strong style={{ color: "#0F172A" }}>
                    {currentSelected.contactsCount ?? (currentSelected.contacts ? currentSelected.contacts.length : 0)}
                  </strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #F1F5F9", paddingBottom: "6px" }}>
                  <span style={{ color: "#64748B" }}>Open Opps:</span>
                  <strong style={{ color: "#2563EB" }}>
                    {currentSelected.openOppCount ?? currentSelected.openOpportunities ?? 0}
                  </strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #F1F5F9", paddingBottom: "6px" }}>
                  <span style={{ color: "#64748B" }}>Owner:</span>
                  <strong style={{ color: "#0F172A" }}>{currentSelected.ownerAdminName || currentSelected.ownerName || "Unassigned"}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #F1F5F9", paddingBottom: "6px" }}>
                  <span style={{ color: "#64748B" }}>Products:</span>
                  <strong style={{ color: "#0F172A" }}>{currentSelected.products || currentSelected.productCategory || "—"}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748B" }}>Last Contact:</span>
                  <strong style={{ color: "#0F172A" }}>{currentSelected.lastContact || "—"}</strong>
                </div>
              </div>

              <button
                onClick={() => setShow360Modal(true)}
                style={{
                  width: "100%",
                  padding: "11px 18px",
                  borderRadius: "8px",
                  backgroundColor: "#2563EB",
                  color: "#ffffff",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px"
                }}
              >
                <Eye size={15} />
                <span>Open 360° Profile</span>
              </button>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "20px 0", color: "#64748B" }}>
              <Building2 size={36} color="#CBD5E1" style={{ margin: "0 auto 10px" }} />
              <p style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>No company selected</p>
              <p style={{ margin: "4px 0 0 0", fontSize: "12px" }}>Select a company from the list to view its 360 profile.</p>
            </div>
          )}
        </div>
      </div>

      {/* Customer 360° Profile Modal */}
      {show360Modal && (
        <Customer360Modal
          isOpen={show360Modal}
          onClose={() => setShow360Modal(false)}
          company={currentSelected}
          onLogCall={(comp) => {
            setTargetCompanyForAction(comp || currentSelected);
            setShowLogCallModal(true);
          }}
          onCreateOpportunity={(comp) => {
            setTargetCompanyForAction(comp || currentSelected);
            setShowCreateOppModal(true);
          }}
        />
      )}

      {/* Create Opportunity Modal */}
      {showCreateOppModal && (
        <CreateOpportunityModal
          isOpen={showCreateOppModal}
          onClose={() => {
            setShowCreateOppModal(false);
            setTargetCompanyForAction(null);
          }}
          initialCompanyId={targetCompanyForAction?.id || currentSelected?.id}
          onOpportunityCreated={() => {
            fetchCompanies();
            showToast("Opportunity created successfully", "success");
          }}
          showToast={showToast}
        />
      )}

      {/* Log Call Modal */}
      {showLogCallModal && (
        <LogActivityModal
          isOpen={showLogCallModal}
          onClose={() => {
            setShowLogCallModal(false);
            setTargetCompanyForAction(null);
          }}
          companyId={targetCompanyForAction?.id || currentSelected?.id}
          onActivityLogged={() => {
            fetchCompanies();
            showToast("Activity logged successfully", "success");
          }}
          showToast={showToast}
        />
      )}

      {/* Create Company Modal */}
      {showCreateModal && (
        <CreateCompanyModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCompanySaved={fetchCompanies}
          showToast={showToast}
        />
      )}
    </div>
  );
}
