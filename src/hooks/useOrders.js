import { useState, useEffect, useCallback, useMemo } from "react";
import { orderService } from "../services/orderService";
import { extractRoleFromToken } from "../utils/jwtUtils";

export const useOrders = (userRoleFromProp) => {
  const initialCached = orderService.getCachedOrders();
  const [orders, setOrders] = useState(initialCached);
  const [loading, setLoading] = useState(initialCached.length === 0);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [adminStageTab, setAdminStageTab] = useState("ALL");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Selected Order & Modals
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showScmModal, setShowScmModal] = useState(false);

  const token = localStorage.getItem("token");
  const storedRole = localStorage.getItem("userRole");
  const resolvedRole = userRoleFromProp || storedRole || (token ? extractRoleFromToken(token) : "");
  const roleUpper = (resolvedRole || "").toUpperCase();

  const isSalesAdmin = roleUpper.includes("SALES");
  const isProductionAdmin = roleUpper.includes("PRODUCTION");
  const isScmAdmin = roleUpper.includes("SCM");
  const isSuperAdmin = roleUpper.includes("ADMIN") && !isSalesAdmin && !isProductionAdmin && !isScmAdmin;

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  const fetchOrders = useCallback(async () => {
    if (orders.length === 0) setLoading(true);
    setError(null);
    try {
      let data = [];
      if (isSalesAdmin) {
        data = await orderService.salesGetMyOrders();
      } else if (isProductionAdmin) {
        data = await orderService.productionGetOrders();
      } else if (isScmAdmin) {
        data = await orderService.scmGetOrders();
      } else {
        data = await orderService.adminGetAllOrders();
      }
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      setError(err.message || "Failed to load orders list");
    } finally {
      setLoading(false);
    }
  }, [isSalesAdmin, isProductionAdmin, isScmAdmin, orders.length]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Filtered Orders Calculation
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Stage Tab Filter for Super Admin
      if (isSuperAdmin && adminStageTab !== "ALL") {
        const ordSt = (order.orderStatus || "").toLowerCase();
        if (adminStageTab === "SALES" && ordSt !== "sales_registered") return false;
        if (adminStageTab === "PRODUCTION" && ordSt !== "in_production") return false;
        if (adminStageTab === "PROD_DONE" && ordSt !== "production_complete") return false;
        if (adminStageTab === "SCM_DONE" && ordSt !== "scm_complete") return false;
        if (adminStageTab === "DISPATCHED" && ordSt !== "dispatched") return false;
        if (adminStageTab === "COMPLETED" && ordSt !== "delivered" && ordSt !== "completed") return false;
      }

      // Status Filter
      if (statusFilter) {
        const ordSt = (order.orderStatus || "").toLowerCase();
        const fltSt = statusFilter.toLowerCase();
        if (fltSt === "delivered" || fltSt === "completed") {
          if (ordSt !== "delivered" && ordSt !== "completed") return false;
        } else if (ordSt !== fltSt) {
          return false;
        }
      }

      // Priority Filter
      if (priorityFilter && (order.priority || "").toLowerCase() !== priorityFilter.toLowerCase()) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const num = (order.orderNumber || "").toLowerCase();
        const cust = (order.customerName || "").toLowerCase();
        const pi = (order.piNumber || "").toLowerCase();
        const mob = (order.mobileNumber || "").toLowerCase();
        const bar = (order.barcode || "").toLowerCase();
        const track = (order.trackingId || "").toLowerCase();
        if (!num.includes(q) && !cust.includes(q) && !pi.includes(q) && !mob.includes(q) && !bar.includes(q) && !track.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [orders, isSuperAdmin, adminStageTab, statusFilter, priorityFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / itemsPerPage));

  const paginatedOrders = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredOrders, currentPage, itemsPerPage]);

  return {
    orders,
    loading,
    error,
    submitting,
    setSubmitting,
    toast,
    setToast,
    showToast,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    adminStageTab,
    setAdminStageTab,
    currentPage,
    setCurrentPage,
    totalPages,
    itemsPerPage,
    filteredOrders,
    paginatedOrders,
    selectedOrder,
    setSelectedOrder,
    showCreateModal,
    setShowCreateModal,
    showEditModal,
    setShowEditModal,
    showScmModal,
    setShowScmModal,
    isSalesAdmin,
    isProductionAdmin,
    isScmAdmin,
    isSuperAdmin,
    refresh: fetchOrders
  };
};
