import React, { useState, useEffect } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

export default function Orders({ baseUrl }) {
  const [orders, setOrders] = useState([]);
  const [userList, setUserList] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Frontend-only staff assignments, persisted in localStorage
  const [orderStaffAssignments, setOrderStaffAssignments] = useState(() => {
    try {
      const stored = localStorage.getItem("order_staff_assignments");
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  // Modals / Drawer State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);

  // Form states
  const [createFormData, setCreateFormData] = useState({
    assignToUserId: "",
    productName: "",
    batteryModel: "",
    batterySerialNumber: "",
    qrCode: "",
    vehicleNumber: "",
    issueDescription: "",
    priority: "medium",
    adminNotes: ""
  });

  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [selectedUserObj, setSelectedUserObj] = useState(null);

  const [updateStatusData, setUpdateStatusData] = useState({
    status: "",
    cancelReason: "",
    adminNotes: ""
  });

  const [reassignUserId, setReassignUserId] = useState("");
  const [reassignSearchQuery, setReassignSearchQuery] = useState("");
  const [showReassignDropdown, setShowReassignDropdown] = useState(false);
  const [selectedReassignUserObj, setSelectedReassignUserObj] = useState(null);

  const [courierName, setCourierName] = useState("");
  const [trackingId, setTrackingId] = useState("");
  const [dispatchDate, setDispatchDate] = useState("");

  const token = localStorage.getItem("token");
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  };

  const fetchOrdersAndUsers = async () => {
    setLoading(true);
    try {
      const [ordersRes, usersRes, staffRes] = await Promise.all([
        fetch(`${baseUrl}/orders/admin/all`, { headers }),
        fetch(`${baseUrl}/user/all`, { headers }),
        fetch(`${baseUrl}/admin/alladmin`, { headers })
      ]);

      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setOrders(Array.isArray(data) ? data : []);
      }
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUserList(Array.isArray(data) ? data : []);
      }
      if (staffRes.ok) {
        const data = await staffRes.json();
        const adminStaff = Array.isArray(data)
          ? data.filter(a => a.role === "ADMIN_STAFF" || a.role === "admin_staff")
          : [];
        setStaffList(adminStaff);
      }
    } catch (err) {
      console.error("Failed to load orders or users:", err);
      setErrorMsg("Failed to connect to backend server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Frontend-only: assign a staff member to an order
  const handleAssignStaff = (orderId, staffId) => {
    const updated = { ...orderStaffAssignments, [orderId]: staffId };
    setOrderStaffAssignments(updated);
    localStorage.setItem("order_staff_assignments", JSON.stringify(updated));
  };

  useEffect(() => {
    fetchOrdersAndUsers();
  }, [baseUrl]);

  // JSON Description Parser Helper
  const parseOrderDescription = (desc, title) => {
    if (!desc) {
      return {
        productName: title || "—",
        batteryModel: "—",
        batterySerialNumber: "—",
        qrCode: "—",
        vehicleNumber: "—",
        issueDescription: "—"
      };
    }
    try {
      const parsed = JSON.parse(desc);
      if (parsed && typeof parsed === "object") {
        return {
          productName: parsed.productName || title || "—",
          batteryModel: parsed.batteryModel || "—",
          batterySerialNumber: parsed.batterySerialNumber || "—",
          qrCode: parsed.qrCode || "—",
          vehicleNumber: parsed.vehicleNumber || "—",
          issueDescription: parsed.issueDescription || "—"
        };
      }
    } catch (e) {
      // Fail gracefully if not a JSON string
    }
    return {
      productName: title || "—",
      batteryModel: "—",
      batterySerialNumber: "—",
      qrCode: "—",
      vehicleNumber: "—",
      issueDescription: desc || "—"
    };
  };

  const parseDispatchNotes = (notes) => {
    if (!notes) return null;
    const courierMatch = notes.match(/Courier Name:\s*([^|]+)/i);
    const trackingMatch = notes.match(/Tracking ID:\s*([^|]+)/i);
    const dateMatch = notes.match(/Dispatch Date:\s*([^\n|]+)/i);
    if (courierMatch || trackingMatch || dateMatch) {
      return {
        courierName: courierMatch ? courierMatch[1].trim() : "",
        trackingId: trackingMatch ? trackingMatch[1].trim() : "",
        dispatchDate: dateMatch ? dateMatch[1].trim() : ""
      };
    }
    return null;
  };

  // Find user details by ID helper
  const getUserDetails = (userId) => {
    const found = userList.find(u => u.id === userId);
    return {
      mobile: found ? found.mobile || "—" : "—",
      email: found ? found.email || "—" : "—"
    };
  };

  // Compute Statistics
  const stats = React.useMemo(() => {
    const total = orders.length;
    const pending = orders.filter(o => o.status === "pending").length;
    const inProgress = orders.filter(o => o.status === "in_progress").length;
    const testing = orders.filter(o => o.status === "testing").length;
    const completed = orders.filter(o => o.status === "completed").length;
    const dispatched = orders.filter(o => o.status === "dispatched").length;
    const delivered = orders.filter(o => o.status === "delivered").length;
    const cancelled = orders.filter(o => o.status === "cancelled").length;

    // Recharts: Status Chart Data
    const statusChartData = [
      { name: "Pending", count: pending, color: "#F59E0B" },
      { name: "In Progress", count: inProgress, color: "#3B82F6" },
      { name: "Testing", count: testing, color: "#8B5CF6" },
      { name: "Completed", count: completed, color: "#10B981" },
      { name: "Dispatched", count: dispatched, color: "#06B6D4" },
      { name: "Delivered", count: delivered, color: "#059669" },
      { name: "Cancelled", count: cancelled, color: "#EF4444" }
    ];

    // Recharts: Priority Chart Data
    const priorityCounts = orders.reduce((acc, o) => {
      const p = o.priority || "medium";
      acc[p] = (acc[p] || 0) + 1;
      return acc;
    }, {});

    const priorityChartData = [
      { name: "Low", value: priorityCounts["low"] || 0, color: "#10B981" },
      { name: "Medium", value: priorityCounts["medium"] || 0, color: "#F59E0B" },
      { name: "High", value: priorityCounts["high"] || 0, color: "#F97316" },
      { name: "Urgent", value: priorityCounts["urgent"] || 0, color: "#EF4444" }
    ].filter(d => d.value > 0);

    return { total, pending, inProgress, testing, completed, dispatched, delivered, cancelled, statusChartData, priorityChartData };
  }, [orders]);

  // Filtered Orders
  const filteredOrders = React.useMemo(() => {
    return orders.filter(o => {
      const parsed = parseOrderDescription(o.description, o.title);
      const matchesSearch =
        (o.orderNumber && o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (parsed.productName && parsed.productName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (parsed.batterySerialNumber && parsed.batterySerialNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (o.assignedToUserName && o.assignedToUserName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (o.assignedToUserId && o.assignedToUserId.toString().includes(searchQuery));

      const matchesStatus = statusFilter ? o.status === statusFilter : true;
      const matchesPriority = priorityFilter ? o.priority === priorityFilter : true;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [orders, searchQuery, statusFilter, priorityFilter]);

  const sendUserNotification = async (userId, title, message) => {
    try {
      await fetch(`${baseUrl}/notifications/user/${userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          message,
          type: "ORDER"
        })
      });
    } catch (err) {
      console.error("Failed to send in-app notification:", err);
    }
  };

  // Submit New Order (Admin -> Registered User)
  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!createFormData.assignToUserId) {
      setErrorMsg("Please select a registered user for assignment.");
      return;
    }
    setSubmitting(true);
    setErrorMsg("");

    try {
      const serializedDescription = JSON.stringify({
        productName: createFormData.productName.trim(),
        batteryModel: createFormData.batteryModel.trim(),
        batterySerialNumber: createFormData.batterySerialNumber.trim(),
        qrCode: createFormData.qrCode.trim(),
        vehicleNumber: createFormData.vehicleNumber.trim(),
        issueDescription: createFormData.issueDescription.trim()
      });

      const payload = {
        assignToUserId: parseInt(createFormData.assignToUserId),
        title: createFormData.productName.trim(),
        description: serializedDescription,
        priority: createFormData.priority,
        adminNotes: createFormData.adminNotes.trim()
      };

      const response = await fetch(`${baseUrl}/orders/admin/create`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const newOrder = await response.json();
        setOrders([newOrder, ...orders]);
        setShowCreateModal(false);
        // Reset states
        setCreateFormData({
          assignToUserId: "",
          productName: "",
          batteryModel: "",
          batterySerialNumber: "",
          qrCode: "",
          vehicleNumber: "",
          issueDescription: "",
          priority: "medium",
          adminNotes: ""
        });
        setSelectedUserObj(null);
        setUserSearchQuery("");
        // Dispatch sidebar count refresh
        window.dispatchEvent(new Event("refresh-pending-counts"));

        // Trigger user notification on creation
        await sendUserNotification(
          newOrder.assignedToUserId,
          "📋 New Order Assigned",
          `You have a new order: ${newOrder.title}. Check the app for details.`
        );

        // Automatically open the Order Tracking details view for the newly created order
        setSelectedOrder(newOrder);
        setShowDetailsDrawer(true);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setErrorMsg(errorData.message || "Failed to create order. Verify selected user details.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Update Status
  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");

    try {
      let finalAdminNotes = "";
      if (updateStatusData.status === "dispatched") {
        finalAdminNotes = `Courier Name: ${courierName} | Tracking ID: ${trackingId} | Dispatch Date: ${dispatchDate}`;
      }

      const payload = {
        status: updateStatusData.status,
        adminNotes: finalAdminNotes,
        cancelReason: updateStatusData.status === "cancelled" ? updateStatusData.cancelReason.trim() : null
      };

      const response = await fetch(`${baseUrl}/orders/admin/${selectedOrder.id}/update-status`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const updated = await response.json();
        setOrders(orders.map(o => o.id === updated.id ? updated : o));
        setSelectedOrder(updated);

        // Send user notification for status update
        let notifTitle = "Order Update";
        let notifMessage = `Your order '${updated.title}' has been updated to status: ${updated.status.toUpperCase()}.`;

        switch (updated.status) {
          case "in_progress":
            notifTitle = "🔄 Order In Progress";
            notifMessage = `Your order '${updated.title}' is now being worked on.`;
            break;
          case "testing":
            notifTitle = "🧪 Order Testing";
            notifMessage = `Your order '${updated.title}' is in testing phase.`;
            break;
          case "completed":
            notifTitle = "✅ Order Completed";
            notifMessage = `Your order '${updated.title}' has been completed.`;
            break;
          case "dispatched":
            notifTitle = "🚚 Order Dispatched";
            if (courierName || trackingId) {
              notifMessage = `Your order '${updated.title}' has been dispatched via ${courierName} (Tracking ID: ${trackingId}, Date: ${dispatchDate}).`;
            } else {
              notifMessage = `Your order '${updated.title}' has been dispatched.`;
            }
            break;
          case "delivered":
            notifTitle = "📦 Order Delivered";
            notifMessage = `Your order '${updated.title}' has been delivered.`;
            break;
          case "cancelled":
            notifTitle = "❌ Order Cancelled";
            const reason = payload.cancelReason || "No reason specified";
            notifMessage = `Your order '${updated.title}' has been cancelled. Reason: ${reason}`;
            break;
          default:
            break;
        }

        await sendUserNotification(updated.assignedToUserId, notifTitle, notifMessage);

        setUpdateStatusData({ status: "", cancelReason: "", adminNotes: "" });
        setCourierName("");
        setTrackingId("");
        setDispatchDate("");
        window.dispatchEvent(new Event("refresh-pending-counts"));
      } else {
        const errorData = await response.json().catch(() => ({}));
        setErrorMsg(errorData.message || "Failed to update status. Action rejected by transition rules.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to communicate status update.");
    } finally {
      setSubmitting(false);
    }
  };

  // Reassign Order (to registered user)
  const handleReassign = async (e) => {
    e.preventDefault();
    if (!reassignUserId) {
      setErrorMsg("Please select a new registered user.");
      return;
    }
    setSubmitting(true);
    setErrorMsg("");

    try {
      const payload = {
        assignToUserId: parseInt(reassignUserId)
      };

      const response = await fetch(`${baseUrl}/orders/admin/${selectedOrder.id}/reassign`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const updated = await response.json();
        setOrders(orders.map(o => o.id === updated.id ? updated : o));
        setSelectedOrder(updated);
        setReassignUserId("");
        setSelectedReassignUserObj(null);
        setReassignSearchQuery("");
      } else {
        const errorData = await response.json().catch(() => ({}));
        setErrorMsg(errorData.message || "Failed to reassign order.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to reassign.");
    } finally {
      setSubmitting(false);
    }
  };

  // Build Allowed Transition Dropdowns
  const getNextTransitions = (currentStatus) => {
    if (!currentStatus) return [];
    const status = currentStatus.toLowerCase().trim();
    if (status === "cancelled" || status === "delivered") return [];

    const options = [];
    if (status === "pending") options.push("in_progress");
    else if (status === "in_progress") options.push("testing");
    else if (status === "testing") options.push("completed");
    else if (status === "completed") options.push("dispatched");
    else if (status === "dispatched") options.push("delivered");

    options.push("cancelled");
    return options;
  };

  const getPriorityColor = (p) => {
    switch (p) {
      case "low": return { bg: "#E6F4EA", fg: "#137333" };
      case "medium": return { bg: "#FEF7E0", fg: "#B06000" };
      case "high": return { bg: "#FCE8E6", fg: "#C5221F" };
      case "urgent": return { bg: "#F3E8FF", fg: "#6B21A8" };
      default: return { bg: "#F3F4F6", fg: "#374151" };
    }
  };

  const getStatusColor = (s) => {
    switch (s) {
      case "pending": return { bg: "#FEF7E0", fg: "#B06000" };
      case "in_progress": return { bg: "#E8F0FE", fg: "#1A73E8" };
      case "testing": return { bg: "#F3E8FF", fg: "#6B21A8" };
      case "completed": return { bg: "#E6F4EA", fg: "#137333" };
      case "dispatched": return { bg: "#E0F7FA", fg: "#006064" };
      case "delivered": return { bg: "#E2F0D9", fg: "#385623" };
      case "cancelled": return { bg: "#FCE8E6", fg: "#C5221F" };
      default: return { bg: "#F3F4F6", fg: "#374151" };
    }
  };

  // Filtered lists for searchable user pickers
  const searchedUsersList = userSearchQuery.trim()
    ? userList.filter(u =>
      (u.name && u.name.toLowerCase().includes(userSearchQuery.toLowerCase())) ||
      (u.id && u.id.toString().includes(userSearchQuery)) ||
      (u.mobile && u.mobile.includes(userSearchQuery))
    )
    : [];

  const searchedReassignUsersList = reassignSearchQuery.trim()
    ? userList.filter(u =>
      (u.name && u.name.toLowerCase().includes(reassignSearchQuery.toLowerCase())) ||
      (u.id && u.id.toString().includes(reassignSearchQuery)) ||
      (u.mobile && u.mobile.includes(reassignSearchQuery))
    )
    : [];

  return (
    <div className="orders-page-wrapper">
      <style>{`
        .orders-page-wrapper {
          width: 100%;
          min-height: 100vh;
          font-family: 'Lexend', sans-serif;
          padding: 24px;
          box-sizing: border-box;
          background: #F9FAFB;
        }
        .orders-container {
          max-width: 1200px;
          margin: 0 auto;
        }
        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
        }
        .header-left h2 {
          font-size: 28px;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }
        .primary-btn {
          background: #111827;
          color: white;
          border: none;
          padding: 10px 22px;
          border-radius: 9999px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .primary-btn:hover {
          background: #374151;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .sec-btn {
          background: #ffffff;
          border: 1px solid #D1D5DB;
          color: #374151;
          padding: 8px 16px;
          border-radius: 9999px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          transition: all 0.2s ease;
        }
        .sec-btn:hover {
          background: #F9FAFB;
          border-color: #9CA3AF;
        }
        .cards-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 28px;
        }
        @media (max-width: 1024px) {
          .cards-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 640px) {
          .cards-grid {
            grid-template-columns: 1fr;
          }
        }
        .stats-card {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.01);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .stats-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.04);
        }
        .stats-card-title {
          font-size: 13px;
          color: #6B7280;
          font-weight: 500;
          margin-bottom: 4px;
        }
        .stats-card-value {
          font-size: 26px;
          font-weight: 700;
          color: #111827;
        }
        .charts-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 28px;
        }
        @media (max-width: 768px) {
          .charts-row {
            grid-template-columns: 1fr;
          }
        }
        .chart-box {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.01);
        }
        .chart-title {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 20px 0;
        }
        .filter-panel {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 16px;
          padding: 16px;
          display: flex;
          gap: 16px;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .search-box {
          flex: 1;
          min-width: 250px;
          padding: 10px 16px;
          border: 1px solid #E5E7EB;
          border-radius: 9999px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }
        .search-box:focus {
          border-color: #111827;
        }
        .select-filter {
          padding: 10px 16px;
          border: 1px solid #E5E7EB;
          border-radius: 9999px;
          font-size: 13px;
          outline: none;
          cursor: pointer;
          background: white;
        }
        .table-card {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.01);
        }
        .orders-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .orders-table th {
          background: #F9FAFB;
          padding: 14px 20px;
          font-size: 12px;
          font-weight: 600;
          color: #4B5563;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #E5E7EB;
        }
        .orders-table td {
          padding: 16px 20px;
          border-bottom: 1px solid #E5E7EB;
          font-size: 14px;
          color: #374151;
        }
        .orders-table tr {
          cursor: pointer;
          transition: background 0.15s;
        }
        .orders-table tr:hover {
          background: #F9FAFB;
        }
        .pill-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 600;
          text-transform: capitalize;
        }
        .drawer-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.4);
          z-index: 100;
          backdrop-filter: blur(4px);
        }
        .drawer-box {
          position: fixed;
          top: 0; right: 0; bottom: 0;
          width: 500px;
          max-width: 100%;
          background: white;
          box-shadow: -10px 0 30px rgba(0,0,0,0.15);
          z-index: 101;
          display: flex;
          flex-direction: column;
          animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .drawer-header {
          padding: 24px;
          border-bottom: 1px solid #E5E7EB;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .drawer-body {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }
        .details-section-title {
          font-size: 14px;
          font-weight: 700;
          color: #111827;
          border-bottom: 2px solid #E5E7EB;
          padding-bottom: 6px;
          margin: 20px 0 12px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px 16px;
          margin-bottom: 16px;
        }
        .detail-label {
          font-size: 11px;
          color: #6B7280;
          font-weight: 500;
          margin-bottom: 2px;
        }
        .detail-value {
          font-size: 13px;
          color: #111827;
          font-weight: 600;
        }
        .notes-log-container {
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          padding: 12px;
          max-height: 150px;
          overflow-y: auto;
          font-size: 12px;
          color: #4B5563;
          white-space: pre-wrap;
          font-family: 'Courier New', Courier, monospace;
          margin-bottom: 16px;
        }
        .stepper-container {
          margin-bottom: 20px;
        }
        .stepper-flow {
          display: flex;
          flex-direction: column;
          gap: 10px;
          position: relative;
          padding-left: 20px;
          margin-top: 8px;
        }
        .stepper-flow::before {
          content: '';
          position: absolute;
          left: 6px;
          top: 6px;
          bottom: 6px;
          width: 2px;
          background: #E5E7EB;
        }
        .step-node {
          position: relative;
          display: flex;
          flex-direction: column;
          text-align: left;
        }
        .step-dot {
          position: absolute;
          left: -19px;
          top: 4px;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #E5E7EB;
          border: 2px solid white;
          box-shadow: 0 0 0 1px #E5E7EB;
        }
        .step-dot.active {
          background: #10B981;
          box-shadow: 0 0 0 1px #10B981;
        }
        .step-label {
          font-size: 12px;
          font-weight: 600;
          color: #374151;
          text-transform: capitalize;
        }
        .step-time {
          font-size: 10px;
          color: #9CA3AF;
        }
        .form-group {
          margin-bottom: 14px;
          position: relative;
        }
        .form-group label {
          font-size: 12px;
          font-weight: 500;
          color: #374151;
          display: block;
          margin-bottom: 4px;
        }
        .form-control {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #D1D5DB;
          border-radius: 8px;
          font-size: 13px;
          outline: none;
          box-sizing: border-box;
          background: white;
        }
        .form-control:focus {
          border-color: #111827;
        }
        .search-results-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #D1D5DB;
          border-radius: 8px;
          box-shadow: 0 8px 16px rgba(0,0,0,0.1);
          z-index: 10;
          max-height: 160px;
          overflow-y: auto;
          margin-top: 2px;
        }
        .search-result-item {
          padding: 8px 12px;
          font-size: 12px;
          cursor: pointer;
          border-bottom: 1px solid #F3F4F6;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .search-result-item:hover {
          background: #F9FAFB;
        }
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          text-align: center;
          color: #6B7280;
        }
        .empty-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }
        .empty-title {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 4px;
        }
        .assign-staff-select {
          padding: 6px 10px;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          font-size: 12px;
          font-family: 'Lexend', sans-serif;
          color: #374151;
          background: #fff;
          cursor: pointer;
          outline: none;
          min-width: 150px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .assign-staff-select:hover {
          border-color: #9CA3AF;
        }
        .assign-staff-select:focus {
          border-color: #111827;
          box-shadow: 0 0 0 3px rgba(17,24,39,0.08);
        }
        .assigned-staff-badge {
          display: block;
          margin-top: 4px;
          font-size: 10px;
          font-weight: 600;
          color: #065F46;
          background: #D1FAE5;
          border-radius: 6px;
          padding: 2px 6px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 150px;
        }
      `}</style>

      <div className="orders-container">
        <div className="header-row">
          <div className="header-left">
            <h2>Order Tracking</h2>
            <span style={{ fontSize: "13px", color: "#6B7280" }}>Manage customer order tracking lifecycle</span>
          </div>
          <button className="primary-btn" onClick={() => setShowCreateModal(true)}>
            <span style={{ fontSize: 18 }}>+</span> Create Order
          </button>
        </div>

        {errorMsg && (
          <div style={{ background: "#FEE2E2", border: "1px solid #FCA5A5", color: "#991B1B", padding: "12px 16px", borderRadius: "12px", marginBottom: "20px", fontSize: "14px" }}>
            {errorMsg}
          </div>
        )}

        {/* 6 Summary Cards */}
        <div className="cards-grid">
          <div className="stats-card">
            <div className="stats-card-title">Total Orders</div>
            <div className="stats-card-value">{stats.total}</div>
          </div>
          <div className="stats-card">
            <div className="stats-card-title">Pending Orders</div>
            <div className="stats-card-value" style={{ color: "#B06000" }}>{stats.pending}</div>
          </div>
          <div className="stats-card">
            <div className="stats-card-title">In Progress / Testing</div>
            <div className="stats-card-value" style={{ color: "#3B82F6" }}>{stats.inProgress + stats.testing}</div>
          </div>
          <div className="stats-card">
            <div className="stats-card-title">Delivered Orders</div>
            <div className="stats-card-value" style={{ color: "#059669" }}>{stats.delivered}</div>
          </div>
        </div>

        {/* Side-by-side Analytics Charts */}
        {orders.length > 0 && (
          <div className="charts-row">
            <div className="chart-box">
              <h4 className="chart-title">Orders by Status</h4>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={stats.statusChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} tickLine={false} />
                  <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'rgba(243, 244, 246, 0.5)' }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {stats.statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-box">
              <h4 className="chart-title">Orders by Priority</h4>
              {stats.priorityChartData.length === 0 ? (
                <div className="empty-state" style={{ padding: "40px 0" }}>No prioritized records</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={stats.priorityChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stats.priorityChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} Orders`, 'Count']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', marginTop: 12 }}>
                    {stats.priorityChartData.map((entry, index) => (
                      <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: entry.color }}></div>
                        <span>{entry.name} ({entry.value})</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="filter-panel">
          <input
            type="text"
            className="search-box"
            placeholder="Search by order #, product name, serial, user..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className="select-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="testing">Testing</option>
            <option value="completed">Completed</option>
            <option value="dispatched">Dispatched</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            className="select-filter"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        {/* Data Table */}
        <div className="table-card">
          {loading ? (
            <div className="empty-state">
              <span className="empty-icon" style={{ animation: "spin 2s linear infinite" }}>🔄</span>
              <div className="empty-title">Loading order directory...</div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📦</span>
              <div className="empty-title">No orders found</div>
              <span style={{ fontSize: "13px" }}>Try adjusting your filters or create a new order ticket.</span>
            </div>
          ) : (
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order Number</th>
                  <th>User Name</th>
                  <th>User ID</th>
                  <th>Product Name</th>
                  <th>Battery Serial</th>
                  <th>Priority</th>
                  <th>Current Status</th>
                  <th>Assign To</th>
                  <th>Created Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o) => {
                  const parsed = parseOrderDescription(o.description, o.title);
                  const pStyle = getPriorityColor(o.priority);
                  const sStyle = getStatusColor(o.status);
                  return (
                    <tr key={o.id} onClick={() => {
                      setSelectedOrder(o);
                      setShowDetailsDrawer(true);
                      setUpdateStatusData({ status: "", cancelReason: "", adminNotes: "" });
                      setCourierName("");
                      setTrackingId("");
                      setDispatchDate("");
                    }}>
                      <td style={{ fontWeight: 700, color: "#111827" }}>{o.orderNumber}</td>
                      <td style={{ fontWeight: 600 }}>{o.assignedToUserName || "—"}</td>
                      <td style={{ color: "#4B5563" }}>{o.assignedToUserId || "—"}</td>
                      <td style={{ fontWeight: 500 }}>{parsed.productName}</td>
                      <td style={{ fontFamily: "monospace", fontSize: 13 }}>{parsed.batterySerialNumber}</td>
                      <td>
                        <span className="pill-badge" style={{ backgroundColor: pStyle.bg, color: pStyle.fg }}>
                          {o.priority || "medium"}
                        </span>
                      </td>
                      <td>
                        <span className="pill-badge" style={{ backgroundColor: sStyle.bg, color: sStyle.fg }}>
                          {o.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <select
                          className="assign-staff-select"
                          value={orderStaffAssignments[o.id] || ""}
                          onChange={(e) => handleAssignStaff(o.id, e.target.value)}
                        >
                          <option value="">Select Admin Staff</option>
                          {staffList.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name || s.email || `Staff #${s.id}`}
                            </option>
                          ))}
                        </select>
                        {orderStaffAssignments[o.id] && (() => {
                          const assigned = staffList.find(s => String(s.id) === String(orderStaffAssignments[o.id]));
                          return assigned ? (
                            <span className="assigned-staff-badge">
                              ✓ {assigned.name || assigned.email}
                            </span>
                          ) : null;
                        })()}
                      </td>
                      <td style={{ color: "#6B7280", fontSize: 13 }}>
                        {new Date(o.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* CREATE ORDER MODAL (Admin -> Registered User workflow only) */}
      {showCreateModal && (
        <div className="drawer-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="drawer-box" onClick={(e) => e.stopPropagation()} style={{ width: 460 }}>
            <div className="drawer-header">
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Create User Order</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#888' }}>×</button>
            </div>
            <form onSubmit={handleCreateOrder} className="drawer-body">
              {/* User search lookup field */}
              <div className="form-group">
                <label>Search and Select User (by Name, ID, or Mobile) *</label>
                {!selectedUserObj ? (
                  <>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Type name, ID, or phone number..."
                      value={userSearchQuery}
                      onChange={(e) => {
                        setUserSearchQuery(e.target.value);
                        setShowUserDropdown(true);
                      }}
                      onFocus={() => setShowUserDropdown(true)}
                    />
                    {showUserDropdown && searchedUsersList.length > 0 && (
                      <div className="search-results-dropdown">
                        {searchedUsersList.map(u => (
                          <div
                            key={u.id}
                            className="search-result-item"
                            onClick={() => {
                              setSelectedUserObj(u);
                              setCreateFormData({ ...createFormData, assignToUserId: u.id.toString() });
                              setShowUserDropdown(false);
                              setUserSearchQuery("");
                            }}
                          >
                            <div>
                              <strong style={{ display: 'block' }}>{u.name || "Unnamed"}</strong>
                              <span style={{ fontSize: 10, color: '#6B7280' }}>Mobile: {u.mobile || "—"}</span>
                            </div>
                            <span style={{ fontSize: 11, background: '#F3F4F6', padding: '2px 6px', borderRadius: 4 }}>ID: {u.id}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '8px 12px', borderRadius: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#065F46' }}>{selectedUserObj.name || "Unnamed"}</div>
                      <div style={{ fontSize: 11, color: '#047857' }}>ID: {selectedUserObj.id} | Mobile: {selectedUserObj.mobile || "—"}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUserObj(null);
                        setCreateFormData({ ...createFormData, assignToUserId: "" });
                      }}
                      style={{ background: '#EF4444', color: 'white', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Product Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Lithium-Ion Battery Pack"
                  value={createFormData.productName}
                  onChange={(e) => setCreateFormData({ ...createFormData, productName: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Battery Model *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Bentork-EV 48V"
                  value={createFormData.batteryModel}
                  onChange={(e) => setCreateFormData({ ...createFormData, batteryModel: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Battery Barcode Number *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. BTK-99281-A"
                  value={createFormData.batterySerialNumber}
                  onChange={(e) => setCreateFormData({ ...createFormData, batterySerialNumber: e.target.value })}
                  required
                />
              </div>



              <div className="form-group">
                <label>Issue / Work Description *</label>
                <textarea
                  className="form-control"
                  rows="2"
                  placeholder="Describe repair or installation service..."
                  value={createFormData.issueDescription}
                  onChange={(e) => setCreateFormData({ ...createFormData, issueDescription: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Priority</label>
                <select
                  className="form-control"
                  value={createFormData.priority}
                  onChange={(e) => setCreateFormData({ ...createFormData, priority: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <button type="button" className="sec-btn" style={{ flex: 1 }} onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="primary-btn" style={{ flex: 1, justifyContent: 'center' }} disabled={submitting}>
                  {submitting ? "Creating..." : "Submit Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILS DRAWER */}
      {showDetailsDrawer && selectedOrder && (
        <div className="drawer-overlay" onClick={() => setShowDetailsDrawer(false)}>
          <div className="drawer-box" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#9CA3AF" }}>{selectedOrder.orderNumber}</h3>
                <h2 style={{ margin: "4px 0 0 0", fontSize: 16, fontWeight: 700, color: "#111827" }}>{selectedOrder.title}</h2>
              </div>
              <button onClick={() => setShowDetailsDrawer(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#888' }}>×</button>
            </div>

            <div className="drawer-body">
              {/* Customer Information */}
              <div className="details-section-title">Customer Information</div>
              <div className="details-grid">
                <div>
                  <div className="detail-label">User Name</div>
                  <div className="detail-value">{selectedOrder.assignedToUserName || "—"}</div>
                </div>
                <div>
                  <div className="detail-label">User ID</div>
                  <div className="detail-value">{selectedOrder.assignedToUserId || "—"}</div>
                </div>
                <div>
                  <div className="detail-label">Mobile Number</div>
                  <div className="detail-value">{getUserDetails(selectedOrder.assignedToUserId).mobile}</div>
                </div>
                <div>
                  <div className="detail-label">Email</div>
                  <div className="detail-value" style={{ fontSize: 12 }}>{selectedOrder.assignedToUserEmail || "—"}</div>
                </div>
              </div>

              {/* Product Information */}
              {(() => {
                const parsed = parseOrderDescription(selectedOrder.description, selectedOrder.title);
                return (
                  <>
                    <div className="details-section-title">Product Information</div>
                    <div className="details-grid">
                      <div>
                        <div className="detail-label">Product Name</div>
                        <div className="detail-value">{parsed.productName}</div>
                      </div>
                      <div>
                        <div className="detail-label">Battery Model</div>
                        <div className="detail-value">{parsed.batteryModel}</div>
                      </div>
                      <div>
                        <div className="detail-label">Battery Serial Number</div>
                        <div className="detail-value" style={{ fontFamily: "monospace" }}>{parsed.batterySerialNumber}</div>
                      </div>
                      <div>
                        <div className="detail-label">QR Code</div>
                        <div className="detail-value">{parsed.qrCode}</div>
                      </div>
                    </div>

                    {/* Order Information */}
                    <div className="details-section-title">Order Information</div>
                    <div className="details-grid">
                      <div>
                        <div className="detail-label">Order Number</div>
                        <div className="detail-value" style={{ color: "#1A73E8" }}>{selectedOrder.orderNumber}</div>
                      </div>
                      <div>
                        <div className="detail-label">Priority</div>
                        <div>
                          <span className="pill-badge" style={{ backgroundColor: getPriorityColor(selectedOrder.priority).bg, color: getPriorityColor(selectedOrder.priority).fg }}>
                            {selectedOrder.priority}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="detail-label">Created Date</div>
                        <div className="detail-value" style={{ fontSize: 11, color: "#4B5563" }}>
                          {new Date(selectedOrder.createdAt).toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div>
                        <div className="detail-label">Updated Date</div>
                        <div className="detail-value" style={{ fontSize: 11, color: "#4B5563" }}>
                          {new Date(selectedOrder.updatedAt).toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 20 }}>
                      <div className="detail-label">Description / Issue</div>
                      <div style={{ background: "#F9FAFB", padding: 10, borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 13, color: "#4B5563" }}>
                        {parsed.issueDescription}
                      </div>
                    </div>

                    {(() => {
                      const dispatchInfo = parseDispatchNotes(selectedOrder.adminNotes);
                      if (dispatchInfo) {
                        return (
                          <>
                            <div className="details-section-title" style={{ color: "#006064", borderColor: "#B2EBF2" }}>Dispatch Details</div>
                            <div className="details-grid">
                              <div>
                                <div className="detail-label" style={{ color: "#006064" }}>Courier Name</div>
                                <div className="detail-value" style={{ fontWeight: 600, color: "#006064" }}>{dispatchInfo.courierName}</div>
                              </div>
                              <div>
                                <div className="detail-label" style={{ color: "#006064" }}>Tracking ID</div>
                                <div className="detail-value" style={{ fontWeight: 600, color: "#006064" }}>{dispatchInfo.trackingId}</div>
                              </div>
                              <div style={{ gridColumn: 'span 2' }}>
                                <div className="detail-label" style={{ color: "#006064" }}>Dispatch Date</div>
                                <div className="detail-value" style={{ fontWeight: 600, color: "#006064" }}>{dispatchInfo.dispatchDate}</div>
                              </div>
                            </div>
                          </>
                        );
                      }
                      return null;
                    })()}
                  </>
                );
              })()}

              {selectedOrder.cancelReason && (
                <div style={{ marginBottom: 20, background: "#FEF2F2", border: "1px solid #FCA5A5", padding: 10, borderRadius: 8 }}>
                  <div className="detail-label" style={{ color: "#B91C1C" }}>Reason for Cancellation</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#991B1B" }}>{selectedOrder.cancelReason}</div>
                </div>
              )}

              {/* Status Stepper Progression */}
              <div className="stepper-container">
                <div className="detail-label" style={{ fontWeight: 600, color: '#111827', marginBottom: 6 }}>Status Timeline Flow</div>
                <div className="stepper-flow">
                  {[
                    { key: "pending", label: "Order Confirmed", time: selectedOrder.createdAt },
                    { key: "in_progress", label: "In Production", time: selectedOrder.inProgressAt },
                    { key: "testing", label: "Testing", time: selectedOrder.testingAt },
                    { key: "completed", label: "Completed", time: selectedOrder.completedAt },
                    { key: "dispatched", label: "Dispatched", time: selectedOrder.dispatchedAt },
                    { key: "delivered", label: "Delivered", time: selectedOrder.deliveredAt }
                  ].map((step, idx) => {
                    const statuses = ["pending", "in_progress", "testing", "completed", "dispatched", "delivered", "cancelled"];
                    const currentIdx = statuses.indexOf(selectedOrder.status);
                    const stepIdx = statuses.indexOf(step.key);
                    const isActive = selectedOrder.status !== "cancelled" && stepIdx <= currentIdx;

                    return (
                      <div key={idx} className="step-node">
                        <div className={`step-dot ${isActive ? "active" : ""}`}></div>
                        <span className="step-label">{step.label}</span>
                        {step.time && (
                          <span className="step-time">
                            {new Date(step.time).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {selectedOrder.status === "cancelled" && (
                    <div className="step-node">
                      <div className="step-dot active" style={{ background: "#EF4444" }}></div>
                      <span className="step-label" style={{ color: "#EF4444" }}>Cancelled</span>
                      {selectedOrder.cancelledAt && (
                        <span className="step-time">
                          {new Date(selectedOrder.cancelledAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Notes Log */}
              {selectedOrder.adminNotes && (
                <div>
                  <div className="detail-label">Admin Notes History</div>
                  <div className="notes-log-container">{selectedOrder.adminNotes}</div>
                </div>
              )}

              {/* Action: Update Status */}
              {getNextTransitions(selectedOrder.status).length > 0 && (
                <form onSubmit={handleUpdateStatus} style={{ borderTop: "1px solid #E5E7EB", paddingTop: 16, marginBottom: 16 }}>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: 13, fontWeight: 700 }}>Update Status</h4>
                  <div className="form-group">
                    <select
                      className="form-control"
                      value={updateStatusData.status}
                      onChange={(e) => setUpdateStatusData({ ...updateStatusData, status: e.target.value })}
                      required
                    >
                      <option value="">Select Next Status</option>
                      {getNextTransitions(selectedOrder.status).map(status => (
                        <option key={status} value={status}>{status.replace('_', ' ').toUpperCase()}</option>
                      ))}
                    </select>
                  </div>

                  {updateStatusData.status === "cancelled" && (
                    <div className="form-group">
                      <label>Cancel Reason *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="State reason for cancellation..."
                        value={updateStatusData.cancelReason}
                        onChange={(e) => setUpdateStatusData({ ...updateStatusData, cancelReason: e.target.value })}
                        required
                      />
                    </div>
                  )}

                  {updateStatusData.status === "dispatched" && (
                    <>
                      <div className="form-group">
                        <label>Courier Name *</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. FedEx, DHL, BlueDart"
                          value={courierName}
                          onChange={(e) => setCourierName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Tracking ID *</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Enter tracking number/ID..."
                          value={trackingId}
                          onChange={(e) => setTrackingId(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Dispatch Date *</label>
                        <input
                          type="date"
                          className="form-control"
                          value={dispatchDate}
                          onChange={(e) => setDispatchDate(e.target.value)}
                          required
                        />
                      </div>
                    </>
                  )}

                  <button type="submit" className="primary-btn" style={{ width: "100%", justifyContent: "center" }} disabled={submitting}>
                    {submitting ? "Updating..." : "Apply Transition"}
                  </button>
                </form>
              )}


            </div>
          </div>
        </div>
      )}
    </div>
  );
}
