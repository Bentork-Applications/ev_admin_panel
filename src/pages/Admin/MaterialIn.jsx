import React, { useState, useEffect, useMemo, useCallback } from "react";
import { inventoryService } from "../../services/inventoryService";
import { procurementService } from "../../services/procurementService";
import { productService } from "../../services/productService";
import { Toast } from "../../components/common/Toast";
import {
  ArrowDownLeft,
  Plus,
  Search,
  RefreshCw,
  FileCheck2,
  Building2,
  Calendar,
  Package,
  X,
  AlertCircle,
  FileText,
  User,
  CheckCircle2,
  DollarSign,
  Receipt,
  Eye,
  CreditCard,
  Truck,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertTriangle,
  Layers,
  MapPin,
  Phone,
  Mail,
  FileSpreadsheet,
  BadgeCheck,
  ShieldCheck,
  Tag,
  Hash,
  Info
} from "lucide-react";

export default function MaterialIn() {
  const [materialIns, setMaterialIns] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal States
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingModalData, setLoadingModalData] = useState(false);
  const [modalDataError, setModalDataError] = useState(null);

  // View Receipt Details Modal
  const [viewingReceipt, setViewingReceipt] = useState(null);

  // Inward Form State
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [selectedPOId, setSelectedPOId] = useState("");
  const [vendorInvoiceNumber, setVendorInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [receivedDate, setReceivedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [serialNumber, setSerialNumber] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [notes, setNotes] = useState("");

  // Item Quantities and Rates: { [poItemId]: value }
  const [itemQuantities, setItemQuantities] = useState({});
  const [itemRates, setItemRates] = useState({});
  const [taxPercent, setTaxPercent] = useState(18); // Default 18% GST
  const [customTaxAmount, setCustomTaxAmount] = useState("");
  const [useCustomTax, setUseCustomTax] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  }, []);

  // Fetch all primary datasets
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [matInData, poData, vendorData, prodData] = await Promise.all([
        inventoryService.getAllMaterialIn().catch(() => []),
        procurementService.getAllPurchaseOrders().catch(() => []),
        procurementService.getAllVendors().catch(() => []),
        productService.getActiveProducts().catch(() => [])
      ]);

      setMaterialIns(Array.isArray(matInData) ? matInData : matInData?.data || []);

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

      const parsedVendors = Array.isArray(vendorData)
        ? vendorData
        : Array.isArray(vendorData?.data)
          ? vendorData.data
          : Array.isArray(vendorData?.vendors)
            ? vendorData.vendors
            : [];
      setVendors(parsedVendors);

      const parsedProds = Array.isArray(prodData)
        ? prodData
        : Array.isArray(prodData?.data)
          ? prodData.data
          : Array.isArray(prodData?.products)
            ? prodData.products
            : [];
      setProducts(parsedProds);
    } catch (err) {
      console.error("Error loading Material IN data:", err);
      setError(err.message || "Failed to load Material IN data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh procurement and catalog data on opening modal
  useEffect(() => {
    if (showProcessModal) {
      setLoadingModalData(true);
      setModalDataError(null);
      Promise.all([
        procurementService.getAllPurchaseOrders().catch(() => []),
        procurementService.getAllVendors().catch(() => []),
        productService.getActiveProducts().catch(() => [])
      ])
        .then(([pos, vens, prods]) => {
          const parsedPOs = Array.isArray(pos) ? pos : pos?.data || [];
          const parsedVens = Array.isArray(vens) ? vens : vens?.data || [];
          const parsedProds = Array.isArray(prods) ? prods : prods?.data || [];
          setPurchaseOrders(parsedPOs);
          setVendors(parsedVens);
          setProducts(parsedProds);
        })
        .catch((err) => {
          console.error("Failed to refresh modal data:", err);
          setModalDataError(err.message || "Failed to load latest procurement data");
        })
        .finally(() => setLoadingModalData(false));
    }
  }, [showProcessModal]);

  // Eligible POs (Approved, Partially Fulfilled, or Active)
  const eligiblePOs = useMemo(() => {
    if (!Array.isArray(purchaseOrders) || purchaseOrders.length === 0) return [];
    return purchaseOrders.filter((po) => {
      if (!po || !po.id) return false;
      const s = String(po.status || "").toUpperCase();
      return s !== "FULFILLED" && s !== "CANCELLED";
    });
  }, [purchaseOrders]);

  // POs available in modal (optionally filtered by selected vendor)
  const availablePOsForForm = useMemo(() => {
    if (!selectedVendorId) return eligiblePOs;
    return eligiblePOs.filter((po) => {
      const vId = po.vendor?.id ?? po.vendorId;
      return String(vId) === String(selectedVendorId);
    });
  }, [eligiblePOs, selectedVendorId]);

  // Currently selected PO object in Form
  const currentPO = useMemo(() => {
    if (!selectedPOId) return null;
    return purchaseOrders.find((p) => String(p.id) === String(selectedPOId)) || null;
  }, [selectedPOId, purchaseOrders]);

  // Currently selected Vendor object in Form
  const currentVendor = useMemo(() => {
    const vId = selectedVendorId || (currentPO?.vendor?.id ?? currentPO?.vendorId);
    if (!vId) return null;
    return (
      vendors.find((v) => String(v.id) === String(vId)) ||
      (currentPO?.vendor ? currentPO.vendor : null)
    );
  }, [selectedVendorId, currentPO, vendors]);

  // Real vendor history and existing payment fields from API
  const vendorHistory = useMemo(() => {
    if (!currentVendor?.id) return null;
    const vendorId = currentVendor.id;

    // Filter vendor POs
    const vendorPOs = purchaseOrders.filter((p) => {
      const pVid = p.vendor?.id ?? p.vendorId;
      return String(pVid) === String(vendorId);
    });

    const vendorPOIds = new Set(vendorPOs.map((p) => p.id));
    const vendorPONumbers = new Set(vendorPOs.map((p) => p.poNumber).filter(Boolean));

    // Filter vendor receipts from real materialIns
    const vendorReceipts = materialIns.filter(
      (m) =>
        vendorPOIds.has(m.purchaseOrderId) ||
        (m.poNumber && vendorPONumbers.has(m.poNumber))
    );

    const approvedCount = vendorPOs.filter((p) => String(p.status).toUpperCase() === "APPROVED").length;
    const fulfilledCount = vendorPOs.filter((p) => String(p.status).toUpperCase() === "FULFILLED").length;
    const partialCount = vendorPOs.filter((p) => String(p.status).toUpperCase() === "PARTIALLY_FULFILLED").length;

    return {
      totalPOs: vendorPOs.length,
      approvedPOs: approvedCount,
      fulfilledPOs: fulfilledCount,
      partialPOs: partialCount,
      totalReceipts: vendorReceipts.length,
      receipts: vendorReceipts
    };
  }, [currentVendor, purchaseOrders, materialIns]);

  // Available categories extracted from PO items and catalog
  const availableCategories = useMemo(() => {
    const cats = new Set(["All", "EV Battery", "Solar Battery", "Battery Pack", "Charger", "Spare Part", "Raw Material"]);
    products.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    if (currentPO && Array.isArray(currentPO.items)) {
      currentPO.items.forEach((it) => {
        if (it.product?.category) cats.add(it.product.category);
      });
    }
    return Array.from(cats);
  }, [products, currentPO]);

  // Filtered PO line items by selected category
  const filteredPOItems = useMemo(() => {
    if (!currentPO || !Array.isArray(currentPO.items)) return [];
    if (selectedCategory === "All") return currentPO.items;
    return currentPO.items.filter((it) => {
      const cat = it.product?.category || "";
      return cat.toLowerCase() === selectedCategory.toLowerCase();
    });
  }, [currentPO, selectedCategory]);

  // Overall PO quantity totals for the quantity flow banner in Inward Form
  const poQuantitySummary = useMemo(() => {
    if (!currentPO || !Array.isArray(currentPO.items)) {
      return {
        totalOrdered: 0,
        totalPrevReceived: 0,
        totalCurrentInward: 0,
        totalRemaining: 0,
        expectedDeliveryDate: "Not Available"
      };
    }

    let totalOrdered = 0;
    let totalPrevReceived = 0;
    let totalCurrentInward = 0;

    currentPO.items.forEach((it) => {
      const ord = Number(it.quantity) || 0;
      const prev = Number(it.receivedQuantity) || 0;
      const curr = Number(itemQuantities[it.id]) || 0;
      totalOrdered += ord;
      totalPrevReceived += prev;
      totalCurrentInward += curr;
    });

    const totalRemaining = Math.max(0, totalOrdered - totalPrevReceived - totalCurrentInward);
    const expectedDeliveryDate = currentPO.expectedDeliveryDate ? String(currentPO.expectedDeliveryDate) : "Not Available";

    return {
      totalOrdered,
      totalPrevReceived,
      totalCurrentInward,
      totalRemaining,
      expectedDeliveryDate
    };
  }, [currentPO, itemQuantities]);

  // When PO changes, sync vendor and initialize quantities & rates
  useEffect(() => {
    if (currentPO) {
      if (currentPO.vendor?.id) {
        setSelectedVendorId(String(currentPO.vendor.id));
      }

      if (Array.isArray(currentPO.items)) {
        const initialQtys = {};
        const initialRates = {};
        currentPO.items.forEach((it) => {
          const remaining = (it.quantity || 0) - (it.receivedQuantity || 0);
          initialQtys[it.id] = remaining > 0 ? remaining : 0;
          initialRates[it.id] = it.unitPrice || it.rate || it.product?.unitPrice || 0;
        });
        setItemQuantities(initialQtys);
        setItemRates(initialRates);
      }
    }
  }, [currentPO]);

  // Handle PO selection
  const handlePOSelect = (poId) => {
    setSelectedPOId(poId);
    if (!poId) return;
    const po = purchaseOrders.find((p) => String(p.id) === String(poId));
    if (po && po.vendor?.id) {
      setSelectedVendorId(String(po.vendor.id));
    }
    setFormErrors((prev) => ({ ...prev, po: null }));
  };

  // Handle Vendor selection
  const handleVendorSelect = (vendorId) => {
    setSelectedVendorId(vendorId);
    if (!vendorId) {
      setSelectedPOId("");
      return;
    }
    if (currentPO) {
      const currentPOVendorId = currentPO.vendor?.id ?? currentPO.vendorId;
      if (String(currentPOVendorId) !== String(vendorId)) {
        setSelectedPOId("");
      }
    }
  };

  // Handle Qty change
  const handleQtyChange = (poItemId, value) => {
    const num = value === "" ? "" : parseInt(value, 10);
    setItemQuantities((prev) => ({
      ...prev,
      [poItemId]: isNaN(num) ? "" : num
    }));
    setFormErrors((prev) => ({ ...prev, [`item_${poItemId}`]: null, general: null }));
  };

  // Handle Rate change
  const handleRateChange = (poItemId, value) => {
    const num = value === "" ? "" : parseFloat(value);
    setItemRates((prev) => ({
      ...prev,
      [poItemId]: isNaN(num) ? "" : num
    }));
  };

  // Dynamic Total Calculations
  const calculatedTotals = useMemo(() => {
    let totalItemsCount = 0;
    let subtotal = 0;

    if (currentPO && Array.isArray(currentPO.items)) {
      currentPO.items.forEach((it) => {
        const qty = Number(itemQuantities[it.id]) || 0;
        const rate = Number(itemRates[it.id]) || 0;
        if (qty > 0) {
          totalItemsCount += qty;
          subtotal += qty * rate;
        }
      });
    }

    let calculatedTax = 0;
    if (useCustomTax) {
      calculatedTax = Number(customTaxAmount) || 0;
    } else {
      calculatedTax = subtotal * (Number(taxPercent || 0) / 100);
    }

    const grandTotal = subtotal + calculatedTax;

    return {
      totalItemsCount,
      subtotal,
      taxAmount: calculatedTax,
      grandTotal
    };
  }, [currentPO, itemQuantities, itemRates, taxPercent, customTaxAmount, useCustomTax]);

  // Form Validation
  const validateForm = () => {
    const errors = {};

    if (!selectedPOId) {
      errors.po = "Please select a Purchase Order";
    } else if (currentPO) {
      const isDraft =
        String(currentPO.status || "").toUpperCase() === "DRAFT" ||
        String(currentPO.status || "").toLowerCase().includes("draft");
      if (isDraft) {
        errors.po = "This Purchase Order is in Draft status. It must be Approved before receiving materials.";
      }
    }

    if (!vendorInvoiceNumber.trim()) {
      errors.invoiceNumber = "Vendor Invoice Number is required";
    }

    if (!receivedDate) {
      errors.receivedDate = "Received Date is required";
    }

    let hasAnyItemToReceive = false;
    if (currentPO && Array.isArray(currentPO.items)) {
      currentPO.items.forEach((it) => {
        const remaining = (it.quantity || 0) - (it.receivedQuantity || 0);
        const entering = itemQuantities[it.id];

        if (entering !== undefined && entering !== "") {
          const val = Number(entering);
          if (val < 0) {
            errors[`item_${it.id}`] = "Quantity cannot be negative";
          } else if (val > remaining) {
            errors[`item_${it.id}`] = `Exceeds remaining (${remaining})`;
          } else if (val > 0) {
            hasAnyItemToReceive = true;
          }
        }
      });
    }

    if (!hasAnyItemToReceive && !errors.po) {
      errors.general = "Please enter a received quantity of at least 1 for at least one line item.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Handler
  const handleProcessSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const itemsToSubmit = [];
      const itemDetailsNote = [];

      currentPO.items.forEach((it) => {
        const qty = Number(itemQuantities[it.id]);
        const rate = Number(itemRates[it.id]) || 0;
        if (qty > 0) {
          itemsToSubmit.push({
            poItemId: Number(it.id),
            receivedQuantity: qty
          });
          const pName = it.product?.name || `Item #${it.id}`;
          itemDetailsNote.push(`${pName} (Qty: ${qty}, Rate: ₹${rate})`);
        }
      });

      // Construct rich structured notes to retain all UI metadata in backend contract
      const structuredNotesParts = [];
      if (invoiceDate) structuredNotesParts.push(`Invoice Date: ${invoiceDate}`);
      if (receivedDate) structuredNotesParts.push(`Received Date: ${receivedDate}`);
      if (serialNumber.trim()) structuredNotesParts.push(`Serial No: ${serialNumber.trim()}`);
      if (calculatedTotals.subtotal > 0) {
        structuredNotesParts.push(
          `Subtotal: ₹${calculatedTotals.subtotal.toFixed(2)}, Tax: ₹${calculatedTotals.taxAmount.toFixed(2)} (${useCustomTax ? "Fixed" : `${taxPercent}%`}), Total: ₹${calculatedTotals.grandTotal.toFixed(2)}`
        );
      }
      if (notes.trim()) structuredNotesParts.push(`Remarks: ${notes.trim()}`);

      const fullNotes = structuredNotesParts.join(" | ");

      const payload = {
        purchaseOrderId: Number(selectedPOId),
        vendorInvoiceNumber: vendorInvoiceNumber.trim(),
        notes: fullNotes || null,
        items: itemsToSubmit
      };

      const result = await inventoryService.processMaterialIn(payload);

      showToast(
        `Material Inward Receipt #${result?.receiptNumber || ""} created successfully!`,
        "success"
      );

      // Reset form & close modal
      setShowProcessModal(false);
      setSelectedPOId("");
      setSelectedVendorId("");
      setVendorInvoiceNumber("");
      setInvoiceDate(new Date().toISOString().split("T")[0]);
      setReceivedDate(new Date().toISOString().split("T")[0]);
      setSerialNumber("");
      setSelectedCategory("All");
      setNotes("");
      setItemQuantities({});
      setItemRates({});
      setFormErrors({});

      // Refresh list
      fetchData();
    } catch (err) {
      console.error("Error processing Material IN:", err);
      showToast(err.message || "Failed to process Material Inward", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Material In records for table view
  const filteredMaterialIns = useMemo(() => {
    if (!searchQuery.trim()) return materialIns;
    const q = searchQuery.toLowerCase().trim();
    return materialIns.filter(
      (m) =>
        m.receiptNumber?.toLowerCase().includes(q) ||
        m.poNumber?.toLowerCase().includes(q) ||
        m.vendorInvoiceNumber?.toLowerCase().includes(q) ||
        m.receivedByEmail?.toLowerCase().includes(q) ||
        m.notes?.toLowerCase().includes(q)
    );
  }, [materialIns, searchQuery]);

  // Payment fields extracted purely from existing API responses
  const vendorPaymentInfo = useMemo(() => {
    if (!currentVendor && !currentPO) {
      return {
        totalPOAmount: "Not Available",
        paidAmount: "Not Available",
        pendingAmount: "Not Available",
        paymentStatus: "Not Available",
        paymentMethod: "Not Available",
        paymentTerms: "Not Available",
        bankDetails: "Not Available"
      };
    }

    let totalPOAmount = "Not Available";
    if (currentPO?.totalAmount !== undefined && currentPO?.totalAmount !== null) {
      totalPOAmount = `₹${Number(currentPO.totalAmount).toLocaleString("en-IN")}`;
    } else if (currentPO?.netAmount !== undefined && currentPO?.netAmount !== null) {
      totalPOAmount = `₹${Number(currentPO.netAmount).toLocaleString("en-IN")}`;
    }

    let paidAmount = "Not Available";
    if (currentPO?.paidAmount !== undefined && currentPO?.paidAmount !== null) {
      paidAmount = `₹${Number(currentPO.paidAmount).toLocaleString("en-IN")}`;
    } else if (currentVendor?.paidAmount !== undefined && currentVendor?.paidAmount !== null) {
      paidAmount = `₹${Number(currentVendor.paidAmount).toLocaleString("en-IN")}`;
    }

    let pendingAmount = "Not Available";
    if (currentPO?.pendingAmount !== undefined && currentPO?.pendingAmount !== null) {
      pendingAmount = `₹${Number(currentPO.pendingAmount).toLocaleString("en-IN")}`;
    } else if (currentVendor?.pendingAmount !== undefined && currentVendor?.pendingAmount !== null) {
      pendingAmount = `₹${Number(currentVendor.pendingAmount).toLocaleString("en-IN")}`;
    }

    const paymentStatus = currentPO?.paymentStatus || currentVendor?.paymentStatus || "Not Available";
    const paymentMethod = currentVendor?.paymentMethod || currentPO?.paymentMethod || "Not Available";
    const paymentTerms = currentVendor?.paymentTerms || currentPO?.paymentTerms || "Not Available";
    const bankDetails = currentVendor?.bankDetails || "Not Available";

    return {
      totalPOAmount,
      paidAmount,
      pendingAmount,
      paymentStatus,
      paymentMethod,
      paymentTerms,
      bankDetails
    };
  }, [currentVendor, currentPO]);

  // Detailed object for View Details Modal
  const detailedViewData = useMemo(() => {
    if (!viewingReceipt) return null;

    // Find linked PO
    const matchedPO = purchaseOrders.find(
      (p) =>
        String(p.id) === String(viewingReceipt.purchaseOrderId) ||
        (p.poNumber && viewingReceipt.poNumber && p.poNumber === viewingReceipt.poNumber)
    );

    // Find linked Vendor
    const vendorId = matchedPO?.vendor?.id ?? matchedPO?.vendorId;
    const matchedVendor =
      vendors.find((v) => String(v.id) === String(vendorId)) ||
      matchedPO?.vendor ||
      null;

    // Parse structured notes if present
    const notesStr = viewingReceipt.notes || "";
    let parsedInvoiceDate = "Not Available";
    let parsedReceivedDate = viewingReceipt.receivedDate ? String(viewingReceipt.receivedDate) : "Not Available";
    let parsedSerialNumbers = "Not Available";
    let parsedSubtotal = "Not Available";
    let parsedTax = "Not Available";
    let parsedTotal = "Not Available";
    let parsedRemarks = notesStr || "Not Available";

    if (notesStr.includes("|")) {
      const parts = notesStr.split("|").map((s) => s.trim());
      parts.forEach((part) => {
        if (part.toLowerCase().startsWith("invoice date:")) {
          parsedInvoiceDate = part.replace(/invoice date:/i, "").trim();
        } else if (part.toLowerCase().startsWith("received date:")) {
          parsedReceivedDate = part.replace(/received date:/i, "").trim();
        } else if (part.toLowerCase().startsWith("serial no:") || part.toLowerCase().startsWith("serial number:")) {
          parsedSerialNumbers = part.replace(/serial (no|number):/i, "").trim();
        } else if (part.toLowerCase().startsWith("subtotal:")) {
          parsedSubtotal = part.replace(/subtotal:/i, "").trim();
        } else if (part.toLowerCase().startsWith("tax")) {
          parsedTax = part;
        } else if (part.toLowerCase().startsWith("total:") || part.toLowerCase().startsWith("total amount:")) {
          parsedTotal = part.replace(/total( amount)?:/i, "").trim();
        } else if (part.toLowerCase().startsWith("remarks:")) {
          parsedRemarks = part.replace(/remarks:/i, "").trim();
        }
      });
    }

    // Line items from PO
    const items = Array.isArray(matchedPO?.items) ? matchedPO.items : [];

    // Aggregate quantities
    let totalOrderedQty = 0;
    let totalReceivedQty = 0;
    items.forEach((it) => {
      totalOrderedQty += Number(it.quantity) || 0;
      totalReceivedQty += Number(it.receivedQuantity) || 0;
    });
    const totalRemainingQty = Math.max(0, totalOrderedQty - totalReceivedQty);

    return {
      receipt: viewingReceipt,
      po: matchedPO,
      vendor: matchedVendor,
      items,
      totalOrderedQty,
      totalReceivedQty,
      totalRemainingQty,
      parsedInvoiceDate,
      parsedReceivedDate,
      parsedSerialNumbers,
      parsedSubtotal,
      parsedTax,
      parsedTotal,
      parsedRemarks
    };
  }, [viewingReceipt, purchaseOrders, vendors]);

  return (
    <div style={{ padding: "20px 24px", maxWidth: "1440px", margin: "0 auto", boxSizing: "border-box", fontFamily: "Roboto, sans-serif" }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <style>{`
        .matin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .matin-title {
          font-size: 22px;
          font-weight: 700;
          color: #0F172A;
          margin: 0 0 4px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .matin-card-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 14px;
          margin-bottom: 20px;
        }
        .matin-stat-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .matin-stat-icon {
          width: 44px;
          height: 44px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .matin-controls {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 10px 10px 0 0;
          padding: 14px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          border-bottom: none;
        }
        .matin-table-wrap {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 0 0 10px 10px;
          overflow-x: auto;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .matin-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 13px;
        }
        .matin-table th {
          background: #F8FAFC;
          color: #475569;
          font-weight: 600;
          padding: 12px 16px;
          border-bottom: 1px solid #E2E8F0;
          white-space: nowrap;
        }
        .matin-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #F1F5F9;
          color: #334155;
          vertical-align: middle;
        }
        .matin-table tr:hover td {
          background: #F8FAFC;
        }
        .matin-btn-primary {
          background: #10B981;
          color: #FFFFFF;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: background 0.2s;
        }
        .matin-btn-primary:hover {
          background: #059669;
        }
        .matin-btn-secondary {
          background: #F1F5F9;
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
        .matin-btn-secondary:hover {
          background: #E2E8F0;
        }
        .matin-btn-view {
          background: #EFF6FF;
          color: #2563EB;
          border: 1px solid #BFDBFE;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: all 0.2s;
        }
        .matin-btn-view:hover {
          background: #DBEAFE;
          border-color: #93C5FD;
          color: #1D4ED8;
        }
        .matin-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(3px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }
        .matin-modal {
          background: #FFFFFF;
          border-radius: 12px;
          width: 100%;
          max-width: 1020px;
          max-height: 92vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          display: flex;
          flex-direction: column;
        }
        .matin-modal-header {
          padding: 16px 22px;
          border-bottom: 1px solid #E2E8F0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          background: #FFFFFF;
          z-index: 10;
        }
        .matin-modal-body {
          padding: 22px;
          flex: 1;
        }
        .matin-modal-footer {
          padding: 14px 22px;
          border-top: 1px solid #E2E8F0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #F8FAFC;
          position: sticky;
          bottom: 0;
          z-index: 10;
          border-radius: 0 0 12px 12px;
        }
        .form-section {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 18px;
        }
        .form-section-title {
          font-size: 13px;
          font-weight: 700;
          color: #1E293B;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 0 0 12px 0;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .grid-3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 14px;
        }
        .grid-4 {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        .form-label {
          font-size: 12px;
          font-weight: 600;
          color: #334155;
          display: block;
          margin-bottom: 5px;
        }
        .form-input, .form-select {
          width: 100%;
          padding: 8px 10px;
          border-radius: 6px;
          border: 1px solid #CBD5E1;
          font-size: 13px;
          box-sizing: border-box;
          color: #0F172A;
          background: #FFFFFF;
        }
        .form-input:focus, .form-select:focus {
          outline: none;
          border-color: #10B981;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.15);
        }
        .form-input-error {
          border-color: #DC2626 !important;
        }
        .error-text {
          color: #DC2626;
          font-size: 11px;
          margin-top: 4px;
          display: block;
        }
        .badge {
          display: inline-flex;
          align-items: center;
          padding: 3px 8px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 600;
        }
        .badge-success {
          background: #ECFDF5;
          color: #059669;
        }
        .badge-warning {
          background: #FEF3C7;
          color: #D97706;
        }
        .badge-info {
          background: #EFF6FF;
          color: #2563EB;
        }
        .badge-purple {
          background: #F3E8FF;
          color: #7C3AED;
        }
        .badge-neutral {
          background: #F1F5F9;
          color: #475569;
        }
        .calc-summary-card {
          background: #F8FAFC;
          border: 1px solid #CBD5E1;
          border-radius: 8px;
          padding: 14px;
        }
        .flow-pill-container {
          display: flex;
          align-items: center;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 10px 14px;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }
        .flow-pill {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 120px;
        }
        .flow-pill-label {
          font-size: 10px;
          font-weight: 700;
          color: #64748B;
          text-transform: uppercase;
          margin-bottom: 2px;
        }
        .flow-pill-val {
          font-size: 14px;
          font-weight: 700;
          color: #0F172A;
        }
        .view-section-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 16px;
          margin-bottom: 16px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.03);
        }
        .view-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          border-bottom: 1px solid #F1F5F9;
          padding-bottom: 8px;
        }
        .view-section-title {
          font-size: 13px;
          font-weight: 700;
          color: #1E293B;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .data-item {
          display: flex;
          flex-direction: column;
        }
        .data-label {
          font-size: 11px;
          font-weight: 600;
          color: #64748B;
          margin-bottom: 2px;
          text-transform: uppercase;
        }
        .data-value {
          font-size: 13px;
          color: #0F172A;
          font-weight: 500;
          word-break: break-word;
        }
        .highlight-card {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 10px 14px;
          text-align: center;
        }
        .highlight-card-num {
          font-size: 18px;
          font-weight: 700;
          margin-top: 2px;
        }
      `}</style>

      {/* Top Header */}
      <div className="matin-header">
        <div>
          <h1 className="matin-title">
            <ArrowDownLeft size={24} color="#10B981" /> Material IN (Inward Goods)
          </h1>
          <p style={{ fontSize: "13px", color: "#64748B", margin: 0 }}>
            Receive and register goods against Approved Purchase Orders, track vendor history, verify invoice details, and auto-update warehouse inventory stock.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="matin-btn-secondary" onClick={fetchData} title="Refresh Material IN records">
            <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
          </button>
          <button className="matin-btn-primary" onClick={() => setShowProcessModal(true)}>
            <Plus size={16} /> Process Material IN
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="matin-card-grid">
        <div className="matin-stat-card">
          <div className="matin-stat-icon" style={{ background: "#ECFDF5", color: "#059669" }}>
            <ArrowDownLeft size={22} />
          </div>
          <div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#0F172A" }}>{materialIns.length}</div>
            <div style={{ fontSize: "12px", color: "#64748B" }}>Total Inward Receipts</div>
          </div>
        </div>

        <div className="matin-stat-card">
          <div className="matin-stat-icon" style={{ background: "#EFF6FF", color: "#2563EB" }}>
            <FileCheck2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#0F172A" }}>{eligiblePOs.length}</div>
            <div style={{ fontSize: "12px", color: "#64748B" }}>Active Inward POs</div>
          </div>
        </div>

        <div className="matin-stat-card">
          <div className="matin-stat-icon" style={{ background: "#F3E8FF", color: "#7C3AED" }}>
            <Building2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#0F172A" }}>{vendors.length}</div>
            <div style={{ fontSize: "12px", color: "#64748B" }}>Registered Vendors</div>
          </div>
        </div>

        <div className="matin-stat-card">
          <div className="matin-stat-icon" style={{ background: "#FEF3C7", color: "#D97706" }}>
            <FileText size={22} />
          </div>
          <div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#0F172A" }}>
              {materialIns.filter((m) => m.vendorInvoiceNumber).length}
            </div>
            <div style={{ fontSize: "12px", color: "#64748B" }}>Invoices Linked</div>
          </div>
        </div>
      </div>

      {/* Table Search & Header Bar */}
      <div className="matin-controls">
        <div style={{ display: "flex", alignItems: "center", background: "#F8FAFC", border: "1px solid #CBD5E1", borderRadius: "6px", padding: "6px 12px", width: "340px" }}>
          <Search size={16} color="#64748B" />
          <input
            type="text"
            placeholder="Search Receipt#, PO#, Invoice#, Received By..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ border: "none", background: "transparent", outline: "none", fontSize: "13px", marginLeft: "8px", width: "100%", color: "#1E293B" }}
          />
        </div>
        <div style={{ fontSize: "12px", color: "#64748B" }}>
          Showing <b>{filteredMaterialIns.length}</b> of <b>{materialIns.length}</b> receipts
        </div>
      </div>

      {/* Receipts Table */}
      <div className="matin-table-wrap">
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
            <RefreshCw size={24} className="spin" style={{ margin: "0 auto 10px auto" }} />
            <div>Loading Inward Receipts...</div>
          </div>
        ) : error ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#DC2626" }}>
            <AlertCircle size={24} style={{ margin: "0 auto 10px auto" }} />
            <div>{error}</div>
            <button className="matin-btn-secondary" onClick={fetchData} style={{ marginTop: "12px" }}>
              Retry
            </button>
          </div>
        ) : filteredMaterialIns.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
            <ArrowDownLeft size={32} style={{ margin: "0 auto 10px auto", opacity: 0.5 }} />
            <div style={{ fontWeight: 600, fontSize: "14px", color: "#334155" }}>No Material IN Receipts Found</div>
            <div style={{ fontSize: "12px", marginTop: "4px" }}>
              Click "Process Material IN" to record incoming materials against an approved PO.
            </div>
          </div>
        ) : (
          <table className="matin-table">
            <thead>
              <tr>
                <th>Receipt #</th>
                <th>Purchase Order</th>
                <th>Vendor Invoice #</th>
                <th>Received Date</th>
                <th>Received By</th>
                <th>Inward Details & Notes</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredMaterialIns.map((matIn) => (
                <tr key={matIn.id}>
                  <td style={{ fontWeight: 600, color: "#0F172A" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <ArrowDownLeft size={15} color="#059669" />
                      <span>{matIn.receiptNumber}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: "#2563EB" }}>
                      {matIn.poNumber || `PO #${matIn.purchaseOrderId}`}
                    </span>
                  </td>
                  <td>
                    {matIn.vendorInvoiceNumber ? (
                      <span style={{ fontFamily: "monospace", background: "#F1F5F9", padding: "2px 6px", borderRadius: "4px", color: "#0F172A", fontWeight: 600 }}>
                        {matIn.vendorInvoiceNumber}
                      </span>
                    ) : (
                      <span style={{ color: "#94A3B8" }}>—</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                      <Calendar size={14} />
                      {matIn.receivedDate
                        ? String(matIn.receivedDate)
                        : matIn.createdAt
                          ? new Date(matIn.createdAt).toLocaleDateString()
                          : "—"}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748B" }}>
                      <User size={14} />
                      {matIn.receivedByEmail || "SCM Admin"}
                    </div>
                  </td>
                  <td style={{ color: "#64748B", maxWidth: "260px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {matIn.notes || "—"}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="matin-btn-view"
                      onClick={() => setViewingReceipt(matIn)}
                      title="View Complete Receipt Breakdown"
                    >
                      <Eye size={13} /> View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ========================================================================= */}
      {/* PROCESS MATERIAL IN MODAL                                                */}
      {/* ========================================================================= */}
      {showProcessModal && (
        <div className="matin-modal-overlay" onClick={() => !submitting && setShowProcessModal(false)}>
          <div className="matin-modal" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="matin-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#0F172A", display: "flex", alignItems: "center", gap: "8px" }}>
                  <ArrowDownLeft size={20} color="#10B981" /> Process Material Inward (Receipt)
                </h3>
                <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748B" }}>
                  Follow the standard flow: Select PO → Select Vendor → Invoice Details → Product Details → Quantity → Rate/Tax → Total Amount → Submit.
                </p>
              </div>
              <button
                onClick={() => !submitting && setShowProcessModal(false)}
                disabled={submitting}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B", padding: "4px" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleProcessSubmit}>
              <div className="matin-modal-body">
                {modalDataError && (
                  <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", color: "#DC2626", fontSize: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <AlertCircle size={16} />
                    <span>{modalDataError}</span>
                  </div>
                )}

                {/* 1. PO & VENDOR SELECTION SECTION */}
                <div className="form-section">
                  <div className="form-section-title">
                    <FileCheck2 size={16} color="#2563EB" /> 1. Select Purchase Order & Vendor
                  </div>

                  <div className="grid-2">
                    {/* Select PO */}
                    <div>
                      <label className="form-label">
                        Select Purchase Order <span style={{ color: "#DC2626" }}>*</span>
                      </label>
                      <select
                        className={`form-select ${formErrors.po ? "form-input-error" : ""}`}
                        value={selectedPOId}
                        onChange={(e) => handlePOSelect(e.target.value)}
                        required
                      >
                        <option value="">-- Choose Purchase Order --</option>
                        {loadingModalData ? (
                          <option value="" disabled>Loading Purchase Orders...</option>
                        ) : availablePOsForForm.length === 0 ? (
                          <option value="" disabled>No eligible Purchase Orders available</option>
                        ) : (
                          availablePOsForForm.map((p) => {
                            const vName = p.vendor?.name || p.vendor?.vendorName || p.vendor?.companyName || "Vendor";
                            const poNum = p.poNumber || `PO #${p.id}`;
                            return (
                              <option key={p.id} value={p.id}>
                                {poNum} — {vName} (Status: {p.status || "Approved"})
                              </option>
                            );
                          })
                        )}
                      </select>
                      {formErrors.po && <span className="error-text">{formErrors.po}</span>}
                    </div>

                    {/* Select Vendor */}
                    <div>
                      <label className="form-label">
                        Select Vendor <span style={{ color: "#64748B", fontWeight: 400 }}>(or auto-filled from PO)</span>
                      </label>
                      <select
                        className="form-select"
                        value={selectedVendorId}
                        onChange={(e) => handleVendorSelect(e.target.value)}
                      >
                        <option value="">-- All / Auto-Detect from PO --</option>
                        {vendors.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name || v.companyName || `Vendor #${v.id}`} {v.gstNumber ? `(GST: ${v.gstNumber})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Selected PO Details Card */}
                  {currentPO && (
                    <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "12px", marginTop: "12px", fontSize: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", borderBottom: "1px solid #E2E8F0", paddingBottom: "6px" }}>
                        <span style={{ fontWeight: 700, color: "#0F172A", fontSize: "13px" }}>
                          {currentPO.poNumber || `Purchase Order #${currentPO.id}`}
                        </span>
                        <span className={`badge ${String(currentPO.status).toUpperCase() === "APPROVED" ? "badge-success" : String(currentPO.status).toUpperCase() === "PARTIALLY_FULFILLED" ? "badge-warning" : "badge-info"}`}>
                          Status: {currentPO.status || "Approved"}
                        </span>
                      </div>
                      <div className="grid-3" style={{ gap: "8px", color: "#475569" }}>
                        <div>
                          <strong>Expected Delivery Date:</strong>{" "}
                          <span style={{ color: currentPO.expectedDeliveryDate ? "#0F172A" : "#64748B", fontWeight: 600 }}>
                            {currentPO.expectedDeliveryDate ? String(currentPO.expectedDeliveryDate) : "Not Available"}
                          </span>
                        </div>
                        <div>
                          <strong>Delivery Location:</strong> {currentPO.deliveryLocation || "Warehouse Main"}
                        </div>
                        <div>
                          <strong>Created By:</strong> {currentPO.createdByEmail || "SCM Admin"}
                        </div>
                      </div>
                      {currentPO.termsAndConditions && (
                        <div style={{ marginTop: "6px", color: "#64748B", fontStyle: "italic" }}>
                          Terms: {currentPO.termsAndConditions}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Complete Vendor Details & Vendor Payment Details (Live API Data Only) */}
                  {currentVendor && (
                    <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "8px", padding: "14px", marginTop: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", borderBottom: "1px solid #DCFCE7", paddingBottom: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Building2 size={16} color="#059669" />
                          <span style={{ fontWeight: 700, color: "#065F46", fontSize: "13px" }}>
                            Vendor Details: {currentVendor.name || currentVendor.companyName || "Vendor"}
                          </span>
                        </div>
                        <span className={`badge ${currentVendor.active !== false ? "badge-success" : "badge-neutral"}`}>
                          Status: {currentVendor.active !== undefined ? (currentVendor.active ? "Active" : "Inactive") : (currentVendor.status || "Active")}
                        </span>
                      </div>

                      {/* General Vendor Information */}
                      <div className="grid-3" style={{ fontSize: "12px", color: "#166534", gap: "8px", marginBottom: "12px" }}>
                        <div>
                          <strong>GSTIN / GST:</strong> {currentVendor.gstNumber || "Not Available"}
                        </div>
                        <div>
                          <strong>Contact Person:</strong> {currentVendor.contactPerson || "Not Available"}
                        </div>
                        <div>
                          <strong>Contact Number:</strong> {currentVendor.contactNumber || "Not Available"}
                        </div>
                        <div>
                          <strong>Email:</strong> {currentVendor.email || "Not Available"}
                        </div>
                        <div>
                          <strong>Address:</strong> {currentVendor.address || "Not Available"}
                        </div>
                        <div>
                          <strong>Registration Date:</strong> {currentVendor.createdAt ? new Date(currentVendor.createdAt).toLocaleDateString() : "Not Available"}
                        </div>
                      </div>

                      {/* Vendor Payment Details & Flow Ribbon */}
                      <div style={{ background: "#FFFFFF", border: "1px solid #86EFAC", borderRadius: "8px", padding: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, color: "#15803D" }}>
                            <CreditCard size={15} color="#16A34A" /> Vendor Payment Details & Flow
                          </div>
                          <span style={{ fontSize: "11px", color: "#64748B" }}>
                            From active API contract records
                          </span>
                        </div>

                        {/* Flow: Vendor → Total Payment → Paid Payment → Pending Payment */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "8px 12px", marginBottom: "10px" }}>
                          <div>
                            <span style={{ fontSize: "10px", color: "#64748B", fontWeight: 700, display: "block", textTransform: "uppercase" }}>
                              Vendor
                            </span>
                            <span style={{ fontSize: "12px", fontWeight: 700, color: "#0F172A" }}>
                              {currentVendor.name || currentVendor.companyName || "Vendor"}
                            </span>
                          </div>
                          <div>
                            <span style={{ fontSize: "10px", color: "#64748B", fontWeight: 700, display: "block", textTransform: "uppercase" }}>
                              Total PO Amount
                            </span>
                            <span style={{ fontSize: "12px", fontWeight: 700, color: vendorPaymentInfo.totalPOAmount !== "Not Available" ? "#2563EB" : "#64748B" }}>
                              {vendorPaymentInfo.totalPOAmount}
                            </span>
                          </div>
                          <div>
                            <span style={{ fontSize: "10px", color: "#64748B", fontWeight: 700, display: "block", textTransform: "uppercase" }}>
                              Paid Amount
                            </span>
                            <span style={{ fontSize: "12px", fontWeight: 700, color: vendorPaymentInfo.paidAmount !== "Not Available" ? "#059669" : "#64748B" }}>
                              {vendorPaymentInfo.paidAmount}
                            </span>
                          </div>
                          <div>
                            <span style={{ fontSize: "10px", color: "#64748B", fontWeight: 700, display: "block", textTransform: "uppercase" }}>
                              Pending Amount
                            </span>
                            <span style={{ fontSize: "12px", fontWeight: 700, color: vendorPaymentInfo.pendingAmount !== "Not Available" ? "#D97706" : "#64748B" }}>
                              {vendorPaymentInfo.pendingAmount}
                            </span>
                          </div>
                        </div>

                        {/* Additional Payment Metadata */}
                        <div className="grid-3" style={{ fontSize: "11px", color: "#334155", gap: "8px" }}>
                          <div>
                            <strong>Payment Status:</strong>{" "}
                            <span className="badge badge-neutral" style={{ marginLeft: "4px" }}>
                              {vendorPaymentInfo.paymentStatus}
                            </span>
                          </div>
                          <div>
                            <strong>Payment Method:</strong> {vendorPaymentInfo.paymentMethod}
                          </div>
                          <div>
                            <strong>Commercial Payment Terms:</strong> {vendorPaymentInfo.paymentTerms}
                          </div>
                          <div>
                            <strong>Bank Details:</strong> {vendorPaymentInfo.bankDetails}
                          </div>
                          <div>
                            <strong>Total Vendor POs:</strong> {vendorHistory?.totalPOs ?? "Not Available"}
                          </div>
                          <div>
                            <strong>Fulfilled Receipts:</strong> {vendorHistory?.totalReceipts ?? "Not Available"}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. INVOICE & RECEIPT DETAILS SECTION */}
                <div className="form-section">
                  <div className="form-section-title">
                    <Receipt size={16} color="#059669" /> 2. Invoice & Receipt Details
                  </div>

                  <div className="grid-4">
                    {/* Invoice Number */}
                    <div>
                      <label className="form-label">
                        Invoice Number <span style={{ color: "#DC2626" }}>*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-input ${formErrors.invoiceNumber ? "form-input-error" : ""}`}
                        placeholder="e.g. INV-2026-0042"
                        value={vendorInvoiceNumber}
                        onChange={(e) => {
                          setVendorInvoiceNumber(e.target.value);
                          setFormErrors((prev) => ({ ...prev, invoiceNumber: null }));
                        }}
                        required
                      />
                      {formErrors.invoiceNumber && <span className="error-text">{formErrors.invoiceNumber}</span>}
                    </div>

                    {/* Invoice Date */}
                    <div>
                      <label className="form-label">Invoice Date</label>
                      <input
                        type="date"
                        className="form-input"
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                      />
                    </div>

                    {/* Received Date */}
                    <div>
                      <label className="form-label">
                        Received Date <span style={{ color: "#DC2626" }}>*</span>
                      </label>
                      <input
                        type="date"
                        className={`form-input ${formErrors.receivedDate ? "form-input-error" : ""}`}
                        value={receivedDate}
                        onChange={(e) => {
                          setReceivedDate(e.target.value);
                          setFormErrors((prev) => ({ ...prev, receivedDate: null }));
                        }}
                        required
                      />
                      {formErrors.receivedDate && <span className="error-text">{formErrors.receivedDate}</span>}
                    </div>

                    {/* Serial Number */}
                    <div>
                      <label className="form-label">Serial Number(s)</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. SN-89212, SN-89213"
                        value={serialNumber}
                        onChange={(e) => setSerialNumber(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* 3. PRODUCT DETAILS & QUANTITY INWARD SECTION */}
                <div className="form-section">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                    <div className="form-section-title" style={{ margin: 0 }}>
                      <Package size={16} color="#7C3AED" /> 3. Product Details & Quantity Inward
                    </div>

                    {/* Category Dropdown */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>Category Filter:</span>
                      <select
                        className="form-select"
                        style={{ width: "160px", padding: "4px 8px", fontSize: "12px" }}
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                      >
                        {availableCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Quantity Inward Flow Summary Ribbon */}
                  {currentPO && (
                    <div className="flow-pill-container">
                      <div className="flow-pill">
                        <span className="flow-pill-label">PO Quantity (Ordered)</span>
                        <span className="flow-pill-val" style={{ color: "#2563EB" }}>
                          {poQuantitySummary.totalOrdered} units
                        </span>
                      </div>
                      <ArrowRight size={14} color="#94A3B8" />

                      <div className="flow-pill">
                        <span className="flow-pill-label">Prev Inwarded</span>
                        <span className="flow-pill-val" style={{ color: "#059669" }}>
                          {poQuantitySummary.totalPrevReceived} units
                        </span>
                      </div>
                      <ArrowRight size={14} color="#94A3B8" />

                      <div className="flow-pill">
                        <span className="flow-pill-label">Current Received Qty</span>
                        <span className="flow-pill-val" style={{ color: "#7C3AED" }}>
                          {poQuantitySummary.totalCurrentInward} units
                        </span>
                      </div>
                      <ArrowRight size={14} color="#94A3B8" />

                      <div className="flow-pill">
                        <span className="flow-pill-label">Remaining / Pending</span>
                        <span className="flow-pill-val" style={{ color: poQuantitySummary.totalRemaining > 0 ? "#D97706" : "#64748B" }}>
                          {poQuantitySummary.totalRemaining} units
                        </span>
                      </div>
                      <ArrowRight size={14} color="#94A3B8" />

                      <div className="flow-pill">
                        <span className="flow-pill-label">Expected Delivery</span>
                        <span className="flow-pill-val" style={{ fontSize: "12px", color: poQuantitySummary.expectedDeliveryDate !== "Not Available" ? "#0F172A" : "#64748B" }}>
                          {poQuantitySummary.expectedDeliveryDate}
                        </span>
                      </div>
                    </div>
                  )}

                  {!currentPO ? (
                    <div style={{ padding: "24px", textAlign: "center", background: "#F8FAFC", borderRadius: "6px", color: "#64748B", fontSize: "13px" }}>
                      <FileCheck2 size={24} style={{ margin: "0 auto 6px auto", opacity: 0.5 }} />
                      Please select a Purchase Order above to view and inward line items.
                    </div>
                  ) : filteredPOItems.length === 0 ? (
                    <div style={{ padding: "20px", textAlign: "center", background: "#F8FAFC", borderRadius: "6px", color: "#64748B", fontSize: "13px" }}>
                      No items found in this PO matching the category "{selectedCategory}".
                    </div>
                  ) : (
                    <div style={{ border: "1px solid #E2E8F0", borderRadius: "8px", overflow: "hidden" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                        <thead>
                          <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", color: "#475569" }}>
                            <th style={{ padding: "10px", textAlign: "left" }}>Product Specifications</th>
                            <th style={{ padding: "10px", textAlign: "center", width: "100px" }}>Ordered / PO Qty</th>
                            <th style={{ padding: "10px", textAlign: "center", width: "100px" }}>Prev Received</th>
                            <th style={{ padding: "10px", textAlign: "center", width: "100px" }}>Remaining / Pending</th>
                            <th style={{ padding: "10px", textAlign: "right", width: "120px" }}>Current Received *</th>
                            <th style={{ padding: "10px", textAlign: "right", width: "100px" }}>Rate / Unit (₹)</th>
                            <th style={{ padding: "10px", textAlign: "right", width: "100px" }}>Item Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPOItems.map((it) => {
                            const remaining = (it.quantity || 0) - (it.receivedQuantity || 0);
                            const recQty = itemQuantities[it.id] !== undefined ? itemQuantities[it.id] : "";
                            const rateVal = itemRates[it.id] !== undefined ? itemRates[it.id] : 0;
                            const itemTotal = (Number(recQty) || 0) * (Number(rateVal) || 0);
                            const prod = it.product || {};
                            const itemExpectedDelivery = currentPO.expectedDeliveryDate ? String(currentPO.expectedDeliveryDate) : null;

                            return (
                              <tr key={it.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                                <td style={{ padding: "10px" }}>
                                  <div style={{ fontWeight: 600, color: "#0F172A", fontSize: "13px" }}>
                                    {prod.name || prod.productName || `Item #${it.id}`}
                                  </div>
                                  <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>
                                    {prod.category && <span style={{ background: "#F1F5F9", padding: "1px 5px", borderRadius: "3px", marginRight: "6px" }}>{prod.category}</span>}
                                    {prod.modelNumber && <span>Model: {prod.modelNumber} • </span>}
                                    {prod.brand && <span>Brand: {prod.brand} • </span>}
                                    {prod.specString ? prod.specString : (prod.voltage || prod.capacity) ? `${prod.voltage || ""} ${prod.capacity || ""}` : ""}
                                  </div>
                                  {itemExpectedDelivery && (
                                    <div style={{ fontSize: "11px", color: "#2563EB", marginTop: "3px", display: "flex", alignItems: "center", gap: "4px" }}>
                                      <Clock size={11} /> Expected Delivery: {itemExpectedDelivery}
                                    </div>
                                  )}
                                </td>
                                <td style={{ padding: "10px", textAlign: "center", fontWeight: 600, color: "#334155" }}>
                                  {it.quantity !== undefined && it.quantity !== null ? it.quantity : "Not Available"}
                                </td>
                                <td style={{ padding: "10px", textAlign: "center", color: "#059669", fontWeight: 600 }}>
                                  {it.receivedQuantity !== undefined && it.receivedQuantity !== null ? it.receivedQuantity : 0}
                                </td>
                                <td style={{ padding: "10px", textAlign: "center" }}>
                                  <span className={`badge ${remaining > 0 ? "badge-warning" : "badge-info"}`}>
                                    {remaining}
                                  </span>
                                </td>
                                <td style={{ padding: "10px", textAlign: "right" }}>
                                  <input
                                    type="number"
                                    min="0"
                                    max={remaining}
                                    value={recQty}
                                    onChange={(e) => handleQtyChange(it.id, e.target.value)}
                                    disabled={remaining <= 0}
                                    className={`form-input ${formErrors[`item_${it.id}`] ? "form-input-error" : ""}`}
                                    style={{ width: "95px", textAlign: "right", fontWeight: 700 }}
                                  />
                                  {formErrors[`item_${it.id}`] && (
                                    <div style={{ color: "#DC2626", fontSize: "10px", marginTop: "2px" }}>
                                      {formErrors[`item_${it.id}`]}
                                    </div>
                                  )}
                                </td>
                                <td style={{ padding: "10px", textAlign: "right" }}>
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    placeholder="0.00"
                                    value={rateVal}
                                    onChange={(e) => handleRateChange(it.id, e.target.value)}
                                    className="form-input"
                                    style={{ width: "90px", textAlign: "right" }}
                                  />
                                </td>
                                <td style={{ padding: "10px", textAlign: "right", fontWeight: 600, color: "#0F172A" }}>
                                  ₹{itemTotal.toFixed(2)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {formErrors.general && (
                    <div style={{ color: "#DC2626", fontSize: "12px", marginTop: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <AlertCircle size={14} /> {formErrors.general}
                    </div>
                  )}
                </div>

                {/* 4. FINANCIAL TOTAL & TAX CALCULATION SECTION */}
                <div className="form-section">
                  <div className="form-section-title">
                    <DollarSign size={16} color="#D97706" /> 4. Rate, Tax & Total Calculation
                  </div>

                  <div className="grid-2" style={{ alignItems: "start" }}>
                    {/* Tax configuration */}
                    <div>
                      <label className="form-label">Tax Specification</label>
                      <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
                        <label style={{ fontSize: "12px", color: "#334155", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                          <input
                            type="radio"
                            name="taxType"
                            checked={!useCustomTax}
                            onChange={() => setUseCustomTax(false)}
                          />
                          Tax Rate Percentage (%)
                        </label>
                        <label style={{ fontSize: "12px", color: "#334155", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                          <input
                            type="radio"
                            name="taxType"
                            checked={useCustomTax}
                            onChange={() => setUseCustomTax(true)}
                          />
                          Fixed Custom Tax Amount (₹)
                        </label>
                      </div>

                      {!useCustomTax ? (
                        <div style={{ display: "flex", gap: "8px" }}>
                          {[0, 5, 12, 18, 28].map((pct) => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => setTaxPercent(pct)}
                              style={{
                                padding: "4px 10px",
                                borderRadius: "4px",
                                fontSize: "12px",
                                fontWeight: 600,
                                border: taxPercent === pct ? "1px solid #10B981" : "1px solid #CBD5E1",
                                background: taxPercent === pct ? "#ECFDF5" : "#FFFFFF",
                                color: taxPercent === pct ? "#059669" : "#475569",
                                cursor: "pointer"
                              }}
                            >
                              {pct}% GST
                            </button>
                          ))}
                        </div>
                      ) : (
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="Enter exact tax amount in ₹"
                          value={customTaxAmount}
                          onChange={(e) => setCustomTaxAmount(e.target.value)}
                          className="form-input"
                          style={{ maxWidth: "240px" }}
                        />
                      )}

                      {/* Inward Notes / Remarks */}
                      <div style={{ marginTop: "14px" }}>
                        <label className="form-label">Inward Remarks / Quality Notes</label>
                        <textarea
                          rows={2}
                          className="form-input"
                          placeholder="e.g. Material received in good condition, batch inspected by QC"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Live Calculation Summary Box */}
                    <div className="calc-summary-card">
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "#1E293B", marginBottom: "10px", borderBottom: "1px solid #CBD5E1", paddingBottom: "6px" }}>
                        Calculation Summary: Total Amount = (Received Qty × Rate) + Tax
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#475569", marginBottom: "6px" }}>
                        <span>Total Line Units to Inward:</span>
                        <strong style={{ color: "#0F172A" }}>{calculatedTotals.totalItemsCount} units</strong>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#475569", marginBottom: "6px" }}>
                        <span>Subtotal (Qty × Rate):</span>
                        <strong style={{ color: "#0F172A" }}>₹{calculatedTotals.subtotal.toFixed(2)}</strong>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#475569", marginBottom: "8px" }}>
                        <span>Tax ({useCustomTax ? "Fixed Custom" : `${taxPercent}% GST`}):</span>
                        <strong style={{ color: "#0F172A" }}>+ ₹{calculatedTotals.taxAmount.toFixed(2)}</strong>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px", fontWeight: 700, color: "#059669", borderTop: "1px dashed #CBD5E1", paddingTop: "8px" }}>
                        <span>Total Inward Amount:</span>
                        <span>₹{calculatedTotals.grandTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="matin-modal-footer">
                <div style={{ fontSize: "12px", color: "#64748B" }}>
                  {calculatedTotals.totalItemsCount > 0 ? (
                    <span>
                      Ready to inward <b>{calculatedTotals.totalItemsCount}</b> items (Total Value: <b>₹{calculatedTotals.grandTotal.toFixed(2)}</b>)
                    </span>
                  ) : (
                    <span>Select items and quantities above to proceed</span>
                  )}
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    className="matin-btn-secondary"
                    onClick={() => setShowProcessModal(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="matin-btn-primary"
                    disabled={
                      submitting ||
                      !selectedPOId ||
                      String(currentPO?.status || "").toUpperCase() === "DRAFT" ||
                      calculatedTotals.totalItemsCount === 0
                    }
                  >
                    {submitting ? (
                      <>
                        <RefreshCw size={14} className="spin" /> Submitting Inward...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} /> Confirm & Inward Stock
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PROFESSIONAL VIEW DETAILS MODAL / DRAWER                                  */}
      {/* ========================================================================= */}
      {viewingReceipt && detailedViewData && (
        <div className="matin-modal-overlay" onClick={() => setViewingReceipt(null)}>
          <div className="matin-modal" style={{ maxWidth: "980px" }} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="matin-modal-header" style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "38px", height: "38px", borderRadius: "8px", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", color: "#059669" }}>
                  <Receipt size={20} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#0F172A" }}>
                      Material IN Details: #{viewingReceipt.receiptNumber}
                    </h3>
                    <span className="badge badge-success">
                      <CheckCircle2 size={12} style={{ marginRight: "3px" }} /> Inwarded & Verified
                    </span>
                  </div>
                  <span style={{ fontSize: "12px", color: "#64748B" }}>
                    Purchase Order: <strong style={{ color: "#2563EB" }}>{detailedViewData.po?.poNumber || `PO #${viewingReceipt.purchaseOrderId}`}</strong>
                  </span>
                </div>
              </div>
              <button
                onClick={() => setViewingReceipt(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B", padding: "6px", borderRadius: "6px" }}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="matin-modal-body" style={{ background: "#F8FAFC", padding: "18px 22px" }}>
              {/* SECTION 1: MATERIAL IN / RECEIPT SUMMARY */}
              <div className="view-section-card">
                <div className="view-section-header">
                  <div className="view-section-title">
                    <Receipt size={16} color="#059669" /> 1. Material IN / Receipt Summary
                  </div>
                  <span className="badge badge-info">
                    PO Status: {detailedViewData.po?.status || "Approved"}
                  </span>
                </div>

                <div className="grid-4" style={{ gap: "14px" }}>
                  <div className="data-item">
                    <span className="data-label">Material IN / Receipt #</span>
                    <span className="data-value" style={{ fontWeight: 700, color: "#059669" }}>
                      {viewingReceipt.receiptNumber || "Not Available"}
                    </span>
                  </div>

                  <div className="data-item">
                    <span className="data-label">PO Number</span>
                    <span className="data-value" style={{ fontWeight: 700, color: "#2563EB" }}>
                      {detailedViewData.po?.poNumber || `PO #${viewingReceipt.purchaseOrderId}`}
                    </span>
                  </div>

                  <div className="data-item">
                    <span className="data-label">Vendor Name</span>
                    <span className="data-value" style={{ fontWeight: 600 }}>
                      {detailedViewData.vendor?.name || detailedViewData.vendor?.companyName || "Not Available"}
                    </span>
                  </div>

                  <div className="data-item">
                    <span className="data-label">Status</span>
                    <span className="data-value">
                      <span className="badge badge-success">Inwarded</span>
                    </span>
                  </div>

                  <div className="data-item">
                    <span className="data-label">Vendor Invoice Number</span>
                    <span className="data-value" style={{ fontFamily: "monospace", fontWeight: 600, color: "#0F172A" }}>
                      {viewingReceipt.vendorInvoiceNumber || "Not Available"}
                    </span>
                  </div>

                  <div className="data-item">
                    <span className="data-label">Invoice Date</span>
                    <span className="data-value">
                      {detailedViewData.parsedInvoiceDate}
                    </span>
                  </div>

                  <div className="data-item">
                    <span className="data-label">Received Date</span>
                    <span className="data-value" style={{ fontWeight: 600 }}>
                      {detailedViewData.parsedReceivedDate}
                    </span>
                  </div>

                  <div className="data-item">
                    <span className="data-label">Delivery Location</span>
                    <span className="data-value">
                      {detailedViewData.po?.deliveryLocation || "Warehouse Main"}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 2: VENDOR DETAILS */}
              <div className="view-section-card">
                <div className="view-section-header">
                  <div className="view-section-title">
                    <Building2 size={16} color="#2563EB" /> 2. Vendor Details
                  </div>
                  {detailedViewData.vendor?.gstNumber && (
                    <span className="badge badge-neutral">
                      GSTIN: {detailedViewData.vendor.gstNumber}
                    </span>
                  )}
                </div>

                <div className="grid-3" style={{ gap: "14px" }}>
                  <div className="data-item">
                    <span className="data-label">Vendor / Company Name</span>
                    <span className="data-value" style={{ fontWeight: 700 }}>
                      {detailedViewData.vendor?.name || detailedViewData.vendor?.companyName || "Not Available"}
                    </span>
                  </div>

                  <div className="data-item">
                    <span className="data-label">GST Number</span>
                    <span className="data-value" style={{ fontFamily: "monospace" }}>
                      {detailedViewData.vendor?.gstNumber || "Not Available"}
                    </span>
                  </div>

                  <div className="data-item">
                    <span className="data-label">Contact Person</span>
                    <span className="data-value">
                      {detailedViewData.vendor?.contactPerson || "Not Available"}
                    </span>
                  </div>

                  <div className="data-item">
                    <span className="data-label">Mobile / Contact</span>
                    <span className="data-value">
                      {detailedViewData.vendor?.contactNumber || "Not Available"}
                    </span>
                  </div>

                  <div className="data-item">
                    <span className="data-label">Email Address</span>
                    <span className="data-value">
                      {detailedViewData.vendor?.email || "Not Available"}
                    </span>
                  </div>

                  <div className="data-item">
                    <span className="data-label">Address</span>
                    <span className="data-value">
                      {detailedViewData.vendor?.address || "Not Available"}
                    </span>
                  </div>

                  <div className="data-item">
                    <span className="data-label">Commercial Payment Terms</span>
                    <span className="data-value">
                      {detailedViewData.vendor?.paymentTerms || detailedViewData.po?.paymentTerms || "Not Available"}
                    </span>
                  </div>

                  <div className="data-item">
                    <span className="data-label">Bank Details</span>
                    <span className="data-value">
                      {detailedViewData.vendor?.bankDetails || "Not Available"}
                    </span>
                  </div>

                  <div className="data-item">
                    <span className="data-label">Vendor Active Status</span>
                    <span className="data-value">
                      {detailedViewData.vendor?.active !== undefined
                        ? detailedViewData.vendor.active
                          ? "Active"
                          : "Inactive"
                        : "Not Available"}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 3 & 4: PRODUCT DETAILS & QUANTITY DETAILS */}
              <div className="view-section-card">
                <div className="view-section-header">
                  <div className="view-section-title">
                    <Package size={16} color="#7C3AED" /> 3 & 4. Product Details & Quantity Breakdown
                  </div>
                  <span style={{ fontSize: "11px", color: "#64748B" }}>
                    Serial No: <strong>{detailedViewData.parsedSerialNumbers}</strong>
                  </span>
                </div>

                {/* Ordered → Received → Remaining Quantity Cards Flow */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "14px" }}>
                  <div className="highlight-card" style={{ background: "#EFF6FF", borderColor: "#BFDBFE" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#1E40AF", textTransform: "uppercase" }}>
                      1. Ordered / PO Quantity
                    </span>
                    <div className="highlight-card-num" style={{ color: "#1D4ED8" }}>
                      {detailedViewData.totalOrderedQty > 0 ? `${detailedViewData.totalOrderedQty} Units` : "Not Available"}
                    </div>
                  </div>

                  <div className="highlight-card" style={{ background: "#ECFDF5", borderColor: "#A7F3D0" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#065F46", textTransform: "uppercase" }}>
                      2. Total Received Quantity
                    </span>
                    <div className="highlight-card-num" style={{ color: "#047857" }}>
                      {detailedViewData.totalReceivedQty > 0 ? `${detailedViewData.totalReceivedQty} Units` : "Not Available"}
                    </div>
                  </div>

                  <div className="highlight-card" style={{ background: "#FFFBEB", borderColor: "#FDE68A" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#92400E", textTransform: "uppercase" }}>
                      3. Remaining / Pending Qty
                    </span>
                    <div className="highlight-card-num" style={{ color: detailedViewData.totalRemainingQty > 0 ? "#B45309" : "#4B5563" }}>
                      {detailedViewData.totalOrderedQty > 0 ? `${detailedViewData.totalRemainingQty} Units` : "Not Available"}
                    </div>
                  </div>
                </div>

                {/* Products Table */}
                {detailedViewData.items.length === 0 ? (
                  <div style={{ padding: "14px", background: "#F8FAFC", borderRadius: "6px", fontSize: "12px", color: "#64748B" }}>
                    Line item specifications not directly attached to receipt payload. (PO Reference: #{viewingReceipt.purchaseOrderId})
                  </div>
                ) : (
                  <div style={{ border: "1px solid #E2E8F0", borderRadius: "8px", overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                      <thead>
                        <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", color: "#475569" }}>
                          <th style={{ padding: "8px 12px", textAlign: "left" }}>Product Specifications</th>
                          <th style={{ padding: "8px 12px", textAlign: "left" }}>Category / Brand</th>
                          <th style={{ padding: "8px 12px", textAlign: "center" }}>Ordered Qty</th>
                          <th style={{ padding: "8px 12px", textAlign: "center" }}>Received Qty</th>
                          <th style={{ padding: "8px 12px", textAlign: "center" }}>Remaining</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailedViewData.items.map((it) => {
                          const prod = it.product || {};
                          const rem = (it.quantity || 0) - (it.receivedQuantity || 0);
                          return (
                            <tr key={it.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                              <td style={{ padding: "8px 12px" }}>
                                <div style={{ fontWeight: 600, color: "#0F172A" }}>
                                  {prod.name || prod.productName || `Item #${it.id}`}
                                </div>
                                <div style={{ fontSize: "11px", color: "#64748B" }}>
                                  {prod.modelNumber && <span>Model: {prod.modelNumber} • </span>}
                                  {prod.chemistry && <span>Chemistry: {prod.chemistry} • </span>}
                                  {prod.specString || (prod.voltage && prod.capacity ? `${prod.voltage} ${prod.capacity}` : "")}
                                </div>
                              </td>
                              <td style={{ padding: "8px 12px", color: "#475569" }}>
                                <div>{prod.category || "General"}</div>
                                <div style={{ fontSize: "11px", color: "#64748B" }}>{prod.brand || "—"}</div>
                              </td>
                              <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600 }}>
                                {it.quantity !== undefined ? it.quantity : "Not Available"}
                              </td>
                              <td style={{ padding: "8px 12px", textAlign: "center", color: "#059669", fontWeight: 600 }}>
                                {it.receivedQuantity !== undefined ? it.receivedQuantity : 0}
                              </td>
                              <td style={{ padding: "8px 12px", textAlign: "center" }}>
                                <span className={`badge ${rem > 0 ? "badge-warning" : "badge-info"}`}>
                                  {rem}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* SECTION 5: PAYMENT / AMOUNT DETAILS */}
              <div className="view-section-card">
                <div className="view-section-header">
                  <div className="view-section-title">
                    <DollarSign size={16} color="#D97706" /> 5. Payment / Amount Details
                  </div>
                  <span className="badge badge-neutral">
                    Payment Status: {detailedViewData.po?.paymentStatus || detailedViewData.vendor?.paymentStatus || "Not Available"}
                  </span>
                </div>

                <div className="grid-4" style={{ gap: "14px" }}>
                  <div className="data-item">
                    <span className="data-label">Subtotal</span>
                    <span className="data-value" style={{ fontWeight: 600 }}>
                      {detailedViewData.parsedSubtotal !== "Not Available"
                        ? detailedViewData.parsedSubtotal
                        : detailedViewData.po?.netAmount
                          ? `₹${Number(detailedViewData.po.netAmount).toLocaleString("en-IN")}`
                          : "Not Available"}
                    </span>
                  </div>

                  <div className="data-item">
                    <span className="data-label">Tax / GST Specification</span>
                    <span className="data-value">
                      {detailedViewData.parsedTax}
                    </span>
                  </div>

                  <div className="data-item">
                    <span className="data-label">Total Amount</span>
                    <span className="data-value" style={{ fontSize: "15px", fontWeight: 700, color: "#059669" }}>
                      {detailedViewData.parsedTotal !== "Not Available"
                        ? detailedViewData.parsedTotal
                        : detailedViewData.po?.totalAmount
                          ? `₹${Number(detailedViewData.po.totalAmount).toLocaleString("en-IN")}`
                          : "Not Available"}
                    </span>
                  </div>

                  <div className="data-item">
                    <span className="data-label">Paid Amount</span>
                    <span className="data-value">
                      {detailedViewData.po?.paidAmount !== undefined && detailedViewData.po?.paidAmount !== null
                        ? `₹${Number(detailedViewData.po.paidAmount).toLocaleString("en-IN")}`
                        : detailedViewData.vendor?.paidAmount !== undefined && detailedViewData.vendor?.paidAmount !== null
                          ? `₹${Number(detailedViewData.vendor.paidAmount).toLocaleString("en-IN")}`
                          : "Not Available"}
                    </span>
                  </div>

                  <div className="data-item">
                    <span className="data-label">Pending Amount</span>
                    <span className="data-value">
                      {detailedViewData.po?.pendingAmount !== undefined && detailedViewData.po?.pendingAmount !== null
                        ? `₹${Number(detailedViewData.po.pendingAmount).toLocaleString("en-IN")}`
                        : detailedViewData.vendor?.pendingAmount !== undefined && detailedViewData.vendor?.pendingAmount !== null
                          ? `₹${Number(detailedViewData.vendor.pendingAmount).toLocaleString("en-IN")}`
                          : "Not Available"}
                    </span>
                  </div>

                  <div className="data-item">
                    <span className="data-label">Payment Method</span>
                    <span className="data-value">
                      {detailedViewData.vendor?.paymentMethod || detailedViewData.po?.paymentMethod || "Not Available"}
                    </span>
                  </div>

                  <div className="data-item">
                    <span className="data-label">Payment Terms</span>
                    <span className="data-value">
                      {detailedViewData.vendor?.paymentTerms || detailedViewData.po?.paymentTerms || "Not Available"}
                    </span>
                  </div>

                  <div className="data-item">
                    <span className="data-label">Bank Details</span>
                    <span className="data-value">
                      {detailedViewData.vendor?.bankDetails || "Not Available"}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 6: ADDITIONAL INFORMATION */}
              <div className="view-section-card" style={{ marginBottom: 0 }}>
                <div className="view-section-header">
                  <div className="view-section-title">
                    <Info size={16} color="#64748B" /> 6. Additional Information & Audit
                  </div>
                </div>

                <div className="grid-3" style={{ gap: "14px", marginBottom: "12px" }}>
                  <div className="data-item">
                    <span className="data-label">Received By / Handled By</span>
                    <span className="data-value" style={{ fontWeight: 600 }}>
                      {viewingReceipt.receivedByEmail || "SCM Admin"}
                    </span>
                  </div>

                  <div className="data-item">
                    <span className="data-label">Created Date / Timestamp</span>
                    <span className="data-value">
                      {viewingReceipt.createdAt ? new Date(viewingReceipt.createdAt).toLocaleString() : "Not Available"}
                    </span>
                  </div>

                  <div className="data-item">
                    <span className="data-label">PO Approved By</span>
                    <span className="data-value">
                      {detailedViewData.po?.approvedByEmail || "SCM Approver"}
                    </span>
                  </div>
                </div>

                <div className="data-item" style={{ background: "#F8FAFC", padding: "10px 12px", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
                  <span className="data-label" style={{ marginBottom: "4px" }}>Inward Quality Remarks / Notes</span>
                  <p style={{ margin: 0, fontSize: "12px", color: "#334155", lineHeight: "1.5", whiteSpace: "pre-wrap" }}>
                    {detailedViewData.parsedRemarks || "No remarks noted on this inward receipt."}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="matin-modal-footer">
              <span style={{ fontSize: "12px", color: "#64748B" }}>
                Receipt #{viewingReceipt.receiptNumber} verified in ERP Stock Ledger
              </span>
              <button className="matin-btn-secondary" onClick={() => setViewingReceipt(null)}>
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
