import React, { useState, useEffect, useMemo, useCallback } from "react";
import { inventoryService } from "../../services/inventoryService";
import { procurementService } from "../../services/procurementService";
import { productService } from "../../services/productService";
import { Toast } from "../../components/common/Toast";
import { getExportMetadataHeader, getPdfWatermarkHtml, getExportWatermark } from "../../utils/watermark";
import {
  FileText,
  Download,
  Search,
  RefreshCw,
  Filter,
  Calendar,
  Building2,
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  FileCheck2,
  X,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Printer
} from "lucide-react";

export default function MaterialReports() {
  // Active Tab: 'material_in' | 'material_out' | 'stock' | 'vendors' | 'purchase_orders'
  const [activeTab, setActiveTab] = useState("material_in");

  // Primary Datasets
  const [materialIns, setMaterialIns] = useState([]);
  const [materialOuts, setMaterialOuts] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [products, setProducts] = useState([]);

  // UI States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedVendorFilter, setSelectedVendorFilter] = useState("All");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("All");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("All");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Fetch all datasets in parallel
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [matInData, matOutData, stockData, vendorData, poData, prodData] = await Promise.all([
        inventoryService.getAllMaterialIn().catch(() => []),
        inventoryService.getAllMaterialOut().catch(() => []),
        inventoryService.getAllStock().catch(() => []),
        procurementService.getAllVendors().catch(() => []),
        procurementService.getAllPurchaseOrders().catch(() => []),
        productService.getActiveProducts().catch(() => [])
      ]);

      setMaterialIns(Array.isArray(matInData) ? matInData : matInData?.data || []);
      setMaterialOuts(Array.isArray(matOutData) ? matOutData : matOutData?.data || []);
      setStocks(Array.isArray(stockData) ? stockData : stockData?.data || []);

      const parsedVendors = Array.isArray(vendorData)
        ? vendorData
        : Array.isArray(vendorData?.data)
          ? vendorData.data
          : Array.isArray(vendorData?.vendors)
            ? vendorData.vendors
            : [];
      setVendors(parsedVendors);

      const parsedPOs = Array.isArray(poData)
        ? poData
        : Array.isArray(poData?.data)
          ? poData.data
          : Array.isArray(poData?.content)
            ? poData.content
            : Array.isArray(poData?.purchaseOrders)
              ? poData.purchaseOrders
              : [];
      setPurchaseOrders(parsedPOs);

      const parsedProds = Array.isArray(prodData)
        ? prodData
        : Array.isArray(prodData?.data)
          ? prodData.data
          : Array.isArray(prodData?.products)
            ? prodData.products
            : [];
      setProducts(parsedProds);
    } catch (err) {
      console.error("Error loading Material Reports data:", err);
      setError(err.message || "Failed to load Material Reports data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Reset pagination when active tab or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, startDate, endDate, selectedVendorFilter, selectedCategoryFilter, selectedStatusFilter]);

  // Available unique categories
  const allCategories = useMemo(() => {
    const cats = new Set(["All"]);
    products.forEach((p) => p.category && cats.add(p.category));
    stocks.forEach((s) => s.product?.category && cats.add(s.product.category));
    return Array.from(cats);
  }, [products, stocks]);

  // Helper date checker
  const isWithinDateRange = (itemDateStr) => {
    if (!startDate && !endDate) return true;
    if (!itemDateStr) return false;
    const itemDate = new Date(itemDateStr).getTime();
    if (isNaN(itemDate)) return true;

    if (startDate) {
      const start = new Date(startDate).setHours(0, 0, 0, 0);
      if (itemDate < start) return false;
    }
    if (endDate) {
      const end = new Date(endDate).setHours(23, 59, 59, 999);
      if (itemDate > end) return false;
    }
    return true;
  };

  // Helper note parser
  const parseNotesField = (notesStr) => {
    if (!notesStr || typeof notesStr !== "string") return {};
    const parsed = {};
    if (notesStr.includes("|")) {
      const parts = notesStr.split("|").map((p) => p.trim());
      parts.forEach((part) => {
        if (part.toLowerCase().startsWith("invoice date:")) {
          parsed.invoiceDate = part.replace(/invoice date:/i, "").trim();
        } else if (part.toLowerCase().startsWith("serial no:") || part.toLowerCase().startsWith("serial number:")) {
          parsed.serialNumber = part.replace(/serial (no|number):/i, "").trim();
        } else if (part.toLowerCase().startsWith("subtotal:")) {
          parsed.subtotal = part.replace(/subtotal:/i, "").trim();
        } else if (part.toLowerCase().startsWith("tax")) {
          parsed.tax = part;
        } else if (part.toLowerCase().startsWith("total:") || part.toLowerCase().startsWith("total amount:")) {
          parsed.total = part.replace(/total( amount)?:/i, "").trim();
        } else if (part.toLowerCase().startsWith("remarks:")) {
          parsed.remarks = part.replace(/remarks:/i, "").trim();
        }
      });
    }
    return parsed;
  };

  // 1. Filtered Material IN Report
  const filteredMaterialIns = useMemo(() => {
    return materialIns.filter((m) => {
      const q = searchQuery.toLowerCase().trim();
      const matchedPO = purchaseOrders.find((p) => String(p.id) === String(m.purchaseOrderId) || p.poNumber === m.poNumber);
      const vName = matchedPO?.vendor?.name || matchedPO?.vendor?.companyName || "";

      if (q) {
        const matchesQ =
          (m.receiptNumber && m.receiptNumber.toLowerCase().includes(q)) ||
          (m.poNumber && m.poNumber.toLowerCase().includes(q)) ||
          (m.vendorInvoiceNumber && m.vendorInvoiceNumber.toLowerCase().includes(q)) ||
          (m.receivedByEmail && m.receivedByEmail.toLowerCase().includes(q)) ||
          (vName && vName.toLowerCase().includes(q)) ||
          (m.notes && m.notes.toLowerCase().includes(q));
        if (!matchesQ) return false;
      }

      if (selectedVendorFilter !== "All") {
        const vId = matchedPO?.vendor?.id ?? matchedPO?.vendorId;
        if (String(vId) !== String(selectedVendorFilter)) return false;
      }

      const recordDate = m.receivedDate || m.createdAt;
      if (!isWithinDateRange(recordDate)) return false;

      return true;
    });
  }, [materialIns, purchaseOrders, searchQuery, selectedVendorFilter, startDate, endDate]);

  // 2. Filtered Material OUT Report
  const filteredMaterialOuts = useMemo(() => {
    return materialOuts.filter((m) => {
      const q = searchQuery.toLowerCase().trim();
      const pName = m.product?.name || m.productName || "";
      const pCat = m.product?.category || m.category || "";

      if (q) {
        const matchesQ =
          (pName && pName.toLowerCase().includes(q)) ||
          (pCat && pCat.toLowerCase().includes(q)) ||
          (m.issuedTo && m.issuedTo.toLowerCase().includes(q)) ||
          (m.purpose && m.purpose.toLowerCase().includes(q)) ||
          (m.notes && m.notes.toLowerCase().includes(q)) ||
          (m.referenceId && m.referenceId.toLowerCase().includes(q));
        if (!matchesQ) return false;
      }

      if (selectedCategoryFilter !== "All" && pCat.toLowerCase() !== selectedCategoryFilter.toLowerCase()) {
        return false;
      }

      const recordDate = m.transactionDate || m.issueDate || m.createdAt;
      if (!isWithinDateRange(recordDate)) return false;

      return true;
    });
  }, [materialOuts, searchQuery, selectedCategoryFilter, startDate, endDate]);

  // 3. Filtered Inventory Stock Report
  const filteredStocks = useMemo(() => {
    return stocks.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const p = s.product || {};
      const pName = p.name || p.productName || "";
      const pCat = p.category || "";
      const pModel = p.modelNumber || "";

      if (q) {
        const matchesQ =
          pName.toLowerCase().includes(q) ||
          pCat.toLowerCase().includes(q) ||
          pModel.toLowerCase().includes(q);
        if (!matchesQ) return false;
      }

      if (selectedCategoryFilter !== "All" && pCat.toLowerCase() !== selectedCategoryFilter.toLowerCase()) {
        return false;
      }

      if (selectedStatusFilter !== "All") {
        const qty = s.availableQuantity || s.quantity || 0;
        if (selectedStatusFilter === "In Stock" && qty <= 0) return false;
        if (selectedStatusFilter === "Low Stock" && (qty <= 0 || qty > 10)) return false;
        if (selectedStatusFilter === "Out of Stock" && qty > 0) return false;
      }

      return true;
    });
  }, [stocks, searchQuery, selectedCategoryFilter, selectedStatusFilter]);

  // 4. Filtered Vendor Report
  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      const q = searchQuery.toLowerCase().trim();
      const name = v.name || v.companyName || "";
      const gst = v.gstNumber || "";
      const contact = v.contactPerson || "";
      const email = v.email || "";

      if (q) {
        const matchesQ =
          name.toLowerCase().includes(q) ||
          gst.toLowerCase().includes(q) ||
          contact.toLowerCase().includes(q) ||
          email.toLowerCase().includes(q);
        if (!matchesQ) return false;
      }

      if (selectedStatusFilter !== "All") {
        const isActive = v.active !== false;
        if (selectedStatusFilter === "Active" && !isActive) return false;
        if (selectedStatusFilter === "Inactive" && isActive) return false;
      }

      return true;
    });
  }, [vendors, searchQuery, selectedStatusFilter]);

  // 5. Filtered Purchase Order Report
  const filteredPurchaseOrders = useMemo(() => {
    return purchaseOrders.filter((po) => {
      const q = searchQuery.toLowerCase().trim();
      const poNum = po.poNumber || `PO #${po.id}`;
      const vName = po.vendor?.name || po.vendor?.companyName || "";

      if (q) {
        const matchesQ =
          poNum.toLowerCase().includes(q) ||
          vName.toLowerCase().includes(q) ||
          (po.createdByEmail && po.createdByEmail.toLowerCase().includes(q));
        if (!matchesQ) return false;
      }

      if (selectedVendorFilter !== "All") {
        const vId = po.vendor?.id ?? po.vendorId;
        if (String(vId) !== String(selectedVendorFilter)) return false;
      }

      if (selectedStatusFilter !== "All") {
        const s = String(po.status || "").toUpperCase();
        if (s !== selectedStatusFilter.toUpperCase()) return false;
      }

      const recordDate = po.createdAt || po.expectedDeliveryDate;
      if (!isWithinDateRange(recordDate)) return false;

      return true;
    });
  }, [purchaseOrders, searchQuery, selectedVendorFilter, selectedStatusFilter, startDate, endDate]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
    setSelectedVendorFilter("All");
    setSelectedCategoryFilter("All");
    setSelectedStatusFilter("All");
  };

  // CSV Generation and Download Utility
  const downloadCurrentReport = () => {
    let headers = [];
    let rows = [];
    let filename = `material_${activeTab}_report_${new Date().toISOString().split("T")[0]}`;

    const metaLine = getExportMetadataHeader();

    if (activeTab === "material_in") {
      filename = `material_in_receipts_report_${new Date().toISOString().split("T")[0]}`;
      headers = [
        "Receipt Number",
        "Purchase Order",
        "Vendor Name",
        "Invoice Number",
        "Invoice Date",
        "Received Date",
        "Received By",
        "Subtotal",
        "Tax",
        "Total Amount",
        "Notes & Remarks"
      ];
      rows = filteredMaterialIns.map((m) => {
        const matchedPO = purchaseOrders.find((p) => String(p.id) === String(m.purchaseOrderId) || p.poNumber === m.poNumber);
        const vName = matchedPO?.vendor?.name || matchedPO?.vendor?.companyName || "Not Available";
        const parsed = parseNotesField(m.notes);
        return [
          `"${m.receiptNumber || ""}"`,
          `"${m.poNumber || `PO #${m.purchaseOrderId}`}"`,
          `"${vName}"`,
          `"${m.vendorInvoiceNumber || "Not Available"}"`,
          `"${parsed.invoiceDate || "Not Available"}"`,
          `"${m.receivedDate ? String(m.receivedDate) : m.createdAt ? new Date(m.createdAt).toLocaleDateString() : "Not Available"}"`,
          `"${m.receivedByEmail || "SCM Admin"}"`,
          `"${parsed.subtotal || "Not Available"}"`,
          `"${parsed.tax || "Not Available"}"`,
          `"${parsed.total || "Not Available"}"`,
          `"${(m.notes || "").replace(/"/g, '""')}"`
        ];
      });
    } else if (activeTab === "material_out") {
      filename = `material_out_issuances_report_${new Date().toISOString().split("T")[0]}`;
      headers = [
        "Transaction / Out ID",
        "Product Name",
        "Category",
        "Quantity Issued",
        "Purpose / Reason",
        "Issued To",
        "Issuance Date",
        "Created By",
        "Notes"
      ];
      rows = filteredMaterialOuts.map((m) => {
        const p = m.product || {};
        return [
          `"${m.referenceId || m.id || ""}"`,
          `"${p.name || m.productName || "Not Available"}"`,
          `"${p.category || m.category || "General"}"`,
          `"${m.quantity || 0}"`,
          `"${m.purpose || "Production"}"`,
          `"${m.issuedTo || "Not Available"}"`,
          `"${m.transactionDate ? String(m.transactionDate) : m.createdAt ? new Date(m.createdAt).toLocaleDateString() : "Not Available"}"`,
          `"${m.createdByEmail || "SCM Admin"}"`,
          `"${(m.notes || "").replace(/"/g, '""')}"`
        ];
      });
    } else if (activeTab === "stock") {
      filename = `inventory_stock_report_${new Date().toISOString().split("T")[0]}`;
      headers = [
        "Product ID",
        "Product Name",
        "Category",
        "Model Number",
        "Brand",
        "Available Stock Qty",
        "Total Inward Qty",
        "Total Outward Qty",
        "Stock Status",
        "Last Updated"
      ];
      rows = filteredStocks.map((s) => {
        const p = s.product || {};
        const avail = s.availableQuantity || s.quantity || 0;
        const status = avail <= 0 ? "Out of Stock" : avail <= 10 ? "Low Stock" : "In Stock";
        return [
          `"${p.id || s.id || ""}"`,
          `"${p.name || "Not Available"}"`,
          `"${p.category || "General"}"`,
          `"${p.modelNumber || "Not Available"}"`,
          `"${p.brand || "Not Available"}"`,
          `"${avail}"`,
          `"${s.totalInwardQuantity || s.inQuantity || "Not Available"}"`,
          `"${s.totalOutwardQuantity || s.outQuantity || "Not Available"}"`,
          `"${status}"`,
          `"${s.updatedAt ? new Date(s.updatedAt).toLocaleDateString() : "Not Available"}"`
        ];
      });
    } else if (activeTab === "vendors") {
      filename = `procurement_vendors_report_${new Date().toISOString().split("T")[0]}`;
      headers = [
        "Vendor ID",
        "Vendor / Company Name",
        "GSTIN Number",
        "Contact Person",
        "Contact Number",
        "Email Address",
        "Address",
        "Payment Terms",
        "Bank Details",
        "Status",
        "Total POs",
        "Registered Date"
      ];
      rows = filteredVendors.map((v) => {
        const vendorPOs = purchaseOrders.filter((p) => String(p.vendor?.id ?? p.vendorId) === String(v.id));
        return [
          `"${v.id || ""}"`,
          `"${v.name || v.companyName || "Not Available"}"`,
          `"${v.gstNumber || "Not Available"}"`,
          `"${v.contactPerson || "Not Available"}"`,
          `"${v.contactNumber || "Not Available"}"`,
          `"${v.email || "Not Available"}"`,
          `"${(v.address || "").replace(/"/g, '""')}"`,
          `"${v.paymentTerms || "Not Available"}"`,
          `"${v.bankDetails || "Not Available"}"`,
          `"${v.active !== false ? "Active" : "Inactive"}"`,
          `"${vendorPOs.length}"`,
          `"${v.createdAt ? new Date(v.createdAt).toLocaleDateString() : "Not Available"}"`
        ];
      });
    } else if (activeTab === "purchase_orders") {
      filename = `purchase_orders_report_${new Date().toISOString().split("T")[0]}`;
      headers = [
        "PO Number",
        "Vendor Name",
        "Status",
        "Total Ordered Qty",
        "Total Received Qty",
        "Remaining Qty",
        "Expected Delivery Date",
        "Delivery Location",
        "Total PO Amount",
        "Created By",
        "Created Date"
      ];
      rows = filteredPurchaseOrders.map((po) => {
        const vName = po.vendor?.name || po.vendor?.companyName || "Not Available";
        const items = Array.isArray(po.items) ? po.items : [];
        let ordQty = 0;
        let recQty = 0;
        items.forEach((it) => {
          ordQty += Number(it.quantity) || 0;
          recQty += Number(it.receivedQuantity) || 0;
        });
        const remQty = Math.max(0, ordQty - recQty);
        const poAmt = po.totalAmount || po.netAmount ? `₹${Number(po.totalAmount || po.netAmount).toLocaleString("en-IN")}` : "Not Available";

        return [
          `"${po.poNumber || `PO #${po.id}`}"`,
          `"${vName}"`,
          `"${po.status || "Approved"}"`,
          `"${ordQty}"`,
          `"${recQty}"`,
          `"${remQty}"`,
          `"${po.expectedDeliveryDate ? String(po.expectedDeliveryDate) : "Not Available"}"`,
          `"${po.deliveryLocation || "Warehouse Main"}"`,
          `"${poAmt}"`,
          `"${po.createdByEmail || "SCM Admin"}"`,
          `"${po.createdAt ? new Date(po.createdAt).toLocaleDateString() : "Not Available"}"`
        ];
      });
    }

    if (rows.length === 0) {
      showToast("No records available to download with current filters", "error");
      return;
    }

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      `# ${metaLine}\n` +
      headers.join(",") +
      "\n" +
      rows.map((r) => r.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Report "${filename}.csv" downloaded successfully (${rows.length} records)!`, "success");
  };

  // PDF Generation and Print/Download Utility
  const downloadPdfReport = () => {
    let reportTitle = "";
    let reportType = "";
    let tableHeaders = [];
    let tableRowsHtml = "";
    let recordCount = 0;

    const watermarkUser = getExportWatermark();
    const generatedDateStr = new Date().toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });

    if (activeTab === "material_in") {
      reportTitle = "Material Inward Receipts Report";
      reportType = "Material IN Report";
      recordCount = filteredMaterialIns.length;
      tableHeaders = [
        "Receipt #",
        "Purchase Order",
        "Vendor Name",
        "Invoice #",
        "Invoice Date",
        "Received Date",
        "Inward Total",
        "Received By",
        "Notes & Remarks"
      ];
      tableRowsHtml = filteredMaterialIns.map((m) => {
        const matchedPO = purchaseOrders.find((p) => String(p.id) === String(m.purchaseOrderId) || p.poNumber === m.poNumber);
        const vName = matchedPO?.vendor?.name || matchedPO?.vendor?.companyName || "Not Available";
        const parsed = parseNotesField(m.notes);
        const recDate = m.receivedDate ? String(m.receivedDate) : m.createdAt ? new Date(m.createdAt).toLocaleDateString("en-IN") : "Not Available";
        return `
          <tr>
            <td style="font-weight: 700; color: #0F172A;">${m.receiptNumber || ""}</td>
            <td style="font-weight: 600; color: #2563EB;">${m.poNumber || `PO #${m.purchaseOrderId}`}</td>
            <td style="font-weight: 500;">${vName}</td>
            <td style="font-family: monospace;">${m.vendorInvoiceNumber || "—"}</td>
            <td>${parsed.invoiceDate || "—"}</td>
            <td>${recDate}</td>
            <td style="font-weight: 700; color: #059669;">${parsed.total || "On File"}</td>
            <td style="color: #475569;">${m.receivedByEmail || "SCM Admin"}</td>
            <td style="color: #64748B;">${parsed.remarks || m.notes || "—"}</td>
          </tr>
        `;
      }).join("");
    } else if (activeTab === "material_out") {
      reportTitle = "Material Outward Issuances Report";
      reportType = "Material OUT Report";
      recordCount = filteredMaterialOuts.length;
      tableHeaders = [
        "Outward Ref #",
        "Product Name",
        "Category",
        "Qty Issued",
        "Purpose / Reason",
        "Issued To",
        "Issuance Date",
        "Handled By",
        "Notes"
      ];
      tableRowsHtml = filteredMaterialOuts.map((m) => {
        const p = m.product || {};
        const dateStr = m.transactionDate ? String(m.transactionDate) : m.createdAt ? new Date(m.createdAt).toLocaleDateString("en-IN") : "—";
        return `
          <tr>
            <td style="font-weight: 700; color: #0F172A;">${m.referenceId || `OUT-${m.id}`}</td>
            <td style="font-weight: 600;">${p.name || m.productName || "Product Item"}</td>
            <td>${p.category || m.category || "General"}</td>
            <td style="text-align: center; font-weight: 700; color: #2563EB;">${m.quantity || 1}</td>
            <td>${m.purpose || "Production Assembly"}</td>
            <td style="font-weight: 500;">${m.issuedTo || "—"}</td>
            <td>${dateStr}</td>
            <td style="color: #475569;">${m.createdByEmail || "SCM Admin"}</td>
            <td style="color: #64748B;">${m.notes || "—"}</td>
          </tr>
        `;
      }).join("");
    } else if (activeTab === "stock") {
      reportTitle = "Inventory Live Stock Ledger Report";
      reportType = "Inventory Stock Report";
      recordCount = filteredStocks.length;
      tableHeaders = [
        "Product Details",
        "Category",
        "Model # / Brand",
        "Available Stock",
        "Total Inwarded",
        "Total Issued",
        "Stock Status",
        "Last Updated"
      ];
      tableRowsHtml = filteredStocks.map((s) => {
        const p = s.product || {};
        const avail = s.availableQuantity || s.quantity || 0;
        const status = avail <= 0 ? "Out of Stock" : avail <= 10 ? "Low Stock" : "In Stock";
        const statusColor = avail <= 0 ? "#DC2626" : avail <= 10 ? "#D97706" : "#059669";
        const updatedStr = s.updatedAt ? new Date(s.updatedAt).toLocaleDateString("en-IN") : "Active";
        return `
          <tr>
            <td style="font-weight: 600; color: #0F172A;">
              ${p.name || "Product Item"}
              ${p.specString ? `<div style="font-size: 9.5px; color: #64748B;">${p.specString}</div>` : ""}
            </td>
            <td>${p.category || "General"}</td>
            <td>${p.modelNumber ? `Model: ${p.modelNumber}` : "—"} ${p.brand ? `• ${p.brand}` : ""}</td>
            <td style="text-align: center; font-weight: 700; color: ${statusColor}; font-size: 12px;">${avail}</td>
            <td style="text-align: center; color: #2563EB; font-weight: 600;">${s.totalInwardQuantity || s.inQuantity || "—"}</td>
            <td style="text-align: center; color: #D97706; font-weight: 600;">${s.totalOutwardQuantity || s.outQuantity || "—"}</td>
            <td><span style="font-weight: 700; color: ${statusColor};">${status}</span></td>
            <td style="color: #64748B;">${updatedStr}</td>
          </tr>
        `;
      }).join("");
    } else if (activeTab === "vendors") {
      reportTitle = "Procurement Vendors & Suppliers Report";
      reportType = "Vendor Accounts Report";
      recordCount = filteredVendors.length;
      tableHeaders = [
        "Vendor Name",
        "GSTIN Number",
        "Contact Person",
        "Contact Phone",
        "Email Address",
        "Payment Terms",
        "Total POs",
        "Status",
        "Registered Date"
      ];
      tableRowsHtml = filteredVendors.map((v) => {
        const vendorPOs = purchaseOrders.filter((p) => String(p.vendor?.id ?? p.vendorId) === String(v.id));
        const createdStr = v.createdAt ? new Date(v.createdAt).toLocaleDateString("en-IN") : "—";
        return `
          <tr>
            <td style="font-weight: 700; color: #0F172A;">${v.name || v.companyName || "Vendor"}</td>
            <td style="font-family: monospace; font-weight: 600;">${v.gstNumber || "—"}</td>
            <td>${v.contactPerson || "—"}</td>
            <td>${v.contactNumber || "—"}</td>
            <td style="color: #2563EB;">${v.email || "—"}</td>
            <td>${v.paymentTerms || "Standard Net 30"}</td>
            <td style="text-align: center; font-weight: 700;">${vendorPOs.length}</td>
            <td><span style="font-weight: 700; color: ${v.active !== false ? "#059669" : "#64748B"};">${v.active !== false ? "Active" : "Inactive"}</span></td>
            <td style="color: #64748B;">${createdStr}</td>
          </tr>
        `;
      }).join("");
    } else if (activeTab === "purchase_orders") {
      reportTitle = "Purchase Orders Status & Fulfillment Report";
      reportType = "Purchase Order Report";
      recordCount = filteredPurchaseOrders.length;
      tableHeaders = [
        "PO Number",
        "Vendor Name",
        "PO Status",
        "Ordered Qty",
        "Received Qty",
        "Remaining Qty",
        "Expected Delivery",
        "Delivery Location",
        "Total Amount",
        "Created Date"
      ];
      tableRowsHtml = filteredPurchaseOrders.map((po) => {
        const vName = po.vendor?.name || po.vendor?.companyName || "Not Available";
        const items = Array.isArray(po.items) ? po.items : [];
        let ordQty = 0;
        let recQty = 0;
        items.forEach((it) => {
          ordQty += Number(it.quantity) || 0;
          recQty += Number(it.receivedQuantity) || 0;
        });
        const remQty = Math.max(0, ordQty - recQty);
        const poAmt = po.totalAmount || po.netAmount ? `₹${Number(po.totalAmount || po.netAmount).toLocaleString("en-IN")}` : "—";
        const s = String(po.status || "APPROVED").toUpperCase();
        const statusColor = s === "APPROVED" ? "#059669" : s === "PARTIALLY_FULFILLED" ? "#D97706" : s === "FULFILLED" ? "#2563EB" : "#475569";
        const createdStr = po.createdAt ? new Date(po.createdAt).toLocaleDateString("en-IN") : "—";
        return `
          <tr>
            <td style="font-weight: 700; color: #2563EB;">${po.poNumber || `PO #${po.id}`}</td>
            <td style="font-weight: 600;">${vName}</td>
            <td><span style="font-weight: 700; color: ${statusColor};">${po.status || "Approved"}</span></td>
            <td style="text-align: center; font-weight: 600;">${ordQty}</td>
            <td style="text-align: center; color: #059669; font-weight: 600;">${recQty}</td>
            <td style="text-align: center; color: ${remQty > 0 ? "#D97706" : "#64748B"}; font-weight: 600;">${remQty}</td>
            <td>${po.expectedDeliveryDate ? String(po.expectedDeliveryDate) : "—"}</td>
            <td>${po.deliveryLocation || "Warehouse Main"}</td>
            <td style="font-weight: 700; color: #0F172A;">${poAmt}</td>
            <td style="color: #64748B;">${createdStr}</td>
          </tr>
        `;
      }).join("");
    }

    if (recordCount === 0) {
      showToast("No records available to generate PDF with current filters", "error");
      return;
    }

    // Applied Filter Summary
    const filterTags = [];
    if (searchQuery.trim()) filterTags.push(`<strong>Search:</strong> "${searchQuery.trim()}"`);
    if (startDate || endDate) filterTags.push(`<strong>Date Range:</strong> ${startDate || "Any"} to ${endDate || "Present"}`);
    if (selectedVendorFilter !== "All") {
      const vObj = vendors.find((v) => String(v.id) === String(selectedVendorFilter));
      filterTags.push(`<strong>Vendor:</strong> ${vObj?.name || vObj?.companyName || selectedVendorFilter}`);
    }
    if (selectedCategoryFilter !== "All") filterTags.push(`<strong>Category:</strong> ${selectedCategoryFilter}`);
    if (selectedStatusFilter !== "All") filterTags.push(`<strong>Status:</strong> ${selectedStatusFilter}`);

    const filterSummaryHtml = filterTags.length > 0
      ? filterTags.join(" &nbsp;|&nbsp; ")
      : "All Records (No active filters applied)";

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to preview and download the PDF report.");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportTitle} - Bentork Admin</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 10mm 10mm 12mm 10mm;
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              color: #0F172A;
              margin: 0;
              padding: 16px;
              background: #FFFFFF;
              font-size: 11px;
              line-height: 1.4;
            }
            ${getPdfWatermarkHtml()}
            .pdf-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #0F172A;
              padding-bottom: 12px;
              margin-bottom: 12px;
            }
            .brand-name {
              font-size: 22px;
              font-weight: 800;
              color: #0F172A;
              letter-spacing: 0.5px;
            }
            .brand-sub {
              font-size: 11.5px;
              color: #475569;
              font-weight: 600;
            }
            .brand-details {
              font-size: 10px;
              color: #64748B;
              margin-top: 2px;
            }
            .report-badge-box {
              text-align: right;
            }
            .report-type-badge {
              background: #0F172A;
              color: #FFFFFF;
              padding: 5px 12px;
              font-size: 12px;
              font-weight: 700;
              border-radius: 4px;
              display: inline-block;
              letter-spacing: 0.5px;
              text-transform: uppercase;
            }
            .report-meta {
              font-size: 10.5px;
              color: #475569;
              margin-top: 6px;
              line-height: 1.45;
            }
            .filter-summary-card {
              background: #F8FAFC;
              border: 1px solid #E2E8F0;
              padding: 8px 12px;
              border-radius: 6px;
              margin-bottom: 12px;
              font-size: 11px;
              color: #334155;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 10.5px;
            }
            thead {
              display: table-header-group;
            }
            tr {
              page-break-inside: avoid;
            }
            th {
              background: #F1F5F9;
              color: #1E293B;
              font-weight: 700;
              padding: 8px 8px;
              border: 1px solid #CBD5E1;
              text-align: left;
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.3px;
            }
            td {
              padding: 7px 8px;
              border: 1px solid #E2E8F0;
              color: #334155;
              vertical-align: middle;
            }
            tbody tr:nth-child(even) {
              background: #F8FAFC;
            }
            .footer-info {
              margin-top: 18px;
              padding-top: 8px;
              border-top: 1px solid #CBD5E1;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 10px;
              color: #64748B;
            }
            .no-print {
              margin-bottom: 14px;
              display: flex;
              justify-content: flex-end;
              gap: 10px;
            }
            .btn-print {
              background: #10B981;
              color: #FFFFFF;
              border: none;
              padding: 8px 16px;
              font-size: 12px;
              font-weight: 700;
              border-radius: 6px;
              cursor: pointer;
            }
            @media print {
              .no-print {
                display: none !important;
              }
              body {
                padding: 0;
              }
              .watermark-overlay {
                position: fixed;
                display: block !important;
              }
            }
          </style>
        </head>
        <body>
          ${getPdfWatermarkHtml()}

          <div class="no-print">
            <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
          </div>

          <!-- PDF Header -->
          <div class="pdf-header">
            <div>
              <div class="brand-name">BENTORK LLP</div>
              <div class="brand-sub">Advanced EV Battery & Storage Systems — Admin Management System</div>
              <div class="brand-details">Supply Chain & Inventory Management Division | Confidential Official Record</div>
            </div>
            <div class="report-badge-box">
              <div class="report-type-badge">${reportType}</div>
              <div class="report-meta">
                <strong>Generated:</strong> ${generatedDateStr}<br/>
                <strong>Generated By:</strong> ${watermarkUser}<br/>
                <strong>Total Records:</strong> ${recordCount}
              </div>
            </div>
          </div>

          <!-- Applied Filters -->
          <div class="filter-summary-card">
            <strong>Applied Filters:</strong> ${filterSummaryHtml}
          </div>

          <!-- Report Data Table -->
          <table>
            <thead>
              <tr>
                ${tableHeaders.map((th) => `<th>${th}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>

          <!-- Footer Information -->
          <div class="footer-info">
            <div>
              <strong>Bentork LLP Admin Panel</strong> — Material Inventory & SCM Ledger
            </div>
            <div>
              Generated by: <strong>${watermarkUser}</strong> &nbsp;|&nbsp; Official System Export
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 400);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    showToast(`PDF generated for ${reportTitle} (${recordCount} records)`, "success");
  };

  // Get active dataset for pagination
  const currentDataset = useMemo(() => {
    switch (activeTab) {
      case "material_in":
        return filteredMaterialIns;
      case "material_out":
        return filteredMaterialOuts;
      case "stock":
        return filteredStocks;
      case "vendors":
        return filteredVendors;
      case "purchase_orders":
        return filteredPurchaseOrders;
      default:
        return [];
    }
  }, [activeTab, filteredMaterialIns, filteredMaterialOuts, filteredStocks, filteredVendors, filteredPurchaseOrders]);

  const totalPages = Math.max(1, Math.ceil(currentDataset.length / itemsPerPage));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return currentDataset.slice(start, start + itemsPerPage);
  }, [currentDataset, currentPage]);

  return (
    <div style={{ padding: "20px 24px", maxWidth: "1440px", margin: "0 auto", boxSizing: "border-box", fontFamily: "Roboto, sans-serif" }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <style>{`
        .rep-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .rep-title {
          font-size: 22px;
          font-weight: 700;
          color: #0F172A;
          margin: 0 0 4px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .rep-tabs {
          display: flex;
          gap: 8px;
          border-bottom: 1px solid #E2E8F0;
          margin-bottom: 18px;
          overflow-x: auto;
          padding-bottom: 2px;
        }
        .rep-tab-btn {
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 600;
          border: none;
          background: transparent;
          color: #64748B;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
          transition: all 0.2s;
        }
        .rep-tab-btn:hover {
          color: #0F172A;
        }
        .rep-tab-btn.active {
          color: #10B981;
          border-bottom-color: #10B981;
        }
        .rep-badge-count {
          background: #F1F5F9;
          color: #475569;
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 9999px;
          font-weight: 700;
        }
        .rep-tab-btn.active .rep-badge-count {
          background: #ECFDF5;
          color: #059669;
        }
        .rep-card-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 14px;
          margin-bottom: 18px;
        }
        .rep-stat-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .rep-stat-icon {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .rep-filter-bar {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 14px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 16px;
        }
        .rep-filter-group {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .rep-input, .rep-select {
          padding: 7px 10px;
          border-radius: 6px;
          border: 1px solid #CBD5E1;
          font-size: 12px;
          color: #0F172A;
          background: #FFFFFF;
          outline: none;
        }
        .rep-input:focus, .rep-select:focus {
          border-color: #10B981;
        }
        .rep-btn-primary {
          background: #10B981;
          color: #FFFFFF;
          border: none;
          padding: 8px 14px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: background 0.2s;
        }
        .rep-btn-primary:hover {
          background: #059669;
        }
        .rep-btn-pdf {
          background: #1E3A8A;
          color: #FFFFFF;
          border: none;
          padding: 8px 14px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: background 0.2s;
        }
        .rep-btn-pdf:hover {
          background: #1E40AF;
        }
        .rep-btn-secondary {
          background: #F8FAFC;
          color: #334155;
          border: 1px solid #CBD5E1;
          padding: 7px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .rep-btn-secondary:hover {
          background: #E2E8F0;
        }
        .rep-table-wrap {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          overflow-x: auto;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          margin-bottom: 16px;
        }
        .rep-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 13px;
        }
        .rep-table th {
          background: #F8FAFC;
          color: #475569;
          font-weight: 600;
          padding: 12px 14px;
          border-bottom: 1px solid #E2E8F0;
          white-space: nowrap;
          position: sticky;
          top: 0;
        }
        .rep-table td {
          padding: 12px 14px;
          border-bottom: 1px solid #F1F5F9;
          color: #334155;
          vertical-align: middle;
        }
        .rep-table tr:hover td {
          background: #F8FAFC;
        }
        .badge {
          display: inline-flex;
          align-items: center;
          padding: 3px 8px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 600;
        }
        .badge-success { background: #ECFDF5; color: #059669; }
        .badge-warning { background: #FEF3C7; color: #D97706; }
        .badge-info { background: #EFF6FF; color: #2563EB; }
        .badge-danger { background: #FEF2F2; color: #DC2626; }
        .badge-neutral { background: #F1F5F9; color: #475569; }
        .rep-pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 4px;
          font-size: 12px;
          color: #64748B;
        }
      `}</style>

      {/* Top Header */}
      <div className="rep-header">
        <div>
          <h1 className="rep-title">
            <FileText size={24} color="#10B981" /> Material Reports
          </h1>
          <p style={{ fontSize: "13px", color: "#64748B", margin: 0 }}>
            View and download Material Inventory reports including Inward receipts, Outward issuances, Live Stock ledger, Vendor accounts, and Purchase Orders.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <button className="rep-btn-secondary" onClick={fetchAllData} title="Refresh report datasets">
            <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh Data
          </button>
          <button className="rep-btn-pdf" onClick={downloadPdfReport} title="Download / Print PDF Report with dynamic user watermark">
            <Printer size={15} /> Download PDF
          </button>
          <button className="rep-btn-primary" onClick={downloadCurrentReport} title="Download CSV / Excel Spreadsheet">
            <Download size={15} /> Download Report (CSV)
          </button>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="rep-card-grid">
        <div className="rep-stat-card">
          <div className="rep-stat-icon" style={{ background: "#ECFDF5", color: "#059669" }}>
            <ArrowDownLeft size={20} />
          </div>
          <div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>{materialIns.length}</div>
            <div style={{ fontSize: "11px", color: "#64748B" }}>Total Inward Receipts</div>
          </div>
        </div>

        <div className="rep-stat-card">
          <div className="rep-stat-icon" style={{ background: "#EFF6FF", color: "#2563EB" }}>
            <ArrowUpRight size={20} />
          </div>
          <div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>{materialOuts.length}</div>
            <div style={{ fontSize: "11px", color: "#64748B" }}>Total Outward Issues</div>
          </div>
        </div>

        <div className="rep-stat-card">
          <div className="rep-stat-icon" style={{ background: "#F3E8FF", color: "#7C3AED" }}>
            <Boxes size={20} />
          </div>
          <div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>{stocks.length}</div>
            <div style={{ fontSize: "11px", color: "#64748B" }}>Active Stock Items</div>
          </div>
        </div>

        <div className="rep-stat-card">
          <div className="rep-stat-icon" style={{ background: "#FEF3C7", color: "#D97706" }}>
            <Building2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>{vendors.length}</div>
            <div style={{ fontSize: "11px", color: "#64748B" }}>Registered Vendors</div>
          </div>
        </div>

        <div className="rep-stat-card">
          <div className="rep-stat-icon" style={{ background: "#E0E7FF", color: "#4F46E5" }}>
            <FileCheck2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>{purchaseOrders.length}</div>
            <div style={{ fontSize: "11px", color: "#64748B" }}>Total Purchase Orders</div>
          </div>
        </div>
      </div>

      {/* Report Selection Tabs */}
      <div className="rep-tabs">
        <button
          className={`rep-tab-btn ${activeTab === "material_in" ? "active" : ""}`}
          onClick={() => setActiveTab("material_in")}
        >
          <ArrowDownLeft size={15} /> 1. Material IN Report <span className="rep-badge-count">{filteredMaterialIns.length}</span>
        </button>

        <button
          className={`rep-tab-btn ${activeTab === "material_out" ? "active" : ""}`}
          onClick={() => setActiveTab("material_out")}
        >
          <ArrowUpRight size={15} /> 2. Material OUT Report <span className="rep-badge-count">{filteredMaterialOuts.length}</span>
        </button>

        <button
          className={`rep-tab-btn ${activeTab === "stock" ? "active" : ""}`}
          onClick={() => setActiveTab("stock")}
        >
          <Boxes size={15} /> 3. Inventory Stock Report <span className="rep-badge-count">{filteredStocks.length}</span>
        </button>

        <button
          className={`rep-tab-btn ${activeTab === "vendors" ? "active" : ""}`}
          onClick={() => setActiveTab("vendors")}
        >
          <Building2 size={15} /> 4. Vendor Report <span className="rep-badge-count">{filteredVendors.length}</span>
        </button>

        <button
          className={`rep-tab-btn ${activeTab === "purchase_orders" ? "active" : ""}`}
          onClick={() => setActiveTab("purchase_orders")}
        >
          <FileCheck2 size={15} /> 5. Purchase Order Report <span className="rep-badge-count">{filteredPurchaseOrders.length}</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="rep-filter-bar">
        <div className="rep-filter-group">
          {/* Search */}
          <div style={{ display: "flex", alignItems: "center", background: "#F8FAFC", border: "1px solid #CBD5E1", borderRadius: "6px", padding: "4px 10px", width: "240px" }}>
            <Search size={14} color="#64748B" />
            <input
              type="text"
              placeholder="Search in this report..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ border: "none", background: "transparent", outline: "none", fontSize: "12px", marginLeft: "6px", width: "100%", color: "#0F172A" }}
            />
          </div>

          {/* Date Range */}
          {(activeTab === "material_in" || activeTab === "material_out" || activeTab === "purchase_orders") && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 600 }}>Date:</span>
              <input
                type="date"
                className="rep-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                title="Start Date"
              />
              <span style={{ fontSize: "11px", color: "#94A3B8" }}>to</span>
              <input
                type="date"
                className="rep-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                title="End Date"
              />
            </div>
          )}

          {/* Vendor Filter */}
          {(activeTab === "material_in" || activeTab === "purchase_orders") && (
            <select
              className="rep-select"
              value={selectedVendorFilter}
              onChange={(e) => setSelectedVendorFilter(e.target.value)}
            >
              <option value="All">All Vendors</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name || v.companyName || `Vendor #${v.id}`}
                </option>
              ))}
            </select>
          )}

          {/* Category Filter */}
          {(activeTab === "material_out" || activeTab === "stock") && (
            <select
              className="rep-select"
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            >
              {allCategories.map((c) => (
                <option key={c} value={c}>
                  {c === "All" ? "All Categories" : c}
                </option>
              ))}
            </select>
          )}

          {/* Status Filter */}
          {(activeTab === "stock" || activeTab === "vendors" || activeTab === "purchase_orders") && (
            <select
              className="rep-select"
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              {activeTab === "stock" && (
                <>
                  <option value="In Stock">In Stock</option>
                  <option value="Low Stock">Low Stock</option>
                  <option value="Out of Stock">Out of Stock</option>
                </>
              )}
              {activeTab === "vendors" && (
                <>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </>
              )}
              {activeTab === "purchase_orders" && (
                <>
                  <option value="APPROVED">Approved</option>
                  <option value="PARTIALLY_FULFILLED">Partially Fulfilled</option>
                  <option value="FULFILLED">Fulfilled</option>
                  <option value="DRAFT">Draft</option>
                </>
              )}
            </select>
          )}

          {/* Reset Filters */}
          {(searchQuery || startDate || endDate || selectedVendorFilter !== "All" || selectedCategoryFilter !== "All" || selectedStatusFilter !== "All") && (
            <button className="rep-btn-secondary" onClick={handleResetFilters} title="Reset all filters">
              <RotateCcw size={12} /> Reset
            </button>
          )}
        </div>

        <div style={{ fontSize: "12px", color: "#64748B" }}>
          Showing <b>{paginatedData.length}</b> of <b>{currentDataset.length}</b> records
        </div>
      </div>

      {/* Reports Tables */}
      <div className="rep-table-wrap">
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
            <RefreshCw size={24} className="spin" style={{ margin: "0 auto 10px auto" }} />
            <div>Loading Report Records...</div>
          </div>
        ) : error ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#DC2626" }}>
            <AlertCircle size={24} style={{ margin: "0 auto 10px auto" }} />
            <div>{error}</div>
            <button className="rep-btn-secondary" onClick={fetchAllData} style={{ marginTop: "12px" }}>
              Retry
            </button>
          </div>
        ) : currentDataset.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
            <FileText size={32} style={{ margin: "0 auto 10px auto", opacity: 0.5 }} />
            <div style={{ fontWeight: 600, fontSize: "14px", color: "#334155" }}>No records match your report filters</div>
            <div style={{ fontSize: "12px", marginTop: "4px" }}>
              Try adjusting the date range, vendor filter, category, or search term.
            </div>
          </div>
        ) : (
          <table className="rep-table">
            {/* 1. MATERIAL IN REPORT TABLE */}
            {activeTab === "material_in" && (
              <>
                <thead>
                  <tr>
                    <th>Receipt #</th>
                    <th>Purchase Order</th>
                    <th>Vendor Name</th>
                    <th>Invoice Number</th>
                    <th>Received Date</th>
                    <th>Inward Financials & Total</th>
                    <th>Received By</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((m) => {
                    const matchedPO = purchaseOrders.find((p) => String(p.id) === String(m.purchaseOrderId) || p.poNumber === m.poNumber);
                    const vName = matchedPO?.vendor?.name || matchedPO?.vendor?.companyName || "Not Available";
                    const parsed = parseNotesField(m.notes);
                    return (
                      <tr key={m.id}>
                        <td style={{ fontWeight: 700, color: "#0F172A" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <ArrowDownLeft size={15} color="#059669" />
                            {m.receiptNumber}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: "#2563EB" }}>
                            {m.poNumber || `PO #${m.purchaseOrderId}`}
                          </span>
                        </td>
                        <td style={{ fontWeight: 500 }}>{vName}</td>
                        <td>
                          {m.vendorInvoiceNumber ? (
                            <span style={{ fontFamily: "monospace", background: "#F1F5F9", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>
                              {m.vendorInvoiceNumber}
                            </span>
                          ) : (
                            <span style={{ color: "#94A3B8" }}>Not Available</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#475569" }}>
                            <Calendar size={13} />
                            {m.receivedDate ? String(m.receivedDate) : m.createdAt ? new Date(m.createdAt).toLocaleDateString() : "Not Available"}
                          </div>
                        </td>
                        <td>
                          {parsed.total ? (
                            <span style={{ fontWeight: 700, color: "#059669" }}>{parsed.total}</span>
                          ) : (
                            <span style={{ color: "#64748B" }}>On File</span>
                          )}
                        </td>
                        <td style={{ color: "#64748B" }}>{m.receivedByEmail || "SCM Admin"}</td>
                        <td style={{ color: "#64748B", maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {parsed.remarks || m.notes || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </>
            )}

            {/* 2. MATERIAL OUT REPORT TABLE */}
            {activeTab === "material_out" && (
              <>
                <thead>
                  <tr>
                    <th>Outward Ref #</th>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th style={{ textAlign: "center" }}>Qty Issued</th>
                    <th>Purpose / Reason</th>
                    <th>Issued To</th>
                    <th>Date</th>
                    <th>Handled By</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((m) => {
                    const p = m.product || {};
                    return (
                      <tr key={m.id}>
                        <td style={{ fontWeight: 700, color: "#0F172A" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <ArrowUpRight size={15} color="#2563EB" />
                            {m.referenceId || `OUT-${m.id}`}
                          </div>
                        </td>
                        <td style={{ fontWeight: 600, color: "#0F172A" }}>
                          {p.name || m.productName || "Product Item"}
                        </td>
                        <td>
                          <span className="badge badge-neutral">{p.category || m.category || "General"}</span>
                        </td>
                        <td style={{ textAlign: "center", fontWeight: 700, color: "#2563EB" }}>
                          {m.quantity || 1}
                        </td>
                        <td>{m.purpose || "Production Assembly"}</td>
                        <td style={{ fontWeight: 500 }}>{m.issuedTo || "Not Available"}</td>
                        <td>
                          {m.transactionDate ? String(m.transactionDate) : m.createdAt ? new Date(m.createdAt).toLocaleDateString() : "Not Available"}
                        </td>
                        <td style={{ color: "#64748B" }}>{m.createdByEmail || "SCM Admin"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </>
            )}

            {/* 3. INVENTORY STOCK REPORT TABLE */}
            {activeTab === "stock" && (
              <>
                <thead>
                  <tr>
                    <th>Product Details</th>
                    <th>Category</th>
                    <th>Model # / Brand</th>
                    <th style={{ textAlign: "center" }}>Available Stock</th>
                    <th style={{ textAlign: "center" }}>Total Inwarded</th>
                    <th style={{ textAlign: "center" }}>Total Issued</th>
                    <th>Stock Status</th>
                    <th>Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((s) => {
                    const p = s.product || {};
                    const avail = s.availableQuantity || s.quantity || 0;
                    const status = avail <= 0 ? "Out of Stock" : avail <= 10 ? "Low Stock" : "In Stock";
                    const statusClass = avail <= 0 ? "badge-danger" : avail <= 10 ? "badge-warning" : "badge-success";
                    return (
                      <tr key={s.id || p.id}>
                        <td style={{ fontWeight: 600, color: "#0F172A" }}>
                          {p.name || "Product Item"}
                          {p.specString && <div style={{ fontSize: "11px", color: "#64748B" }}>{p.specString}</div>}
                        </td>
                        <td>
                          <span className="badge badge-neutral">{p.category || "General"}</span>
                        </td>
                        <td style={{ fontSize: "12px", color: "#475569" }}>
                          {p.modelNumber ? `Model: ${p.modelNumber}` : ""} {p.brand ? `• ${p.brand}` : ""}
                        </td>
                        <td style={{ textAlign: "center", fontSize: "14px", fontWeight: 700, color: avail > 0 ? "#059669" : "#DC2626" }}>
                          {avail}
                        </td>
                        <td style={{ textAlign: "center", color: "#2563EB", fontWeight: 600 }}>
                          {s.totalInwardQuantity || s.inQuantity || "—"}
                        </td>
                        <td style={{ textAlign: "center", color: "#D97706", fontWeight: 600 }}>
                          {s.totalOutwardQuantity || s.outQuantity || "—"}
                        </td>
                        <td>
                          <span className={`badge ${statusClass}`}>{status}</span>
                        </td>
                        <td style={{ color: "#64748B", fontSize: "12px" }}>
                          {s.updatedAt ? new Date(s.updatedAt).toLocaleDateString() : "Active"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </>
            )}

            {/* 4. VENDOR REPORT TABLE */}
            {activeTab === "vendors" && (
              <>
                <thead>
                  <tr>
                    <th>Vendor / Company Name</th>
                    <th>GSTIN</th>
                    <th>Contact Person</th>
                    <th>Contact Phone</th>
                    <th>Email</th>
                    <th>Payment Terms</th>
                    <th style={{ textAlign: "center" }}>Total POs</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((v) => {
                    const vendorPOs = purchaseOrders.filter((p) => String(p.vendor?.id ?? p.vendorId) === String(v.id));
                    return (
                      <tr key={v.id}>
                        <td style={{ fontWeight: 700, color: "#0F172A" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <Building2 size={15} color="#059669" />
                            {v.name || v.companyName || "Vendor"}
                          </div>
                        </td>
                        <td style={{ fontFamily: "monospace", fontWeight: 600 }}>
                          {v.gstNumber || "Not Available"}
                        </td>
                        <td>{v.contactPerson || "Not Available"}</td>
                        <td>{v.contactNumber || "Not Available"}</td>
                        <td style={{ color: "#2563EB" }}>{v.email || "Not Available"}</td>
                        <td>{v.paymentTerms || "Standard Net 30"}</td>
                        <td style={{ textAlign: "center", fontWeight: 700, color: "#0F172A" }}>
                          {vendorPOs.length}
                        </td>
                        <td>
                          <span className={`badge ${v.active !== false ? "badge-success" : "badge-neutral"}`}>
                            {v.active !== false ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </>
            )}

            {/* 5. PURCHASE ORDER REPORT TABLE */}
            {activeTab === "purchase_orders" && (
              <>
                <thead>
                  <tr>
                    <th>PO Number</th>
                    <th>Vendor Name</th>
                    <th>Status</th>
                    <th style={{ textAlign: "center" }}>Ordered Qty</th>
                    <th style={{ textAlign: "center" }}>Received Qty</th>
                    <th style={{ textAlign: "center" }}>Remaining Qty</th>
                    <th>Expected Delivery</th>
                    <th>Total PO Amount</th>
                    <th>Created Date</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((po) => {
                    const vName = po.vendor?.name || po.vendor?.companyName || "Not Available";
                    const items = Array.isArray(po.items) ? po.items : [];
                    let ordQty = 0;
                    let recQty = 0;
                    items.forEach((it) => {
                      ordQty += Number(it.quantity) || 0;
                      recQty += Number(it.receivedQuantity) || 0;
                    });
                    const remQty = Math.max(0, ordQty - recQty);
                    const poAmt = po.totalAmount || po.netAmount ? `₹${Number(po.totalAmount || po.netAmount).toLocaleString("en-IN")}` : "Not Available";
                    const s = String(po.status || "").toUpperCase();
                    const statusClass = s === "APPROVED" ? "badge-success" : s === "PARTIALLY_FULFILLED" ? "badge-warning" : s === "FULFILLED" ? "badge-info" : "badge-neutral";

                    return (
                      <tr key={po.id}>
                        <td style={{ fontWeight: 700, color: "#2563EB" }}>
                          {po.poNumber || `PO #${po.id}`}
                        </td>
                        <td style={{ fontWeight: 600 }}>{vName}</td>
                        <td>
                          <span className={`badge ${statusClass}`}>{po.status || "Approved"}</span>
                        </td>
                        <td style={{ textAlign: "center", fontWeight: 600 }}>{ordQty}</td>
                        <td style={{ textAlign: "center", color: "#059669", fontWeight: 600 }}>{recQty}</td>
                        <td style={{ textAlign: "center", color: remQty > 0 ? "#D97706" : "#64748B", fontWeight: 600 }}>{remQty}</td>
                        <td>
                          {po.expectedDeliveryDate ? (
                            <span style={{ color: "#0F172A", fontWeight: 500 }}>{String(po.expectedDeliveryDate)}</span>
                          ) : (
                            <span style={{ color: "#94A3B8" }}>Not Available</span>
                          )}
                        </td>
                        <td style={{ fontWeight: 700, color: "#0F172A" }}>{poAmt}</td>
                        <td style={{ color: "#64748B", fontSize: "12px" }}>
                          {po.createdAt ? new Date(po.createdAt).toLocaleDateString() : "Not Available"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </>
            )}
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      {currentDataset.length > itemsPerPage && (
        <div className="rep-pagination">
          <div>
            Showing Page <b>{currentPage}</b> of <b>{totalPages}</b>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              className="rep-btn-secondary"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <button
              className="rep-btn-secondary"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
