import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Users,
  UserCheck,
  CheckCircle2,
  Clock,
  Award,
  AlertCircle,
  RefreshCw,
  Download,
  Filter,
  Search,
  Calendar,
  ChevronRight,
  Eye,
  X,
  Phone,
  Mail,
  Building2,
  DollarSign,
  ArrowUpRight,
  SlidersHorizontal,
  ChevronDown,
  ExternalLink
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from "recharts";
import { staffService } from "../../../../services/staffService";
import { crmService } from "../../../../services/crmService";
import { Toast } from "../../../../components/common/Toast";
import { LeadStatusBadge, LEAD_STATUS_CONFIG } from "../../../../components/crm/CrmBadge";
import { LeadDetailDrawer } from "../../../../components/crm/LeadDetailDrawer";

// Color tokens for modern dashboard design
const COLORS = {
  primary: "#2563EB",
  primaryLight: "#EFF6FF",
  success: "#10B981",
  successLight: "#ECFDF5",
  warning: "#F59E0B",
  warningLight: "#FFFBEB",
  danger: "#EF4444",
  dangerLight: "#FEF2F2",
  purple: "#8B5CF6",
  purpleLight: "#F5F3FF",
  indigo: "#6366F1",
  slateDark: "#0F172A",
  slateMedium: "#475569",
  slateLight: "#64748B",
  border: "#E2E8F0",
  bgLight: "#F8FAFC"
};

