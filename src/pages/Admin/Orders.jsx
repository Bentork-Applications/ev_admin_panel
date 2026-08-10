import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { orderService } from "../../services/orderService";
import { batteryService } from "../../services/batteryService";
import { apiClient } from "../../services/apiClient";
import { generateOrderPdfReport } from "../../services/pdfReportService";
import { OrderHeader } from "../../components/orders/OrderHeader";
import { OrderStageTabs } from "../../components/orders/OrderStageTabs";
import { OrderFilterBar } from "../../components/orders/OrderFilterBar";
import { OrderTableRow } from "../../components/orders/OrderTableRow";
import { OrderDetailsDrawer } from "../../components/orders/OrderDetailsDrawer";
import { CreateSalesOrderModal } from "../../components/orders/CreateSalesOrderModal";
import { EditSalesOrderModal } from "../../components/orders/EditSalesOrderModal";
import { ScmDetailsModal } from "../../components/orders/ScmDetailsModal";
import { WarrantyRegistrationModal } from "../../components/orders/WarrantyRegistrationModal";
import { Toast } from "../../components/common/Toast";
import { Pagination } from "../../components/common/Pagination";
import {
  formatDate,
  parseProductDetails,
  formatProductDetails,
  createDefaultOrderItem,
  calculateExpiryAndTotal,
  parseWarrantyPeriod
} from "../../utils/formatters";
import { getStatusBadgeConfig, getPriorityBadgeConfig } from "../../config/orderConfig";
import { Package, Plus, AlertTriangle } from "lucide-react";

