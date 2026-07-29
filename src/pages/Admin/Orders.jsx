import React, { useState, useEffect, useMemo } from "react";
import { orderService } from "../../services/orderService";
import {
  Package,
  Plus,
  Edit2,
  CheckCircle,
  Truck,
  Search,
  RefreshCw,
  X,
  Calendar,
  User,
  FileText,
  Phone,
  ShieldCheck,
  Barcode,
  ArrowRight,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Layers,
  Sparkles,
  ShoppingBag,
  Box,
  MapPin
} from "lucide-react";

export default function Orders({ baseUrl, userRole: propUserRole }) {
  // Determine effective user role
  const token = localStorage.getItem("token");
  let role = propUserRole || localStorage.getItem("userRole") || "ADMIN";

  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const authorities = [];
      if (Array.isArray(payload.authorities)) {
        authorities.push(...payload.authorities.map((a) => String(a).toUpperCase()));
      } else if (typeof payload.authorities === "string") {
        authorities.push(payload.authorities.toUpperCase());
      }
      if (payload.role) authorities.push(String(payload.role).toUpperCase());
      if (payload.roles) {
        if (Array.isArray(payload.roles)) {
          authorities.push(...payload.roles.map((r) => String(r).toUpperCase()));
        } else if (typeof payload.roles === "string") {
          authorities.push(payload.roles.toUpperCase());
        }
      }
      if (authorities.includes("SALES_ADMIN") || authorities.includes("ROLE_SALES_ADMIN")) {
        role = "SALES_ADMIN";
      } else if (authorities.includes("PRODUCTION_ADMIN") || authorities.includes("ROLE_PRODUCTION_ADMIN")) {
        role = "PRODUCTION_ADMIN";
      } else if (authorities.includes("SCM_ADMIN") || authorities.includes("ROLE_SCM_ADMIN")) {
        role = "SCM_ADMIN";
      } else if (authorities.includes("ADMINISTRATOR") || authorities.includes("ADMIN") || authorities.includes("ROLE_ADMIN")) {
        role = "ADMIN";
      } else if (authorities.includes("ADMIN_STAFF") || authorities.includes("ROLE_ADMIN_STAFF")) {
        role = "ADMIN_STAFF";
      }
    } catch (e) {
      console.error("Token decode error in Orders:", e);
    }
  }

  const isSuperAdmin = role === "ADMIN" || role === "ADMIN_STAFF";
  const isSalesAdmin = role === "SALES_ADMIN";
  const isProductionAdmin = role === "PRODUCTION_ADMIN";
  const isScmAdmin = role === "SCM_ADMIN";

  // State
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' }

  // Super Admin view mode tab (All, Sales, Production, SCM)
  const [adminStageTab, setAdminStageTab] = useState("ALL");

  // Search, Filters, Date Range, Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Selected Order for Details Drawer
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showScmModal, setShowScmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Registered Users for Customer Search
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Warranty Registration Modal State
  const [showWarrantyModal, setShowWarrantyModal] = useState(false);
  const [warrantyModalData, setWarrantyModalData] = useState(null);

  // Product Details Parser & Formatter Helpers
  const PROJECT_OPTIONS = [
    "Solar Battery",
    "EV Battery",
    "Inverter Battery",
    "Robotics Battery",
    "Defence Battery",
    "Medical Battery",
    "Spray Pump Battery",
    "Other"
  ];

  const parseProductDetails = (str = "") => {
    if (!str) return { project: "EV Battery", customProject: "", voltage: "02", capacity: "3", chemistry: "NMC", notes: "" };
    let project = "EV Battery";
    let customProject = "";

    const matchedOption = PROJECT_OPTIONS.find((opt) => str.toLowerCase().includes(opt.toLowerCase()));
    if (matchedOption) {
      project = matchedOption;
    } else if (str.includes(" - ")) {
      const parts = str.split(" - ");
      if (parts[0] && parts[0].trim()) {
        project = "Other";
        customProject = parts[0].trim();
      }
    }

    const vMatch = str.match(/(\d+)\s*V/i);
    const ahMatch = str.match(/(\d+)\s*Ah/i);
    const chemMatch = str.match(/Chemistry\s*=\s*([A-Za-z0-9\s-]+)/i);
    const notesMatch = str.match(/\(([^)]+)\)/);
    return {
      project,
      customProject,
      voltage: vMatch ? vMatch[1] : "",
      capacity: ahMatch ? ahMatch[1] : "",
      chemistry: chemMatch ? chemMatch[1].trim() : "NMC",
      notes: notesMatch ? notesMatch[1].trim() : (vMatch || ahMatch || chemMatch ? "" : str)
    };
  };

  const formatProductDetails = ({ project, customProject, voltage, capacity, chemistry, notes }) => {
    const proj = project === "Other" ? (customProject || "Other") : (project || "EV Battery");
    const v = voltage !== undefined && voltage !== "" ? `${voltage.toString().padStart(2, "0")}V` : "";
    const ah = capacity !== undefined && capacity !== "" ? `${capacity}Ah` : "";
    const chem = chemistry ? `Chemistry = ${chemistry}` : "";
    const mainSpecs = [v, ah].filter(Boolean).join(" ");
    const specLine = [mainSpecs, chem].filter(Boolean).join("  ");
    const fullSpec = notes && notes.trim() ? `${specLine}${specLine ? " " : ""}(${notes.trim()})` : specLine;
    return `${proj} - ${fullSpec}`;
  };

  const createDefaultOrderItem = () => ({
    id: Date.now() + Math.random(),
    project: "EV Battery",
    customProject: "",
    voltage: "02",
    capacity: "3",
    chemistry: "NMC",
    notes: "",
    productDetails: "EV Battery - 02V 3Ah Chemistry = NMC",
    quantity: 1
  });

  const [recordPaymentAmount, setRecordPaymentAmount] = useState("");

  // Form Data States
  const [salesFormData, setSalesFormData] = useState({
    assignedUserId: null,
    customerName: "",
    customerEmail: "",
    mobileNumber: "",
    piNumber: "",
    orderItems: [createDefaultOrderItem()],
    expectedDeliveryDate: "",
    totalInvoiceAmount: "",
    receivedAmount: "",
    priority: "medium",
    gstNumber: "",
    address: "",
  });
  const [salesFormErrors, setSalesFormErrors] = useState({});

  // Local Shipping and Pricing states for the detail drawer
  const [localShippingAddress, setLocalShippingAddress] = useState("");
  const [localCity, setLocalCity] = useState("");
  const [localState, setLocalState] = useState("");
  const [localPincode, setLocalPincode] = useState("");
  const [localUnitPrice, setLocalUnitPrice] = useState("");
  const [localGstRate, setLocalGstRate] = useState("18");
  const [localCourierName, setLocalCourierName] = useState("");
  const [localTrackingId, setLocalTrackingId] = useState("");
  const [isEditingShippingDetails, setIsEditingShippingDetails] = useState(false);

  useEffect(() => {
    if (selectedOrder) {
      const orderId = selectedOrder.id;
      const savedAddress = localStorage.getItem(`order_shipping_address_${orderId}`) || selectedOrder.address || "";
      setLocalShippingAddress(savedAddress);
      setLocalCity(localStorage.getItem(`order_city_${orderId}`) || "");
      setLocalState(localStorage.getItem(`order_state_${orderId}`) || "");
      setLocalPincode(localStorage.getItem(`order_pincode_${orderId}`) || "");
      setLocalUnitPrice(localStorage.getItem(`order_unit_price_${orderId}`) || "786");
      setLocalGstRate(localStorage.getItem(`order_gst_rate_${orderId}`) || "18");
      setLocalCourierName(localStorage.getItem(`order_courier_name_${orderId}`) || selectedOrder.courierName || "");
      setLocalTrackingId(localStorage.getItem(`order_tracking_id_${orderId}`) || selectedOrder.trackingId || "");
      setIsEditingShippingDetails(false);
    }
  }, [selectedOrder]);

  const [editOrderData, setEditOrderData] = useState(null);
  const [editFormErrors, setEditFormErrors] = useState({});

  // Drawer Inline Product Details Edit State
  const [isEditingDrawerProductDetails, setIsEditingDrawerProductDetails] = useState(false);
  const [drawerOrderItems, setDrawerOrderItems] = useState([]);

  const [scmFormData, setScmFormData] = useState({
    invoiceNumber: "",
    courierName: "",
    trackingId: "",
  });
  const [scmItemDetails, setScmItemDetails] = useState([]);
  const [scmFormErrors, setScmFormErrors] = useState({});
  const [orderForScm, setOrderForScm] = useState(null);

  // Toast Helper
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch Orders based on role (All roles fetch complete order history)
  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      let data = [];
      try {
        // Fetch complete system order history across all stages
        data = await orderService.adminGetAllOrders();
      } catch (allErr) {
        console.warn("adminGetAllOrders failed, falling back to role endpoint:", allErr);
        if (isSalesAdmin) {
          data = await orderService.salesGetMyOrders();
        } else if (isProductionAdmin) {
          data = await orderService.productionGetOrders();
        } else if (isScmAdmin) {
          data = await orderService.scmGetOrders();
        }
      }

      // Merge API results with locally cached production orders so completed orders stay visible
      const localCache = JSON.parse(localStorage.getItem("production_orders_cache") || "[]");
      const dataArray = Array.isArray(data) ? data : [];

      const mergedMap = new Map();
      localCache.forEach((o) => {
        if (o && (o.id || o.orderNumber)) {
          mergedMap.set(o.id || o.orderNumber, o);
        }
      });
      dataArray.forEach((o) => {
        if (o && (o.id || o.orderNumber)) {
          const key = o.id || o.orderNumber;
          const existing = mergedMap.get(key) || {};
          const localStatus = localStorage.getItem(`order_status_${o.id}`);
          mergedMap.set(key, { ...existing, ...o, orderStatus: localStatus || o.orderStatus });
        }
      });

      const mergedList = Array.from(mergedMap.values());
      try {
        localStorage.setItem("production_orders_cache", JSON.stringify(mergedList));
      } catch (e) {
        console.warn("Failed to update production_orders_cache:", e);
      }

      setOrders(mergedList);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      setError(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [role]);

  // Fetch Registered Users for Customer Search Autocomplete
  useEffect(() => {
    const fetchRegisteredUsers = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const res = await fetch(`${baseUrl}/user/all`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setRegisteredUsers(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.warn("Could not fetch registered users list:", err);
      }
    };
    fetchRegisteredUsers();
  }, [baseUrl]);

  // View Order Details
  const handleViewDetails = async (orderId) => {
    try {
      let details;
      if (isSalesAdmin) {
        details = await orderService.salesGetOrderDetail(orderId);
      } else if (isProductionAdmin) {
        details = await orderService.productionGetOrderDetail(orderId);
      } else if (isScmAdmin) {
        details = await orderService.scmGetOrderDetail(orderId);
      } else {
        details = await orderService.adminGetOrderDetail(orderId);
      }
      const rawDetails = details || orders.find((o) => o.id === orderId);
      if (rawDetails) {
        const localStatus = localStorage.getItem(`order_status_${orderId}`);
        const enriched = {
          ...rawDetails,
          orderStatus: localStatus || rawDetails.orderStatus,
        };
        setSelectedOrder(enriched);
      } else {
        setSelectedOrder(null);
      }
      setShowDrawer(true);
    } catch (err) {
      // Fallback to local item
      const fallback = orders.find((o) => o.id === orderId);
      if (fallback) {
        const localStatus = localStorage.getItem(`order_status_${orderId}`);
        const enriched = {
          ...fallback,
          orderStatus: localStatus || fallback.orderStatus,
        };
        setSelectedOrder(enriched);
        setShowDrawer(true);
      } else {
        showToast(err.message || "Failed to fetch order details", "error");
      }
    }
  };

  // --- SALES ADMIN HANDLERS ---
  const validateSalesForm = (data) => {
    const errors = {};
    if (!data.customerName?.trim()) errors.customerName = "Customer name is required";
    if (!data.piNumber?.trim()) errors.piNumber = "P.I. Number is required";

    const vStr = data.voltage !== undefined ? String(data.voltage).trim() : "";
    if (!data.orderItems || !Array.isArray(data.orderItems) || data.orderItems.length === 0) {
      errors.orderItems = "At least one product line item is required";
    } else {
      data.orderItems.forEach((item, idx) => {
        const vStr = item.voltage !== undefined ? String(item.voltage).trim() : "";
        const cStr = item.capacity !== undefined ? String(item.capacity).trim() : "";
        if (!vStr && !cStr && !item.productDetails?.trim()) {
          errors[`orderItem_${idx}`] = `Voltage, Capacity (Ah), and Chemistry are required for Item #${idx + 1}`;
        }
        if (!item.quantity || Number(item.quantity) < 1) {
          errors[`orderItemQty_${idx}`] = `Quantity must be at least 1 for Item #${idx + 1}`;
        }
      });
    }

    if (!data.mobileNumber?.trim()) {
      errors.mobileNumber = "Mobile number is required";
    } else if (!/^[0-9]{10}$/.test(data.mobileNumber.trim())) {
      errors.mobileNumber = "Mobile number must be exactly 10 digits";
    }

    if (!data.expectedDeliveryDate) {
      errors.expectedDeliveryDate = "Expected delivery date is required";
    }

    const totalAmt = parseFloat(data.totalInvoiceAmount);
    if (isNaN(totalAmt) || totalAmt <= 0) {
      errors.totalInvoiceAmount = "Total invoice amount must be a positive number";
    }

    if (data.receivedAmount !== undefined && data.receivedAmount !== "") {
      const recAmt = parseFloat(data.receivedAmount);
      if (isNaN(recAmt) || recAmt < 0) {
        errors.receivedAmount = "Received amount cannot be negative";
      } else if (recAmt > totalAmt) {
        errors.receivedAmount = "Received amount cannot exceed total invoice amount";
      }
    }

    if (!data.priority) errors.priority = "Priority is required";

    return errors;
  };

  const handleCreateSalesOrder = async (e) => {
    e.preventDefault();
    const errors = validateSalesForm(salesFormData);
    if (Object.keys(errors).length > 0) {
      setSalesFormErrors(errors);
      return;
    }
    setSalesFormErrors({});
    setSubmitting(true);

    try {
      let targetUserId = salesFormData.assignedUserId;
      if (!targetUserId && registeredUsers.length > 0) {
        const matched = registeredUsers.find(
          (u) =>
            (salesFormData.customerEmail && u.email?.toLowerCase() === salesFormData.customerEmail.toLowerCase()) ||
            (salesFormData.mobileNumber && (u.mobile === salesFormData.mobileNumber || u.mobileNumber === salesFormData.mobileNumber)) ||
            (salesFormData.customerName && u.name?.toLowerCase() === salesFormData.customerName.toLowerCase())
        );
        if (matched) {
          targetUserId = matched.id || matched.userId;
        } else {
          targetUserId = registeredUsers[0].id || registeredUsers[0].userId;
        }
      }
      if (!targetUserId && token) {
        try {
          const payloadToken = JSON.parse(atob(token.split('.')[1]));
          targetUserId = payloadToken.userId || payloadToken.id || payloadToken.subId || 1;
        } catch (e) {
          targetUserId = 1;
        }
      }
      if (!targetUserId) targetUserId = 1;

      const firstItem = salesFormData.orderItems[0] || {};
      const firstProject = firstItem.project === "Other" ? (firstItem.customProject || "Other") : (firstItem.project || "EV Battery");

      const payload = {
        assignedUserId: Number(targetUserId),
        customerName: salesFormData.customerName.trim(),
        customerEmail: salesFormData.customerEmail?.trim() || "",
        piNumber: salesFormData.piNumber.trim(),
        project: firstProject,
        orderItems: salesFormData.orderItems.map((item) => {
          const itemProject = item.project === "Other" ? (item.customProject || "Other") : (item.project || "EV Battery");
          return {
            project: itemProject,
            productDetails: formatProductDetails({ ...item, project: itemProject }).trim(),
            quantity: Math.max(1, Number(item.quantity) || 1)
          };
        }),
        mobileNumber: salesFormData.mobileNumber.trim(),
        expectedDeliveryDate: salesFormData.expectedDeliveryDate,
        priority: salesFormData.priority,
        gstNumber: salesFormData.gstNumber?.trim() || null,
        address: salesFormData.address?.trim() || null,
        totalInvoiceAmount: Number(salesFormData.totalInvoiceAmount) || 0,
        receivedAmount: Number(salesFormData.receivedAmount) || 0,
      };

      const created = await orderService.salesCreateOrder(payload);
      showToast(`Order ${created.orderNumber || ""} created successfully!`, "success");
      setShowCreateModal(false);
      setSalesFormData({
        customerName: "",
        customerEmail: "",
        mobileNumber: "",
        piNumber: "",
        orderItems: [createDefaultOrderItem()],
        expectedDeliveryDate: "",
        totalInvoiceAmount: "",
        receivedAmount: "",
        priority: "medium",
        gstNumber: "",
        address: "",
      });
      setCustomerSearchTerm("");
      fetchOrders();
    } catch (err) {
      showToast(err.message || "Failed to create order", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditSalesModal = (order) => {
    let items = [];
    if (Array.isArray(order.orderItems) && order.orderItems.length > 0) {
      items = order.orderItems.map((it, idx) => {
        const parsed = parseProductDetails(it.productDetails || "");
        return {
          id: it.id || Date.now() + idx,
          project: it.project || parsed.project || "EV Battery",
          customProject: parsed.customProject || "",
          voltage: parsed.voltage || "02",
          capacity: parsed.capacity || "3",
          chemistry: parsed.chemistry || "NMC",
          notes: parsed.notes || "",
          productDetails: it.productDetails || formatProductDetails({ ...parsed, project: it.project || parsed.project }),
          quantity: Math.max(1, Number(it.quantity) || 1)
        };
      });
    } else {
      const qty = order.quantity ?? order.partQuantity ?? 1;
      const parsed = parseProductDetails(order.productDetails || "");
      items = [{
        id: 1,
        project: order.project || parsed.project || "EV Battery",
        customProject: parsed.customProject || "",
        voltage: parsed.voltage || "02",
        capacity: parsed.capacity || "3",
        chemistry: parsed.chemistry || "NMC",
        notes: parsed.notes || "",
        productDetails: order.productDetails || formatProductDetails({ ...parsed, project: order.project || parsed.project }),
        quantity: qty
      }];
    }

    setEditOrderData({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName || "",
      customerEmail: order.customerEmail || "",
      piNumber: order.piNumber || "",
      orderItems: items,
      mobileNumber: order.mobileNumber || "",
      expectedDeliveryDate: order.expectedDeliveryDate || "",
      totalInvoiceAmount: order.totalInvoiceAmount || "",
      receivedAmount: order.receivedAmount || "",
      priority: order.priority || "medium",
      gstNumber: order.gstNumber || "",
      address: order.address || "",
    });
    setEditFormErrors({});
    setShowEditModal(true);
  };

  const openDrawerItemsEdit = () => {
    if (!selectedOrder) return;
    let items = [];
    if (Array.isArray(selectedOrder.orderItems) && selectedOrder.orderItems.length > 0) {
      items = selectedOrder.orderItems.map((it, idx) => {
        const parsed = parseProductDetails(it.productDetails || "");
        return {
          id: it.id || Date.now() + idx,
          project: it.project || parsed.project || "EV Battery",
          customProject: parsed.customProject || "",
          voltage: parsed.voltage || "02",
          capacity: parsed.capacity || "3",
          chemistry: parsed.chemistry || "NMC",
          notes: parsed.notes || "",
          productDetails: it.productDetails || formatProductDetails({ ...parsed, project: it.project || parsed.project }),
          quantity: Math.max(1, Number(it.quantity) || 1)
        };
      });
    } else {
      const qty = selectedOrder.quantity ?? selectedOrder.partQuantity ?? 1;
      const parsed = parseProductDetails(selectedOrder.productDetails || "");
      items = [{
        id: 1,
        project: selectedOrder.project || parsed.project || "EV Battery",
        customProject: parsed.customProject || "",
        voltage: parsed.voltage || "02",
        capacity: parsed.capacity || "3",
        chemistry: parsed.chemistry || "NMC",
        notes: parsed.notes || "",
        productDetails: selectedOrder.productDetails || formatProductDetails({ ...parsed, project: selectedOrder.project || parsed.project }),
        quantity: qty
      }];
    }
    setDrawerOrderItems(items);
    setIsEditingDrawerProductDetails(true);
  };

  const handleSaveDrawerProductDetails = async () => {
    if (!selectedOrder) return;
    if (!drawerOrderItems || drawerOrderItems.length === 0) {
      showToast("At least one product item is required", "error");
      return;
    }
    setSubmitting(true);
    try {
      const formattedItems = drawerOrderItems.map((item) => {
        const itemProject = item.project === "Other" ? (item.customProject || "Other") : (item.project || "EV Battery");
        return {
          project: itemProject,
          productDetails: formatProductDetails({ ...item, project: itemProject }).trim(),
          quantity: Math.max(1, Number(item.quantity) || 1)
        };
      });
      const firstProject = formattedItems[0]?.project || "EV Battery";
      const payload = {
        ...selectedOrder,
        project: firstProject,
        orderItems: formattedItems
      };
      let updated;
      try {
        updated = await orderService.salesUpdateOrder(selectedOrder.id, payload);
      } catch (err1) {
        try {
          updated = await orderService.scmUpdateDetails(selectedOrder.id, payload);
        } catch (err2) {
          updated = { ...selectedOrder, project: firstProject, orderItems: formattedItems };
        }
      }
      setSelectedOrder(updated || { ...selectedOrder, project: firstProject, orderItems: formattedItems });
      showToast("Product line items updated successfully!", "success");
      setIsEditingDrawerProductDetails(false);
      fetchOrders();
    } catch (err) {
      showToast(err.message || "Failed to update product details", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateSalesOrder = async (e) => {
    e.preventDefault();
    if (!editOrderData) return;
    const errors = validateSalesForm(editOrderData);
    if (Object.keys(errors).length > 0) {
      setEditFormErrors(errors);
      return;
    }
    setEditFormErrors({});
    setSubmitting(true);

    try {
      const firstItem = editOrderData.orderItems[0] || {};
      const firstProject = firstItem.project === "Other" ? (firstItem.customProject || "Other") : (firstItem.project || "EV Battery");

      const payload = {
        ...editOrderData,
        project: firstProject,
        orderItems: editOrderData.orderItems.map((item) => {
          const itemProject = item.project === "Other" ? (item.customProject || "Other") : (item.project || "EV Battery");
          return {
            project: itemProject,
            productDetails: formatProductDetails({ ...item, project: itemProject }).trim(),
            quantity: Math.max(1, Number(item.quantity) || 1)
          };
        }),
        totalInvoiceAmount: Number(editOrderData.totalInvoiceAmount) || 0,
        receivedAmount: Number(editOrderData.receivedAmount) || 0,
      };
      const updated = await orderService.salesUpdateOrder(editOrderData.id, payload);
      showToast(`Order ${updated.orderNumber || editOrderData.orderNumber} updated successfully!`, "success");
      setShowEditModal(false);
      if (selectedOrder && selectedOrder.id === editOrderData.id) {
        setSelectedOrder(updated);
      }
      fetchOrders();
    } catch (err) {
      showToast(err.message || "Failed to update order", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordIncrementalPayment = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    const amt = parseFloat(recordPaymentAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast("Please enter a valid positive payment amount", "error");
      return;
    }
    if (amt > (selectedOrder.pendingAmount || 0)) {
      showToast(`Payment amount cannot exceed the pending amount of ₹${(selectedOrder.pendingAmount || 0).toLocaleString("en-IN")}`, "error");
      return;
    }
    setSubmitting(true);
    try {
      const updated = await orderService.salesRecordPayment(selectedOrder.id, amt);
      showToast("Payment recorded successfully!", "success");
      setRecordPaymentAmount("");
      setSelectedOrder(updated);
      fetchOrders();
    } catch (err) {
      showToast(err.message || "Failed to record payment", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // --- PRODUCTION ADMIN HANDLERS ---
  const handleUpdateProductionStatus = async (orderId, targetStatus) => {
    setSubmitting(true);
    try {
      const updated = await orderService.productionUpdateStatus(orderId, { productionStatus: targetStatus });
      showToast(`Production status updated to '${targetStatus.replace("_", " ")}'`, "success");

      // Persist status and order in local cache so completed orders remain visible in frontend
      const resolvedOrderStatus = targetStatus === "completed" ? "production_complete" : "in_production";
      localStorage.setItem(`order_status_${orderId}`, resolvedOrderStatus);

      const localCache = JSON.parse(localStorage.getItem("production_orders_cache") || "[]");
      const targetOrder = orders.find((o) => o.id === orderId) || (selectedOrder?.id === orderId ? selectedOrder : null);
      const orderToSave = {
        ...(targetOrder || {}),
        ...(updated || {}),
        id: orderId,
        productionStatus: targetStatus,
        orderStatus: resolvedOrderStatus,
        productionCompletedAt: targetStatus === "completed" ? new Date().toISOString() : targetOrder?.productionCompletedAt
      };
      
      const updatedCacheMap = new Map();
      localCache.forEach(o => { if (o && (o.id || o.orderNumber)) updatedCacheMap.set(o.id || o.orderNumber, o); });
      updatedCacheMap.set(orderId, orderToSave);

      try {
        localStorage.setItem("production_orders_cache", JSON.stringify(Array.from(updatedCacheMap.values())));
      } catch (e) {
        console.warn("Failed to write production_orders_cache:", e);
      }

      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => ({ ...prev, ...orderToSave }));
      }
      fetchOrders();
    } catch (err) {
      showToast(err.message || "Failed to update production status", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to generate sequential barcodes from a start barcode string
  const generateBarcodeSequence = (startStr, count) => {
    if (!startStr) return Array(count).fill("");
    const match = startStr.match(/^(.*?)(\d+)$/);
    if (!match) {
      const list = [startStr];
      while (list.length < count) list.push("");
      return list;
    }
    const prefix = match[1];
    const numStr = match[2];
    const numLen = numStr.length;
    const startNum = parseInt(numStr, 10);
    const result = [];
    for (let i = 0; i < count; i++) {
      const nextNum = String(startNum + i).padStart(numLen, "0");
      result.push(`${prefix}${nextNum}`);
    }
    return result;
  };

  // --- SCM ADMIN HANDLERS ---
  const openScmModal = (order) => {
    setOrderForScm(order);
    
    // Top-level shared shipment fields
    setScmFormData({
      invoiceNumber: order.invoiceNumber || "",
      courierName: order.courierName || "",
      trackingId: order.trackingId || "",
    });

    let itemDetailsList = [];
    if (Array.isArray(order.orderItems) && order.orderItems.length > 0) {
      itemDetailsList = order.orderItems.map((it, idx) => {
        const itemQty = Math.max(1, Number(it.quantity) || 1);
        let startBc = it.startBarcode || "";
        let endBc = it.endBarcode || "";

        if (!startBc) {
          if (Array.isArray(it.barcodes) && it.barcodes.length > 0) {
            startBc = it.barcodes[0];
            endBc = it.barcodes[it.barcodes.length - 1];
          } else if (it.barcode) {
            if (it.barcode.includes(" - ")) {
              const parts = it.barcode.split(" - ").map((s) => s.trim());
              startBc = parts[0];
              endBc = parts[parts.length - 1];
            } else {
              startBc = it.barcode;
            }
          }
        }

        return {
          id: it.id || `item_${idx + 1}`,
          orderItemId: it.id || null,
          productDetails: it.productDetails || "EV Battery Unit",
          quantity: itemQty,
          startBarcode: startBc,
          endBarcode: endBc,
          warrantyStartDate: it.warrantyStartDate || "",
          warrantyEndDate: it.warrantyEndDate || ""
        };
      });
    } else {
      // Legacy single-product order
      const itemQty = Math.max(1, Number(order.quantity || order.partQuantity) || 1);
      let startBc = order.startBarcode || "";
      let endBc = order.endBarcode || "";

      if (!startBc) {
        if (Array.isArray(order.barcodes) && order.barcodes.length > 0) {
          startBc = order.barcodes[0];
          endBc = order.barcodes[order.barcodes.length - 1];
        } else if (order.barcode) {
          if (order.barcode.includes(" - ")) {
            const parts = order.barcode.split(" - ").map((s) => s.trim());
            startBc = parts[0];
            endBc = parts[parts.length - 1];
          } else {
            startBc = order.barcode;
          }
        }
      }

      itemDetailsList = [{
        id: "legacy_1",
        orderItemId: null,
        productDetails: order.productDetails || "Standard EV Battery Pack",
        quantity: itemQty,
        startBarcode: startBc,
        endBarcode: endBc,
        warrantyStartDate: order.warrantyStartDate || "",
        warrantyEndDate: order.warrantyEndDate || ""
      }];
    }

    setScmItemDetails(itemDetailsList);
    setScmFormErrors({});
    setShowScmModal(true);
  };

  const openWarrantyModal = (order) => {
    setWarrantyModalData(order);
    setShowWarrantyModal(true);
  };

  const handleCompleteScm = async (e) => {
    e.preventDefault();
    if (!orderForScm) return;

    const errors = {};

    if (!scmFormData.invoiceNumber?.trim()) {
      errors.invoiceNumber = "Invoice Number is required";
    }
    if (!scmFormData.trackingId?.trim()) {
      errors.trackingId = "Tracking ID is required";
    }

    const updatedItems = [];
    scmItemDetails.forEach((item, idx) => {
      const itemQty = Math.max(1, Number(item.quantity) || 1);
      let startStr = item.startBarcode?.trim() || "";
      let endStr = item.endBarcode?.trim() || "";

      if (itemQty === 1) {
        if (!startStr) {
          errors[`startBarcode_${idx}`] = "Barcode is required";
        } else {
          endStr = startStr; // Automatically treat Start Barcode as End Barcode for single unit
        }
      } else {
        if (!startStr) {
          errors[`startBarcode_${idx}`] = "Start Barcode is required";
        }
        if (!endStr) {
          errors[`endBarcode_${idx}`] = "End Barcode is required";
        }
      }

      let itemBarcodes = [];
      if (startStr && endStr) {
        if (itemQty === 1) {
          itemBarcodes = [startStr];
        } else {
          const matchStart = startStr.match(/^(.*?)(\d+)$/);
          const matchEnd = endStr.match(/^(.*?)(\d+)$/);

          if (matchStart && matchEnd) {
            const prefixStart = matchStart[1];
            const numStart = parseInt(matchStart[2], 10);
            const prefixEnd = matchEnd[1];
            const numEnd = parseInt(matchEnd[2], 10);

            if (prefixStart !== prefixEnd) {
              errors[`endBarcode_${idx}`] = `Prefix mismatch: '${prefixStart}' vs '${prefixEnd}'`;
            } else if (numEnd < numStart) {
              errors[`endBarcode_${idx}`] = "End Barcode must not be smaller than Start Barcode";
            } else {
              const rangeCount = numEnd - numStart + 1;
              if (rangeCount !== itemQty) {
                errors[`endBarcode_${idx}`] = `Range contains ${rangeCount} barcode(s), but product quantity requires ${itemQty}`;
              } else {
                itemBarcodes = generateBarcodeSequence(startStr, itemQty);
              }
            }
          } else if (startStr > endStr) {
            errors[`endBarcode_${idx}`] = "End Barcode must not be smaller than Start Barcode";
          } else {
            itemBarcodes = generateBarcodeSequence(startStr, itemQty);
          }
        }
      }

      if (!item.warrantyStartDate) {
        errors[`warrantyStartDate_${idx}`] = "Warranty Start Date is required";
      }
      if (!item.warrantyEndDate) {
        errors[`warrantyEndDate_${idx}`] = "Warranty End Date is required";
      }

      const itemPayload = {
        productDetails: item.productDetails?.trim() || orderForScm?.productDetails || "EV Battery Unit",
        quantity: itemQty,
        startBarcode: startStr,
        endBarcode: endStr,
        barcodes: itemBarcodes.length > 0 ? itemBarcodes : [startStr],
        barcode: itemQty === 1 ? startStr : `${startStr} - ${endStr}`,
        warrantyStartDate: item.warrantyStartDate,
        warrantyEndDate: item.warrantyEndDate
      };
      if (item.orderItemId && !isNaN(Number(item.orderItemId))) {
        itemPayload.id = Number(item.orderItemId);
      }
      updatedItems.push(itemPayload);
    });

    if (Object.keys(errors).length > 0) {
      setScmFormErrors(errors);
      return;
    }
    setScmFormErrors({});
    setSubmitting(true);

    try {
      const firstItem = updatedItems[0] || {};
      const lastItem = updatedItems[updatedItems.length - 1] || firstItem;
      const allBarcodes = updatedItems.flatMap((item) => item.barcodes || []);
      const startBc = firstItem.startBarcode || (allBarcodes[0] || "BAR001");
      const endBc = lastItem.endBarcode || (allBarcodes[allBarcodes.length - 1] || startBc);
      const barcodeStr = allBarcodes.length <= 1 ? startBc : `${startBc} - ${endBc}`;
      const todayStr = new Date().toISOString().split("T")[0];

      const payload = {
        invoiceNumber: scmFormData.invoiceNumber.trim(),
        trackingId: scmFormData.trackingId.trim(),
        courierName: scmFormData.courierName?.trim() || "Standard",
        serviceWarrantyMonths: Number(orderForScm?.serviceWarrantyMonths ?? 12),
        fullWarrantyMonths: Number(orderForScm?.fullWarrantyMonths ?? 24),
        orderItems: updatedItems,
        // Legacy top-level fallback fields aggregated across all items
        startBarcode: startBc,
        endBarcode: endBc,
        barcode: barcodeStr,
        barcodes: allBarcodes.length > 0 ? allBarcodes : [startBc],
        warrantyStartDate: firstItem.warrantyStartDate || todayStr,
        warrantyEndDate: firstItem.warrantyEndDate || todayStr
      };

      const updated = await orderService.scmUpdateDetails(orderForScm.id, payload);
      showToast(`SCM details saved and marked as SCM Complete for ${orderForScm.orderNumber}`, "success");
      setShowScmModal(false);

      // Persist SCM Complete status in local storage & cache
      localStorage.setItem(`order_status_${orderForScm.id}`, "scm_complete");
      const orderToSave = {
        ...(orderForScm || {}),
        ...(updated || {}),
        id: orderForScm.id,
        orderStatus: "scm_complete",
        scmCompletedAt: new Date().toISOString(),
        ...payload
      };

      const localCache = JSON.parse(localStorage.getItem("production_orders_cache") || "[]");
      const updatedCacheMap = new Map();
      localCache.forEach(o => { if (o && (o.id || o.orderNumber)) updatedCacheMap.set(o.id || o.orderNumber, o); });
      updatedCacheMap.set(orderForScm.id, orderToSave);

      try {
        localStorage.setItem("production_orders_cache", JSON.stringify(Array.from(updatedCacheMap.values())));
      } catch (e) {
        console.warn("Failed to write production_orders_cache:", e);
      }

      if (selectedOrder && selectedOrder.id === orderForScm.id) {
        setSelectedOrder((prev) => ({ ...prev, ...orderToSave }));
      }
      fetchOrders();
    } catch (err) {
      showToast(err.message || "Failed to complete SCM details", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDispatchOrder = async (orderId) => {
    setSubmitting(true);
    try {
      const updated = await orderService.scmDispatchOrder(orderId);
      showToast(`Order dispatched successfully!`, "success");

      localStorage.setItem(`order_status_${orderId}`, "dispatched");
      const orderToSave = {
        ...(updated || {}),
        id: orderId,
        orderStatus: "dispatched",
        dispatchedAt: new Date().toISOString()
      };

      const localCache = JSON.parse(localStorage.getItem("production_orders_cache") || "[]");
      const updatedCacheMap = new Map();
      localCache.forEach((o) => { if (o && (o.id || o.orderNumber)) updatedCacheMap.set(o.id || o.orderNumber, o); });
      updatedCacheMap.set(orderId, { ...(updatedCacheMap.get(orderId) || {}), ...orderToSave });

      try {
        localStorage.setItem("production_orders_cache", JSON.stringify(Array.from(updatedCacheMap.values())));
      } catch (e) {
        console.warn("Failed to write production_orders_cache:", e);
      }

      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => ({ ...prev, ...orderToSave }));
      }
      fetchOrders();
    } catch (err) {
      showToast(err.message || "Failed to dispatch order", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveLocalShippingDetails = () => {
    if (!selectedOrder) return;
    const orderId = selectedOrder.id;
    localStorage.setItem(`order_shipping_address_${orderId}`, localShippingAddress);
    localStorage.setItem(`order_city_${orderId}`, localCity);
    localStorage.setItem(`order_state_${orderId}`, localState);
    localStorage.setItem(`order_pincode_${orderId}`, localPincode);
    localStorage.setItem(`order_unit_price_${orderId}`, localUnitPrice);
    localStorage.setItem(`order_gst_rate_${orderId}`, localGstRate);
    localStorage.setItem(`order_courier_name_${orderId}`, localCourierName);
    localStorage.setItem(`order_tracking_id_${orderId}`, localTrackingId);
    setIsEditingShippingDetails(false);
    showToast("Shipping & Pricing details saved locally!", "success");
    fetchOrders();
  };

  const handleMarkAsDelivered = async (orderId) => {
    setSubmitting(true);
    try {
      localStorage.setItem(`order_status_${orderId}`, "delivered");
      localStorage.setItem(`order_delivered_date_${orderId}`, new Date().toISOString());

      const currentOrder = orders.find((o) => o.id === orderId) || selectedOrder;
      if (currentOrder) {
        const enriched = {
          ...currentOrder,
          orderStatus: "delivered",
          address: localStorage.getItem(`order_shipping_address_${orderId}`) || currentOrder.address || "",
          gstNumber: currentOrder.gstNumber || ""
        };
        generateOrderPdfReport(enriched);
      }

      showToast("Order marked as Delivered & overview PDF generated!", "success");

      if (selectedOrder && selectedOrder.id === orderId) {
        const updatedOrderDetail = {
          ...selectedOrder,
          orderStatus: "delivered"
        };
        setSelectedOrder(updatedOrderDetail);
      }

      fetchOrders();
    } catch (err) {
      showToast("Failed to mark as delivered", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const generateOrderPdfReport = (order) => {
    if (!order) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showToast("Please allow popups to generate and download the PDF report.", "error");
      return;
    }

    const startB = order.startBarcode || (Array.isArray(order.barcodes) ? order.barcodes[0] : "") || order.barcode || "BAR001";
    const endB = order.endBarcode || (Array.isArray(order.barcodes) ? order.barcodes[order.barcodes.length - 1] : "") || "BAR100";
    const barcodeDisplay = endB && startB !== endB ? `${startB} to ${endB}` : startB;
    const createdDateStr = order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—";
    const updatedDateStr = order.updatedAt ? new Date(order.updatedAt).toLocaleDateString("en-IN", { dateStyle: "medium" }) : new Date().toLocaleDateString("en-IN", { dateStyle: "medium" });
    const genTimeStr = new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

    const itemsList = Array.isArray(order.orderItems) && order.orderItems.length > 0
      ? order.orderItems
      : [{ productDetails: order.productDetails || "Standard EV Battery Pack", quantity: order.quantity || order.partQuantity || 1 }];
    const totalUnits = itemsList.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Order Report - ${order.orderNumber || order.id} | Bentork LLP</title>
          <style>
            @page {
              size: A4;
              margin: 12mm;
            }
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              color: #1E293B;
              margin: 0;
              padding: 0;
              background: #FFFFFF;
              font-size: 13px;
              line-height: 1.5;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 3px solid #1E3A8A;
              padding-bottom: 14px;
              margin-bottom: 20px;
            }
            .company-brand {
              font-size: 22px;
              font-weight: 800;
              color: #1E3A8A;
              letter-spacing: 0.5px;
            }
            .company-sub {
              font-size: 12px;
              color: #475569;
              font-weight: 600;
            }
            .company-info {
              font-size: 11px;
              color: #64748B;
              margin-top: 4px;
            }
            .report-badge {
              background: #1E3A8A;
              color: #FFFFFF;
              padding: 6px 14px;
              font-size: 12px;
              font-weight: 700;
              border-radius: 6px;
              display: inline-block;
            }
            .report-meta {
              font-size: 11px;
              color: #64748B;
              text-align: right;
              margin-top: 6px;
            }
            .section-title {
              font-size: 13px;
              font-weight: 700;
              color: #1E3A8A;
              background: #F1F5F9;
              padding: 6px 12px;
              border-left: 4px solid #1E3A8A;
              border-radius: 0 6px 6px 0;
              margin-top: 16px;
              margin-bottom: 10px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .grid-3 {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 10px;
            }
            .data-card {
              background: #F8FAFC;
              border: 1px solid #E2E8F0;
              padding: 10px 12px;
              border-radius: 8px;
            }
            .data-label {
              font-size: 10px;
              text-transform: uppercase;
              color: #64748B;
              font-weight: 700;
              letter-spacing: 0.5px;
            }
            .data-value {
              font-size: 14px;
              font-weight: 700;
              color: #0F172A;
              margin-top: 2px;
            }
            .data-value.highlight { color: #1E3A8A; }
            .data-value.success { color: #047857; }
            .qc-box {
              background: #ECFDF5;
              border: 1px solid #A7F3D0;
              padding: 12px 14px;
              border-radius: 8px;
              margin-top: 14px;
              color: #065F46;
            }
            .status-tag {
              display: inline-block;
              padding: 3px 8px;
              border-radius: 12px;
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              background: #ECFDF5;
              color: #047857;
            }
            .footer {
              margin-top: 30px;
              padding-top: 14px;
              border-top: 2px solid #E2E8F0;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            .signature-box {
              text-align: center;
              width: 200px;
            }
            .signature-line {
              border-bottom: 1px solid #475569;
              margin-bottom: 4px;
              height: 35px;
            }
            .no-print {
              margin-bottom: 16px;
              text-align: right;
            }
            .btn-print {
              background: #1E3A8A;
              color: #FFFFFF;
              border: none;
              padding: 10px 20px;
              font-size: 13px;
              font-weight: 600;
              border-radius: 6px;
              cursor: pointer;
            }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="no-print">
            <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
          </div>

          <div class="header">
            <div>
              <div class="company-brand">BENTORK INDUSTRIES LLP</div>
              <div class="company-sub">Battery Systems & Technology Division</div>
              <div class="company-info">
               S. No. 24/2, Jadhavrao Industrial Estate, Nanded City Sinhgad Rd, Pune, Maharashtra 411068<br/>
                Email: info@bentork.com | Web: https://bentork.com
              </div>
            </div>
            <div>
              <div class="report-badge">ORDER DISPATCH REPORT</div>
              <div class="report-meta">
                <strong>Order #:</strong> ${order.orderNumber || order.id}<br/>
                <strong>Generated:</strong> ${genTimeStr}
              </div>
            </div>
          </div>

          <div class="section-title">1. Customer & Sales Details</div>
          <div class="grid-3">
            <div class="data-card">
              <div class="data-label">Customer Name</div>
              <div class="data-value">${order.customerName || "—"}</div>
            </div>
            <div class="data-card">
              <div class="data-label">P.I. Number</div>
              <div class="data-value highlight">${order.piNumber || "—"}</div>
            </div>
            <div class="data-card">
              <div class="data-label">Mobile Number</div>
              <div class="data-value">${order.mobileNumber || "—"}</div>
            </div>
          </div>

          <div style="margin-top: 10px;" class="data-card">
            <div class="data-label">Product Line Items (${itemsList.length}) &nbsp;|&nbsp; Payment Status: <strong style="text-transform: uppercase;">${order.paymentStatus || "PAID"}</strong></div>
            <table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px;">
              <thead>
                <tr style="background: #F1F5F9; color: #475569; text-transform: uppercase; font-size: 10px;">
                  <th style="padding: 6px 10px; text-align: left;">#</th>
                  <th style="padding: 6px 10px; text-align: left;">Product Details & Specifications</th>
                  <th style="padding: 6px 10px; text-align: right;">Quantity</th>
                </tr>
              </thead>
              <tbody>
                ${itemsList.map((it, idx) => `
                  <tr style="border-top: 1px solid #E2E8F0;">
                    <td style="padding: 6px 10px; color: #64748B;">${idx + 1}</td>
                    <td style="padding: 6px 10px; font-weight: 600; color: #1E293B;">${it.productDetails || "EV Battery Unit"}</td>
                    <td style="padding: 6px 10px; text-align: right; font-weight: 700; color: #1D4ED8;">${it.quantity} Units</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr style="background: #F8FAFC; font-weight: 700; border-top: 2px solid #CBD5E1;">
                  <td colspan="2" style="padding: 6px 10px; color: #334155;">Total Batch Quantity</td>
                  <td style="padding: 6px 10px; text-align: right; color: #1D4ED8;">${totalUnits} Units</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div class="section-title">2. Production & Manufacturing Details</div>
          <div class="grid-3">
            <div class="data-card">
              <div class="data-label">Manufacturing Status</div>
              <div class="data-value success">PRODUCTION COMPLETE</div>
            </div>
            <div class="data-card">
              <div class="data-label">Batch Quantity</div>
              <div class="data-value">${totalUnits} Units</div>
            </div>
            <div class="data-card">
              <div class="data-label">Completion Date</div>
              <div class="data-value">${updatedDateStr}</div>
            </div>
          </div>

          <div class="qc-box">
            <strong>Quality Assurance (QC) Inspection: PASSED & CERTIFIED</strong>
            <div style="font-size: 11px; margin-top: 4px;">
              ✓ Cell Voltage Balancing &nbsp;•&nbsp; ✓ BMS Communication &nbsp;•&nbsp; ✓ High Voltage Insulation &nbsp;•&nbsp; ✓ Thermal Load Test
            </div>
          </div>

          <!-- SCM & Logistics Details -->
          <div class="section-title">3. Supply Chain & Logistics (SCM) Details</div>
          <div class="grid-3">
            <div class="data-card">
              <div class="data-label">Invoice Number</div>
              <div class="data-value highlight">${order.invoiceNumber || "—"}</div>
            </div>
            <div class="data-card">
              <div class="data-label">Barcode Range</div>
              <div class="data-value" style="font-family: monospace;">${barcodeDisplay}</div>
            </div>
            <div class="data-card">
              <div class="data-label">Courier Partner</div>
              <div class="data-value">${order.courierName || "DTDC Express"}</div>
            </div>
            <div class="data-card">
              <div class="data-label">Tracking Number / ID</div>
              <div class="data-value highlight">${order.trackingId || "—"}</div>
            </div>
            <div class="data-card">
              <div class="data-label">Dispatch Status</div>
              <div class="data-value success">DISPATCHED (IN TRANSIT)</div>
            </div>
            <div class="data-card">
              <div class="data-label">Dispatch Date</div>
              <div class="data-value">${updatedDateStr}</div>
            </div>
          </div>

          <!-- Complete Order Lifecycle Timeline -->
          <div class="section-title">4. Order Lifecycle & Audit History</div>
          <table>
            <thead>
              <tr>
                <th>Stage</th>
                <th>Milestone Event</th>
                <th>Department</th>
                <th>Timestamp</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Stage 1</strong></td>
                <td>Sales Order Registration</td>
                <td>Sales Admin</td>
                <td>${createdDateStr}</td>
                <td><span class="status-tag">COMPLETED</span></td>
              </tr>
              <tr>
                <td><strong>Stage 2</strong></td>
                <td>Manufacturing & Battery Assembly</td>
                <td>Production Dept</td>
                <td>${createdDateStr}</td>
                <td><span class="status-tag">COMPLETED</span></td>
              </tr>
              <tr>
                <td><strong>Stage 3</strong></td>
                <td>Quality Assurance & Inspection Test</td>
                <td>QA Division</td>
                <td>${updatedDateStr}</td>
                <td><span class="status-tag">PASSED</span></td>
              </tr>
              <tr>
                <td><strong>Stage 4</strong></td>
                <td>SCM Barcode Mapping & Invoice Generation</td>
                <td>Supply Chain (SCM)</td>
                <td>${updatedDateStr}</td>
                <td><span class="status-tag">COMPLETED</span></td>
              </tr>
              <tr>
                <td><strong>Stage 5</strong></td>
                <td>Logistics Handover & Carrier Dispatch</td>
                <td>SCM Logistics</td>
                <td>${updatedDateStr}</td>
                <td><span class="status-tag">DISPATCHED</span></td>
              </tr>
            </tbody>
          </table>

          <!-- Footer & Signature -->
          <div class="footer">
            <div style="font-size: 11px; color: #64748B;">
              <strong>Bentork LLP - Official System Record</strong><br/>
              This is an authentic computer-generated report. Confidential.<br/>
              Page 1 of 1
            </div>
            <div class="signature-box">
              <div class="signature-line"></div>
              <div style="font-size: 11px; font-weight: 700; color: #1E3A8A;">Authorized Signatory</div>
              <div style="font-size: 10px; color: #64748B;">Bentork LLP Systems</div>
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // --- FILTER & PAGINATION ---
  const filteredOrders = useMemo(() => {
    const list = orders.filter((o) => {
      // Super Admin Stage Tab Filter
      if (isSuperAdmin && adminStageTab !== "ALL") {
        if (adminStageTab === "SALES" && o.orderStatus !== "sales_registered") return false;
        if (adminStageTab === "PRODUCTION" && o.orderStatus !== "in_production") return false;
        if (adminStageTab === "PROD_DONE" && o.orderStatus !== "production_complete") return false;
        if (adminStageTab === "SCM_DONE" && o.orderStatus !== "scm_complete") return false;
        if (adminStageTab === "DISPATCHED" && o.orderStatus !== "dispatched") return false;
      }

      // Search Query
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        o.orderNumber?.toLowerCase().includes(q) ||
        o.customerName?.toLowerCase().includes(q) ||
        o.piNumber?.toLowerCase().includes(q) ||
        o.productDetails?.toLowerCase().includes(q) ||
        o.mobileNumber?.includes(q) ||
        o.barcode?.toLowerCase().includes(q) ||
        o.trackingId?.toLowerCase().includes(q);

      // Status Filter
      const matchesStatus = !statusFilter || o.orderStatus === statusFilter;

      // Priority Filter
      const matchesPriority = !priorityFilter || o.priority === priorityFilter;

      // Date Range Filter
      let matchesDate = true;
      if (startDate || endDate) {
        const dateStr = o.createdAt || o.createdDate || o.updatedAt || o.updatedDate;
        if (dateStr) {
          const itemDate = new Date(dateStr);
          if (startDate) {
            const s = new Date(startDate);
            s.setHours(0, 0, 0, 0);
            if (itemDate < s) matchesDate = false;
          }
          if (endDate) {
            const e = new Date(endDate);
            e.setHours(23, 59, 59, 999);
            if (itemDate > e) matchesDate = false;
          }
        }
      }

      return matchesSearch && matchesStatus && matchesPriority && matchesDate;
    });

    // Sort newest records first (latest created/updated at top)
    return list.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : a.createdDate ? new Date(a.createdDate).getTime() : a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : b.createdDate ? new Date(b.createdDate).getTime() : b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      if (timeA !== timeB && timeA > 0 && timeB > 0) {
        return timeB - timeA;
      }
      const numA = Number(String(a.id || a.orderNumber || "").replace(/\D/g, "")) || 0;
      const numB = Number(String(b.id || b.orderNumber || "").replace(/\D/g, "")) || 0;
      return numB - numA;
    });
  }, [orders, adminStageTab, searchQuery, statusFilter, priorityFilter, startDate, endDate, isSuperAdmin]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(start, start + itemsPerPage);
  }, [filteredOrders, currentPage]);

  // Status Badge Colors & Text
  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case "sales_registered":
        return { label: "Sales Registered", bg: "#EFF6FF", fg: "#1D4ED8", border: "#BFDBFE" };
      case "in_production":
        return { label: "In Production", bg: "#FEF3C7", fg: "#B45309", border: "#FDE68A" };
      case "production_complete":
        return { label: "Production Complete", bg: "#ECFDF5", fg: "#047857", border: "#A7F3D0" };
      case "scm_complete":
        return { label: "SCM Complete", bg: "#F0FDFA", fg: "#0F766E", border: "#99F6E4" };
      case "dispatched":
        return { label: "Dispatched", bg: "#F3E8FF", fg: "#6B21A8", border: "#DDD6FE" };
      default:
        return { label: status || "Unknown", bg: "#F3F4F6", fg: "#374151", border: "#E5E7EB" };
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return { label: "High", bg: "#FEE2E2", fg: "#B91C1C" };
      case "medium":
        return { label: "Medium", bg: "#FEF3C7", fg: "#B45309" };
      case "low":
        return { label: "Low", bg: "#E0E7FF", fg: "#3730A3" };
      default:
        return { label: priority || "—", bg: "#F3F4F6", fg: "#4B5563" };
    }
  };

  // Format Dates
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  // Lifecycle Progress Stepper Component
  const renderProgressStepper = (currentStatus) => {
    const status = (selectedOrder ? localStorage.getItem(`order_status_${selectedOrder.id}`) : null) || currentStatus;

    const stages = [
      { key: "sales_registered", label: "Order Placed", desc: "Order details registered in sales", icon: ShoppingBag },
      { key: "in_production", label: "Confirmed", desc: "Production confirmed & active", icon: ShieldCheck },
      { key: "production_complete", label: "Packed", desc: "Manufacturing complete & packed", icon: Box },
      { key: "scm_complete", label: "Shipped", desc: "SCM verified & ready for transport", icon: Truck },
      { key: "dispatched", label: "Out For Delivery", desc: "In transit with courier partner", icon: MapPin },
      { key: "delivered", label: "Delivered ✅", desc: "Successfully delivered to customer", icon: CheckCircle },
    ];

    const getStageIndex = (st) => {
      switch (st?.toLowerCase()) {
        case "sales_registered":
          return 0;
        case "in_production":
          return 1;
        case "production_complete":
          return 2;
        case "scm_complete":
          return 3;
        case "dispatched":
          return 4;
        case "delivered":
          return 5;
        default:
          return 0;
      }
    };

    const currentIndex = getStageIndex(status);

    return (
      <div className="vertical-stepper">
        {stages.map((stage, idx) => {
          const isPassed = idx < currentIndex;
          const isActive = idx === currentIndex;
          const IconComponent = stage.icon;

          let statusClass = "pending";
          if (isPassed) statusClass = "passed";
          else if (isActive) statusClass = "active";

          return (
            <div key={stage.key} className={`vertical-step-item ${statusClass}`}>
              <div className="vertical-step-left">
                <div className="vertical-step-circle">
                  <IconComponent size={14} />
                </div>
                {idx < stages.length - 1 && (
                  <div className={`vertical-step-line ${isPassed ? "passed" : ""}`} />
                )}
              </div>
              <div className="vertical-step-right">
                <div className="vertical-step-label">{stage.label}</div>
                <div className="vertical-step-desc">
                  {stage.key === "delivered" && status === "delivered"
                    ? `Delivered on ${localStorage.getItem(`order_delivered_date_${selectedOrder?.id}`) ? new Date(localStorage.getItem(`order_delivered_date_${selectedOrder?.id}`)).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}`
                    : stage.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderOrderItemsEditor = (data, onChange, errors) => {
    const items = Array.isArray(data.orderItems) && data.orderItems.length > 0
      ? data.orderItems
      : [createDefaultOrderItem()];

    const updateItem = (index, updates) => {
      const newItems = [...items];
      const item = { ...newItems[index], ...updates };
      item.productDetails = formatProductDetails(item);
      newItems[index] = item;
      onChange({ ...data, orderItems: newItems });
    };

    const addItem = () => {
      const newItems = [...items, createDefaultOrderItem()];
      onChange({ ...data, orderItems: newItems });
    };

    const removeItem = (index) => {
      if (items.length <= 1) return;
      const newItems = items.filter((_, i) => i !== index);
      onChange({ ...data, orderItems: newItems });
    };

    const totalQuantitySum = items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);

    return (
      <div style={{ background: "#F8FAFC", padding: "16px", borderRadius: "12px", border: "1px solid #E2E8F0", marginTop: "6px", marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#1E293B" }}>
            Product Line Items ({items.length})
          </span>
          <span style={{ fontSize: "12px", background: "#EFF6FF", color: "#1D4ED8", padding: "4px 10px", borderRadius: "12px", fontWeight: 600 }}>
            Total Batch Quantity: {totalQuantitySum} units
          </span>
        </div>

        {items.map((item, idx) => {
          const selectedProject = item.project === "Other" ? (item.customProject || "Other") : (item.project || "EV Battery");
          const formattedVoltage = item.voltage !== undefined && item.voltage !== "" ? String(item.voltage).padStart(2, "0") : "02";
          const formattedCapacity = item.capacity !== undefined && item.capacity !== "" ? item.capacity : "3";
          const selectedChemistry = item.chemistry || "NMC";
          const notesText = item.notes || "";

          return (
            <div key={item.id || idx} style={{ background: "#FFFFFF", padding: "14px", borderRadius: "10px", border: "1px solid #CBD5E1", marginBottom: idx === items.length - 1 ? "12px" : "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                  Item #{idx + 1}
                </span>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    style={{ background: "#FEF2F2", color: "#EF4444", border: "1px solid #FCA5A5", borderRadius: "6px", padding: "3px 8px", fontSize: "12px", cursor: "pointer", fontWeight: 600 }}
                  >
                    Remove Item
                  </button>
                )}
              </div>

              {/* Project Selection Row */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px", background: "#F1F5F9", padding: "8px 12px", borderRadius: "8px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "220px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#1E293B", whiteSpace: "nowrap" }}>Select Project *:</label>
                  <select
                    value={item.project || "EV Battery"}
                    onChange={(e) => updateItem(idx, { project: e.target.value })}
                    style={{ flex: 1, padding: "6px 10px", border: "1px solid #94A3B8", borderRadius: "6px", fontSize: "13px", fontWeight: 600, color: "#0F172A", background: "#FFFFFF" }}
                  >
                    {PROJECT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                {item.project === "Other" && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1, minWidth: "180px" }}>
                    <label style={{ fontSize: "12px", color: "#475569", whiteSpace: "nowrap" }}>Battery Name:</label>
                    <input
                      type="text"
                      placeholder="Enter custom battery name..."
                      value={item.customProject || ""}
                      onChange={(e) => updateItem(idx, { customProject: e.target.value })}
                      style={{ width: "100%", padding: "6px 10px", border: "1px solid #CBD5E1", borderRadius: "6px", fontSize: "13px" }}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "10px" }}>
                {/* Voltage */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <label style={{ fontSize: "12px", color: "#64748B" }}>Volts:</label>
                  <input
                    type="text"
                    placeholder="02"
                    value={item.voltage}
                    onChange={(e) => updateItem(idx, { voltage: e.target.value })}
                    style={{ width: "55px", padding: "6px 8px", border: "1px solid #CBD5E1", borderRadius: "6px", fontSize: "13px", fontWeight: 600, textAlign: "center" }}
                  />
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>V</span>
                </div>

                {/* Capacity */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <label style={{ fontSize: "12px", color: "#64748B" }}>Capacity:</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="3"
                    value={item.capacity}
                    onChange={(e) => updateItem(idx, { capacity: e.target.value })}
                    style={{ width: "65px", padding: "6px 8px", border: "1px solid #CBD5E1", borderRadius: "6px", fontSize: "13px", fontWeight: 600, textAlign: "center" }}
                  />
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>Ah</span>
                </div>

                {/* Chemistry */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <label style={{ fontSize: "12px", color: "#64748B" }}>Chem:</label>
                  <select
                    value={selectedChemistry}
                    onChange={(e) => updateItem(idx, { chemistry: e.target.value })}
                    style={{ padding: "6px 10px", border: "1px solid #CBD5E1", borderRadius: "6px", fontSize: "13px", fontWeight: 600, color: "#0F172A", background: "#FFFFFF" }}
                  >
                    <option value="NMC">NMC</option>
                    <option value="LiFePO4">LiFePO4</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Notes */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1, minWidth: "140px" }}>
                  <label style={{ fontSize: "12px", color: "#64748B" }}>Notes:</label>
                  <input
                    type="text"
                    placeholder="Optional specs..."
                    value={item.notes || ""}
                    onChange={(e) => updateItem(idx, { notes: e.target.value })}
                    style={{ width: "100%", padding: "6px 8px", border: "1px solid #CBD5E1", borderRadius: "6px", fontSize: "13px" }}
                  />
                </div>

                {/* Item Quantity */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <label style={{ fontSize: "12px", color: "#1E293B", fontWeight: 700 }}>Qty *:</label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                    style={{ width: "65px", padding: "6px 8px", border: "1px solid #3B82F6", borderRadius: "6px", fontSize: "13px", fontWeight: 700, textAlign: "center", color: "#1D4ED8", background: "#EFF6FF" }}
                  />
                </div>
              </div>

              {/* Spec preview string */}
              <div style={{ fontSize: "12px", color: "#64748B", fontWeight: 500 }}>
                Spec String: <strong style={{ color: "#0F172A" }}>{selectedProject} — {formattedVoltage}V {formattedCapacity}Ah Chemistry = {selectedChemistry}{notesText.trim() ? ` (${notesText.trim()})` : ""}</strong>
              </div>

              {errors?.[`orderItem_${idx}`] && <span className="field-error" style={{ marginTop: "4px", display: "block" }}>{errors[`orderItem_${idx}`]}</span>}
              {errors?.[`orderItemQty_${idx}`] && <span className="field-error" style={{ marginTop: "4px", display: "block" }}>{errors[`orderItemQty_${idx}`]}</span>}
            </div>
          );
        })}

        <button
          type="button"
          onClick={addItem}
          style={{
            background: "#FFFFFF",
            color: "#2563EB",
            border: "1px dashed #3B82F6",
            borderRadius: "8px",
            padding: "8px 14px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            width: "100%",
            justifyContent: "center"
          }}
        >
          + Add Product Line Item
        </button>

        {errors?.orderItems && <span className="field-error" style={{ marginTop: "8px", display: "block" }}>{errors.orderItems}</span>}
      </div>
    );
  };

  return (
    <div className="orders-root">
      {/* Toast Banner */}
      {toast && (
        <div className={`toast-notification ${toast.type}`}>
          <span className="toast-icon">{toast.type === "success" ? "✓" : "✕"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="orders-header">
        <div>
          <h1 className="page-heading">
            {isSalesAdmin && "Sales Admin — Complete Order History"}
            {isProductionAdmin && "Production Admin — Complete Order History"}
            {isScmAdmin && "SCM Admin — Complete Order History"}
            {isSuperAdmin && "Order Management (Complete Order History)"}
          </h1>
          <p className="page-subheading">
            {isSalesAdmin && "View complete order history. Create new orders and edit orders currently in Sales stage."}
            {isProductionAdmin && "View complete order history. Monitor manufacturing pipeline and transition Production status."}
            {isScmAdmin && "View complete order history. Fill barcode/warranty details and dispatch completed orders."}
            {isSuperAdmin && "Full view and management of system order history across all pipeline stages."}
          </p>
        </div>

        <div className="header-actions">
          <button className="refresh-btn" onClick={fetchOrders} title="Refresh orders">
            <RefreshCw size={16} className={loading ? "spin" : ""} />
            <span>Refresh</span>
          </button>

          {isSalesAdmin && (
            <button className="primary-action-btn" onClick={() => setShowCreateModal(true)}>
              <Plus size={18} />
              <span>Create Order</span>
            </button>
          )}
        </div>
      </div>

      {/* Super Admin Filter Tabs */}
      {isSuperAdmin && (
        <div className="stage-tabs-container">
          <button className={`tab-btn ${adminStageTab === "ALL" ? "active" : ""}`} onClick={() => { setAdminStageTab("ALL"); setCurrentPage(1); }}>
            All Orders ({orders.length})
          </button>
          <button className={`tab-btn ${adminStageTab === "SALES" ? "active" : ""}`} onClick={() => { setAdminStageTab("SALES"); setCurrentPage(1); }}>
            Sales Registered ({orders.filter(o => o.orderStatus === "sales_registered").length})
          </button>
          <button className={`tab-btn ${adminStageTab === "PRODUCTION" ? "active" : ""}`} onClick={() => { setAdminStageTab("PRODUCTION"); setCurrentPage(1); }}>
            In Production ({orders.filter(o => o.orderStatus === "in_production").length})
          </button>
          <button className={`tab-btn ${adminStageTab === "PROD_DONE" ? "active" : ""}`} onClick={() => { setAdminStageTab("PROD_DONE"); setCurrentPage(1); }}>
            Production Complete ({orders.filter(o => o.orderStatus === "production_complete").length})
          </button>
          <button className={`tab-btn ${adminStageTab === "SCM_DONE" ? "active" : ""}`} onClick={() => { setAdminStageTab("SCM_DONE"); setCurrentPage(1); }}>
            SCM Complete ({orders.filter(o => o.orderStatus === "scm_complete").length})
          </button>
          <button className={`tab-btn ${adminStageTab === "DISPATCHED" ? "active" : ""}`} onClick={() => { setAdminStageTab("DISPATCHED"); setCurrentPage(1); }}>
            Dispatched ({orders.filter(o => o.orderStatus === "dispatched").length})
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by Order #, Customer, PI, Mobile, Barcode, Tracking ID..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery("")}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="filters-group" style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          >
            <option value="">All Statuses</option>
            <option value="sales_registered">Sales Registered</option>
            <option value="in_production">In Production</option>
            <option value="production_complete">Production Complete</option>
            <option value="scm_complete">SCM Complete</option>
            <option value="dispatched">Dispatched</option>
          </select>

          <select
            className="filter-select"
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setCurrentPage(1); }}
          >
            <option value="">All Priorities</option>
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
          </select>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Calendar size={14} style={{ color: "#6B7280" }} />
            <input
              type="date"
              className="filter-select"
              style={{ width: "135px" }}
              title="Start Date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
            />
            <span style={{ fontSize: "12px", color: "#6B7280" }}>to</span>
            <input
              type="date"
              className="filter-select"
              style={{ width: "135px" }}
              title="End Date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
            />
          </div>

          {(searchQuery || statusFilter || priorityFilter || startDate || endDate) && (
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("");
                setPriorityFilter("");
                setStartDate("");
                setEndDate("");
                setCurrentPage(1);
              }}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: "1px solid #E5E7EB",
                background: "#F3F4F6",
                color: "#374151",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Error State Banner */}
      {error && (
        <div className="error-banner">
          <AlertTriangle size={20} />
          <div className="error-content">
            <strong>Error loading orders:</strong> {error}
          </div>
          <button className="retry-btn" onClick={fetchOrders}>Retry</button>
        </div>
      )}

      {/* Orders Table Container */}
      <div className="table-container">
        {loading ? (
          /* Loading Skeleton */
          <div className="skeleton-container">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="skeleton-row" />
            ))}
          </div>
        ) : paginatedOrders.length === 0 ? (
          /* Empty State */
          <div className="empty-state">
            <Package size={48} className="empty-icon" />
            <h3>No Orders Found</h3>
            <p>
              {searchQuery || statusFilter || priorityFilter
                ? "No orders match your current search or filter criteria."
                : isSalesAdmin
                  ? "You haven't created any orders yet. Click 'Create Order' to start."
                  : isProductionAdmin
                    ? "There are currently no orders in the production pipeline."
                    : isScmAdmin
                      ? "There are no production-completed orders ready for SCM processing."
                      : "No orders exist in the system."}
            </p>
            {isSalesAdmin && !searchQuery && (
              <button className="primary-action-btn mt-4" onClick={() => setShowCreateModal(true)}>
                <Plus size={16} /> Create First Order
              </button>
            )}
          </div>
        ) : (
          /* Orders Table */
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order # & PI</th>
                <th>Customer & Contact</th>
                <th>Product Details</th>
                <th>Address</th>
                <th>Order Status</th>
                <th>Production Status</th>
                <th>Barcode & Tracking</th>
                <th>Priority & Payment</th>
                <th>Created & Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map((order) => {
                const statusBadge = getStatusBadge(order.orderStatus);
                const priorityBadge = getPriorityBadge(order.priority);
                const isSalesRegistered = order.orderStatus === "sales_registered";
                const isProductionCompleted = order.productionStatus === "completed" || order.orderStatus === "production_complete";
                const isScmComplete = order.orderStatus === "scm_complete";

                return (
                  <tr key={order.id} onClick={() => handleViewDetails(order.id)}>
                    {/* Order Number & PI */}
                    <td>
                      <div className="order-num-text">{order.orderNumber || `ORD-#${order.id}`}</div>
                      <div className="sub-text">P.I.: {order.piNumber || "—"}</div>
                    </td>

                    {/* Customer Info */}
                    <td>
                      <div className="customer-name">{order.customerName || "—"}</div>
                      <div className="sub-text">📞 {order.mobileNumber || "—"}</div>
                    </td>

                    {/* Product Details */}
                    <td>
                      {Array.isArray(order.orderItems) && order.orderItems.length > 0 ? (
                        <div>
                          <div style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 600, color: '#1E293B' }} title={order.orderItems.map(it => `${it.productDetails || ''} (Qty: ${it.quantity})`).join(', ')}>
                            {order.orderItems[0].productDetails || "—"}
                          </div>
                          <div style={{ fontSize: "11px", color: "#2563EB", fontWeight: 600, marginTop: "2px" }}>
                            {order.orderItems.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0)} units
                            {order.orderItems.length > 1 && (
                              <span style={{ background: "#EFF6FF", color: "#1D4ED8", padding: "1px 6px", borderRadius: "10px", marginLeft: "4px", fontSize: "10px" }}>
                                {order.orderItems.length} items
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, color: '#374151' }} title={order.productDetails}>
                            {order.productDetails || "—"}
                          </div>
                          <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>
                            {order.quantity || order.partQuantity || 1} units
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Address */}
                    <td>
                      <div style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: '#374151' }} title={order.address}>
                        {order.address || "—"}
                      </div>
                    </td>

                    {/* Order Lifecycle Status */}
                    <td>
                      <span
                        className="badge-pill font-medium"
                        style={{
                          background: statusBadge.bg,
                          color: statusBadge.fg,
                          border: `1px solid ${statusBadge.border}`,
                        }}
                      >
                        {statusBadge.label}
                      </span>
                    </td>

                    {/* Production Status */}
                    <td>
                      <span className={`prod-status-tag ${order.productionStatus || "pending"}`}>
                        {order.productionStatus === "in_progress"
                          ? "In Progress"
                          : order.productionStatus === "completed"
                            ? "Completed"
                            : "Pending"}
                      </span>
                    </td>

                    {/* Barcode & Tracking ID */}
                    <td>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>
                        {order.barcode ? `🏷️ ${order.barcode}` : "—"}
                      </div>
                      <div style={{ fontSize: 11, color: "#6B7280" }}>
                        {order.trackingId ? `🚚 ${order.trackingId}` : "—"}
                      </div>
                    </td>

                    {/* Priority & Payment */}
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-start" }}>
                        <span className="badge-pill" style={{ background: priorityBadge.bg, color: priorityBadge.fg }}>
                          {priorityBadge.label}
                        </span>
                        <span className={`payment-tag ${order.paymentStatus === "paid"
                          ? "paid"
                          : order.paymentStatus === "partial"
                            ? "partial"
                            : "pending"
                          }`}>
                          {order.paymentStatus === "paid"
                            ? "Paid"
                            : order.paymentStatus === "partial"
                              ? "Partial"
                              : "Pending"}
                        </span>
                        {(isSalesAdmin || isSuperAdmin) && (
                          <div style={{ fontSize: "11px", fontWeight: 600, color: (Number(order.pendingAmount) || (order.paymentStatus === "paid" ? 0 : 1)) > 0 ? "#DC2626" : "#059669", marginTop: "2px" }}>
                            Pending: ₹{parseFloat(order.pendingAmount !== undefined && order.pendingAmount !== null ? order.pendingAmount : (order.paymentStatus === "paid" ? 0 : (order.totalAmount || order.totalPrice || 0))).toLocaleString("en-IN")}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Created & Updated Date */}
                    <td>
                      <div style={{ fontSize: 11, color: "#374151", fontWeight: 500 }}>
                        {formatDate(order.createdAt || order.createdDate)}
                      </div>
                      <div style={{ fontSize: 10, color: "#9CA3AF" }}>
                        Upd: {formatDate(order.updatedAt || order.updatedDate)}
                      </div>
                    </td>

                    {/* Actions Column */}
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="row-actions">
                        {/* View Button */}
                        <button
                          className="icon-action-btn view-btn"
                          title="View Order Details"
                          onClick={() => handleViewDetails(order.id)}
                        >
                          <Eye size={15} />
                        </button>

                        {/* Sales Admin Edit Order */}
                        {isSalesAdmin && (
                          <button
                            className="icon-action-btn edit-btn"
                            title={isSalesRegistered ? "Edit Sales Order" : "Read-only: Order has progressed past Sales stage"}
                            disabled={!isSalesRegistered}
                            onClick={() => openEditSalesModal(order)}
                          >
                            <Edit2 size={15} />
                          </button>
                        )}

                        {/* Production Admin Transitions */}
                        {isProductionAdmin && (
                          <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                            <select
                              className="filter-select"
                              style={{ fontSize: "11px", height: "30px", padding: "0 6px", fontWeight: 600, borderRadius: "6px" }}
                              value={order.productionStatus === "in_progress" ? "in_progress" : order.productionStatus === "testing" ? "testing" : order.productionStatus === "completed" ? "completed" : "pending"}
                              onChange={(e) => handleUpdateProductionStatus(order.id, e.target.value)}
                              disabled={submitting}
                            >
                              <option value="pending">Pending</option>
                              <option value="in_progress">In Production</option>
                              <option value="testing">Testing</option>
                              <option value="completed">Completed</option>
                            </select>
                          </div>
                        )}

                        {/* SCM Admin Actions */}
                        {isScmAdmin && (
                          <>
                            {/* Fill SCM Details Button (when production is complete) */}
                            {order.orderStatus === "production_complete" && (
                              <button
                                className="scm-action-btn fill-details"
                                disabled={submitting}
                                onClick={() => openScmModal(order)}
                              >
                                Fill SCM Details
                              </button>
                            )}

                            {/* Dispatch Button (enabled ONLY when scm_complete) */}
                            {isScmComplete && (
                              <button
                                className="scm-action-btn dispatch-btn"
                                disabled={submitting}
                                onClick={() => handleDispatchOrder(order.id)}
                              >
                                <Truck size={14} /> Dispatch
                              </button>
                            )}

                            {order.orderStatus === "dispatched" && (
                              <button
                                className="icon-action-btn pdf-btn"
                                title="Download Order Report (PDF)"
                                style={{ background: "#EFF6FF", color: "#1D4ED8", borderColor: "#BFDBFE" }}
                                onClick={() => generateOrderPdfReport(order)}
                              >
                                <FileText size={15} />
                              </button>
                            )}

                            {order.orderStatus === "dispatched" && (
                              <span className="done-badge dispatched">✓ Dispatched</span>
                            )}

                            {(order.orderStatus === "sales_registered" || order.orderStatus === "in_production") && (
                              <span className="read-only-label">In Pipeline</span>
                            )}
                          </>
                        )}

                        {/* Super Admin Read-only view label */}
                        {isSuperAdmin && (
                          <span className="read-only-label">Read Only</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Bar */}
      {!loading && filteredOrders.length > 0 && (
        <div className="pagination-bar">
          <span className="pagination-info">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, filteredOrders.length)} of {filteredOrders.length} orders
          </span>
          <div className="pagination-controls">
            <button
              className="page-nav-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              <ChevronLeft size={16} /> Prev
            </button>
            <span className="page-num">
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="page-nav-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ORDER DETAILS DRAWER */}
      {/* ========================================================================= */}
      {showDrawer && selectedOrder && (
        <div className="drawer-overlay" onClick={() => setShowDrawer(false)}>
          <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <h2>Order Details</h2>
                <div className="order-number-subtitle">{selectedOrder.orderNumber || `ORD-#${selectedOrder.id}`}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {selectedOrder.orderStatus === "dispatched" && (
                  <button
                    onClick={() => generateOrderPdfReport(selectedOrder)}
                    style={{
                      background: "linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: "8px",
                      padding: "8px 14px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)"
                    }}
                  >
                    <FileText size={14} /> Download Order Report (PDF)
                  </button>
                )}
                <button className="close-drawer-btn" onClick={() => setShowDrawer(false)}>
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="drawer-body">
              {/* Visual Lifecycle Progress Stepper */}
              <div className="drawer-section">
                <h4 className="section-title">
                  <Layers size={16} /> Lifecycle Progress
                </h4>
                {renderProgressStepper(selectedOrder.orderStatus)}
              </div>

              {/* Basic & Sales Information */}
              <div className="drawer-section">
                <h4 className="section-title">
                  <FileText size={16} /> Order & Sales Information
                </h4>
                <div className="details-grid">
                  <div className="detail-item">
                    <span className="label">Order Number</span>
                    <span className="val highlight">{selectedOrder.orderNumber || "—"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Customer Name</span>
                    <span className="val">{selectedOrder.customerName || "—"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">PI Number</span>
                    <span className="val">{selectedOrder.piNumber || "—"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Mobile Number</span>
                    <span className="val">{selectedOrder.mobileNumber || "—"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Customer Email</span>
                    <span className="val">{selectedOrder.customerEmail || "—"}</span>
                  </div>
                  <div className="detail-item full-width" style={{ flexDirection: "column", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: "8px" }}>
                      <span className="label" style={{ fontWeight: 600, color: "#475569" }}>
                        Product Line Items ({selectedOrder.orderItems?.length || 1})
                      </span>
                      {!isEditingDrawerProductDetails ? (
                        <button
                          onClick={openDrawerItemsEdit}
                          style={{
                            background: "#EFF6FF",
                            color: "#2563EB",
                            border: "1px solid #BFDBFE",
                            borderRadius: "6px",
                            padding: "4px 10px",
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <Edit2 size={12} /> Edit Line Items
                        </button>
                      ) : (
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            onClick={handleSaveDrawerProductDetails}
                            disabled={submitting}
                            style={{
                              background: "#10B981",
                              color: "#FFFFFF",
                              border: "none",
                              borderRadius: "6px",
                              padding: "4px 12px",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer"
                            }}
                          >
                            {submitting ? "Saving..." : "Save"}
                          </button>
                          <button
                            onClick={() => setIsEditingDrawerProductDetails(false)}
                            style={{
                              background: "#F3F4F6",
                              color: "#374151",
                              border: "1px solid #D1D5DB",
                              borderRadius: "6px",
                              padding: "4px 10px",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer"
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>

                    {!isEditingDrawerProductDetails ? (
                      <div style={{ width: "100%" }}>
                        {selectedOrder.orderItems && selectedOrder.orderItems.length > 0 ? (
                          <div style={{ border: "1px solid #E2E8F0", borderRadius: "8px", overflow: "hidden", background: "#F8FAFC" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                              <thead>
                                <tr style={{ background: "#F1F5F9", color: "#475569", fontSize: "11px", textTransform: "uppercase" }}>
                                  <th style={{ padding: "8px 12px", textAlign: "left" }}>#</th>
                                  <th style={{ padding: "8px 12px", textAlign: "left" }}>Product Specification</th>
                                  <th style={{ padding: "8px 12px", textAlign: "right" }}>Quantity</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedOrder.orderItems.map((it, idx) => (
                                  <tr key={it.id || idx} style={{ borderTop: "1px solid #E2E8F0" }}>
                                    <td style={{ padding: "8px 12px", color: "#64748B", fontWeight: 600 }}>{idx + 1}</td>
                                    <td style={{ padding: "8px 12px", color: "#0F172A", fontWeight: 600 }}>{it.productDetails || "—"}</td>
                                    <td style={{ padding: "8px 12px", textAlign: "right", color: "#2563EB", fontWeight: 700 }}>{it.quantity} units</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div style={{ background: "#F8FAFC", padding: "10px 14px", borderRadius: "8px", border: "1px solid #E2E8F0", width: "100%", boxSizing: "border-box" }}>
                            <span style={{ fontWeight: 600, color: "#0F172A", fontSize: "14px" }}>
                              {selectedOrder.productDetails || "—"}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ width: "100%" }}>
                        {renderOrderItemsEditor({ orderItems: drawerOrderItems }, (updated) => setDrawerOrderItems(updated.orderItems), editFormErrors)}
                      </div>
                    )}
                  </div>
                  <div className="detail-item">
                    <span className="label">Total Quantity</span>
                    <span className="val highlight">
                      {selectedOrder.orderItems && selectedOrder.orderItems.length > 0
                        ? selectedOrder.orderItems.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0)
                        : (selectedOrder.partQuantity ?? selectedOrder.quantity ?? 1)} Units
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Expected Delivery Date</span>
                    <span className="val">{selectedOrder.expectedDeliveryDate || "—"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Payment Status</span>
                    <span className="val">
                      <span className={`payment-tag ${selectedOrder.paymentStatus === "paid"
                        ? "paid"
                        : selectedOrder.paymentStatus === "partial"
                          ? "partial"
                          : "pending"
                        }`}>
                        {selectedOrder.paymentStatus === "paid"
                          ? "Paid"
                          : selectedOrder.paymentStatus === "partial"
                            ? "Partial"
                            : "Pending"}
                      </span>
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Total Invoice Amount</span>
                    <span className="val highlight" style={{ color: "#1E293B", fontWeight: 600 }}>
                      ₹{parseFloat(selectedOrder.totalInvoiceAmount || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Received Amount</span>
                    <span className="val" style={{ color: "#10B981", fontWeight: 600 }}>
                      ₹{parseFloat(selectedOrder.receivedAmount || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  {(isSalesAdmin || isSuperAdmin) && (
                    <div className="detail-item">
                      <span className="label">Pending Amount</span>
                      <span className="val" style={{ color: (selectedOrder.pendingAmount || 0) > 0 ? "#EF4444" : "#10B981", fontWeight: 600 }}>
                        ₹{parseFloat(selectedOrder.pendingAmount || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}
                  <div className="detail-item">
                    <span className="label">Priority</span>
                    <span className="val">
                      <span className="badge-pill" style={{ background: getPriorityBadge(selectedOrder.priority).bg, color: getPriorityBadge(selectedOrder.priority).fg }}>
                        {getPriorityBadge(selectedOrder.priority).label}
                      </span>
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Order Status</span>
                    <span className="val">
                      <span
                        className="badge-pill"
                        style={{
                          background: getStatusBadge(selectedOrder.orderStatus).bg,
                          color: getStatusBadge(selectedOrder.orderStatus).fg,
                        }}
                      >
                        {getStatusBadge(selectedOrder.orderStatus).label}
                      </span>
                    </span>
                  </div>
                  <div className="detail-item full-width" style={{ flexDirection: "column", alignItems: "flex-start" }}>
                    <span className="label" style={{ marginBottom: "4px" }}>Customer Address</span>
                    <span className="val" style={{ background: "#F8FAFC", padding: "10px 14px", borderRadius: "8px", border: "1px solid #E2E8F0", width: "100%", boxSizing: "border-box", whiteSpace: "pre-line" }}>
                      {selectedOrder.address || "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Production Stage Information */}
              <div className="drawer-section">
                <h4 className="section-title">
                  <Sparkles size={16} /> Production Information
                </h4>
                <div className="details-grid">
                  <div className="detail-item">
                    <span className="label">Production Status</span>
                    <span className="val">
                      <span className={`prod-status-tag ${selectedOrder.productionStatus || "pending"}`}>
                        {selectedOrder.productionStatus === "in_progress"
                          ? "In Production"
                          : selectedOrder.productionStatus === "testing"
                            ? "Testing"
                            : selectedOrder.productionStatus === "completed"
                              ? "Completed"
                              : "Pending"}
                      </span>
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Production Updated By</span>
                    <span className="val">{selectedOrder.productionUpdatedByEmail || "—"}</span>
                  </div>
                </div>
              </div>



              {/* SCM & Logistics Information */}
              <div className="drawer-section">
                <h4 className="section-title">
                  <Truck size={16} /> SCM & Warranty Details
                </h4>
                <div className="details-grid">
                  <div className="detail-item">
                    <span className="label">Barcode / Range</span>
                    <span className="val">{selectedOrder.barcode || (selectedOrder.startBarcode ? `${selectedOrder.startBarcode} - ${selectedOrder.endBarcode}` : "—")}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Courier Name</span>
                    <span className="val highlight">{selectedOrder.courierName || "—"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Tracking ID</span>
                    <span className="val">{selectedOrder.trackingId || "—"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Service Warranty</span>
                    <span className="val">{selectedOrder.serviceWarrantyMonths !== null && selectedOrder.serviceWarrantyMonths !== undefined ? `${selectedOrder.serviceWarrantyMonths} months` : "—"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Full Warranty</span>
                    <span className="val">{selectedOrder.fullWarrantyMonths !== null && selectedOrder.fullWarrantyMonths !== undefined ? `${selectedOrder.fullWarrantyMonths} months` : "—"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Total Warranty</span>
                    <span className="val highlight">{(Number(selectedOrder.serviceWarrantyMonths) || 0) + (Number(selectedOrder.fullWarrantyMonths) || 0)} months</span>
                  </div>
                </div>
              </div>

              {/* Audit & Timestamps */}
              <div className="drawer-section">
                <h4 className="section-title">
                  <Clock size={16} /> Audit & Timestamps
                </h4>
                <div className="details-grid">
                  <div className="detail-item">
                    <span className="label">Created By</span>
                    <span className="val">{selectedOrder.createdByAdminEmail || "—"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Created Time</span>
                    <span className="val">{formatDate(selectedOrder.createdAt)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Updated Time</span>
                    <span className="val">{formatDate(selectedOrder.updatedAt)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Production Completed Time</span>
                    <span className="val">{formatDate(selectedOrder.productionCompletedAt)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">SCM Completed Time</span>
                    <span className="val">{formatDate(selectedOrder.scmCompletedAt)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Dispatch Time</span>
                    <span className="val">{formatDate(selectedOrder.dispatchedAt)}</span>
                  </div>
                </div>
              </div>

              {/* Action Toolbar Inside Drawer */}
              {/* Action Toolbar Inside Drawer */}
              {(isSalesAdmin || isProductionAdmin || isScmAdmin || isSuperAdmin) && (
                <div className="drawer-actions-bar" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>

                  {isSalesAdmin && selectedOrder.orderStatus === "sales_registered" && (
                    <button className="primary-action-btn full-w" onClick={() => openEditSalesModal(selectedOrder)}>
                      <Edit2 size={16} /> Edit Sales Order
                    </button>
                  )}

                  {isSalesAdmin && (selectedOrder.paymentStatus || "").toLowerCase() !== "paid" && (
                    <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>Record Incremental Payment</span>
                      <form onSubmit={handleRecordIncrementalPayment} style={{ display: "flex", gap: "8px", margin: 0 }}>
                        <div style={{ flex: 1, position: "relative" }}>
                          <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "13px", color: "#64748B", fontWeight: 600 }}>₹</span>
                          <input
                            type="number"
                            step="any"
                            min="0.01"
                            max={selectedOrder.pendingAmount || 0}
                            placeholder="Enter amount..."
                            value={recordPaymentAmount}
                            onChange={(e) => setRecordPaymentAmount(e.target.value)}
                            style={{ width: "100%", padding: "8px 12px 8px 24px", border: "1px solid #CBD5E1", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box" }}
                            required
                          />
                        </div>
                        <button
                          type="submit"
                          className="primary-action-btn"
                          style={{ padding: "0 16px", height: "36px", whiteSpace: "nowrap" }}
                          disabled={submitting}
                        >
                          {submitting ? "Recording..." : "Record"}
                        </button>
                      </form>
                      {selectedOrder.pendingAmount !== undefined && (
                        <span style={{ fontSize: "11px", color: "#64748B" }}>
                          Max recordable: ₹{parseFloat(selectedOrder.pendingAmount).toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>
                  )}

                  {isProductionAdmin && (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        className="status-transition-btn start-prod"
                        style={{ flex: 1, opacity: 1 }}
                        disabled={submitting || selectedOrder.productionStatus === "in_progress"}
                        onClick={() => handleUpdateProductionStatus(selectedOrder.id, "in_progress")}
                      >
                        In Production
                      </button>
                      <button
                        className="status-transition-btn"
                        style={{ flex: 1, background: "#E0F2FE", color: "#0369A1", border: "1px solid #7DD3FC", opacity: 1 }}
                        disabled={submitting || selectedOrder.productionStatus === "testing"}
                        onClick={() => handleUpdateProductionStatus(selectedOrder.id, "testing")}
                      >
                        Testing
                      </button>
                      <button
                        className="status-transition-btn complete-prod"
                        style={{ flex: 1, opacity: 1 }}
                        disabled={submitting || selectedOrder.productionStatus === "completed"}
                        onClick={() => handleUpdateProductionStatus(selectedOrder.id, "completed")}
                      >
                        Completed
                      </button>
                    </div>
                  )}

                  {(isScmAdmin || isSuperAdmin) && (
                    <button
                      className="sec-btn full-w"
                      style={{ background: "#F1F5F9", color: "#0F172A", fontWeight: 600 }}
                      onClick={() => openWarrantyModal(selectedOrder)}
                    >
                      🛡️ Battery Warranty Registration
                    </button>
                  )}

                  {(isScmAdmin || isSuperAdmin) && selectedOrder.orderStatus === "production_complete" && (
                    <button
                      className="scm-action-btn fill-details full-w"
                      disabled={submitting}
                      onClick={() => openScmModal(selectedOrder)}
                    >
                      Fill SCM Details
                    </button>
                  )}

                  {(isScmAdmin || isSuperAdmin) && selectedOrder.orderStatus === "scm_complete" && (
                    <button
                      className="scm-action-btn dispatch-btn full-w"
                      disabled={submitting}
                      onClick={() => handleDispatchOrder(selectedOrder.id)}
                    >
                      <Truck size={16} /> Dispatch Order Now
                    </button>
                  )}

                  {(isScmAdmin || isSuperAdmin) && selectedOrder.orderStatus === "dispatched" && (
                    <button
                      className="primary-action-btn full-w mark-delivered-btn"
                      style={{ background: "#10B981", color: "#FFFFFF", border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "6px" }}
                      disabled={submitting}
                      onClick={() => handleMarkAsDelivered(selectedOrder.id)}
                    >
                      <CheckCircle size={16} /> Mark as Delivered & Print PDF
                    </button>
                  )}

                  {selectedOrder.orderStatus === "dispatched" && (
                    <button
                      className="sec-btn full-w"
                      style={{ background: "#F1F5F9", color: "#0F172A", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "6px" }}
                      onClick={() => generateOrderPdfReport(selectedOrder)}
                    >
                      <FileText size={16} /> View Dispatch Report (PDF)
                    </button>
                  )}

                  {selectedOrder.orderStatus === "delivered" && (
                    <button
                      className="primary-action-btn full-w download-pdf-btn"
                      style={{ background: "linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "6px" }}
                      onClick={() => generateOrderPdfReport(selectedOrder)}
                    >
                      <FileText size={16} /> Download Order Overview (PDF)
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SALES ADMIN: CREATE ORDER MODAL */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Sales Order</h2>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSalesOrder}>
              <div className="modal-body">
                {/* Registered Customer Search Autocomplete */}
                <div className="form-group" style={{ position: "relative" }}>
                  <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Search Registered Customer (Optional)</span>
                    <span style={{ fontSize: "11px", color: "#6B7280" }}>Auto-populates customer details</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Search by customer name, email, or mobile..."
                    value={customerSearchTerm}
                    onChange={(e) => {
                      setCustomerSearchTerm(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                  />
                  {showCustomerDropdown && customerSearchTerm.trim() && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        zIndex: 99,
                        background: "#FFFFFF",
                        border: "1px solid #E5E7EB",
                        borderRadius: "8px",
                        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                        maxHeight: "180px",
                        overflowY: "auto",
                        marginTop: "4px"
                      }}
                    >
                      {registeredUsers
                        .filter((u) => {
                          const term = customerSearchTerm.toLowerCase();
                          return (
                            (u.name || "").toLowerCase().includes(term) ||
                            (u.email || "").toLowerCase().includes(term) ||
                            (u.mobile || u.mobileNumber || u.phone || "").includes(term)
                          );
                        })
                        .slice(0, 6)
                        .map((u) => (
                          <div
                            key={u.id || u.email}
                            style={{
                              padding: "8px 12px",
                              cursor: "pointer",
                              borderBottom: "1px solid #F3F4F6"
                            }}
                            onMouseDown={() => {
                              setSalesFormData((prev) => ({
                                ...prev,
                                assignedUserId: u.id || u.userId || null,
                                customerName: u.name || "",
                                mobileNumber: u.mobile || u.mobileNumber || u.phone || prev.mobileNumber,
                                customerEmail: u.email || "",
                              }));
                              setCustomerSearchTerm(`${u.name} (${u.email || u.mobile || ""})`);
                              setShowCustomerDropdown(false);
                            }}
                          >
                            <div style={{ fontWeight: 600, fontSize: "13px", color: "#111827" }}>{u.name}</div>
                            <div style={{ fontSize: "11px", color: "#6B7280" }}>
                              {u.email} {u.mobile || u.mobileNumber ? `• 📞 ${u.mobile || u.mobileNumber}` : ""}
                            </div>
                          </div>
                        ))}
                      {registeredUsers.filter((u) => {
                        const term = customerSearchTerm.toLowerCase();
                        return (
                          (u.name || "").toLowerCase().includes(term) ||
                          (u.email || "").toLowerCase().includes(term) ||
                          (u.mobile || u.mobileNumber || u.phone || "").includes(term)
                        );
                      }).length === 0 && (
                          <div style={{ padding: "10px", fontSize: "12px", color: "#9CA3AF", textAlign: "center" }}>
                            No matching registered users found
                          </div>
                        )}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Customer Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={salesFormData.customerName}
                    onChange={(e) => setSalesFormData({ ...salesFormData, customerName: e.target.value })}
                  />
                  {salesFormErrors.customerName && <span className="field-error">{salesFormErrors.customerName}</span>}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>P.I. Number *</label>
                    <input
                      type="text"
                      placeholder="e.g. PI-2026-001"
                      value={salesFormData.piNumber}
                      onChange={(e) => setSalesFormData({ ...salesFormData, piNumber: e.target.value })}
                    />
                    {salesFormErrors.piNumber && <span className="field-error">{salesFormErrors.piNumber}</span>}
                  </div>

                  <div className="form-group">
                    <label>Mobile Number (10 digits) *</label>
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="e.g. 9876543210"
                      value={salesFormData.mobileNumber}
                      onChange={(e) => setSalesFormData({ ...salesFormData, mobileNumber: e.target.value })}
                    />
                    {salesFormErrors.mobileNumber && <span className="field-error">{salesFormErrors.mobileNumber}</span>}
                  </div>
                </div>

                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label>Product Line Items & Quantities *</label>
                  {renderOrderItemsEditor(salesFormData, setSalesFormData, salesFormErrors)}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Expected Delivery Date *</label>
                    <input
                      type="date"
                      value={salesFormData.expectedDeliveryDate}
                      onChange={(e) => setSalesFormData({ ...salesFormData, expectedDeliveryDate: e.target.value })}
                    />
                    {salesFormErrors.expectedDeliveryDate && <span className="field-error">{salesFormErrors.expectedDeliveryDate}</span>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Total Invoice Amount (Including Tax) (₹) *</label>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      placeholder="e.g. 50000"
                      value={salesFormData.totalInvoiceAmount}
                      onChange={(e) => setSalesFormData({ ...salesFormData, totalInvoiceAmount: e.target.value })}
                    />
                    {salesFormErrors.totalInvoiceAmount && <span className="field-error">{salesFormErrors.totalInvoiceAmount}</span>}
                  </div>

                  <div className="form-group">
                    <label>Received Amount (₹)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 20000 (Defaults to 0)"
                      value={salesFormData.receivedAmount}
                      onChange={(e) => setSalesFormData({ ...salesFormData, receivedAmount: e.target.value })}
                    />
                    {salesFormErrors.receivedAmount && <span className="field-error">{salesFormErrors.receivedAmount}</span>}
                  </div>

                  <div className="form-group">
                    <label>Pending Amount (₹) (Calculated)</label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={(() => {
                        const total = parseFloat(salesFormData.totalInvoiceAmount) || 0;
                        const received = parseFloat(salesFormData.receivedAmount) || 0;
                        const pending = Math.max(0, total - received);
                        return `₹ ${pending.toLocaleString("en-IN")}`;
                      })()}
                      style={{ background: "#F1F5F9", color: "#64748B", cursor: "not-allowed" }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Priority *</label>
                  <select
                    value={salesFormData.priority}
                    onChange={(e) => setSalesFormData({ ...salesFormData, priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                  {salesFormErrors.priority && <span className="field-error">{salesFormErrors.priority}</span>}
                </div>



                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label>Customer Address (Optional)</label>
                  <textarea
                    placeholder="Enter customer address..."
                    value={salesFormData.address || ""}
                    onChange={(e) => setSalesFormData({ ...salesFormData, address: e.target.value })}
                    rows={2}
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #D1D5DB", borderRadius: "6px", fontSize: "14px" }}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="sec-btn" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-action-btn" disabled={submitting}>
                  {submitting ? "Creating..." : "Submit Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SALES ADMIN: EDIT ORDER MODAL */}
      {/* ========================================================================= */}
      {showEditModal && editOrderData && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Sales Order ({editOrderData.orderNumber})</h2>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateSalesOrder}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Customer Name *</label>
                  <input
                    type="text"
                    value={editOrderData.customerName}
                    onChange={(e) => setEditOrderData({ ...editOrderData, customerName: e.target.value })}
                  />
                  {editFormErrors.customerName && <span className="field-error">{editFormErrors.customerName}</span>}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>P.I. Number *</label>
                    <input
                      type="text"
                      value={editOrderData.piNumber}
                      onChange={(e) => setEditOrderData({ ...editOrderData, piNumber: e.target.value })}
                    />
                    {editFormErrors.piNumber && <span className="field-error">{editFormErrors.piNumber}</span>}
                  </div>

                  <div className="form-group">
                    <label>Mobile Number (10 digits) *</label>
                    <input
                      type="text"
                      maxLength={10}
                      value={editOrderData.mobileNumber}
                      onChange={(e) => setEditOrderData({ ...editOrderData, mobileNumber: e.target.value })}
                    />
                    {editFormErrors.mobileNumber && <span className="field-error">{editFormErrors.mobileNumber}</span>}
                  </div>
                </div>

                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label>Product Line Items & Quantities *</label>
                  {renderOrderItemsEditor(editOrderData, setEditOrderData, editFormErrors)}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Expected Delivery Date *</label>
                    <input
                      type="date"
                      value={editOrderData.expectedDeliveryDate}
                      onChange={(e) => setEditOrderData({ ...editOrderData, expectedDeliveryDate: e.target.value })}
                    />
                    {editFormErrors.expectedDeliveryDate && <span className="field-error">{editFormErrors.expectedDeliveryDate}</span>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Total Invoice Amount (Including Tax) (₹) *</label>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      placeholder="e.g. 50000"
                      value={editOrderData.totalInvoiceAmount}
                      onChange={(e) => setEditOrderData({ ...editOrderData, totalInvoiceAmount: e.target.value })}
                    />
                    {editFormErrors.totalInvoiceAmount && <span className="field-error">{editFormErrors.totalInvoiceAmount}</span>}
                  </div>

                  <div className="form-group">
                    <label>Received Amount (₹)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 20000"
                      value={editOrderData.receivedAmount}
                      onChange={(e) => setEditOrderData({ ...editOrderData, receivedAmount: e.target.value })}
                    />
                    {editFormErrors.receivedAmount && <span className="field-error">{editFormErrors.receivedAmount}</span>}
                  </div>

                  <div className="form-group">
                    <label>Pending Amount (₹) (Calculated)</label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={(() => {
                        const total = parseFloat(editOrderData.totalInvoiceAmount) || 0;
                        const received = parseFloat(editOrderData.receivedAmount) || 0;
                        const pending = Math.max(0, total - received);
                        return `₹ ${pending.toLocaleString("en-IN")}`;
                      })()}
                      style={{ background: "#F1F5F9", color: "#64748B", cursor: "not-allowed" }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Priority *</label>
                  <select
                    value={editOrderData.priority}
                    onChange={(e) => setEditOrderData({ ...editOrderData, priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                  {editFormErrors.priority && <span className="field-error">{editFormErrors.priority}</span>}
                </div>



                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label>Customer Address (Optional)</label>
                  <textarea
                    placeholder="Enter customer address..."
                    value={editOrderData.address || ""}
                    onChange={(e) => setEditOrderData({ ...editOrderData, address: e.target.value })}
                    rows={2}
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #D1D5DB", borderRadius: "6px", fontSize: "14px" }}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="sec-btn" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-action-btn" disabled={submitting}>
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCM ADMIN: FILL DETAILS MODAL */}
      {/* ========================================================================= */}
      {showScmModal && orderForScm && (
        <div className="modal-overlay" onClick={() => setShowScmModal(false)}>
          <div className="modal-content" style={{ maxWidth: "760px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Fill SCM Details ({orderForScm.orderNumber})</h2>
              <button className="close-btn" onClick={() => setShowScmModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCompleteScm}>
              <div className="modal-body" style={{ padding: "20px" }}>
                {/* 1. Common Shipment Information Section */}
                <div style={{ background: "#F8FAFC", padding: "16px", borderRadius: "10px", border: "1px solid #E2E8F0", marginBottom: "20px" }}>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#1E3A8A", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Truck size={16} /> Common Order Shipment Details
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Invoice Number *</label>
                      <input
                        type="text"
                        placeholder="e.g. INV-2026-001"
                        value={scmFormData.invoiceNumber}
                        onChange={(e) => setScmFormData({ ...scmFormData, invoiceNumber: e.target.value })}
                      />
                      {scmFormErrors.invoiceNumber && <span className="field-error">{scmFormErrors.invoiceNumber}</span>}
                    </div>

                    <div className="form-group">
                      <label>Courier Name (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. DTDC, BlueDart, FedEx"
                        value={scmFormData.courierName}
                        onChange={(e) => setScmFormData({ ...scmFormData, courierName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Tracking ID *</label>
                    <input
                      type="text"
                      placeholder="e.g. TRK123456789"
                      value={scmFormData.trackingId}
                      onChange={(e) => setScmFormData({ ...scmFormData, trackingId: e.target.value })}
                    />
                    {scmFormErrors.trackingId && <span className="field-error">{scmFormErrors.trackingId}</span>}
                  </div>
                </div>

                {/* 2. Product Line Items Barcode & Warranty Section */}
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#1E3A8A", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Barcode size={16} /> Product Line Items — Barcodes & Warranty
                  </div>

                  {scmItemDetails.map((item, idx) => {
                    const updateItemState = (updates) => {
                      const newItems = [...scmItemDetails];
                      newItems[idx] = { ...newItems[idx], ...updates };
                      setScmItemDetails(newItems);
                    };

                    return (
                      <div
                        key={item.id || idx}
                        style={{
                          background: "#FFFFFF",
                          border: "1px solid #CBD5E1",
                          borderRadius: "10px",
                          padding: "16px",
                          marginBottom: idx === scmItemDetails.length - 1 ? "0" : "16px",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid #F1F5F9", paddingBottom: "8px" }}>
                          <span style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>
                            Product #{idx + 1}: {item.productDetails || "EV Battery Unit"}
                          </span>
                          <span style={{ fontSize: "12px", fontWeight: 700, color: "#2563EB", background: "#EFF6FF", padding: "2px 8px", borderRadius: "10px" }}>
                            Qty: {item.quantity || 1} unit{(item.quantity || 1) > 1 ? "s" : ""}
                          </span>
                        </div>

                        {/* Barcode Range / Single Barcode Row */}
                        {(item.quantity || 1) === 1 ? (
                          <div className="form-group">
                            <label>Barcode *</label>
                            <input
                              type="text"
                              placeholder="e.g. BAR001"
                              value={item.startBarcode || ""}
                              onChange={(e) => updateItemState({ startBarcode: e.target.value, endBarcode: e.target.value })}
                            />
                            {scmFormErrors[`startBarcode_${idx}`] && (
                              <span className="field-error">{scmFormErrors[`startBarcode_${idx}`]}</span>
                            )}
                          </div>
                        ) : (
                          <div className="form-row">
                            <div className="form-group">
                              <label>Start Barcode *</label>
                              <input
                                type="text"
                                placeholder="e.g. BAR001"
                                value={item.startBarcode || ""}
                                onChange={(e) => updateItemState({ startBarcode: e.target.value })}
                              />
                              {scmFormErrors[`startBarcode_${idx}`] && (
                                <span className="field-error">{scmFormErrors[`startBarcode_${idx}`]}</span>
                              )}
                            </div>

                            <div className="form-group">
                              <label>End Barcode *</label>
                              <input
                                type="text"
                                placeholder="e.g. BAR005"
                                value={item.endBarcode || ""}
                                onChange={(e) => updateItemState({ endBarcode: e.target.value })}
                              />
                              {scmFormErrors[`endBarcode_${idx}`] && (
                                <span className="field-error">{scmFormErrors[`endBarcode_${idx}`]}</span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Warranty Start & End Dates Row */}
                        <div className="form-row">
                          <div className="form-group">
                            <label>Warranty Start Date *</label>
                            <input
                              type="date"
                              value={item.warrantyStartDate || ""}
                              onChange={(e) => updateItemState({ warrantyStartDate: e.target.value })}
                            />
                            {scmFormErrors[`warrantyStartDate_${idx}`] && (
                              <span className="field-error">{scmFormErrors[`warrantyStartDate_${idx}`]}</span>
                            )}
                          </div>

                          <div className="form-group">
                            <label>Warranty End Date *</label>
                            <input
                              type="date"
                              value={item.warrantyEndDate || ""}
                              onChange={(e) => updateItemState({ warrantyEndDate: e.target.value })}
                            />
                            {scmFormErrors[`warrantyEndDate_${idx}`] && (
                              <span className="field-error">{scmFormErrors[`warrantyEndDate_${idx}`]}</span>
                            )}
                          </div>
                        </div>

                        {/* Barcode Sequence Info Badge */}
                        <div style={{ fontSize: "11px", color: "#64748B", background: "#F8FAFC", padding: "6px 10px", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
                          {(item.quantity || 1) === 1 ? (
                            <>Barcode: <strong style={{ color: "#1D4ED8" }}>{item.startBarcode || "—"}</strong> (Single Unit)</>
                          ) : (
                            <>Range: <strong style={{ color: "#1D4ED8" }}>{item.startBarcode || "—"}</strong> to <strong style={{ color: "#1D4ED8" }}>{item.endBarcode || "—"}</strong> (Total: {item.quantity} barcodes)</>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="sec-btn" onClick={() => setShowScmModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-action-btn" disabled={submitting}>
                  {submitting ? "Submitting SCM..." : "Submit SCM Complete"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* WARRANTY REGISTRATION MODAL (BATTERY REGISTER MODULE STYLE) */}
      {/* ========================================================================= */}
      {showWarrantyModal && warrantyModalData && (
        <div className="modal-overlay" onClick={() => setShowWarrantyModal(false)}>
          <div className="modal-content" style={{ maxWidth: "680px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ background: "#0F172A", color: "#FFFFFF", padding: "18px 24px", borderTopLeftRadius: "12px", borderTopRightRadius: "12px" }}>
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>Battery Warranty Registration</h2>
                <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "2px" }}>
                  Register warranty record matching Battery Register system format
                </div>
              </div>
              <button className="close-btn" style={{ color: "#94A3B8" }} onClick={() => setShowWarrantyModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: "24px" }}>
              <div style={{ background: "#F1F5F9", padding: "12px 16px", borderRadius: "8px", marginBottom: "18px" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>
                  Order #{warrantyModalData.orderNumber} • Customer: {warrantyModalData.customerName}
                </div>
                <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
                  {warrantyModalData.productDetails}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Barcode / Barcode Range</label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={warrantyModalData.barcode || (warrantyModalData.startBarcode ? `${warrantyModalData.startBarcode} - ${warrantyModalData.endBarcode}` : "—")}
                  />
                </div>
                <div className="form-group">
                  <label>Invoice Number</label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={warrantyModalData.invoiceNumber || "—"}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Warranty Start Date</label>
                  <input
                    type="date"
                    value={scmFormData.warrantyStartDate}
                    onChange={(e) => setScmFormData({ ...scmFormData, warrantyStartDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Courier & Tracking ID</label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={`${warrantyModalData.courierName || 'Standard'} • ${warrantyModalData.trackingId || '—'}`}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Full Warranty (Months)</label>
                  <input
                    type="number"
                    min={0}
                    value={scmFormData.fullWarrantyMonths}
                    onChange={(e) => setScmFormData({ ...scmFormData, fullWarrantyMonths: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Service Warranty (Months)</label>
                  <input
                    type="number"
                    min={0}
                    value={scmFormData.serviceWarrantyMonths}
                    onChange={(e) => setScmFormData({ ...scmFormData, serviceWarrantyMonths: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", padding: "14px", borderRadius: "8px", marginTop: "12px" }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#065F46" }}>Calculated Warranty Coverage</div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "#047857", marginTop: "4px" }}>
                  Total: {(Number(scmFormData.serviceWarrantyMonths) || 0) + (Number(scmFormData.fullWarrantyMonths) || 0)} Months
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="sec-btn" onClick={() => setShowWarrantyModal(false)}>
                Close
              </button>
              <button
                type="button"
                className="primary-action-btn"
                onClick={() => {
                  showToast(`Warranty registered successfully for Barcode ${warrantyModalData.barcode || warrantyModalData.orderNumber}`, "success");
                  setShowWarrantyModal(false);
                }}
              >
                ✓ Complete Warranty Registration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded Modern Styling */}
      <style>{`
        .orders-root {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #0F172A;
          background: #F8FAFC;
          min-height: 100vh;
          padding: 24px;
          box-sizing: border-box;
          position: relative;
        }

        .toast-notification {
          position: fixed;
          top: 24px;
          right: 24px;
          z-index: 9999;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 20px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          color: #ffffff;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15);
          animation: slideInRight 0.3s ease;
        }
        .toast-notification.success { background: #059669; }
        .toast-notification.error { background: #DC2626; }
        .toast-icon { font-weight: bold; font-size: 16px; }

        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        .orders-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }

        .page-heading {
          font-size: 24px;
          font-weight: 700;
          color: #0F172A;
          margin: 0 0 4px 0;
          letter-spacing: -0.02em;
        }

        .page-subheading {
          font-size: 13px;
          color: #64748B;
          margin: 0;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .refresh-btn:hover { background: #F1F5F9; color: #0F172A; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }

        .primary-action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 8px 18px;
          background: #0F172A;
          color: #FFFFFF;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .primary-action-btn:hover { background: #1E293B; transform: translateY(-1px); }
        .primary-action-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .primary-action-btn.full-w { width: 100%; padding: 12px; }

        .stage-tabs-container {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
          overflow-x: auto;
          padding-bottom: 4px;
        }

        .tab-btn {
          padding: 8px 14px;
          border-radius: 8px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          font-size: 12px;
          font-weight: 600;
          color: #64748B;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
        }
        .tab-btn.active {
          background: #0F172A;
          color: #FFFFFF;
          border-color: #0F172A;
        }

        .filter-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .search-input-wrap {
          position: relative;
          flex: 1;
          min-width: 280px;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #94A3B8;
        }

        .search-input-wrap input {
          width: 100%;
          padding: 9px 36px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          font-size: 13px;
          color: #0F172A;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }
        .search-input-wrap input:focus { border-color: #0F172A; }

        .clear-search-btn {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #94A3B8;
          cursor: pointer;
        }

        .filters-group {
          display: flex;
          gap: 10px;
        }

        .filter-select {
          padding: 9px 14px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          font-size: 13px;
          color: #334155;
          outline: none;
          cursor: pointer;
        }

        .error-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #FEF2F2;
          border: 1px solid #FCA5A5;
          padding: 12px 16px;
          border-radius: 8px;
          color: #991B1B;
          font-size: 13px;
          margin-bottom: 20px;
        }
        .error-content { flex: 1; }
        .retry-btn {
          background: #991B1B;
          color: white;
          border: none;
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
        }

        .table-container {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
        }

        .orders-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .orders-table th {
          background: #F8FAFC;
          padding: 12px 16px;
          font-size: 11px;
          font-weight: 600;
          color: #64748B;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #E2E8F0;
        }

        .orders-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #F1F5F9;
          font-size: 13px;
          vertical-align: middle;
        }

        .orders-table tbody tr {
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .orders-table tbody tr:hover { background: #F8FAFC; }

        .order-num-text { font-weight: 600; color: #0F172A; }
        .sub-text { font-size: 11px; color: #64748B; margin-top: 2px; }
        .customer-name { font-weight: 500; color: #1E293B; }

        .badge-pill {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
        }

        .payment-tag {
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 4px;
        }
        .payment-tag.paid { background: #DCFCE7; color: #166534; }
        .payment-tag.partial { background: #FFEDD5; color: #9A3412; }
        .payment-tag.pending { background: #FEF3C7; color: #92400E; }

        .prod-status-tag {
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 4px;
          text-transform: capitalize;
        }
        .prod-status-tag.pending { background: #F3F4F6; color: #4B5563; }
        .prod-status-tag.in_progress { background: #FEF3C7; color: #92400E; }
        .prod-status-tag.completed { background: #DCFCE7; color: #166534; }

        .row-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .icon-action-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 6px;
          border: 1px solid #E2E8F0;
          background: #FFFFFF;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s;
        }
        .icon-action-btn:hover { background: #F1F5F9; color: #0F172A; }
        .icon-action-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .status-transition-btn {
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        .status-transition-btn.start-prod { background: #3B82F6; color: white; }
        .status-transition-btn.start-prod:hover { background: #2563EB; }
        .status-transition-btn.complete-prod { background: #10B981; color: white; }
        .status-transition-btn.complete-prod:hover { background: #059669; }

        .scm-action-btn {
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .scm-action-btn.fill-details { background: #0F766E; color: white; }
        .scm-action-btn.fill-details:hover { background: #0D9488; }
        .scm-action-btn.dispatch-btn { background: #7C3AED; color: white; }
        .scm-action-btn.dispatch-btn:hover { background: #6D28D9; }

        .done-badge {
          font-size: 11px;
          font-weight: 600;
          color: #059669;
        }
        .done-badge.dispatched { color: #7C3AED; }

        .read-only-label {
          font-size: 11px;
          color: #94A3B8;
          font-style: italic;
        }

        .pagination-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 4px;
        }

        .pagination-info { font-size: 12px; color: #64748B; }

        .pagination-controls {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .page-nav-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 6px;
          font-size: 12px;
          color: #334155;
          cursor: pointer;
        }
        .page-nav-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .page-num { font-size: 12px; font-weight: 500; color: #475569; }

        .empty-state {
          padding: 48px;
          text-align: center;
          color: #64748B;
        }
        .empty-icon { color: #CBD5E1; margin-bottom: 12px; }
        .empty-state h3 { margin: 0 0 6px 0; color: #1E293B; font-size: 16px; }
        .empty-state p { margin: 0; font-size: 13px; }

        .skeleton-container { padding: 16px; }
        .skeleton-row {
          height: 48px;
          background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
          background-size: 200% 100%;
          animation: skeletonShimmer 1.5s infinite;
          border-radius: 6px;
          margin-bottom: 10px;
        }
        @keyframes skeletonShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

        /* Drawer Overlay */
        .drawer-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.4);
          z-index: 1000;
          display: flex;
          justify-content: flex-end;
          backdrop-filter: blur(2px);
        }

        .drawer-content {
          width: 520px;
          max-width: 100%;
          height: 100%;
          background: #FFFFFF;
          box-shadow: -10px 0 25px rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: column;
          animation: slideInDrawer 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slideInDrawer { from { transform: translateX(100%); } to { transform: translateX(0); } }

        .drawer-header {
          padding: 20px 24px;
          border-bottom: 1px solid #E2E8F0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .drawer-header h2 { margin: 0; font-size: 18px; font-weight: 700; color: #0F172A; }
        .order-number-subtitle { font-size: 12px; color: #64748B; margin-top: 2px; }
        .close-drawer-btn { background: none; border: none; color: #64748B; cursor: pointer; }

        .drawer-body {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }

        .drawer-section {
          margin-bottom: 24px;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
          color: #334155;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin: 0 0 12px 0;
          padding-bottom: 6px;
          border-bottom: 1px solid #F1F5F9;
        }

        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
        }
        .detail-item.full-width { grid-column: span 2; }
        .detail-item .label { font-size: 11px; color: #64748B; margin-bottom: 2px; font-weight: 500; }
        .detail-item .val { font-size: 13px; color: #0F172A; font-weight: 600; word-break: break-word; }
        .detail-item .val.highlight { color: #1D4ED8; }

        .drawer-actions-bar {
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid #E2E8F0;
        }

        /* Vertical Stepper Styling */
        .vertical-stepper {
          display: flex;
          flex-direction: column;
          gap: 0px;
          margin-top: 10px;
        }
        .vertical-step-item {
          display: flex;
          gap: 16px;
          min-height: 55px;
        }
        .vertical-step-left {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
        }
        .vertical-step-circle {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          z-index: 2;
          background: #F1F5F9;
          color: #64748B;
          border: 2px solid #E2E8F0;
          transition: all 0.3s ease;
        }
        .vertical-step-line {
          width: 2px;
          flex-grow: 1;
          background: #E2E8F0;
          margin: 4px 0;
          z-index: 1;
          min-height: 25px;
        }
        .vertical-step-right {
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          padding-top: 4px;
        }
        .vertical-step-label {
          font-size: 13px;
          font-weight: 600;
          color: #334155;
        }
        .vertical-step-desc {
          font-size: 11px;
          color: #64748B;
          margin-top: 2px;
        }
        
        /* Status Overrides */
        .vertical-step-item.passed .vertical-step-circle {
          background: #10B981;
          color: #FFFFFF;
          border-color: #10B981;
        }
        .vertical-step-item.passed .vertical-step-line {
          background: #10B981;
        }
        .vertical-step-item.active .vertical-step-circle {
          background: #3B82F6;
          color: #FFFFFF;
          border-color: #3B82F6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.25);
          animation: pulseBlue 2s infinite ease-in-out;
        }
        .vertical-step-item.active .vertical-step-label {
          color: #2563EB;
          font-weight: 700;
        }
        .vertical-step-item.active .vertical-step-desc {
          color: #1D4ED8;
          font-weight: 500;
        }
        
        @keyframes pulseBlue {
          0% { box-shadow: 0 0 0 0px rgba(59, 130, 246, 0.4); }
          70% { box-shadow: 0 0 0 8px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0px rgba(59, 130, 246, 0); }
        }

        /* Modal Overlay */
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.4);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(2px);
        }

        .modal-content {
          width: 540px;
          max-width: 90%;
          background: #FFFFFF;
          border-radius: 12px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .modal-header {
          padding: 16px 20px;
          border-bottom: 1px solid #E2E8F0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .modal-header h2 { margin: 0; font-size: 16px; font-weight: 700; color: #0F172A; }
        .close-btn { background: none; border: none; color: #64748B; cursor: pointer; }

        .modal-body {
          padding: 20px;
          max-height: 70vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .form-group label { font-size: 12px; font-weight: 600; color: #334155; }
        .form-group input, .form-group textarea, .form-group select {
          padding: 8px 12px;
          border: 1px solid #CBD5E1;
          border-radius: 6px;
          font-size: 13px;
          color: #0F172A;
          outline: none;
        }
        .form-group input:focus, .form-group textarea:focus, .form-group select:focus { border-color: #0F172A; }
        .field-error { font-size: 11px; color: #DC2626; margin-top: 2px; }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .modal-footer {
          padding: 14px 20px;
          border-top: 1px solid #E2E8F0;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          background: #F8FAFC;
        }

        .sec-btn {
          padding: 8px 16px;
          background: #FFFFFF;
          border: 1px solid #CBD5E1;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          color: #334155;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
