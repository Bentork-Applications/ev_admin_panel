import { useState, useEffect, useCallback, useMemo } from "react";
import { orderService } from "../services/orderService";

export const useOrders = (userRole) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const roleUpper = (userRole || "").toUpperCase();
  const isSalesAdmin = roleUpper === "SALES_ADMIN" || roleUpper === "SALES";
  const isProductionAdmin = roleUpper === "PRODUCTION_ADMIN" || roleUpper === "PRODUCTION";
  const isScmAdmin = roleUpper === "SCM_ADMIN" || roleUpper === "SCM";
  const isSuperAdmin = !isSalesAdmin && !isProductionAdmin && !isScmAdmin;

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data = [];
      try {
        data = await orderService.adminGetAllOrders();
      } catch (allErr) {
        if (isSalesAdmin) data = await orderService.salesGetMyOrders();
        else if (isProductionAdmin) data = await orderService.productionGetOrders();
        else if (isScmAdmin) data = await orderService.scmGetOrders();
        else throw allErr;
      }
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      setError(err.message || "Failed to load orders list");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [isSalesAdmin, isProductionAdmin, isScmAdmin]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Filtered Orders Calculation
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Stage Tab Filter for Super Admin
      if (isSuperAdmin && adminStageTab !== "ALL") {
        if (adminStageTab === "SALES" && order.orderStatus !== "sales_registered") return false;
        if (adminStageTab === "PRODUCTION" && order.orderStatus !== "in_production") return false;
        if (adminStageTab === "PROD_DONE" && order.orderStatus !== "production_complete") return false;
        if (adminStageTab === "SCM_DONE" && order.orderStatus !== "scm_complete") return false;
        if (adminStageTab === "DISPATCHED" && order.orderStatus !== "dispatched") return false;
      }

      // Status Filter
      if (statusFilter && order.orderStatus !== statusFilter) return false;

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
