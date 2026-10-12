import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { procurementService } from "../../../services/procurementService";
import { inventoryService } from "../../../services/inventoryService";
import { orderService } from "../../../services/orderService";
import {
  Building2,
  FileCheck2,
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  FileText,
  Truck,
  Barcode,
  Package,
  RefreshCw,
  ArrowRight,
  Search,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Clock,
  Eye,
  Layers,
  AlertCircle,
  Calendar,
  ChevronRight,
  Plus,
  ExternalLink,
  DollarSign,
  Receipt,
  ShieldCheck,
  CheckCircle,
  MapPin,
  Phone,
  Mail,
  User,
  Activity
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from "recharts";

export default function ScmDashboard() {
  const navigate = useNavigate();

  // Core Data States
  const [vendors, setVendors] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [materialIns, setMaterialIns] = useState([]);
  const [materialOuts, setMaterialOuts] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [scmOrders, setScmOrders] = useState([]);

  // UI States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("po"); // 'po' | 'material_in' | 'material_out' | 'stock' | 'scm_queue' | 'vendors'
  const [searchQuery, setSearchQuery] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  // Fetch all SCM Datasets concurrently
  const fetchAllScmData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const userRole = (localStorage.getItem("userRole") || "").toUpperCase();
      const isSuperAdmin = ["ADMIN", "SUPER_ADMIN", "ADMINISTRATOR"].includes(userRole);

      const [vendorsRes, poRes, matInRes, matOutRes, stockRes, ordersRes] = await Promise.allSettled([
        procurementService.getAllVendors(),
        procurementService.getAllPurchaseOrders(),
        inventoryService.getAllMaterialIn(),
        inventoryService.getAllMaterialOut(),
        inventoryService.getAllStock(),
        isSuperAdmin ? orderService.adminGetAllOrders() : orderService.scmGetOrders()
      ]);

      // Parse Vendors
      if (vendorsRes.status === "fulfilled") {
        const rawV = vendorsRes.value;
        const vList = Array.isArray(rawV)
          ? rawV
          : Array.isArray(rawV?.data)
          ? rawV.data
          : Array.isArray(rawV?.vendors)
          ? rawV.vendors
          : [];
        setVendors(vList);
      } else {
        console.warn("Vendors fetch error:", vendorsRes.reason);
      }

      // Parse Purchase Orders
      if (poRes.status === "fulfilled") {
        const rawPO = poRes.value;
        const poList = Array.isArray(rawPO)
          ? rawPO
          : Array.isArray(rawPO?.data)
          ? rawPO.data
          : Array.isArray(rawPO?.content)
          ? rawPO.content
          : Array.isArray(rawPO?.purchaseOrders)
          ? rawPO.purchaseOrders
          : [];
        setPurchaseOrders(poList);
      } else {
        console.warn("PO fetch error:", poRes.reason);
      }

      // Parse Material IN
      if (matInRes.status === "fulfilled") {
        const rawIn = matInRes.value;
        const inList = Array.isArray(rawIn)
          ? rawIn
          : Array.isArray(rawIn?.data)
          ? rawIn.data
          : Array.isArray(rawIn?.content)
          ? rawIn.content
          : [];
        setMaterialIns(inList);
      } else {
        console.warn("Material IN fetch error:", matInRes.reason);
      }

      // Parse Material OUT
      if (matOutRes.status === "fulfilled") {
        const rawOut = matOutRes.value;
        const outList = Array.isArray(rawOut)
          ? rawOut
          : Array.isArray(rawOut?.data)
          ? rawOut.data
          : Array.isArray(rawOut?.content)
          ? rawOut.content
          : [];
        setMaterialOuts(outList);
      } else {
        console.warn("Material OUT fetch error:", matOutRes.reason);
      }

      // Parse Stock
      if (stockRes.status === "fulfilled") {
        const rawStock = stockRes.value;
        const sList = Array.isArray(rawStock)
          ? rawStock
          : Array.isArray(rawStock?.data)
          ? rawStock.data
          : Array.isArray(rawStock?.content)
          ? rawStock.content
          : [];
        setStocks(sList);
      } else {
        console.warn("Stock fetch error:", stockRes.reason);
      }

      // Parse Orders (SCM Queue)
      if (ordersRes.status === "fulfilled") {
        const rawOrders = ordersRes.value;
        const oList = Array.isArray(rawOrders)
          ? rawOrders
          : Array.isArray(rawOrders?.orders)
          ? rawOrders.orders
          : Array.isArray(rawOrders?.data)
          ? rawOrders.data
          : [];
        setScmOrders(oList);
      } else {
        console.warn("Orders fetch error:", ordersRes.reason);
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Critical error in fetchAllScmData:", err);
      setError(err?.message || "Failed to load complete SCM dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllScmData();
  }, [fetchAllScmData]);

  // ==========================================
  // METRICS & COMPUTATIONS
  // ==========================================

  // 1. Vendors Metrics
  const totalVendors = vendors.length;
  const gstRegisteredVendors = useMemo(() => {
    return vendors.filter((v) => v.gstNumber && String(v.gstNumber).trim() !== "").length;
  }, [vendors]);

  // 2. Purchase Orders Metrics
  const totalPOs = purchaseOrders.length;
  const poDraftCount = useMemo(() => {
    return purchaseOrders.filter((p) => {
      const s = String(p.status || p.poStatus || "").toUpperCase();
      return s === "DRAFT";
    }).length;
  }, [purchaseOrders]);

  const poApprovedCount = useMemo(() => {
    return purchaseOrders.filter((p) => {
      const s = String(p.status || p.poStatus || "").toUpperCase();
      return ["APPROVED", "ISSUED", "ORDERED", "PENDING", "IN_PROGRESS"].includes(s);
    }).length;
  }, [purchaseOrders]);

  const poReceivedCount = useMemo(() => {
    return purchaseOrders.filter((p) => {
      const s = String(p.status || p.poStatus || "").toUpperCase();
      return ["RECEIVED", "COMPLETED", "DELIVERED", "FULFILLED"].includes(s);
    }).length;
  }, [purchaseOrders]);

  const totalPOValue = useMemo(() => {
    return purchaseOrders.reduce((sum, p) => {
      const amt = parseFloat(p.totalAmount || p.totalPrice || p.amount || 0);
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0);
  }, [purchaseOrders]);

  // 3. Material IN Metrics
  const totalMaterialInCount = materialIns.length;
  const totalMaterialInUnits = useMemo(() => {
    return materialIns.reduce((sum, m) => {
      let qty = Number(m.totalQuantity || m.quantity || 0);
      if (!qty && Array.isArray(m.items)) {
        qty = m.items.reduce((s, it) => s + (Number(it.quantity || it.receivedQuantity) || 0), 0);
      }
      return sum + (isNaN(qty) ? 0 : qty);
    }, 0);
  }, [materialIns]);

  const totalMaterialInValue = useMemo(() => {
    return materialIns.reduce((sum, m) => {
      const amt = parseFloat(m.totalAmount || m.amount || m.invoiceAmount || 0);
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0);
  }, [materialIns]);

  // 4. Material OUT Metrics
  const totalMaterialOutCount = materialOuts.length;
  const totalMaterialOutUnits = useMemo(() => {
    return materialOuts.reduce((sum, m) => {
      const qty = Number(m.quantity || m.issuedQuantity || 0);
      return sum + (isNaN(qty) ? 0 : qty);
    }, 0);
  }, [materialOuts]);

  // 5. Inventory Stock Metrics
  const totalStockSKUs = stocks.length;
  const totalAvailableStockUnits = useMemo(() => {
    return stocks.reduce((sum, s) => {
      const qty = Number(s.availableQuantity !== undefined ? s.availableQuantity : s.quantity || s.totalQuantity || 0);
      return sum + (isNaN(qty) ? 0 : qty);
    }, 0);
  }, [stocks]);

  const lowStockItems = useMemo(() => {
    return stocks.filter((s) => {
      const qty = Number(s.availableQuantity !== undefined ? s.availableQuantity : s.quantity || 0);
      const min = Number(s.minThreshold || s.lowStockThreshold || 5);
      return qty > 0 && qty <= min;
    });
  }, [stocks]);

  const outOfStockItems = useMemo(() => {
    return stocks.filter((s) => {
      const qty = Number(s.availableQuantity !== undefined ? s.availableQuantity : s.quantity || 0);
      return qty === 0;
    });
  }, [stocks]);

  const healthyStockCount = Math.max(0, totalStockSKUs - lowStockItems.length - outOfStockItems.length);

  // 6. SCM Fulfillment Queue Metrics
  const awaitingScmCount = scmOrders.filter((o) => o.orderStatus === "production_complete").length;
  const scmCompleteCount = scmOrders.filter((o) => o.orderStatus === "scm_complete").length;
  const dispatchedCount = scmOrders.filter((o) => ["dispatched", "delivered", "completed"].includes(o.orderStatus)).length;

  // 7. Material Reports Total Activity
  const totalTransactionsCount = totalPOs + totalMaterialInCount + totalMaterialOutCount;

  // ==========================================
  // CHART DATASETS
  // ==========================================

  // Chart 1: Stock Health Donut
  const stockHealthData = [
    { name: "Healthy Stock", value: healthyStockCount, color: "#10B981" },
    { name: "Low Stock Alert", value: lowStockItems.length, color: "#F59E0B" },
    { name: "Out of Stock", value: outOfStockItems.length, color: "#EF4444" },
  ];

  // Chart 2: SCM Fulfillment Distribution
  const fulfillmentData = [
    { name: "Awaiting SCM", value: awaitingScmCount, color: "#F59E0B" },
    { name: "SCM Complete", value: scmCompleteCount, color: "#0F766E" },
    { name: "Dispatched", value: dispatchedCount, color: "#3B82F6" },
  ];

  // Chart 3: Material Movement Comparison
  const movementChartData = [
    { name: "Procured (PO)", count: totalPOs, units: totalPOs * 10, fill: "#F59E0B" },
    { name: "Material IN", count: totalMaterialInCount, units: totalMaterialInUnits, fill: "#0F766E" },
    { name: "Material OUT", count: totalMaterialOutCount, units: totalMaterialOutUnits, fill: "#3B82F6" },
  ];

  // ==========================================
  // FILTERED TAB DATA (Searchable)
  // ==========================================
  const q = searchQuery.toLowerCase().trim();

  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter((p) => {
      if (!q) return true;
      const poNum = String(p.poNumber || p.orderNumber || p.id || "").toLowerCase();
      const vName = String(p.vendor?.name || p.vendorName || "").toLowerCase();
      const status = String(p.status || p.poStatus || "").toLowerCase();
      return poNum.includes(q) || vName.includes(q) || status.includes(q);
    });
  }, [purchaseOrders, q]);

  const filteredMaterialIns = useMemo(() => {
    return materialIns.filter((m) => {
      if (!q) return true;
      const recNo = String(m.receiptNumber || m.inwardNumber || m.id || "").toLowerCase();
      const vName = String(m.vendorName || m.vendor?.name || "").toLowerCase();
      const invNo = String(m.vendorInvoiceNumber || m.invoiceNumber || "").toLowerCase();
      return recNo.includes(q) || vName.includes(q) || invNo.includes(q);
    });
  }, [materialIns, q]);

  const filteredMaterialOuts = useMemo(() => {
    return materialOuts.filter((m) => {
      if (!q) return true;
      const outNo = String(m.issueNumber || m.outwardNumber || m.id || "").toLowerCase();
      const pName = String(m.productName || m.product?.name || "").toLowerCase();
      const to = String(m.issuedTo || "").toLowerCase();
      const purpose = String(m.purpose || "").toLowerCase();
      return outNo.includes(q) || pName.includes(q) || to.includes(q) || purpose.includes(q);
    });
  }, [materialOuts, q]);

  const filteredStocks = useMemo(() => {
    return stocks.filter((s) => {
      if (!q) return true;
      const pName = String(s.product?.name || s.productName || "").toLowerCase();
      const cat = String(s.product?.category || s.category || "").toLowerCase();
      const model = String(s.product?.modelNumber || s.modelNumber || "").toLowerCase();
      return pName.includes(q) || cat.includes(q) || model.includes(q);
    });
  }, [stocks, q]);

  const filteredScmOrders = useMemo(() => {
    return scmOrders.filter((o) => {
      if (!q) return true;
      const oNum = String(o.orderNumber || o.id || "").toLowerCase();
      const inv = String(o.invoiceNumber || "").toLowerCase();
      const st = String(o.orderStatus || "").toLowerCase();
      const courier = String(o.courierName || "").toLowerCase();
      return oNum.includes(q) || inv.includes(q) || st.includes(q) || courier.includes(q);
    });
  }, [scmOrders, q]);

  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      if (!q) return true;
      const name = String(v.name || "").toLowerCase();
      const gst = String(v.gstNumber || "").toLowerCase();
      const person = String(v.contactPerson || "").toLowerCase();
      return name.includes(q) || gst.includes(q) || person.includes(q);
    });
  }, [vendors, q]);

  return (
    <div className="scm-dashboard-root">
      <style>{`
        .scm-dashboard-root {
          padding: 20px 24px 48px;
          max-width: 1440px;
          margin: 0 auto;
          box-sizing: border-box;
          font-family: 'Lexend', sans-serif;
          color: #111827;
        }

        /* Banner */
        .scm-hero-banner {
          background: linear-gradient(135deg, #064E3B 0%, #0F766E 50%, #14B8A6 100%);
          border-radius: 16px;
          padding: 24px 28px;
          color: #FFFFFF;
          margin-bottom: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 10px 25px -5px rgba(15, 118, 110, 0.35);
          flex-wrap: wrap;
          gap: 16px;
          position: relative;
          overflow: hidden;
        }
        .scm-hero-banner::after {
          content: "";
          position: absolute;
          right: -40px;
          bottom: -40px;
          width: 220px;
          height: 220px;
          background: radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 70%);
          border-radius: 50%;
          pointer-events: none;
        }
        .scm-banner-tag {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1px;
          background: rgba(255, 255, 255, 0.2);
          padding: 4px 12px;
          border-radius: 20px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .scm-banner-title {
          font-size: 24px;
          font-weight: 700;
          margin-top: 8px;
          margin-bottom: 4px;
          color: #FFFFFF;
          letter-spacing: -0.3px;
        }
        .scm-banner-desc {
          font-size: 13px;
          opacity: 0.92;
          margin: 0;
          max-width: 650px;
          line-height: 1.5;
        }
        .scm-banner-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
          z-index: 1;
        }
        .scm-btn-primary {
          background: #FFFFFF;
          color: #0F766E;
          border: none;
          padding: 10px 18px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          font-family: 'Lexend', sans-serif;
          box-shadow: 0 4px 12px rgba(0,0,0,0.12);
          transition: all 0.2s ease;
        }
        .scm-btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.18);
          background: #F0FDFA;
        }
        .scm-btn-secondary {
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.35);
          color: #FFFFFF;
          padding: 10px 16px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-weight: 500;
          font-size: 13px;
          font-family: 'Lexend', sans-serif;
          backdrop-filter: blur(6px);
          transition: all 0.2s ease;
        }
        .scm-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.25);
        }

        /* 6 Summary Cards Grid */
        .scm-summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .scm-card {
          background: #FFFFFF;
          border-radius: 14px;
          border: 1px solid #E5E7EB;
          padding: 18px 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .scm-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.08);
          border-color: #CBD5E1;
        }
        .scm-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .scm-card-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .scm-card-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 8px;
        }
        .scm-card-value {
          font-size: 26px;
          font-weight: 700;
          color: #111827;
          margin-top: 12px;
          line-height: 1.1;
          letter-spacing: -0.5px;
        }
        .scm-card-subtext {
          font-size: 12px;
          color: #6B7280;
          margin-top: 6px;
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 500;
        }
        .scm-card-action {
          margin-top: 14px;
          padding-top: 10px;
          border-top: 1px solid #F3F4F6;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;
          font-weight: 600;
        }

        /* Quick Nav Bar */
        .scm-quicknav-wrap {
          background: #FFFFFF;
          border-radius: 14px;
          border: 1px solid #E5E7EB;
          padding: 16px 20px;
          margin-bottom: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.03);
        }
        .scm-quicknav-title {
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: #6B7280;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .scm-quicknav-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
          gap: 10px;
        }
        .scm-quicknav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.15s ease;
          color: #334155;
          text-decoration: none;
        }
        .scm-quicknav-item:hover {
          background: #F0FDFA;
          border-color: #99F6E4;
          color: #0F766E;
          transform: translateY(-1px);
        }
        .scm-quicknav-item-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
        }

        /* Charts Grid */
        .scm-charts-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 20px;
          margin-bottom: 24px;
        }
        .scm-chart-card {
          background: #FFFFFF;
          padding: 20px;
          border-radius: 14px;
          border: 1px solid #E5E7EB;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .scm-chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .scm-chart-title {
          font-size: 15px;
          font-weight: 700;
          color: #111827;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .scm-chart-subtitle {
          font-size: 12px;
          color: #6B7280;
          margin-top: 2px;
        }

        /* Operational Data Table Section */
        .scm-data-section {
          background: #FFFFFF;
          border-radius: 14px;
          border: 1px solid #E5E7EB;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          overflow: hidden;
        }
        .scm-data-header {
          padding: 18px 20px;
          border-bottom: 1px solid #E5E7EB;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 14px;
          background: #FFFFFF;
        }
        .scm-tabs-list {
          display: flex;
          gap: 6px;
          background: #F1F5F9;
          padding: 4px;
          border-radius: 10px;
          overflow-x: auto;
          max-width: 100%;
        }
        .scm-tab-btn {
          padding: 8px 14px;
          border-radius: 8px;
          border: none;
          font-size: 12px;
          font-weight: 600;
          font-family: 'Lexend', sans-serif;
          cursor: pointer;
          background: transparent;
          color: #64748B;
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
          transition: all 0.15s ease;
        }
        .scm-tab-btn.active {
          background: #FFFFFF;
          color: #0F766E;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .scm-tab-badge {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 10px;
          background: rgba(15, 118, 110, 0.1);
          color: #0F766E;
          font-weight: 700;
        }

        .scm-search-box {
          position: relative;
          min-width: 240px;
        }
        .scm-search-input {
          width: 100%;
          padding: 8px 12px 8px 34px;
          border-radius: 8px;
          border: 1px solid #CBD5E1;
          font-size: 13px;
          font-family: 'Lexend', sans-serif;
          outline: none;
          background: #F8FAFC;
          box-sizing: border-box;
          transition: all 0.2s;
        }
        .scm-search-input:focus {
          border-color: #0F766E;
          background: #FFFFFF;
          box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.12);
        }
        .scm-search-icon {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: #94A3B8;
        }

        /* Table */
        .scm-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          text-align: left;
        }
        .scm-table th {
          background: #F8FAFC;
          color: #475569;
          font-weight: 600;
          padding: 12px 16px;
          border-bottom: 1px solid #E2E8F0;
          white-space: nowrap;
        }
        .scm-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #F1F5F9;
          color: #334155;
          vertical-align: middle;
        }
        .scm-table tr:hover td {
          background: #F8FAFC;
        }
        .scm-table tr:last-child td {
          border-bottom: none;
        }

        /* Status Badges */
        .badge-draft {
          background: #FEF3C7;
          color: #B45309;
          border: 1px solid #FDE68A;
        }
        .badge-approved {
          background: #EFF6FF;
          color: #1D4ED8;
          border: 1px solid #BFDBFE;
        }
        .badge-completed {
          background: #ECFDF5;
          color: #047857;
          border: 1px solid #A7F3D0;
        }
        .badge-alert {
          background: #FEE2E2;
          color: #DC2626;
          border: 1px solid #FECACA;
        }
        .badge-neutral {
          background: #F1F5F9;
          color: #475569;
          border: 1px solid #E2E8F0;
        }

        /* Action Buttons in table */
        .scm-row-btn {
          padding: 5px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          font-family: 'Lexend', sans-serif;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border: 1px solid #99F6E4;
          background: #F0FDFA;
          color: #0F766E;
          transition: all 0.15s ease;
        }
        .scm-row-btn:hover {
          background: #0F766E;
          color: #FFFFFF;
          border-color: #0F766E;
        }

        /* Skeleton Loading */
        .scm-skeleton {
          background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
          background-size: 200% 100%;
          animation: scmShimmer 1.5s infinite;
          border-radius: 6px;
        }
        @keyframes scmShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .spin-icon {
          animation: spinAnim 1s linear infinite;
        }
        @keyframes spinAnim {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 1024px) {
          .scm-charts-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 640px) {
          .scm-dashboard-root {
            padding: 12px 14px 32px;
          }
          .scm-hero-banner {
            padding: 18px 20px;
            flex-direction: column;
            align-items: flex-start;
          }
          .scm-banner-actions {
            width: 100%;
          }
          .scm-btn-primary, .scm-btn-secondary {
            width: 100%;
            justify-content: center;
          }
          .scm-data-header {
            flex-direction: column;
            align-items: stretch;
          }
          .scm-search-box {
            width: 100%;
          }
        }
      `}</style>

      {/* ========================================================= */}
      {/* 1. HERO HEADER BANNER                                    */}
      {/* ========================================================= */}
      <div className="scm-hero-banner">
        <div>
          <span className="scm-banner-tag">
            <ShieldCheck size={14} /> Bentork SCM Command Center
          </span>
          <h1 className="scm-banner-title">
            Supply Chain & Logistics Management
          </h1>
          <p className="scm-banner-desc">
            End-to-end unified overview of active vendors, procurement orders, inward receipts, production issuances, real-time inventory stock, and logistics dispatch.
          </p>
          {lastUpdated && (
            <div style={{ fontSize: "11px", opacity: 0.8, marginTop: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
              <Clock size={12} /> Last synced: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
        </div>

        <div className="scm-banner-actions">
          <button
            onClick={() => fetchAllScmData(true)}
            className="scm-btn-secondary"
            disabled={refreshing || loading}
            title="Reload all SCM datasets"
          >
            <RefreshCw size={15} className={refreshing || loading ? "spin-icon" : ""} />
            {refreshing ? "Refreshing..." : "Refresh Data"}
          </button>
          <button
            onClick={() => navigate("/dashboard/material-reports")}
            className="scm-btn-primary"
          >
            <FileText size={15} /> SCM Reports <ArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* Error Banner if any */}
      {error && (
        <div style={{
          background: "#FEF2F2",
          border: "1px solid #FECACA",
          color: "#991B1B",
          padding: "12px 16px",
          borderRadius: "10px",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "13px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertCircle size={18} color="#DC2626" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchAllScmData(true)}
            style={{
              background: "#DC2626",
              color: "#FFFFFF",
              border: "none",
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "12px",
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. SUMMARY CARDS GRID (6 Core SCM Modules)               */}
      {/* ========================================================= */}
      <div className="scm-summary-grid">
        {/* Card 1: Vendors */}
        <div className="scm-card" onClick={() => navigate("/dashboard/vendors")}>
          <div>
            <div className="scm-card-header">
              <div className="scm-card-icon" style={{ background: "#F0FDFA", color: "#0F766E" }}>
                <Building2 size={22} />
              </div>
              <span className="scm-card-badge" style={{ background: "#F0FDFA", color: "#0F766E", border: "1px solid #99F6E4" }}>
                Active Directory
              </span>
            </div>
            <div className="scm-card-value">
              {loading ? <div className="scm-skeleton" style={{ width: "60px", height: "30px" }} /> : totalVendors}
            </div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#374151", marginTop: "2px" }}>
              Registered Vendors
            </div>
            <div className="scm-card-subtext">
              <ShieldCheck size={13} color="#0F766E" />
              <span>{gstRegisteredVendors} GST Verified</span>
            </div>
          </div>
          <div className="scm-card-action" style={{ color: "#0F766E" }}>
            <span>Manage Vendors</span>
            <ChevronRight size={15} />
          </div>
        </div>

        {/* Card 2: Purchase Orders */}
        <div className="scm-card" onClick={() => navigate("/dashboard/purchase-orders")}>
          <div>
            <div className="scm-card-header">
              <div className="scm-card-icon" style={{ background: "#FEF3C7", color: "#D97706" }}>
                <FileCheck2 size={22} />
              </div>
              <span className="scm-card-badge" style={{ background: "#FEF3C7", color: "#B45309", border: "1px solid #FDE68A" }}>
                {poDraftCount > 0 ? `${poDraftCount} Drafts` : "All Processed"}
              </span>
            </div>
            <div className="scm-card-value">
              {loading ? <div className="scm-skeleton" style={{ width: "60px", height: "30px" }} /> : totalPOs}
            </div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#374151", marginTop: "2px" }}>
              Purchase Orders
            </div>
            <div className="scm-card-subtext">
              <DollarSign size={13} color="#D97706" />
              <span>₹{totalPOValue.toLocaleString("en-IN")} Value ({poApprovedCount} Active)</span>
            </div>
          </div>
          <div className="scm-card-action" style={{ color: "#D97706" }}>
            <span>Manage Orders</span>
            <ChevronRight size={15} />
          </div>
        </div>

        {/* Card 3: Material IN */}
        <div className="scm-card" onClick={() => navigate("/dashboard/material-in")}>
          <div>
            <div className="scm-card-header">
              <div className="scm-card-icon" style={{ background: "#EFF6FF", color: "#2563EB" }}>
                <ArrowDownLeft size={22} />
              </div>
              <span className="scm-card-badge" style={{ background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE" }}>
                Inward GRN
              </span>
            </div>
            <div className="scm-card-value">
              {loading ? <div className="scm-skeleton" style={{ width: "60px", height: "30px" }} /> : totalMaterialInCount}
            </div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#374151", marginTop: "2px" }}>
              Material IN (Receipts)
            </div>
            <div className="scm-card-subtext">
              <Package size={13} color="#2563EB" />
              <span>{totalMaterialInUnits.toLocaleString("en-IN")} Units Received</span>
            </div>
          </div>
          <div className="scm-card-action" style={{ color: "#2563EB" }}>
            <span>Inward Log</span>
            <ChevronRight size={15} />
          </div>
        </div>

        {/* Card 4: Material OUT */}
        <div className="scm-card" onClick={() => navigate("/dashboard/material-out")}>
          <div>
            <div className="scm-card-header">
              <div className="scm-card-icon" style={{ background: "#F3E8FF", color: "#7C3AED" }}>
                <ArrowUpRight size={22} />
              </div>
              <span className="scm-card-badge" style={{ background: "#F3E8FF", color: "#6D28D9", border: "1px solid #DDD6FE" }}>
                Line Issue
              </span>
            </div>
            <div className="scm-card-value">
              {loading ? <div className="scm-skeleton" style={{ width: "60px", height: "30px" }} /> : totalMaterialOutCount}
            </div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#374151", marginTop: "2px" }}>
              Material OUT (Issues)
            </div>
            <div className="scm-card-subtext">
              <TrendingUp size={13} color="#7C3AED" />
              <span>{totalMaterialOutUnits.toLocaleString("en-IN")} Units Dispatched</span>
            </div>
          </div>
          <div className="scm-card-action" style={{ color: "#7C3AED" }}>
            <span>Outward Log</span>
            <ChevronRight size={15} />
          </div>
        </div>

        {/* Card 5: Inventory Stock */}
        <div className="scm-card" onClick={() => navigate("/dashboard/inventory-stock")}>
          <div>
            <div className="scm-card-header">
              <div className="scm-card-icon" style={{ background: "#ECFDF5", color: "#059669" }}>
                <Boxes size={22} />
              </div>
              <span
                className="scm-card-badge"
                style={{
                  background: lowStockItems.length + outOfStockItems.length > 0 ? "#FEE2E2" : "#ECFDF5",
                  color: lowStockItems.length + outOfStockItems.length > 0 ? "#DC2626" : "#047857",
                  border: `1px solid ${lowStockItems.length + outOfStockItems.length > 0 ? "#FECACA" : "#A7F3D0"}`
                }}
              >
                {lowStockItems.length + outOfStockItems.length > 0
                  ? `${lowStockItems.length + outOfStockItems.length} Alerts`
                  : "Stock Healthy"}
              </span>
            </div>
            <div className="scm-card-value">
              {loading ? (
                <div className="scm-skeleton" style={{ width: "60px", height: "30px" }} />
              ) : (
                `${totalAvailableStockUnits.toLocaleString("en-IN")}`
              )}
            </div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#374151", marginTop: "2px" }}>
              Units In Stock ({totalStockSKUs} SKUs)
            </div>
            <div className="scm-card-subtext">
              {lowStockItems.length > 0 ? (
                <span style={{ color: "#D97706", display: "flex", alignItems: "center", gap: "3px" }}>
                  <AlertTriangle size={13} /> {lowStockItems.length} Low Stock SKUs
                </span>
              ) : (
                <span style={{ color: "#059669", display: "flex", alignItems: "center", gap: "3px" }}>
                  <CheckCircle2 size={13} /> Optimal Levels
                </span>
              )}
            </div>
          </div>
          <div className="scm-card-action" style={{ color: "#059669" }}>
            <span>Stock Details</span>
            <ChevronRight size={15} />
          </div>
        </div>

        {/* Card 6: Material Reports */}
        <div className="scm-card" onClick={() => navigate("/dashboard/material-reports")}>
          <div>
            <div className="scm-card-header">
              <div className="scm-card-icon" style={{ background: "#E0F2FE", color: "#0284C7" }}>
                <FileText size={22} />
              </div>
              <span className="scm-card-badge" style={{ background: "#E0F2FE", color: "#0369A1", border: "1px solid #BAE6FD" }}>
                Export Hub
              </span>
            </div>
            <div className="scm-card-value">
              {loading ? <div className="scm-skeleton" style={{ width: "60px", height: "30px" }} /> : totalTransactionsCount}
            </div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#374151", marginTop: "2px" }}>
              Material Reports
            </div>
            <div className="scm-card-subtext">
              <FileCheck2 size={13} color="#0284C7" />
              <span>Audit & Reconciliation</span>
            </div>
          </div>
          <div className="scm-card-action" style={{ color: "#0284C7" }}>
            <span>Generate Reports</span>
            <ChevronRight size={15} />
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. QUICK NAVIGATION SHORTCUTS                            */}
      {/* ========================================================= */}
      <div className="scm-quicknav-wrap">
        <div className="scm-quicknav-title">
          <Activity size={14} color="#0F766E" /> SCM Module Quick Actions
        </div>
        <div className="scm-quicknav-grid">
          <div className="scm-quicknav-item" onClick={() => navigate("/dashboard/vendors")}>
            <div className="scm-quicknav-item-icon" style={{ color: "#0F766E" }}>
              <Building2 size={17} />
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600 }}>Vendors</div>
              <div style={{ fontSize: "11px", color: "#64748B" }}>Supplier master & GST</div>
            </div>
          </div>

          <div className="scm-quicknav-item" onClick={() => navigate("/dashboard/purchase-orders")}>
            <div className="scm-quicknav-item-icon" style={{ color: "#D97706" }}>
              <FileCheck2 size={17} />
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600 }}>Purchase Orders</div>
              <div style={{ fontSize: "11px", color: "#64748B" }}>Create & approve POs</div>
            </div>
          </div>

          <div className="scm-quicknav-item" onClick={() => navigate("/dashboard/material-in")}>
            <div className="scm-quicknav-item-icon" style={{ color: "#2563EB" }}>
              <ArrowDownLeft size={17} />
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600 }}>Material IN</div>
              <div style={{ fontSize: "11px", color: "#64748B" }}>Inward GRN & Invoices</div>
            </div>
          </div>

          <div className="scm-quicknav-item" onClick={() => navigate("/dashboard/material-out")}>
            <div className="scm-quicknav-item-icon" style={{ color: "#7C3AED" }}>
              <ArrowUpRight size={17} />
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600 }}>Material OUT</div>
              <div style={{ fontSize: "11px", color: "#64748B" }}>Issue to assembly & test</div>
            </div>
          </div>

          <div className="scm-quicknav-item" onClick={() => navigate("/dashboard/inventory-stock")}>
            <div className="scm-quicknav-item-icon" style={{ color: "#059669" }}>
              <Boxes size={17} />
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600 }}>Inventory Stock</div>
              <div style={{ fontSize: "11px", color: "#64748B" }}>Real-time SKU quantities</div>
            </div>
          </div>

          <div className="scm-quicknav-item" onClick={() => navigate("/dashboard/material-reports")}>
            <div className="scm-quicknav-item-icon" style={{ color: "#0284C7" }}>
              <FileText size={17} />
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600 }}>Material Reports</div>
              <div style={{ fontSize: "11px", color: "#64748B" }}>Excel/PDF export hub</div>
            </div>
          </div>

          <div className="scm-quicknav-item" onClick={() => navigate("/dashboard/orders")}>
            <div className="scm-quicknav-item-icon" style={{ color: "#0F766E" }}>
              <Truck size={17} />
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600 }}>SCM Logistics Queue</div>
              <div style={{ fontSize: "11px", color: "#64748B" }}>Barcodes & Dispatch</div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. ANALYTICS & CHARTS SECTION                           */}
      {/* ========================================================= */}
      <div className="scm-charts-grid">
        {/* Chart 1: Movement & Flow */}
        <div className="scm-chart-card">
          <div className="scm-chart-header">
            <div>
              <h3 className="scm-chart-title">
                <TrendingUp size={18} color="#0F766E" /> SCM Volume & Material Flow
              </h3>
              <div className="scm-chart-subtitle">
                Comparative breakdown of Procured POs, Inward Receipts, and Outward Issues
              </div>
            </div>
          </div>

          <div style={{ height: "240px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={movementChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#1E293B",
                    color: "#FFFFFF",
                    borderRadius: "8px",
                    border: "none",
                    fontSize: "12px",
                    fontFamily: "'Lexend', sans-serif"
                  }}
                />
                <Bar dataKey="count" name="Total Transactions" radius={[6, 6, 0, 0]}>
                  {movementChartData.map((entry, idx) => (
                    <Cell key={`bar-${idx}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Inventory Health Donut */}
        <div className="scm-chart-card">
          <div className="scm-chart-header">
            <div>
              <h3 className="scm-chart-title">
                <Boxes size={18} color="#059669" /> Inventory Stock Health
              </h3>
              <div className="scm-chart-subtitle">
                SKU distribution across healthy, low stock threshold, and out-of-stock
              </div>
            </div>
          </div>

          <div style={{ height: "240px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stockHealthData}
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {stockHealthData.map((entry, index) => (
                    <Cell key={`cell-stock-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#1E293B",
                    color: "#FFFFFF",
                    borderRadius: "8px",
                    border: "none",
                    fontSize: "12px",
                    fontFamily: "'Lexend', sans-serif"
                  }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. OPERATIONAL DATA & RECENT ACTIVITY CENTER             */}
      {/* ========================================================= */}
      <div className="scm-data-section">
        <div className="scm-data-header">
          {/* Tabs */}
          <div className="scm-tabs-list">
            <button
              className={`scm-tab-btn ${activeTab === "po" ? "active" : ""}`}
              onClick={() => { setActiveTab("po"); setSearchQuery(""); }}
            >
              <FileCheck2 size={15} />
              Purchase Orders <span className="scm-tab-badge">{purchaseOrders.length}</span>
            </button>
            <button
              className={`scm-tab-btn ${activeTab === "material_in" ? "active" : ""}`}
              onClick={() => { setActiveTab("material_in"); setSearchQuery(""); }}
            >
              <ArrowDownLeft size={15} />
              Material IN <span className="scm-tab-badge">{materialIns.length}</span>
            </button>
            <button
              className={`scm-tab-btn ${activeTab === "material_out" ? "active" : ""}`}
              onClick={() => { setActiveTab("material_out"); setSearchQuery(""); }}
            >
              <ArrowUpRight size={15} />
              Material OUT <span className="scm-tab-badge">{materialOuts.length}</span>
            </button>
            <button
              className={`scm-tab-btn ${activeTab === "stock" ? "active" : ""}`}
              onClick={() => { setActiveTab("stock"); setSearchQuery(""); }}
            >
              <Boxes size={15} />
              Stock Watch <span className="scm-tab-badge">{stocks.length}</span>
            </button>
            <button
              className={`scm-tab-btn ${activeTab === "scm_queue" ? "active" : ""}`}
              onClick={() => { setActiveTab("scm_queue"); setSearchQuery(""); }}
            >
              <Truck size={15} />
              SCM Queue <span className="scm-tab-badge">{scmOrders.length}</span>
            </button>
            <button
              className={`scm-tab-btn ${activeTab === "vendors" ? "active" : ""}`}
              onClick={() => { setActiveTab("vendors"); setSearchQuery(""); }}
            >
              <Building2 size={15} />
              Vendors <span className="scm-tab-badge">{vendors.length}</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="scm-search-box">
            <Search size={15} className="scm-search-icon" />
            <input
              type="text"
              className="scm-search-input"
              placeholder={`Search ${activeTab.replace("_", " ")}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Content Views based on activeTab */}
        <div style={{ overflowX: "auto" }}>
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
              <RefreshCw size={24} className="spin-icon" style={{ margin: "0 auto 12px", display: "block", color: "#0F766E" }} />
              Loading SCM activity data...
            </div>
          ) : (
            <>
              {/* ----------------- TAB: PURCHASE ORDERS ----------------- */}
              {activeTab === "po" && (
                filteredPOs.length === 0 ? (
                  <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
                    <FileCheck2 size={32} style={{ margin: "0 auto 8px", display: "block", color: "#CBD5E1" }} />
                    <p style={{ margin: 0, fontWeight: 500 }}>No Purchase Orders found.</p>
                    <button
                      onClick={() => navigate("/dashboard/purchase-orders")}
                      className="scm-row-btn"
                      style={{ marginTop: "12px" }}
                    >
                      <Plus size={14} /> Create New Purchase Order
                    </button>
                  </div>
                ) : (
                  <table className="scm-table">
                    <thead>
                      <tr>
                        <th>PO Number</th>
                        <th>Vendor Name</th>
                        <th>Expected Delivery</th>
                        <th>Total Amount</th>
                        <th>Status</th>
                        <th>Created Date</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPOs.slice(0, 8).map((po) => {
                        const statusKey = String(po.status || po.poStatus || "DRAFT").toUpperCase();
                        const isDraft = statusKey === "DRAFT";
                        const isRec = ["RECEIVED", "COMPLETED"].includes(statusKey);

                        return (
                          <tr key={po.id || po.poNumber}>
                            <td style={{ fontWeight: 600, color: "#111827" }}>
                              {po.poNumber || `PO-${po.id}`}
                            </td>
                            <td style={{ fontWeight: 500 }}>
                              {po.vendor?.name || po.vendorName || "—"}
                            </td>
                            <td>
                              {po.expectedDeliveryDate || "—"}
                            </td>
                            <td style={{ fontWeight: 600, color: "#059669" }}>
                              ₹{parseFloat(po.totalAmount || po.amount || 0).toLocaleString("en-IN")}
                            </td>
                            <td>
                              <span
                                className={`scm-card-badge ${
                                  isDraft ? "badge-draft" : isRec ? "badge-completed" : "badge-approved"
                                }`}
                              >
                                {statusKey}
                              </span>
                            </td>
                            <td style={{ color: "#64748B" }}>
                              {po.createdAt ? new Date(po.createdAt).toLocaleDateString() : "—"}
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <button
                                onClick={() => navigate("/dashboard/purchase-orders")}
                                className="scm-row-btn"
                              >
                                <Eye size={13} /> View PO
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )
              )}

              {/* ----------------- TAB: MATERIAL IN ----------------- */}
              {activeTab === "material_in" && (
                filteredMaterialIns.length === 0 ? (
                  <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
                    <ArrowDownLeft size={32} style={{ margin: "0 auto 8px", display: "block", color: "#CBD5E1" }} />
                    <p style={{ margin: 0, fontWeight: 500 }}>No Material IN inward receipts found.</p>
                    <button
                      onClick={() => navigate("/dashboard/material-in")}
                      className="scm-row-btn"
                      style={{ marginTop: "12px" }}
                    >
                      <Plus size={14} /> Process Inward Receipt
                    </button>
                  </div>
                ) : (
                  <table className="scm-table">
                    <thead>
                      <tr>
                        <th>Receipt / GRN No</th>
                        <th>Vendor Name</th>
                        <th>Vendor Invoice No</th>
                        <th>Quantity</th>
                        <th>Total Amount</th>
                        <th>Received Date</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMaterialIns.slice(0, 8).map((mat) => {
                        let qty = Number(mat.totalQuantity || mat.quantity || 0);
                        if (!qty && Array.isArray(mat.items)) {
                          qty = mat.items.reduce((sum, it) => sum + (Number(it.quantity || it.receivedQuantity) || 0), 0);
                        }

                        return (
                          <tr key={mat.id || mat.receiptNumber}>
                            <td style={{ fontWeight: 600, color: "#111827" }}>
                              {mat.receiptNumber || mat.inwardNumber || `IN-${mat.id}`}
                            </td>
                            <td style={{ fontWeight: 500 }}>
                              {mat.vendorName || mat.vendor?.name || "—"}
                            </td>
                            <td style={{ fontFamily: "monospace", color: "#475569" }}>
                              {mat.vendorInvoiceNumber || mat.invoiceNumber || "—"}
                            </td>
                            <td>
                              <span style={{ fontWeight: 600 }}>{qty}</span> units
                            </td>
                            <td style={{ fontWeight: 600, color: "#059669" }}>
                              ₹{parseFloat(mat.totalAmount || mat.amount || 0).toLocaleString("en-IN")}
                            </td>
                            <td style={{ color: "#64748B" }}>
                              {mat.receivedDate || (mat.createdAt ? new Date(mat.createdAt).toLocaleDateString() : "—")}
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <button
                                onClick={() => navigate("/dashboard/material-in")}
                                className="scm-row-btn"
                              >
                                <Eye size={13} /> View GRN
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )
              )}

              {/* ----------------- TAB: MATERIAL OUT ----------------- */}
              {activeTab === "material_out" && (
                filteredMaterialOuts.length === 0 ? (
                  <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
                    <ArrowUpRight size={32} style={{ margin: "0 auto 8px", display: "block", color: "#CBD5E1" }} />
                    <p style={{ margin: 0, fontWeight: 500 }}>No Material OUT records found.</p>
                    <button
                      onClick={() => navigate("/dashboard/material-out")}
                      className="scm-row-btn"
                      style={{ marginTop: "12px" }}
                    >
                      <Plus size={14} /> Issue Material Outward
                    </button>
                  </div>
                ) : (
                  <table className="scm-table">
                    <thead>
                      <tr>
                        <th>Issue Number</th>
                        <th>Product / Item</th>
                        <th>Quantity Issued</th>
                        <th>Purpose</th>
                        <th>Issued To</th>
                        <th>Issued Date</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMaterialOuts.slice(0, 8).map((out) => (
                        <tr key={out.id || out.issueNumber}>
                          <td style={{ fontWeight: 600, color: "#111827" }}>
                            {out.issueNumber || out.outwardNumber || `OUT-${out.id}`}
                          </td>
                          <td style={{ fontWeight: 500 }}>
                            {out.productName || out.product?.name || "General Material"}
                          </td>
                          <td>
                            <span style={{ fontWeight: 600, color: "#7C3AED" }}>{out.quantity || 1}</span> units
                          </td>
                          <td>
                            <span className="scm-card-badge badge-neutral">
                              {out.purpose || "Production Assembly"}
                            </span>
                          </td>
                          <td style={{ color: "#334155" }}>
                            {out.issuedTo || "Assembly Line"}
                          </td>
                          <td style={{ color: "#64748B" }}>
                            {out.issuedDate || (out.createdAt ? new Date(out.createdAt).toLocaleDateString() : "—")}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              onClick={() => navigate("/dashboard/material-out")}
                              className="scm-row-btn"
                            >
                              <Eye size={13} /> View Issue
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}

              {/* ----------------- TAB: STOCK WATCH ----------------- */}
              {activeTab === "stock" && (
                filteredStocks.length === 0 ? (
                  <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
                    <Boxes size={32} style={{ margin: "0 auto 8px", display: "block", color: "#CBD5E1" }} />
                    <p style={{ margin: 0, fontWeight: 500 }}>No Inventory Stock records found.</p>
                    <button
                      onClick={() => navigate("/dashboard/inventory-stock")}
                      className="scm-row-btn"
                      style={{ marginTop: "12px" }}
                    >
                      <Plus size={14} /> Open Inventory Stock
                    </button>
                  </div>
                ) : (
                  <table className="scm-table">
                    <thead>
                      <tr>
                        <th>Product / Item</th>
                        <th>Category</th>
                        <th>Model Number</th>
                        <th>Available Stock</th>
                        <th>Stock Health</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStocks.slice(0, 8).map((stk) => {
                        const qty = Number(stk.availableQuantity !== undefined ? stk.availableQuantity : stk.quantity || 0);
                        const min = Number(stk.minThreshold || stk.lowStockThreshold || 5);
                        const isOut = qty === 0;
                        const isLow = qty > 0 && qty <= min;

                        return (
                          <tr key={stk.id || stk.product?.id || stk.productName}>
                            <td style={{ fontWeight: 600, color: "#111827" }}>
                              {stk.product?.name || stk.productName || `Product #${stk.id}`}
                            </td>
                            <td style={{ color: "#64748B" }}>
                              {stk.product?.category || stk.category || "EV Battery"}
                            </td>
                            <td style={{ fontFamily: "monospace", color: "#475569" }}>
                              {stk.product?.modelNumber || stk.modelNumber || "—"}
                            </td>
                            <td style={{ fontWeight: 700, fontSize: "14px" }}>
                              {qty} units
                            </td>
                            <td>
                              <span
                                className={`scm-card-badge ${
                                  isOut ? "badge-alert" : isLow ? "badge-draft" : "badge-completed"
                                }`}
                              >
                                {isOut ? "OUT OF STOCK" : isLow ? "LOW STOCK" : "IN STOCK"}
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <button
                                onClick={() => navigate("/dashboard/inventory-stock")}
                                className="scm-row-btn"
                              >
                                <Eye size={13} /> Stock Level
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )
              )}

              {/* ----------------- TAB: SCM QUEUE ----------------- */}
              {activeTab === "scm_queue" && (
                filteredScmOrders.length === 0 ? (
                  <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
                    <Truck size={32} style={{ margin: "0 auto 8px", display: "block", color: "#CBD5E1" }} />
                    <p style={{ margin: 0, fontWeight: 500 }}>No SCM logistics orders found.</p>
                    <button
                      onClick={() => navigate("/dashboard/orders")}
                      className="scm-row-btn"
                      style={{ marginTop: "12px" }}
                    >
                      <Eye size={14} /> View All Orders
                    </button>
                  </div>
                ) : (
                  <table className="scm-table">
                    <thead>
                      <tr>
                        <th>Order Number</th>
                        <th>Units</th>
                        <th>Invoice Number</th>
                        <th>Barcode / Range</th>
                        <th>Courier</th>
                        <th>SCM Status</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredScmOrders.slice(0, 8).map((order) => {
                        const startB = order.startBarcode || (Array.isArray(order.barcodes) ? order.barcodes[0] : "") || order.barcode || "—";
                        const endB = order.endBarcode || (Array.isArray(order.barcodes) ? order.barcodes[order.barcodes.length - 1] : "") || "";
                        const barcodeDisplay = endB && startB !== endB ? `${startB} - ${endB}` : startB;
                        const isDispatched = order.orderStatus === "dispatched";
                        const isDone = order.orderStatus === "scm_complete";

                        return (
                          <tr key={order.id || order.orderNumber}>
                            <td style={{ fontWeight: 600, color: "#111827" }}>
                              {order.orderNumber}
                            </td>
                            <td>
                              {Array.isArray(order.orderItems) && order.orderItems.length > 0
                                ? `${order.orderItems.reduce((s, it) => s + (Number(it.quantity) || 0), 0)} units`
                                : `${order.quantity || 1} units`}
                            </td>
                            <td style={{ fontWeight: 500 }}>
                              {order.invoiceNumber || "—"}
                            </td>
                            <td style={{ fontFamily: "monospace", color: "#1D4ED8", fontSize: "12px" }}>
                              {barcodeDisplay}
                            </td>
                            <td style={{ color: "#475569" }}>
                              {order.courierName || "—"}
                            </td>
                            <td>
                              <span
                                className={`scm-card-badge ${
                                  isDispatched ? "badge-approved" : isDone ? "badge-completed" : "badge-draft"
                                }`}
                              >
                                {(order.orderStatus || "production_complete").replace("_", " ").toUpperCase()}
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <button
                                onClick={() => navigate("/dashboard/orders")}
                                className="scm-row-btn"
                              >
                                {isDone ? "Dispatch" : "Fill SCM"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )
              )}

              {/* ----------------- TAB: VENDORS DIRECTORY ----------------- */}
              {activeTab === "vendors" && (
                filteredVendors.length === 0 ? (
                  <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
                    <Building2 size={32} style={{ margin: "0 auto 8px", display: "block", color: "#CBD5E1" }} />
                    <p style={{ margin: 0, fontWeight: 500 }}>No Vendors found matching criteria.</p>
                    <button
                      onClick={() => navigate("/dashboard/vendors")}
                      className="scm-row-btn"
                      style={{ marginTop: "12px" }}
                    >
                      <Plus size={14} /> Add New Vendor
                    </button>
                  </div>
                ) : (
                  <table className="scm-table">
                    <thead>
                      <tr>
                        <th>Vendor Name</th>
                        <th>GST Number</th>
                        <th>Contact Person</th>
                        <th>Contact Number</th>
                        <th>Address / City</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVendors.slice(0, 8).map((v) => (
                        <tr key={v.id || v.name}>
                          <td style={{ fontWeight: 600, color: "#111827" }}>
                            {v.name}
                          </td>
                          <td style={{ fontFamily: "monospace", color: "#0F766E", fontWeight: 600 }}>
                            {v.gstNumber || "Unregistered"}
                          </td>
                          <td style={{ color: "#334155" }}>
                            {v.contactPerson || "—"}
                          </td>
                          <td style={{ color: "#64748B" }}>
                            {v.contactNumber || "—"}
                          </td>
                          <td style={{ color: "#64748B", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {v.address || "—"}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              onClick={() => navigate("/dashboard/vendors")}
                              className="scm-row-btn"
                            >
                              <Eye size={13} /> View Vendor
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}
            </>
          )}
        </div>

        {/* Footer info bar */}
        <div style={{
          padding: "12px 20px",
          background: "#F8FAFC",
          borderTop: "1px solid #E2E8F0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "12px",
          color: "#64748B"
        }}>
          <div>
            Showing up to 8 recent entries per module. Click module actions for comprehensive logs.
          </div>
          <button
            onClick={() => {
              if (activeTab === "po") navigate("/dashboard/purchase-orders");
              else if (activeTab === "material_in") navigate("/dashboard/material-in");
              else if (activeTab === "material_out") navigate("/dashboard/material-out");
              else if (activeTab === "stock") navigate("/dashboard/inventory-stock");
              else if (activeTab === "scm_queue") navigate("/dashboard/orders");
              else navigate("/dashboard/vendors");
            }}
            style={{
              background: "none",
              border: "none",
              color: "#0F766E",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontFamily: "'Lexend', sans-serif"
            }}
          >
            Open Full {activeTab.replace("_", " ").toUpperCase()} Page <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