const STATUS_COLORS = {
  NEW: "#3B82F6",
  CONTACTED: "#F59E0B",
  QUALIFIED: "#8B5CF6",
  CONVERTED: "#10B981",
  LOST: "#EF4444",
  PENDING: "#6366F1"
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

// Normalize backend lead status
const normalizeStatus = (rawStatus) => {
  if (!rawStatus) return "NEW";
  const s = String(rawStatus).toUpperCase().trim();
  if (s === "WON" || s === "CLOSED_WON") return "CONVERTED";
  if (s === "NURTURE") return "PENDING";
  if (s === "IN_PROGRESS" || s === "FOLLOW_UP" || s === "FOLLOWUP") return "CONTACTED";
  return s;
};

// Check if a lead belongs to an account
const isLeadHandledByAccount = (lead, account) => {
  if (!lead || !account) return false;

  // Match by direct ID
  if (account.id && lead.ownerAdminId && String(lead.ownerAdminId) === String(account.id)) {
    return true;
  }
  if (account.id && lead.assignedToId && String(lead.assignedToId) === String(account.id)) {
    return true;
  }
  if (account.id && lead.adminId && String(lead.adminId) === String(account.id)) {
    return true;
  }

  const accEmail = (account.email || "").toLowerCase().trim();
  const accName = (account.name || "").toLowerCase().trim();
  const accUsername = accEmail.includes("@") ? accEmail.split("@")[0].trim() : accEmail;

  const leadOwnerName = (lead.ownerAdminName || "").toLowerCase().trim();
  const leadAssigned = (lead.assignedTo || "").toLowerCase().trim();
  const leadOwnerEmail = (lead.ownerAdminEmail || "").toLowerCase().trim();
  const leadCreatedBy = (lead.createdBy || "").toLowerCase().trim();
  const leadCreatedByName = (lead.createdByName || "").toLowerCase().trim();
  const leadCreatedByEmail = (lead.createdByAdminEmail || "").toLowerCase().trim();

  if (accEmail) {
    if (leadOwnerEmail === accEmail || leadAssigned === accEmail || leadOwnerName === accEmail) return true;
    if (leadCreatedByEmail === accEmail || leadCreatedBy === accEmail) return true;
  }
  if (accName) {
    if (leadOwnerName === accName || leadAssigned === accName || leadCreatedByName === accName || leadCreatedBy === accName) return true;
  }
  if (accUsername) {
    if (leadOwnerName === accUsername || leadAssigned === accUsername) return true;
    if (leadOwnerName.includes(accUsername) || leadAssigned.includes(accUsername)) return true;
  }

  return false;
};

// Check if lead was originated/created by an account
const isLeadCreatedByAccount = (lead, account) => {
  if (!lead || !account) return false;
  if (account.id && lead.createdByAdminId && String(lead.createdByAdminId) === String(account.id)) {
    return true;
  }
  const accEmail = (account.email || "").toLowerCase().trim();
  const accName = (account.name || "").toLowerCase().trim();
  const leadCreatedBy = (lead.createdBy || "").toLowerCase().trim();
  const leadCreatedByName = (lead.createdByName || "").toLowerCase().trim();
  const leadCreatedByEmail = (lead.createdByAdminEmail || "").toLowerCase().trim();

  if (accEmail && (leadCreatedByEmail === accEmail || leadCreatedBy === accEmail)) return true;
  if (accName && (leadCreatedByName === accName || leadCreatedBy === accName)) return true;
  return false;
};

// Format currency in Indian notation
const formatCurrency = (val) => {
  if (val === undefined || val === null || isNaN(Number(val))) return "₹0";
  const num = Number(val);
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
  return `₹${num.toLocaleString("en-IN")}`;
};

export default function SalesPerformanceOverview() {
  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Raw Backend Data
  const [allStaff, setAllStaff] = useState([]);
  const [allLeads, setAllLeads] = useState([]);

  // Filters
  const [periodFilter, setPeriodFilter] = useState("overall"); // "overall" | "yearly" | "monthly"
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth());
  const [selectedAccountFilter, setSelectedAccountFilter] = useState("ALL"); // "ALL" or staff.id or staff.email
  const [searchQuery, setSearchQuery] = useState("");
  const [staffScope, setStaffScope] = useState("sales"); // "sales" | "all"

  // Lead inspection drawer
  const [inspectAccount, setInspectAccount] = useState(null);
  const [inspectSearch, setInspectSearch] = useState("");
  const [inspectStatusFilter, setInspectStatusFilter] = useState("ALL");
  const [selectedLeadIdForDrawer, setSelectedLeadIdForDrawer] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  // Fetch live backend data
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [staffRes, leadsRes] = await Promise.all([
        staffService.getAllStaff().catch((err) => {
          console.warn("Staff fetch fallback:", err);
          return [];
        }),
        crmService.getAllLeads().catch((err) => {
          console.warn("Leads fetch fallback:", err);
          return [];
        })
      ]);

      const staffList = Array.isArray(staffRes)
        ? staffRes
        : staffRes?.adminUsers || staffRes?.users || [];
      const leadsList = Array.isArray(leadsRes)
        ? leadsRes
        : leadsRes?.leads || leadsRes?.data || [];

      setAllStaff(staffList);
      setAllLeads(leadsList);

      if (isRefresh) {
        showToast("Sales performance data refreshed successfully", "success");
      }
    } catch (err) {
      console.error("Error loading sales overview:", err);
      setError(err.message || "Failed to fetch sales performance data from backend");
      showToast(err.message || "Failed to load sales data", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Extract available years from leads data
  const availableYears = useMemo(() => {
    const years = new Set([new Date().getFullYear()]);
    allLeads.forEach((l) => {
      const dateStr = l.createdAt || l.createdDate || l.date || l.updatedAt;
      if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          years.add(d.getFullYear());
        }
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [allLeads]);

  // Filter and identify Sales Accounts
  // Matches accounts with role SALES / SALES_ADMIN, email/name containing sale, or known accounts
  const salesAccounts = useMemo(() => {
    // 1. Filter from registered staff
    const staffAccounts = allStaff.filter((s) => {
      if (staffScope === "all") return true;
      const role = (s.role || "").toUpperCase();
      const email = (s.email || "").toLowerCase();
      const name = (s.name || "").toLowerCase();
      return (
        role.includes("SALES") ||
        role === "SALES_ADMIN" ||
        role === "SALES" ||
        email.includes("sale") ||
        name.includes("sale")
      );
    });

    // 2. Discover any additional sales accounts present in leads
    const staffEmails = new Set(allStaff.map((s) => (s.email || "").toLowerCase().trim()).filter(Boolean));
    const staffNames = new Set(allStaff.map((s) => (s.name || "").toLowerCase().trim()).filter(Boolean));

    const extraAccounts = [];
    allLeads.forEach((l) => {
      const ownerName = l.ownerAdminName || l.assignedTo || "";
      const ownerEmail = l.ownerAdminEmail || (ownerName.includes("@") ? ownerName : "");
      const normalizedOwner = ownerName.toLowerCase().trim();

      if (
        normalizedOwner &&
        (normalizedOwner.includes("sale") || normalizedOwner.includes("bentork") || normalizedOwner.includes("jayesh")) &&
        !staffNames.has(normalizedOwner) &&
        !staffEmails.has(normalizedOwner)
      ) {
        staffNames.add(normalizedOwner);
        extraAccounts.push({
          id: `lead_owner_${normalizedOwner}`,
          name: ownerName,
          email: ownerEmail || `${normalizedOwner}@bentork.in`,
          role: "SALES",
          active: true,
          isDerived: true
        });
      }
    });

    return [...staffAccounts, ...extraAccounts];
  }, [allStaff, allLeads, staffScope]);

  // Leads filtered by Date Period
  const dateFilteredLeads = useMemo(() => {
    if (periodFilter === "overall") return allLeads;

    return allLeads.filter((l) => {
      const dateStr = l.createdAt || l.createdDate || l.date || l.updatedAt;
      if (!dateStr) return true; // keep if no timestamp
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return true;

      const y = d.getFullYear();
      const m = d.getMonth();

      if (periodFilter === "yearly") {
        return y === Number(selectedYear);
      }
      if (periodFilter === "monthly") {
        return y === Number(selectedYear) && m === Number(selectedMonth);
      }
      return true;
    });
  }, [allLeads, periodFilter, selectedYear, selectedMonth]);

  // Compute metrics per account
  const accountMetricsList = useMemo(() => {
    return salesAccounts.map((account) => {
      // Leads handled by this account within the selected date window
      const handledLeads = dateFilteredLeads.filter((l) => isLeadHandledByAccount(l, account));
      const totalHandled = handledLeads.length;

      // Leads created by this account
      const createdCount = dateFilteredLeads.filter((l) => isLeadCreatedByAccount(l, account)).length;

      // Categorize statuses without double counting
      let newCount = 0;
      let contactedCount = 0;
      let qualifiedCount = 0;
      let convertedCount = 0;
      let lostCount = 0;
      let pendingCount = 0;
      let pipelineValue = 0;
      let convertedValue = 0;

      handledLeads.forEach((l) => {
        const status = normalizeStatus(l.status);
        const val = parseFloat(l.estimatedValue) || 0;
        pipelineValue += val;

        if (status === "CONVERTED") {
          convertedCount++;
          convertedValue += val;
        } else if (status === "LOST") {
          lostCount++;
        } else if (status === "QUALIFIED") {
          qualifiedCount++;
        } else if (status === "CONTACTED") {
          contactedCount++;
        } else if (status === "PENDING") {
          pendingCount++;
        } else {
          // Status === "NEW"
          newCount++;
        }
      });

      // Strict partitioning:
      // Processed = leads actioned (contacted, qualified, converted, lost)
      // Pending = leads awaiting initial contact or nurture (new, pending)
      const processedCount = contactedCount + qualifiedCount + convertedCount + lostCount;
      const pendingTotal = newCount + pendingCount;

      // Verify no double counting: processedCount + pendingTotal must equal totalHandled
      const conversionRate = totalHandled > 0 ? ((convertedCount / totalHandled) * 100) : 0;
      const winRate = processedCount > 0 ? ((convertedCount / processedCount) * 100) : 0;

      return {
        account,
        totalHandled,
        createdCount,
        processedCount,
        pendingTotal,
        newCount,
        contactedCount,
        qualifiedCount,
        convertedCount,
        lostCount,
        pipelineValue,
        convertedValue,
        conversionRate,
        winRate,
        leads: handledLeads
      };
    });
  }, [salesAccounts, dateFilteredLeads]);

  // Filtered accounts for display (search + account selection)
  const filteredAccountMetrics = useMemo(() => {
    return accountMetricsList.filter(({ account }) => {
      // Account dropdown filter
      if (selectedAccountFilter !== "ALL") {
        const matchesId = String(account.id) === String(selectedAccountFilter);
        const matchesEmail = account.email && account.email.toLowerCase() === selectedAccountFilter.toLowerCase();
        if (!matchesId && !matchesEmail) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = account.name && account.name.toLowerCase().includes(q);
        const emailMatch = account.email && account.email.toLowerCase().includes(q);
        const roleMatch = account.role && account.role.toLowerCase().includes(q);
        return nameMatch || emailMatch || roleMatch;
      }

      return true;
    });
  }, [accountMetricsList, selectedAccountFilter, searchQuery]);

  // Overall Aggregated KPI Cards Data
  const summaryKPIs = useMemo(() => {
    // If a specific account is selected in the dropdown filter, calculate for that account; otherwise for all visible accounts
    const activeList = selectedAccountFilter !== "ALL"
      ? accountMetricsList.filter(({ account }) =>
          String(account.id) === String(selectedAccountFilter) ||
          (account.email && account.email.toLowerCase() === selectedAccountFilter.toLowerCase())
        )
      : accountMetricsList;

    const totalHandled = activeList.reduce((sum, item) => sum + item.totalHandled, 0);
    const leadsCreated = activeList.reduce((sum, item) => sum + item.createdCount, 0);
    const leadsProcessed = activeList.reduce((sum, item) => sum + item.processedCount, 0);
    const pendingLeads = activeList.reduce((sum, item) => sum + item.pendingTotal, 0);
    const convertedLeads = activeList.reduce((sum, item) => sum + item.convertedCount, 0);
    const lostLeads = activeList.reduce((sum, item) => sum + item.lostCount, 0);

    const newLeads = activeList.reduce((sum, item) => sum + item.newCount, 0);
    const contactedLeads = activeList.reduce((sum, item) => sum + item.contactedCount, 0);
    const qualifiedLeads = activeList.reduce((sum, item) => sum + item.qualifiedCount, 0);

    const totalPipelineValue = activeList.reduce((sum, item) => sum + item.pipelineValue, 0);
    const totalWonValue = activeList.reduce((sum, item) => sum + item.convertedValue, 0);

    const conversionRate = totalHandled > 0 ? ((convertedLeads / totalHandled) * 100).toFixed(1) : "0.0";
    const processedRate = totalHandled > 0 ? ((leadsProcessed / totalHandled) * 100).toFixed(1) : "0.0";
    const pendingRate = totalHandled > 0 ? ((pendingLeads / totalHandled) * 100).toFixed(1) : "0.0";
    const winRate = leadsProcessed > 0 ? ((convertedLeads / leadsProcessed) * 100).toFixed(1) : "0.0";

    return {
      totalHandled,
      leadsCreated,
      leadsProcessed,
      pendingLeads,
      convertedLeads,
      lostLeads,
      newLeads,
      contactedLeads,
      qualifiedLeads,
      totalPipelineValue,
      totalWonValue,
      conversionRate,
      processedRate,
      pendingRate,
      winRate
    };
  }, [accountMetricsList, selectedAccountFilter]);

  // Chart 1 Data: Account-Wise Performance Comparison
  const accountChartData = useMemo(() => {
    return filteredAccountMetrics
      .filter((item) => item.totalHandled > 0 || item.createdCount > 0)
      .map(({ account, totalHandled, createdCount, processedCount, pendingTotal, convertedCount, conversionRate }) => {
        const shortName = account.name
          ? (account.name.length > 14 ? `${account.name.slice(0, 12)}…` : account.name)
          : (account.email ? account.email.split("@")[0] : "Staff");

        return {
          name: shortName,
          fullName: account.name || account.email,
          email: account.email,
          Handled: totalHandled,
          Created: createdCount,
          Processed: processedCount,
          Pending: pendingTotal,
          Converted: convertedCount,
          rate: conversionRate.toFixed(1)
        };
      })
      .slice(0, 10); // top 10 for clean readable display
  }, [filteredAccountMetrics]);

  // Chart 2 Data: Monthly Trends / Timeline
  const monthlyTrendData = useMemo(() => {
    const monthsMap = {};
    MONTH_SHORT.forEach((m, idx) => {
      monthsMap[idx] = { month: m, total: 0, processed: 0, converted: 0 };
    });

    // Check relevant leads based on account filter
    const targetLeads = selectedAccountFilter !== "ALL"
      ? dateFilteredLeads.filter((l) => {
          const acc = salesAccounts.find((a) =>
            String(a.id) === String(selectedAccountFilter) ||
            (a.email && a.email.toLowerCase() === selectedAccountFilter.toLowerCase())
          );
          return isLeadHandledByAccount(l, acc);
        })
      : dateFilteredLeads;

    targetLeads.forEach((l) => {
      const dateStr = l.createdAt || l.createdDate || l.date;
      if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          const m = d.getMonth();
          if (monthsMap[m]) {
            monthsMap[m].total += 1;
            const status = normalizeStatus(l.status);
            if (["CONTACTED", "QUALIFIED", "CONVERTED", "LOST"].includes(status)) {
              monthsMap[m].processed += 1;
            }
            if (status === "CONVERTED") {
              monthsMap[m].converted += 1;
            }
          }
        }
      }
    });

    return Object.values(monthsMap);
  }, [dateFilteredLeads, selectedAccountFilter, salesAccounts]);

  // Chart 3 Data: Status Distribution Pie / Donut
  const statusPieData = useMemo(() => {
    const list = [
      { name: "New", value: summaryKPIs.newLeads, color: STATUS_COLORS.NEW },
      { name: "Contacted", value: summaryKPIs.contactedLeads, color: STATUS_COLORS.CONTACTED },
      { name: "Qualified", value: summaryKPIs.qualifiedLeads, color: STATUS_COLORS.QUALIFIED },
      { name: "Converted", value: summaryKPIs.convertedLeads, color: STATUS_COLORS.CONVERTED },
      { name: "Lost", value: summaryKPIs.lostLeads, color: STATUS_COLORS.LOST },
      { name: "Pending / Nurture", value: summaryKPIs.pendingLeads - summaryKPIs.newLeads, color: STATUS_COLORS.PENDING }
    ].filter((item) => item.value > 0);

    return list.length > 0 ? list : [{ name: "No Leads", value: 1, color: "#E2E8F0" }];
  }, [summaryKPIs]);

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = [
      "Staff Name",
      "Email",
      "Role",
      "Status",
      "Leads Handled",
      "Leads Created",
      "Processed Leads",
      "Processed %",
      "Pending Leads",
      "Pending %",
      "Converted / Won",
      "Conversion Rate %",
      "Lost Leads",
      "Pipeline Value (INR)"
    ];

    const rows = filteredAccountMetrics.map(({ account, totalHandled, createdCount, processedCount, pendingTotal, convertedCount, lostCount, pipelineValue, conversionRate }) => {
      const pRate = totalHandled > 0 ? ((processedCount / totalHandled) * 100).toFixed(1) : "0.0";
      const pendRate = totalHandled > 0 ? ((pendingTotal / totalHandled) * 100).toFixed(1) : "0.0";

      return [
        `"${account.name || "N/A"}"`,
        `"${account.email || "N/A"}"`,
        `"${account.role || "SALES"}"`,
        `"${account.active !== false ? "Active" : "Suspended"}"`,
        totalHandled,
        createdCount,
        processedCount,
        `"${pRate}%"`,
        pendingTotal,
        `"${pendRate}%"`,
        convertedCount,
        `"${conversionRate.toFixed(1)}%"`,
        lostCount,
        pipelineValue
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const periodLabel = periodFilter === "overall" ? "overall" : periodFilter === "yearly" ? `${selectedYear}` : `${MONTH_SHORT[selectedMonth]}_${selectedYear}`;
    link.setAttribute("download", `sales_accounts_performance_${periodLabel}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Downloaded Sales Accounts Performance CSV", "success");
  };

  // Inspect Leads filtering
  const inspectedLeads = useMemo(() => {
    if (!inspectAccount) return [];
    return inspectAccount.leads.filter((l) => {
      if (inspectStatusFilter !== "ALL") {
        if (normalizeStatus(l.status) !== inspectStatusFilter) return false;
      }
      if (inspectSearch.trim()) {
        const q = inspectSearch.toLowerCase();
        const titleMatch = l.title && l.title.toLowerCase().includes(q);
        const compMatch = l.companyName && l.companyName.toLowerCase().includes(q);
        const contactMatch = l.contactPerson && l.contactPerson.toLowerCase().includes(q);
        const phoneMatch = (l.phone || l.contactPhone || "").includes(q);
        return titleMatch || compMatch || contactMatch || phoneMatch;
      }
      return true;
    });
  }, [inspectAccount, inspectStatusFilter, inspectSearch]);

  return (
    <div style={{ padding: "0 0 32px 0", maxWidth: "1600px", margin: "0 auto", fontFamily: "'Lexend', sans-serif" }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #0F172A 0%, #1E293B 55%, #1E3A8A 100%)",
          borderRadius: "20px",
          padding: "28px 32px",
          color: "#FFFFFF",
          marginBottom: "24px",
          boxShadow: "0 10px 30px -8px rgba(15, 23, 42, 0.35)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "20px"
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <span
              style={{
                backgroundColor: "rgba(37, 99, 235, 0.25)",
                color: "#60A5FA",
                border: "1px solid rgba(96, 165, 250, 0.35)",
                padding: "4px 12px",
                borderRadius: "9999px",
                fontSize: "12px",
                fontWeight: 600,
                letterSpacing: "0.04em",
                textTransform: "uppercase"
              }}
            >
              Admin Analytics
            </span>
            <span style={{ color: "#94A3B8", fontSize: "13px" }}>
              • {salesAccounts.length} Registered Sales Accounts
            </span>
          </div>
          <h1 style={{ fontSize: "26px", fontWeight: 700, margin: "0 0 6px 0", letterSpacing: "-0.02em" }}>
            Sales Accounts Performance & Analytics
          </h1>
          <p style={{ margin: 0, color: "#CBD5E1", fontSize: "14px", maxWidth: "680px", lineHeight: 1.5 }}>
            Live performance tracking across all Sales Panel accounts including lead acquisition, processing velocity, and won conversions.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <button
            onClick={() => loadData(true)}
            disabled={refreshing || loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              backgroundColor: "rgba(255, 255, 255, 0.12)",
              color: "#FFFFFF",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "12px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: refreshing || loading ? "not-allowed" : "pointer",
              transition: "all 0.2s ease"
            }}
          >
            <RefreshCw size={15} className={refreshing ? "spin-animation" : ""} />
            {refreshing ? "Refreshing..." : "Refresh Data"}
          </button>

          <button
            onClick={handleExportCSV}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              backgroundColor: "#2563EB",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "12px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(37, 99, 235, 0.4)",
              transition: "all 0.2s ease"
            }}
          >
            <Download size={15} />
            Export Overview CSV
          </button>
        </div>
      </div>

      {/* Control Bar: Filters (Monthly / Yearly / Overall, Account, Search) */}
      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "16px",
          padding: "16px 20px",
          border: `1px solid ${COLORS.border}`,
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px"
        }}
      >
        {/* Left: Period Tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <div
            style={{
              display: "inline-flex",
              backgroundColor: "#F1F5F9",
              padding: "4px",
              borderRadius: "12px",
              border: "1px solid #E2E8F0"
            }}
          >
            <button
              onClick={() => setPeriodFilter("overall")}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                backgroundColor: periodFilter === "overall" ? "#FFFFFF" : "transparent",
                color: periodFilter === "overall" ? "#0F172A" : "#64748B",
                boxShadow: periodFilter === "overall" ? "0 2px 6px rgba(0, 0, 0, 0.08)" : "none",
                transition: "all 0.15s ease"
              }}
            >
              Overall All-Time
            </button>
            <button
              onClick={() => setPeriodFilter("yearly")}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                backgroundColor: periodFilter === "yearly" ? "#FFFFFF" : "transparent",
                color: periodFilter === "yearly" ? "#0F172A" : "#64748B",
                boxShadow: periodFilter === "yearly" ? "0 2px 6px rgba(0, 0, 0, 0.08)" : "none",
                transition: "all 0.15s ease"
              }}
            >
              Yearly Analytics
            </button>
            <button
              onClick={() => setPeriodFilter("monthly")}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                backgroundColor: periodFilter === "monthly" ? "#FFFFFF" : "transparent",
                color: periodFilter === "monthly" ? "#0F172A" : "#64748B",
                boxShadow: periodFilter === "monthly" ? "0 2px 6px rgba(0, 0, 0, 0.08)" : "none",
                transition: "all 0.15s ease"
              }}
            >
              Monthly Analytics
            </button>
          </div>

          {/* Year selector (visible when Yearly or Monthly is selected) */}
          {periodFilter !== "overall" && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748B" }}>Year:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                style={{
                  padding: "8px 12px",
                  borderRadius: "10px",
                  border: `1px solid ${COLORS.border}`,
                  backgroundColor: "#FFFFFF",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#0F172A",
                  outline: "none",
                  cursor: "pointer"
                }}
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Month selector (visible when Monthly is selected) */}
          {periodFilter === "monthly" && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748B" }}>Month:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                style={{
                  padding: "8px 12px",
                  borderRadius: "10px",
                  border: `1px solid ${COLORS.border}`,
                  backgroundColor: "#FFFFFF",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#0F172A",
                  outline: "none",
                  cursor: "pointer"
                }}
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right: Account filter & Search query */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Sales Account Dropdown Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748B" }}>Account:</span>
            <select
              value={selectedAccountFilter}
              onChange={(e) => setSelectedAccountFilter(e.target.value)}
              style={{
                padding: "8px 14px",
                borderRadius: "10px",
                border: `1px solid ${COLORS.border}`,
                backgroundColor: "#FFFFFF",
                fontSize: "13px",
                fontWeight: 600,
                color: "#0F172A",
                outline: "none",
                cursor: "pointer",
                maxWidth: "220px"
              }}
            >
              <option value="ALL">All Sales Accounts ({salesAccounts.length})</option>
              {salesAccounts.map((s) => (
                <option key={s.id || s.email} value={s.id || s.email}>
                  {s.name || s.email} {s.email ? `(${s.email})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              minWidth: "220px"
            }}
          >
            <Search
              size={16}
              style={{ position: "absolute", left: "12px", color: "#94A3B8" }}
            />
            <input
              type="text"
              placeholder="Search staff or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 36px",
                borderRadius: "10px",
                border: `1px solid ${COLORS.border}`,
                fontSize: "13px",
                outline: "none",
                boxSizing: "border-box"
              }}
            />
            {searchQuery && (
              <X
                size={14}
                style={{ position: "absolute", right: "10px", color: "#94A3B8", cursor: "pointer" }}
                onClick={() => setSearchQuery("")}
              />
            )}
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          style={{
            backgroundColor: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: "12px",
            padding: "16px 20px",
            color: "#991B1B",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <AlertCircle size={20} color="#DC2626" />
            <div>
              <strong>Failed to load live data:</strong> {error}
            </div>
          </div>
          <button
            onClick={() => loadData(true)}
            style={{
              padding: "6px 14px",
              backgroundColor: "#DC2626",
              color: "#FFF",
              border: "none",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* 6 Summary Overview KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "16px",
          marginBottom: "28px"
        }}
      >
        {/* Card 1: Total Leads Handled */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "16px",
            padding: "20px",
            border: `1px solid ${COLORS.border}`,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Total Leads Handled
            </span>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                backgroundColor: COLORS.primaryLight,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: COLORS.primary
              }}
            >
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#0F172A", marginBottom: "6px" }}>
            {loading ? "..." : summaryKPIs.totalHandled.toLocaleString()}
          </div>
          <div style={{ fontSize: "12px", color: "#64748B", display: "flex", alignItems: "center", gap: "4px" }}>
            <span>Pipeline Value:</span>
            <strong style={{ color: "#0F172A" }}>{formatCurrency(summaryKPIs.totalPipelineValue)}</strong>
          </div>
        </div>

        {/* Card 2: Leads Created */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "16px",
            padding: "20px",
            border: `1px solid ${COLORS.border}`,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Leads Created
            </span>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                backgroundColor: "#F3E8FF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#7E22CE"
              }}
            >
              <UserCheck size={18} />
            </div>
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#0F172A", marginBottom: "6px" }}>
            {loading ? "..." : summaryKPIs.leadsCreated.toLocaleString()}
          </div>
          <div style={{ fontSize: "12px", color: "#64748B" }}>
            Originated by staff accounts
          </div>
        </div>

        {/* Card 3: Leads Processed */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "16px",
            padding: "20px",
            border: `1px solid ${COLORS.border}`,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Leads Processed
            </span>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                backgroundColor: "#FEF3C7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#B45309"
              }}
            >
              <TrendingUp size={18} />
            </div>
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#0F172A", marginBottom: "6px" }}>
            {loading ? "..." : summaryKPIs.leadsProcessed.toLocaleString()}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px" }}>
            <span style={{ color: "#64748B" }}>Actioned:</span>
            <span style={{ fontWeight: 600, color: "#B45309", backgroundColor: "#FEF3C7", padding: "2px 8px", borderRadius: "6px" }}>
              {summaryKPIs.processedRate}% of total
            </span>
          </div>
        </div>

        {/* Card 4: Pending Leads */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "16px",
            padding: "20px",
            border: `1px solid ${COLORS.border}`,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Pending Leads
            </span>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                backgroundColor: "#EEF2FF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#4338CA"
              }}
            >
              <Clock size={18} />
            </div>
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#0F172A", marginBottom: "6px" }}>
            {loading ? "..." : summaryKPIs.pendingLeads.toLocaleString()}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px" }}>
            <span style={{ color: "#64748B" }}>Awaiting outreach:</span>
            <span style={{ fontWeight: 600, color: "#4338CA", backgroundColor: "#EEF2FF", padding: "2px 8px", borderRadius: "6px" }}>
              {summaryKPIs.pendingRate}%
            </span>
          </div>
        </div>

        {/* Card 5: Converted / Won Leads */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "16px",
            padding: "20px",
            border: `1px solid ${COLORS.border}`,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Converted / Won
            </span>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                backgroundColor: COLORS.successLight,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: COLORS.success
              }}
            >
              <Award size={18} />
            </div>
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#047857", marginBottom: "6px" }}>
            {loading ? "..." : summaryKPIs.convertedLeads.toLocaleString()}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px" }}>
            <span style={{ color: "#64748B" }}>Win rate:</span>
            <span style={{ fontWeight: 600, color: "#047857", backgroundColor: "#ECFDF5", padding: "2px 8px", borderRadius: "6px" }}>
              {summaryKPIs.conversionRate}% ({summaryKPIs.winRate}% of proc.)
            </span>
          </div>
        </div>

        {/* Card 6: Lost Leads */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "16px",
            padding: "20px",
            border: `1px solid ${COLORS.border}`,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Lost / Dropped
            </span>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                backgroundColor: COLORS.dangerLight,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: COLORS.danger
              }}
            >
              <TrendingDown size={18} />
            </div>
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#B91C1C", marginBottom: "6px" }}>
            {loading ? "..." : summaryKPIs.lostLeads.toLocaleString()}
          </div>
          <div style={{ fontSize: "12px", color: "#64748B" }}>
            Disqualified or lost deals
          </div>
        </div>
      </div>

      {/* Interactive Charts Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.7fr 1fr",
          gap: "24px",
          marginBottom: "28px"
        }}
      >
        {/* Chart 1: Sales Account-Wise Performance Comparison */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "18px",
            padding: "24px",
            border: `1px solid ${COLORS.border}`,
            boxShadow: "0 2px 10px rgba(0, 0, 0, 0.03)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 4px 0", color: "#0F172A" }}>
                Account-Wise Performance Comparison
              </h3>
              <p style={{ margin: 0, fontSize: "12px", color: "#64748B" }}>
                Leads Handled vs Processed vs Converted per Sales Account ({periodFilter === "overall" ? "Overall" : periodFilter === "yearly" ? selectedYear : `${MONTH_SHORT[selectedMonth]} ${selectedYear}`})
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#2563EB", backgroundColor: "#EFF6FF", padding: "4px 8px", borderRadius: "6px" }}>
                ■ Handled
              </span>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#F59E0B", backgroundColor: "#FFFBEB", padding: "4px 8px", borderRadius: "6px" }}>
                ■ Processed
              </span>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#10B981", backgroundColor: "#ECFDF5", padding: "4px 8px", borderRadius: "6px" }}>
                ■ Converted
              </span>
            </div>
          </div>

          <div style={{ width: "100%", height: 320 }}>
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#94A3B8" }}>
                Loading performance chart...
              </div>
            ) : accountChartData.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#94A3B8" }}>
                <Users size={32} style={{ marginBottom: "8px", opacity: 0.5 }} />
                <span>No lead activity recorded for the selected period filter.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={accountChartData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis
                    dataKey="name"
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div
                            style={{
                              backgroundColor: "#0F172A",
                              color: "#FFFFFF",
                              padding: "12px 16px",
                              borderRadius: "10px",
                              fontSize: "12px",
                              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)"
                            }}
                          >
                            <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "6px", color: "#60A5FA" }}>
                              {data.fullName}
                            </div>
                            <div style={{ color: "#94A3B8", fontSize: "11px", marginBottom: "8px" }}>
                              {data.email}
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "3px" }}>
                              <span>Total Handled:</span>
                              <strong>{data.Handled}</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "3px" }}>
                              <span>Processed:</span>
                              <strong style={{ color: "#FBBF24" }}>{data.Processed}</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "3px" }}>
                              <span>Pending:</span>
                              <strong style={{ color: "#818CF8" }}>{data.Pending}</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", paddingTop: "4px", borderTop: "1px solid rgba(255,255,255,0.15)" }}>
                              <span>Converted Deals:</span>
                              <strong style={{ color: "#34D399" }}>{data.Converted} ({data.rate}%)</strong>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="Handled" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Processed" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Converted" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Lead Status & Workflow Funnel */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "18px",
            padding: "24px",
            border: `1px solid ${COLORS.border}`,
            boxShadow: "0 2px 10px rgba(0, 0, 0, 0.03)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between"
          }}
        >
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 4px 0", color: "#0F172A" }}>
              Lead Workflow & Status Progress
            </h3>
            <p style={{ margin: 0, fontSize: "12px", color: "#64748B" }}>
              Backend status distribution and progression through the pipeline
            </p>
          </div>

          {/* Donut Chart */}
          <div style={{ width: "100%", height: 210 }}>
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#94A3B8" }}>
                Loading status distribution...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val, name) => [`${val} leads`, name]}
                    contentStyle={{ backgroundColor: "#0F172A", border: "none", borderRadius: "8px", color: "#FFF", fontSize: "12px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Workflow Funnel Progress Bars */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px", marginTop: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: STATUS_COLORS.NEW }} />
                New Leads:
              </span>
              <strong>{summaryKPIs.newLeads} ({summaryKPIs.totalHandled > 0 ? Math.round((summaryKPIs.newLeads / summaryKPIs.totalHandled) * 100) : 0}%)</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: STATUS_COLORS.CONTACTED }} />
                Contacted:
              </span>
              <strong>{summaryKPIs.contactedLeads} ({summaryKPIs.totalHandled > 0 ? Math.round((summaryKPIs.contactedLeads / summaryKPIs.totalHandled) * 100) : 0}%)</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: STATUS_COLORS.QUALIFIED }} />
                Qualified:
              </span>
              <strong>{summaryKPIs.qualifiedLeads} ({summaryKPIs.totalHandled > 0 ? Math.round((summaryKPIs.qualifiedLeads / summaryKPIs.totalHandled) * 100) : 0}%)</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: STATUS_COLORS.CONVERTED }} />
                Converted / Won:
              </span>
              <strong style={{ color: "#047857" }}>{summaryKPIs.convertedLeads} ({summaryKPIs.conversionRate}%)</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Trend Timeline Chart (if Yearly or Overall selected) */}
      {periodFilter !== "monthly" && (
        <div
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "18px",
            padding: "24px",
            border: `1px solid ${COLORS.border}`,
            boxShadow: "0 2px 10px rgba(0, 0, 0, 0.03)",
            marginBottom: "28px"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 4px 0", color: "#0F172A" }}>
                Monthly Volume & Processing Velocity Trend
              </h3>
              <p style={{ margin: 0, fontSize: "12px", color: "#64748B" }}>
                Monthly lead inflow and closed conversions across the selected sales staff accounts
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#2563EB" }}>● Inflow Volume</span>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#10B981" }}>● Won Deals</span>
            </div>
          </div>

          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorConverted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0F172A", border: "none", borderRadius: "8px", color: "#FFF", fontSize: "12px" }}
                />
                <Area type="monotone" dataKey="total" name="Total Inflow" stroke="#2563EB" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
                <Area type="monotone" dataKey="converted" name="Converted Deals" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorConverted)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Sales Accounts Performance Table */}
      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "18px",
          border: `1px solid ${COLORS.border}`,
          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.03)",
          overflow: "hidden"
        }}
      >
        {/* Table Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: `1px solid ${COLORS.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px"
          }}
        >
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 4px 0", color: "#0F172A" }}>
              Sales Accounts Overview & Lead Statuses
            </h3>
            <p style={{ margin: 0, fontSize: "12px", color: "#64748B" }}>
              Detailed breakdown of leads handled, leads created, processing workflow, and conversions per account
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={() => setStaffScope("sales")}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: staffScope === "sales" ? "1px solid #2563EB" : "1px solid #E2E8F0",
                backgroundColor: staffScope === "sales" ? "#EFF6FF" : "#FFF",
                color: staffScope === "sales" ? "#2563EB" : "#64748B",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Sales Accounts Only
            </button>
            <button
              onClick={() => setStaffScope("all")}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: staffScope === "all" ? "1px solid #2563EB" : "1px solid #E2E8F0",
                backgroundColor: staffScope === "all" ? "#EFF6FF" : "#FFF",
                color: staffScope === "all" ? "#2563EB" : "#64748B",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              All Staff ({allStaff.length})
            </button>
          </div>
        </div>

        {/* Table View */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
            <thead>
              <tr style={{ backgroundColor: "#F8FAFC", borderBottom: `1px solid ${COLORS.border}`, color: "#64748B", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                <th style={{ padding: "14px 20px", fontWeight: 700 }}>Sales Account</th>
                <th style={{ padding: "14px 16px", fontWeight: 700 }}>Role & Status</th>
                <th style={{ padding: "14px 16px", fontWeight: 700, textAlign: "center" }}>Handled</th>
                <th style={{ padding: "14px 16px", fontWeight: 700, textAlign: "center" }}>Created</th>
                <th style={{ padding: "14px 16px", fontWeight: 700 }}>Processing Progress</th>
                <th style={{ padding: "14px 16px", fontWeight: 700, textAlign: "center" }}>Pending</th>
                <th style={{ padding: "14px 16px", fontWeight: 700, textAlign: "center" }}>Converted / Won</th>
                <th style={{ padding: "14px 16px", fontWeight: 700, textAlign: "center" }}>Lost</th>
                <th style={{ padding: "14px 16px", fontWeight: 700 }}>Status Breakdown</th>
                <th style={{ padding: "14px 20px", fontWeight: 700, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <td colSpan={10} style={{ padding: "16px 20px" }}>
                      <div
                        style={{
                          height: "24px",
                          borderRadius: "6px",
                          backgroundColor: "#F1F5F9",
                          backgroundImage: "linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)",
                          backgroundSize: "200% 100%",
                          animation: "shimmer 1.5s infinite"
                        }}
                      />
                    </td>
                  </tr>
                ))
              ) : filteredAccountMetrics.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: "48px 20px", textAlign: "center", color: "#64748B" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                      <Users size={32} style={{ opacity: 0.4 }} />
                      <strong style={{ color: "#0F172A", fontSize: "14px" }}>No sales accounts found matching criteria</strong>
                      <span style={{ fontSize: "12px" }}>Try clearing search or changing the date filter.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAccountMetrics.map(({ account, totalHandled, createdCount, processedCount, pendingTotal, newCount, contactedCount, qualifiedCount, convertedCount, lostCount, conversionRate, leads }) => {
                  const processedPct = totalHandled > 0 ? Math.round((processedCount / totalHandled) * 100) : 0;

                  return (
                    <tr
                      key={account.id || account.email}
                      style={{
                        borderBottom: "1px solid #F1F5F9",
                        transition: "background-color 0.15s ease"
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F8FAFC")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      {/* Account Name & Email */}
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div
                            style={{
                              width: "38px",
                              height: "38px",
                              borderRadius: "10px",
                              backgroundColor: "#EFF6FF",
                              color: "#2563EB",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              fontSize: "14px"
                            }}
                          >
                            {(account.name || account.email || "S").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: "#0F172A", fontSize: "13px" }}>
                              {account.name || "Sales Account"}
                            </div>
                            <div style={{ fontSize: "11px", color: "#64748B" }}>
                              {account.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role & Status */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              width: "fit-content",
                              fontSize: "10px",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              backgroundColor: "#F3E8FF",
                              color: "#6B21A8"
                            }}
                          >
                            {account.role || "SALES_ADMIN"}
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              color: account.active !== false ? "#16A34A" : "#DC2626",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            <span
                              style={{
                                width: "6px",
                                height: "6px",
                                borderRadius: "50%",
                                backgroundColor: account.active !== false ? "#16A34A" : "#DC2626"
                              }}
                            />
                            {account.active !== false ? "Active" : "Suspended"}
                          </span>
                        </div>
                      </td>

                      {/* Total Handled */}
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <strong style={{ fontSize: "14px", color: "#0F172A" }}>
                          {totalHandled}
                        </strong>
                      </td>

                      {/* Leads Created */}
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <span style={{ fontSize: "13px", color: "#475569", fontWeight: 500 }}>
                          {createdCount}
                        </span>
                      </td>

                      {/* Processed (Progress bar + count) */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ minWidth: "120px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                            <strong style={{ color: "#B45309" }}>{processedCount} leads</strong>
                            <span style={{ color: "#64748B" }}>{processedPct}%</span>
                          </div>
                          <div style={{ width: "100%", height: "6px", backgroundColor: "#F1F5F9", borderRadius: "9999px", overflow: "hidden" }}>
                            <div
                              style={{
                                width: `${processedPct}%`,
                                height: "100%",
                                backgroundColor: "#F59E0B",
                                borderRadius: "9999px"
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Pending */}
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "6px",
                            backgroundColor: pendingTotal > 0 ? "#EEF2FF" : "#F8FAFC",
                            color: pendingTotal > 0 ? "#4338CA" : "#94A3B8",
                            fontSize: "12px",
                            fontWeight: 600
                          }}
                        >
                          {pendingTotal}
                        </span>
                      </td>

                      {/* Converted / Won */}
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <div>
                          <strong style={{ fontSize: "13px", color: "#047857" }}>
                            {convertedCount}
                          </strong>
                          <div style={{ fontSize: "11px", color: "#059669", fontWeight: 600 }}>
                            {conversionRate.toFixed(1)}%
                          </div>
                        </div>
                      </td>

                      {/* Lost */}
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <span style={{ fontSize: "12px", color: lostCount > 0 ? "#B91C1C" : "#94A3B8", fontWeight: 500 }}>
                          {lostCount}
                        </span>
                      </td>

                      {/* Status breakdown pills */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", maxWidth: "220px" }}>
                          {newCount > 0 && (
                            <span style={{ fontSize: "10px", padding: "2px 5px", borderRadius: "4px", backgroundColor: "#EFF6FF", color: "#1D4ED8" }}>
                              New: {newCount}
                            </span>
                          )}
                          {contactedCount > 0 && (
                            <span style={{ fontSize: "10px", padding: "2px 5px", borderRadius: "4px", backgroundColor: "#FEF3C7", color: "#B45309" }}>
                              Cont.: {contactedCount}
                            </span>
                          )}
                          {qualifiedCount > 0 && (
                            <span style={{ fontSize: "10px", padding: "2px 5px", borderRadius: "4px", backgroundColor: "#ECFDF5", color: "#047857" }}>
                              Qual.: {qualifiedCount}
                            </span>
                          )}
                          {convertedCount > 0 && (
                            <span style={{ fontSize: "10px", padding: "2px 5px", borderRadius: "4px", backgroundColor: "#F0FDF4", color: "#15803D", fontWeight: 700 }}>
                              Won: {convertedCount}
                            </span>
                          )}
                          {lostCount > 0 && (
                            <span style={{ fontSize: "10px", padding: "2px 5px", borderRadius: "4px", backgroundColor: "#FEF2F2", color: "#B91C1C" }}>
                              Lost: {lostCount}
                            </span>
                          )}
                          {totalHandled === 0 && (
                            <span style={{ fontSize: "11px", color: "#94A3B8" }}>No leads</span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "14px 20px", textAlign: "right" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                          <button
                            onClick={() => {
                              setSelectedAccountFilter(account.id || account.email);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            title="Filter overview for this account"
                            style={{
                              padding: "6px 10px",
                              backgroundColor: "#F1F5F9",
                              color: "#334155",
                              border: "none",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: 600,
                              cursor: "pointer",
                              transition: "all 0.15s ease"
                            }}
                          >
                            Filter
                          </button>

                          <button
                            onClick={() => {
                              setInspectAccount({ account, leads });
                              setInspectStatusFilter("ALL");
                              setInspectSearch("");
                            }}
                            title="View leads handled by this account"
                            style={{
                              padding: "6px 10px",
                              backgroundColor: "#EFF6FF",
                              color: "#2563EB",
                              border: "1px solid #BFDBFE",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              transition: "all 0.15s ease"
                            }}
                          >
                            <Eye size={13} />
                            View Leads
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Account Leads Inspection Drawer */}
      {inspectAccount && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(4px)",
            zIndex: 1100,
            display: "flex",
            justifyContent: "flex-end"
          }}
          onClick={() => setInspectAccount(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "680px",
              height: "100%",
              backgroundColor: "#FFFFFF",
              boxShadow: "-10px 0 30px rgba(0, 0, 0, 0.15)",
              display: "flex",
              flexDirection: "column",
              overflowY: "auto"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: `1px solid ${COLORS.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                position: "sticky",
                top: 0,
                backgroundColor: "#FFFFFF",
                zIndex: 10
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#2563EB" }}>
                    Account Leads
                  </span>
                  <span style={{ fontSize: "11px", backgroundColor: "#EFF6FF", color: "#1D4ED8", padding: "2px 8px", borderRadius: "9999px", fontWeight: 600 }}>
                    {inspectedLeads.length} leads
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
                  {inspectAccount.account.name || inspectAccount.account.email}
                </h3>
                <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
                  {inspectAccount.account.email} • {periodFilter === "overall" ? "All Time" : periodFilter === "yearly" ? `Year ${selectedYear}` : `${MONTH_SHORT[selectedMonth]} ${selectedYear}`}
                </div>
              </div>
              <button
                onClick={() => setInspectAccount(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#94A3B8",
                  cursor: "pointer",
                  padding: "6px",
                  borderRadius: "6px"
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Filter controls inside drawer */}
            <div
              style={{
                padding: "16px 24px",
                backgroundColor: "#F8FAFC",
                borderBottom: `1px solid ${COLORS.border}`,
                display: "flex",
                gap: "10px",
                flexWrap: "wrap"
              }}
            >
              <div style={{ flex: 1, minWidth: "180px", position: "relative" }}>
                <Search size={14} style={{ position: "absolute", left: "10px", top: "10px", color: "#94A3B8" }} />
                <input
                  type="text"
                  placeholder="Filter lead title, contact..."
                  value={inspectSearch}
                  onChange={(e) => setInspectSearch(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "7px 10px 7px 32px",
                    borderRadius: "8px",
                    border: `1px solid ${COLORS.border}`,
                    fontSize: "12px",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <select
                value={inspectStatusFilter}
                onChange={(e) => setInspectStatusFilter(e.target.value)}
                style={{
                  padding: "7px 10px",
                  borderRadius: "8px",
                  border: `1px solid ${COLORS.border}`,
                  fontSize: "12px",
                  fontWeight: 600,
                  backgroundColor: "#FFFFFF",
                  outline: "none",
                  cursor: "pointer"
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="NEW">New</option>
                <option value="CONTACTED">Contacted</option>
                <option value="QUALIFIED">Qualified</option>
                <option value="CONVERTED">Converted / Won</option>
                <option value="LOST">Lost</option>
                <option value="PENDING">Pending / Nurture</option>
              </select>
            </div>

            {/* Leads List */}
            <div style={{ padding: "16px 24px", flex: 1, display: "flex", flexDirection: "column", gap: "12px" }}>
              {inspectedLeads.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#64748B" }}>
                  No leads found for this account matching the filter.
                </div>
              ) : (
                inspectedLeads.map((lead) => (
                  <div
                    key={lead.id}
                    style={{
                      border: "1px solid #E2E8F0",
                      borderRadius: "12px",
                      padding: "16px",
                      backgroundColor: "#FFFFFF",
                      transition: "all 0.15s ease",
                      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748B" }}>
                            {lead.leadNumber || `LEAD #${lead.id}`}
                          </span>
                          <LeadStatusBadge status={lead.status} />
                        </div>
                        <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
                          {lead.title || "Untitled Lead"}
                        </h4>
                      </div>
                      <button
                        onClick={() => setSelectedLeadIdForDrawer(lead.id)}
                        style={{
                          padding: "5px 10px",
                          borderRadius: "6px",
                          backgroundColor: "#F1F5F9",
                          border: "none",
                          fontSize: "11px",
                          fontWeight: 600,
                          color: "#2563EB",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        <ExternalLink size={12} />
                        Details
                      </button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px", color: "#64748B", marginTop: "10px" }}>
                      {lead.companyName && (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Building2 size={13} style={{ color: "#94A3B8" }} />
                          <span style={{ color: "#0F172A" }}>{lead.companyName}</span>
                        </div>
                      )}
                      {(lead.contactPerson || lead.contactPhone) && (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Phone size={13} style={{ color: "#94A3B8" }} />
                          <span>{lead.contactPerson || lead.contactPhone}</span>
                        </div>
                      )}
                      <div>
                        <span>Est. Value: </span>
                        <strong style={{ color: "#047857" }}>{formatCurrency(lead.estimatedValue)}</strong>
                      </div>
                      <div>
                        <span>Created: </span>
                        <span>{lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : "—"}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Embedded Lead Detail Drawer */}
      {selectedLeadIdForDrawer && (
        <LeadDetailDrawer
          leadId={selectedLeadIdForDrawer}
          isOpen={Boolean(selectedLeadIdForDrawer)}
          onClose={() => setSelectedLeadIdForDrawer(null)}
          onLeadUpdated={() => loadData(true)}
          showToast={showToast}
        />
      )}
    </div>
  );
}
