import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function BatteriesPage({ baseUrl: propBaseUrl }) {
  const navigate = useNavigate();

  const getWarrantyDurationYears = (b) => {
    if (!b.warrantyStartDate || !b.warrantyEndDate) return 0;
    const start = new Date(b.warrantyStartDate);
    const end = new Date(b.warrantyEndDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const years = Math.round(diffDays / 365);
    return Math.max(1, years);
  };

  const calculateEndDate = (startDateStr, yearsStr) => {
    if (!startDateStr || !yearsStr) return "";
    const years = parseInt(yearsStr, 10);
    if (isNaN(years) || years <= 0) return "";

    const start = new Date(startDateStr);
    if (isNaN(start.getTime())) return "";

    const end = new Date(start);
    end.setFullYear(start.getFullYear() + years);

    const yyyy = end.getFullYear();
    const mm = String(end.getMonth() + 1).padStart(2, '0');
    const dd = String(end.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [batteries, setBatteries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [warrantyYearFilter, setWarrantyYearFilter] = useState("All");
  const [productCategoryFilter, setProductCategoryFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [registerMode, setRegisterMode] = useState("single"); // "single" or "series"
  const [registerLoading, setRegisterLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formData, setFormData] = useState({
    customerName: "",
    productDetails: "",
    invoiceNumber: "",
    barcode: "",
    startBarcode: "",
    endBarcode: "",
    warrantyStartDate: "",
    warrantyEndDate: "",
    warrantyYears: "1",
    selectedMadeProduct: "",
    customMadeProduct: "",
  });

  const [deletedIds, setDeletedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("battery_inventory_deleted_ids") || "[]");
    } catch {
      return [];
    }
  });

  const [editedRecords, setEditedRecords] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("battery_inventory_edited_records") || "{}");
    } catch {
      return {};
    }
  });

  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [viewDetailsTarget, setViewDetailsTarget] = useState(null);
  const [editFormData, setEditFormData] = useState({
    customerName: "",
    productDetails: "",
    invoiceNumber: "",
    barcode: "",
    warrantyStartDate: "",
    warrantyEndDate: "",
    warrantyYears: "",
  });

  const baseUrl = propBaseUrl || import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchBatteries();

    const handleDocumentClick = () => {
      setActiveMenuId(null);
    };
    document.addEventListener("click", handleDocumentClick);
    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, []);

  const handleOpenEdit = (b) => {
    setEditTarget(b);
    const duration = getWarrantyDurationYears(b);
    setEditFormData({
      customerName: b.customerName || "",
      productDetails: b.productDetails || "",
      invoiceNumber: b.invoiceNumber || "",
      barcode: b.barcode || "",
      warrantyStartDate: b.warrantyStartDate || "",
      warrantyEndDate: b.warrantyEndDate || "",
      warrantyYears: duration > 0 ? duration.toString() : "1",
    });
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    const newEdited = { ...editedRecords };
    editTarget.originalBatteries.forEach(orig => {
      newEdited[orig.id] = {
        customerName: editFormData.customerName,
        productDetails: editFormData.productDetails,
        invoiceNumber: editFormData.invoiceNumber,
        barcode: editFormData.barcode,
        warrantyStartDate: editFormData.warrantyStartDate,
        warrantyEndDate: editFormData.warrantyEndDate,
      };
    });
    setEditedRecords(newEdited);
    localStorage.setItem("battery_inventory_edited_records", JSON.stringify(newEdited));
    setEditTarget(null);
    alert("Battery records updated successfully!");
  };

  const fetchBatteries = async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }
    try {
      const response = await fetch(`${baseUrl}/battery-data/admin/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setBatteries(Array.isArray(data) ? data : []);
      } else {
        throw new Error(`Failed to load batteries (Status: ${response.status})`);
      }
    } catch (err) {
      console.error("Error fetching batteries:", err);
      setError("Failed to load battery inventory. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setFormError(null);
    setFormData({
      customerName: "",
      productDetails: "",
      invoiceNumber: "",
      barcode: "",
      startBarcode: "",
      endBarcode: "",
      warrantyStartDate: "",
      warrantyEndDate: "",
      warrantyYears: "1",
      selectedMadeProduct: "",
      customMadeProduct: "",
    });
    setRegisterMode("single");
    setShowModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === "warrantyStartDate" || name === "warrantyYears") {
        updated.warrantyEndDate = calculateEndDate(updated.warrantyStartDate, updated.warrantyYears);
      }
      return updated;
    });
  };

  const handleEditFormChange = (name, value) => {
    setEditFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === "warrantyStartDate" || name === "warrantyYears") {
        updated.warrantyEndDate = calculateEndDate(updated.warrantyStartDate, updated.warrantyYears);
      }
      return updated;
    });
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegisterLoading(true);
    setFormError(null);

    const token = localStorage.getItem("token");
    const madeProductVal = formData.selectedMadeProduct === "Other"
      ? formData.customMadeProduct
      : formData.selectedMadeProduct;
    const combinedDetails = madeProductVal
      ? `${madeProductVal} - ${formData.productDetails}`
      : formData.productDetails;

    const payload = {
      customerName: formData.customerName,
      productDetails: combinedDetails,
      invoiceNumber: formData.invoiceNumber,
      warrantyStartDate: formData.warrantyStartDate || null,
      warrantyEndDate: formData.warrantyEndDate || null,
    };

    if (registerMode === "single") {
      payload.barcode = formData.barcode;
      payload.startBarcode = null;
      payload.endBarcode = null;
    } else {
      payload.barcode = null;
      payload.startBarcode = formData.startBarcode;
      payload.endBarcode = formData.endBarcode;
    }

    try {
      const response = await fetch(`${baseUrl}/battery-data/admin/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert("Battery data registered successfully!");
        setShowModal(false);
        fetchBatteries();
      } else {
        const errorText = await response.text();
        throw new Error(errorText || "Registration failed");
      }
    } catch (err) {
      console.error("Registration error:", err);
      setFormError(err.message);
    } finally {
      setRegisterLoading(false);
    }
  };

  // Merge backend batteries with local edited overrides and filter out deleted ones
  const activeBatteries = React.useMemo(() => {
    return batteries
      .filter(b => !deletedIds.includes(b.id))
      .map(b => {
        if (editedRecords[b.id]) {
          const edited = editedRecords[b.id];
          const warrantyEndDate = edited.warrantyEndDate || b.warrantyEndDate;
          const isExpired = warrantyEndDate ? new Date().toISOString().split('T')[0] > warrantyEndDate : false;
          return {
            ...b,
            ...edited,
            warrantyActive: !isExpired
          };
        }
        return b;
      });
  }, [batteries, deletedIds, editedRecords]);

  // Group batteries into series
  const groupedBatteries = React.useMemo(() => {
    return groupBatteries(activeBatteries);
  }, [activeBatteries]);

  const getCurrentWarrantyYear = (b) => {
    if (!b.warrantyStartDate || !b.warrantyEndDate) return null;
    const start = new Date(b.warrantyStartDate);
    const end = new Date(b.warrantyEndDate);
    const today = new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    if (today < start) return null; // Warranty has not started yet
    if (today > end) return null;   // Warranty has expired

    // Calculate elapsed years
    let elapsedYears = today.getFullYear() - start.getFullYear();
    const monthDiff = today.getMonth() - start.getMonth();
    const dayDiff = today.getDate() - start.getDate();
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      elapsedYears--;
    }

    const currentYear = elapsedYears + 1;
    const totalYears = getWarrantyDurationYears(b);
    if (currentYear > totalYears) {
      return null;
    }
    return currentYear;
  };

  const maxWarrantyDuration = React.useMemo(() => {
    let max = 0;
    activeBatteries.forEach(b => {
      const duration = getWarrantyDurationYears(b);
      if (duration > max) max = duration;
    });
    return max;
  }, [activeBatteries]);

  const warrantyYearOptions = React.useMemo(() => {
    const options = [];
    for (let i = 1; i <= maxWarrantyDuration; i++) {
      options.push({ value: i.toString(), label: `Year ${i}` });
    }
    return options;
  }, [maxWarrantyDuration]);

  const getBatteryCategory = (b) => {
    if (b.productCategory) return b.productCategory;
    if (b.category) return b.category;

    const details = (b.productDetails || "").toLowerCase();
    if (details.includes("solar")) {
      return "Solar Batteries";
    }
    if (details.includes("ev") || details.includes("electric vehicle") || details.includes("li-ion") || details.includes("lithium")) {
      return "EV Batteries";
    }
    if (details.includes("battery") || details.includes("pack")) {
      return "Batteries";
    }
    return "Other";
  };

  const productCategories = React.useMemo(() => {
    const categories = new Set(["Solar Batteries", "EV Batteries", "Batteries"]);
    activeBatteries.forEach(b => {
      const cat = getBatteryCategory(b);
      if (cat) {
        categories.add(cat);
      }
    });
    return Array.from(categories);
  }, [activeBatteries]);

  // Filtered batteries based on search query, warranty year, and product category
  const filteredBatteries = groupedBatteries.filter(b => {
    const matchesSearch = searchQuery === "" ||
      b.displayBarcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.originalBatteries?.some(orig => orig.barcode?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      b.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (warrantyYearFilter !== "All") {
      const targetYear = parseInt(warrantyYearFilter, 10);
      const currentYear = getCurrentWarrantyYear(b);
      if (currentYear !== targetYear) return false;
    }

    if (productCategoryFilter !== "All") {
      const cat = getBatteryCategory(b);
      if (cat !== productCategoryFilter) return false;
    }

    return true;
  });

  // Compute metrics
  const totalBatteries = activeBatteries.length;
  const activeWarranties = activeBatteries.filter(b => b.warrantyActive).length;
  const expiredWarranties = totalBatteries - activeWarranties;

  const exportToPDF = () => {
    if (filteredBatteries.length === 0) {
      alert("No data to export");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to export PDF");
      return;
    }

    const tableRowsHtml = filteredBatteries.map(b => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">${b.displayBarcode || ''}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${b.customerName || '-'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${b.productDetails || '-'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${b.invoiceNumber || '-'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${b.warrantyStartDate} to ${b.warrantyEndDate}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">
          <span style="padding: 4px 8px; border-radius: 9999px; font-size: 11px; font-weight: bold; ${b.warrantyActive ? 'background: #DEF7EC; color: #03543F;' : 'background: #FDE8E8; color: #9B1C1C;'
      }">
            ${b.warrantyActive ? 'Active' : 'Expired'}
          </span>
        </td>
      </tr>
    `).join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Battery Inventory Export</title>
          <style>
            body { font-family: 'Lexend', sans-serif; padding: 20px; color: #111827; }
            h2 { margin-bottom: 4px; font-size: 24px; }
            p { margin: 0 0 20px 0; color: #6B7280; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; }
            th { text-align: left; padding: 12px 10px; background: #F9FAFB; border-bottom: 2px solid #E5E7EB; color: #4B5563; font-size: 12px; }
            td { font-size: 13px; }
          </style>
        </head>
        <body>
          <h2>Battery Inventory Report</h2>
          <p>Generated on: ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>Barcode</th>
                <th>Customer Name</th>
                <th>Product Details</th>
                <th>Invoice Number</th>
                <th>Warranty Period</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const exportToExcel = () => {
    if (filteredBatteries.length === 0) {
      alert("No data to export");
      return;
    }

    const headers = [
      "Barcode",
      "Customer Name",
      "Product Details",
      "Invoice Number",
      "Warranty Period",
      "Status"
    ];

    const rows = filteredBatteries.map(b => [
      `"${b.displayBarcode || ''}"`,
      `"${b.customerName || '-'}"`,
      `"${b.productDetails || '-'}"`,
      `"${b.invoiceNumber || '-'}"`,
      `"${b.warrantyStartDate} to ${b.warrantyEndDate}"`,
      `"${b.warrantyActive ? 'Active' : 'Expired'}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `battery_inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="batteries-page-wrapper">
      <style>{`
        @keyframes fadeInPage {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .batteries-page-wrapper {
          animation: fadeInPage 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          width: 100%;
          min-height: 100vh;
          font-family: 'Lexend', sans-serif;
          padding: 24px;
          box-sizing: border-box;
          background: #F9FAFB;
        }
        .batteries-container {
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
        .register-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 22px;
          background: #111827;
          color: white;
          border: none;
          border-radius: 9999px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .register-btn:hover {
          background: #374151;
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(17, 24, 39, 0.15);
        }
        .register-btn:active {
          transform: translateY(0);
        }
        .maint-btn {
          padding: 10px 20px;
          background: #111;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: background 0.2s;
        }
        .maint-btn:hover {
          background: #333;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-bottom: 32px;
        }
        @media (max-width: 1024px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 640px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
        .stat-card {
          background: #ffffff;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 20px 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 110px;
          transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
          box-sizing: border-box;
        }
        .stat-card:hover {
          transform: translateY(-4px) scale(1.01);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.05);
          border-color: #27C786;
        }
        .stat-card-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .stat-icon-circle {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(39, 199, 134, 0.08);
          border: 1px solid rgba(39, 199, 134, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .stat-icon-svg {
          width: 22px;
          height: 22px;
          color: #0ca678;
        }
        .stat-info-group {
          display: flex;
          flex-direction: column;
        }
        .stat-label-text {
          font-size: 13px;
          color: #6B7280;
          font-weight: 500;
          margin: 0 0 4px 0;
        }
        .stat-value-text {
          font-size: 28px;
          font-weight: 700;
          color: #111827;
          line-height: 1.2;
          margin: 0;
        }
        .stat-sub-text {
          font-size: 11px;
          color: #0ca678;
          margin-top: 4px;
          font-weight: 500;
        }
        .stat-card-arrow {
          color: #0ca678;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.3s ease;
          margin-left: auto;
          opacity: 0.8;
        }
        .stat-card:hover .stat-card-arrow {
          transform: translateX(3px) translateY(-3px);
          opacity: 1;
        }
        .records-section {
          background: #ffffff;
          border-radius: 16px;
          padding: 24px;
          border: 1px solid #E5E7EB;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
        }
        .search-bar-wrapper {
          position: relative;
          width: 100%;
          margin-bottom: 24px;
        }
        .search-icon-left {
          position: absolute;
          left: 18px;
          top: 50%;
          transform: translateY(-50%);
          color: #27C786;
          pointer-events: none;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .search-bar-enhanced {
          width: 100%;
          padding: 12px 48px 12px 48px;
          border: 1px solid #E5E7EB;
          border-radius: 9999px;
          font-size: 14px;
          outline: none;
          font-family: inherit;
          box-sizing: border-box;
          background: #ffffff;
          transition: all 0.3s ease;
          color: #111827;
        }
        .search-bar-enhanced::placeholder {
          color: #9CA3AF;
          opacity: 1;
        }
        .search-bar-enhanced:focus {
          border-color: #27C786;
          box-shadow: 0 0 0 3px rgba(39, 199, 134, 0.15);
        }
        .search-clear-btn {
          position: absolute;
          right: 18px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #9CA3AF;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          border-radius: 50%;
          transition: all 0.2s;
        }
        .search-clear-btn:hover {
          background: #F3F4F6;
          color: #111827;
        }
        .filters-row {
          display: flex;
          gap: 16px;
          align-items: flex-end;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .filters-container {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          flex: 1;
          min-width: 280px;
        }
        @media (max-width: 640px) {
          .filters-container {
            grid-template-columns: 1fr;
          }
        }
        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .filter-label {
          font-size: 13px;
          font-weight: 600;
          color: #111827;
        }
        .filter-select-wrapper {
          position: relative;
          width: 100%;
        }
        .filter-select {
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          width: 100%;
          height: 46px;
          padding: 12px 40px 12px 16px;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
          background: #ffffff;
          font-family: inherit;
          cursor: pointer;
          box-sizing: border-box;
          transition: all 0.3s ease;
        }
        .filter-select:hover {
          border-color: #27C786;
        }
        .filter-select:focus {
          border-color: #27C786;
          box-shadow: 0 0 0 3px rgba(39, 199, 134, 0.15);
        }
        .select-caret {
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          color: #6B7280;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.3s ease;
        }
        .filter-select:focus ~ .select-caret {
          transform: translateY(-50%) rotate(180deg);
        }
        .clear-filters-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 18px;
          background: #ffffff;
          border: 1px solid #E5E7EB;
          color: #374151;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          height: 46px;
          box-sizing: border-box;
          transition: all 0.2s ease-in-out;
          white-space: nowrap;
        }
        .clear-filters-btn:hover {
          background: #F9FAFB;
          border-color: #D1D5DB;
          color: #111827;
        }
        .section-divider {
          border-top: 1px solid #E5E7EB;
          margin: 8px 0 24px 0;
        }
        .table-action-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .table-title-count {
          font-size: 14px;
          color: #4B5563;
          font-weight: 500;
        }
        .export-group {
          display: flex;
          gap: 8px;
        }
        .export-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 500;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid #E5E7EB;
          background: #ffffff;
          color: #374151;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          box-sizing: border-box;
        }
        .export-icon {
          transition: color 0.3s ease;
          flex-shrink: 0;
        }
        .pdf-icon {
          color: #EF4444;
        }
        .excel-icon {
          color: #10B981;
        }
        .export-btn:hover {
          background: #111827;
          color: #ffffff;
          border-color: #111827;
          transform: scale(1.03);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }
        .export-btn:hover .export-icon {
          color: #ffffff;
        }
        .table-wrapper {
          overflow-x: auto;
          overflow-y: auto;
          max-height: 500px;
          border-radius: 12px;
          border: 1px solid #E5E7EB;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          background: #ffffff;
        }
        .records-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }
        .records-table th {
          text-align: left;
          padding: 14px 16px;
          color: #4B5563;
          font-weight: 600;
          font-size: 13px;
          border-bottom: 1px solid #E5E7EB;
          background: #F9FAFB;
          position: sticky;
          top: 0;
          z-index: 10;
          box-shadow: inset 0 -1px 0 #E5E7EB;
        }
        .records-table tr {
          cursor: pointer;
        }
        .records-table tr td {
          transition: background-color 0.3s ease;
        }
        .records-table tr:nth-child(odd) td {
          background-color: #ffffff;
        }
        .records-table tr:nth-child(even) td {
          background-color: #F9FAFB;
        }
        .records-table tr td:first-child {
          border-left: 3px solid transparent;
          transition: border-left-color 0.3s ease, background-color 0.3s ease;
        }
        .records-table tr:hover td {
          background-color: #F0FDF4 !important;
        }
        .records-table tr:hover td:first-child {
          border-left-color: #27C786;
        }
        .records-table td {
          padding: 16px;
          font-size: 14px;
          color: #111827;
          border-bottom: 1px solid #E5E7EB;
        }
        .records-table tr:last-child td {
          border-bottom: none;
        }
        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 500;
        } 
        .status-active {
          background: #DEF7EC;
          color: #03543F;
        }
        .status-expired {
          background: #FDE8E8;
          color: #9B1C1C;
        }
        .kebab-menu-container {
          position: relative;
          display: inline-block;
        }
        .kebab-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid #E5E7EB;
          background: #ffffff;
          color: #4B5563;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .kebab-btn:hover {
          background: #F3F4F6;
          color: #111827;
          border-color: #D1D5DB;
        }
        .kebab-dropdown {
          position: absolute;
          right: 0;
          top: 100%;
          margin-top: 4px;
          background: #ffffff;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          z-index: 50;
          min-width: 160px;
          display: flex;
          flex-direction: column;
          padding: 4px;
        }
        .kebab-dropdown button {
          background: none;
          border: none;
          text-align: left;
          padding: 8px 12px;
          font-size: 13px;
          color: #374151;
          cursor: pointer;
          border-radius: 6px;
          transition: background 0.15s;
          font-family: inherit;
          width: 100%;
          box-sizing: border-box;
        }
        .kebab-dropdown button:hover {
          background: #F3F4F6;
          color: #111827;
        }
        .kebab-dropdown button.delete-item {
          color: #EF4444;
        }
        .kebab-dropdown button.delete-item:hover {
          background: #FEE2E2;
          color: #DC2626;
        }
        .empty-state-container {
          text-align: center;
          padding: 60px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #ffffff;
        }
        .empty-state-icon {
          margin-bottom: 16px;
          background: #F3F4F6;
          padding: 16px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #9CA3AF;
        }
        .empty-state-title {
          font-size: 18px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 6px 0;
        }
        .empty-state-subtitle {
          font-size: 14px;
          color: #6B7280;
          margin: 0 0 16px 0;
        }
        .skeleton-line {
          background: #E5E7EB;
          border-radius: 4px;
          height: 16px;
          width: 100%;
        }
        .skeleton-shimmer {
          background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
          background-size: 200% 100%;
          animation: skeleton-shimmer-animation 1.5s infinite linear;
        }
        @keyframes skeleton-shimmer-animation {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: #fff;
          padding: 32px;
          border-radius: 20px;
          width: 600px;
          max-width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        }
        .modal-tabs {
          display: flex;
          border-bottom: 1px solid #eee;
          margin-bottom: 24px;
        }
        .modal-tab {
          flex: 1;
          text-align: center;
          padding: 12px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          color: #666;
          border-bottom: 2px solid transparent;
        }
        .modal-tab.active {
          color: #111;
          border-bottom-color: #111;
        }
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .form-group {
          margin-bottom: 16px;
        }
        .form-group.full-width {
          grid-column: span 2;
        }
        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-size: 13px;
          color: #444;
          font-weight: 500;
        }
        .form-group input,
        .form-group select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 8px;
          outline: none;
          font-size: 14px;
          box-sizing: border-box;
          font-family: inherit;
          background: #fff;
        }
        .form-group input:focus,
        .form-group select:focus {
          border-color: #111;
        }
        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
        }
        .action-btn {
          padding: 10px 20px;
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          font-family: inherit;
        }
        .action-btn:hover {
          background: #f5f5f5;
        }
      `}</style>

      <div className="batteries-container">
        <div className="header-row">
          <div className="header-left">
            <h2>Battery Inventory</h2>
          </div>
          <button className="register-btn" onClick={handleOpenModal}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Register Battery
          </button>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card-left">
              <div className="stat-icon-circle">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="stat-icon-svg">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </div>
              <div className="stat-info-group">
                <span className="stat-label-text">Total Inventory</span>
                <span className="stat-value-text"><AnimatedNumber value={totalBatteries} /></span>
                <span className="stat-sub-text">Text goes here</span>
              </div>
            </div>
            <div className="stat-card-arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <polyline points="7 7 17 7 17 17"></polyline>
              </svg>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-left">
              <div className="stat-icon-circle">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="stat-icon-svg">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </div>
              <div className="stat-info-group">
                <span className="stat-label-text">Active Warranty</span>
                <span className="stat-value-text"><AnimatedNumber value={activeWarranties} /></span>
                <span className="stat-sub-text">Text goes here</span>
              </div>
            </div>
            <div className="stat-card-arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <polyline points="7 7 17 7 17 17"></polyline>
              </svg>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-left">
              <div className="stat-icon-circle">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="stat-icon-svg">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </div>
              <div className="stat-info-group">
                <span className="stat-label-text">Expired Warranty</span>
                <span className="stat-value-text"><AnimatedNumber value={expiredWarranties} /></span>
                <span className="stat-sub-text">Text goes here</span>
              </div>
            </div>
            <div className="stat-card-arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <polyline points="7 7 17 7 17 17"></polyline>
              </svg>
            </div>
          </div>
        </div>

        <div className="records-section">
          <div className="search-bar-wrapper">
            <div className="search-icon-left">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search Serial Number, Customer Name, Invoice, Barcode"
              className="search-bar-enhanced"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button type="button" className="search-clear-btn" onClick={() => setSearchQuery("")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}
          </div>

          <div className="filters-row">
            <div className="filters-container">
              <div className="filter-group">
                <label className="filter-label">Battery Registered From</label>
                <div className="filter-select-wrapper">
                  <select
                    className="filter-select"
                    value={warrantyYearFilter}
                    onChange={(e) => setWarrantyYearFilter(e.target.value)}
                  >
                    <option value="All">All Warranty Years</option>
                    {warrantyYearOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <div className="select-caret">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                </div>
              </div>

              <div className="filter-group">
                <label className="filter-label">Product Category</label>
                <div className="filter-select-wrapper">
                  <select
                    className="filter-select"
                    value={productCategoryFilter}
                    onChange={(e) => setProductCategoryFilter(e.target.value)}
                  >
                    <option value="All">All Product Categories</option>
                    {productCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <div className="select-caret">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {(warrantyYearFilter !== "All" || productCategoryFilter !== "All" || searchQuery !== "") && (
              <button
                type="button"
                className="clear-filters-btn"
                onClick={() => {
                  setWarrantyYearFilter("All");
                  setProductCategoryFilter("All");
                  setSearchQuery("");
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                  <path d="M21 3v5h-5"></path>
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                  <path d="M3 21v-5h5"></path>
                </svg>
                Clear Filters
              </button>
            )}
          </div>

          <div className="section-divider"></div>

          <div className="table-action-header">
            <span className="table-title-count">{filteredBatteries.length} Records Found</span>
            <div className="export-group">
              <button type="button" className="export-btn" onClick={exportToPDF}>
                <svg className="export-icon pdf-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                Export PDF
              </button>
              <button type="button" className="export-btn" onClick={exportToExcel}>
                <svg className="export-icon excel-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="9" y1="3" x2="9" y2="21"></line>
                  <line x1="15" y1="3" x2="15" y2="21"></line>
                  <line x1="3" y1="9" x2="21" y2="9"></line>
                  <line x1="3" y1="15" x2="21" y2="15"></line>
                </svg>
                Export Excel
              </button>
            </div>
          </div>

          {loading ? (
            <div className="table-wrapper">
              <table className="records-table">
                <thead>
                  <tr>
                    <th>Serial Number</th>
                    <th>Customer Name</th>
                    <th>Product Details</th>
                    <th>Invoice Number</th>
                    <th>Barcode</th>
                    <th>Warranty Period</th>
                    <th>Status</th>
                    <th style={{ width: '60px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map((idx) => (
                    <tr key={idx}>
                      <td><div className="skeleton-line skeleton-shimmer" style={{ width: '80px', height: '16px' }}></div></td>
                      <td><div className="skeleton-line skeleton-shimmer" style={{ width: '110px', height: '16px' }}></div></td>
                      <td><div className="skeleton-line skeleton-shimmer" style={{ width: '140px', height: '16px' }}></div></td>
                      <td><div className="skeleton-line skeleton-shimmer" style={{ width: '90px', height: '16px' }}></div></td>
                      <td><div className="skeleton-line skeleton-shimmer" style={{ width: '90px', height: '16px' }}></div></td>
                      <td><div className="skeleton-line skeleton-shimmer" style={{ width: '130px', height: '16px' }}></div></td>
                      <td><div className="skeleton-line skeleton-shimmer" style={{ width: '70px', height: '22px', borderRadius: '9999px' }}></div></td>
                      <td><div className="skeleton-line skeleton-shimmer" style={{ width: '28px', height: '28px', borderRadius: '50%' }}></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : error ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#ef4444' }}>
              <div>{error}</div>
              <button className="maint-btn" onClick={fetchBatteries} style={{ marginTop: 12 }}>Retry</button>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="records-table">
                <thead>
                  <tr>
                    <th>Barcode</th>
                    <th>Customer Name</th>
                    <th>Product Details</th>
                    <th>Invoice Number</th>
                    <th>Warranty Period</th>
                    <th>Status</th>
                    <th style={{ width: '60px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBatteries.length > 0 ? (
                    filteredBatteries.map((b) => (
                      <tr key={b.id}>
                        <td style={{ fontWeight: 600 }}>{b.displayBarcode}</td>
                        <td>{b.customerName || "-"}</td>
                        <td>{b.productDetails || "-"}</td>
                        <td>{b.invoiceNumber || "-"}</td>
                        <td style={{ fontSize: 13, color: "#666" }}>
                          {b.warrantyStartDate} to {b.warrantyEndDate}
                        </td>
                        <td>
                          <span className={`status-badge ${b.warrantyActive ? "status-active" : "status-expired"}`}>
                            {b.warrantyActive ? "Active" : "Expired"}
                          </span>
                        </td>
                        <td>
                          <div className="kebab-menu-container">
                            <button
                              type="button"
                              className="kebab-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(prev => prev === b.id ? null : b.id);
                              }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="1.5"></circle>
                                <circle cx="12" cy="5" r="1.5"></circle>
                                <circle cx="12" cy="19" r="1.5"></circle>
                              </svg>
                            </button>
                            {activeMenuId === b.id && (
                              <div className="kebab-dropdown" onClick={(e) => e.stopPropagation()}>
                                <button type="button" onClick={() => { setViewDetailsTarget(b); setActiveMenuId(null); }}>
                                  View Details
                                </button>
                                <button type="button" onClick={() => { handleOpenEdit(b); setActiveMenuId(null); }}>
                                  Edit
                                </button>
                                <button type="button" onClick={() => { handleOpenEdit(b); setActiveMenuId(null); }}>
                                  Renew Warranty
                                </button>
                                <button type="button" onClick={() => { alert(`Downloading invoice for customer ${b.customerName || 'Battery'}...`); setActiveMenuId(null); }}>
                                  Download Invoice
                                </button>
                                <button type="button" className="delete-item" onClick={() => { setDeleteTarget(b); setActiveMenuId(null); }}>
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} style={{ padding: 0 }}>
                        <div className="empty-state-container">
                          <div className="empty-state-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="11" cy="11" r="8"></circle>
                              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                          </div>
                          <h3 className="empty-state-title">No Batteries Found</h3>
                          <p className="empty-state-subtitle">Try changing filters or add a new battery.</p>
                          <button type="button" className="register-btn" style={{ margin: '8px auto 0 auto' }} onClick={handleOpenModal}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="12" y1="5" x2="12" y2="19"></line>
                              <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            Add Battery
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {viewDetailsTarget && (
        <div className="modal-overlay" onClick={() => setViewDetailsTarget(null)}>
          <div className="modal-content" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 20, color: "#111827" }}>Battery Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', paddingBottom: '8px' }}>
                <span style={{ color: '#6B7280', fontSize: '13px' }}>Barcode</span>
                <span style={{ fontWeight: 600, color: '#111827', fontSize: '13px' }}>{viewDetailsTarget.displayBarcode}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', paddingBottom: '8px' }}>
                <span style={{ color: '#6B7280', fontSize: '13px' }}>Customer Name</span>
                <span style={{ fontWeight: 500, color: '#111827', fontSize: '13px' }}>{viewDetailsTarget.customerName || "-"}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', paddingBottom: '8px' }}>
                <span style={{ color: '#6B7280', fontSize: '13px' }}>Product Details</span>
                <span style={{ fontWeight: 500, color: '#111827', fontSize: '13px' }}>{viewDetailsTarget.productDetails || "-"}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', paddingBottom: '8px' }}>
                <span style={{ color: '#6B7280', fontSize: '13px' }}>Invoice Number</span>
                <span style={{ fontWeight: 500, color: '#111827', fontSize: '13px' }}>{viewDetailsTarget.invoiceNumber || "-"}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', paddingBottom: '8px' }}>
                <span style={{ color: '#6B7280', fontSize: '13px' }}>Warranty Period</span>
                <span style={{ fontWeight: 500, color: '#111827', fontSize: '13px' }}>{viewDetailsTarget.warrantyStartDate} to {viewDetailsTarget.warrantyEndDate}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', paddingBottom: '8px', alignItems: 'center' }}>
                <span style={{ color: '#6B7280', fontSize: '13px' }}>Status</span>
                <span className={`status-badge ${viewDetailsTarget.warrantyActive ? "status-active" : "status-expired"}`}>
                  {viewDetailsTarget.warrantyActive ? "Active" : "Expired"}
                </span>
              </div>
            </div>
            <div className="form-actions" style={{ marginTop: 24 }}>
              <button type="button" className="action-btn" onClick={() => setViewDetailsTarget(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ margin: "0 0 4px 0", fontSize: 20 }}>Register Batteries</h3>
            <p style={{ margin: "0 0 20px 0", fontSize: 13, color: "#666" }}>
              Add a single battery or automatically expand a numeric series of serials
            </p>

            <div className="modal-tabs">
              <div
                className={`modal-tab ${registerMode === "single" ? "active" : ""}`}
                onClick={() => { setRegisterMode("single"); setFormError(null); }}
              >
                Single Battery
              </div>
              <div
                className={`modal-tab ${registerMode === "series" ? "active" : ""}`}
                onClick={() => { setRegisterMode("series"); setFormError(null); }}
              >
                Bulk Registration
              </div>
            </div>

            {formError && (
              <div style={{ background: "#fff5f5", color: "#f03e3e", padding: 12, borderRadius: 8, fontSize: 13, border: "1px solid #ffe3e3", marginBottom: 16 }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Customer Name</label>
                  <input
                    type="text"
                    name="customerName"
                    value={formData.customerName}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Invoice Number</label>
                  <input
                    type="text"
                    name="invoiceNumber"
                    value={formData.invoiceNumber}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div className="form-group full-width">
                  <label>Product</label>
                  <select
                    name="selectedMadeProduct"
                    value={formData.selectedMadeProduct || ""}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="" disabled>Select Made Product</option>
                    <option value="Solar Batteries">Solar Batteries</option>
                    <option value="EV Batteries">EV Batteries</option>
                    <option value="Batteries">Batteries</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {formData.selectedMadeProduct === "Other" && (
                  <div className="form-group full-width">
                    <label>Battery Name</label>
                    <input
                      type="text"
                      name="customMadeProduct"
                      placeholder="Enter battery name"
                      value={formData.customMadeProduct}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                )}

                <div className="form-group full-width">
                  <label>Product Description</label>
                  <input
                    type="text"
                    name="productDetails"
                    placeholder="e.g. EV Li-Ion Battery Pack 60V 30Ah"
                    value={formData.productDetails}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                {registerMode === "single" ? (
                  <div className="form-group">
                    <label>Barcode</label>
                    <input
                      type="text"
                      name="barcode"
                      placeholder="e.g. BAT001"
                      value={formData.barcode}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                ) : (
                  <>
                    <div className="form-group">
                      <label>Start Barcode</label>
                      <input
                        type="text"
                        name="startBarcode"
                        placeholder="e.g. BAT001"
                        value={formData.startBarcode}
                        onChange={handleFormChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>End Barcode</label>
                      <input
                        type="text"
                        name="endBarcode"
                        placeholder="e.g. BAT005"
                        value={formData.endBarcode}
                        onChange={handleFormChange}
                        required
                      />
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label>Warranty Start Date</label>
                  <input
                    type="date"
                    name="warrantyStartDate"
                    value={formData.warrantyStartDate}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Warranty Duration (Years)</label>
                  <input
                    type="number"
                    name="warrantyYears"
                    min="1"
                    placeholder="e.g. 1, 2, 3"
                    value={formData.warrantyYears}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Warranty End Date</label>
                  <input
                    type="date"
                    name="warrantyEndDate"
                    value={formData.warrantyEndDate}
                    readOnly
                    required
                    style={{ background: "#f5f5f5", cursor: "not-allowed" }}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="action-btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="maint-btn" disabled={registerLoading}>
                  {registerLoading ? "Registering..." : "Register"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editTarget && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ margin: "0 0 4px 0", fontSize: 20 }}>
              {editTarget.originalBatteries?.length > 1 ? "Edit Battery Series" : "Edit Battery"}
            </h3>
            <p style={{ margin: "0 0 20px 0", fontSize: 13, color: "#666" }}>
              Update details for this battery record.
            </p>

            <form onSubmit={handleEditSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Customer Name</label>
                  <input
                    type="text"
                    value={editFormData.customerName}
                    onChange={(e) => setEditFormData({ ...editFormData, customerName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Invoice Number</label>
                  <input
                    type="text"
                    value={editFormData.invoiceNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, invoiceNumber: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group full-width">
                  <label>Product Description</label>
                  <input
                    type="text"
                    value={editFormData.productDetails}
                    onChange={(e) => setEditFormData({ ...editFormData, productDetails: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Barcode</label>
                  <input
                    type="text"
                    value={editFormData.barcode}
                    onChange={(e) => setEditFormData({ ...editFormData, barcode: e.target.value })}
                    required
                  />
                </div>



                <div className="form-group">
                  <label>Warranty Start Date</label>
                  <input
                    type="date"
                    value={editFormData.warrantyStartDate}
                    onChange={(e) => handleEditFormChange("warrantyStartDate", e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Warranty Duration (Years)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 1, 2, 3"
                    value={editFormData.warrantyYears}
                    onChange={(e) => handleEditFormChange("warrantyYears", e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Warranty End Date</label>
                  <input
                    type="date"
                    value={editFormData.warrantyEndDate}
                    readOnly
                    required
                    style={{ background: "#f5f5f5", cursor: "not-allowed" }}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="action-btn" onClick={() => setEditTarget(null)}>Cancel</button>
                <button type="submit" className="maint-btn">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 400 }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: 18 }}>Delete Battery Record?</h3>
            <p style={{ margin: "0 0 20px 0", fontSize: 14, color: "#666" }}>
              Are you sure you want to delete {deleteTarget.originalBatteries?.length > 1 ? "this battery series" : "this battery record"}? This action cannot be undone on the client side.
            </p>
            <div className="form-actions" style={{ marginTop: 20 }}>
              <button type="button" className="action-btn" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button
                type="button"
                className="maint-btn"
                style={{ background: "#dc2626" }}
                onClick={() => {
                  const newDeleted = [...deletedIds, ...deleteTarget.originalBatteries.map(orig => orig.id)];
                  setDeletedIds(newDeleted);
                  localStorage.setItem("battery_inventory_deleted_ids", JSON.stringify(newDeleted));
                  setDeleteTarget(null);
                  alert("Battery records deleted successfully!");
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function groupBatteries(batteryList) {
  if (!Array.isArray(batteryList) || batteryList.length === 0) {
    return [];
  }

  // 1. Group by identical non-serial fields
  const groups = {};
  batteryList.forEach(battery => {
    const key = [
      battery.customerName || "",
      battery.productDetails || "",
      battery.invoiceNumber || "",
      battery.warrantyStartDate || "",
      battery.warrantyEndDate || "",
      battery.warrantyActive ? "active" : "expired"
    ].join("||");

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(battery);
  });

  const groupedList = [];

  // Helper to extract prefix and suffix
  const parseSerial = (serial) => {
    if (!serial) return null;
    const match = serial.match(/^([a-zA-Z_-]*)(0*)(\d+)$/);
    if (!match) return null;
    return {
      prefix: match[1],
      padding: match[2],
      num: parseInt(match[3], 10),
      numStr: match[3],
      original: serial
    };
  };

  // Helper to create a grouped row
  const createGroupRow = (chunk) => {
    const first = chunk[0];
    const last = chunk[chunk.length - 1];
    const originalBatteries = chunk.map(c => c.battery);

    let displayBarcode = first.original;
    if (chunk.length > 1) {
      displayBarcode = `${first.original} to ${last.original}`;
    }

    return {
      ...first.battery,
      displayBarcode,
      originalBatteries
    };
  };

  // 2. Process each group to find continuous ranges
  Object.values(groups).forEach(members => {
    const parsable = [];
    const unparsable = [];

    members.forEach(b => {
      const parsed = parseSerial(b.barcode);
      if (parsed) {
        parsable.push({ battery: b, ...parsed });
      } else {
        unparsable.push(b);
      }
    });

    unparsable.forEach(b => {
      groupedList.push({
        ...b,
        displayBarcode: b.barcode || "-",
        originalBatteries: [b]
      });
    });

    const subGroups = {};
    parsable.forEach(p => {
      const totalLen = p.padding.length + p.numStr.length;
      const subKey = `${p.prefix}||${totalLen}`;
      if (!subGroups[subKey]) {
        subGroups[subKey] = [];
      }
      subGroups[subKey].push(p);
    });

    Object.values(subGroups).forEach(subGroup => {
      subGroup.sort((a, b) => a.num - b.num);

      let chunk = [];
      for (let i = 0; i < subGroup.length; i++) {
        const item = subGroup[i];
        if (chunk.length === 0) {
          chunk.push(item);
        } else {
          const lastItem = chunk[chunk.length - 1];
          if (item.num === lastItem.num + 1) {
            chunk.push(item);
          } else {
            groupedList.push(createGroupRow(chunk));
            chunk = [item];
          }
        }
      }
      if (chunk.length > 0) {
        groupedList.push(createGroupRow(chunk));
      }
    });
  });

  return groupedList;
}

function AnimatedNumber({ value }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const duration = 1000;
    const target = parseInt(value, 10);
    if (isNaN(target) || target <= 0) {
      setDisplayValue(value);
      return;
    }

    let animationFrameId;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = progress * (2 - progress);
      setDisplayValue(Math.floor(easeProgress * target));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      }
    };
    animationFrameId = requestAnimationFrame(step);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [value]);

  return <span>{displayValue}</span>;
}