export default function Orders({ userRole: propUserRole }) {
  // Memoize effective user role calculation
  const role = useMemo(() => {
    const token = localStorage.getItem("token");
    let resolvedRole = propUserRole || localStorage.getItem("userRole") || "ADMIN";

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
        if (authorities.includes("SALES_ADMIN") || authorities.includes("ROLE_SALES_ADMIN") || authorities.includes("SALES")) {
          resolvedRole = "SALES_ADMIN";
        } else if (authorities.includes("PRODUCTION_ADMIN") || authorities.includes("ROLE_PRODUCTION_ADMIN") || authorities.includes("PRODUCTION")) {
          resolvedRole = "PRODUCTION_ADMIN";
        } else if (authorities.includes("SCM_ADMIN") || authorities.includes("ROLE_SCM_ADMIN") || authorities.includes("SCM") || authorities.includes("ROLE_SCM")) {
          resolvedRole = "SCM_ADMIN";
        } else if (authorities.includes("ADMINISTRATOR") || authorities.includes("ADMIN") || authorities.includes("ROLE_ADMIN")) {
          resolvedRole = "ADMIN";
        } else if (authorities.includes("ADMIN_STAFF") || authorities.includes("ROLE_ADMIN_STAFF")) {
          resolvedRole = "ADMIN_STAFF";
        }
      } catch (e) {
        console.error("Token decode error in Orders:", e);
      }
    }
    return resolvedRole;
  }, [propUserRole]);

  const isSuperAdmin = role === "ADMIN" || role === "ADMIN_STAFF";
  const isSalesAdmin = role === "SALES_ADMIN";
  const isProductionAdmin = role === "PRODUCTION_ADMIN";
  const isScmAdmin = role === "SCM_ADMIN";

  // State
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Super Admin view mode tab (All, Sales, Production, SCM)
  const [adminStageTab, setAdminStageTab] = useState("ALL");

  // Search, Filters, Date Range, Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
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
  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Helper to record tracking activities & status changes
  const recordOrderActivity = useCallback((orderId, activity) => {
    if (!orderId) return [];
    try {
      const storageKey = `order_history_${orderId}`;
      const existingHistory = JSON.parse(localStorage.getItem(storageKey) || "[]");

      const newEntry = {
        id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        title: activity.title || "Status Updated",
        description: activity.description || "",
        status: activity.status || "",
        stage: activity.stage || "",
        updatedBy: activity.updatedBy || localStorage.getItem("userRole") || "System Admin",
      };

      const isDuplicate = existingHistory.some(
        (h) => h.title === newEntry.title && Math.abs(new Date(h.timestamp).getTime() - new Date(newEntry.timestamp).getTime()) < 2000
      );

      let updatedHistory = existingHistory;
      if (!isDuplicate) {
        updatedHistory = [newEntry, ...existingHistory];
        localStorage.setItem(storageKey, JSON.stringify(updatedHistory));
      }

      const localCache = JSON.parse(localStorage.getItem("production_orders_cache") || "[]");
      const updatedCache = localCache.map((ord) => {
        if (ord && (ord.id === orderId || ord.orderNumber === activity.orderNumber)) {
          return {
            ...ord,
            statusHistory: updatedHistory,
            updatedAt: newEntry.timestamp
          };
        }
        return ord;
      });
      localStorage.setItem("production_orders_cache", JSON.stringify(updatedCache));
      return updatedHistory;
    } catch (err) {
      console.warn("Failed to record order activity:", err);
      return [];
    }
  }, []);

  // Fetch Orders based on role (100% READ-ONLY GET - NEVER triggers POST or order creation)
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedMap = new Map();

      // Only execute GET endpoint for the current user's authorized role to prevent 403 Forbidden console errors
      const promises = [];
      if (isSuperAdmin) {
        promises.push(orderService.adminGetAllOrders().catch(() => null));
      } else if (isSalesAdmin) {
        promises.push(orderService.salesGetMyOrders().catch(() => null));
      } else if (isProductionAdmin) {
        promises.push(orderService.productionGetOrders().catch(() => null));
      } else if (isScmAdmin) {
        promises.push(orderService.scmGetOrders().catch(() => null));
      } else {
        promises.push(orderService.salesGetMyOrders().catch(() => null));
      }

      const results = await Promise.all(promises);

      results.forEach((res) => {
        if (!res) return;
        const arr = Array.isArray(res) ? res : Array.isArray(res?.orders) ? res.orders : [];
        arr.forEach((o) => {
          if (o && (o.id || o.orderNumber)) {
            const key = String(o.id || o.orderNumber);
            fetchedMap.set(key, { ...(fetchedMap.get(key) || {}), ...o });
          }
        });
      });

      const dataArray = Array.from(fetchedMap.values());
      const localCache = JSON.parse(localStorage.getItem("production_orders_cache") || "[]");

      // Merge local cache orders and status overrides into combined list
      const finalMap = new Map();
      if (Array.isArray(localCache)) {
        localCache.forEach((c) => {
          if (c && (c.id || c.orderNumber)) {
            const key = String(c.id || c.orderNumber);
            finalMap.set(key, c);
          }
        });
      }
      dataArray.forEach((o) => {
        if (o && (o.id || o.orderNumber)) {
          const key = String(o.id || o.orderNumber);
          const existing = finalMap.get(key) || {};
          finalMap.set(key, { ...existing, ...o });
        }
      });

      // Apply overrides from localStorage (local status, timestamps, and activity history)
      const mergedList = Array.from(finalMap.values()).map((ord) => {
        const id = ord.id || ord.orderNumber;
        const localStatus = localStorage.getItem(`order_status_${id}`);
        const localDelivered = localStorage.getItem(`order_delivered_date_${id}`);
        const localHistory = JSON.parse(localStorage.getItem(`order_history_${id}`) || "[]");

        let statusHistory = ord.statusHistory || [];
        if (Array.isArray(localHistory) && localHistory.length > 0) {
          const combined = [...localHistory, ...statusHistory];
          const histMap = new Map();
          combined.forEach((item) => {
            if (item && item.timestamp) {
              const k = `${item.title}_${String(item.timestamp).substring(0, 16)}`;
              if (!histMap.has(k)) histMap.set(k, item);
            }
          });
          statusHistory = Array.from(histMap.values()).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        }

        // If no history exists yet, generate initial baseline activity timeline
        if (statusHistory.length === 0) {
          const createdTime = ord.createdAt || ord.createdDate || new Date().toISOString();
          statusHistory = [
            {
              id: `init_${ord.id || ord.orderNumber}`,
              timestamp: createdTime,
              title: "Order Registered",
              description: `Sales Order created with P.I. #${ord.piNumber || ord.orderNumber || ord.id}`,
              status: ord.orderStatus || "sales_registered",
              stage: "Sales Registered",
              updatedBy: ord.createdByAdminEmail || "Sales Admin"
            }
          ];
          if (ord.productionStatus && ord.productionStatus !== "pending") {
            statusHistory.unshift({
              id: `prod_${ord.id || ord.orderNumber}`,
              timestamp: ord.productionStartedAt || ord.updatedAt || createdTime,
              title: ord.productionStatus === "completed" ? "Production Completed" : `Production ${ord.productionStatus}`,
              description: `Production stage updated to ${ord.productionStatus.replace("_", " ")}`,
              status: ord.productionStatus === "completed" ? "production_complete" : "in_production",
              stage: "Production",
              updatedBy: "Production Admin"
            });
          }
          if (ord.trackingId || ord.invoiceNumber || ord.orderStatus === "scm_complete") {
            statusHistory.unshift({
              id: `scm_${ord.id || ord.orderNumber}`,
              timestamp: ord.scmCompletedAt || ord.updatedAt || createdTime,
              title: "SCM Verified & Barcodes Filled",
              description: `Courier: ${ord.courierName || "Standard"}, Tracking ID: ${ord.trackingId || "—"}`,
              status: "scm_complete",
              stage: "SCM Complete",
              updatedBy: "SCM Admin"
            });
          }
          if (ord.orderStatus === "dispatched" || ord.dispatchedAt) {
            statusHistory.unshift({
              id: `disp_${ord.id || ord.orderNumber}`,
              timestamp: ord.dispatchedAt || ord.updatedAt || createdTime,
              title: "Order Dispatched",
              description: `Order shipped via ${ord.courierName || "Courier"} (Tracking: ${ord.trackingId || "N/A"})`,
              status: "dispatched",
              stage: "Dispatched",
              updatedBy: "SCM Admin"
            });
          }
          if (ord.orderStatus === "delivered" || localDelivered) {
            statusHistory.unshift({
              id: `deliv_${ord.id || ord.orderNumber}`,
              timestamp: ord.deliveredAt || localDelivered || ord.updatedAt || createdTime,
              title: "Order Delivered",
              description: "Order marked as successfully delivered to customer.",
              status: "delivered",
              stage: "Delivered",
              updatedBy: "Logistics Partner"
            });
          }
          try {
            localStorage.setItem(`order_history_${id}`, JSON.stringify(statusHistory));
          } catch {}
        }

        return {
          ...ord,
          orderStatus: localStatus || ord.orderStatus || "sales_registered",
          deliveredAt: localDelivered || ord.deliveredAt,
          statusHistory
        };
      });

      try {
        localStorage.setItem("production_orders_cache", JSON.stringify(mergedList));
      } catch (e) {
        console.warn("Failed to write production_orders_cache:", e);
      }

      setOrders(mergedList);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      setError(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, isSalesAdmin, isProductionAdmin, isScmAdmin]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Fetch Registered Users for Customer Search Autocomplete
  useEffect(() => {
    const fetchRegisteredUsers = async () => {
      try {
        const data = await apiClient.get("/user/all");
        setRegisteredUsers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn("Could not fetch registered users list:", err);
      }
    };
    fetchRegisteredUsers();
  }, []);

  // View Order Details
  const handleViewDetails = useCallback(async (orderId) => {
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
        const localCache = JSON.parse(localStorage.getItem("production_orders_cache") || "[]");
        const cachedOrder = localCache.find((c) => c && (c.id === orderId || c.orderNumber === rawDetails.orderNumber)) || {};
        const localStatus = localStorage.getItem(`order_status_${orderId}`);
        const localHistory = JSON.parse(localStorage.getItem(`order_history_${orderId}`) || "[]");

        let mergedOrderItems = rawDetails.orderItems;
        if (Array.isArray(cachedOrder.orderItems) && cachedOrder.orderItems.length > 0) {
          if (Array.isArray(rawDetails.orderItems) && rawDetails.orderItems.length > 0) {
            mergedOrderItems = rawDetails.orderItems.map((apiItem, idx) => ({
              ...(cachedOrder.orderItems[idx] || {}),
              ...apiItem
            }));
          } else {
            mergedOrderItems = cachedOrder.orderItems;
          }
        }

        const combinedHistory = (localHistory.length > 0 ? localHistory : cachedOrder.statusHistory || rawDetails.statusHistory || []);

        setSelectedOrder({
          ...cachedOrder,
          ...rawDetails,
          orderItems: mergedOrderItems || rawDetails.orderItems,
          orderStatus: localStatus || rawDetails.orderStatus || cachedOrder.orderStatus,
          statusHistory: combinedHistory
        });
        setShowDrawer(true);
      }
    } catch (err) {
      const fallback = orders.find((o) => o.id === orderId);
      if (fallback) {
        const localHistory = JSON.parse(localStorage.getItem(`order_history_${orderId}`) || "[]");
        setSelectedOrder({
          ...fallback,
          statusHistory: localHistory.length > 0 ? localHistory : fallback.statusHistory || []
        });
        setShowDrawer(true);
      } else {
        showToast("Failed to load order details", "error");
      }
    }
  }, [isSalesAdmin, isProductionAdmin, isScmAdmin, orders, showToast]);

  // Validate Sales Form
  const validateSalesForm = (data) => {
    const errors = {};
    if (!data.customerName?.trim()) errors.customerName = "Customer name is required";
    if (!data.piNumber?.trim()) errors.piNumber = "P.I. Number is required";

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

  const isCreatingRef = useRef(false);

  const handleCreateSalesOrder = useCallback(async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (submitting || isCreatingRef.current) return;

    const errors = validateSalesForm(salesFormData);
    if (Object.keys(errors).length > 0) {
      setSalesFormErrors(errors);
      return;
    }

    isCreatingRef.current = true;
    setSalesFormErrors({});
    setSubmitting(true);

    try {
      let targetUserId = salesFormData.assignedUserId;
      const token = localStorage.getItem("token");
      if (!targetUserId && registeredUsers.length > 0) {
        const matched = registeredUsers.find(
          (u) =>
            (salesFormData.customerEmail && u.email?.toLowerCase() === salesFormData.customerEmail.toLowerCase()) ||
            (salesFormData.mobileNumber && (u.mobile === salesFormData.mobileNumber || u.mobileNumber === salesFormData.mobileNumber)) ||
            (salesFormData.customerName && u.name?.toLowerCase() === salesFormData.customerName.toLowerCase())
        );
        if (matched) {
          targetUserId = matched.id || matched.userId;
        }
      }
      if (!targetUserId && token) {
        try {
          const payloadToken = JSON.parse(atob(token.split('.')[1]));
          targetUserId = payloadToken.userId || payloadToken.id || payloadToken.subId || 1;
        } catch {
          targetUserId = 1;
        }
      }
      if (!targetUserId) targetUserId = 1;

      const firstItem = salesFormData.orderItems[0] || {};
      const firstProject = firstItem.project === "Other" ? (firstItem.customProject || "Other") : (firstItem.project || "EV Battery");

      const creatorEmail = getLoggedInAdminEmail();
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
      const createdOrderId = created?.id || created?.orderNumber;

      const fullCreatedOrder = {
        ...(created || {}),
        id: created?.id || createdOrderId,
        orderNumber: created?.orderNumber || createdOrderId,
        orderStatus: "sales_registered",
        createdAt: new Date().toISOString()
      };

      const initialHistory = recordOrderActivity(createdOrderId, {
        title: "Sales Order Created",
        description: `Sales Order #${fullCreatedOrder.orderNumber || createdOrderId} registered for ${salesFormData.customerName} (P.I. ${salesFormData.piNumber})`,
        status: "sales_registered",
        stage: "Sales Registered",
        updatedBy: localStorage.getItem("userRole") || "Sales Admin"
      });

      fullCreatedOrder.statusHistory = initialHistory;

      // Persist to production_orders_cache in localStorage immediately
      try {
        const localCache = JSON.parse(localStorage.getItem("production_orders_cache") || "[]");
        const updatedCache = [fullCreatedOrder, ...localCache.filter((o) => o && o.id !== fullCreatedOrder.id && o.orderNumber !== fullCreatedOrder.orderNumber)];
        localStorage.setItem("production_orders_cache", JSON.stringify(updatedCache));
      } catch (e) {
        console.warn("Failed to update production_orders_cache:", e);
      }

      // Update state immediately for instant table update
      setOrders((prev) => [fullCreatedOrder, ...prev.filter((o) => o.id !== fullCreatedOrder.id && o.orderNumber !== fullCreatedOrder.orderNumber)]);

      showToast(`Order ${fullCreatedOrder.orderNumber || createdOrderId} created successfully!`, "success");
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

      await fetchOrders();
    } catch (err) {
      showToast(err.message || "Failed to create order", "error");
    } finally {
      setSubmitting(false);
      isCreatingRef.current = false;
    }
  }, [salesFormData, registeredUsers, submitting, showToast, fetchOrders, recordOrderActivity]);

  const openEditSalesModal = useCallback((order) => {
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
  }, []);

  const openDrawerItemsEdit = useCallback(() => {
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
  }, [selectedOrder]);

  const handleSaveDrawerProductDetails = useCallback(async () => {
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
      } catch {
        try {
          updated = await orderService.scmUpdateDetails(selectedOrder.id, payload);
        } catch {
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
  }, [selectedOrder, drawerOrderItems, showToast, fetchOrders]);

  const handleUpdateSalesOrder = useCallback(async (e) => {
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
  }, [editOrderData, selectedOrder, showToast, fetchOrders]);

  const handleRecordIncrementalPayment = useCallback(async (e) => {
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
      recordOrderActivity(selectedOrder.id, {
        title: "Payment Recorded",
        description: `Incremental payment of ₹${amt.toLocaleString("en-IN")} recorded. Total Received: ₹${(Number(selectedOrder.receivedAmount || 0) + amt).toLocaleString("en-IN")}`,
        status: selectedOrder.orderStatus,
        stage: "Payment",
        updatedBy: "Sales Admin"
      });
      setRecordPaymentAmount("");
      setSelectedOrder(updated);
      fetchOrders();
    } catch (err) {
      showToast(err.message || "Failed to record payment", "error");
    } finally {
      setSubmitting(false);
    }
  }, [selectedOrder, recordPaymentAmount, showToast, fetchOrders]);

  const handleUpdateProductionStatus = useCallback(async (orderId, targetStatus) => {
    setSubmitting(true);
    try {
      const updated = await orderService.productionUpdateStatus(orderId, { productionStatus: targetStatus });
      showToast(`Production status updated to '${targetStatus.replace("_", " ")}'`, "success");

      const resolvedOrderStatus = targetStatus === "completed" ? "production_complete" : "in_production";
      localStorage.setItem(`order_status_${orderId}`, resolvedOrderStatus);

      const activityTitle = targetStatus === "completed"
        ? "Production Completed"
        : targetStatus === "testing"
          ? "Quality Assurance Testing"
          : "In Production Assembly";

      const activityDesc = targetStatus === "completed"
        ? "Battery manufacturing & quality testing completed. Transferred to SCM pipeline."
        : `Production workflow stage updated to '${targetStatus.replace("_", " ")}'.`;

      const updatedHistory = recordOrderActivity(orderId, {
        title: activityTitle,
        description: activityDesc,
        status: resolvedOrderStatus,
        stage: "Production",
        updatedBy: "Production Admin"
      });

      const localCache = JSON.parse(localStorage.getItem("production_orders_cache") || "[]");
      const targetOrder = orders.find((o) => o.id === orderId) || (selectedOrder?.id === orderId ? selectedOrder : null);
      const orderToSave = {
        ...(targetOrder || {}),
        ...(updated || {}),
        id: orderId,
        productionStatus: targetStatus,
        orderStatus: resolvedOrderStatus,
        productionCompletedAt: targetStatus === "completed" ? new Date().toISOString() : targetOrder?.productionCompletedAt,
        statusHistory: updatedHistory
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
  }, [orders, selectedOrder, showToast, fetchOrders]);

  const generateBarcodeSequence = (startStr, count) => {
    const qty = Math.max(1, Number(count) || 1);
    const base = (startStr || "BAR001").trim();
    const match = base.match(/^(.*?)(\d+)$/);
    if (!match) {
      return Array.from({ length: qty }, (_, i) => `${base}-${i + 1}`);
    }
    const prefix = match[1];
    const numStr = match[2];
    const numLen = numStr.length;
    const startNum = parseInt(numStr, 10);
    const result = [];
    for (let i = 0; i < qty; i++) {
      const nextNum = String(startNum + i).padStart(numLen, "0");
      result.push(`${prefix}${nextNum}`);
    }
    return result;
  };

  const openScmModal = useCallback((order) => {
    setOrderForScm(order);
    setScmFormData({
      invoiceNumber: order.invoiceNumber || "",
      courierName: order.courierName || "",
      trackingId: order.trackingId || "",
    });

    const todayStr = new Date().toISOString().split("T")[0];

    const parseItemWarranty = (it) => {
      const startDate = it.warrantyStartDate || order.warrantyStartDate || todayStr;
      let fullY = "1", fullM = "0", servY = "0", servM = "0";

      // 1. Check explicit item-level full & service warranty fields FIRST
      if (
        it.fullWarrantyYears !== undefined ||
        it.fullWarrantyMonths !== undefined ||
        it.serviceWarrantyYears !== undefined ||
        it.serviceWarrantyMonths !== undefined
      ) {
        const fM = Number(it.fullWarrantyMonthsTotal ?? it.fullWarrantyMonths) || 0;
        const fY = it.fullWarrantyYears !== undefined ? Number(it.fullWarrantyYears) : Math.floor(fM / 12);
        fullY = fY.toString();
        fullM = (fM % 12).toString();

        const sM = Number(it.serviceWarrantyMonthsTotal ?? it.serviceWarrantyMonths) || 0;
        const sY = it.serviceWarrantyYears !== undefined ? Number(it.serviceWarrantyYears) : Math.floor(sM / 12);
        servY = sY.toString();
        servM = (sM % 12).toString();
      }
      // 2. Check order-level explicit full & service warranty fields NEXT
      else if (order.fullWarrantyMonths !== undefined || order.serviceWarrantyMonths !== undefined) {
        const fM = Number(order.fullWarrantyMonths) || 24;
        const sM = Number(order.serviceWarrantyMonths) || 0;
        fullY = Math.floor(fM / 12).toString();
        fullM = (fM % 12).toString();
        servY = Math.floor(sM / 12).toString();
        servM = (sM % 12).toString();
      }
      // 3. Fallback to parseWarrantyPeriod ONLY if dates exist without explicit warranty breakdown
      else if (it.warrantyStartDate && it.warrantyEndDate) {
        const parsed = parseWarrantyPeriod(it.warrantyStartDate, it.warrantyEndDate);
        fullY = parsed.years.toString();
        fullM = parsed.months.toString();
      } else if (order.warrantyStartDate && order.warrantyEndDate) {
        const parsed = parseWarrantyPeriod(order.warrantyStartDate, order.warrantyEndDate);
        fullY = parsed.years.toString();
        fullM = parsed.months.toString();
      }

      const { totalWarrantyLabel, expiryDateStr } = calculateExpiryAndTotal(startDate, fullY, fullM, servY, servM);

      return {
        warrantyStartDate: startDate,
        fullWarrantyYears: fullY,
        fullWarrantyMonths: fullM,
        serviceWarrantyYears: servY,
        serviceWarrantyMonths: servM,
        warrantyEndDate: it.warrantyEndDate || expiryDateStr,
        totalWarrantyLabel: it.totalWarrantyLabel || totalWarrantyLabel
      };
    };

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

        const warrantyInfo = parseItemWarranty(it);

        return {
          id: it.id || `item_${idx + 1}`,
          orderItemId: it.id || null,
          productDetails: it.productDetails || "EV Battery Unit",
          quantity: itemQty,
          startBarcode: startBc,
          endBarcode: endBc,
          ...warrantyInfo
        };
      });
    } else {
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

      const warrantyInfo = parseItemWarranty(order);

      itemDetailsList = [{
        id: "legacy_1",
        orderItemId: null,
        productDetails: order.productDetails || "Standard EV Battery Pack",
        quantity: itemQty,
        startBarcode: startBc,
        endBarcode: endBc,
        ...warrantyInfo
      }];
    }

    setScmItemDetails(itemDetailsList);
    setScmFormErrors({});
    setShowScmModal(true);
  }, []);

  const openWarrantyModal = useCallback((order) => {
    setWarrantyModalData(order);
    setShowWarrantyModal(true);
  }, []);

  const handleCompleteScm = useCallback(async (e) => {
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
      const startDate = item.warrantyStartDate || new Date().toISOString().split("T")[0];

      let itemBarcodes = [];
      if (itemQty === 1) {
        if (!startStr) {
          startStr = `BC-${orderForScm?.id || "0"}-${idx + 1}-1`;
        }
        endStr = startStr;
        itemBarcodes = [startStr];
      } else {
        if (!startStr) {
          startStr = `BC-${orderForScm?.id || "0"}-${idx + 1}-1`;
        }
        const generated = generateBarcodeSequence(startStr, itemQty);
        itemBarcodes = generated;
        endStr = itemBarcodes[itemBarcodes.length - 1] || startStr;
      }

      // Compute exact expiry date & total months per item matching Battery Inventory
      const { totalWarrantyLabel, expiryDateStr, fullWarrantyMonths, serviceWarrantyMonths } = calculateExpiryAndTotal(
        startDate,
        item.fullWarrantyYears ?? "1",
        item.fullWarrantyMonths ?? "0",
        item.serviceWarrantyYears ?? "0",
        item.serviceWarrantyMonths ?? "0"
      );

      const itemPayload = {
        productDetails: item.productDetails?.trim() || orderForScm?.productDetails || "EV Battery Unit",
        quantity: itemQty,
        startBarcode: startStr,
        endBarcode: endStr,
        barcodes: itemBarcodes,
        barcode: itemQty === 1 ? startStr : `${startStr} - ${endStr}`,
        warrantyStartDate: startDate,
        warrantyEndDate: expiryDateStr,
        fullWarrantyYears: Number(item.fullWarrantyYears ?? Math.floor(fullWarrantyMonths / 12)),
        fullWarrantyMonths: Number(item.fullWarrantyMonths ?? (fullWarrantyMonths % 12)),
        fullWarrantyMonthsTotal: fullWarrantyMonths,
        serviceWarrantyYears: Number(item.serviceWarrantyYears ?? Math.floor(serviceWarrantyMonths / 12)),
        serviceWarrantyMonths: Number(item.serviceWarrantyMonths ?? (serviceWarrantyMonths % 12)),
        serviceWarrantyMonthsTotal: serviceWarrantyMonths,
        totalWarrantyLabel
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

      const formattedItemsForScm = [];
      updatedItems.forEach((item, idx) => {
        const fullMonths = (Number(item.fullWarrantyYears) || 0) * 12 + (Number(item.fullWarrantyMonths) || 0);
        const serviceMonths = (Number(item.serviceWarrantyYears) || 0) * 12 + (Number(item.serviceWarrantyMonths) || 0);
        const itemQty = Math.max(1, Number(item.quantity) || 1);

        let itemBarcodes = item.barcodes;
        if (!Array.isArray(itemBarcodes) || itemBarcodes.length !== itemQty || itemBarcodes.some((b) => !b)) {
          const startBc = item.startBarcode || `BAR-${orderForScm?.id || "0"}-${idx + 1}-1`;
          itemBarcodes = generateBarcodeSequence(startBc, itemQty);
        }

        let rawItemId = item.orderItemId ?? item.id;
        if (isNaN(Number(rawItemId)) || Number(rawItemId) <= 0) {
          const apiMatch = Array.isArray(orderForScm?.orderItems) ? orderForScm.orderItems[idx] : null;
          if (apiMatch && !isNaN(Number(apiMatch.id)) && Number(apiMatch.id) > 0) {
            rawItemId = apiMatch.id;
          }
        }

        const numericItemId = Number(rawItemId);
        if (!isNaN(numericItemId) && numericItemId > 0) {
          formattedItemsForScm.push({
            orderItemId: numericItemId,
            barcodes: itemBarcodes,
            serviceWarrantyMonths: serviceMonths,
            fullWarrantyMonths: fullMonths
          });
        }
      });

      const payload = {
        invoiceNumber: scmFormData.invoiceNumber.trim(),
        trackingId: scmFormData.trackingId.trim(),
        courierName: scmFormData.courierName?.trim() || "Standard",
        serviceWarrantyMonths: Number(firstItem.serviceWarrantyMonthsTotal ?? firstItem.serviceWarrantyMonths ?? orderForScm?.serviceWarrantyMonths ?? 12),
        fullWarrantyMonths: Number(firstItem.fullWarrantyMonthsTotal ?? firstItem.fullWarrantyMonths ?? orderForScm?.fullWarrantyMonths ?? 24),
        orderItems: updatedItems,
        startBarcode: startBc,
        endBarcode: endBc,
        barcode: barcodeStr,
        barcodes: allBarcodes.length > 0 ? allBarcodes : [startBc],
        warrantyStartDate: firstItem.warrantyStartDate || todayStr,
        warrantyEndDate: firstItem.warrantyEndDate || todayStr
      };

      if (formattedItemsForScm.length > 0) {
        payload.items = formattedItemsForScm;
      }

      const updated = await orderService.scmUpdateDetails(orderForScm.id, payload);

      // Synchronize each product line item's warranty details into Battery Inventory
      try {
        const scmBatteriesToSync = [];
        for (const item of updatedItems) {
          const batteryRecord = {
            id: `scm_${orderForScm.id}_${item.id || item.startBarcode || Math.random().toString(36).substring(2, 8)}`,
            customerName: orderForScm.customerName || "Customer",
            productDetails: item.productDetails || orderForScm.productDetails || "EV Battery Unit",
            invoiceNumber: scmFormData.invoiceNumber.trim(),
            warrantyStartDate: item.warrantyStartDate || todayStr,
            warrantyEndDate: item.warrantyEndDate || todayStr,
            fullWarrantyYears: String(item.fullWarrantyYears ?? 1),
            fullWarrantyMonths: String(item.fullWarrantyMonths ?? 0),
            serviceWarrantyYears: String(item.serviceWarrantyYears ?? 0),
            serviceWarrantyMonths: String(item.serviceWarrantyMonths ?? 0),
            totalWarrantyLabel: item.totalWarrantyLabel || "1 Year",
            barcode: item.barcode || item.startBarcode,
            startBarcode: item.startBarcode,
            endBarcode: item.endBarcode,
            barcodes: item.barcodes || [item.startBarcode],
            createdAt: new Date().toISOString()
          };
          scmBatteriesToSync.push(batteryRecord);

          try {
            const apiBatteryPayload = {
              customerName: orderForScm.customerName || "Customer",
              productDetails: item.productDetails || orderForScm.productDetails || "EV Battery Unit",
              invoiceNumber: scmFormData.invoiceNumber.trim(),
              warrantyStartDate: item.warrantyStartDate || null,
              warrantyEndDate: item.warrantyEndDate || null
            };
            if (item.quantity === 1) {
              apiBatteryPayload.barcode = item.startBarcode;
            } else {
              apiBatteryPayload.startBarcode = item.startBarcode;
              apiBatteryPayload.endBarcode = item.endBarcode;
            }
            await batteryService.registerBattery(apiBatteryPayload);
          } catch (regErr) {
            console.warn("Battery API sync note:", regErr);
          }
        }

        const existingScmSync = JSON.parse(localStorage.getItem("battery_inventory_scm_sync") || "[]");
        const scmMap = new Map();
        existingScmSync.forEach(b => { if (b && (b.barcode || b.startBarcode || b.id)) scmMap.set(b.barcode || b.startBarcode || b.id, b); });
        scmBatteriesToSync.forEach(b => { scmMap.set(b.barcode || b.startBarcode || b.id, b); });

        localStorage.setItem("battery_inventory_scm_sync", JSON.stringify(Array.from(scmMap.values())));
      } catch (syncErr) {
        console.warn("Battery inventory sync error:", syncErr);
      }

      showToast(`SCM details saved and marked as SCM Complete for ${orderForScm.orderNumber}`, "success");
      setShowScmModal(false);

      localStorage.setItem(`order_status_${orderForScm.id}`, "scm_complete");
      const updatedHistory = recordOrderActivity(orderForScm.id, {
        title: "SCM Verified & Barcodes Filled",
        description: `Barcodes & invoice #${scmFormData.invoiceNumber} registered. Courier: ${scmFormData.courierName || "Standard"}, Tracking ID: ${scmFormData.trackingId}`,
        status: "scm_complete",
        stage: "SCM Complete",
        updatedBy: "SCM Admin"
      });

      const orderToSave = {
        ...(orderForScm || {}),
        ...(updated || {}),
        id: orderForScm.id,
        orderStatus: "scm_complete",
        scmCompletedAt: new Date().toISOString(),
        ...payload,
        orderItems: updatedItems,
        statusHistory: updatedHistory
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
  }, [orderForScm, scmFormData, scmItemDetails, selectedOrder, showToast, fetchOrders]);

  const handleDispatchOrder = useCallback(async (orderId) => {
    setSubmitting(true);
    try {
      const updated = await orderService.scmDispatchOrder(orderId);
      showToast(`Order dispatched successfully!`, "success");

      localStorage.setItem(`order_status_${orderId}`, "dispatched");
      const updatedHistory = recordOrderActivity(orderId, {
        title: "Order Dispatched",
        description: `Order shipped with courier partner ${orderToSave?.courierName || ""} (Tracking ID: ${orderToSave?.trackingId || "N/A"})`,
        status: "dispatched",
        stage: "Dispatched",
        updatedBy: "SCM Admin"
      });

      const orderToSave = {
        ...(updated || {}),
        id: orderId,
        orderStatus: "dispatched",
        dispatchedAt: new Date().toISOString(),
        statusHistory: updatedHistory
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
  }, [selectedOrder, showToast, fetchOrders]);

  const handleMarkAsDelivered = useCallback(async (orderId) => {
    setSubmitting(true);
    try {
      localStorage.setItem(`order_status_${orderId}`, "delivered");
      localStorage.setItem(`order_delivered_date_${orderId}`, new Date().toISOString());

      const updatedHistory = recordOrderActivity(orderId, {
        title: "Order Delivered",
        description: "Order marked as successfully delivered to customer.",
        status: "delivered",
        stage: "Delivered",
        updatedBy: "Logistics Partner"
      });

      const currentOrder = orders.find((o) => o.id === orderId) || selectedOrder;
      if (currentOrder) {
        const enriched = {
          ...currentOrder,
          orderStatus: "delivered",
          address: localStorage.getItem(`order_shipping_address_${orderId}`) || currentOrder.address || "",
          gstNumber: currentOrder.gstNumber || "",
          statusHistory: updatedHistory
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
    } catch {
      showToast("Failed to mark as delivered", "error");
    } finally {
      setSubmitting(false);
    }
  }, [orders, selectedOrder, showToast, fetchOrders]);

  // Memoized Filter & Sort
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
      const paymentStatusText = o.paymentStatus === "paid" ? "paid" : (o.paymentStatus === "partial" || o.paymentStatus === "unpaid") ? "unpaid" : "pending";
      const matchesSearch =
        !q ||
        o.orderNumber?.toLowerCase().includes(q) ||
        o.customerName?.toLowerCase().includes(q) ||
        o.piNumber?.toLowerCase().includes(q) ||
        o.productDetails?.toLowerCase().includes(q) ||
        o.mobileNumber?.includes(q) ||
        o.barcode?.toLowerCase().includes(q) ||
        o.trackingId?.toLowerCase().includes(q) ||
        paymentStatusText.includes(q);

      // Status Filter
      const matchesStatus = !statusFilter || o.orderStatus === statusFilter;

      // Priority Filter
      const matchesPriority = !priorityFilter || o.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });

    // Sort newest records first
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
  }, [orders, adminStageTab, searchQuery, statusFilter, priorityFilter, isSuperAdmin]);

  const totalPages = useMemo(() => Math.ceil(filteredOrders.length / itemsPerPage) || 1, [filteredOrders.length, itemsPerPage]);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(start, start + itemsPerPage);
  }, [filteredOrders, currentPage, itemsPerPage]);

  return (
    <div className="orders-root">
      {/* Toast Banner */}
      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />

      {/* Header Section */}
      <OrderHeader
        isSalesAdmin={isSalesAdmin}
        isProductionAdmin={isProductionAdmin}
        isScmAdmin={isScmAdmin}
        isSuperAdmin={isSuperAdmin}
        loading={loading}
        onRefresh={fetchOrders}
        onCreateOrderClick={() => setShowCreateModal(true)}
      />

      {/* Super Admin Stage Tabs */}
      {isSuperAdmin && (
        <OrderStageTabs
          adminStageTab={adminStageTab}
          setAdminStageTab={setAdminStageTab}
          orders={orders}
          setCurrentPage={setCurrentPage}
        />
      )}

      {/* Search & Filter Bar */}
      <OrderFilterBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
        setCurrentPage={setCurrentPage}
      />

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
              {paginatedOrders.map((order) => (
                <OrderTableRow
                  key={order.id}
                  order={order}
                  isSalesAdmin={isSalesAdmin}
                  isProductionAdmin={isProductionAdmin}
                  isScmAdmin={isScmAdmin}
                  isSuperAdmin={isSuperAdmin}
                  submitting={submitting}
                  onViewDetails={handleViewDetails}
                  onEditSales={openEditSalesModal}
                  onUpdateProductionStatus={handleUpdateProductionStatus}
                  onOpenScmModal={openScmModal}
                  onDispatchOrder={handleDispatchOrder}
                  onMarkAsDelivered={handleMarkAsDelivered}
                  onGeneratePdfReport={generateOrderPdfReport}
                  getStatusBadge={getStatusBadgeConfig}
                  getPriorityBadge={getPriorityBadgeConfig}
                  formatDate={formatDate}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Bar */}
      {!loading && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredOrders.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Order Details Drawer */}
      <OrderDetailsDrawer
        showDrawer={showDrawer}
        selectedOrder={selectedOrder}
        onClose={() => setShowDrawer(false)}
        isSalesAdmin={isSalesAdmin}
        isProductionAdmin={isProductionAdmin}
        isScmAdmin={isScmAdmin}
        isSuperAdmin={isSuperAdmin}
        submitting={submitting}
        recordPaymentAmount={recordPaymentAmount}
        setRecordPaymentAmount={setRecordPaymentAmount}
        handleRecordIncrementalPayment={handleRecordIncrementalPayment}
        handleUpdateProductionStatus={handleUpdateProductionStatus}
        openEditSalesModal={openEditSalesModal}
        openWarrantyModal={openWarrantyModal}
        openScmModal={openScmModal}
        handleDispatchOrder={handleDispatchOrder}
        handleMarkAsDelivered={handleMarkAsDelivered}
        generateOrderPdfReport={generateOrderPdfReport}
        getStatusBadge={getStatusBadgeConfig}
        getPriorityBadge={getPriorityBadgeConfig}
        formatDate={formatDate}
        openDrawerItemsEdit={openDrawerItemsEdit}
        isEditingDrawerProductDetails={isEditingDrawerProductDetails}
        setIsEditingDrawerProductDetails={setIsEditingDrawerProductDetails}
        drawerOrderItems={drawerOrderItems}
        setDrawerOrderItems={setDrawerOrderItems}
        handleSaveDrawerProductDetails={handleSaveDrawerProductDetails}
        editFormErrors={editFormErrors}
      />

      {/* Create Sales Order Modal */}
      <CreateSalesOrderModal
        showCreateModal={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        salesFormData={salesFormData}
        setSalesFormData={setSalesFormData}
        salesFormErrors={salesFormErrors}
        handleCreateSalesOrder={handleCreateSalesOrder}
        submitting={submitting}
        customerSearchTerm={customerSearchTerm}
        setCustomerSearchTerm={setCustomerSearchTerm}
        showCustomerDropdown={showCustomerDropdown}
        setShowCustomerDropdown={setShowCustomerDropdown}
        registeredUsers={registeredUsers}
      />

      {/* Edit Sales Order Modal */}
      <EditSalesOrderModal
        showEditModal={showEditModal}
        onClose={() => setShowEditModal(false)}
        editOrderData={editOrderData}
        setEditOrderData={setEditOrderData}
        editFormErrors={editFormErrors}
        handleUpdateSalesOrder={handleUpdateSalesOrder}
        submitting={submitting}
      />

      {/* SCM Details Modal */}
      <ScmDetailsModal
        showScmModal={showScmModal}
        onClose={() => setShowScmModal(false)}
        orderForScm={orderForScm}
        scmFormData={scmFormData}
        setScmFormData={setScmFormData}
        scmItemDetails={scmItemDetails}
        setScmItemDetails={setScmItemDetails}
        scmFormErrors={scmFormErrors}
        handleCompleteScm={handleCompleteScm}
        submitting={submitting}
      />

      {/* Warranty Registration Modal */}
      <WarrantyRegistrationModal
        showWarrantyModal={showWarrantyModal}
        onClose={() => setShowWarrantyModal(false)}
        warrantyModalData={warrantyModalData}
        scmFormData={scmFormData}
        setScmFormData={setScmFormData}
        showToast={showToast}
      />

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
        .payment-tag.partial, .payment-tag.unpaid { background: #FFEDD5; color: #9A3412; }
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
