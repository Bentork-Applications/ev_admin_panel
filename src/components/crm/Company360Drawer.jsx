import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  Building2,
  Phone,
  Mail,
  MapPin,
  Globe,
  FileText,
  User,
  Plus,
  TrendingUp,
  DollarSign,
  Calendar,
  Layers,
  CheckCircle,
  Clock,
  Edit2,
  Trash2,
  ExternalLink,
  PhoneCall,
  AlertTriangle
} from "lucide-react";
import { crmService } from "../../services/crmService";
import { LeadStatusBadge, OpportunityStageBadge, QuotationStatusBadge } from "./CrmBadge";
import { ActivityTimeline } from "./ActivityTimeline";
import { CreateContactModal } from "./CreateContactModal";
import { CreateCompanyModal } from "./CreateCompanyModal";
import { CreateOpportunityModal } from "./CreateOpportunityModal";
import { LogActivityModal } from "./LogActivityModal";

export const Company360Drawer = ({
  companyId,
  isOpen,
  onClose,
  onCompanyUpdated,
  showToast
}) => {
  const navigate = useNavigate();
  const [data360, setData360] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"); // overview, contacts, leads, opportunities, quotations, activities
  const [loading, setLoading] = useState(true);

  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showEditCompanyModal, setShowEditCompanyModal] = useState(false);
  const [showCreateOppModal, setShowCreateOppModal] = useState(false);
  const [showLogCallModal, setShowLogCallModal] = useState(false);
  const [targetContactForCall, setTargetContactForCall] = useState(null);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [deactivatingLoading, setDeactivatingLoading] = useState(false);

  const formatSource = (src) => {
    if (!src) return "Direct / Offline";
    const map = {
      indiamart: "IndiaMART",
      phone_call: "Phone Call / Cold Outreach",
      website: "Website Inquiry",
      referral: "Referral",
      exhibition: "Exhibition / Trade Fair",
      walk_in: "Walk-In",
      social_media: "Social Media / LinkedIn",
      whatsapp_campaign: "WhatsApp Campaign",
      campaign_import: "Campaign Import",
      direct: "Direct / Offline"
    };
    return map[src.toLowerCase()] || src.replace(/_/g, " ");
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
    } catch {
      return String(dateStr);
    }
  };

  const handleDeactivate = async () => {
    setDeactivatingLoading(true);
    try {
      await crmService.deactivateCompany(companyId);
      showToast?.("Company deactivated successfully", "success");
      setShowDeactivateConfirm(false);
      await fetch360Data();
      onCompanyUpdated?.();
    } catch (err) {
      console.error("Failed to deactivate company:", err);
      showToast?.(err.message || "Failed to deactivate company", "error");
    } finally {
      setDeactivatingLoading(false);
    }
  };

  const fetch360Data = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await crmService.getCompany360(companyId);
      setData360(res);
    } catch (err) {
      console.error("Error fetching company 360:", err);
      showToast?.(err.message || "Failed to load company 360 data", "error");
    } finally {
      setLoading(false);
    }
  }, [companyId, showToast]);

  useEffect(() => {
    if (isOpen && companyId) {
      fetch360Data();
    }
  }, [isOpen, companyId, fetch360Data]);

  if (!isOpen) return null;

  const company = data360?.company;
  const contacts = Array.isArray(data360?.contacts) ? data360.contacts : [];
  const leads = Array.isArray(data360?.leads) ? data360.leads : [];
  const opportunities = Array.isArray(data360?.opportunities) ? data360.opportunities : [];
  const quotations = Array.isArray(data360?.quotations) ? data360.quotations : [];
  const activities = Array.isArray(data360?.activities) ? data360.activities : [];

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "contacts", label: `Contacts (${contacts.length})` },
    { id: "leads", label: `Leads (${leads.length})` },
    { id: "opportunities", label: `Opportunities (${opportunities.length})` },
    { id: "quotations", label: `Quotations (${quotations.length})` },
    { id: "activities", label: `Activities (${activities.length})` }
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        backdropFilter: "blur(4px)",
        zIndex: 1200,
        display: "flex",
        justifyContent: "flex-end"
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "680px",
          height: "100%",
          backgroundColor: "#ffffff",
          boxShadow: "-10px 0 30px rgba(0, 0, 0, 0.15)",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          animation: "slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #F3F4F6",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            backgroundColor: "#ffffff",
            zIndex: 10
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                backgroundColor: "#ECFDF5",
                color: "#10B981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Building2 size={24} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#111827" }}>
                  {company?.name || "Company 360° View"}
                </h3>
                {company?.active !== false ? (
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#059669", backgroundColor: "#ECFDF5", padding: "2px 8px", borderRadius: "9999px" }}>
                    Active
                  </span>
                ) : (
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#DC2626", backgroundColor: "#FEF2F2", padding: "2px 8px", borderRadius: "9999px" }}>
                    Inactive
                  </span>
                )}
              </div>
              <p style={{ margin: "3px 0 0 0", fontSize: "12px", color: "#6B7280" }}>
                {[company?.industry, company?.city, company?.state].filter(Boolean).join(" • ") || "—"}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={() => setShowEditCompanyModal(true)}
              style={{
                background: "#F3F4F6",
                border: "none",
                color: "#374151",
                cursor: "pointer",
                padding: "6px 10px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}
            >
              <Edit2 size={13} />
              <span>Edit</span>
            </button>
            {company?.active !== false && (
              <button
                onClick={() => setShowDeactivateConfirm(true)}
                title="Deactivate Company"
                style={{
                  background: "#FEF2F2",
                  border: "1px solid #FECACA",
                  color: "#DC2626",
                  cursor: "pointer",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                <Trash2 size={13} />
                <span>Deactivate</span>
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: "#9CA3AF",
                cursor: "pointer",
                padding: "6px",
                borderRadius: "6px"
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid #E5E7EB",
            backgroundColor: "#F9FAFB",
            overflowX: "auto",
            padding: "0 16px"
          }}
        >
          {tabs.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "12px 14px",
                  fontSize: "12px",
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? "#10B981" : "#6B7280",
                  border: "none",
                  borderBottom: isSelected ? "2px solid #10B981" : "2px solid transparent",
                  backgroundColor: "transparent",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease"
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div style={{ padding: "24px", flex: 1 }}>
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#6B7280" }}>
              Loading 360° account details...
            </div>
          ) : !company ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#EF4444" }}>
              Company details not found
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === "overview" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {/* Account Summary Stats */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: "12px"
                    }}
                  >
                    <div style={{ backgroundColor: "#F9FAFB", borderRadius: "10px", padding: "12px", border: "1px solid #E5E7EB" }}>
                      <span style={{ fontSize: "11px", color: "#6B7280", display: "block" }}>Contacts</span>
                      <strong style={{ fontSize: "18px", color: "#111827" }}>{contacts.length}</strong>
                    </div>
                    <div style={{ backgroundColor: "#F9FAFB", borderRadius: "10px", padding: "12px", border: "1px solid #E5E7EB" }}>
                      <span style={{ fontSize: "11px", color: "#6B7280", display: "block" }}>Leads</span>
                      <strong style={{ fontSize: "18px", color: "#3B82F6" }}>{leads.length}</strong>
                    </div>
                    <div style={{ backgroundColor: "#F9FAFB", borderRadius: "10px", padding: "12px", border: "1px solid #E5E7EB" }}>
                      <span style={{ fontSize: "11px", color: "#6B7280", display: "block" }}>Opportunities</span>
                      <strong style={{ fontSize: "18px", color: "#10B981" }}>{opportunities.length}</strong>
                    </div>
                    <div style={{ backgroundColor: "#F9FAFB", borderRadius: "10px", padding: "12px", border: "1px solid #E5E7EB" }}>
                      <span style={{ fontSize: "11px", color: "#6B7280", display: "block" }}>Quotes</span>
                      <strong style={{ fontSize: "18px", color: "#8B5CF6" }}>{quotations.length}</strong>
                    </div>
                  </div>

                  {/* Company Info Card */}
                  <div style={{ backgroundColor: "#ffffff", border: "1px solid #E5E7EB", borderRadius: "12px", padding: "18px" }}>
                    <h4 style={{ margin: "0 0 14px 0", fontSize: "14px", fontWeight: 700, color: "#111827" }}>
                      Company Profile
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", fontSize: "13px" }}>
                      <div>
                        <span style={{ color: "#6B7280", fontSize: "11px", display: "block" }}>Company Type</span>
                        <strong style={{ color: "#111827" }}>{company.companyType ? company.companyType.replace(/_/g, " ") : "—"}</strong>
                      </div>
                      <div>
                        <span style={{ color: "#6B7280", fontSize: "11px", display: "block" }}>GST Number</span>
                        <strong style={{ color: "#111827" }}>{company.gstNumber || "—"}</strong>
                      </div>
                      <div>
                        <span style={{ color: "#6B7280", fontSize: "11px", display: "block" }}>Phone</span>
                        {company.phone ? (
                          <a href={`tel:${company.phone}`} style={{ color: "#111827", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <Phone size={11} color="#10B981" />
                            <span>{company.phone}</span>
                          </a>
                        ) : (
                          <span style={{ color: "#9CA3AF" }}>—</span>
                        )}
                      </div>
                      <div>
                        <span style={{ color: "#6B7280", fontSize: "11px", display: "block" }}>Email</span>
                        {company.email ? (
                          <a href={`mailto:${company.email}`} style={{ color: "#2563EB", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <Mail size={11} color="#2563EB" />
                            <span>{company.email}</span>
                          </a>
                        ) : (
                          <span style={{ color: "#9CA3AF" }}>—</span>
                        )}
                      </div>
                      <div>
                        <span style={{ color: "#6B7280", fontSize: "11px", display: "block" }}>Website</span>
                        {company.website ? (
                          <a
                            href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#2563EB", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
                          >
                            <span>{company.website}</span>
                            <ExternalLink size={11} />
                          </a>
                        ) : (
                          <span style={{ color: "#9CA3AF" }}>—</span>
                        )}
                      </div>
                      <div>
                        <span style={{ color: "#6B7280", fontSize: "11px", display: "block" }}>Account Owner</span>
                        <span style={{ color: "#111827", fontWeight: 600 }}>{company.ownerAdminName || "Unassigned"}</span>
                      </div>
                      <div>
                        <span style={{ color: "#6B7280", fontSize: "11px", display: "block" }}>Discovery / Lead Source</span>
                        <span style={{ color: "#0F172A", fontWeight: 600 }}>{formatSource(company.source)}</span>
                      </div>
                      <div>
                        <span style={{ color: "#6B7280", fontSize: "11px", display: "block" }}>Created / Last Updated</span>
                        <span style={{ color: "#64748B", fontSize: "12px" }}>
                          {formatDate(company.createdAt)}
                          {company.updatedAt && ` • Updated ${formatDate(company.updatedAt)}`}
                        </span>
                      </div>
                      <div style={{ gridColumn: "span 2" }}>
                        <span style={{ color: "#6B7280", fontSize: "11px", display: "block" }}>Full Address</span>
                        <span style={{ color: "#111827" }}>
                          {[company.address, company.city, company.state, company.pincode].filter(Boolean).join(", ") || "—"}
                        </span>
                      </div>
                    </div>

                    {company.notes && (
                      <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid #F3F4F6" }}>
                        <span style={{ color: "#6B7280", fontSize: "11px", display: "block", marginBottom: "4px" }}>
                          Internal Notes
                        </span>
                        <div style={{ fontSize: "12px", color: "#4B5563", backgroundColor: "#F9FAFB", padding: "10px", borderRadius: "8px" }}>
                          {company.notes}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: CONTACTS */}
              {activeTab === "contacts" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#111827" }}>
                      Key Contacts ({contacts.length})
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowAddContactModal(true)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        backgroundColor: "#10B981",
                        color: "#ffffff",
                        border: "none",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      <Plus size={14} />
                      <span>Add Contact</span>
                    </button>
                  </div>

                  {contacts.length === 0 ? (
                    <div style={{ padding: "32px", textAlign: "center", color: "#6B7280", backgroundColor: "#F9FAFB", borderRadius: "10px" }}>
                      No contacts added for this company yet.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {contacts.map((ct) => (
                        <div
                          key={ct.id}
                          style={{
                            backgroundColor: "#ffffff",
                            border: "1px solid #E5E7EB",
                            borderRadius: "10px",
                            padding: "14px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "12px"
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <strong style={{ fontSize: "14px", color: "#111827" }}>{ct.name}</strong>
                              {ct.isPrimary && (
                                <span style={{ fontSize: "10px", fontWeight: 700, color: "#10B981", backgroundColor: "#ECFDF5", padding: "1px 6px", borderRadius: "4px" }}>
                                  PRIMARY
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "2px" }}>
                              {ct.designation || "Executive"}
                            </div>
                            <div style={{ display: "flex", gap: "14px", marginTop: "6px", fontSize: "12px", color: "#374151", flexWrap: "wrap" }}>
                              {ct.phone && (
                                <a href={`tel:${ct.phone}`} style={{ color: "#0F172A", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                  <Phone size={12} color="#10B981" />
                                  <span>{ct.phone}</span>
                                </a>
                              )}
                              {ct.email && (
                                <a href={`mailto:${ct.email}`} style={{ color: "#2563EB", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                  <Mail size={12} color="#2563EB" />
                                  <span>{ct.email}</span>
                                </a>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setTargetContactForCall(ct);
                              setShowLogCallModal(true);
                            }}
                            title="Log Call Activity"
                            style={{
                              padding: "6px 10px",
                              borderRadius: "6px",
                              backgroundColor: "#ECFDF5",
                              border: "1px solid #A7F3D0",
                              color: "#059669",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              flexShrink: 0
                            }}
                          >
                            <PhoneCall size={12} />
                            <span>Log Call</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: LEADS */}
              {activeTab === "leads" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                    <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#111827" }}>
                      Associated Leads ({leads.length})
                    </h4>
                    {company && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          navigate(`/dashboard/crm/leads?company=${encodeURIComponent(company.name)}&companyId=${company.id}`, {
                            state: { companyId: company.id, companyName: company.name, searchQuery: company.name }
                          });
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          padding: "5px 10px",
                          borderRadius: "6px",
                          backgroundColor: "#ECFDF5",
                          color: "#059669",
                          border: "1px solid #A7F3D0",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer"
                        }}
                        title="Open filtered CRM Leads page for this company"
                      >
                        <ExternalLink size={12} />
                        <span>View in Leads Page</span>
                      </button>
                    )}
                  </div>

                  {leads.length === 0 ? (
                    <div style={{ padding: "32px", textAlign: "center", color: "#6B7280", backgroundColor: "#F9FAFB", borderRadius: "10px" }}>
                      No leads recorded for this company.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {leads.map((ld) => (
                        <div
                          key={ld.id}
                          onClick={() => {
                            onClose();
                            navigate(`/dashboard/crm/leads?leadId=${ld.id}`, {
                              state: { selectedLeadId: ld.id, companyId: company?.id, companyName: company?.name }
                            });
                          }}
                          style={{
                            backgroundColor: "#ffffff",
                            border: "1px solid #E5E7EB",
                            borderRadius: "10px",
                            padding: "14px",
                            cursor: "pointer",
                            transition: "all 0.15s ease"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "#10B981";
                            e.currentTarget.style.boxShadow = "0 2px 8px rgba(16, 185, 129, 0.12)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "#E5E7EB";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                          title="Click to view lead details in CRM Leads page"
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ fontSize: "11px", fontWeight: 700, color: "#10B981" }}>{ld.leadNumber}</span>
                                <ExternalLink size={11} color="#64748B" />
                              </div>
                              <h5 style={{ margin: "2px 0 0 0", fontSize: "14px", fontWeight: 600, color: "#111827" }}>
                                {ld.title}
                              </h5>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <LeadStatusBadge status={ld.status} />
                              <span style={{ fontSize: "11px", color: "#2563EB", fontWeight: 600 }}>Open →</span>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: "16px", marginTop: "8px", fontSize: "12px", color: "#6B7280" }}>
                            <span>Est: ₹{ld.estimatedValue ? Number(ld.estimatedValue).toLocaleString("en-IN") : "0"}</span>
                            <span>Contact: {ld.contactName || "-"}</span>
                            {ld.nextFollowUpDate && <span style={{ color: "#D97706" }}>Follow-up: {ld.nextFollowUpDate}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: OPPORTUNITIES */}
              {activeTab === "opportunities" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#111827" }}>
                      Opportunities ({opportunities.length})
                    </h4>
                    <button
                      onClick={() => setShowCreateOppModal(true)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "5px 12px",
                        borderRadius: "6px",
                        backgroundColor: "#10B981",
                        color: "#ffffff",
                        border: "none",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      <Plus size={13} />
                      <span>+ Add Opportunity</span>
                    </button>
                  </div>

                  {opportunities.length === 0 ? (
                    <div style={{ padding: "32px", textAlign: "center", color: "#6B7280", backgroundColor: "#F9FAFB", borderRadius: "10px" }}>
                      <p style={{ margin: "0 0 10px 0" }}>No active opportunities for this company.</p>
                      <button
                        onClick={() => setShowCreateOppModal(true)}
                        style={{
                          padding: "6px 14px",
                          borderRadius: "6px",
                          backgroundColor: "#ECFDF5",
                          color: "#065F46",
                          border: "1px solid #A7F3D0",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer"
                        }}
                      >
                        + Create First Opportunity
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {opportunities.map((opp) => (
                        <div
                          key={opp.id}
                          style={{
                            backgroundColor: "#ffffff",
                            border: "1px solid #E5E7EB",
                            borderRadius: "10px",
                            padding: "14px"
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                              <span style={{ fontSize: "11px", fontWeight: 700, color: "#10B981" }}>{opp.opportunityNumber}</span>
                              <h5 style={{ margin: "2px 0 0 0", fontSize: "14px", fontWeight: 600, color: "#111827" }}>
                                {opp.title}
                              </h5>
                            </div>
                            <OpportunityStageBadge stage={opp.stage} />
                          </div>
                          <div style={{ display: "flex", gap: "16px", marginTop: "8px", fontSize: "12px", color: "#6B7280" }}>
                            <strong style={{ color: "#10B981" }}>₹{opp.value ? Number(opp.value).toLocaleString("en-IN") : "0"}</strong>
                            <span>Probability: {opp.probability || 0}%</span>
                            {opp.expectedCloseDate && <span>Close: {opp.expectedCloseDate}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: QUOTATIONS */}
              {activeTab === "quotations" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#111827" }}>
                    Quotations ({quotations.length})
                  </h4>

                  {quotations.length === 0 ? (
                    <div style={{ padding: "32px", textAlign: "center", color: "#6B7280", backgroundColor: "#F9FAFB", borderRadius: "10px" }}>
                      No quotations created for this company.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {quotations.map((q) => (
                        <div
                          key={q.id}
                          style={{
                            backgroundColor: "#ffffff",
                            border: "1px solid #E5E7EB",
                            borderRadius: "10px",
                            padding: "14px"
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                              <strong style={{ fontSize: "14px", color: "#111827" }}>{q.quoteNumber}</strong>
                              <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "2px" }}>
                                {q.items?.length || 0} line items • Valid until: {q.validUntil || "-"}
                              </div>
                            </div>
                            <QuotationStatusBadge status={q.status} />
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px", paddingTop: "8px", borderTop: "1px solid #F3F4F6", fontSize: "12px" }}>
                            <span>Total: ₹{q.totalAmount?.toLocaleString("en-IN") || 0}</span>
                            <span>Discount: ₹{q.discount?.toLocaleString("en-IN") || 0}</span>
                            <strong style={{ color: "#10B981", fontSize: "13px" }}>
                              Final: ₹{q.finalAmount?.toLocaleString("en-IN") || 0}
                            </strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: ACTIVITIES */}
              {activeTab === "activities" && (
                <ActivityTimeline
                  activities={activities}
                  companyId={companyId}
                  onRefresh={fetch360Data}
                  showToast={showToast}
                />
              )}
            </>
          )}
        </div>

        {/* Modals */}
        {showAddContactModal && (
          <CreateContactModal
            isOpen={showAddContactModal}
            onClose={() => setShowAddContactModal(false)}
            companyId={companyId}
            companyName={company?.name}
            onContactSaved={() => {
              fetch360Data();
              onCompanyUpdated?.();
            }}
            showToast={showToast}
          />
        )}

        {showEditCompanyModal && (
          <CreateCompanyModal
            isOpen={showEditCompanyModal}
            onClose={() => setShowEditCompanyModal(false)}
            companyToEdit={company}
            onCompanySaved={() => {
              fetch360Data();
              onCompanyUpdated?.();
            }}
            showToast={showToast}
          />
        )}

        {showCreateOppModal && (
          <CreateOpportunityModal
            isOpen={showCreateOppModal}
            onClose={() => setShowCreateOppModal(false)}
            initialCompanyId={companyId}
            onOpportunityCreated={() => {
              fetch360Data();
              onCompanyUpdated?.();
            }}
            showToast={showToast}
          />
        )}

        {/* Log Activity Modal */}
        {showLogCallModal && (
          <LogActivityModal
            isOpen={showLogCallModal}
            onClose={() => {
              setShowLogCallModal(false);
              setTargetContactForCall(null);
            }}
            contactId={targetContactForCall?.id}
            companyId={companyId}
            onActivityLogged={() => {
              showToast?.("Activity logged successfully", "success");
              fetch360Data();
            }}
            showToast={showToast}
          />
        )}

        {/* Deactivate Company Confirmation Dialog */}
        {showDeactivateConfirm && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              backdropFilter: "blur(4px)",
              zIndex: 1400,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px"
            }}
            onClick={() => !deactivatingLoading && setShowDeactivateConfirm(false)}
          >
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "14px",
                maxWidth: "420px",
                width: "100%",
                padding: "24px",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px", color: "#DC2626" }}>
                <AlertTriangle size={24} />
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
                  Deactivate Company?
                </h3>
              </div>
              <p style={{ fontSize: "13px", color: "#475569", margin: "0 0 16px 0", lineHeight: 1.5 }}>
                Are you sure you want to deactivate <strong>"{company?.name}"</strong>?
                This account will be marked inactive in the CRM directory.
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowDeactivateConfirm(false)}
                  disabled={deactivatingLoading}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "8px",
                    border: "1px solid #CBD5E1",
                    backgroundColor: "#ffffff",
                    color: "#374151",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeactivate}
                  disabled={deactivatingLoading}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: "#DC2626",
                    color: "#ffffff",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    cursor: deactivatingLoading ? "not-allowed" : "pointer",
                    opacity: deactivatingLoading ? 0.7 : 1
                  }}
                >
                  {deactivatingLoading ? "Deactivating..." : "Yes, Deactivate"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
