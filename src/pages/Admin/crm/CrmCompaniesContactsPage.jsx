import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import {
  Building2,
  Users,
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
  Briefcase,
  Layers,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  RotateCcw,
  User,
  UserPlus,
  Building,
  PhoneCall,
  Calendar,
  AlertTriangle,
  AlertCircle,
  ExternalLink,
  FileSpreadsheet,
  MessageSquare,
  CheckSquare,
  Square,
  Copy,
  FileText,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { crmService } from "../../../services/crmService";
import { Toast } from "../../../components/common/Toast";
import { Company360Drawer } from "../../../components/crm/Company360Drawer";
import { CreateCompanyModal } from "../../../components/crm/CreateCompanyModal";
import { CreateContactModal } from "../../../components/crm/CreateContactModal";
import { LogActivityModal } from "../../../components/crm/LogActivityModal";
import { ExcelLeadImportModal } from "../../../components/crm/ExcelLeadImportModal";
import { LogLeadMessageModal } from "../../../components/crm/LogLeadMessageModal";
import { LeadDetailDrawer } from "../../../components/crm/LeadDetailDrawer";

const SOURCE_BADGES = {
  indiamart: { label: "IndiaMART", bg: "#FFF7ED", color: "#EA580C", border: "#FFEDD5" },
  website: { label: "Website", bg: "#EFF6FF", color: "#2563EB", border: "#DBEAFE" },
  referral: { label: "Referral", bg: "#FAF5FF", color: "#9333EA", border: "#F3E8FF" },
  phone_call: { label: "Cold Call", bg: "#FEFCE8", color: "#CA8A04", border: "#FEF08A" },
  exhibition: { label: "Exhibition", bg: "#ECFDF5", color: "#059669", border: "#A7F3D0" },
  walk_in: { label: "Walk-in", bg: "#F0FDF4", color: "#16A34A", border: "#BBF7D0" },
  social_media: { label: "Social", bg: "#EEF2FF", color: "#4F46E5", border: "#E0E7FF" },
  whatsapp_campaign: { label: "WhatsApp", bg: "#F0FDF4", color: "#15803D", border: "#DCFCE7" },
  campaign_import: { label: "Import", bg: "#F8FAFC", color: "#475569", border: "#E2E8F0" },
  direct: { label: "Direct", bg: "#F1F5F9", color: "#334155", border: "#E2E8F0" }
};

export default function CrmCompaniesContactsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  // Navigation View Tab: "companies" | "contacts" | "imported"
  const [activeTab, setActiveTab] = useState("companies");

  // Data states
  const [companies, setCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Sorting states
  const [companySortField, setCompanySortField] = useState("name"); // name, createdAt, city, contacts, leads
  const [companySortDir, setCompanySortDir] = useState("asc"); // asc | desc

  const [contactSortField, setContactSortField] = useState("name"); // name, companyName, createdAt
  const [contactSortDir, setContactSortDir] = useState("asc"); // asc | desc

  const [importedSortField, setImportedSortField] = useState("importDate"); // name, companyName, importDate
  const [importedSortDir, setImportedSortDir] = useState("desc"); // asc | desc

  // Search & Filter states - Companies
  const [searchQuery, setSearchQuery] = useState("");
  const [industryFilter, setIndustryFilter] = useState("ALL");
  const [companyTypeFilter, setCompanyTypeFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [cityFilter, setCityFilter] = useState("ALL");
  const [companyStatusFilter, setCompanyStatusFilter] = useState("ALL");

  // Search & Filter states - Contacts
  const [contactSearchQuery, setContactSearchQuery] = useState("");
  const [contactCompanyFilter, setContactCompanyFilter] = useState("ALL");
  const [contactPrimaryFilter, setContactPrimaryFilter] = useState("ALL"); // ALL | PRIMARY

  // Search & Filter states - Imported Leads
  const [importedSearchQuery, setImportedSearchQuery] = useState("");
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals & Drawers
  const [drawerCompanyId, setDrawerCompanyId] = useState(null);
  const [drawerLeadId, setDrawerLeadId] = useState(null);
  const [showCreateCompanyModal, setShowCreateCompanyModal] = useState(false);
  const [companyToEdit, setCompanyToEdit] = useState(null);
  const [showCreateContactModal, setShowCreateContactModal] = useState(false);
  const [contactPreselectedCompany, setContactPreselectedCompany] = useState(null);
  const [companyToDeactivate, setCompanyToDeactivate] = useState(null);
  const [deactivatingLoading, setDeactivatingLoading] = useState(false);
  const [showLogCallModal, setShowLogCallModal] = useState(false);
  const [targetContactForCall, setTargetContactForCall] = useState(null);
  const [showExcelImportModal, setShowExcelImportModal] = useState(false);
  const [showLogMessageModal, setShowLogMessageModal] = useState(false);
  const [singleLeadToMessage, setSingleLeadToMessage] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  // Fetch Companies, Contacts and Leads simultaneously
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [compData, contData, leadsData] = await Promise.all([
        crmService.getAllCompanies().catch((err) => {
          console.warn("Companies fetch failed:", err);
          return [];
        }),
        crmService.getAllContacts().catch((err) => {
          console.warn("Contacts fetch failed:", err);
          return [];
        }),
        crmService.getAllLeads().catch((err) => {
          console.warn("Leads fetch failed:", err);
          return [];
        })
      ]);

      const compList = Array.isArray(compData) ? compData : [];
      const contList = Array.isArray(contData) ? contData : [];
      const leadsList = Array.isArray(leadsData) ? leadsData : [];

      setCompanies(compList);
      setContacts(contList);
      setLeads(leadsList);
    } catch (err) {
      console.error("Failed to load CRM companies & contacts data:", err);
      setError(err.message || "Failed to load records from server");
      showToast(err.message || "Failed to load records", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Read URL query params and navigation state (e.g. from Leads page navigation or bookmarks)
  useEffect(() => {
    const tabParam = searchParams.get("tab") || location.state?.tab;
    if (tabParam && ["companies", "contacts", "imported"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
    const companyIdParam = searchParams.get("companyId") || location.state?.companyId;
    if (companyIdParam) {
      setDrawerCompanyId(Number(companyIdParam));
    }
    const leadIdParam = searchParams.get("leadId") || location.state?.selectedLeadId;
    if (leadIdParam) {
      setDrawerLeadId(Number(leadIdParam));
    }
    const searchParam = searchParams.get("search") || location.state?.searchQuery;
    if (searchParam) {
      setSearchQuery(searchParam);
    }
  }, [searchParams, location.state]);

  // Map contacts to their companies for quick lookup
  const contactsByCompanyId = useMemo(() => {
    const map = new Map();
    contacts.forEach((ct) => {
      if (ct.companyId) {
        if (!map.has(ct.companyId)) {
          map.set(ct.companyId, []);
        }
        map.get(ct.companyId).push(ct);
      }
    });
    return map;
  }, [contacts]);

  // Map leads to their companies for quick lookup
  const leadsByCompanyId = useMemo(() => {
    const map = new Map();
    leads.forEach((ld) => {
      if (ld.companyId) {
        if (!map.has(ld.companyId)) {
          map.set(ld.companyId, []);
        }
        map.get(ld.companyId).push(ld);
      }
    });
    return map;
  }, [leads]);

  // Primary contact map for companies
  const primaryContactByCompanyId = useMemo(() => {
    const map = new Map();
    contacts.forEach((ct) => {
      if (ct.companyId) {
        if (!map.has(ct.companyId)) {
          map.set(ct.companyId, ct);
        } else if (ct.isPrimary) {
          map.set(ct.companyId, ct);
        }
      }
    });
    return map;
  }, [contacts]);

  // Derived Imported Leads list (from backend Leads data & local session reference)
  const importedLeads = useMemo(() => {
    let sessions = [];
    try {
      sessions = JSON.parse(localStorage.getItem("crm_excel_imports") || "[]");
    } catch {
      sessions = [];
    }

    const phoneToSessionMap = new Map();
    sessions.forEach((s) => {
      (s.phones || []).forEach((p) => {
        if (p) phoneToSessionMap.set(String(p).replace(/\D/g, "").slice(-10), s);
      });
    });

    const compMap = new Map();
    companies.forEach((c) => {
      if (c.id) compMap.set(c.id, c.name);
    });

    return leads
      .filter((l) => {
        const src = (l.source || "").toLowerCase();
        const hasFile = (l.notes || "").includes("[File:");
        const cleanPhone = String(l.contactPhone || l.phone || "").replace(/\D/g, "").slice(-10);
        const inSession = cleanPhone && phoneToSessionMap.has(cleanPhone);
        return src === "campaign_import" || src === "csv_import" || hasFile || inSession;
      })
      .map((l) => {
        const cleanPhone = String(l.contactPhone || l.phone || "").replace(/\D/g, "").slice(-10);
        const session = cleanPhone ? phoneToSessionMap.get(cleanPhone) : null;
        const fileMatch = (l.notes || "").match(/\[File:\s*([^\]]+)\]/i);
        const fileName = fileMatch ? fileMatch[1].trim() : session ? session.fileName : "Excel_Import.xlsx";

        return {
          ...l,
          contactName: l.contactName || l.title || "Unknown Lead",
          contactPhone: l.contactPhone || l.phone || "",
          companyName: l.companyName || (l.companyId && compMap.get(l.companyId)) || "",
          importFileName: fileName,
          importDate: l.createdAt
        };
      });
  }, [leads, companies]);

  // Filtered Imported Leads
  const filteredImportedLeads = useMemo(() => {
    if (!importedSearchQuery.trim()) return importedLeads;
    const q = importedSearchQuery.toLowerCase().trim();
    return importedLeads.filter((l) => {
      const matchName = (l.contactName || "").toLowerCase().includes(q);
      const matchPhone = (l.contactPhone || "").includes(q);
      const matchCompany = (l.companyName || "").toLowerCase().includes(q);
      const matchFile = (l.importFileName || "").toLowerCase().includes(q);
      return matchName || matchPhone || matchCompany || matchFile;
    });
  }, [importedLeads, importedSearchQuery]);

  const handleSelectAllImported = () => {
    if (selectedLeadIds.length === filteredImportedLeads.length && filteredImportedLeads.length > 0) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredImportedLeads.map((l) => l.id));
    }
  };

  const handleToggleSelectLead = (id) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Summary KPI Metrics derived strictly from real API data
  const metrics = useMemo(() => {
    const totalCompanies = companies.length;
    const activeCompanies = companies.filter((c) => c.active !== false).length;
    const totalContacts = contacts.length;
    const totalImported = importedLeads.length;

    // Recently Added (within last 30 days)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentlyAdded = companies.filter((c) => {
      if (!c.createdAt) return false;
      const t = new Date(c.createdAt).getTime();
      return !isNaN(t) && t >= thirtyDaysAgo;
    }).length;

    return {
      totalCompanies,
      activeCompanies,
      totalContacts,
      totalImported,
      recentlyAdded
    };
  }, [companies, contacts, importedLeads]);

  // Unique lists for company dropdown filters
  const industries = useMemo(() => {
    const set = new Set();
    companies.forEach((c) => {
      if (c.industry && c.industry.trim()) set.add(c.industry.trim());
    });
    return ["ALL", ...Array.from(set).sort()];
  }, [companies]);

  const companyTypes = useMemo(() => {
    const set = new Set();
    companies.forEach((c) => {
      if (c.companyType && c.companyType.trim()) set.add(c.companyType.trim());
    });
    return ["ALL", ...Array.from(set).sort()];
  }, [companies]);

  const sources = useMemo(() => {
    const set = new Set();
    companies.forEach((c) => {
      if (c.source && c.source.trim()) set.add(c.source.trim());
    });
    return ["ALL", ...Array.from(set).sort()];
  }, [companies]);

  const cities = useMemo(() => {
    const set = new Set();
    companies.forEach((c) => {
      if (c.city && c.city.trim()) set.add(c.city.trim());
    });
    return ["ALL", ...Array.from(set).sort()];
  }, [companies]);

  // Helper to render Discovery / Lead Source badge
  const renderSourceBadge = (source) => {
    if (!source) return <span style={{ color: "#94A3B8" }}>—</span>;
    const key = String(source).toLowerCase().trim();
    const cfg = SOURCE_BADGES[key] || {
      label: source.replace(/_/g, " "),
      bg: "#F1F5F9",
      color: "#334155",
      border: "#E2E8F0"
    };
    return (
      <span
        style={{
          display: "inline-block",
          padding: "2px 7px",
          borderRadius: "6px",
          fontSize: "11px",
          fontWeight: 600,
          backgroundColor: cfg.bg,
          color: cfg.color,
          border: `1px solid ${cfg.border}`,
          whiteSpace: "nowrap"
        }}
      >
        {cfg.label}
      </span>
    );
  };

  // Filtered Companies
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      if (industryFilter !== "ALL" && (c.industry || "").toUpperCase() !== industryFilter.toUpperCase()) {
        return false;
      }
      if (companyTypeFilter !== "ALL" && (c.companyType || "").toUpperCase() !== companyTypeFilter.toUpperCase()) {
        return false;
      }
      if (sourceFilter !== "ALL" && (c.source || "").toLowerCase() !== sourceFilter.toLowerCase()) {
        return false;
      }
      if (cityFilter !== "ALL" && (c.city || "").toUpperCase() !== cityFilter.toUpperCase()) {
        return false;
      }
      if (companyStatusFilter === "ACTIVE" && c.active === false) {
        return false;
      }
      if (companyStatusFilter === "INACTIVE" && c.active !== false) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (c.name || c.companyName || "").toLowerCase().includes(q);
        const matchInd = (c.industry || "").toLowerCase().includes(q);
        const matchType = (c.companyType || "").toLowerCase().includes(q);
        const matchSource = (c.source || "").toLowerCase().includes(q);
        const matchCity = (c.city || "").toLowerCase().includes(q);
        const matchState = (c.state || "").toLowerCase().includes(q);
        const matchPhone = (c.phone || "").toLowerCase().includes(q);
        const matchEmail = (c.email || "").toLowerCase().includes(q);
        const matchGst = (c.gstNumber || "").toLowerCase().includes(q);
        const matchOwner = (c.ownerAdminName || "").toLowerCase().includes(q);
        if (
          !matchName &&
          !matchInd &&
          !matchType &&
          !matchSource &&
          !matchCity &&
          !matchState &&
          !matchPhone &&
          !matchEmail &&
          !matchGst &&
          !matchOwner
        ) {
          return false;
        }
      }
      return true;
    });
  }, [companies, industryFilter, companyTypeFilter, sourceFilter, cityFilter, companyStatusFilter, searchQuery]);

  // Filtered Contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter((ct) => {
      if (contactCompanyFilter !== "ALL" && String(ct.companyId) !== String(contactCompanyFilter)) {
        return false;
      }
      if (contactPrimaryFilter === "PRIMARY" && !ct.isPrimary) {
        return false;
      }
      if (contactSearchQuery.trim()) {
        const q = contactSearchQuery.toLowerCase().trim();
        const matchName = (ct.name || "").toLowerCase().includes(q);
        const matchPhone = (ct.phone || "").toLowerCase().includes(q);
        const matchEmail = (ct.email || "").toLowerCase().includes(q);
        const matchDesig = (ct.designation || "").toLowerCase().includes(q);
        const matchComp = (ct.companyName || "").toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchEmail && !matchDesig && !matchComp) {
          return false;
        }
      }
      return true;
    });
  }, [contacts, contactCompanyFilter, contactPrimaryFilter, contactSearchQuery]);

  // Sort toggle helpers
  const handleToggleCompanySort = (field) => {
    if (companySortField === field) {
      setCompanySortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setCompanySortField(field);
      setCompanySortDir("asc");
    }
  };

  const handleToggleContactSort = (field) => {
    if (contactSortField === field) {
      setContactSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setContactSortField(field);
      setContactSortDir("asc");
    }
  };

  const handleToggleImportedSort = (field) => {
    if (importedSortField === field) {
      setImportedSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setImportedSortField(field);
      setImportedSortDir("asc");
    }
  };

  // Sorted Companies
  const sortedCompanies = useMemo(() => {
    return [...filteredCompanies].sort((a, b) => {
      let comparison = 0;
      if (companySortField === "name") {
        comparison = (a.name || "").localeCompare(b.name || "");
      } else if (companySortField === "city") {
        comparison = (a.city || "").localeCompare(b.city || "");
      } else if (companySortField === "createdAt") {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        comparison = timeA - timeB;
      } else if (companySortField === "contacts") {
        const countA = contactsByCompanyId.get(a.id)?.length || 0;
        const countB = contactsByCompanyId.get(b.id)?.length || 0;
        comparison = countA - countB;
      } else if (companySortField === "leads") {
        const countA = leadsByCompanyId.get(a.id)?.length || 0;
        const countB = leadsByCompanyId.get(b.id)?.length || 0;
        comparison = countA - countB;
      }
      return companySortDir === "asc" ? comparison : -comparison;
    });
  }, [filteredCompanies, companySortField, companySortDir, contactsByCompanyId, leadsByCompanyId]);

  // Sorted Contacts
  const sortedContacts = useMemo(() => {
    return [...filteredContacts].sort((a, b) => {
      let comparison = 0;
      if (contactSortField === "name") {
        comparison = (a.name || "").localeCompare(b.name || "");
      } else if (contactSortField === "companyName") {
        comparison = (a.companyName || "").localeCompare(b.companyName || "");
      } else if (contactSortField === "createdAt") {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        comparison = timeA - timeB;
      }
      return contactSortDir === "asc" ? comparison : -comparison;
    });
  }, [filteredContacts, contactSortField, contactSortDir]);

  // Sorted Imported Leads
  const sortedImportedLeads = useMemo(() => {
    return [...filteredImportedLeads].sort((a, b) => {
      let comparison = 0;
      if (importedSortField === "name") {
        comparison = (a.contactName || "").localeCompare(b.contactName || "");
      } else if (importedSortField === "companyName") {
        comparison = (a.companyName || "").localeCompare(b.companyName || "");
      } else if (importedSortField === "importDate") {
        const timeA = (a.importDate || a.createdAt) ? new Date(a.importDate || a.createdAt).getTime() : 0;
        const timeB = (b.importDate || b.createdAt) ? new Date(b.importDate || b.createdAt).getTime() : 0;
        comparison = timeA - timeB;
      }
      return importedSortDir === "asc" ? comparison : -comparison;
    });
  }, [filteredImportedLeads, importedSortField, importedSortDir]);

  // Reset pagination on tab or filter or sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    activeTab,
    searchQuery,
    industryFilter,
    companyTypeFilter,
    sourceFilter,
    cityFilter,
    companyStatusFilter,
    contactSearchQuery,
    contactCompanyFilter,
    contactPrimaryFilter,
    importedSearchQuery,
    companySortField,
    companySortDir,
    contactSortField,
    contactSortDir,
    importedSortField,
    importedSortDir
  ]);

  // Active records based on tab
  const activeRecords =
    activeTab === "companies"
      ? sortedCompanies
      : activeTab === "contacts"
      ? sortedContacts
      : sortedImportedLeads;
  const totalPages = Math.ceil(activeRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return activeRecords.slice(start, start + pageSize);
  }, [activeRecords, currentPage, pageSize]);

  // Deactivate Company handler
  const handleConfirmDeactivate = async () => {
    if (!companyToDeactivate?.id) return;
    setDeactivatingLoading(true);
    try {
      await crmService.deactivateCompany(companyToDeactivate.id);
      showToast(`Company "${companyToDeactivate.name}" deactivated successfully`, "success");
      setCompanyToDeactivate(null);
      await fetchData();
    } catch (err) {
      console.error("Failed to deactivate company:", err);
      showToast(err.message || "Failed to deactivate company", "error");
    } finally {
      setDeactivatingLoading(false);
    }
  };

  // Clear filters
  const handleClearFilters = () => {
    if (activeTab === "companies") {
      setSearchQuery("");
      setIndustryFilter("ALL");
      setCompanyTypeFilter("ALL");
      setSourceFilter("ALL");
      setCityFilter("ALL");
      setCompanyStatusFilter("ALL");
    } else if (activeTab === "contacts") {
      setContactSearchQuery("");
      setContactCompanyFilter("ALL");
      setContactPrimaryFilter("ALL");
    } else {
      setImportedSearchQuery("");
      setSelectedLeadIds([]);
    }
  };

  const isImportedFilterActive = importedSearchQuery.trim() !== "";

  const isCompanyFilterActive =
    searchQuery.trim() !== "" ||
    industryFilter !== "ALL" ||
    companyTypeFilter !== "ALL" ||
    sourceFilter !== "ALL" ||
    cityFilter !== "ALL" ||
    companyStatusFilter !== "ALL";

  const isContactFilterActive =
    contactSearchQuery.trim() !== "" ||
    contactCompanyFilter !== "ALL" ||
    contactPrimaryFilter !== "ALL";

  // Date formatter helper
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

  return (
    <div style={{ maxWidth: "1600px", margin: "0 auto", padding: "20px 24px", minHeight: "100vh", backgroundColor: "#F9FAFB" }}>
      {/* Toast notifications */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* 1. Page Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "20px"
        }}
      >
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#0F172A", margin: 0, letterSpacing: "-0.02em" }}>
            Companies & Contacts
          </h1>
          <p style={{ fontSize: "13.5px", color: "#64748B", margin: "4px 0 0 0" }}>
            Manage your business accounts and customer contacts in one place.
          </p>
        </div>

        {/* Primary Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={() => {
              setCompanyToEdit(null);
              setShowCreateCompanyModal(true);
            }}
            style={{
              padding: "9px 18px",
              borderRadius: "8px",
              backgroundColor: "#27C786",
              color: "#ffffff",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 6px rgba(39, 199, 134, 0.25)",
              transition: "all 0.15s ease"
            }}
          >
            <Plus size={16} />
            <span>+ Add Company</span>
          </button>

          <button
            onClick={() => {
              setContactPreselectedCompany(null);
              setShowCreateContactModal(true);
            }}
            style={{
              padding: "9px 16px",
              borderRadius: "8px",
              backgroundColor: "#ffffff",
              color: "#0F172A",
              border: "1px solid #CBD5E1",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
              transition: "all 0.15s ease"
            }}
          >
            <UserPlus size={15} color="#27C786" />
            <span>+ Add Contact</span>
          </button>

          <button
            onClick={() => setShowExcelImportModal(true)}
            style={{
              padding: "9px 18px",
              borderRadius: "8px",
              backgroundColor: "#10B981",
              color: "#ffffff",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "7px",
              boxShadow: "0 2px 6px rgba(16, 185, 129, 0.25)",
              transition: "all 0.15s ease"
            }}
          >
            <FileSpreadsheet size={16} />
            <span>Import Excel</span>
          </button>

          <button
            onClick={fetchData}
            disabled={loading}
            title="Refresh Directory"
            style={{
              padding: "9px 12px",
              borderRadius: "8px",
              backgroundColor: "#ffffff",
              border: "1px solid #CBD5E1",
              color: "#475569",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease"
            }}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* 2. Compact Summary Metric Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "14px",
          marginBottom: "20px"
        }}
      >
        {/* Card 1: Total Companies */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            padding: "16px 18px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.03)",
            display: "flex",
            alignItems: "center",
            gap: "14px"
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              backgroundColor: "#F0FDF4",
              color: "#27C786",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Building2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 500, color: "#64748B" }}>Total Companies</div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>
              {loading ? "..." : metrics.totalCompanies.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Card 2: Active Accounts */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            padding: "16px 18px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.03)",
            display: "flex",
            alignItems: "center",
            gap: "14px"
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              backgroundColor: "#ECFDF5",
              color: "#10B981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 500, color: "#64748B" }}>Active Accounts</div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "#10B981", marginTop: "2px" }}>
              {loading ? "..." : metrics.activeCompanies.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Card 3: Total Contacts */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            padding: "16px 18px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.03)",
            display: "flex",
            alignItems: "center",
            gap: "14px"
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              backgroundColor: "#EFF6FF",
              color: "#2563EB",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Users size={20} />
          </div>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 500, color: "#64748B" }}>Total Contacts</div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "#2563EB", marginTop: "2px" }}>
              {loading ? "..." : metrics.totalContacts.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Card 4: Recently Added */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            padding: "16px 18px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.03)",
            display: "flex",
            alignItems: "center",
            gap: "14px"
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              backgroundColor: "#FAF5FF",
              color: "#9333EA",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Calendar size={20} />
          </div>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 500, color: "#64748B" }}>New (Last 30 Days)</div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "#9333EA", marginTop: "2px" }}>
              {loading ? "..." : metrics.recentlyAdded.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Sub-View Navigation Tabs */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #E2E8F0",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "10px"
        }}
      >
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setActiveTab("companies")}
            style={{
              padding: "10px 18px",
              borderRadius: "8px 8px 0 0",
              border: "none",
              borderBottom: activeTab === "companies" ? "3px solid #27C786" : "3px solid transparent",
              backgroundColor: activeTab === "companies" ? "#ffffff" : "transparent",
              color: activeTab === "companies" ? "#0F172A" : "#64748B",
              fontSize: "13.5px",
              fontWeight: activeTab === "companies" ? 700 : 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.15s ease"
            }}
          >
            <Building2 size={16} color={activeTab === "companies" ? "#27C786" : "#94A3B8"} />
            <span>Companies</span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                padding: "2px 7px",
                borderRadius: "10px",
                backgroundColor: activeTab === "companies" ? "#E8F9F1" : "#F1F5F9",
                color: activeTab === "companies" ? "#1B8756" : "#64748B"
              }}
            >
              {filteredCompanies.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("contacts")}
            style={{
              padding: "10px 18px",
              borderRadius: "8px 8px 0 0",
              border: "none",
              borderBottom: activeTab === "contacts" ? "3px solid #27C786" : "3px solid transparent",
              backgroundColor: activeTab === "contacts" ? "#ffffff" : "transparent",
              color: activeTab === "contacts" ? "#0F172A" : "#64748B",
              fontSize: "13.5px",
              fontWeight: activeTab === "contacts" ? 700 : 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.15s ease"
            }}
          >
            <Users size={16} color={activeTab === "contacts" ? "#27C786" : "#94A3B8"} />
            <span>Contacts</span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                padding: "2px 7px",
                borderRadius: "10px",
                backgroundColor: activeTab === "contacts" ? "#E8F9F1" : "#F1F5F9",
                color: activeTab === "contacts" ? "#1B8756" : "#64748B"
              }}
            >
              {filteredContacts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("imported")}
            style={{
              padding: "10px 18px",
              borderRadius: "8px 8px 0 0",
              border: "none",
              borderBottom: activeTab === "imported" ? "3px solid #10B981" : "3px solid transparent",
              backgroundColor: activeTab === "imported" ? "#ffffff" : "transparent",
              color: activeTab === "imported" ? "#0F172A" : "#64748B",
              fontSize: "13.5px",
              fontWeight: activeTab === "imported" ? 700 : 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.15s ease"
            }}
          >
            <FileSpreadsheet size={16} color={activeTab === "imported" ? "#10B981" : "#94A3B8"} />
            <span>Imported Leads</span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                padding: "2px 7px",
                borderRadius: "10px",
                backgroundColor: activeTab === "imported" ? "#ECFDF5" : "#F1F5F9",
                color: activeTab === "imported" ? "#059669" : "#64748B"
              }}
            >
              {filteredImportedLeads.length}
            </span>
          </button>
        </div>
      </div>

      {/* 4. Search & Filter Bar */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          border: "1px solid #E2E8F0",
          padding: "12px 16px",
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px"
        }}
      >
        {activeTab === "companies" ? (
          // Companies Search & Filters
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", flex: 1 }}>
              <div style={{ position: "relative", minWidth: "240px", maxWidth: "340px", flex: 1 }}>
                <Search size={14} color="#94A3B8" style={{ position: "absolute", left: "10px", top: "10px" }} />
                <input
                  type="text"
                  placeholder="Search by company, phone, email, city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px 8px 32px",
                    borderRadius: "8px",
                    border: "1px solid #CBD5E1",
                    fontSize: "12.5px",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              {/* Industry Filter */}
              <select
                value={industryFilter}
                onChange={(e) => setIndustryFilter(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  fontSize: "12.5px",
                  backgroundColor: "#ffffff",
                  color: "#334155"
                }}
              >
                <option value="ALL">All Industries</option>
                {industries.filter((i) => i !== "ALL").map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>

              {/* Company Type Filter */}
              <select
                value={companyTypeFilter}
                onChange={(e) => setCompanyTypeFilter(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  fontSize: "12.5px",
                  backgroundColor: "#ffffff",
                  color: "#334155"
                }}
              >
                <option value="ALL">All Types</option>
                {companyTypes.filter((t) => t !== "ALL").map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, " ")}
                  </option>
                ))}
              </select>

              {/* Source Filter */}
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  fontSize: "12.5px",
                  backgroundColor: "#ffffff",
                  color: "#334155"
                }}
              >
                <option value="ALL">All Sources</option>
                {sources.filter((s) => s !== "ALL").map((src) => (
                  <option key={src} value={src}>
                    {SOURCE_BADGES[src.toLowerCase()]?.label || src.replace(/_/g, " ")}
                  </option>
                ))}
              </select>

              {/* City Filter */}
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  fontSize: "12.5px",
                  backgroundColor: "#ffffff",
                  color: "#334155"
                }}
              >
                <option value="ALL">All Cities</option>
                {cities.filter((c) => c !== "ALL").map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={companyStatusFilter}
                onChange={(e) => setCompanyStatusFilter(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  fontSize: "12.5px",
                  backgroundColor: "#ffffff",
                  color: "#334155"
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Inactive Only</option>
              </select>

              {/* Company Sort Dropdown */}
              <select
                value={`${companySortField}_${companySortDir}`}
                onChange={(e) => {
                  const [f, d] = e.target.value.split("_");
                  setCompanySortField(f);
                  setCompanySortDir(d);
                }}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  fontSize: "12.5px",
                  backgroundColor: "#ffffff",
                  color: "#334155"
                }}
              >
                <option value="name_asc">Sort: Name (A-Z)</option>
                <option value="name_desc">Sort: Name (Z-A)</option>
                <option value="createdAt_desc">Sort: Newest Added</option>
                <option value="createdAt_asc">Sort: Oldest Added</option>
                <option value="city_asc">Sort: City (A-Z)</option>
                <option value="contacts_desc">Sort: Most Contacts</option>
                <option value="leads_desc">Sort: Most Leads</option>
              </select>

              {isCompanyFilterActive && (
                <button
                  onClick={handleClearFilters}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid #CBD5E1",
                    backgroundColor: "#F1F5F9",
                    color: "#475569",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  <RotateCcw size={13} />
                  <span>Clear Filters</span>
                </button>
              )}
            </div>
          </>
        ) : (
          // Contacts Search & Filters
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", flex: 1 }}>
              <div style={{ position: "relative", minWidth: "240px", maxWidth: "340px", flex: 1 }}>
                <Search size={14} color="#94A3B8" style={{ position: "absolute", left: "10px", top: "10px" }} />
                <input
                  type="text"
                  placeholder="Search by contact, company, phone, email..."
                  value={contactSearchQuery}
                  onChange={(e) => setContactSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px 8px 32px",
                    borderRadius: "8px",
                    border: "1px solid #CBD5E1",
                    fontSize: "12.5px",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              {/* Company Filter for Contacts */}
              <select
                value={contactCompanyFilter}
                onChange={(e) => setContactCompanyFilter(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  fontSize: "12.5px",
                  backgroundColor: "#ffffff",
                  color: "#334155",
                  maxWidth: "260px"
                }}
              >
                <option value="ALL">All Associated Companies</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Primary Contact Filter */}
              <select
                value={contactPrimaryFilter}
                onChange={(e) => setContactPrimaryFilter(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  fontSize: "12.5px",
                  backgroundColor: "#ffffff",
                  color: "#334155"
                }}
              >
                <option value="ALL">All Contacts</option>
                <option value="PRIMARY">Primary Contacts Only</option>
              </select>

              {/* Contact Sort Dropdown */}
              <select
                value={`${contactSortField}_${contactSortDir}`}
                onChange={(e) => {
                  const [f, d] = e.target.value.split("_");
                  setContactSortField(f);
                  setContactSortDir(d);
                }}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  fontSize: "12.5px",
                  backgroundColor: "#ffffff",
                  color: "#334155"
                }}
              >
                <option value="name_asc">Sort: Name (A-Z)</option>
                <option value="name_desc">Sort: Name (Z-A)</option>
                <option value="companyName_asc">Sort: Company (A-Z)</option>
                <option value="createdAt_desc">Sort: Newest Added</option>
                <option value="createdAt_asc">Sort: Oldest Added</option>
              </select>

              {isContactFilterActive && (
                <button
                  onClick={handleClearFilters}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid #CBD5E1",
                    backgroundColor: "#F1F5F9",
                    color: "#475569",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  <RotateCcw size={13} />
                  <span>Clear Filters</span>
                </button>
              )}
            </div>
          </>
        )}

        {/* Imported Leads Filter Bar */}
        {activeTab === "imported" && (
          <>
            <div style={{ position: "relative", minWidth: "280px", flex: 1, maxWidth: "480px" }}>
              <Search
                size={16}
                color="#94A3B8"
                style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
              />
              <input
                type="text"
                placeholder="Search by contact name, mobile number, company, or file name..."
                value={importedSearchQuery}
                onChange={(e) => setImportedSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px 8px 36px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  fontSize: "13px",
                  outline: "none",
                  backgroundColor: "#ffffff",
                  transition: "border-color 0.15s ease"
                }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              {isImportedFilterActive && (
                <button
                  onClick={handleClearFilters}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid #CBD5E1",
                    backgroundColor: "#F1F5F9",
                    color: "#475569",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  <RotateCcw size={13} />
                  <span>Clear Filter</span>
                </button>
              )}

              <button
                onClick={() => setShowExcelImportModal(true)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  backgroundColor: "#10B981",
                  color: "#ffffff",
                  border: "none",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 1px 3px rgba(16, 185, 129, 0.2)"
                }}
              >
                <FileSpreadsheet size={15} />
                <span>+ Upload Another File</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Selection Action Toolbar for Imported Leads */}
      {activeTab === "imported" && selectedLeadIds.length > 0 && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px 18px",
            borderRadius: "10px",
            backgroundColor: "#EFF6FF",
            border: "1px solid #BFDBFE",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            boxShadow: "0 2px 4px rgba(37, 99, 235, 0.08)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "50%",
                backgroundColor: "#2563EB",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: 700
              }}
            >
              {selectedLeadIds.length}
            </span>
            <span style={{ fontSize: "13.5px", fontWeight: 600, color: "#1E3A8A" }}>
              {selectedLeadIds.length} contact{selectedLeadIds.length > 1 ? "s" : ""} selected for message logging
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={() => setSelectedLeadIds([])}
              style={{
                padding: "7px 14px",
                borderRadius: "6px",
                border: "1px solid #CBD5E1",
                backgroundColor: "#ffffff",
                color: "#475569",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Deselect All
            </button>

            <button
              onClick={() => setShowLogMessageModal(true)}
              style={{
                padding: "8px 18px",
                borderRadius: "8px",
                backgroundColor: "#2563EB",
                color: "#ffffff",
                border: "none",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "7px",
                boxShadow: "0 2px 6px rgba(37, 99, 235, 0.25)"
              }}
            >
              <MessageSquare size={15} />
              <span>Message / Log Message ({selectedLeadIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. Error state with retry */}
      {error && !loading && (
        <div
          style={{
            marginBottom: "16px",
            padding: "14px 18px",
            borderRadius: "10px",
            backgroundColor: "#FEF2F2",
            border: "1px solid #FECACA",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#991B1B",
            fontSize: "13px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <AlertCircle size={18} color="#DC2626" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchData}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              backgroundColor: "#DC2626",
              color: "#fff",
              border: "none",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Retry Request
          </button>
        </div>
      )}

      {/* 6. Main Data Tables Container */}
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
          {activeTab === "companies" ? (
            // ==================== TAB 1: COMPANIES TABLE ====================
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid #E2E8F0", textAlign: "left", color: "#64748B" }}>
                  <th
                    style={{ padding: "12px 16px", fontWeight: 600, cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleToggleCompanySort("name")}
                    title="Sort by Company Name"
                  >
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <span>COMPANY NAME</span>
                      {companySortField === "name" ? (
                        companySortDir === "asc" ? <ArrowUp size={13} color="#27C786" /> : <ArrowDown size={13} color="#27C786" />
                      ) : (
                        <ArrowUpDown size={12} color="#CBD5E1" />
                      )}
                    </div>
                  </th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>INDUSTRY & TYPE</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>ACCOUNT OWNER</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>SOURCE</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>PRIMARY CONTACT</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>PHONE & EMAIL</th>
                  <th
                    style={{ padding: "12px 16px", fontWeight: 600, cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleToggleCompanySort("city")}
                    title="Sort by City / Location"
                  >
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <span>LOCATION</span>
                      {companySortField === "city" ? (
                        companySortDir === "asc" ? <ArrowUp size={13} color="#27C786" /> : <ArrowDown size={13} color="#27C786" />
                      ) : (
                        <ArrowUpDown size={12} color="#CBD5E1" />
                      )}
                    </div>
                  </th>
                  <th
                    style={{ padding: "12px 16px", fontWeight: 600, textAlign: "center", cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleToggleCompanySort("contacts")}
                    title="Sort by Contacts Count"
                  >
                    <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                      <span>CONTACTS</span>
                      {companySortField === "contacts" ? (
                        companySortDir === "asc" ? <ArrowUp size={13} color="#27C786" /> : <ArrowDown size={13} color="#27C786" />
                      ) : (
                        <ArrowUpDown size={12} color="#CBD5E1" />
                      )}
                    </div>
                  </th>
                  <th
                    style={{ padding: "12px 16px", fontWeight: 600, textAlign: "center", cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleToggleCompanySort("leads")}
                    title="Sort by Associated Leads Count"
                  >
                    <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                      <span>LEADS</span>
                      {companySortField === "leads" ? (
                        companySortDir === "asc" ? <ArrowUp size={13} color="#27C786" /> : <ArrowDown size={13} color="#27C786" />
                      ) : (
                        <ArrowUpDown size={12} color="#CBD5E1" />
                      )}
                    </div>
                  </th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>STATUS</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1, 2, 3, 4, 5, 6].map((idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ width: "140px", height: "14px", backgroundColor: "#E2E8F0", borderRadius: "4px" }} />
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ width: "90px", height: "14px", backgroundColor: "#E2E8F0", borderRadius: "4px" }} />
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ width: "80px", height: "14px", backgroundColor: "#E2E8F0", borderRadius: "4px" }} />
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ width: "70px", height: "14px", backgroundColor: "#E2E8F0", borderRadius: "4px" }} />
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ width: "100px", height: "14px", backgroundColor: "#E2E8F0", borderRadius: "4px" }} />
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ width: "110px", height: "14px", backgroundColor: "#E2E8F0", borderRadius: "4px" }} />
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ width: "70px", height: "14px", backgroundColor: "#E2E8F0", borderRadius: "4px" }} />
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <div style={{ width: "24px", height: "14px", backgroundColor: "#E2E8F0", borderRadius: "4px", margin: "0 auto" }} />
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ width: "50px", height: "14px", backgroundColor: "#E2E8F0", borderRadius: "4px" }} />
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <div style={{ width: "60px", height: "14px", backgroundColor: "#E2E8F0", borderRadius: "4px", marginLeft: "auto" }} />
                      </td>
                    </tr>
                  ))
                ) : filteredCompanies.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: "50px 20px", textAlign: "center", color: "#64748B" }}>
                      <Building2 size={40} color="#CBD5E1" style={{ margin: "0 auto 12px" }} />
                      <h4 style={{ margin: "0 0 4px 0", fontSize: "16px", color: "#0F172A", fontWeight: 700 }}>
                        {isCompanyFilterActive ? "No matching companies found" : "No companies added yet"}
                      </h4>
                      <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#64748B" }}>
                        {isCompanyFilterActive
                          ? "Try adjusting your search query or clearing selected filters."
                          : "Get started by adding your first enterprise client or distributor account."}
                      </p>
                      {isCompanyFilterActive ? (
                        <button
                          onClick={handleClearFilters}
                          style={{
                            padding: "8px 16px",
                            borderRadius: "8px",
                            backgroundColor: "#27C786",
                            color: "#fff",
                            border: "none",
                            fontSize: "12.5px",
                            fontWeight: 600,
                            cursor: "pointer"
                          }}
                        >
                          Clear Filters
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setCompanyToEdit(null);
                            setShowCreateCompanyModal(true);
                          }}
                          style={{
                            padding: "8px 18px",
                            borderRadius: "8px",
                            backgroundColor: "#27C786",
                            color: "#fff",
                            border: "none",
                            fontSize: "12.5px",
                            fontWeight: 600,
                            cursor: "pointer"
                          }}
                        >
                          + Add First Company
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((comp) => {
                    const primaryContact = primaryContactByCompanyId.get(comp.id);
                    const compContacts = contactsByCompanyId.get(comp.id) || [];
                    const compLeads = leadsByCompanyId.get(comp.id) || [];
                    const isActive = comp.active !== false;

                    return (
                      <tr
                        key={comp.id}
                        style={{
                          borderBottom: "1px solid #F1F5F9",
                          transition: "background-color 0.15s ease"
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F8FAFC")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        {/* Company Name */}
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "8px",
                                backgroundColor: "#F1F5F9",
                                color: "#475569",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0
                              }}
                            >
                              <Building2 size={16} />
                            </div>
                            <div>
                              <div
                                onClick={() => setDrawerCompanyId(comp.id)}
                                style={{
                                  fontWeight: 600,
                                  color: "#0F172A",
                                  cursor: "pointer",
                                  textDecoration: "none"
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = "#27C786")}
                                onMouseLeave={(e) => (e.currentTarget.style.color = "#0F172A")}
                                title="Click to view 360° profile"
                              >
                                {comp.name}
                              </div>
                              {comp.gstNumber && (
                                <div style={{ fontSize: "11px", color: "#64748B", marginTop: "1px" }}>
                                  GST: {comp.gstNumber}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Industry & Type */}
                        <td style={{ padding: "12px 16px", color: "#334155" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "3px", alignItems: "flex-start" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 7px",
                                borderRadius: "5px",
                                backgroundColor: "#F1F5F9",
                                color: "#334155",
                                fontSize: "11px",
                                fontWeight: 600
                              }}
                            >
                              {comp.industry || "General"}
                            </span>
                            {comp.companyType && (
                              <span style={{ fontSize: "11px", color: "#64748B" }}>
                                {comp.companyType.replace(/_/g, " ")}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Account Owner */}
                        <td style={{ padding: "12px 16px", color: "#334155" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12.5px" }}>
                            <User size={13} color="#94A3B8" />
                            <span style={{ fontWeight: 500, color: comp.ownerAdminName ? "#0F172A" : "#94A3B8" }}>
                              {comp.ownerAdminName || "Unassigned"}
                            </span>
                          </div>
                        </td>

                        {/* Lead / Account Source */}
                        <td style={{ padding: "12px 16px" }}>
                          {renderSourceBadge(comp.source)}
                        </td>

                        {/* Primary Contact */}
                        <td style={{ padding: "12px 16px", color: "#334155" }}>
                          {primaryContact ? (
                            <div>
                              <div style={{ fontWeight: 600, color: "#0F172A" }}>{primaryContact.name}</div>
                              {primaryContact.designation && (
                                <div style={{ fontSize: "11px", color: "#64748B" }}>
                                  {primaryContact.designation}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: "#94A3B8" }}>No primary contact</span>
                          )}
                        </td>

                        {/* Phone & Email */}
                        <td style={{ padding: "12px 16px", color: "#334155" }}>
                          {comp.phone || primaryContact?.phone ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <Phone size={11} color="#64748B" />
                              <a
                                href={`tel:${comp.phone || primaryContact?.phone}`}
                                style={{ color: "#334155", textDecoration: "none" }}
                              >
                                {comp.phone || primaryContact?.phone}
                              </a>
                            </div>
                          ) : null}
                          {comp.email || primaryContact?.email ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "2px", fontSize: "11.5px" }}>
                              <Mail size={11} color="#64748B" />
                              <a
                                href={`mailto:${comp.email || primaryContact?.email}`}
                                style={{ color: "#2563EB", textDecoration: "none" }}
                              >
                                {comp.email || primaryContact?.email}
                              </a>
                            </div>
                          ) : null}
                          {!comp.phone && !comp.email && !primaryContact && (
                            <span style={{ color: "#94A3B8" }}>—</span>
                          )}
                        </td>

                        {/* City / Location */}
                        <td style={{ padding: "12px 16px", color: "#64748B" }}>
                          {comp.city || comp.state ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <MapPin size={12} color="#94A3B8" />
                              <span>{[comp.city, comp.state].filter(Boolean).join(", ")}</span>
                            </div>
                          ) : (
                            <span>—</span>
                          )}
                        </td>

                        {/* Contacts Count */}
                        <td style={{ padding: "12px 16px", textAlign: "center" }}>
                          <span
                            onClick={() => {
                              setActiveTab("contacts");
                              setContactCompanyFilter(String(comp.id));
                            }}
                            title="Click to view contacts for this company"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "2px 8px",
                              borderRadius: "12px",
                              backgroundColor: compContacts.length > 0 ? "#EFF6FF" : "#F1F5F9",
                              color: compContacts.length > 0 ? "#2563EB" : "#64748B",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer"
                            }}
                          >
                            <Users size={11} />
                            <span>{compContacts.length}</span>
                          </span>
                        </td>

                        {/* Leads Count with Redirect to Leads Page */}
                        <td style={{ padding: "12px 16px", textAlign: "center" }}>
                          <span
                            onClick={() => {
                              navigate(`/dashboard/crm/leads?company=${encodeURIComponent(comp.name)}&companyId=${comp.id}`, {
                                state: { companyId: comp.id, companyName: comp.name, searchQuery: comp.name }
                              });
                            }}
                            title="Click to view leads for this company on CRM Leads page"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "2px 8px",
                              borderRadius: "12px",
                              backgroundColor: compLeads.length > 0 ? "#ECFDF5" : "#F1F5F9",
                              color: compLeads.length > 0 ? "#059669" : "#64748B",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer"
                            }}
                          >
                            <span>{compLeads.length}</span>
                            <ExternalLink size={10} />
                          </span>
                        </td>

                        {/* Status */}
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: "12px",
                              backgroundColor: isActive ? "#DCFCE7" : "#F1F5F9",
                              color: isActive ? "#16A34A" : "#64748B",
                              fontSize: "11.5px",
                              fontWeight: 600
                            }}
                          >
                            {isActive ? "Active" : "Inactive"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                            {/* View 360° Drawer */}
                            <button
                              onClick={() => setDrawerCompanyId(comp.id)}
                              title="Open 360° Profile"
                              style={{
                                padding: "5px 8px",
                                borderRadius: "6px",
                                backgroundColor: "#F1F5F9",
                                border: "1px solid #CBD5E1",
                                color: "#2563EB",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                fontSize: "11.5px",
                                fontWeight: 600
                              }}
                            >
                              <Eye size={12} />
                              <span>360°</span>
                            </button>

                            {/* View Leads Link */}
                            <button
                              onClick={() => {
                                navigate(`/dashboard/crm/leads?company=${encodeURIComponent(comp.name)}&companyId=${comp.id}`, {
                                  state: { companyId: comp.id, companyName: comp.name, searchQuery: comp.name }
                                });
                              }}
                              title="View Associated Leads on CRM Leads Page"
                              style={{
                                padding: "5px 8px",
                                borderRadius: "6px",
                                backgroundColor: "#ECFDF5",
                                border: "1px solid #A7F3D0",
                                color: "#059669",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                fontSize: "11.5px",
                                fontWeight: 600
                              }}
                            >
                              <ExternalLink size={11} />
                              <span>Leads</span>
                            </button>

                            {/* Edit Company */}
                            <button
                              onClick={() => {
                                setCompanyToEdit(comp);
                                setShowCreateCompanyModal(true);
                              }}
                              title="Edit Company Details"
                              style={{
                                padding: "5px",
                                borderRadius: "6px",
                                backgroundColor: "#ffffff",
                                border: "1px solid #CBD5E1",
                                color: "#475569",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center"
                              }}
                            >
                              <Edit2 size={13} />
                            </button>

                            {/* Add Contact */}
                            <button
                              onClick={() => {
                                setContactPreselectedCompany({ id: comp.id, name: comp.name });
                                setShowCreateContactModal(true);
                              }}
                              title="Add Contact to this Company"
                              style={{
                                padding: "5px",
                                borderRadius: "6px",
                                backgroundColor: "#ffffff",
                                border: "1px solid #CBD5E1",
                                color: "#27C786",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center"
                              }}
                            >
                              <UserPlus size={13} />
                            </button>

                            {/* Deactivate Company */}
                            {isActive && (
                              <button
                                onClick={() => setCompanyToDeactivate(comp)}
                                title="Deactivate Company"
                                style={{
                                  padding: "5px",
                                  borderRadius: "6px",
                                  backgroundColor: "#ffffff",
                                  border: "1px solid #CBD5E1",
                                  color: "#DC2626",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center"
                                }}
                              >
                                <Trash2 size={13} />
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
          ) : activeTab === "contacts" ? (
            // ==================== TAB 2: CONTACTS TABLE ====================
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid #E2E8F0", textAlign: "left", color: "#64748B" }}>
                  <th
                    onClick={() => handleToggleContactSort("name")}
                    style={{ padding: "12px 16px", fontWeight: 600, cursor: "pointer", userSelect: "none" }}
                  >
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                      <span>CONTACT NAME</span>
                      {contactSortField === "name" ? (
                        contactSortDir === "asc" ? <ArrowUp size={13} color="#10B981" /> : <ArrowDown size={13} color="#10B981" />
                      ) : (
                        <ArrowUpDown size={12} color="#94A3B8" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleToggleContactSort("companyName")}
                    style={{ padding: "12px 16px", fontWeight: 600, cursor: "pointer", userSelect: "none" }}
                  >
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                      <span>ASSOCIATED COMPANY</span>
                      {contactSortField === "companyName" ? (
                        contactSortDir === "asc" ? <ArrowUp size={13} color="#10B981" /> : <ArrowDown size={13} color="#10B981" />
                      ) : (
                        <ArrowUpDown size={12} color="#94A3B8" />
                      )}
                    </div>
                  </th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>DESIGNATION / ROLE</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>PHONE</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>EMAIL</th>
                  <th
                    onClick={() => handleToggleContactSort("createdAt")}
                    style={{ padding: "12px 16px", fontWeight: 600, cursor: "pointer", userSelect: "none" }}
                  >
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                      <span>CREATED</span>
                      {contactSortField === "createdAt" ? (
                        contactSortDir === "asc" ? <ArrowUp size={13} color="#10B981" /> : <ArrowDown size={13} color="#10B981" />
                      ) : (
                        <ArrowUpDown size={12} color="#94A3B8" />
                      )}
                    </div>
                  </th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1, 2, 3, 4, 5, 6].map((idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ width: "130px", height: "14px", backgroundColor: "#E2E8F0", borderRadius: "4px" }} />
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ width: "140px", height: "14px", backgroundColor: "#E2E8F0", borderRadius: "4px" }} />
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ width: "110px", height: "14px", backgroundColor: "#E2E8F0", borderRadius: "4px" }} />
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ width: "100px", height: "14px", backgroundColor: "#E2E8F0", borderRadius: "4px" }} />
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ width: "130px", height: "14px", backgroundColor: "#E2E8F0", borderRadius: "4px" }} />
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ width: "80px", height: "14px", backgroundColor: "#E2E8F0", borderRadius: "4px" }} />
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <div style={{ width: "60px", height: "14px", backgroundColor: "#E2E8F0", borderRadius: "4px", marginLeft: "auto" }} />
                      </td>
                    </tr>
                  ))
                ) : filteredContacts.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "50px 20px", textAlign: "center", color: "#64748B" }}>
                      <Users size={40} color="#CBD5E1" style={{ margin: "0 auto 12px" }} />
                      <h4 style={{ margin: "0 0 4px 0", fontSize: "16px", color: "#0F172A", fontWeight: 700 }}>
                        {isContactFilterActive ? "No matching contacts found" : "No contacts added yet"}
                      </h4>
                      <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#64748B" }}>
                        {isContactFilterActive
                          ? "Try adjusting your search query or selecting a different company."
                          : "Add contact persons to track key decision makers and procurement executives."}
                      </p>
                      {isContactFilterActive ? (
                        <button
                          onClick={handleClearFilters}
                          style={{
                            padding: "8px 16px",
                            borderRadius: "8px",
                            backgroundColor: "#27C786",
                            color: "#fff",
                            border: "none",
                            fontSize: "12.5px",
                            fontWeight: 600,
                            cursor: "pointer"
                          }}
                        >
                          Clear Filters
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setContactPreselectedCompany(null);
                            setShowCreateContactModal(true);
                          }}
                          style={{
                            padding: "8px 18px",
                            borderRadius: "8px",
                            backgroundColor: "#27C786",
                            color: "#fff",
                            border: "none",
                            fontSize: "12.5px",
                            fontWeight: 600,
                            cursor: "pointer"
                          }}
                        >
                          + Add First Contact
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((ct) => {
                    return (
                      <tr
                        key={ct.id}
                        style={{
                          borderBottom: "1px solid #F1F5F9",
                          transition: "background-color 0.15s ease"
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F8FAFC")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        {/* Contact Name */}
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "8px",
                                backgroundColor: ct.isPrimary ? "#ECFDF5" : "#F1F5F9",
                                color: ct.isPrimary ? "#10B981" : "#64748B",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0
                              }}
                            >
                              <Users size={16} />
                            </div>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ fontWeight: 600, color: "#0F172A" }}>{ct.name}</span>
                                {ct.isPrimary && (
                                  <span
                                    style={{
                                      fontSize: "10px",
                                      fontWeight: 700,
                                      color: "#10B981",
                                      backgroundColor: "#ECFDF5",
                                      padding: "1px 6px",
                                      borderRadius: "4px"
                                    }}
                                  >
                                    PRIMARY
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Associated Company */}
                        <td style={{ padding: "12px 16px" }}>
                          {ct.companyId ? (
                            <div
                              onClick={() => setDrawerCompanyId(ct.companyId)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                fontWeight: 600,
                                color: "#2563EB",
                                cursor: "pointer"
                              }}
                              title="View Company 360° Profile"
                            >
                              <Building2 size={13} color="#2563EB" />
                              <span>{ct.companyName || `Company #${ct.companyId}`}</span>
                            </div>
                          ) : (
                            <span style={{ color: "#94A3B8" }}>Individual / Unlinked</span>
                          )}
                        </td>

                        {/* Designation */}
                        <td style={{ padding: "12px 16px", color: "#334155" }}>
                          {ct.designation ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <Briefcase size={12} color="#94A3B8" />
                              <span>{ct.designation}</span>
                            </div>
                          ) : (
                            <span style={{ color: "#94A3B8" }}>—</span>
                          )}
                        </td>

                        {/* Phone */}
                        <td style={{ padding: "12px 16px" }}>
                          {ct.phone ? (
                            <a
                              href={`tel:${ct.phone}`}
                              style={{ color: "#0F172A", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
                            >
                              <Phone size={12} color="#64748B" />
                              <span>{ct.phone}</span>
                            </a>
                          ) : (
                            <span style={{ color: "#94A3B8" }}>—</span>
                          )}
                        </td>

                        {/* Email */}
                        <td style={{ padding: "12px 16px" }}>
                          {ct.email ? (
                            <a
                              href={`mailto:${ct.email}`}
                              style={{ color: "#2563EB", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
                            >
                              <Mail size={12} color="#64748B" />
                              <span>{ct.email}</span>
                            </a>
                          ) : (
                            <span style={{ color: "#94A3B8" }}>—</span>
                          )}
                        </td>

                        {/* Created Date */}
                        <td style={{ padding: "12px 16px", color: "#64748B", whiteSpace: "nowrap" }}>
                          {formatDate(ct.createdAt)}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                            {/* Open Company 360° */}
                            {ct.companyId && (
                              <button
                                onClick={() => setDrawerCompanyId(ct.companyId)}
                                title="View Company 360° Profile"
                                style={{
                                  padding: "5px 8px",
                                  borderRadius: "6px",
                                  backgroundColor: "#F1F5F9",
                                  border: "1px solid #CBD5E1",
                                  color: "#2563EB",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  fontSize: "11.5px",
                                  fontWeight: 600
                                }}
                              >
                                <Eye size={12} />
                                <span>Company</span>
                              </button>
                            )}

                            {/* Log Call */}
                            <button
                              onClick={() => {
                                setTargetContactForCall(ct);
                                setShowLogCallModal(true);
                              }}
                              title="Log Activity / Call"
                              style={{
                                padding: "5px 8px",
                                borderRadius: "6px",
                                backgroundColor: "#ECFDF5",
                                border: "1px solid #A7F3D0",
                                color: "#059669",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                fontSize: "11.5px",
                                fontWeight: 600
                              }}
                            >
                              <PhoneCall size={12} />
                              <span>Log Call</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            /* 3. Imported Contacts & Message Tracking Table */
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
              <thead>
                <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "1.5px solid #E2E8F0" }}>
                  <th style={{ padding: "12px 14px", width: "42px" }}>
                    <input
                      type="checkbox"
                      checked={
                        selectedLeadIds.length === filteredImportedLeads.length &&
                        filteredImportedLeads.length > 0
                      }
                      onChange={handleSelectAllImported}
                      style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "#10B981" }}
                      title="Select / Deselect all leads"
                    />
                  </th>
                  <th
                    onClick={() => handleToggleImportedSort("name")}
                    style={{ padding: "12px 14px", color: "#64748B", fontWeight: 600, cursor: "pointer", userSelect: "none" }}
                  >
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                      <span>CONTACT NAME</span>
                      {importedSortField === "name" ? (
                        importedSortDir === "asc" ? <ArrowUp size={13} color="#10B981" /> : <ArrowDown size={13} color="#10B981" />
                      ) : (
                        <ArrowUpDown size={12} color="#94A3B8" />
                      )}
                    </div>
                  </th>
                  <th style={{ padding: "12px 14px", color: "#64748B", fontWeight: 600 }}>MOBILE NUMBER</th>
                  <th
                    onClick={() => handleToggleImportedSort("companyName")}
                    style={{ padding: "12px 14px", color: "#64748B", fontWeight: 600, cursor: "pointer", userSelect: "none" }}
                  >
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                      <span>COMPANY NAME</span>
                      {importedSortField === "companyName" ? (
                        importedSortDir === "asc" ? <ArrowUp size={13} color="#10B981" /> : <ArrowDown size={13} color="#10B981" />
                      ) : (
                        <ArrowUpDown size={12} color="#94A3B8" />
                      )}
                    </div>
                  </th>
                  <th style={{ padding: "12px 14px", color: "#64748B", fontWeight: 600 }}>IMPORT FILE NAME</th>
                  <th
                    onClick={() => handleToggleImportedSort("createdAt")}
                    style={{ padding: "12px 14px", color: "#64748B", fontWeight: 600, cursor: "pointer", userSelect: "none" }}
                  >
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                      <span>IMPORT DATE</span>
                      {importedSortField === "createdAt" ? (
                        importedSortDir === "asc" ? <ArrowUp size={13} color="#10B981" /> : <ArrowDown size={13} color="#10B981" />
                      ) : (
                        <ArrowUpDown size={12} color="#94A3B8" />
                      )}
                    </div>
                  </th>
                  <th style={{ padding: "12px 14px", color: "#64748B", fontWeight: 600, textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "14px" }}>
                        <div style={{ width: "16px", height: "16px", backgroundColor: "#E2E8F0", borderRadius: "4px" }} />
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ width: "140px", height: "14px", backgroundColor: "#E2E8F0", borderRadius: "4px" }} />
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ width: "110px", height: "14px", backgroundColor: "#E2E8F0", borderRadius: "4px" }} />
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ width: "120px", height: "14px", backgroundColor: "#E2E8F0", borderRadius: "4px" }} />
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ width: "130px", height: "14px", backgroundColor: "#E2E8F0", borderRadius: "4px" }} />
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ width: "90px", height: "14px", backgroundColor: "#E2E8F0", borderRadius: "4px" }} />
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <div style={{ width: "80px", height: "14px", backgroundColor: "#E2E8F0", borderRadius: "4px", marginLeft: "auto" }} />
                      </td>
                    </tr>
                  ))
                ) : filteredImportedLeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "50px 20px", textAlign: "center", color: "#64748B" }}>
                      <FileSpreadsheet size={40} color="#CBD5E1" style={{ margin: "0 auto 12px" }} />
                      <h4 style={{ margin: "0 0 4px 0", fontSize: "16px", color: "#0F172A", fontWeight: 700 }}>
                        {isImportedFilterActive ? "No matching imported leads found" : "No Excel leads imported yet"}
                      </h4>
                      <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#64748B" }}>
                        {isImportedFilterActive
                          ? "Try adjusting your search query to find imported contacts."
                          : "Upload an Excel (.xlsx, .xls) or CSV file containing contact names and mobile numbers to start logging message history."}
                      </p>
                      {isImportedFilterActive ? (
                        <button
                          onClick={handleClearFilters}
                          style={{
                            padding: "8px 16px",
                            borderRadius: "8px",
                            backgroundColor: "#10B981",
                            color: "#fff",
                            border: "none",
                            fontSize: "12.5px",
                            fontWeight: 600,
                            cursor: "pointer"
                          }}
                        >
                          Clear Filter
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowExcelImportModal(true)}
                          style={{
                            padding: "8px 18px",
                            borderRadius: "8px",
                            backgroundColor: "#10B981",
                            color: "#fff",
                            border: "none",
                            fontSize: "12.5px",
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            margin: "0 auto"
                          }}
                        >
                          <FileSpreadsheet size={15} />
                          <span>+ Import Excel Leads</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((lead) => {
                    const isSelected = selectedLeadIds.includes(lead.id);

                    return (
                      <tr
                        key={lead.id}
                        style={{
                          borderBottom: "1px solid #F1F5F9",
                          backgroundColor: isSelected ? "#F0FDF4" : "transparent",
                          transition: "background-color 0.15s ease"
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = "#F8FAFC";
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        {/* Checkbox */}
                        <td style={{ padding: "12px 14px" }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectLead(lead.id)}
                            style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "#10B981" }}
                          />
                        </td>

                        {/* Contact Name */}
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "8px",
                                backgroundColor: "#ECFDF5",
                                color: "#059669",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0
                              }}
                            >
                              <User size={16} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: "#0F172A" }}>
                                {lead.contactName || "—"}
                              </div>
                              {lead.leadNumber && (
                                <div style={{ fontSize: "11px", color: "#94A3B8" }}>
                                  {lead.leadNumber}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Mobile Number */}
                        <td style={{ padding: "12px 16px" }}>
                          {lead.contactPhone ? (
                            <a
                              href={`tel:${lead.contactPhone}`}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                color: "#2563EB",
                                textDecoration: "none",
                                fontFamily: "monospace",
                                fontSize: "12.5px",
                                fontWeight: 500
                              }}
                            >
                              <Phone size={13} color="#2563EB" />
                              <span>{lead.contactPhone}</span>
                            </a>
                          ) : (
                            <span style={{ color: "#94A3B8" }}>—</span>
                          )}
                        </td>

                        {/* Company Name */}
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                            <Building size={14} color="#64748B" />
                            <span>{lead.companyName || "—"}</span>
                          </div>
                        </td>

                        {/* Import File Name */}
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "3px 8px",
                              borderRadius: "6px",
                              backgroundColor: "#ECFDF5",
                              color: "#059669",
                              border: "1px solid #A7F3D0",
                              fontSize: "11.5px",
                              fontWeight: 600
                            }}
                          >
                            <FileSpreadsheet size={13} />
                            <span>{lead.importFileName || "Excel_Import.xlsx"}</span>
                          </span>
                        </td>

                        {/* Import Date */}
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#64748B", fontSize: "12px" }}>
                            <Calendar size={13} color="#94A3B8" />
                            <span>{formatDate(lead.importDate || lead.createdAt)}</span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                            {/* Log Message */}
                            <button
                              onClick={() => setSingleLeadToMessage(lead)}
                              title="Record Message sent to this lead"
                              style={{
                                padding: "5px 10px",
                                borderRadius: "6px",
                                backgroundColor: "#EFF6FF",
                                border: "1px solid #BFDBFE",
                                color: "#2563EB",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                fontSize: "11.5px",
                                fontWeight: 600
                              }}
                            >
                              <MessageSquare size={13} />
                              <span>Log Message</span>
                            </button>

                            {/* Open in Leads Page */}
                            <button
                              onClick={() => {
                                navigate(`/dashboard/crm/leads?leadId=${lead.id}`, {
                                  state: { selectedLeadId: lead.id }
                                });
                              }}
                              title="Open in CRM Leads Page"
                              style={{
                                padding: "5px 10px",
                                borderRadius: "6px",
                                backgroundColor: "#ECFDF5",
                                border: "1px solid #A7F3D0",
                                color: "#059669",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                fontSize: "11.5px",
                                fontWeight: 600
                              }}
                            >
                              <ExternalLink size={13} />
                              <span>Leads</span>
                            </button>

                            {/* View Lead Details & Message History */}
                            <button
                              onClick={() => setDrawerLeadId(lead.id)}
                              title="View Lead Details & Message History"
                              style={{
                                padding: "5px 10px",
                                borderRadius: "6px",
                                backgroundColor: "#F1F5F9",
                                border: "1px solid #CBD5E1",
                                color: "#0F172A",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                fontSize: "11.5px",
                                fontWeight: 600
                              }}
                            >
                              <Eye size={13} />
                              <span>Details</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* 7. Pagination Footer */}
        {!loading && activeRecords.length > 0 && (
          <div
            style={{
              padding: "12px 18px",
              borderTop: "1px solid #E2E8F0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              backgroundColor: "#FAFBFD",
              fontSize: "12.5px",
              color: "#64748B"
            }}
          >
            {/* Left: Summary + Page size dropdown */}
            <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
              <div>
                Showing <strong>{Math.min(activeRecords.length, (currentPage - 1) * pageSize + 1)}</strong> to{" "}
                <strong>{Math.min(activeRecords.length, currentPage * pageSize)}</strong> of{" "}
                <strong>{activeRecords.length}</strong> {activeTab === "companies" ? "companies" : activeTab === "contacts" ? "contacts" : "imported leads"}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "6px",
                    border: "1px solid #CBD5E1",
                    fontSize: "12px",
                    backgroundColor: "#ffffff"
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {/* Right: Page Navigation Controls */}
            {totalPages > 1 && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
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
                    gap: "2px",
                    fontSize: "12px"
                  }}
                >
                  <ChevronLeft size={14} />
                  <span>Prev</span>
                </button>

                <span style={{ padding: "0 8px", fontWeight: 600, color: "#0F172A", fontSize: "12.5px" }}>
                  {currentPage} of {totalPages}
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
                    gap: "2px",
                    fontSize: "12px"
                  }}
                >
                  <span>Next</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 8. Modals & Drawers */}

      {/* Company 360° Slide-over Drawer */}
      {drawerCompanyId && (
        <Company360Drawer
          companyId={drawerCompanyId}
          isOpen={Boolean(drawerCompanyId)}
          onClose={() => setDrawerCompanyId(null)}
          onCompanyUpdated={fetchData}
          showToast={showToast}
        />
      )}

      {/* Add / Edit Company Modal */}
      {showCreateCompanyModal && (
        <CreateCompanyModal
          isOpen={showCreateCompanyModal}
          onClose={() => {
            setShowCreateCompanyModal(false);
            setCompanyToEdit(null);
          }}
          companyToEdit={companyToEdit}
          onCompanySaved={fetchData}
          showToast={showToast}
        />
      )}

      {/* Add Contact Modal */}
      {showCreateContactModal && (
        <CreateContactModal
          isOpen={showCreateContactModal}
          onClose={() => {
            setShowCreateContactModal(false);
            setContactPreselectedCompany(null);
          }}
          companyId={contactPreselectedCompany?.id}
          companyName={contactPreselectedCompany?.name}
          onContactSaved={fetchData}
          showToast={showToast}
        />
      )}

      {/* Log Call Modal */}
      {showLogCallModal && (
        <LogActivityModal
          isOpen={showLogCallModal}
          onClose={() => {
            setShowLogCallModal(false);
            setTargetContactForCall(null);
          }}
          contactId={targetContactForCall?.id}
          companyId={targetContactForCall?.companyId}
          onActivityLogged={() => {
            showToast("Call activity logged successfully", "success");
            fetchData();
          }}
          showToast={showToast}
        />
      )}

      {/* Deactivate Company Confirmation Dialog */}
      {companyToDeactivate && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.45)",
            backdropFilter: "blur(4px)",
            zIndex: 1300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px"
          }}
          onClick={() => !deactivatingLoading && setCompanyToDeactivate(null)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              maxWidth: "440px",
              width: "100%",
              padding: "24px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px", color: "#DC2626" }}>
              <AlertTriangle size={24} />
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#0F172A" }}>
                Deactivate Company?
              </h3>
            </div>
            <p style={{ fontSize: "13.5px", color: "#475569", margin: "0 0 16px 0", lineHeight: 1.5 }}>
              Are you sure you want to deactivate <strong>"{companyToDeactivate.name}"</strong>?
              This will mark the company account as inactive in your CRM directory.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setCompanyToDeactivate(null)}
                disabled={deactivatingLoading}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  backgroundColor: "#ffffff",
                  color: "#374151",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeactivate}
                disabled={deactivatingLoading}
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "#DC2626",
                  color: "#ffffff",
                  fontSize: "13px",
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

      {/* Excel Lead Import Modal */}
      {showExcelImportModal && (
        <ExcelLeadImportModal
          isOpen={showExcelImportModal}
          onClose={() => setShowExcelImportModal(false)}
          existingContacts={contacts}
          existingLeads={leads}
          onSuccess={({ fileName, importedCount }) => {
            fetchData();
            setActiveTab("imported");
            showToast(`Successfully imported ${importedCount} leads from ${fileName}`, "success");
          }}
          showToast={showToast}
        />
      )}

      {/* Log Message Modal (Bulk or Single) */}
      {(showLogMessageModal || singleLeadToMessage) && (
        <LogLeadMessageModal
          isOpen={showLogMessageModal || !!singleLeadToMessage}
          onClose={() => {
            setShowLogMessageModal(false);
            setSingleLeadToMessage(null);
          }}
          selectedLeads={
            singleLeadToMessage
              ? [singleLeadToMessage]
              : importedLeads.filter((l) => selectedLeadIds.includes(l.id))
          }
          onSuccess={() => {
            fetchData();
            setSelectedLeadIds([]);
          }}
          showToast={showToast}
        />
      )}

      {/* Lead Detail Drawer */}
      {drawerLeadId && (
        <LeadDetailDrawer
          leadId={drawerLeadId}
          isOpen={!!drawerLeadId}
          onClose={() => setDrawerLeadId(null)}
          onLeadUpdated={fetchData}
          showToast={showToast}
        />
      )}
    </div>
  );
}
