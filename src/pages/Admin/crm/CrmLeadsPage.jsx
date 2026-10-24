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
  ChevronsLeft,
  ChevronsRight,
  AlertCircle,
  AlertTriangle,
  Clock,
  Calendar,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  SlidersHorizontal,
  Mail,
  Phone
} from "lucide-react";
import { crmService } from "../../../services/crmService";
import { staffService } from "../../../services/staffService";
import { Toast } from "../../../components/common/Toast";
import { LeadStatusBadge } from "../../../components/crm/CrmBadge";
import { LeadDetailDrawer } from "../../../components/crm/LeadDetailDrawer";
import { LeadSummaryCards } from "../../../components/crm/LeadSummaryCards";
import { BulkLeadUploadModal } from "../../../components/crm/BulkLeadUploadModal";

const SUB_VIEWS = [
  { id: "all", label: "All leads" },
  { id: "my", label: "My leads" },
  { id: "indiamart", label: "IndiaMART" },
  { id: "unassigned", label: "Unassigned" },
  { id: "duplicates", label: "Duplicates" }
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Helper to determine follow-up status (Overdue / Today / Upcoming / None)
const getFollowUpInfo = (lead) => {
  if (!lead.nextFollowUpDate) {
    return { type: "none", label: "—", isOverdue: false, isToday: false };
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const followUpDateStr = typeof lead.nextFollowUpDate === "string" 
    ? lead.nextFollowUpDate.slice(0, 10) 
    : "";

  const timeStr = lead.nextFollowUpTime ? ` at ${lead.nextFollowUpTime.slice(0, 5)}` : "";
  const s = (lead.status || "").toLowerCase().trim();
  const isClosed = s === "converted" || s === "lost";

  if (followUpDateStr === todayStr) {
    return {
      type: "today",
      label: `Today${timeStr}`,
      isOverdue: false,
      isToday: true
    };
  } else if (followUpDateStr < todayStr && !isClosed) {
    const diffMs = new Date(todayStr).getTime() - new Date(followUpDateStr).getTime();
    const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
    return {
      type: "overdue",
      label: `Overdue (${diffDays}d ago)`,
      isOverdue: true,
      isToday: false
    };
  } else {
    const d = new Date(followUpDateStr);
    const dateFormatted = !isNaN(d.getTime())
      ? d.toLocaleDateString([], { day: "2-digit", month: "short" })
      : followUpDateStr;
    return {
      type: "upcoming",
      label: `${dateFormatted}${timeStr}`,
      isOverdue: false,
      isToday: false
    };
  }
};

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
  const [followUpFilter, setFollowUpFilter] = useState("ALL");

  // Date Filters
  const [dateFilter, setDateFilter] = useState("ALL"); // ALL, TODAY, THIS_WEEK, THIS_MONTH, THIS_YEAR, CUSTOM
  const [selectedMonth, setSelectedMonth] = useState("ALL"); // ALL, 0 - 11
  const [selectedYear, setSelectedYear] = useState("ALL"); // ALL, 2026, 2025...
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Sorting
  const [sortOption, setSortOption] = useState("created_desc"); // created_desc, created_asc, name_asc, name_desc, status_asc, status_desc

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Selection
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals & Drawers
  const [selectedLeadId, setSelectedLeadId] = useState(null);

  // IndiaMART sync state
  const [syncingIndiaMart, setSyncingIndiaMart] = useState(false);

  // Bulk Assign Modal state
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [targetStaffId, setTargetStaffId] = useState("");
  const [assigningLoading, setAssigningLoading] = useState(false);

  // Bulk Tag Modal state
  const [showBulkTagModal, setShowBulkTagModal] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [taggingLoading, setTaggingLoading] = useState(false);

  // Bulk CSV Upload Modal state
  const [showCsvModal, setShowCsvModal] = useState(false);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [leadsData, companiesData, contactsData] = await Promise.all([
        activeSubView === "my" ? crmService.getMyLeads() : crmService.getAllLeads(),
        crmService.getAllCompanies().catch(() => []),
        crmService.getAllContacts().catch(() => [])
      ]);

      const compList = Array.isArray(companiesData) ? companiesData : [];
      const contList = Array.isArray(contactsData) ? contactsData : [];

      const companyMap = new Map(compList.map((c) => [c.id, c]));
      const contactMap = new Map(contList.map((ct) => [ct.id, ct]));
      const contactPhoneMap = new Map(contList.map((ct) => [ct.phone, ct]));

      let rawArr = Array.isArray(leadsData) ? leadsData : [];
      let arr = rawArr.map((lead) => {
        const comp = lead.companyId ? companyMap.get(lead.companyId) : null;
        const cont =
          (lead.contactId ? contactMap.get(lead.contactId) : null) ||
          (lead.contactPhone ? contactPhoneMap.get(lead.contactPhone) : null);

        return {
          ...lead,
          contactEmail: cont?.email || lead.contactEmail || lead.email || "",
          designation: cont?.designation || lead.designation || "",
          industry: comp?.industry || lead.industry || "",
          companyWebsite: comp?.website || lead.companyWebsite || "",
          gstin: comp?.gstNumber || lead.gstin || "",
          companySize: comp?.companyType || lead.companySize || ""
        };
      });

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

  // Load staff list for bulk assignment
  useEffect(() => {
    staffService
      .getAllStaff()
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.adminUsers || data?.users || [];
        setStaffList(list);
      })
      .catch((err) => console.error("Failed to load staff list:", err));
  }, []);

  // IndiaMART manual sync handler
  const handleSyncIndiaMart = async () => {
    setSyncingIndiaMart(true);
    try {
      const res = await crmService.syncIndiaMart();
      const count = res?.newLeadsCount ?? res?.count ?? (typeof res === "number" ? res : null);
      const msg = typeof res === "string" 
        ? res 
        : count !== null 
        ? `Successfully synced ${count} new leads from IndiaMART` 
        : "Successfully synced inquiries from IndiaMART";
      showToast(msg, "success");
      fetchLeads();
    } catch (err) {
      console.error("IndiaMART sync error:", err);
      showToast(err.message || "Failed to sync leads from IndiaMART", "error");
    } finally {
      setSyncingIndiaMart(false);
    }
  };

  // Bulk Assign Handler
  const handleBulkAssignSubmit = async (e) => {
    e.preventDefault();
    if (assigningLoading) return;

    const sanitizedIds = (selectedIds || [])
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0);

    if (sanitizedIds.length === 0) {
      showToast("Please select at least one lead to assign", "error");
      return;
    }

    const adminId = Number(targetStaffId);
    if (!Number.isInteger(adminId) || adminId <= 0) {
      showToast("Please select a sales administrator", "error");
      return;
    }

    setAssigningLoading(true);
    try {
      const res = await crmService.bulkAssignLeads(sanitizedIds, adminId);
      const successCount = res?.successCount ?? sanitizedIds.length;
      showToast(
        typeof res === "string" ? res : `Successfully assigned ${successCount} lead(s)`,
        "success"
      );
      setShowBulkAssignModal(false);
      setSelectedIds([]);
      setTargetStaffId("");
      fetchLeads();
    } catch (err) {
      console.error("Bulk assign error:", err);
      showToast(err.message || "Failed to bulk assign leads", "error");
    } finally {
      setAssigningLoading(false);
    }
  };

  // Bulk Tag Handler
  const handleBulkTagSubmit = async (e) => {
    e.preventDefault();
    const tagArray = tagInput.split(",").map((t) => t.trim()).filter(Boolean);
    if (tagArray.length === 0) {
      showToast("Please enter at least one tag", "error");
      return;
    }
    setTaggingLoading(true);
    try {
      const res = await crmService.bulkTagLeads(selectedIds, tagArray);
      showToast(typeof res === "string" ? res : `Successfully tagged ${selectedIds.length} lead(s)`, "success");
      setShowBulkTagModal(false);
      setSelectedIds([]);
      setTagInput("");
      fetchLeads();
    } catch (err) {
      console.error("Bulk tag error:", err);
      showToast(err.message || "Failed to bulk tag leads", "error");
    } finally {
      setTaggingLoading(false);
    }
  };

  // Dynamically derived filter options from real data
  const sources = useMemo(() => ["ALL", ...new Set(leads.map((l) => l.source).filter(Boolean))], [leads]);
  const statuses = useMemo(() => ["ALL", ...new Set(leads.map((l) => l.status).filter(Boolean))], [leads]);
  const locations = useMemo(() => ["ALL", ...new Set(leads.map((l) => l.city).filter(Boolean))], [leads]);
  const industries = useMemo(() => ["ALL", ...new Set(leads.map((l) => l.industry).filter(Boolean))], [leads]);
  const owners = useMemo(() => ["ALL", ...new Set(leads.map((l) => l.ownerAdminName || l.assignedTo).filter(Boolean))], [leads]);

  // Dynamically derive available years from lead createdAt
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearsSet = new Set([currentYear]);
    leads.forEach((l) => {
      if (l.createdAt) {
        const d = new Date(l.createdAt);
        if (!isNaN(d.getTime())) {
          yearsSet.add(d.getFullYear());
        }
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [leads]);

  // Lead Summary Counts (5 Cards: Total, New Leads This Month, Pending, Converted, Lost)
  const cardCounts = useMemo(() => {
    let total = 0;
    let newThisMonthCount = 0;
    let pendingCount = 0;
    let convertedCount = 0;
    let lostCount = 0;

    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    leads.forEach((l) => {
      total++;
      const s = (l.status || "").toLowerCase().trim();

      // Check if created this month
      let isThisMonth = false;
      if (l.createdAt) {
        const d = new Date(l.createdAt);
        if (!isNaN(d.getTime())) {
          isThisMonth = d.getFullYear() === curYear && d.getMonth() === curMonth;
        }
      }

      if (isThisMonth && (s === "new" || !s)) {
        newThisMonthCount++;
      } else if (!l.createdAt && s === "new") {
        newThisMonthCount++;
      }

      // Pending leads: status is pending/nurture or has upcoming follow-up and not converted/lost
      if (
        s === "pending" ||
        s === "nurture" ||
        (Boolean(l.nextFollowUpDate) && s !== "converted" && s !== "lost")
      ) {
        pendingCount++;
      } else if (s === "converted") {
        convertedCount++;
      } else if (s === "lost") {
        lostCount++;
      }
    });

    return {
      total,
      newThisMonthCount,
      pendingCount,
      convertedCount,
      lostCount
    };
  }, [leads]);

  // Summary Card Click to Filter
  const handleCardStatusSelect = (targetStatus) => {
    if (targetStatus === "ALL") {
      setStatusFilter("ALL");
      setDateFilter("ALL");
      setSelectedMonth("ALL");
      setSelectedYear("ALL");
    } else if (targetStatus === "NEW_THIS_MONTH") {
      if (statusFilter.toUpperCase() === "NEW" && dateFilter === "THIS_MONTH") {
        setStatusFilter("ALL");
        setDateFilter("ALL");
      } else {
        setStatusFilter("NEW");
        setDateFilter("THIS_MONTH");
      }
    } else if ((statusFilter || "").toUpperCase() === targetStatus.toUpperCase()) {
      setStatusFilter("ALL");
    } else {
      setStatusFilter(targetStatus);
    }
  };

  // Clear all filters action
  const handleClearFilters = () => {
    setSearchQuery("");
    setSourceFilter("ALL");
    setStatusFilter("ALL");
    setIndustryFilter("ALL");
    setOwnerFilter("ALL");
    setLocationFilter("ALL");
    setFollowUpFilter("ALL");
    setDateFilter("ALL");
    setSelectedMonth("ALL");
    setSelectedYear("ALL");
    setCustomStartDate("");
    setCustomEndDate("");
    setSortOption("created_desc");
  };

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (sourceFilter !== "ALL") count++;
    if (statusFilter !== "ALL") count++;
    if (industryFilter !== "ALL") count++;
    if (ownerFilter !== "ALL") count++;
    if (locationFilter !== "ALL") count++;
    if (followUpFilter !== "ALL") count++;
    if (dateFilter !== "ALL") count++;
    if (selectedMonth !== "ALL") count++;
    if (selectedYear !== "ALL") count++;
    if (customStartDate || customEndDate) count++;
    return count;
  }, [
    searchQuery,
    sourceFilter,
    statusFilter,
    industryFilter,
    ownerFilter,
    locationFilter,
    followUpFilter,
    dateFilter,
    selectedMonth,
    selectedYear,
    customStartDate,
    customEndDate
  ]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    const now = new Date();

    return leads.filter((lead) => {
      // 1. Source Filter
      if (sourceFilter !== "ALL" && (lead.source || "").toUpperCase() !== sourceFilter.toUpperCase()) {
        return false;
      }

      // 2. Status Filter
      if (statusFilter !== "ALL") {
        const leadStatusUpper = (lead.status || "").toUpperCase();
        if (statusFilter.toUpperCase() === "PENDING") {
          const s = (lead.status || "").toLowerCase().trim();
          const isPendingLead =
            s === "pending" ||
            s === "nurture" ||
            (Boolean(lead.nextFollowUpDate) && s !== "converted" && s !== "lost");
          if (!isPendingLead) return false;
        } else if (leadStatusUpper !== statusFilter.toUpperCase()) {
          return false;
        }
      }

      // 3. Location Filter
      if (locationFilter !== "ALL" && (lead.city || "").toUpperCase() !== locationFilter.toUpperCase()) {
        return false;
      }

      // 4. Industry Filter
      if (industryFilter !== "ALL" && (lead.industry || "").toUpperCase() !== industryFilter.toUpperCase()) {
        return false;
      }

      // 5. Owner Filter
      if (ownerFilter !== "ALL") {
        const leadOwner = lead.ownerAdminName || lead.assignedTo || "";
        if (leadOwner.toUpperCase() !== ownerFilter.toUpperCase()) return false;
      }

      // 6. Follow-up Filter
      if (followUpFilter !== "ALL") {
        const fu = getFollowUpInfo(lead);
        if (followUpFilter === "OVERDUE" && !fu.isOverdue) return false;
        if (followUpFilter === "TODAY" && !fu.isToday) return false;
        if (followUpFilter === "UPCOMING" && fu.type !== "upcoming") return false;
        if (followUpFilter === "NONE" && fu.type !== "none") return false;
      }

      // 7. Search Query (name, phone, email, company)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (lead.title || "").toLowerCase().includes(q);
        const matchName = (lead.contactName || "").toLowerCase().includes(q);
        const matchComp = (lead.companyName || "").toLowerCase().includes(q);
        const matchPhone = (lead.contactPhone || lead.phone || "").toLowerCase().includes(q);
        const matchEmail = (lead.contactEmail || lead.email || "").toLowerCase().includes(q);
        if (!matchTitle && !matchName && !matchComp && !matchPhone && !matchEmail) {
          return false;
        }
      }

      // 8. Date Filters on lead.createdAt
      const hasDate = Boolean(lead.createdAt);
      const leadDate = hasDate ? new Date(lead.createdAt) : null;
      const isValidDate = leadDate && !isNaN(leadDate.getTime());

      // Preset Date Filter
      if (dateFilter !== "ALL") {
        if (!isValidDate) return false;

        if (dateFilter === "TODAY") {
          if (
            leadDate.getFullYear() !== now.getFullYear() ||
            leadDate.getMonth() !== now.getMonth() ||
            leadDate.getDate() !== now.getDate()
          ) {
            return false;
          }
        } else if (dateFilter === "THIS_WEEK") {
          const startOfWeek = new Date(now);
          const day = now.getDay();
          const diffToMonday = (day === 0 ? -6 : 1) - day;
          startOfWeek.setDate(now.getDate() + diffToMonday);
          startOfWeek.setHours(0, 0, 0, 0);

          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);

          if (leadDate < startOfWeek || leadDate > endOfWeek) return false;
        } else if (dateFilter === "THIS_MONTH") {
          if (
            leadDate.getFullYear() !== now.getFullYear() ||
            leadDate.getMonth() !== now.getMonth()
          ) {
            return false;
          }
        } else if (dateFilter === "THIS_YEAR") {
          if (leadDate.getFullYear() !== now.getFullYear()) {
            return false;
          }
        } else if (dateFilter === "CUSTOM") {
          if (customStartDate) {
            const start = new Date(customStartDate);
            start.setHours(0, 0, 0, 0);
            if (leadDate < start) return false;
          }
          if (customEndDate) {
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59, 999);
            if (leadDate > end) return false;
          }
        }
      }

      // 9. Monthly Filter
      if (selectedMonth !== "ALL") {
        if (!isValidDate) return false;
        if (leadDate.getMonth() !== parseInt(selectedMonth, 10)) {
          return false;
        }
      }

      // 10. Yearly Filter
      if (selectedYear !== "ALL") {
        if (!isValidDate) return false;
        if (leadDate.getFullYear() !== parseInt(selectedYear, 10)) {
          return false;
        }
      }

      return true;
    });
  }, [
    leads,
    sourceFilter,
    statusFilter,
    locationFilter,
    industryFilter,
    ownerFilter,
    followUpFilter,
    searchQuery,
    dateFilter,
    customStartDate,
    customEndDate,
    selectedMonth,
    selectedYear
  ]);

  // Sorted Leads
  const sortedLeads = useMemo(() => {
    return [...filteredLeads].sort((a, b) => {
      let comparison = 0;

      if (sortOption === "created_desc") {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        comparison = timeB - timeA;
      } else if (sortOption === "created_asc") {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        comparison = timeA - timeB;
      } else if (sortOption === "name_asc") {
        const nameA = (a.contactName || a.title || "").toLowerCase();
        const nameB = (b.contactName || b.title || "").toLowerCase();
        comparison = nameA.localeCompare(nameB);
      } else if (sortOption === "name_desc") {
        const nameA = (a.contactName || a.title || "").toLowerCase();
        const nameB = (b.contactName || b.title || "").toLowerCase();
        comparison = nameB.localeCompare(nameA);
      } else if (sortOption === "status_asc") {
        const statusA = (a.status || "").toLowerCase();
        const statusB = (b.status || "").toLowerCase();
        comparison = statusA.localeCompare(statusB);
      } else if (sortOption === "status_desc") {
        const statusA = (a.status || "").toLowerCase();
        const statusB = (b.status || "").toLowerCase();
        comparison = statusB.localeCompare(statusA);
      }
      return comparison;
    });
  }, [filteredLeads, sortOption]);

  // Header column click sorter
  const handleHeaderSort = (field) => {
    if (field === "name") {
      setSortOption((prev) => (prev === "name_asc" ? "name_desc" : "name_asc"));
    } else if (field === "status") {
      setSortOption((prev) => (prev === "status_asc" ? "status_desc" : "status_asc"));
    } else if (field === "created") {
      setSortOption((prev) => (prev === "created_desc" ? "created_asc" : "created_desc"));
    }
  };

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    sourceFilter,
    statusFilter,
    locationFilter,
    industryFilter,
    ownerFilter,
    followUpFilter,
    dateFilter,
    selectedMonth,
    selectedYear,
    customStartDate,
    customEndDate,
    pageSize
  ]);

  // Paginated subset
  const totalPages = Math.ceil(sortedLeads.length / pageSize) || 1;
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedLeads.slice(start, start + pageSize);
  }, [sortedLeads, currentPage, pageSize]);

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

  // Client-side CSV export of filtered or selected leads
  const handleExportCSV = () => {
    const toExport = selectedIds.length > 0
      ? sortedLeads.filter((l) => selectedIds.includes(l.id))
      : sortedLeads;

    if (toExport.length === 0) {
      showToast("No leads available to export", "error");
      return;
    }

    const headers = [
      "ID",
      "Lead Number",
      "Lead Title",
      "Contact Name",
      "Company",
      "Phone",
      "Email",
      "Source",
      "Status",
      "Next Follow-up Date",
      "Next Follow-up Time",
      "Follow-up Status",
      "Owner",
      "City",
      "State",
      "Estimated Value",
      "Created Date",
      "Notes"
    ];

    const escapeCell = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = toExport.map((l) => {
      const fu = getFollowUpInfo(l);
      return [
        escapeCell(l.id),
        escapeCell(l.leadNumber),
        escapeCell(l.title),
        escapeCell(l.contactName),
        escapeCell(l.companyName),
        escapeCell(l.contactPhone || l.phone),
        escapeCell(l.contactEmail || l.email),
        escapeCell(l.source),
        escapeCell(l.status),
        escapeCell(l.nextFollowUpDate),
        escapeCell(l.nextFollowUpTime),
        escapeCell(fu.label),
        escapeCell(l.ownerAdminName || l.assignedTo),
        escapeCell(l.city),
        escapeCell(l.state),
        escapeCell(l.estimatedValue),
        escapeCell(l.createdAt),
        escapeCell(l.notes)
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `bentork_leads_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported ${toExport.length} lead(s) to CSV`, "success");
  };

  return (
    <div style={{ maxWidth: "1480px", margin: "0 auto", padding: "16px 20px" }}>
      <style>{`
        .crm-filter-card {
          background-color: #ffffff;
          border-radius: 12px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
          padding: 14px 16px;
          margin-bottom: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .crm-filter-row {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }
        .crm-filter-row select,
        .crm-filter-row input {
          box-sizing: border-box;
          border-radius: 8px;
          border: 1px solid #CBD5E1;
          font-size: 13px;
          color: #1E293B;
          background-color: #ffffff;
          transition: border-color 0.15s;
        }
        .crm-filter-row select:focus,
        .crm-filter-row input:focus {
          outline: none;
          border-color: #2563EB;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
        }
        .crm-th-sortable {
          cursor: pointer;
          user-select: none;
          transition: color 0.15s;
        }
        .crm-th-sortable:hover {
          color: #2563EB;
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
        .crm-lead-table-row {
          border-bottom: 1px solid #F1F5F9;
          transition: background-color 0.15s ease;
        }
        .crm-lead-table-row:hover {
          background-color: #F8FAFC;
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

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: "20px",
              backgroundColor: "#F0FDF4",
              border: "1px solid #BBF7D0",
              fontSize: "12px",
              fontWeight: 500,
              color: "#166534"
            }}
          >
            <span>🟢 Auto-polling active (every 15m)</span>
          </div>

          <button
            onClick={handleSyncIndiaMart}
            disabled={syncingIndiaMart}
            style={{
              padding: "9px 14px",
              borderRadius: "8px",
              backgroundColor: syncingIndiaMart ? "#EFF6FF" : "#ffffff",
              border: "1px solid #2563EB",
              color: "#2563EB",
              fontSize: "13px",
              fontWeight: 600,
              cursor: syncingIndiaMart ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <RefreshCw size={15} className={syncingIndiaMart ? "animate-spin" : ""} />
            <span>{syncingIndiaMart ? "Syncing..." : "Sync IndiaMART Leads"}</span>
          </button>

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
            title="Refresh Leads"
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

      {/* 5 Lead Summary Cards */}
      <LeadSummaryCards
        cardCounts={cardCounts}
        loading={loading}
        activeStatus={
          statusFilter.toUpperCase() === "NEW" && dateFilter === "THIS_MONTH"
            ? "NEW_THIS_MONTH"
            : statusFilter
        }
        onStatusSelect={handleCardStatusSelect}
      />

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

      {/* Advanced Filter Toolbar */}
      <div className="crm-filter-card">
        {/* Row 1: Search, Date Filter Presets, Month & Year Dropdowns, Clear Filter */}
        <div className="crm-filter-row">
          {/* Search box with name, phone, email, company */}
          <div style={{ position: "relative", minWidth: "260px", flex: 2 }}>
            <Search size={15} color="#94A3B8" style={{ position: "absolute", left: "11px", top: "11px" }} />
            <input
              type="text"
              placeholder="Search leads by name, phone, email, company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: "100%", padding: "9px 30px 9px 34px" }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: "9px",
                  top: "10px",
                  background: "none",
                  border: "none",
                  color: "#94A3B8",
                  cursor: "pointer",
                  padding: 0
                }}
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Quick Date Filter Preset */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Calendar size={15} color="#64748B" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{ padding: "9px 12px" }}
              title="Quick Date Filter"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="THIS_WEEK">This Week</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="THIS_YEAR">This Year</option>
              <option value="CUSTOM">Custom Date Range...</option>
            </select>
          </div>

          {/* Month Dropdown */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{ padding: "9px 12px" }}
            title="Filter by Month"
          >
            <option value="ALL">All Months</option>
            {MONTH_NAMES.map((m, idx) => (
              <option key={m} value={String(idx)}>{m}</option>
            ))}
          </select>

          {/* Year Dropdown */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            style={{ padding: "9px 12px" }}
            title="Filter by Year"
          >
            <option value="ALL">All Years</option>
            {availableYears.map((yr) => (
              <option key={yr} value={String(yr)}>{yr}</option>
            ))}
          </select>

          {/* Clear Filters Button */}
          {activeFilterCount > 0 && (
            <button
              onClick={handleClearFilters}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                backgroundColor: "#FEF2F2",
                border: "1px solid #FECACA",
                color: "#DC2626",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px"
              }}
              title="Reset all active filters"
            >
              <RotateCcw size={13} />
              <span>Clear Filters ({activeFilterCount})</span>
            </button>
          )}
        </div>

        {/* Custom Date Range Picker (shown when CUSTOM date filter selected) */}
        {dateFilter === "CUSTOM" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 14px",
              backgroundColor: "#F8FAFC",
              borderRadius: "8px",
              border: "1px solid #E2E8F0",
              fontSize: "12.5px"
            }}
          >
            <span style={{ fontWeight: 600, color: "#475569" }}>Custom Range:</span>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748B" }}>
              <span>From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                style={{ padding: "6px 10px" }}
              />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748B" }}>
              <span>To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                style={{ padding: "6px 10px" }}
              />
            </label>
            {(customStartDate || customEndDate) && (
              <button
                type="button"
                onClick={() => {
                  setCustomStartDate("");
                  setCustomEndDate("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#DC2626",
                  fontSize: "12px",
                  cursor: "pointer",
                  textDecoration: "underline"
                }}
              >
                Clear Range
              </button>
            )}
          </div>
        )}

        {/* Row 2: Status, Source, Follow-up, Owner, Location, and Sort By */}
        <div className="crm-filter-row">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: "8px 12px" }}
          >
            <option value="ALL">All Status</option>
            {statuses.filter((s) => s !== "ALL").map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
            {!statuses.map((s) => s.toUpperCase()).includes("PENDING") && (
              <option value="PENDING">Pending (Action Required)</option>
            )}
          </select>

          <select
            value={followUpFilter}
            onChange={(e) => setFollowUpFilter(e.target.value)}
            style={{ padding: "8px 12px" }}
          >
            <option value="ALL">All Follow-ups</option>
            <option value="TODAY">⏰ Today's Follow-ups</option>
            <option value="OVERDUE">⚠️ Overdue Follow-ups</option>
            <option value="UPCOMING">📅 Upcoming Follow-ups</option>
            <option value="NONE">No Follow-up Scheduled</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            style={{ padding: "8px 12px" }}
          >
            <option value="ALL">All Sources</option>
            {sources.filter((s) => s !== "ALL").map((s) => (
              <option key={s} value={s}>{s.replace("_", " ")}</option>
            ))}
          </select>

          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            style={{ padding: "8px 12px" }}
          >
            <option value="ALL">All Owners</option>
            {owners.filter((o) => o !== "ALL").map((owner) => (
              <option key={owner} value={owner}>{owner}</option>
            ))}
          </select>

          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            style={{ padding: "8px 12px" }}
          >
            <option value="ALL">All Locations</option>
            {locations.filter((l) => l !== "ALL").map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>

          <select
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            style={{ padding: "8px 12px" }}
          >
            <option value="ALL">All Industries</option>
            {industries.filter((ind) => ind !== "ALL").map((ind) => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>

          {/* Sort By Dropdown */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 500 }}>Sort by:</span>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              style={{ padding: "8px 12px", fontWeight: 500 }}
            >
              <option value="created_desc">Creation Date (Newest First)</option>
              <option value="created_asc">Creation Date (Oldest First)</option>
              <option value="name_asc">Lead Name (A to Z)</option>
              <option value="name_desc">Lead Name (Z to A)</option>
              <option value="status_asc">Status (A to Z)</option>
              <option value="status_desc">Status (Z to A)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Action Bar: Export, Bulk Assign, Bulk Tag, CSV Upload, Selection info */}
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
            padding: "7px 14px",
            borderRadius: "6px",
            backgroundColor: "#ffffff",
            border: "1px solid #CBD5E1",
            fontSize: "12.5px",
            fontWeight: 600,
            color: "#334155",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}
          title="Export leads to CSV format"
        >
          <Download size={14} />
          <span>Export {selectedIds.length > 0 ? `Selected (${selectedIds.length})` : "Filtered"} to CSV</span>
        </button>

        <button
          onClick={() => {
            if (selectedIds.length === 0) {
              showToast("Please select at least one lead to assign", "error");
              return;
            }
            setShowBulkAssignModal(true);
          }}
          style={{
            padding: "7px 14px",
            borderRadius: "6px",
            backgroundColor: selectedIds.length > 0 ? "#EFF6FF" : "#F8FAFC",
            border: selectedIds.length > 0 ? "1px solid #93C5FD" : "1px solid #CBD5E1",
            fontSize: "12.5px",
            fontWeight: 600,
            color: selectedIds.length > 0 ? "#1D4ED8" : "#64748B",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          <UserCheck size={14} />
          <span>Bulk Assign {selectedIds.length > 0 ? `(${selectedIds.length})` : ""}</span>
        </button>

        <button
          onClick={() => {
            if (selectedIds.length === 0) {
              showToast("Please select at least one lead to tag", "error");
              return;
            }
            setShowBulkTagModal(true);
          }}
          style={{
            padding: "7px 14px",
            borderRadius: "6px",
            backgroundColor: selectedIds.length > 0 ? "#F5F3FF" : "#F8FAFC",
            border: selectedIds.length > 0 ? "1px solid #C4B5FD" : "1px solid #CBD5E1",
            fontSize: "12.5px",
            fontWeight: 600,
            color: selectedIds.length > 0 ? "#6D28D9" : "#64748B",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          <Tag size={14} />
          <span>Bulk Tag {selectedIds.length > 0 ? `(${selectedIds.length})` : ""}</span>
        </button>

        <button
          onClick={() => setShowCsvModal(true)}
          style={{
            padding: "7px 14px",
            borderRadius: "6px",
            backgroundColor: "#ffffff",
            border: "1px solid #CBD5E1",
            fontSize: "12.5px",
            fontWeight: 600,
            color: "#334155",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          <Upload size={14} />
          <span>Import Leads (CSV)</span>
        </button>

        {selectedIds.length > 0 && (
          <span style={{ fontSize: "12.5px", color: "#2563EB", fontWeight: 600, marginLeft: "auto" }}>
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
                <th
                  onClick={() => handleHeaderSort("name")}
                  className="crm-th-sortable"
                  style={{ padding: "12px 14px", fontWeight: 600 }}
                  title="Click to sort by Name"
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span>NAME</span>
                    {sortOption === "name_asc" ? (
                      <ArrowUp size={13} color="#2563EB" />
                    ) : sortOption === "name_desc" ? (
                      <ArrowDown size={13} color="#2563EB" />
                    ) : (
                      <ArrowUpDown size={12} color="#94A3B8" />
                    )}
                  </div>
                </th>
                <th style={{ padding: "12px 14px", fontWeight: 600 }}>COMPANY</th>
                <th style={{ padding: "12px 14px", fontWeight: 600 }}>PHONE / EMAIL</th>
                <th style={{ padding: "12px 14px", fontWeight: 600 }}>SOURCE</th>
                <th
                  onClick={() => handleHeaderSort("status")}
                  className="crm-th-sortable"
                  style={{ padding: "12px 14px", fontWeight: 600 }}
                  title="Click to sort by Status"
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span>STATUS</span>
                    {sortOption === "status_asc" ? (
                      <ArrowUp size={13} color="#2563EB" />
                    ) : sortOption === "status_desc" ? (
                      <ArrowDown size={13} color="#2563EB" />
                    ) : (
                      <ArrowUpDown size={12} color="#94A3B8" />
                    )}
                  </div>
                </th>
                <th style={{ padding: "12px 14px", fontWeight: 600 }}>NEXT FOLLOW-UP</th>
                <th style={{ padding: "12px 14px", fontWeight: 600 }}>OWNER</th>
                <th style={{ padding: "12px 14px", fontWeight: 600 }}>LOCATION</th>
                <th
                  onClick={() => handleHeaderSort("created")}
                  className="crm-th-sortable"
                  style={{ padding: "12px 14px", fontWeight: 600 }}
                  title="Click to sort by Creation Date"
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span>CREATED</span>
                    {sortOption === "created_asc" ? (
                      <ArrowUp size={13} color="#2563EB" />
                    ) : sortOption === "created_desc" ? (
                      <ArrowDown size={13} color="#2563EB" />
                    ) : (
                      <ArrowUpDown size={12} color="#94A3B8" />
                    )}
                  </div>
                </th>
                <th style={{ padding: "12px 14px", fontWeight: 600, textAlign: "right" }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1, 2, 3, 4, 5, 6].map((idx) => (
                  <tr key={idx} className="crm-skeleton-row" style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <td><div className="crm-skeleton-box" style={{ width: "16px" }} /></td>
                    <td><div className="crm-skeleton-box" style={{ width: "120px" }} /></td>
                    <td><div className="crm-skeleton-box" style={{ width: "130px" }} /></td>
                    <td><div className="crm-skeleton-box" style={{ width: "100px" }} /></td>
                    <td><div className="crm-skeleton-box" style={{ width: "70px" }} /></td>
                    <td><div className="crm-skeleton-box" style={{ width: "75px" }} /></td>
                    <td><div className="crm-skeleton-box" style={{ width: "95px" }} /></td>
                    <td><div className="crm-skeleton-box" style={{ width: "80px" }} /></td>
                    <td><div className="crm-skeleton-box" style={{ width: "60px" }} /></td>
                    <td><div className="crm-skeleton-box" style={{ width: "70px" }} /></td>
                    <td style={{ textAlign: "right" }}>
                      <div className="crm-skeleton-box" style={{ width: "45px", marginLeft: "auto" }} />
                    </td>
                  </tr>
                ))
              ) : sortedLeads.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ padding: "64px 20px", textAlign: "center", color: "#64748B" }}>
                    <div style={{ maxWidth: "400px", margin: "0 auto" }}>
                      <div
                        style={{
                          width: "52px",
                          height: "52px",
                          borderRadius: "50%",
                          backgroundColor: "#F1F5F9",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          margin: "0 auto 14px",
                          color: "#64748B"
                        }}
                      >
                        <Search size={24} />
                      </div>
                      <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
                        {activeFilterCount > 0 ? "No matching leads found" : "No leads available"}
                      </h3>
                      <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#64748B" }}>
                        {activeFilterCount > 0
                          ? "Try adjusting or clearing your search keywords and filter criteria."
                          : "Get started by logging a new call or importing leads using a CSV file."}
                      </p>
                      {activeFilterCount > 0 ? (
                        <button
                          onClick={handleClearFilters}
                          style={{
                            padding: "8px 18px",
                            borderRadius: "8px",
                            backgroundColor: "#2563EB",
                            color: "#ffffff",
                            border: "none",
                            fontSize: "13px",
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px"
                          }}
                        >
                          <RotateCcw size={14} />
                          <span>Clear All Filters</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate("/dashboard/crm/new-call")}
                          style={{
                            padding: "8px 18px",
                            borderRadius: "8px",
                            backgroundColor: "#2563EB",
                            color: "#ffffff",
                            border: "none",
                            fontSize: "13px",
                            fontWeight: 600,
                            cursor: "pointer"
                          }}
                        >
                          + Add Lead / New Call
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((lead) => {
                  const followUp = getFollowUpInfo(lead);
                  const isOverdue = followUp.isOverdue;
                  const isToday = followUp.isToday;

                  return (
                    <tr
                      key={lead.id}
                      className="crm-lead-table-row"
                      style={{
                        borderLeft: isOverdue
                          ? "3px solid #EF4444"
                          : isToday
                          ? "3px solid #F59E0B"
                          : "3px solid transparent"
                      }}
                    >
                      <td style={{ padding: "12px 14px" }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(lead.id)}
                          onChange={() => toggleSelectOne(lead.id)}
                          style={{ cursor: "pointer" }}
                        />
                      </td>

                      {/* Lead Name & Title */}
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontWeight: 600, color: "#0F172A" }}>
                          {lead.contactName || lead.title || "—"}
                        </div>
                        {lead.contactName && lead.title && lead.contactName !== lead.title && (
                          <div style={{ fontSize: "11px", color: "#64748B", marginTop: "1px" }}>
                            {lead.title}
                          </div>
                        )}
                      </td>

                      {/* Company */}
                      <td style={{ padding: "12px 14px", color: "#334155" }}>
                        {lead.companyName || "—"}
                      </td>

                      {/* Phone / Email */}
                      <td style={{ padding: "12px 14px", color: "#334155" }}>
                        <div>{lead.contactPhone || lead.phone || "—"}</div>
                        {(lead.contactEmail || lead.email) && (
                          <div style={{ fontSize: "11px", color: "#64748B", marginTop: "1px" }}>
                            {lead.contactEmail || lead.email}
                          </div>
                        )}
                      </td>

                      {/* Source */}
                      <td style={{ padding: "12px 14px", color: "#64748B", textTransform: "capitalize" }}>
                        {lead.source?.replace("_", " ") || "—"}
                      </td>

                      {/* Status */}
                      <td style={{ padding: "12px 14px" }}>
                        <LeadStatusBadge status={lead.status || "NEW"} />
                      </td>

                      {/* Next Follow-Up */}
                      <td style={{ padding: "12px 14px" }}>
                        {isOverdue ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "3px 8px",
                              borderRadius: "6px",
                              backgroundColor: "#FEF2F2",
                              color: "#DC2626",
                              border: "1px solid #FECACA",
                              fontSize: "11.5px",
                              fontWeight: 600
                            }}
                            title={`Overdue follow-up scheduled for ${lead.nextFollowUpDate}`}
                          >
                            <AlertTriangle size={12} />
                            <span>{followUp.label}</span>
                          </span>
                        ) : isToday ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "3px 8px",
                              borderRadius: "6px",
                              backgroundColor: "#FFFBEB",
                              color: "#D97706",
                              border: "1px solid #FDE68A",
                              fontSize: "11.5px",
                              fontWeight: 600
                            }}
                            title="Follow-up due today"
                          >
                            <Clock size={12} />
                            <span>{followUp.label}</span>
                          </span>
                        ) : followUp.type === "upcoming" ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "3px 8px",
                              borderRadius: "6px",
                              backgroundColor: "#F8FAFC",
                              color: "#475569",
                              border: "1px solid #E2E8F0",
                              fontSize: "11.5px",
                              fontWeight: 500
                            }}
                          >
                            <Calendar size={12} color="#64748B" />
                            <span>{followUp.label}</span>
                          </span>
                        ) : (
                          <span style={{ color: "#94A3B8", fontSize: "12px" }}>—</span>
                        )}
                      </td>

                      {/* Owner */}
                      <td style={{ padding: "12px 14px", color: "#334155" }}>
                        {lead.ownerAdminName || lead.assignedTo || "—"}
                      </td>

                      {/* Location */}
                      <td style={{ padding: "12px 14px", color: "#64748B" }}>
                        {lead.city || "—"}
                      </td>

                      {/* Created At */}
                      <td style={{ padding: "12px 14px", color: "#64748B", whiteSpace: "nowrap" }}>
                        {lead.createdAt
                          ? new Date(lead.createdAt).toLocaleDateString([], {
                              day: "2-digit",
                              month: "short",
                              year: "numeric"
                            })
                          : "—"}
                      </td>

                      {/* Actions */}
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Page Size Controls Footer */}
        {!loading && sortedLeads.length > 0 && (
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
            {/* Left: Summary + Page Size Dropdown */}
            <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
              <div>
                Showing <strong>{Math.min(sortedLeads.length, (currentPage - 1) * pageSize + 1)}</strong> to{" "}
                <strong>{Math.min(sortedLeads.length, currentPage * pageSize)}</strong> of{" "}
                <strong>{sortedLeads.length}</strong> leads
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
                    backgroundColor: "#fff"
                  }}
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Right: Pagination Controls */}
            <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                title="First Page"
                style={{
                  padding: "5px 8px",
                  borderRadius: "6px",
                  border: "1px solid #CBD5E1",
                  backgroundColor: currentPage === 1 ? "#F1F5F9" : "#ffffff",
                  color: currentPage === 1 ? "#94A3B8" : "#334155",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer"
                }}
              >
                <ChevronsLeft size={14} />
              </button>

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

              <span style={{ padding: "0 8px", fontWeight: 600, color: "#0F172A", fontSize: "12.5px" }}>
                Page {currentPage} of {totalPages}
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

              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage >= totalPages}
                title="Last Page"
                style={{
                  padding: "5px 8px",
                  borderRadius: "6px",
                  border: "1px solid #CBD5E1",
                  backgroundColor: currentPage >= totalPages ? "#F1F5F9" : "#ffffff",
                  color: currentPage >= totalPages ? "#94A3B8" : "#334155",
                  cursor: currentPage >= totalPages ? "not-allowed" : "pointer"
                }}
              >
                <ChevronsRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Bottom Action Bar for Multi-Select */}
      {selectedIds.length > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#0F172A",
            color: "#ffffff",
            borderRadius: "14px",
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            gap: "18px",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.2)",
            zIndex: 1200,
            animation: "crmSlideUp 0.2s ease-out"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                backgroundColor: "#2563EB",
                color: "#fff",
                borderRadius: "12px",
                padding: "2px 8px",
                fontSize: "12px",
                fontWeight: 700
              }}
            >
              {selectedIds.length}
            </span>
            <span style={{ fontSize: "13px", fontWeight: 600 }}>
              {selectedIds.length === 1 ? "lead selected" : "leads selected"}
            </span>
          </div>

          <div style={{ height: "20px", width: "1px", backgroundColor: "#334155" }} />

          <button
            onClick={() => setShowBulkAssignModal(true)}
            style={{
              padding: "7px 14px",
              borderRadius: "8px",
              backgroundColor: "#2563EB",
              color: "#ffffff",
              border: "none",
              fontSize: "12.5px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <UserCheck size={14} />
            <span>Bulk Assign</span>
          </button>

          <button
            onClick={() => setShowBulkTagModal(true)}
            style={{
              padding: "7px 14px",
              borderRadius: "8px",
              backgroundColor: "#1E293B",
              color: "#ffffff",
              border: "1px solid #475569",
              fontSize: "12.5px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <Tag size={14} />
            <span>Bulk Tag</span>
          </button>

          <button
            onClick={handleExportCSV}
            style={{
              padding: "7px 14px",
              borderRadius: "8px",
              backgroundColor: "#1E293B",
              color: "#E2E8F0",
              border: "1px solid #334155",
              fontSize: "12.5px",
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <Download size={14} />
            <span>Export ({selectedIds.length})</span>
          </button>

          <button
            onClick={() => setSelectedIds([])}
            style={{
              background: "none",
              border: "none",
              color: "#94A3B8",
              fontSize: "12px",
              cursor: "pointer",
              textDecoration: "underline",
              marginLeft: "4px"
            }}
          >
            Deselect
          </button>
        </div>
      )}

      {/* Bulk Assign Modal */}
      {showBulkAssignModal && (
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
          onClick={() => setShowBulkAssignModal(false)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "460px",
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
                  Bulk Assign Leads
                </h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#64748B" }}>
                  Assigning {selectedIds.length} selected lead{selectedIds.length > 1 ? "s" : ""} to a sales owner
                </p>
              </div>
              <button
                onClick={() => setShowBulkAssignModal(false)}
                style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleBulkAssignSubmit} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                  Select Sales Administrator *
                </label>
                <select
                  required
                  value={targetStaffId}
                  onChange={(e) => setTargetStaffId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #CBD5E1",
                    fontSize: "13px",
                    backgroundColor: "#fff"
                  }}
                >
                  <option value="">-- Choose Sales Admin --</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name || s.username || s.email} {s.role ? `(${s.role})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setShowBulkAssignModal(false)}
                  style={{
                    padding: "9px 16px",
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
                  disabled={assigningLoading || !targetStaffId}
                  style={{
                    padding: "9px 20px",
                    borderRadius: "8px",
                    backgroundColor: "#2563EB",
                    border: "none",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#fff",
                    cursor: assigningLoading || !targetStaffId ? "not-allowed" : "pointer"
                  }}
                >
                  {assigningLoading ? "Assigning..." : `Assign ${selectedIds.length} Leads`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Tag Modal */}
      {showBulkTagModal && (
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
          onClick={() => setShowBulkTagModal(false)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "460px",
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
                  Bulk Tag Leads
                </h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#64748B" }}>
                  Add tags to {selectedIds.length} selected lead{selectedIds.length > 1 ? "s" : ""}
                </p>
              </div>
              <button
                onClick={() => setShowBulkTagModal(false)}
                style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleBulkTagSubmit} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                  Enter Tags (Comma-separated) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ev-fleet, high-priority, q4-pipeline"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #CBD5E1",
                    fontSize: "13px",
                    boxSizing: "border-box"
                  }}
                />
                <span style={{ display: "block", marginTop: "4px", fontSize: "11px", color: "#94A3B8" }}>
                  Multiple tags can be separated by commas (e.g. "ev-fleet, priority").
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setShowBulkTagModal(false)}
                  style={{
                    padding: "9px 16px",
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
                  disabled={taggingLoading || !tagInput.trim()}
                  style={{
                    padding: "9px 20px",
                    borderRadius: "8px",
                    backgroundColor: "#2563EB",
                    border: "none",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#fff",
                    cursor: taggingLoading || !tagInput.trim() ? "not-allowed" : "pointer"
                  }}
                >
                  {taggingLoading ? "Applying..." : "Apply Tags"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Improved Bulk Lead Upload Modal */}
      <BulkLeadUploadModal
        isOpen={showCsvModal}
        onClose={() => setShowCsvModal(false)}
        onSuccess={() => {
          fetchLeads();
        }}
        showToast={showToast}
      />

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
