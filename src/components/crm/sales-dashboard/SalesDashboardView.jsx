import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  ChevronDown,
  RefreshCw,
  Download,
  Users,
  UserPlus,
  Clock,
  Award,
  IndianRupee,
  Crosshair,
  AlertCircle
} from "lucide-react";

import { crmService } from "../../../services/crmService";
import { orderService } from "../../../services/orderService";
import { staffService } from "../../../services/staffService";
import { productService } from "../../../services/productService";
import { Toast } from "../../common/Toast";

import SalesKpiCard from "./SalesKpiCard";
import LeadRevenueTrendCard from "./LeadRevenueTrendCard";
import SalesPipelineFunnelCard from "./SalesPipelineFunnelCard";
import LeadSourceDonutCard from "./LeadSourceDonutCard";
import StateSalesCard from "./StateSalesCard";
import CitySalesCard from "./CitySalesCard";
import ProductSalesCard from "./ProductSalesCard";
import TopSalesExecutivesCard from "./TopSalesExecutivesCard";
import OrderStatusRevenueCard from "./OrderStatusRevenueCard";

export default function SalesDashboardView() {
  const navigate = useNavigate();

  // Raw API State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const [rawKpis, setRawKpis] = useState(null);
  const [rawLeads, setRawLeads] = useState([]);
  const [rawOrders, setRawOrders] = useState([]);
  const [rawOpportunities, setRawOpportunities] = useState([]);
  const [rawOverdue, setRawOverdue] = useState([]);
  const [rawStaff, setRawStaff] = useState([]);
  const [rawProducts, setRawProducts] = useState([]);

  // Top Filters
  const [dateRangePreset, setDateRangePreset] = useState("All Time");
  const [dateRangeDropdown, setDateRangeDropdown] = useState(false);
  const [selectedState, setSelectedState] = useState("All States");
  const [stateDropdown, setStateDropdown] = useState(false);
  const [selectedCity, setSelectedCity] = useState("All Cities");
  const [cityDropdown, setCityDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("All Products");
  const [productDropdown, setProductDropdown] = useState(false);
  const [selectedExecutive, setSelectedExecutive] = useState("All Sales Executives");
  const [executiveDropdown, setExecutiveDropdown] = useState(false);

  // Sub-card filter states
  const [trendGranularity, setTrendGranularity] = useState("Monthly");
  const [pipelineAccount, setPipelineAccount] = useState("All Accounts");
  const [stateMetric, setStateMetric] = useState("Revenue");
  const [cityMetric, setCityMetric] = useState("Revenue");
  const [leadSourcePeriod, setLeadSourcePeriod] = useState("This Month");
  const [statePeriod, setStatePeriod] = useState("This Month");
  const [cityPeriod, setCityPeriod] = useState("This Month");
  const [productPeriod, setProductPeriod] = useState("This Month");
  const [executivePeriod, setExecutivePeriod] = useState("This Month");
  const [orderStatusPeriod, setOrderStatusPeriod] = useState("This Month");

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  // Fetch all live backend data in parallel
  const fetchAllData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const userRole = (localStorage.getItem("userRole") || "").toUpperCase();
      const isSuperAdmin = ["ADMIN", "SUPER_ADMIN", "ADMINISTRATOR"].includes(userRole);

      const [kpiRes, leadsRes, overdueRes, oppsRes, ordersRes, staffRes, prodsRes] =
        await Promise.all([
          crmService.getDashboardKPIs().catch(() => ({})),
          isSuperAdmin
            ? crmService.getAllLeads().catch(() => [])
            : crmService.getMyLeads().catch(() => crmService.getAllLeads().catch(() => [])),
          crmService.getOverdueFollowUps().catch(() => []),
          crmService.getAllOpportunities().catch(() => []),
          isSuperAdmin
            ? orderService.adminGetAllOrders().catch(() => orderService.salesGetMyOrders().catch(() => []))
            : orderService.salesGetMyOrders().catch(() => []),
          staffService.getAllStaff().catch(() => []),
          productService.getActiveProducts().catch(() => [])
        ]);

      setRawKpis(kpiRes || {});
      setRawLeads(Array.isArray(leadsRes) ? leadsRes : []);
      setRawOverdue(Array.isArray(overdueRes) ? overdueRes : []);
      setRawOpportunities(Array.isArray(oppsRes) ? oppsRes : []);

      const normalizedOrders = Array.isArray(ordersRes)
        ? ordersRes
        : Array.isArray(ordersRes?.orders)
        ? ordersRes.orders
        : [];
      setRawOrders(normalizedOrders);

      const normalizedStaff = Array.isArray(staffRes)
        ? staffRes
        : Array.isArray(staffRes?.staff)
        ? staffRes.staff
        : Array.isArray(staffRes?.data)
        ? staffRes.data
        : [];
      setRawStaff(normalizedStaff);

      setRawProducts(Array.isArray(prodsRes) ? prodsRes : []);

      if (isRefresh) {
        showToast("Dashboard data refreshed successfully!", "success");
      }
    } catch (err) {
      console.error("Failed to load Sales Dashboard data:", err);
      setError("Unable to load latest sales data. Please check your network or try again.");
      showToast("Failed to refresh sales data", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Compute Current Date Range String for Header Display
  const dateRangeDisplay = useMemo(() => {
    const now = new Date();
    const currentMonth = now.toLocaleString("default", { month: "short" });
    const currentYear = now.getFullYear();

    if (dateRangePreset === "Today") {
      const day = String(now.getDate()).padStart(2, "0");
      return `${day} ${currentMonth} ${currentYear}`;
    }
    if (dateRangePreset === "This Week") {
      const firstDay = new Date(now);
      firstDay.setDate(now.getDate() - now.getDay());
      const lastDay = new Date(now);
      lastDay.setDate(now.getDate() - now.getDay() + 6);
      return `${String(firstDay.getDate()).padStart(2, "0")} ${firstDay.toLocaleString("default", { month: "short" })} - ${String(lastDay.getDate()).padStart(2, "0")} ${lastDay.toLocaleString("default", { month: "short" })} ${currentYear}`;
    }
    if (dateRangePreset === "This Month") {
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      return `01 ${currentMonth} ${currentYear} - ${lastDay} ${currentMonth} ${currentYear}`;
    }
    if (dateRangePreset === "Last Month") {
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      return `01 ${lastMonthDate.toLocaleString("default", { month: "short" })} - ${lastDayOfLastMonth.getDate()} ${lastMonthDate.toLocaleString("default", { month: "short" })} ${lastMonthDate.getFullYear()}`;
    }
    if (dateRangePreset === "This Year") {
      return `01 Jan ${currentYear} - 31 Dec ${currentYear}`;
    }
    return "All Time (Historical)";
  }, [dateRangePreset]);

  // Extract available unique States, Cities, Products, and Executives for top filter dropdowns
  const availableStates = useMemo(() => {
    const set = new Set();
    rawLeads.forEach((l) => { if (l.state) set.add(l.state.trim()); });
    rawOrders.forEach((o) => {
      const st = o.state || o.shippingState;
      if (st) set.add(st.trim());
    });
    return Array.from(set).sort();
  }, [rawLeads, rawOrders]);

  const availableCities = useMemo(() => {
    const set = new Set();
    rawLeads.forEach((l) => {
      if (l.city && (selectedState === "All States" || l.state === selectedState)) {
        set.add(l.city.trim());
      }
    });
    rawOrders.forEach((o) => {
      const st = o.state || o.shippingState;
      if (o.city && (selectedState === "All States" || st === selectedState)) {
        set.add(o.city.trim());
      }
    });
    return Array.from(set).sort();
  }, [rawLeads, rawOrders, selectedState]);

  const availableExecutives = useMemo(() => {
    const list = [];
    rawStaff.forEach((s) => {
      const name = s.name || s.fullName || s.username || s.email;
      if (name && !list.includes(name)) list.push(name);
    });
    rawLeads.forEach((l) => {
      const name = l.assignedAdminName || l.assignedToName;
      if (name && !list.includes(name)) list.push(name);
    });
    rawOrders.forEach((o) => {
      const name = o.salesAdminName;
      if (name && !list.includes(name)) list.push(name);
    });
    return list.sort();
  }, [rawStaff, rawLeads, rawOrders]);

  // Helper to check if a date string falls inside the chosen preset
  const isDateInPreset = useCallback((dateStr, preset) => {
    if (!preset || preset === "All Time") return true;
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return true;

    const now = new Date();
    if (preset === "Today") {
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    }
    if (preset === "This Week") {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      return d >= startOfWeek && d <= now;
    }
    if (preset === "This Month") {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }
    if (preset === "Last Month") {
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      return d >= lastMonthStart && d <= lastMonthEnd;
    }
    if (preset === "This Year") {
      return d.getFullYear() === now.getFullYear();
    }
    return true;
  }, []);

  // Filter leads and orders dynamically according to top filters
  const filteredData = useMemo(() => {
    let leads = [...rawLeads];
    let orders = [...rawOrders];
    let opps = [...rawOpportunities];

    // 1. Date filter
    if (dateRangePreset !== "All Time") {
      leads = leads.filter((l) => isDateInPreset(l.createdAt || l.createdDate, dateRangePreset));
      orders = orders.filter((o) => isDateInPreset(o.createdAt || o.createdDate || o.orderDate, dateRangePreset));
      opps = opps.filter((o) => isDateInPreset(o.createdAt || o.createdDate, dateRangePreset));
    }

    // 2. State filter
    if (selectedState !== "All States") {
      leads = leads.filter((l) => (l.state || "").toLowerCase() === selectedState.toLowerCase());
      orders = orders.filter((o) => ((o.state || o.shippingState || "").toLowerCase()) === selectedState.toLowerCase());
    }

    // 3. City filter
    if (selectedCity !== "All Cities") {
      leads = leads.filter((l) => (l.city || "").toLowerCase() === selectedCity.toLowerCase());
      orders = orders.filter((o) => ((o.city || o.shippingCity || "").toLowerCase()) === selectedCity.toLowerCase());
    }

    // 4. Product filter
    if (selectedProduct !== "All Products") {
      orders = orders.filter((o) => {
        const itemMatch = Array.isArray(o.items) && o.items.some((item) => (item.productName || item.name || "").toLowerCase().includes(selectedProduct.toLowerCase()));
        const nameMatch = (o.productName || o.product || "").toLowerCase().includes(selectedProduct.toLowerCase());
        return itemMatch || nameMatch;
      });
    }

    // 5. Executive filter
    if (selectedExecutive !== "All Sales Executives") {
      leads = leads.filter((l) => {
        const exec = l.assignedAdminName || l.assignedToName || l.assignedAdminEmail || "";
        return exec.toLowerCase().includes(selectedExecutive.toLowerCase());
      });
      orders = orders.filter((o) => {
        const creator = o.createdByAdminEmail || o.salesAdminName || o.assignedStaff || "";
        return creator.toLowerCase().includes(selectedExecutive.toLowerCase());
      });
    }

    return { leads, orders, opps };
  }, [rawLeads, rawOrders, rawOpportunities, dateRangePreset, selectedState, selectedCity, selectedProduct, selectedExecutive, isDateInPreset]);

  // ==================== 1. KPI CARDS COMPUTATION ====================
  const kpiMetrics = useMemo(() => {
    const { leads, orders, opps } = filteredData;
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    // 1. Total Leads
    const totalLeads = leads.length;

    // 2. New Leads (Today)
    const newLeadsToday = leads.filter((l) => {
      const d = l.createdAt || l.createdDate;
      return d && String(d).startsWith(todayStr);
    }).length;

    // 3. Pending Follow-ups
    const pendingFollowUps = rawOverdue.length > 0 ? rawOverdue.length : leads.filter((l) => l.followUpDate || l.nextFollowUpDate).length;
    const overdueCount = rawOverdue.length > 0 ? rawOverdue.length : leads.filter((l) => {
      const fd = l.followUpDate || l.nextFollowUpDate;
      return fd && new Date(fd) < now;
    }).length;

    // 4. Converted / Won
    const convertedLeads = leads.filter((l) => {
      const st = String(l.status || "").toUpperCase();
      return st === "CONVERTED" || st === "WON" || st === "CLOSED_WON";
    }).length;
    const wonOpps = opps.filter((o) => String(o.stage || "").toUpperCase() === "WON").length;
    const wonCount = Math.max(convertedLeads, wonOpps);

    // 5. Sales Revenue
    const revenueSum = orders.reduce((sum, o) => {
      const amt = parseFloat(o.totalInvoiceAmount || o.totalAmount || o.totalPrice || o.amount || 0);
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0);

    const formatLakhs = (val) => {
      if (val === undefined || val === null || val === 0) return "₹0";
      if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
      if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
      if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
      return `₹${Math.round(val).toLocaleString("en-IN")}`;
    };

    // 6. Target Achievement: Check live backend field strictly. Do not use hardcoded benchmarks!
    const backendTarget = rawKpis?.targetRevenue || rawKpis?.monthlyTarget || rawKpis?.target;
    let targetAchievementPct = null;
    let targetFormatted = "Target not configured";

    if (backendTarget && Number(backendTarget) > 0) {
      targetAchievementPct = Math.min(100, Math.round((revenueSum / Number(backendTarget)) * 100));
      targetFormatted = `${formatLakhs(revenueSum)} / ${formatLakhs(backendTarget)}`;
    }

    return {
      totalLeads,
      newLeadsToday,
      pendingFollowUps,
      overdueCount,
      wonCount,
      revenueSum,
      revenueFormatted: formatLakhs(revenueSum),
      targetAchievementPct,
      targetFormatted
    };
  }, [filteredData, rawOverdue, rawKpis]);

  // ==================== 2. LEAD & REVENUE TREND CHART DATA ====================
  const trendChartData = useMemo(() => {
    const { leads, orders } = filteredData;

    if (trendGranularity === "Daily") {
      // Last 10 days bucket
      const days = [];
      const now = new Date();
      for (let i = 9; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const dayLabel = `${d.getDate()} ${d.toLocaleString("default", { month: "short" })}`;
        const dateIso = d.toISOString().split("T")[0];
        days.push({ label: dayLabel, dateIso, leads: 0, wonDeals: 0, revenue: 0 });
      }

      leads.forEach((l) => {
        const dStr = (l.createdAt || l.createdDate || "").split("T")[0];
        const match = days.find((x) => x.dateIso === dStr);
        if (match) {
          match.leads += 1;
          const st = String(l.status || "").toUpperCase();
          if (st === "CONVERTED" || st === "WON") match.wonDeals += 1;
        }
      });

      orders.forEach((o) => {
        const dStr = (o.createdAt || o.createdDate || "").split("T")[0];
        const match = days.find((x) => x.dateIso === dStr);
        if (match) {
          match.revenue += parseFloat(o.totalInvoiceAmount || o.totalAmount || 0) || 0;
        }
      });

      return days;
    }

    if (trendGranularity === "Weekly") {
      // Last 6 weeks bucket
      const weeks = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const end = new Date(now);
        end.setDate(now.getDate() - (i * 7));
        const start = new Date(end);
        start.setDate(end.getDate() - 6);
        const label = `${start.getDate()} ${start.toLocaleString("default", { month: "short" })} - ${end.getDate()} ${end.toLocaleString("default", { month: "short" })}`;
        weeks.push({ label, start, end, leads: 0, wonDeals: 0, revenue: 0 });
      }

      leads.forEach((l) => {
        const d = l.createdAt ? new Date(l.createdAt) : null;
        if (d) {
          const match = weeks.find((w) => d >= w.start && d <= w.end);
          if (match) {
            match.leads += 1;
            const st = String(l.status || "").toUpperCase();
            if (st === "CONVERTED" || st === "WON") match.wonDeals += 1;
          }
        }
      });

      orders.forEach((o) => {
        const d = o.createdAt ? new Date(o.createdAt) : null;
        if (d) {
          const match = weeks.find((w) => d >= w.start && d <= w.end);
          if (match) {
            match.revenue += parseFloat(o.totalInvoiceAmount || o.totalAmount || 0) || 0;
          }
        }
      });

      return weeks;
    }

    // Monthly bucket (Default)
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const map = {};
    months.forEach((m) => {
      map[m] = { label: m, leads: 0, wonDeals: 0, revenue: 0 };
    });

    leads.forEach((l) => {
      const d = l.createdAt ? new Date(l.createdAt) : null;
      if (d) {
        const m = d.toLocaleString("default", { month: "short" });
        if (map[m]) {
          map[m].leads += 1;
          const st = String(l.status || "").toUpperCase();
          if (st === "CONVERTED" || st === "WON") {
            map[m].wonDeals += 1;
          }
        }
      }
    });

    orders.forEach((o) => {
      const d = o.createdAt ? new Date(o.createdAt) : null;
      if (d) {
        const m = d.toLocaleString("default", { month: "short" });
        if (map[m]) {
          const amt = parseFloat(o.totalInvoiceAmount || o.totalAmount || 0) || 0;
          map[m].revenue += amt;
        }
      }
    });

    return months.slice(0, 10).map((m) => map[m]);
  }, [filteredData, trendGranularity]);

  // ==================== 3. SALES PIPELINE FUNNEL DATA ====================
  const funnelStages = useMemo(() => {
    let { leads, opps } = filteredData;

    // Filter by pipelineAccount if specific executive selected
    if (pipelineAccount !== "All Accounts") {
      leads = leads.filter((l) => {
        const exec = l.assignedAdminName || l.assignedToName || l.assignedAdminEmail || "";
        return exec.toLowerCase().includes(pipelineAccount.toLowerCase());
      });
      opps = opps.filter((o) => {
        const assigned = o.assignedTo || o.assignedToName || "";
        return assigned.toLowerCase().includes(pipelineAccount.toLowerCase());
      });
    }

    const total = leads.length;
    let contacted = 0;
    let qualified = 0;
    let proposal = 0;
    let negotiation = 0;
    let won = 0;

    leads.forEach((l) => {
      const st = String(l.status || l.stage || "").toUpperCase();
      if (["CONTACTED", "FOLLOW_UP", "IN_PROGRESS"].includes(st)) contacted++;
      if (["QUALIFIED"].includes(st)) qualified++;
      if (["PROPOSAL", "QUOTATION"].includes(st)) proposal++;
      if (["NEGOTIATION"].includes(st)) negotiation++;
      if (["CONVERTED", "WON"].includes(st)) won++;
    });

    opps.forEach((o) => {
      const st = String(o.stage || "").toUpperCase();
      if (st === "QUALIFIED") qualified++;
      if (st === "PROPOSAL") proposal++;
      if (st === "NEGOTIATION") negotiation++;
      if (st === "WON") won++;
    });

    const calcPct = (count) => (total > 0 ? Math.round((count / total) * 100) : 0);

    return [
      { key: "new", name: "New Leads", count: total, percent: 100, color: "#2563EB" },
      { key: "contacted", name: "Contacted", count: contacted, percent: calcPct(contacted), color: "#0284C7" },
      { key: "qualified", name: "Qualified", count: qualified, percent: calcPct(qualified), color: "#8B5CF6" },
      { key: "proposal", name: "Proposal", count: proposal, percent: calcPct(proposal), color: "#F97316" },
      { key: "negotiation", name: "Negotiation", count: negotiation, percent: calcPct(negotiation), color: "#F59E0B" },
      { key: "won", name: "Won", count: won, percent: calcPct(won), color: "#10B981" }
    ];
  }, [filteredData, pipelineAccount]);

  // ==================== 4. LEAD SOURCE DISTRIBUTION DATA ====================
  const leadSourceData = useMemo(() => {
    const { leads } = filteredData;
    const total = leads.length;
    if (total === 0) return [];

    const counts = { Website: 0, Instagram: 0, Referral: 0, Direct: 0, IndiaMART: 0, Other: 0 };

    leads.forEach((l) => {
      const s = String(l.source || "").toLowerCase();
      if (s.includes("web") || s.includes("site") || s.includes("online")) counts.Website++;
      else if (s.includes("insta") || s.includes("social") || s.includes("meta")) counts.Instagram++;
      else if (s.includes("refer")) counts.Referral++;
      else if (s.includes("direct") || s.includes("walk") || s.includes("phone") || s.includes("call")) counts.Direct++;
      else if (s.includes("indiamart")) counts.IndiaMART++;
      else counts.Other++;
    });

    const colors = {
      Website: "#2563EB",
      Instagram: "#EC4899",
      Referral: "#06B6D4",
      Direct: "#FBBF24",
      IndiaMART: "#10B981",
      Other: "#8B5CF6"
    };

    return Object.keys(counts)
      .map((name) => ({
        name,
        count: counts[name],
        percent: total > 0 ? Math.round((counts[name] / total) * 100) : 0,
        color: colors[name] || "#64748B"
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredData]);

  // ==================== 5. STATE & CITY SALES DATA ====================
  const stateSalesData = useMemo(() => {
    const { leads, orders } = filteredData;
    const stateMap = {};

    leads.forEach((l) => {
      const st = l.state ? l.state.trim() : "Other";
      if (!stateMap[st]) stateMap[st] = { state: st, leads: 0, convertedLeads: 0, orders: 0, revenue: 0 };
      stateMap[st].leads += 1;
      const statusUpper = String(l.status || "").toUpperCase();
      if (statusUpper === "CONVERTED" || statusUpper === "WON") {
        stateMap[st].convertedLeads += 1;
      }
    });

    orders.forEach((o) => {
      const st = o.state || o.shippingState ? (o.state || o.shippingState).trim() : "Other";
      if (!stateMap[st]) stateMap[st] = { state: st, leads: 0, convertedLeads: 0, orders: 0, revenue: 0 };
      stateMap[st].orders += 1;
      const amt = parseFloat(o.totalInvoiceAmount || o.totalAmount || 0) || 0;
      stateMap[st].revenue += amt;
    });

    return Object.values(stateMap)
      .map((st) => {
        // Mathematically sound conversion rate: converted leads / leads capped at 100%
        let conv = 0;
        if (st.leads > 0) {
          conv = Math.min(100, Math.round(((st.convertedLeads || Math.min(st.leads, st.orders)) / st.leads) * 100));
        } else if (st.orders > 0) {
          conv = 100;
        }

        return {
          ...st,
          conversionRate: conv,
          revenueFormatted: `₹${(st.revenue / 100000).toFixed(2)}L`
        };
      })
      .sort((a, b) => {
        if (stateMetric === "Orders") return b.orders - a.orders;
        if (stateMetric === "Leads") return b.leads - a.leads;
        return b.revenue - a.revenue || b.orders - a.orders;
      });
  }, [filteredData, stateMetric]);

  const citySalesData = useMemo(() => {
    const { leads, orders } = filteredData;
    const cityMap = {};

    leads.forEach((l) => {
      const ct = l.city ? l.city.trim() : "";
      if (ct) {
        if (!cityMap[ct]) cityMap[ct] = { city: ct, leads: 0, orders: 0, revenue: 0 };
        cityMap[ct].leads += 1;
      }
    });

    orders.forEach((o) => {
      const ct = o.city || o.shippingCity ? (o.city || o.shippingCity).trim() : "";
      if (ct) {
        if (!cityMap[ct]) cityMap[ct] = { city: ct, leads: 0, orders: 0, revenue: 0 };
        cityMap[ct].orders += 1;
        const amt = parseFloat(o.totalInvoiceAmount || o.totalAmount || 0) || 0;
        cityMap[ct].revenue += amt;
      }
    });

    return Object.values(cityMap)
      .map((ct) => ({
        ...ct,
        revenueFormatted: `₹${(ct.revenue / 100000).toFixed(2)}L`
      }))
      .sort((a, b) => {
        if (cityMetric === "Orders") return b.orders - a.orders;
        if (cityMetric === "Leads") return b.leads - a.leads;
        return b.revenue - a.revenue || b.orders - a.orders;
      })
      .slice(0, 10);
  }, [filteredData, cityMetric]);

  // ==================== 6. PRODUCT-WISE SALES DATA ====================
  const productSalesData = useMemo(() => {
    const { orders } = filteredData;
    const prodMap = {};

    orders.forEach((o) => {
      if (Array.isArray(o.items) && o.items.length > 0) {
        o.items.forEach((item) => {
          const name = item.productName || item.name || "Battery Pack Standard";
          if (!prodMap[name]) prodMap[name] = { name, revenue: 0, unitsSold: 0, orders: 0 };
          const qty = parseInt(item.quantity || item.qty || 1, 10);
          const price = parseFloat(item.unitPrice || item.price || 0) || 0;
          prodMap[name].unitsSold += qty;
          prodMap[name].revenue += qty * price;
          prodMap[name].orders += 1;
        });
      } else {
        const name = o.productName || o.product || "Bentork EV Battery Systems";
        if (!prodMap[name]) prodMap[name] = { name, revenue: 0, unitsSold: 0, orders: 0 };
        prodMap[name].revenue += parseFloat(o.totalInvoiceAmount || o.totalAmount || 0) || 0;
        prodMap[name].unitsSold += parseInt(o.quantity || 1, 10);
        prodMap[name].orders += 1;
      }
    });

    const totalRev = Object.values(prodMap).reduce((s, p) => s + p.revenue, 0);

    return Object.values(prodMap)
      .map((p) => ({
        ...p,
        percent: totalRev > 0 ? Math.round((p.revenue / totalRev) * 100) : 0,
        revenueFormatted: `₹${(p.revenue / 100000).toFixed(2)}L`
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredData]);

  // ==================== 7. TOP SALES EXECUTIVES DATA ====================
  const executiveSalesData = useMemo(() => {
    const { leads, orders } = filteredData;
    const staffMap = {};

    // 1. Initialize from staff list
    rawStaff.forEach((s) => {
      const name = s.name || s.fullName || s.username || s.email;
      if (name) {
        staffMap[name] = {
          id: s.id || s._id,
          name,
          email: s.email,
          avatar: s.avatar || s.profileImage,
          leads: 0,
          convertedLeads: 0,
          orders: 0,
          revenue: 0,
          target: null // Do not hardcode fictitious target benchmarks
        };
      }
    });

    // 2. Count leads
    leads.forEach((l) => {
      const exec = l.assignedAdminName || l.assignedToName || l.assignedAdminEmail;
      if (exec) {
        if (!staffMap[exec]) {
          staffMap[exec] = { id: l.assignedAdminId || exec, name: exec, leads: 0, convertedLeads: 0, orders: 0, revenue: 0, target: null };
        }
        staffMap[exec].leads += 1;
        const st = String(l.status || "").toUpperCase();
        if (st === "CONVERTED" || st === "WON") {
          staffMap[exec].convertedLeads += 1;
        }
      }
    });

    // 3. Count orders & revenue
    orders.forEach((o) => {
      const exec = o.salesAdminName || o.createdByAdminEmail || o.assignedStaff;
      if (exec) {
        if (!staffMap[exec]) {
          staffMap[exec] = { id: o.createdBy || exec, name: exec, leads: 0, convertedLeads: 0, orders: 0, revenue: 0, target: null };
        }
        staffMap[exec].orders += 1;
        const amt = parseFloat(o.totalInvoiceAmount || o.totalAmount || 0) || 0;
        staffMap[exec].revenue += amt;
      }
    });

    return Object.values(staffMap)
      .map((st) => {
        const conv = st.leads > 0 ? Math.min(100, Math.round(((st.convertedLeads || Math.min(st.leads, st.orders)) / st.leads) * 100)) : (st.orders > 0 ? 100 : 0);
        return {
          ...st,
          conversionRate: conv,
          achievementRate: null, // Empty state indicator
          revenueFormatted: `₹${((st.revenue || 0) / 100000).toFixed(2)}L`,
          targetFormatted: "-"
        };
      })
      .sort((a, b) => b.revenue - a.revenue || b.orders - a.orders || b.leads - a.leads);
  }, [filteredData, rawStaff]);

  // ==================== 8. ORDER STATUS & REVENUE DATA ====================
  const orderStatusMetrics = useMemo(() => {
    const { orders } = filteredData;
    const total = orders.length;

    let confirmed = 0;
    let processing = 0;
    let shipped = 0;
    let delivered = 0;
    let cancelled = 0;

    orders.forEach((o) => {
      const st = String(o.orderStatus || o.status || "").toLowerCase();
      if (st === "sales_registered" || st === "confirmed" || st === "approved") confirmed++;
      else if (st === "in_production" || st === "processing" || st === "production_complete") processing++;
      else if (st === "scm_complete" || st === "dispatched" || st === "shipped") shipped++;
      else if (st === "delivered" || st === "completed") delivered++;
      else if (st === "cancelled" || st === "rejected") cancelled++;
      else confirmed++;
    });

    return {
      totalOrders: total,
      confirmed,
      processing,
      shipped,
      delivered,
      cancelled,
      totalTrend: total > 0 ? `${total} active orders in selected filter` : "No orders matching filter"
    };
  }, [filteredData]);

  // Handle Verified CSV Export strictly respecting active filters
  const handleExportData = () => {
    try {
      const { leads, orders } = filteredData;
      let csvContent = "data:text/csv;charset=utf-8,";

      // Metadata Header
      csvContent += `# BENTORK SALES CRM - DASHBOARD EXPORT\n`;
      csvContent += `# Date Filter: "${dateRangePreset} (${dateRangeDisplay})"\n`;
      csvContent += `# State Filter: "${selectedState}"\n`;
      csvContent += `# City Filter: "${selectedCity}"\n`;
      csvContent += `# Product Filter: "${selectedProduct}"\n`;
      csvContent += `# Executive Filter: "${selectedExecutive}"\n`;
      csvContent += `# Export Generated At: "${new Date().toISOString()}"\n\n`;

      csvContent += "Type,ID,Name,Phone,State,City,Status,Revenue / Amount,Assigned To / Created By,Date\n";

      leads.forEach((l) => {
        csvContent += `Lead,"${l.id || l._id || ""}","${l.name || ""}","${l.phone || ""}","${l.state || ""}","${l.city || ""}","${l.status || ""}","${l.estimatedValue || 0}","${l.assignedAdminName || ""}","${l.createdAt || ""}"\n`;
      });

      orders.forEach((o) => {
        csvContent += `Order,"${o.id || o.orderNumber || o.piNumber || ""}","${o.customerName || ""}","${o.contactPhone || ""}","${o.state || o.shippingState || ""}","${o.city || o.shippingCity || ""}","${o.orderStatus || ""}","${o.totalInvoiceAmount || o.totalAmount || 0}","${o.salesAdminName || o.createdByAdminEmail || ""}","${o.createdAt || ""}"\n`;
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Bentork_Sales_Dashboard_${dateRangePreset.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast(`Exported ${leads.length} leads and ${orders.length} orders matching current filter.`, "success");
    } catch (err) {
      console.error("Export error:", err);
      showToast("Failed to export sales dashboard data", "error");
    }
  };

  return (
    <div style={{ maxWidth: "1540px", margin: "0 auto", padding: "16px 20px", boxSizing: "border-box" }}>
      <style>{`
        .sales-skeleton-pulse {
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: salesPulse 1.5s infinite;
        }
        @keyframes salesPulse {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .sales-kpis-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 14px;
          margin-bottom: 20px;
        }
        .sales-row-2-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }
        .sales-row-3-grid {
          display: grid;
          grid-template-columns: 1.4fr 1fr 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }
        .sales-row-4-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }
        .sales-hover-row:hover {
          background-color: #F8FAFC !important;
        }
        .sales-kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06) !important;
        }
        @media (max-width: 1100px) {
          .sales-kpis-grid {
            grid-template-columns: repeat(3, 1fr);
          }
          .sales-row-2-grid {
            grid-template-columns: 1fr;
          }
          .sales-row-3-grid {
            grid-template-columns: 1fr;
          }
          .sales-row-4-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 768px) {
          .sales-kpis-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .order-status-mini-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 500px) {
          .sales-kpis-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Top Header & Navigation Filters */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "18px"
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "22px",
              fontWeight: 700,
              color: "#0F172A",
              letterSpacing: "-0.02em",
              margin: 0
            }}
          >
            Sales Dashboard
          </h1>
          <p style={{ fontSize: "12.5px", color: "#64748B", margin: "3px 0 0 0" }}>
            Complete overview of sales performance, revenue, regions, products and team performance.
          </p>
        </div>

        {/* Filter Controls Bar */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px" }}>
          {/* 1. Date Range Picker */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => {
                setDateRangeDropdown(!dateRangeDropdown);
                setStateDropdown(false);
                setCityDropdown(false);
                setProductDropdown(false);
                setExecutiveDropdown(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 10px",
                fontSize: "11.5px",
                fontWeight: 600,
                color: "#1E293B",
                backgroundColor: "#FFFFFF",
                border: "1px solid #CBD5E1",
                borderRadius: "7px",
                boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                cursor: "pointer"
              }}
            >
              <Calendar size={13} color="#64748B" />
              <span>{dateRangeDisplay}</span>
              <ChevronDown size={13} color="#64748B" />
            </button>
            {dateRangeDropdown && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  marginTop: "4px",
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
                  zIndex: 30,
                  minWidth: "150px"
                }}
              >
                {["All Time", "Today", "This Week", "This Month", "Last Month", "This Year"].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setDateRangePreset(preset);
                      setDateRangeDropdown(false);
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "7px 12px",
                      fontSize: "11.5px",
                      border: "none",
                      background: dateRangePreset === preset ? "#EFF6FF" : "transparent",
                      color: dateRangePreset === preset ? "#2563EB" : "#334155",
                      fontWeight: dateRangePreset === preset ? 600 : 400,
                      cursor: "pointer"
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. State Filter */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => {
                setStateDropdown(!stateDropdown);
                setDateRangeDropdown(false);
                setCityDropdown(false);
                setProductDropdown(false);
                setExecutiveDropdown(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 10px",
                fontSize: "11.5px",
                fontWeight: 500,
                color: "#334155",
                backgroundColor: "#FFFFFF",
                border: "1px solid #CBD5E1",
                borderRadius: "7px",
                cursor: "pointer"
              }}
            >
              <span>{selectedState}</span>
              <ChevronDown size={13} color="#64748B" />
            </button>
            {stateDropdown && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  marginTop: "4px",
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
                  zIndex: 30,
                  minWidth: "150px",
                  maxHeight: "220px",
                  overflowY: "auto"
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedState("All States");
                    setSelectedCity("All Cities");
                    setStateDropdown(false);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "7px 12px",
                    fontSize: "11.5px",
                    border: "none",
                    background: selectedState === "All States" ? "#EFF6FF" : "transparent",
                    color: selectedState === "All States" ? "#2563EB" : "#334155",
                    cursor: "pointer"
                  }}
                >
                  All States
                </button>
                {availableStates.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setSelectedState(st);
                      setStateDropdown(false);
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "7px 12px",
                      fontSize: "11.5px",
                      border: "none",
                      background: selectedState === st ? "#EFF6FF" : "transparent",
                      color: selectedState === st ? "#2563EB" : "#334155",
                      cursor: "pointer"
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. City Filter */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => {
                setCityDropdown(!cityDropdown);
                setDateRangeDropdown(false);
                setStateDropdown(false);
                setProductDropdown(false);
                setExecutiveDropdown(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 10px",
                fontSize: "11.5px",
                fontWeight: 500,
                color: "#334155",
                backgroundColor: "#FFFFFF",
                border: "1px solid #CBD5E1",
                borderRadius: "7px",
                cursor: "pointer"
              }}
            >
              <span>{selectedCity}</span>
              <ChevronDown size={13} color="#64748B" />
            </button>
            {cityDropdown && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  marginTop: "4px",
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
                  zIndex: 30,
                  minWidth: "140px",
                  maxHeight: "220px",
                  overflowY: "auto"
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCity("All Cities");
                    setCityDropdown(false);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "7px 12px",
                    fontSize: "11.5px",
                    border: "none",
                    background: selectedCity === "All Cities" ? "#EFF6FF" : "transparent",
                    color: selectedCity === "All Cities" ? "#2563EB" : "#334155",
                    cursor: "pointer"
                  }}
                >
                  All Cities
                </button>
                {availableCities.map((ct) => (
                  <button
                    key={ct}
                    type="button"
                    onClick={() => {
                      setSelectedCity(ct);
                      setCityDropdown(false);
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "7px 12px",
                      fontSize: "11.5px",
                      border: "none",
                      background: selectedCity === ct ? "#EFF6FF" : "transparent",
                      color: selectedCity === ct ? "#2563EB" : "#334155",
                      cursor: "pointer"
                    }}
                  >
                    {ct}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 4. Product Filter */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => {
                setProductDropdown(!productDropdown);
                setDateRangeDropdown(false);
                setStateDropdown(false);
                setCityDropdown(false);
                setExecutiveDropdown(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 10px",
                fontSize: "11.5px",
                fontWeight: 500,
                color: "#334155",
                backgroundColor: "#FFFFFF",
                border: "1px solid #CBD5E1",
                borderRadius: "7px",
                cursor: "pointer"
              }}
            >
              <span>{selectedProduct}</span>
              <ChevronDown size={13} color="#64748B" />
            </button>
            {productDropdown && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  marginTop: "4px",
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
                  zIndex: 30,
                  minWidth: "160px",
                  maxHeight: "220px",
                  overflowY: "auto"
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProduct("All Products");
                    setProductDropdown(false);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "7px 12px",
                    fontSize: "11.5px",
                    border: "none",
                    background: selectedProduct === "All Products" ? "#EFF6FF" : "transparent",
                    color: selectedProduct === "All Products" ? "#2563EB" : "#334155",
                    cursor: "pointer"
                  }}
                >
                  All Products
                </button>
                {rawProducts.map((p, idx) => {
                  const pName = p.name || p.productName || p.title;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedProduct(pName);
                        setProductDropdown(false);
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "7px 12px",
                        fontSize: "11.5px",
                        border: "none",
                        background: selectedProduct === pName ? "#EFF6FF" : "transparent",
                        color: selectedProduct === pName ? "#2563EB" : "#334155",
                        cursor: "pointer"
                      }}
                    >
                      {pName}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 5. Sales Executives Filter */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => {
                setExecutiveDropdown(!executiveDropdown);
                setDateRangeDropdown(false);
                setStateDropdown(false);
                setCityDropdown(false);
                setProductDropdown(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 10px",
                fontSize: "11.5px",
                fontWeight: 500,
                color: "#334155",
                backgroundColor: "#FFFFFF",
                border: "1px solid #CBD5E1",
                borderRadius: "7px",
                cursor: "pointer"
              }}
            >
              <span>{selectedExecutive}</span>
              <ChevronDown size={13} color="#64748B" />
            </button>
            {executiveDropdown && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: "4px",
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
                  zIndex: 30,
                  minWidth: "170px",
                  maxHeight: "220px",
                  overflowY: "auto"
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedExecutive("All Sales Executives");
                    setExecutiveDropdown(false);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "7px 12px",
                    fontSize: "11.5px",
                    border: "none",
                    background: selectedExecutive === "All Sales Executives" ? "#EFF6FF" : "transparent",
                    color: selectedExecutive === "All Sales Executives" ? "#2563EB" : "#334155",
                    cursor: "pointer"
                  }}
                >
                  All Sales Executives
                </button>
                {availableExecutives.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setSelectedExecutive(name);
                      setExecutiveDropdown(false);
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "7px 12px",
                      fontSize: "11.5px",
                      border: "none",
                      background: selectedExecutive === name ? "#EFF6FF" : "transparent",
                      color: selectedExecutive === name ? "#2563EB" : "#334155",
                      cursor: "pointer"
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 6. Refresh Button */}
          <button
            type="button"
            onClick={() => fetchAllData(true)}
            title="Refresh Dashboard Data"
            disabled={refreshing || loading}
            style={{
              padding: "7px 9px",
              backgroundColor: "#FFFFFF",
              border: "1px solid #CBD5E1",
              borderRadius: "7px",
              color: "#475569",
              cursor: refreshing || loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease"
            }}
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          </button>

          {/* 7. Export Button */}
          <button
            type="button"
            onClick={handleExportData}
            style={{
              padding: "7px 14px",
              backgroundColor: "#2563EB",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "7px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              boxShadow: "0 2px 4px rgba(37, 99, 235, 0.25)",
              transition: "background-color 0.15s ease"
            }}
          >
            <Download size={14} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Live Error Banner if any */}
      {error && !loading && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px 16px",
            backgroundColor: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: "8px",
            color: "#991B1B",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "13px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertCircle size={16} color="#DC2626" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchAllData(false)}
            style={{
              padding: "4px 10px",
              backgroundColor: "#DC2626",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ROW 1: 6 KPI CARDS */}
      <div className="sales-kpis-grid">
        <SalesKpiCard
          label="Total Leads"
          value={kpiMetrics.totalLeads}
          trendText={kpiMetrics.totalLeads > 0 ? `${kpiMetrics.totalLeads} leads recorded` : "No leads in filter"}
          isPositive={kpiMetrics.totalLeads > 0}
          icon={Users}
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          sparklineColor="#3B82F6"
          loading={loading}
          onClick={() => navigate("/dashboard/leads")}
        />

        <SalesKpiCard
          label="New Leads (Today)"
          value={kpiMetrics.newLeadsToday}
          trendText={kpiMetrics.newLeadsToday > 0 ? `+${kpiMetrics.newLeadsToday} today` : "No new leads today"}
          isPositive={kpiMetrics.newLeadsToday > 0}
          icon={UserPlus}
          iconBg="#DCFCE7"
          iconColor="#16A34A"
          sparklineColor="#10B981"
          loading={loading}
          onClick={() => navigate("/dashboard/leads")}
        />

        <SalesKpiCard
          label="Pending Follow-ups"
          value={kpiMetrics.pendingFollowUps}
          trendText={kpiMetrics.overdueCount > 0 ? `↑ ${kpiMetrics.overdueCount} overdue` : "No overdue follow-ups"}
          isPositive={false}
          isWarning={kpiMetrics.overdueCount > 0}
          icon={Clock}
          iconBg="#FEE2E2"
          iconColor="#EF4444"
          sparklineColor="#EF4444"
          loading={loading}
          onClick={() => navigate("/dashboard/crm/activities")}
        />

        <SalesKpiCard
          label="Converted / Won"
          value={kpiMetrics.wonCount}
          trendText={kpiMetrics.wonCount > 0 ? `${kpiMetrics.wonCount} won deals` : "No won deals yet"}
          isPositive={true}
          icon={Award}
          iconBg="#ECFDF5"
          iconColor="#10B981"
          sparklineColor="#10B981"
          loading={loading}
          onClick={() => navigate("/dashboard/crm/opportunities")}
        />

        <SalesKpiCard
          label="Sales Revenue"
          value={kpiMetrics.revenueFormatted}
          trendText={kpiMetrics.revenueSum > 0 ? "Total order volume" : "No revenue recorded"}
          isPositive={true}
          icon={IndianRupee}
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          sparklineColor="#3B82F6"
          loading={loading}
          onClick={() => navigate("/dashboard/orders")}
        />

        <SalesKpiCard
          label="Target Achievement"
          value={kpiMetrics.targetAchievementPct !== null ? `${kpiMetrics.targetAchievementPct}%` : "Not Set"}
          trendText={kpiMetrics.targetFormatted}
          isPositive={Boolean(kpiMetrics.targetAchievementPct && kpiMetrics.targetAchievementPct >= 70)}
          icon={Crosshair}
          iconBg="#FFEDD5"
          iconColor="#EA580C"
          sparklineColor="#F97316"
          loading={loading}
          onClick={() => navigate("/dashboard/sales-admin")}
        />
      </div>

      {/* ROW 2: 3 ANALYTICS COLUMNS (Lead & Revenue Trend | Sales Pipeline Funnel | Lead Source Distribution) */}
      <div className="sales-row-2-grid">
        <LeadRevenueTrendCard
          data={trendChartData}
          loading={loading}
          granularity={trendGranularity}
          onGranularityChange={setTrendGranularity}
        />

        <SalesPipelineFunnelCard
          stages={funnelStages}
          accounts={availableExecutives}
          selectedAccount={pipelineAccount}
          onAccountChange={setPipelineAccount}
          loading={loading}
        />

        <LeadSourceDonutCard
          sources={leadSourceData}
          totalLeads={kpiMetrics.totalLeads}
          timeRange={leadSourcePeriod}
          onTimeRangeChange={setLeadSourcePeriod}
          loading={loading}
        />
      </div>

      {/* ROW 3: REGIONAL & PRODUCT SALES (State-wise | City-wise | Product-wise) */}
      <div className="sales-row-3-grid">
        <StateSalesCard
          states={stateSalesData}
          metric={stateMetric}
          onMetricChange={setStateMetric}
          timeRange={statePeriod}
          onTimeRangeChange={setStatePeriod}
          onStateSelect={(st) => setSelectedState(st)}
          loading={loading}
        />

        <CitySalesCard
          cities={citySalesData}
          metric={cityMetric}
          onMetricChange={setCityMetric}
          timeRange={cityPeriod}
          onTimeRangeChange={setCityPeriod}
          onCitySelect={(ct) => setSelectedCity(ct)}
          loading={loading}
        />

        <ProductSalesCard
          products={productSalesData}
          timeRange={productPeriod}
          onTimeRangeChange={setProductPeriod}
          onProductSelect={(p) => setSelectedProduct(p)}
          loading={loading}
        />
      </div>

      {/* ROW 4: TEAM PERFORMANCE & ORDER STATUS (Top Performing Executives | Order Status & Revenue) */}
      <div className="sales-row-4-grid">
        <TopSalesExecutivesCard
          executives={executiveSalesData}
          timeRange={executivePeriod}
          onTimeRangeChange={setExecutivePeriod}
          onExecutiveSelect={(exec) => setSelectedExecutive(exec)}
          loading={loading}
        />

        <OrderStatusRevenueCard
          stats={orderStatusMetrics}
          timeRange={orderStatusPeriod}
          onTimeRangeChange={setOrderStatusPeriod}
          loading={loading}
          onStatusClick={() => navigate("/dashboard/orders")}
        />
      </div>
    </div>
  );
}
