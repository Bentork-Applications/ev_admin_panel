import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Building2,
  Search,
  Plus,
  RefreshCw,
  Eye,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Globe,
  Layers,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { crmService } from "../../../services/crmService";
import { Toast } from "../../../components/common/Toast";
import { Company360Drawer } from "../../../components/crm/Company360Drawer";
import { CreateCompanyModal } from "../../../components/crm/CreateCompanyModal";

export default function CrmCompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Drawers
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [companyToEdit, setCompanyToEdit] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const data = await crmService.getAllCompanies();
      setCompanies(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load companies:", err);
      showToast(err.message || "Failed to load companies", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleDeactivate = async (e, companyId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to deactivate this company?")) return;

    try {
      await crmService.deactivateCompany(companyId);
      showToast("Company deactivated successfully", "success");
      fetchCompanies();
    } catch (err) {
      console.error("Error deactivating company:", err);
      showToast(err.message || "Failed to deactivate company", "error");
    }
  };

  const filteredCompanies = useMemo(() => {
    if (!searchQuery.trim()) return companies;
    const q = searchQuery.toLowerCase();
    return companies.filter(
      (c) =>
        (c.name || "").toLowerCase().includes(q) ||
        (c.industry || "").toLowerCase().includes(q) ||
        (c.city || "").toLowerCase().includes(q) ||
        (c.gstNumber || "").toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q)
    );
  }, [companies, searchQuery]);

  return (
    <div style={{ maxWidth: "1440px", margin: "0 auto", padding: "8px 12px" }}>
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
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#111827", margin: 0 }}>
            Companies & Accounts
          </h1>
          <p style={{ fontSize: "13px", color: "#6B7280", margin: "3px 0 0 0" }}>
            B2B accounts master directory with 360° sales & quotation visibility
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={() => {
              setCompanyToEdit(null);
              setShowCreateModal(true);
            }}
            style={{
              padding: "9px 16px",
              borderRadius: "8px",
              backgroundColor: "#10B981",
              color: "#ffffff",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 4px rgba(16, 185, 129, 0.2)"
            }}
          >
            <Plus size={16} />
            <span>+ Add Company</span>
          </button>

          <button
            onClick={fetchCompanies}
            title="Refresh"
            style={{
              padding: "9px",
              borderRadius: "8px",
              backgroundColor: "#ffffff",
              border: "1px solid #D1D5DB",
              color: "#4B5563",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px"
        }}
      >
        <div style={{ position: "relative", width: "320px" }}>
          <Search size={16} color="#9CA3AF" style={{ position: "absolute", left: "10px", top: "10px" }} />
          <input
            type="text"
            placeholder="Search company name, industry, GST, city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px 8px 34px",
              borderRadius: "8px",
              border: "1px solid #D1D5DB",
              fontSize: "13px",
              boxSizing: "border-box"
            }}
          />
        </div>

        <span style={{ fontSize: "13px", color: "#6B7280" }}>
          Showing <strong>{filteredCompanies.length}</strong> companies
        </span>
      </div>

      {/* Companies Table */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "14px",
          border: "1px solid #E5E7EB",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
          overflow: "hidden"
        }}
      >
        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#6B7280" }}>
            Loading companies...
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center", color: "#6B7280" }}>
            <Building2 size={40} color="#9CA3AF" style={{ marginBottom: "12px" }} />
            <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: 700, color: "#111827" }}>
              No companies found
            </h3>
            <p style={{ margin: "0 0 16px 0", fontSize: "13px" }}>
              {searchQuery ? "No companies matched your search query." : "No companies added yet."}
            </p>
            <button
              onClick={() => {
                setCompanyToEdit(null);
                setShowCreateModal(true);
              }}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                backgroundColor: "#10B981",
                color: "#ffffff",
                border: "none",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              + Create First Company
            </button>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ backgroundColor: "#F9FAFB", borderBottom: "1px solid #E5E7EB", textAlign: "left", color: "#6B7280" }}>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>Company Name</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>Industry & Type</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>Location</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>Phone / Contact</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>GST #</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>Account Owner</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>Status</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.map((comp) => (
                  <tr
                    key={comp.id}
                    onClick={() => setSelectedCompanyId(comp.id)}
                    style={{
                      borderBottom: "1px solid #F3F4F6",
                      cursor: "pointer",
                      transition: "background-color 0.15s"
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F9FAFB")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "8px",
                            backgroundColor: "#ECFDF5",
                            color: "#10B981",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0
                          }}
                        >
                          <Building2 size={16} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: "#111827" }}>{comp.name}</div>
                          {comp.website && (
                            <div style={{ fontSize: "11px", color: "#6B7280" }}>{comp.website}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 500, color: "#111827" }}>{comp.industry || "—"}</div>
                      {comp.companyType && (
                        <div style={{ fontSize: "11px", color: "#6B7280" }}>
                          {comp.companyType.replace(/_/g, " ")}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: "12px 16px", color: "#4B5563" }}>
                      {[comp.city, comp.state].filter(Boolean).join(", ") || "—"}
                    </td>

                    <td style={{ padding: "12px 16px", color: "#4B5563" }}>
                      {comp.phone || comp.email || "—"}
                    </td>

                    <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: "12px", color: "#374151" }}>
                      {comp.gstNumber || "—"}
                    </td>

                    <td style={{ padding: "12px 16px", color: "#4B5563" }}>
                      {comp.ownerAdminName || comp.ownerName || "Unassigned"}
                    </td>

                    <td style={{ padding: "12px 16px" }}>
                      {comp.active !== false ? (
                        <span style={{ fontSize: "11px", fontWeight: 600, color: "#059669", backgroundColor: "#ECFDF5", padding: "2px 8px", borderRadius: "9999px" }}>
                          Active
                        </span>
                      ) : (
                        <span style={{ fontSize: "11px", fontWeight: 600, color: "#DC2626", backgroundColor: "#FEF2F2", padding: "2px 8px", borderRadius: "9999px" }}>
                          Inactive
                        </span>
                      )}
                    </td>

                    <td style={{ padding: "12px 16px", textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "inline-flex", gap: "6px" }}>
                        <button
                          onClick={() => setSelectedCompanyId(comp.id)}
                          title="View Details"
                          style={{
                            padding: "6px 10px",
                            borderRadius: "6px",
                            backgroundColor: "#ECFDF5",
                            color: "#065F46",
                            border: "1px solid #A7F3D0",
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <Eye size={13} />
                          <span>View Details</span>
                        </button>

                        <button
                          onClick={() => {
                            setCompanyToEdit(comp);
                            setShowCreateModal(true);
                          }}
                          title="Edit"
                          style={{
                            padding: "6px 8px",
                            borderRadius: "6px",
                            backgroundColor: "#F3F4F6",
                            color: "#374151",
                            border: "1px solid #D1D5DB",
                            cursor: "pointer"
                          }}
                        >
                          <Edit2 size={13} />
                        </button>

                        <button
                          onClick={(e) => handleDeactivate(e, comp.id)}
                          title="Deactivate"
                          style={{
                            padding: "6px 8px",
                            borderRadius: "6px",
                            backgroundColor: "#FEF2F2",
                            color: "#EF4444",
                            border: "1px solid #FECACA",
                            cursor: "pointer"
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 360° Drawer & Modals */}
      {selectedCompanyId && (
        <Company360Drawer
          companyId={selectedCompanyId}
          isOpen={!!selectedCompanyId}
          onClose={() => setSelectedCompanyId(null)}
          onCompanyUpdated={fetchCompanies}
          showToast={showToast}
        />
      )}

      {showCreateModal && (
        <CreateCompanyModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          companyToEdit={companyToEdit}
          onCompanySaved={fetchCompanies}
          showToast={showToast}
        />
      )}
    </div>
  );
}
