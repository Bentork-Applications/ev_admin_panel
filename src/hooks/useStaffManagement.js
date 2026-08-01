import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { staffService } from "../services/staffService";

export const useStaffManagement = (roleKey) => {
  const navigate = useNavigate();
  const [staffData, setStaffData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isFormOpen, setIsFormOpen] = useState(null);
  const [editingStaff, setEditingStaff] = useState(null);
  const [selectedStaffForDrawer, setSelectedStaffForDrawer] = useState(null);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [toast, setToast] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  const getStaffStatus = useCallback((staff) => {
    const overrides = JSON.parse(localStorage.getItem("admin_staff_status") || "{}");
    if (overrides[staff.id]) {
      return overrides[staff.id];
    }
    return staff.active !== false ? "Active" : "Suspended";
  }, []);

  const fetchStaffData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }

    try {
      const data = await staffService.getAllStaff();
      const list = Array.isArray(data) ? data : data?.adminUsers || data?.users || [];

      // Filter by roleKey if specified
      const filtered = roleKey
        ? list.filter((user) => (user.role || "").toUpperCase() === roleKey.toUpperCase())
        : list;

      setStaffData(filtered);
    } catch (err) {
      console.error("Error fetching staff:", err);
      setError(err.message || "Failed to connect to backend server.");
      setStaffData([]);
    } finally {
      setLoading(false);
    }
  }, [roleKey, navigate]);

  useEffect(() => {
    fetchStaffData();
  }, [fetchStaffData]);

  // Compute Metrics
  const metrics = useMemo(() => {
    const total = staffData.length;
    const active = staffData.filter((s) => getStaffStatus(s) === "Active").length;
    const suspended = total - active;
    return { total, active, suspended };
  }, [staffData, getStaffStatus]);

  // Filtered & Paginated Staff List
  const filteredStaff = useMemo(() => {
    return staffData.filter((staff) => {
      const matchesSearch =
        searchQuery === "" ||
        (staff.name && staff.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (staff.email && staff.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (staff.role && staff.role.toLowerCase().includes(searchQuery.toLowerCase()));

      const currentStatus = getStaffStatus(staff);
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && currentStatus === "Active") ||
        (statusFilter === "SUSPENDED" && currentStatus === "Suspended");

      return matchesSearch && matchesStatus;
    });
  }, [staffData, searchQuery, statusFilter, getStaffStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredStaff.length / itemsPerPage));

  const paginatedStaff = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredStaff.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredStaff, currentPage, itemsPerPage]);

  const toggleStatus = useCallback((staff) => {
    const currentStatus = getStaffStatus(staff);
    const newStatus = currentStatus === "Active" ? "Suspended" : "Active";
    const overrides = JSON.parse(localStorage.getItem("admin_staff_status") || "{}");
    overrides[staff.id] = newStatus;
    localStorage.setItem("admin_staff_status", JSON.stringify(overrides));
    setStaffData((prev) => [...prev]);
    showToast(`Account status updated to ${newStatus} for ${staff.name}`, "success");
  }, [getStaffStatus, showToast]);

  return {
    staffData,
    loading,
    error,
    metrics,
    filteredStaff,
    paginatedStaff,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    currentPage,
    setCurrentPage,
    totalPages,
    itemsPerPage,
    isFormOpen,
    setIsFormOpen,
    editingStaff,
    setEditingStaff,
    selectedStaffForDrawer,
    setSelectedStaffForDrawer,
    activeDropdownId,
    setActiveDropdownId,
    toast,
    setToast,
    showToast,
    getStaffStatus,
    toggleStatus,
    refresh: fetchStaffData
  };
};
