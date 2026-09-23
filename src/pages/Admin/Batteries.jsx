import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { batteryService } from "../../services/batteryService";
import { productService } from "../../services/productService";
import { pageCache } from "../../utils/pageCache";
import { getExportWatermark, getPdfWatermarkHtml, getExportMetadataHeader } from "../../utils/watermark";
import { Toast } from "../../components/common/Toast";
import { extractRoleFromToken } from "../../utils/jwtUtils";

export default function BatteriesPage({ baseUrl: propBaseUrl }) {
  const navigate = useNavigate();
  const baseUrl = propBaseUrl || import.meta.env.VITE_API_URL;

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
  const calculateExpiryAndTotal = (startDateStr, fullY, fullM, servY, servM) => {
    const fy = parseInt(fullY, 10) || 0;
    const fm = parseInt(fullM, 10) || 0;
    const sy = parseInt(servY, 10) || 0;
    const sm = parseInt(servM, 10) || 0;

    const totalYRaw = fy + sy;
    const totalMRaw = fm + sm;

    const extraYears = Math.floor(totalMRaw / 12);
    const totalYears = totalYRaw + extraYears;
    const totalMonths = totalMRaw % 12;

    let totalWarrantyLabel = "";
    if (totalYears > 0 && totalMonths > 0) {
      totalWarrantyLabel = `${totalYears} Year${totalYears > 1 ? "s" : ""} ${totalMonths} Month${totalMonths > 1 ? "s" : ""}`;
    } else if (totalYears > 0) {
      totalWarrantyLabel = `${totalYears} Year${totalYears > 1 ? "s" : ""}`;
    } else if (totalMonths > 0) {
      totalWarrantyLabel = `${totalMonths} Month${totalMonths > 1 ? "s" : ""}`;
    } else {
      totalWarrantyLabel = "0 Years";
    }

    let expiryDateStr = "";
    if (startDateStr) {
      const start = new Date(startDateStr);
      if (!isNaN(start.getTime())) {
        const end = new Date(start);
        end.setFullYear(start.getFullYear() + totalYears);
        end.setMonth(start.getMonth() + totalMonths);
        end.setDate(end.getDate() - 1);

        const yyyy = end.getFullYear();
        const mm = String(end.getMonth() + 1).padStart(2, '0');
        const dd = String(end.getDate()).padStart(2, '0');
        expiryDateStr = `${yyyy}-${mm}-${dd}`;
      }
    }

    return { totalWarrantyLabel, expiryDateStr, totalYearsDecimal: totalYears + (totalMonths / 12) };
  };

  const parseWarrantyPeriod = (startDateStr, endDateStr) => {
    if (!startDateStr || !endDateStr) return { years: 1, months: 0 };
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return { years: 1, months: 0 };

    const targetEnd = new Date(end);
    targetEnd.setDate(end.getDate() + 1);

    let years = targetEnd.getFullYear() - start.getFullYear();
    let months = targetEnd.getMonth() - start.getMonth();

    if (months < 0) {
      years -= 1;
      months += 12;
    }

    return {
      years: Math.max(0, years),
      months: Math.max(0, months)
    };
  };

  const userRole = useMemo(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const roleFromToken = extractRoleFromToken(token);
      if (roleFromToken) return roleFromToken;
    }
    return (localStorage.getItem("userRole") || "").toUpperCase().trim();
  }, []);

  const isAuthorizedAdmin = useMemo(() => {
    const r = userRole.toUpperCase();
    return ["ADMIN", "SUPER_ADMIN", "ADMINISTRATOR", "SCM_ADMIN", "ROLE_ADMIN", "ROLE_SUPER_ADMIN"].some(role => r.includes(role)) || r.includes("ADMIN");
  }, [userRole]);

  const [toast, setToast] = useState(null);

  const initialCachedBatteries = useMemo(() => pageCache.get("batteries") || [], []);
  const [batteries, setBatteries] = useState(initialCachedBatteries);
  const [loading, setLoading] = useState(initialCachedBatteries.length === 0);
  const [error, setError] = useState(null);

  // Warranty Status Activation / Deactivation Modal State
  const [warrantyStatusModal, setWarrantyStatusModal] = useState({
    isOpen: false,
    battery: null,
    warrantyType: "full", // "full" or "service"
    actionType: "deactivate", // "activate" or "deactivate"
    reason: "",
    submitting: false,
    error: null
  });

  const openWarrantyStatusModal = useCallback((battery, warrantyType, actionType) => {
    const normalizedWarrantyType = String(warrantyType || "full").toLowerCase();
    const normalizedActionType = String(actionType || "deactivate").toLowerCase();
    setWarrantyStatusModal({
      isOpen: true,
      battery,
      warrantyType: normalizedWarrantyType,
      actionType: normalizedActionType,
      reason: "",
      submitting: false,
      error: null
    });
  }, []);

  // --- Excel Bulk Upload state ---
  const excelFileInputRef = useRef(null);
  const [excelUploading, setExcelUploading] = useState(false);
  const [excelUploadResult, setExcelUploadResult] = useState(null); // null | { success, data, error }
  const [excelFileError, setExcelFileError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [warrantyYearFilter, setWarrantyYearFilter] = useState("All");
  const [productCategoryFilter, setProductCategoryFilter] = useState("All");
  const [selectedYear, setSelectedYear] = useState("All");
  const [selectedMonth, setSelectedMonth] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");
  const [showModal, setShowModal] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  const createDefaultProductItem = useCallback((defaultStartDate = "") => {
    const today = defaultStartDate || new Date().toISOString().split("T")[0];
    const { expiryDateStr, totalYearsDecimal } = calculateExpiryAndTotal(today, "1", "0", "0", "0");
    return {
      id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      catalogProductId: "",
      selectedMadeProduct: "EV Battery",
      customMadeProduct: "",
      voltage: "",
      capacity: "",
      chemistry: "NMC",
      quantity: 1,
      mode: "single", // "single" or "series"
      barcode: "",
      startBarcode: "",
      endBarcode: "",
      warrantyStartDate: today,
      fullWarrantyYears: "1",
      fullWarrantyMonths: "0",
      serviceWarrantyYears: "0",
      serviceWarrantyMonths: "0",
      warrantyEndDate: expiryDateStr,
      warrantyYears: totalYearsDecimal.toString(),
      isExpanded: true
    };
  }, []);

  const [formData, setFormData] = useState({
    customerName: "",
    invoiceNumber: "",
    products: []
  });

  const [deletedIds, setDeletedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("battery_inventory_deleted_ids") || "[]");
    } catch {
      return [];
    }
  });

  const [deletedBarcodes, setDeletedBarcodes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("battery_inventory_deleted_barcodes") || "[]");
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
    voltage: "",
    capacity: "",
    chemistry: "NMC",
    invoiceNumber: "",
    barcode: "",
    warrantyStartDate: "",
    warrantyEndDate: "",
    warrantyYears: "",
    fullWarrantyYears: "0",
    fullWarrantyMonths: "0",
    serviceWarrantyYears: "0",
    serviceWarrantyMonths: "0",
  });

  const handleOpenEdit = (b) => {
    setEditTarget(b);
    const duration = getWarrantyDurationYears(b);
    const parsed = parseWarrantyPeriod(b.warrantyStartDate, b.warrantyEndDate);
    const existingDetails = b.productDetails || "";
    const vMatch = existingDetails.match(/(\d+(?:\.\d+)?)V/);
    const ahMatch = existingDetails.match(/(\d+(?:\.\d+)?)Ah/);
    const chemMatch = existingDetails.match(/Chemistry\s*=\s*(\S+)/);
    const knownChemistry = ["NMC", "LiFePO4"];
    const parsedChem = chemMatch ? chemMatch[1] : "";
    setEditFormData({
      customerName: b.customerName || "",
      productDetails: b.productDetails || "",
      voltage: vMatch ? vMatch[1] : "",
      capacity: ahMatch ? ahMatch[1] : "",
      chemistry: knownChemistry.includes(parsedChem) ? parsedChem : "NMC",
      invoiceNumber: b.invoiceNumber || "",
      barcode: b.barcode || "",
      warrantyStartDate: b.warrantyStartDate || "",
      warrantyEndDate: b.warrantyEndDate || "",
      warrantyYears: duration > 0 ? duration.toString() : "1",
      fullWarrantyYears: parsed.years.toString(),
      fullWarrantyMonths: parsed.months.toString(),
      serviceWarrantyYears: "0",
      serviceWarrantyMonths: "0",
    });
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    const newEdited = { ...editedRecords };
    editTarget.originalBatteries.forEach(orig => {
      const builtDetails = editFormData.voltage || editFormData.capacity
        ? `${editFormData.voltage}V ${editFormData.capacity}Ah Chemistry = ${editFormData.chemistry}`
        : editFormData.productDetails;
      newEdited[orig.id] = {
        customerName: editFormData.customerName,
        productDetails: builtDetails,
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

  const fetchBatteries = useCallback(async () => {
    if (batteries.length === 0) setLoading(true);
    setError(null);
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }
    try {
      const data = await batteryService.getAllBatteries();
      const normalized = Array.isArray(data) ? data : [];

      const scmBatteries = JSON.parse(localStorage.getItem("battery_inventory_scm_sync") || "[]");
      const existingKeys = new Set(normalized.map(b => String(b.barcode || b.startBarcode || b.id)));

      const additionalScmBatteries = [];
      scmBatteries.forEach(scmb => {
        const key = String(scmb.barcode || scmb.startBarcode || scmb.id);
        if (key && !existingKeys.has(key)) {
          additionalScmBatteries.push(scmb);
          existingKeys.add(key);
        }
      });

      const combined = [...normalized, ...additionalScmBatteries];
      setBatteries(combined);
      pageCache.set("batteries", combined);
    } catch (err) {
      console.error("[BATTERY PIPELINE] ERROR in fetchBatteries:", err);
      const scmBatteries = JSON.parse(localStorage.getItem("battery_inventory_scm_sync") || "[]");
      if (scmBatteries.length > 0) {
        setBatteries(scmBatteries);
      } else {
        setError(err.message || "Failed to load batteries list");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchBatteries();

    const handleDocumentClick = () => {
      setActiveMenuId(null);
    };
    document.addEventListener("click", handleDocumentClick);
    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, [fetchBatteries]);

  const fetchCatalogProducts = useCallback(async () => {
    try {
      setLoadingCatalog(true);
      const data = await productService.getActiveProducts();
      setCatalogProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("Could not fetch active products:", err);
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalogProducts();
  }, [fetchCatalogProducts]);

  const handleOpenModal = () => {
    setFormError(null);
    setFormData({
      customerName: "",
      invoiceNumber: "",
      products: [createDefaultProductItem()]
    });
    setShowModal(true);
    fetchCatalogProducts();
  };

  const handleCustomerInfoChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddProduct = () => {
    setFormData(prev => {
      const lastItem = prev.products[prev.products.length - 1];
      const defaultStartDate = lastItem?.warrantyStartDate || "";
      return {
        ...prev,
        products: [...prev.products, createDefaultProductItem(defaultStartDate)]
      };
    });
  };

  const handleRemoveProduct = (index) => {
    setFormData(prev => {
      if (prev.products.length <= 1) return prev;
      return {
        ...prev,
        products: prev.products.filter((_, idx) => idx !== index)
      };
    });
  };

  const handleToggleExpandProduct = (index) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.map((p, idx) =>
        idx === index ? { ...p, isExpanded: !p.isExpanded } : p
      )
    }));
  };

  const handleCatalogProductSelect = (index, catalogProductId) => {
    setFormData(prev => {
      const newProducts = [...prev.products];
      const item = { ...newProducts[index] };

      if (!catalogProductId) {
        item.catalogProductId = "";
        newProducts[index] = item;
        return { ...prev, products: newProducts };
      }

      const found = catalogProducts.find(p => String(p.id) === String(catalogProductId));
      if (found) {
        item.catalogProductId = String(found.id);

        const prodName = found.name || found.productName || found.title || "";
        const prodCat = found.category || found.type || "";
        const standardCats = [
          "Solar Battery", "EV Battery", "Inverter Battery", 
          "Robotics Battery", "Defence Battery", "Medical Battery", 
          "Spray Pump Battery", "Strip Pump Battery"
        ];
        const matchedCat = standardCats.find(c =>
          prodCat.toLowerCase().includes(c.toLowerCase()) ||
          prodName.toLowerCase().includes(c.toLowerCase())
        );

        if (matchedCat) {
          item.selectedMadeProduct = matchedCat === "Strip Pump Battery" ? "Strip Pump Battery" : matchedCat;
          item.customMadeProduct = "";
        } else if (prodName) {
          item.selectedMadeProduct = "Other";
          item.customMadeProduct = prodName;
        }

        let v = found.voltage !== undefined && found.voltage !== null ? String(found.voltage) : "";
        if (!v && prodName) {
          const vMatch = prodName.match(/(\d+(?:\.\d+)?)\s*V/i) || (found.description || "").match(/(\d+(?:\.\d+)?)\s*V/i);
          if (vMatch) v = vMatch[1];
        }
        if (v) item.voltage = v;

        let cap = found.capacity || found.capacityAh || found.ah || "";
        if (!cap && prodName) {
          const ahMatch = prodName.match(/(\d+(?:\.\d+)?)\s*Ah/i) || (found.description || "").match(/(\d+(?:\.\d+)?)\s*Ah/i);
          if (ahMatch) cap = ahMatch[1];
        }
        if (cap) item.capacity = String(cap);

        let chem = found.chemistry || found.chem || "";
        if (!chem && (prodName || found.description)) {
          const text = `${prodName} ${found.description || ""}`;
          if (/LiFePO4/i.test(text)) chem = "LiFePO4";
          else if (/NMC/i.test(text)) chem = "NMC";
        }
        if (chem) item.chemistry = chem === "LiFePO4" ? "LiFePO4" : "NMC";

        if (found.fullWarrantyYears !== undefined && found.fullWarrantyYears !== null) {
          item.fullWarrantyYears = String(found.fullWarrantyYears);
        } else if (found.warrantyYears !== undefined && found.warrantyYears !== null) {
          item.fullWarrantyYears = String(found.warrantyYears);
        }

        if (found.fullWarrantyMonths !== undefined && found.fullWarrantyMonths !== null) {
          item.fullWarrantyMonths = String(found.fullWarrantyMonths);
        }

        if (found.serviceWarrantyYears !== undefined && found.serviceWarrantyYears !== null) {
          item.serviceWarrantyYears = String(found.serviceWarrantyYears);
        }

        if (found.serviceWarrantyMonths !== undefined && found.serviceWarrantyMonths !== null) {
          item.serviceWarrantyMonths = String(found.serviceWarrantyMonths);
        }

        const { expiryDateStr, totalYearsDecimal } = calculateExpiryAndTotal(
          item.warrantyStartDate,
          item.fullWarrantyYears,
          item.fullWarrantyMonths,
          item.serviceWarrantyYears,
          item.serviceWarrantyMonths
        );
        item.warrantyEndDate = expiryDateStr;
        item.warrantyYears = totalYearsDecimal.toString();
      }

      newProducts[index] = item;
      return { ...prev, products: newProducts };
    });
  };

  const handleProductItemChange = (index, field, value) => {
    setFormData(prev => {
      const newProducts = [...prev.products];
      const item = { ...newProducts[index], [field]: value };

      if (field === "quantity") {
        const q = parseInt(value, 10) || 1;
        item.quantity = Math.max(1, q);
        if (item.quantity > 1 && item.mode === "single" && !item.barcode) {
          item.mode = "series";
        }
      }

      if (
        field === "warrantyStartDate" ||
        field === "fullWarrantyYears" ||
        field === "fullWarrantyMonths" ||
        field === "serviceWarrantyYears" ||
        field === "serviceWarrantyMonths"
      ) {
        const { expiryDateStr, totalYearsDecimal } = calculateExpiryAndTotal(
          item.warrantyStartDate,
          item.fullWarrantyYears,
          item.fullWarrantyMonths,
          item.serviceWarrantyYears,
          item.serviceWarrantyMonths
        );
        item.warrantyEndDate = expiryDateStr;
        item.warrantyYears = totalYearsDecimal.toString();
      }

      newProducts[index] = item;
      return { ...prev, products: newProducts };
    });
  };

  const handleEditFormChange = (name, value) => {
    setEditFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (
        name === "warrantyStartDate" ||
        name === "fullWarrantyYears" ||
        name === "fullWarrantyMonths" ||
        name === "serviceWarrantyYears" ||
        name === "serviceWarrantyMonths"
      ) {
        const { expiryDateStr, totalYearsDecimal } = calculateExpiryAndTotal(
          updated.warrantyStartDate,
          updated.fullWarrantyYears,
          updated.fullWarrantyMonths,
          updated.serviceWarrantyYears,
          updated.serviceWarrantyMonths
        );
        updated.warrantyEndDate = expiryDateStr;
        updated.warrantyYears = totalYearsDecimal.toString();
      }
      return updated;
    });
  };

  // --- Excel upload handler ---
  const handleExcelFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (excelFileInputRef.current) excelFileInputRef.current.value = "";

    setExcelFileError(null);

    if (!file) {
      setExcelFileError("No file selected. Please choose an Excel file (.xlsx or .xls).");
      return;
    }

    const allowedExtensions = [".xlsx", ".xls"];
    const fileName = file.name.toLowerCase();
    const isValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
    if (!isValidExtension) {
      setExcelFileError("Invalid file type. Only .xlsx and .xls files are accepted.");
      return;
    }

    if (file.size === 0) {
      setExcelFileError("The selected file is empty. Please upload a valid Excel file.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }

    setExcelUploading(true);
    setExcelUploadResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${baseUrl}/battery-data/admin/register/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const rawBody = await response.text();

      let parsedData = null;
      try {
        parsedData = JSON.parse(rawBody);
      } catch {
        parsedData = null;
      }

      if (response.ok) {
        setExcelUploadResult({ success: true, data: parsedData || {} });
        fetchBatteries();
      } else {
        let errorMsg = "Upload failed. Please try again.";
        if (parsedData) {
          errorMsg = parsedData.message || parsedData.error || parsedData.detail || errorMsg;
        } else if (rawBody) {
          errorMsg = rawBody;
        }
        setExcelUploadResult({ success: false, error: errorMsg, data: parsedData || {} });
      }
    } catch (err) {
      setExcelUploadResult({
        success: false,
        error: err.message || "A network or server error occurred. Please check your connection and try again.",
        data: {}
      });
    } finally {
      setExcelUploading(false);
    }
  };

  const handleExcelUploadResult = () => {
    setExcelUploadResult(null);
    setExcelFileError(null);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegisterLoading(true);
    setFormError(null);

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }

    const customerName = (formData.customerName || "").trim();
    const invoiceNumber = (formData.invoiceNumber || "").trim();

    if (!customerName) {
      setFormError("Customer name is required.");
      setRegisterLoading(false);
      return;
    }
    if (!invoiceNumber) {
      setFormError("Invoice number is required.");
      setRegisterLoading(false);
      return;
    }
    if (!formData.products || formData.products.length === 0) {
      setFormError("At least one product item is required.");
      setRegisterLoading(false);
      return;
    }

    // Validate all product items
    for (let i = 0; i < formData.products.length; i++) {
      const item = formData.products[i];
      const itemNum = i + 1;

      if (!item.warrantyStartDate || !item.warrantyEndDate) {
        setFormError(`Product #${itemNum}: Both Warranty Start Date and Warranty End Date are required.`);
        setRegisterLoading(false);
        return;
      }

      if (item.mode === "single" || item.quantity === 1) {
        if (!item.barcode || !item.barcode.trim()) {
          setFormError(`Product #${itemNum}: Barcode / Serial Number is required.`);
          setRegisterLoading(false);
          return;
        }
      } else {
        if (!item.startBarcode?.trim() || !item.endBarcode?.trim()) {
          setFormError(`Product #${itemNum}: Start Barcode and End Barcode are required for bulk/series registration.`);
          setRegisterLoading(false);
          return;
        }
      }
    }

    const failedItems = [];
    let successCount = 0;

    for (let i = 0; i < formData.products.length; i++) {
      const item = formData.products[i];
      const itemNum = i + 1;

      const madeProductVal = item.selectedMadeProduct === "Other"
        ? (item.customMadeProduct || "").trim()
        : (item.selectedMadeProduct || "").trim();
      const productDetailsRaw = item.voltage || item.capacity
        ? `${(item.voltage || "").trim()}V ${(item.capacity || "").trim()}Ah Chemistry = ${item.chemistry || "NMC"}`
        : (item.productDetails || "").trim();
      const combinedDetails = madeProductVal
        ? (productDetailsRaw ? `${madeProductVal} - ${productDetailsRaw}` : madeProductVal)
        : (productDetailsRaw || "EV Battery Unit");

      const payload = {
        customerName,
        invoiceNumber,
        productDetails: combinedDetails,
        warrantyStartDate: item.warrantyStartDate || null,
        warrantyEndDate: item.warrantyEndDate || null,
      };

      if (item.mode === "single" || item.quantity === 1) {
        payload.barcode = item.barcode.trim();
      } else {
        payload.startBarcode = item.startBarcode.trim();
        payload.endBarcode = item.endBarcode.trim();
      }

      try {
        await batteryService.registerBattery(payload);
        successCount++;
      } catch (err) {
        console.error(`Error registering product #${itemNum}:`, err);
        failedItems.push(`Product #${itemNum} (${combinedDetails}): ${err.message || "Registration failed"}`);
      }
    }

    setRegisterLoading(false);

    if (failedItems.length === 0) {
      alert(`Successfully registered ${successCount} product${successCount > 1 ? "s" : ""} under Invoice ${invoiceNumber}!`);
      setShowModal(false);
      fetchBatteries();
    } else {
      fetchBatteries();
      setFormError(
        `Registered ${successCount} product${successCount > 1 ? "s" : ""}, but ${failedItems.length} failed:\n${failedItems.join("\n")}`
      );
    }
  };

  const checkWarrantyActive = (startDateStr, endDateStr) => {
    if (!endDateStr) return false;
    try {
      const now = new Date();
      const istTimeStr = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
      const todayIST = new Date(istTimeStr);
      todayIST.setHours(0, 0, 0, 0);

      const end = new Date(endDateStr);
      end.setHours(0, 0, 0, 0);

      if (isNaN(end.getTime())) return false;
      return todayIST <= end;
    } catch (e) {
      console.error("Error evaluating warranty status:", e);
      return false;
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, warrantyYearFilter, productCategoryFilter, selectedYear, selectedMonth]);

  useEffect(() => {
    const liveIds = new Set(batteries.map(b => b.id));

    if (deletedIds.length > 0) {
      const cleanedIds = deletedIds.filter(id => liveIds.has(id));
      const cleanedBarcodes = cleanedIds.map(id => {
        const b = batteries.find(x => x.id === id);
        return b ? String(b.barcode || "") : null;
      }).filter(Boolean);

      if (cleanedIds.length !== deletedIds.length) {
        setDeletedIds(cleanedIds);
        setDeletedBarcodes(cleanedBarcodes);
        localStorage.setItem("battery_inventory_deleted_ids", JSON.stringify(cleanedIds));
        localStorage.setItem("battery_inventory_deleted_barcodes", JSON.stringify(cleanedBarcodes));
      }
    }

    const editedKeys = Object.keys(editedRecords).map(Number);
    const staleEditKeys = editedKeys.filter(id => !liveIds.has(id));
    if (staleEditKeys.length > 0) {
      const cleanedEdits = { ...editedRecords };
      staleEditKeys.forEach(id => delete cleanedEdits[id]);
      setEditedRecords(cleanedEdits);
      localStorage.setItem("battery_inventory_edited_records", JSON.stringify(cleanedEdits));
    }
  }, [batteries, deletedIds, editedRecords]);

  const handleWarrantyStatusSubmit = useCallback(async (e) => {
    if (e) e.preventDefault();
    if (!warrantyStatusModal.battery || warrantyStatusModal.submitting) return;

    const { battery, warrantyType, actionType, reason } = warrantyStatusModal;
    const isDeactivating = actionType === "deactivate";

    if (isDeactivating && !reason.trim()) {
      setWarrantyStatusModal(prev => ({ ...prev, error: "Reason is required for deactivating warranty." }));
      return;
    }

    setWarrantyStatusModal(prev => ({ ...prev, submitting: true, error: null }));

    const targetActive = actionType === "activate";
    const payload = {};
    if (warrantyType === "full") {
      payload.fullWarrantyActive = targetActive;
      payload.fullWarrantyStatusReason = reason.trim() || null;
    } else {
      payload.serviceWarrantyActive = targetActive;
      payload.serviceWarrantyStatusReason = reason.trim() || null;
    }

    try {
      const targetIds = (battery.originalBatteries && battery.originalBatteries.length > 0)
        ? battery.originalBatteries.map(b => b.id).filter(Boolean)
        : [battery.id].filter(Boolean);

      if (targetIds.length === 0) {
        throw new Error("Invalid battery identifier");
      }

      await Promise.all(targetIds.map(id => batteryService.updateWarrantyStatus(id, payload)));

      const successMsg = `${warrantyType === "full" ? "Full Warranty" : "Service Warranty"} ${targetActive ? "activated" : "deactivated"} successfully!`;
      setToast({ message: successMsg, type: "success" });

      setWarrantyStatusModal({
        isOpen: false,
        battery: null,
        warrantyType: "full",
        actionType: "deactivate",
        reason: "",
        submitting: false,
        error: null
      });

      // Update viewDetailsTarget if currently open
      if (viewDetailsTarget && (viewDetailsTarget.id === battery.id || (viewDetailsTarget.originalBatteries && viewDetailsTarget.originalBatteries.some(o => targetIds.includes(o.id))))) {
        setViewDetailsTarget(prev => {
          if (!prev) return null;
          if (warrantyType === "full") {
            return {
              ...prev,
              fullWarrantyActive: targetActive,
              fullWarrantyStatusReason: reason.trim() || ""
            };
          } else {
            return {
              ...prev,
              serviceWarrantyActive: targetActive,
              serviceWarrantyStatusReason: reason.trim() || ""
            };
          }
        });
      }

      await fetchBatteries();
    } catch (err) {
      console.error("Failed to update warranty status:", err);
      const errMsg = err.message || "Failed to update warranty status. Please try again.";
      setWarrantyStatusModal(prev => ({ ...prev, submitting: false, error: errMsg }));
      setToast({ message: errMsg, type: "error" });
    }
  }, [warrantyStatusModal, viewDetailsTarget, fetchBatteries]);

  const activeBatteries = React.useMemo(() => {
    const scmWarrantyMap = new Map();

    try {
      const scmSyncList = JSON.parse(localStorage.getItem("battery_inventory_scm_sync") || "[]");
      scmSyncList.forEach(item => {
        if (item) {
          if (item.barcode) scmWarrantyMap.set(String(item.barcode).trim(), item);
          if (item.startBarcode) scmWarrantyMap.set(String(item.startBarcode).trim(), item);
        }
      });
    } catch (e) {
      console.warn("Failed to parse SCM warranty sync map:", e);
    }

    const result = batteries
      .filter(b => b && !deletedIds.includes(b.id))
      .map(b => {
        const edited = editedRecords[b.id] || {};
        const bBarcode = String(b.barcode || b.startBarcode || "").trim();
        const scmOverride = scmWarrantyMap.get(bBarcode) || {};

        const finalProductDetails = edited.productDetails || scmOverride.productDetails || b.productDetails;
        const finalStart = edited.warrantyStartDate || scmOverride.warrantyStartDate || b.warrantyStartDate;
        const finalEnd = edited.warrantyEndDate || scmOverride.warrantyEndDate || b.warrantyEndDate;

        // Full Warranty status - authoritative from backend
        let fullActive;
        if (edited.fullWarrantyActive !== undefined && edited.fullWarrantyActive !== null) {
          fullActive = Boolean(edited.fullWarrantyActive);
        } else if (b.fullWarrantyActive !== undefined && b.fullWarrantyActive !== null) {
          fullActive = Boolean(b.fullWarrantyActive);
        } else if (b.warrantyActive !== undefined && b.warrantyActive !== null) {
          fullActive = Boolean(b.warrantyActive);
        } else {
          fullActive = checkWarrantyActive(finalStart, finalEnd);
        }

        // Service Warranty status - authoritative from backend
        let serviceActive;
        if (edited.serviceWarrantyActive !== undefined && edited.serviceWarrantyActive !== null) {
          serviceActive = Boolean(edited.serviceWarrantyActive);
        } else if (b.serviceWarrantyActive !== undefined && b.serviceWarrantyActive !== null) {
          serviceActive = Boolean(b.serviceWarrantyActive);
        } else {
          serviceActive = fullActive;
        }

        const fullReason = edited.fullWarrantyStatusReason ?? b.fullWarrantyStatusReason ?? "";
        const serviceReason = edited.serviceWarrantyStatusReason ?? b.serviceWarrantyStatusReason ?? "";

        return {
          ...b,
          productDetails: finalProductDetails,
          warrantyStartDate: finalStart,
          warrantyEndDate: finalEnd,
          fullWarrantyYears: scmOverride.fullWarrantyYears ?? b.fullWarrantyYears,
          fullWarrantyMonths: scmOverride.fullWarrantyMonths ?? b.fullWarrantyMonths,
          serviceWarrantyYears: scmOverride.serviceWarrantyYears ?? b.serviceWarrantyYears,
          serviceWarrantyMonths: scmOverride.serviceWarrantyMonths ?? b.serviceWarrantyMonths,
          totalWarrantyLabel: scmOverride.totalWarrantyLabel ?? b.totalWarrantyLabel,
          ...edited,
          fullWarrantyActive: fullActive,
          serviceWarrantyActive: serviceActive,
          fullWarrantyStatusReason: fullReason,
          serviceWarrantyStatusReason: serviceReason,
          warrantyActive: fullActive || serviceActive
        };
      });
    return result;
  }, [batteries, deletedIds, editedRecords]);

  const groupedBatteries = React.useMemo(() => {
    const result = groupBatteries(activeBatteries);
    console.log("[BATTERY PIPELINE] 4. groupedBatteries:", result.length);
    return result;
  }, [activeBatteries]);

  const getCurrentWarrantyYear = useCallback((b) => {
    if (!b || !b.warrantyStartDate || !b.warrantyEndDate) return null;
    try {
      const start = new Date(b.warrantyStartDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(b.warrantyEndDate);
      end.setHours(0, 0, 0, 0);

      const todayIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      todayIST.setHours(0, 0, 0, 0);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
      if (todayIST < start) return null; // Warranty has not started yet
      if (todayIST > end) return null;   // Warranty has expired

      let elapsedYears = todayIST.getFullYear() - start.getFullYear();
      const monthDiff = todayIST.getMonth() - start.getMonth();
      const dayDiff = todayIST.getDate() - start.getDate();
      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        elapsedYears--;
      }

      const currentYear = elapsedYears + 1;
      const totalYears = getWarrantyDurationYears(b);
      if (currentYear > totalYears) {
        return null;
      }
      return currentYear;
    } catch (e) {
      console.error("Error getting current warranty year:", e);
      return null;
    }
  }, []);

  const maxWarrantyDuration = React.useMemo(() => {
    let max = 0;
    activeBatteries.forEach(b => {
      const duration = getWarrantyDurationYears(b);
      if (duration > max) max = duration;
    });
    return max;
  }, [activeBatteries]);

  const getBatteryRecordDate = useCallback((b) => {
    if (!b) return null;
    const dateStr = b.warrantyStartDate || b.createdAt || b.registrationDate || b.created_at;
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }, []);

  const availableYears = useMemo(() => {
    const yearsSet = new Set();
    activeBatteries.forEach(b => {
      const d = getBatteryRecordDate(b);
      if (d) yearsSet.add(d.getFullYear());
      if (Array.isArray(b.originalBatteries)) {
        b.originalBatteries.forEach(orig => {
          const od = getBatteryRecordDate(orig);
          if (od) yearsSet.add(od.getFullYear());
        });
      }
    });

    if (yearsSet.size === 0) {
      yearsSet.add(new Date().getFullYear());
    }

    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [activeBatteries, getBatteryRecordDate]);

  const MONTH_OPTIONS = useMemo(() => [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" }
  ], []);

  const warrantyYearOptions = React.useMemo(() => {
    const options = [];
    for (let i = 1; i <= maxWarrantyDuration; i++) {
      options.push({ value: i.toString(), label: `Year ${i}` });
    }
    return options;
  }, [maxWarrantyDuration]);

  const getBatteryCategory = (b) => {
    if (!b) return "Other";
    if (b.productCategory) return b.productCategory;
    if (b.category) return b.category;

    const details = String(b.productDetails || "").toLowerCase();
    if (details.includes("solar")) {
      return "Solar Battery";
    }
    if (details.includes("ev") || details.includes("electric vehicle") || details.includes("li-ion") || details.includes("lithium")) {
      return "EV Battery";
    }
    if (details.includes("inverter")) {
      return "Inverter Battery";
    }
    if (details.includes("robotics") || details.includes("robot")) {
      return "Robotics Battery";
    }
    if (details.includes("defence") || details.includes("defense")) {
      return "Defence Battery";
    }
    if (details.includes("medical")) {
      return "Medical Battery";
    }
    if (details.includes("strip pump") || details.includes("strippump")) {
      return "Strip Pump Battery";
    }
    if (details.includes("battery") || details.includes("pack")) {
      return "EV Battery"; // fallback to EV Battery or General Battery if details check matches general batteries
    }
    return "Other";
  };

  const productCategories = React.useMemo(() => {
    const categories = new Set(["Solar Battery", "EV Battery", "Inverter Battery", "Robotics Battery", "Defence Battery", "Medical Battery", "Strip Pump Battery"]);
    activeBatteries.forEach(b => {
      const cat = getBatteryCategory(b);
      if (cat) {
        categories.add(cat);
      }
    });
    return Array.from(categories);
  }, [activeBatteries]);

  // Filtered batteries based on search query, warranty year, product category, year, and month
  const filteredBatteries = React.useMemo(() => {
    const result = groupedBatteries.filter(b => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = query === "" ||
        String(b.displayBarcode || "").toLowerCase().includes(query) ||
        b.originalBatteries?.some(orig => String(orig.barcode || "").toLowerCase().includes(query)) ||
        String(b.customerName || "").toLowerCase().includes(query) ||
        String(b.invoiceNumber || "").toLowerCase().includes(query);

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

      if (selectedYear !== "All") {
        const targetYr = parseInt(selectedYear, 10);
        const bDate = getBatteryRecordDate(b);
        const matchesMain = bDate && bDate.getFullYear() === targetYr;
        const matchesOrig = b.originalBatteries?.some(orig => {
          const od = getBatteryRecordDate(orig);
          return od && od.getFullYear() === targetYr;
        });
        if (!matchesMain && !matchesOrig) return false;
      }

      if (selectedMonth !== "All") {
        const targetMonth = parseInt(selectedMonth, 10);
        const bDate = getBatteryRecordDate(b);
        const matchesMain = bDate && (bDate.getMonth() + 1) === targetMonth;
        const matchesOrig = b.originalBatteries?.some(orig => {
          const od = getBatteryRecordDate(orig);
          return od && (od.getMonth() + 1) === targetMonth;
        });
        if (!matchesMain && !matchesOrig) return false;
      }

      return true;
    });
    console.log("[BATTERY PIPELINE] 5. filteredBatteries:", result.length, "| search:", searchQuery, "| warrantyFilter:", warrantyYearFilter, "| catFilter:", productCategoryFilter, "| yearFilter:", selectedYear, "| monthFilter:", selectedMonth);
    return result;
  }, [groupedBatteries, searchQuery, warrantyYearFilter, productCategoryFilter, selectedYear, selectedMonth, getCurrentWarrantyYear, getBatteryRecordDate]);

  // Sort the filtered batteries
  const sortedBatteries = React.useMemo(() => {
    const sorted = [...filteredBatteries];
    if (sortField) {
      sorted.sort((a, b) => {
        let valA, valB;
        if (sortField === "barcode") {
          valA = a.displayBarcode || "";
          valB = b.displayBarcode || "";
        } else {
          valA = a[sortField];
          valB = b[sortField];
        }

        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        // Custom comparator for numbers, dates, boolean, or strings
        if (typeof valA === "boolean" && typeof valB === "boolean") {
          return sortDirection === "asc"
            ? (valA === valB ? 0 : valA ? -1 : 1)
            : (valA === valB ? 0 : valA ? 1 : -1);
        }

        const strA = String(valA).trim().toLowerCase();
        const strB = String(valB).trim().toLowerCase();

        if (sortDirection === "asc") {
          return strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
        } else {
          return strB.localeCompare(strA, undefined, { numeric: true, sensitivity: 'base' });
        }
      });
    }
    console.log("[BATTERY PIPELINE] 6. sortedBatteries:", sorted.length);
    return sorted;
  }, [filteredBatteries, sortField, sortDirection]);

  // Paginated chunk
  const paginatedBatteries = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const result = sortedBatteries.slice(start, start + itemsPerPage);
    console.log("[BATTERY PIPELINE] 7. paginatedBatteries:", result.length, "| page:", currentPage, "/ totalPages:", Math.max(1, Math.ceil(sortedBatteries.length / itemsPerPage)));
    return result;
  }, [sortedBatteries, currentPage, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(sortedBatteries.length / itemsPerPage));

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return (
        <span style={{ marginLeft: 6, color: '#9ca3af', fontSize: 10, display: 'inline-flex', alignSelf: 'center', transition: 'color 0.2s' }}>
          ↕
        </span>
      );
    }
    return (
      <span style={{ marginLeft: 6, color: '#10b981', fontSize: 11, fontWeight: 'bold', display: 'inline-flex', alignSelf: 'center', transition: 'transform 0.2s' }}>
        {sortDirection === "asc" ? "▲" : "▼"}
      </span>
    );
  };

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
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${b.warrantyStartDate || '-'} to ${b.warrantyEndDate || '-'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">
          <div style="margin-bottom: 4px;">
            <span style="padding: 3px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; ${b.fullWarrantyActive ? 'background: #DEF7EC; color: #03543F;' : 'background: #FDE8E8; color: #9B1C1C;'}">
              Full: ${b.fullWarrantyActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div>
            <span style="padding: 3px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; ${b.serviceWarrantyActive ? 'background: #DEF7EC; color: #03543F;' : 'background: #FDE8E8; color: #9B1C1C;'}">
              Service: ${b.serviceWarrantyActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </td>
      </tr>
    `).join("");

    const watermarkText = getExportWatermark();

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
          ${getPdfWatermarkHtml()}
          <h2>Battery Inventory Report</h2>
          <p>Generated on: ${new Date().toLocaleString()} | Generated By: <strong>${watermarkText}</strong></p>
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
      "Full Warranty Status",
      "Full Warranty Reason",
      "Service Warranty Status",
      "Service Warranty Reason"
    ];

    const rows = filteredBatteries.map(b => [
      `"${b.displayBarcode || ''}"`,
      `"${b.customerName || '-'}"`,
      `"${b.productDetails || '-'}"`,
      `"${b.invoiceNumber || '-'}"`,
      `"${b.warrantyStartDate || ''} to ${b.warrantyEndDate || ''}"`,
      `"${b.fullWarrantyActive ? 'Active' : 'Inactive'}"`,
      `"${(b.fullWarrantyStatusReason || '').replace(/"/g, '""')}"`,
      `"${b.serviceWarrantyActive ? 'Active' : 'Inactive'}"`,
      `"${(b.serviceWarrantyStatusReason || '').replace(/"/g, '""')}"`
    ]);

    const metaLine = getExportMetadataHeader();
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [metaLine, headers.join(","), ...rows.map(r => r.join(","))].join("\n");
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
      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
      <style>{`
        .toast-notification {
          position: fixed;
          top: 24px;
          right: 24px;
          z-index: 99999;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 20px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          color: #ffffff;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15);
          animation: slideInRightToast 0.3s ease;
        }
        .toast-notification.success { background: #059669; }
        .toast-notification.error { background: #DC2626; }
        .toast-icon { font-weight: bold; font-size: 16px; }

        @keyframes slideInRightToast {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
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
        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
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
        .upload-excel-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 22px;
          background: #ffffff;
          color: #065F46;
          border: 1.5px solid #10B981;
          border-radius: 9999px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          font-family: inherit;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .upload-excel-btn:hover {
          background: #ECFDF5;
          border-color: #059669;
          color: #064E3B;
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(16, 185, 129, 0.15);
        }
        .upload-excel-btn:active {
          transform: translateY(0);
        }
        .upload-excel-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
        /* Excel Upload Result Modal */
        .excel-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1100;
          padding: 20px;
          box-sizing: border-box;
        }
        .excel-modal-content {
          background: #ffffff;
          border-radius: 20px;
          width: 680px;
          max-width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.18);
          padding: 32px;
          box-sizing: border-box;
          animation: fadeInPage 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .excel-modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 20px;
          gap: 12px;
        }
        .excel-modal-title {
          font-size: 20px;
          font-weight: 700;
          color: #111827;
          margin: 0;
          line-height: 1.3;
        }
        .excel-modal-close-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #9CA3AF;
          padding: 4px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s, background 0.2s;
          flex-shrink: 0;
        }
        .excel-modal-close-btn:hover {
          color: #111827;
          background: #F3F4F6;
        }
        .excel-summary-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }
        @media (max-width: 480px) {
          .excel-summary-grid {
            grid-template-columns: 1fr;
          }
        }
        .excel-summary-card {
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .excel-summary-label {
          font-size: 12px;
          color: #6B7280;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .excel-summary-value {
          font-size: 24px;
          font-weight: 700;
          color: #111827;
          line-height: 1.2;
        }
        .excel-summary-value.success-color { color: #059669; }
        .excel-summary-value.error-color { color: #DC2626; }
        .excel-summary-value.skip-color { color: #D97706; }
        .excel-error-table-wrapper {
          margin-top: 16px;
          border-radius: 10px;
          border: 1px solid #FEE2E2;
          overflow: hidden;
          overflow-x: auto;
        }
        .excel-error-section-title {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 10px 0;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .excel-error-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .excel-error-table th {
          text-align: left;
          padding: 10px 14px;
          background: #FEF2F2;
          color: #991B1B;
          font-weight: 600;
          font-size: 12px;
          border-bottom: 1px solid #FEE2E2;
        }
        .excel-error-table td {
          padding: 10px 14px;
          border-bottom: 1px solid #FEE2E2;
          color: #374151;
          vertical-align: top;
          word-break: break-word;
        }
        .excel-error-table tr:last-child td {
          border-bottom: none;
        }
        .excel-error-table tr:nth-child(even) td {
          background: #FFF7F7;
        }
        .excel-registered-table-wrapper {
          margin-top: 16px;
          border-radius: 10px;
          border: 1px solid #D1FAE5;
          overflow: hidden;
          overflow-x: auto;
          max-height: 220px;
        }
        .excel-registered-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .excel-registered-table th {
          text-align: left;
          padding: 10px 14px;
          background: #ECFDF5;
          color: #065F46;
          font-weight: 600;
          font-size: 12px;
          border-bottom: 1px solid #D1FAE5;
          position: sticky;
          top: 0;
        }
        .excel-registered-table td {
          padding: 10px 14px;
          border-bottom: 1px solid #D1FAE5;
          color: #374151;
          word-break: break-word;
        }
        .excel-registered-table tr:last-child td {
          border-bottom: none;
        }
        .excel-registered-table tr:nth-child(even) td {
          background: #F0FDF4;
        }
        /* Spinner */
        @keyframes excel-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .excel-spinner {
          display: inline-block;
          width: 18px;
          height: 18px;
          border: 2.5px solid rgba(16, 185, 129, 0.3);
          border-top-color: #10B981;
          border-radius: 50%;
          animation: excel-spin 0.7s linear infinite;
          flex-shrink: 0;
        }
        /* Uploading overlay */
        .excel-uploading-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1200;
        }
        .excel-uploading-card {
          background: #ffffff;
          border-radius: 20px;
          padding: 36px 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.18);
          min-width: 260px;
        }
        .excel-uploading-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid rgba(16, 185, 129, 0.2);
          border-top-color: #10B981;
          border-radius: 50%;
          animation: excel-spin 0.8s linear infinite;
        }
        .excel-uploading-text {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }
        .excel-uploading-subtext {
          font-size: 13px;
          color: #6B7280;
          margin: 0;
          text-align: center;
        }
        .excel-alert-success {
          background: #ECFDF5;
          border: 1px solid #A7F3D0;
          border-radius: 10px;
          padding: 12px 16px;
          color: #065F46;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .excel-alert-error {
          background: #FEF2F2;
          border: 1px solid #FECACA;
          border-radius: 10px;
          padding: 12px 16px;
          color: #991B1B;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 16px;
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }
        .excel-file-error {
          background: #FEF2F2;
          border: 1px solid #FECACA;
          border-radius: 8px;
          padding: 10px 14px;
          color: #991B1B;
          font-size: 13px;
          font-weight: 500;
          margin-top: 8px;
          display: inline-flex;
          align-items: flex-start;
          gap: 6px;
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
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          flex: 1;
          min-width: 280px;
        }
        @media (max-width: 900px) {
          .filters-container {
            grid-template-columns: repeat(2, 1fr);
          }
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

      {/* Hidden Excel file input */}
      <input
        ref={excelFileInputRef}
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        style={{ display: "none" }}
        onChange={handleExcelFileChange}
        id="excel-bulk-upload-input"
      />

      <div className="batteries-container">
        <div className="header-row">
          <div className="header-left">
            <h2>Battery Inventory</h2>
          </div>
          <div className="header-actions">
            {excelFileError && (
              <div className="excel-file-error">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                {excelFileError}
              </div>
            )}
            <button
              id="excel-bulk-upload-btn"
              className="upload-excel-btn"
              onClick={() => {
                setExcelFileError(null);
                excelFileInputRef.current && excelFileInputRef.current.click();
              }}
              disabled={excelUploading}
              title="Upload an Excel file (.xlsx or .xls) to bulk register batteries"
            >
              {excelUploading ? (
                <span className="excel-spinner" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
              )}
              {excelUploading ? "Uploading..." : "Upload Excel"}
            </button>
            <button className="register-btn" onClick={handleOpenModal} id="register-battery-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Register Battery
            </button>
          </div>
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
                <label className="filter-label">Year</label>
                <div className="filter-select-wrapper">
                  <select
                    className="filter-select"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    id="battery-year-filter"
                  >
                    <option value="All">All Years</option>
                    {availableYears.map(yr => (
                      <option key={yr} value={yr.toString()}>{yr}</option>
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
                <label className="filter-label">Month</label>
                <div className="filter-select-wrapper">
                  <select
                    className="filter-select"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    id="battery-month-filter"
                  >
                    <option value="All">All Months</option>
                    {MONTH_OPTIONS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
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

            {(productCategoryFilter !== "All" || selectedYear !== "All" || selectedMonth !== "All" || searchQuery !== "") && (
              <button
                type="button"
                className="clear-filters-btn"
                onClick={() => {
                  setWarrantyYearFilter("All");
                  setProductCategoryFilter("All");
                  setSelectedYear("All");
                  setSelectedMonth("All");
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
            <>
              <div className="table-wrapper">
                <table className="records-table">
                  <thead>
                    <tr>
                      <th onClick={() => handleSort("barcode")} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          Barcode {renderSortIcon("barcode")}
                        </div>
                      </th>
                      <th onClick={() => handleSort("customerName")} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          Customer Name {renderSortIcon("customerName")}
                        </div>
                      </th>
                      <th onClick={() => handleSort("productDetails")} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          Product Details {renderSortIcon("productDetails")}
                        </div>
                      </th>
                      <th onClick={() => handleSort("invoiceNumber")} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          Invoice Number {renderSortIcon("invoiceNumber")}
                        </div>
                      </th>
                      <th onClick={() => handleSort("warrantyStartDate")} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          Warranty Period {renderSortIcon("warrantyStartDate")}
                        </div>
                      </th>
                      <th onClick={() => handleSort("fullWarrantyActive")} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          Warranty Status {renderSortIcon("fullWarrantyActive")}
                        </div>
                      </th>
                      <th style={{ width: '60px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedBatteries.length > 0 ? (
                      paginatedBatteries.map((b) => (
                        <tr key={`${b.id || ''}-${b.displayBarcode || ''}`}>
                          <td style={{ fontWeight: 600 }}>{b.displayBarcode || "-"}</td>
                          <td>{b.customerName || "-"}</td>
                          <td>{b.productDetails || "-"}</td>
                          <td>{b.invoiceNumber || "-"}</td>
                          <td style={{ fontSize: 13, color: "#666" }}>
                            {b.warrantyStartDate || "-"} to {b.warrantyEndDate || "-"}
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                              <span 
                                className={`status-badge ${b.fullWarrantyActive ? "status-active" : "status-expired"}`}
                                title={b.fullWarrantyStatusReason ? `Full Warranty: ${b.fullWarrantyStatusReason}` : (b.fullWarrantyActive ? "Full Warranty Active" : "Full Warranty Inactive")}
                                style={{ fontSize: '11px', padding: '2px 8px', whiteSpace: 'nowrap' }}
                              >
                                <strong style={{ fontWeight: 600 }}>Full:</strong> {b.fullWarrantyActive ? "Active" : "Inactive"}
                              </span>
                              <span 
                                className={`status-badge ${b.serviceWarrantyActive ? "status-active" : "status-expired"}`}
                                title={b.serviceWarrantyStatusReason ? `Service Warranty: ${b.serviceWarrantyStatusReason}` : (b.serviceWarrantyActive ? "Service Warranty Active" : "Service Warranty Inactive")}
                                style={{ fontSize: '11px', padding: '2px 8px', whiteSpace: 'nowrap' }}
                              >
                                <strong style={{ fontWeight: 600 }}>Service:</strong> {b.serviceWarrantyActive ? "Active" : "Inactive"}
                              </span>
                            </div>
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
                                  {isAuthorizedAdmin && (
                                    <>
                                      <div style={{ height: '1px', background: '#F1F5F9', margin: '4px 0' }} />
                                      {b.fullWarrantyActive ? (
                                        <button 
                                          type="button" 
                                          style={{ color: '#DC2626' }}
                                          onClick={() => { openWarrantyStatusModal(b, "full", "deactivate"); setActiveMenuId(null); }}
                                        >
                                          Deactivate Full Warranty
                                        </button>
                                      ) : (
                                        <button 
                                          type="button" 
                                          style={{ color: '#059669' }}
                                          onClick={() => { openWarrantyStatusModal(b, "full", "activate"); setActiveMenuId(null); }}
                                        >
                                          Activate Full Warranty
                                        </button>
                                      )}
                                      {b.serviceWarrantyActive ? (
                                        <button 
                                          type="button" 
                                          style={{ color: '#DC2626' }}
                                          onClick={() => { openWarrantyStatusModal(b, "service", "deactivate"); setActiveMenuId(null); }}
                                        >
                                          Deactivate Service Warranty
                                        </button>
                                      ) : (
                                        <button 
                                          type="button" 
                                          style={{ color: '#059669' }}
                                          onClick={() => { openWarrantyStatusModal(b, "service", "activate"); setActiveMenuId(null); }}
                                        >
                                          Activate Service Warranty
                                        </button>
                                      )}
                                      <div style={{ height: '1px', background: '#F1F5F9', margin: '4px 0' }} />
                                    </>
                                  )}
                                  <button type="button" onClick={() => { handleOpenEdit(b); setActiveMenuId(null); }}>
                                    Edit
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
                        <td colSpan={7} style={{ padding: '60px 20px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px' }}>
                              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                              <line x1="22" y1="11" x2="22" y2="13"></line>
                              <line x1="6" y1="11" x2="10" y2="11"></line>
                              <line x1="6" y1="14" x2="14" y2="14"></line>
                            </svg>
                            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#374151', margin: '0 0 4px 0' }}>No Battery Records Found</h3>
                            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 16px 0', maxWidth: '320px' }}>
                              We couldn't find any inventory items matching your query. Adjust your search keywords or clear filters to retry.
                            </p>
                            {(searchQuery !== "" || productCategoryFilter !== "All" || selectedYear !== "All" || selectedMonth !== "All") && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSearchQuery("");
                                  setWarrantyYearFilter("All");
                                  setProductCategoryFilter("All");
                                  setSelectedYear("All");
                                  setSelectedMonth("All");
                                }}
                                className="action-btn"
                                style={{ display: 'inline-flex', padding: '6px 16px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff', fontSize: '13px', fontWeight: 500, color: '#374151', cursor: 'pointer' }}
                              >
                                Clear All Filters
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {sortedBatteries.length > 0 && (
                <div className="pagination-container" style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 20px',
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderTop: 'none',
                  borderBottomLeftRadius: '12px',
                  borderBottomRightRadius: '12px',
                  flexWrap: 'wrap',
                  gap: '12px',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                }}>
                  <div className="pagination-info" style={{ fontSize: '14px', color: '#6b7280' }}>
                    Showing <span style={{ fontWeight: 600, color: '#374151' }}>{Math.min(sortedBatteries.length, (currentPage - 1) * itemsPerPage + 1)}</span> to{' '}
                    <span style={{ fontWeight: 600, color: '#374151' }}>{Math.min(sortedBatteries.length, currentPage * itemsPerPage)}</span> of{' '}
                    <span style={{ fontWeight: 600, color: '#374151' }}>{sortedBatteries.length}</span> records
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {/* Rows Per Page */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', color: '#6b7280' }}>Rows per page:</span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(parseInt(e.target.value, 10));
                          setCurrentPage(1);
                        }}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid #d1d5db',
                          background: '#fff',
                          fontSize: '13px',
                          color: '#374151',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>

                    {/* Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          border: '1px solid #d1d5db',
                          background: currentPage === 1 ? '#f3f4f6' : '#fff',
                          color: currentPage === 1 ? '#9ca3af' : '#374151',
                          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                          outline: 'none',
                          fontSize: '16px'
                        }}
                      >
                        ‹
                      </button>

                      {(() => {
                        const pages = [];
                        const maxButtons = 5;
                        let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
                        let endPage = Math.min(totalPages, startPage + maxButtons - 1);

                        if (endPage - startPage + 1 < maxButtons) {
                          startPage = Math.max(1, endPage - maxButtons + 1);
                        }

                        for (let i = startPage; i <= endPage; i++) {
                          pages.push(
                            <button
                              key={i}
                              onClick={() => setCurrentPage(i)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '32px',
                                height: '32px',
                                borderRadius: '6px',
                                border: i === currentPage ? '1px solid #10b981' : '1px solid #d1d5db',
                                background: i === currentPage ? '#10b981' : '#fff',
                                color: i === currentPage ? '#fff' : '#374151',
                                cursor: 'pointer',
                                outline: 'none',
                                fontSize: '13px',
                                fontWeight: i === currentPage ? 600 : 400
                              }}
                            >
                              {i}
                            </button>
                          );
                        }
                        return pages;
                      })()}

                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          border: '1px solid #d1d5db',
                          background: currentPage === totalPages ? '#f3f4f6' : '#fff',
                          color: currentPage === totalPages ? '#9ca3af' : '#374151',
                          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                          outline: 'none',
                          fontSize: '16px'
                        }}
                      >
                        ›
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {viewDetailsTarget && (
        <div className="modal-overlay" onClick={() => setViewDetailsTarget(null)}>
          <div className="modal-content" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 20, color: "#111827", fontWeight: 700 }}>Battery Details</h3>
              <button
                type="button"
                onClick={() => setViewDetailsTarget(null)}
                style={{ background: "transparent", border: "none", fontSize: 20, color: "#94A3B8", cursor: "pointer", lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', paddingBottom: '8px' }}>
                <span style={{ color: '#6B7280', fontSize: '13px' }}>Barcode / Serial</span>
                <span style={{ fontWeight: 600, color: '#111827', fontSize: '13px' }}>{viewDetailsTarget.displayBarcode || viewDetailsTarget.barcode || "-"}</span>
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

              {/* Full Warranty Section */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px 14px', marginTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                    Full Warranty
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`status-badge ${viewDetailsTarget.fullWarrantyActive ? "status-active" : "status-expired"}`}>
                      {viewDetailsTarget.fullWarrantyActive ? "Active" : "Inactive"}
                    </span>
                    {isAuthorizedAdmin && (
                      viewDetailsTarget.fullWarrantyActive ? (
                        <button
                          type="button"
                          onClick={() => openWarrantyStatusModal(viewDetailsTarget, "full", "deactivate")}
                          style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#DC2626', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openWarrantyStatusModal(viewDetailsTarget, "full", "activate")}
                          style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', border: '1px solid #A7F3D0', background: '#ECFDF5', color: '#059669', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Activate
                        </button>
                      )
                    )}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: '#64748B' }}>Start Date: </span>
                    <span style={{ fontWeight: 500, color: '#334155' }}>{viewDetailsTarget.fullWarrantyStartDate || viewDetailsTarget.warrantyStartDate || "-"}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748B' }}>End Date: </span>
                    <span style={{ fontWeight: 500, color: '#334155' }}>{viewDetailsTarget.fullWarrantyEndDate || viewDetailsTarget.warrantyEndDate || "-"}</span>
                  </div>
                </div>
                {Boolean(viewDetailsTarget.fullWarrantyStatusReason && String(viewDetailsTarget.fullWarrantyStatusReason).trim()) && (
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #E2E8F0', fontSize: '12px' }}>
                    <span style={{ color: '#64748B' }}>Status Reason: </span>
                    <span style={{ fontWeight: 500, color: '#475569', fontStyle: 'italic' }}>"{viewDetailsTarget.fullWarrantyStatusReason}"</span>
                  </div>
                )}
              </div>

              {/* Service Warranty Section */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                    </svg>
                    Service Warranty
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`status-badge ${viewDetailsTarget.serviceWarrantyActive ? "status-active" : "status-expired"}`}>
                      {viewDetailsTarget.serviceWarrantyActive ? "Active" : "Inactive"}
                    </span>
                    {isAuthorizedAdmin && (
                      viewDetailsTarget.serviceWarrantyActive ? (
                        <button
                          type="button"
                          onClick={() => openWarrantyStatusModal(viewDetailsTarget, "service", "deactivate")}
                          style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#DC2626', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openWarrantyStatusModal(viewDetailsTarget, "service", "activate")}
                          style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', border: '1px solid #A7F3D0', background: '#ECFDF5', color: '#059669', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Activate
                        </button>
                      )
                    )}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: '#64748B' }}>Start Date: </span>
                    <span style={{ fontWeight: 500, color: '#334155' }}>{viewDetailsTarget.serviceWarrantyStartDate || viewDetailsTarget.warrantyStartDate || "-"}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748B' }}>End Date: </span>
                    <span style={{ fontWeight: 500, color: '#334155' }}>{viewDetailsTarget.serviceWarrantyEndDate || viewDetailsTarget.warrantyEndDate || "-"}</span>
                  </div>
                </div>
                {Boolean(viewDetailsTarget.serviceWarrantyStatusReason && String(viewDetailsTarget.serviceWarrantyStatusReason).trim()) && (
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #E2E8F0', fontSize: '12px' }}>
                    <span style={{ color: '#64748B' }}>Status Reason: </span>
                    <span style={{ fontWeight: 500, color: '#475569', fontStyle: 'italic' }}>"{viewDetailsTarget.serviceWarrantyStatusReason}"</span>
                  </div>
                )}
              </div>
            </div>
            <div className="form-actions" style={{ marginTop: 20 }}>
              <button type="button" className="action-btn" onClick={() => setViewDetailsTarget(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Warranty Status Activate / Deactivate Confirmation Modal */}
      {warrantyStatusModal.isOpen && warrantyStatusModal.battery && (
        <div 
          className="modal-overlay" 
          onClick={() => {
            if (!warrantyStatusModal.submitting) {
              setWarrantyStatusModal(prev => ({ ...prev, isOpen: false }));
            }
          }}
        >
          <div 
            className="modal-content" 
            style={{ maxWidth: 480, padding: "24px" }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <h3 style={{ 
                  margin: "0 0 4px 0", 
                  fontSize: "18px", 
                  fontWeight: 700, 
                  color: warrantyStatusModal.actionType === "deactivate" ? "#DC2626" : "#059669",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  {warrantyStatusModal.actionType === "deactivate" ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="15" y1="9" x2="9" y2="15"></line>
                      <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                  )}
                  {warrantyStatusModal.actionType === "deactivate" ? "Deactivate" : "Activate"}{" "}
                  {warrantyStatusModal.warrantyType === "full" ? "Full Warranty" : "Service Warranty"}
                </h3>
                <p style={{ margin: 0, fontSize: "13px", color: "#64748B" }}>
                  {warrantyStatusModal.actionType === "deactivate"
                    ? "Confirm warranty deactivation and specify the reason."
                    : "Confirm warranty activation."}
                </p>
              </div>
              <button
                type="button"
                disabled={warrantyStatusModal.submitting}
                onClick={() => setWarrantyStatusModal(prev => ({ ...prev, isOpen: false }))}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "20px",
                  lineHeight: 1,
                  color: "#94A3B8",
                  cursor: warrantyStatusModal.submitting ? "not-allowed" : "pointer",
                  padding: "4px"
                }}
              >
                ✕
              </button>
            </div>

            {warrantyStatusModal.error && (
              <div style={{ background: "#FEF2F2", color: "#DC2626", padding: "10px 12px", borderRadius: "8px", fontSize: "13px", border: "1px solid #FECACA", marginBottom: "14px" }}>
                {warrantyStatusModal.error}
              </div>
            )}

            <form onSubmit={handleWarrantyStatusSubmit}>
              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "12px 14px", marginBottom: "16px", display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748B" }}>Battery Number:</span>
                  <span style={{ fontWeight: 600, color: "#1E293B" }}>
                    {warrantyStatusModal.battery.displayBarcode || warrantyStatusModal.battery.barcode || "-"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748B" }}>Warranty Type:</span>
                  <span style={{ fontWeight: 600, color: "#1E293B" }}>
                    {warrantyStatusModal.warrantyType === "full" ? "Full Warranty" : "Service Warranty"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748B" }}>Current Status:</span>
                  <span className={`status-badge ${
                    (warrantyStatusModal.warrantyType === "full" ? warrantyStatusModal.battery.fullWarrantyActive : warrantyStatusModal.battery.serviceWarrantyActive)
                      ? "status-active"
                      : "status-expired"
                  }`}>
                    {(warrantyStatusModal.warrantyType === "full" ? warrantyStatusModal.battery.fullWarrantyActive : warrantyStatusModal.battery.serviceWarrantyActive)
                      ? "Active"
                      : "Inactive"}
                  </span>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: "18px" }}>
                <label style={{ fontSize: "13px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "6px" }}>
                  {warrantyStatusModal.actionType === "deactivate" ? "Reason for deactivation *" : "Reason for activation (optional)"}
                </label>
                <textarea
                  rows={3}
                  value={warrantyStatusModal.reason}
                  onChange={(e) => {
                    const val = e.target.value;
                    setWarrantyStatusModal(prev => ({ ...prev, reason: val, error: null }));
                  }}
                  placeholder={
                    warrantyStatusModal.actionType === "deactivate"
                      ? "Enter the mandatory reason for deactivating warranty (e.g., Warranty void due to physical damage)..."
                      : "Optional reason or notes for activating warranty..."
                  }
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #D1D5DB",
                    fontSize: "13px",
                    fontFamily: "inherit",
                    resize: "vertical",
                    boxSizing: "border-box",
                    outline: "none"
                  }}
                  required={warrantyStatusModal.actionType === "deactivate"}
                />
              </div>

              <div className="form-actions" style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="action-btn"
                  disabled={warrantyStatusModal.submitting}
                  onClick={() => setWarrantyStatusModal(prev => ({ ...prev, isOpen: false }))}
                  style={{ padding: "8px 16px", borderRadius: "8px", fontSize: "13px" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={warrantyStatusModal.submitting || (warrantyStatusModal.actionType === "deactivate" && !warrantyStatusModal.reason.trim())}
                  style={{
                    padding: "8px 18px",
                    borderRadius: "8px",
                    border: "none",
                    background: warrantyStatusModal.actionType === "deactivate" ? "#DC2626" : "#059669",
                    color: "#fff",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: (warrantyStatusModal.submitting || (warrantyStatusModal.actionType === "deactivate" && !warrantyStatusModal.reason.trim())) ? "not-allowed" : "pointer",
                    opacity: (warrantyStatusModal.submitting || (warrantyStatusModal.actionType === "deactivate" && !warrantyStatusModal.reason.trim())) ? 0.6 : 1,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  {warrantyStatusModal.submitting ? "Updating..." : (warrantyStatusModal.actionType === "deactivate" ? "Deactivate Warranty" : "Activate Warranty")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className="modal-content"
            style={{ width: "860px", maxWidth: "95%", maxHeight: "90vh", padding: "28px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <h3 style={{ margin: "0 0 4px 0", fontSize: "20px", fontWeight: 700, color: "#111827" }}>
                  Register Batteries
                </h3>
                <p style={{ margin: 0, fontSize: "13px", color: "#64748B" }}>
                  Register multiple battery products under the same Customer Name and Invoice.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "20px",
                  lineHeight: 1,
                  color: "#94A3B8",
                  cursor: "pointer",
                  padding: "4px 8px"
                }}
              >
                ✕
              </button>
            </div>

            {formError && (
              <div style={{ background: "#FEF2F2", color: "#DC2626", padding: "12px 14px", borderRadius: "8px", fontSize: "13px", border: "1px solid #FECACA", marginBottom: "16px", whiteSpace: "pre-line" }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit}>
              {/* ===== 1. Customer & Invoice Details (Entered Once) ===== */}
              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "16px", marginBottom: "20px" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  Customer &amp; Invoice Information
                </div>
                <div className="form-grid" style={{ marginBottom: 0 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>Customer Name *</label>
                    <input
                      type="text"
                      name="customerName"
                      placeholder="e.g. John Doe / Fleet Corp"
                      value={formData.customerName}
                      onChange={(e) => handleCustomerInfoChange("customerName", e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>Invoice Number *</label>
                    <input
                      type="text"
                      name="invoiceNumber"
                      placeholder="e.g. INV-2026-001"
                      value={formData.invoiceNumber}
                      onChange={(e) => handleCustomerInfoChange("invoiceNumber", e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* ===== 2. Products Section Header ===== */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>
                    Battery Products
                  </span>
                  <span style={{ background: "#EFF6FF", color: "#1D4ED8", fontSize: "12px", fontWeight: 700, padding: "2px 8px", borderRadius: "10px", border: "1px solid #BFDBFE" }}>
                    {formData.products.length} {formData.products.length === 1 ? "Product" : "Products"}
                  </span>
                </div>
                <button
                  type="button"
                  id="add-product-btn"
                  onClick={handleAddProduct}
                  style={{
                    background: "#2563EB",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: "8px",
                    padding: "7px 14px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 1px 2px rgba(37,99,235,0.2)"
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Add Product
                </button>
              </div>

              {/* ===== 3. Product Cards List ===== */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "16px" }}>
                {formData.products.map((item, idx) => {
                  const productTitle = item.selectedMadeProduct === "Other"
                    ? (item.customMadeProduct || "Custom Battery")
                    : (item.selectedMadeProduct || "EV Battery");
                  const hasSpecs = item.voltage || item.capacity;

                  return (
                    <div
                      key={item.id || idx}
                      style={{
                        background: "#FFFFFF",
                        border: "1px solid #CBD5E1",
                        borderRadius: "12px",
                        padding: "16px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
                      }}
                    >
                      {/* Product Card Header */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          paddingBottom: item.isExpanded ? "12px" : "0",
                          borderBottom: item.isExpanded ? "1px solid #F1F5F9" : "none",
                          marginBottom: item.isExpanded ? "14px" : "0"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                          <span style={{ background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE", borderRadius: "6px", padding: "3px 8px", fontSize: "12px", fontWeight: 700 }}>
                            Product #{idx + 1}
                          </span>
                          <span style={{ fontSize: "13px", fontWeight: 600, color: "#1E293B" }}>
                            {productTitle}
                            {hasSpecs && ` (${item.voltage || "-"}V ${item.capacity || "-"}Ah ${item.chemistry || ""})`}
                          </span>
                          <span style={{ fontSize: "12px", background: "#F1F5F9", color: "#475569", padding: "2px 8px", borderRadius: "6px", fontWeight: 600 }}>
                            Qty: {item.quantity || 1}
                          </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <button
                            type="button"
                            onClick={() => handleToggleExpandProduct(idx)}
                            style={{
                              background: "#F8FAFC",
                              color: "#475569",
                              border: "1px solid #CBD5E1",
                              borderRadius: "6px",
                              padding: "4px 10px",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer"
                            }}
                          >
                            {item.isExpanded ? "Collapse" : "Edit"}
                          </button>
                          {formData.products.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveProduct(idx)}
                              style={{
                                background: "#FEF2F2",
                                color: "#EF4444",
                                border: "1px solid #FECACA",
                                borderRadius: "6px",
                                padding: "4px 10px",
                                fontSize: "12px",
                                fontWeight: 600,
                                cursor: "pointer"
                              }}
                              title="Remove this product"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Product Card Body (when expanded) */}
                      {item.isExpanded && (
                        <div className="form-grid">
                          {/* Row 1: Product Catalog Auto-Fill Dropdown */}
                          <div className="form-group full-width" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", padding: "10px 12px", borderRadius: "8px", margin: "0 0 12px 0" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                              <label style={{ fontSize: "12px", fontWeight: 700, color: "#166534", margin: 0 }}>
                                Select from Product Catalog (Auto-fill specs)
                              </label>
                              {loadingCatalog && <span style={{ fontSize: "11px", color: "#15803D" }}>Loading catalog...</span>}
                            </div>
                            <select
                              value={item.catalogProductId || ""}
                              onChange={(e) => handleCatalogProductSelect(idx, e.target.value)}
                              style={{ background: "#FFFFFF", borderColor: "#86EFAC" }}
                            >
                              <option value="">-- Choose from Catalog or Enter Manually --</option>
                              {catalogProducts.map((p) => {
                                const pName = p.name || p.productName || p.title || "Unnamed Product";
                                const pSpecs = [
                                  p.voltage ? `${p.voltage}V` : "",
                                  p.capacity ? `${p.capacity}Ah` : "",
                                  p.chemistry ? p.chemistry : ""
                                ].filter(Boolean).join(" ");
                                return (
                                  <option key={p.id} value={p.id}>
                                    {pName} {pSpecs ? `(${pSpecs})` : ""}
                                  </option>
                                );
                              })}
                            </select>
                          </div>

                          {/* Row 2: Product Type & Custom Name */}
                          <div className="form-group">
                            <label>Product Category *</label>
                            <select
                              value={item.selectedMadeProduct || ""}
                              onChange={(e) => handleProductItemChange(idx, "selectedMadeProduct", e.target.value)}
                              required
                            >
                              <option value="" disabled>Select Made Product</option>
                              <option value="Solar Battery">Solar Battery</option>
                              <option value="EV Battery">EV Battery</option>
                              <option value="Inverter Battery">Inverter Battery</option>
                              <option value="Robotics Battery">Robotics Battery</option>
                              <option value="Defence Battery">Defence Battery</option>
                              <option value="Medical Battery">Medical Battery</option>
                              <option value="Strip Pump Battery">Spray pump battery</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>

                          <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                            <div>
                              <label>Quantity *</label>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity || 1}
                                onChange={(e) => handleProductItemChange(idx, "quantity", e.target.value)}
                                required
                              />
                            </div>
                            <div>
                              <label>Registration Type</label>
                              <select
                                value={item.mode || (item.quantity > 1 ? "series" : "single")}
                                onChange={(e) => handleProductItemChange(idx, "mode", e.target.value)}
                              >
                                <option value="single">Single Unit</option>
                                <option value="series">Bulk / Series Range</option>
                              </select>
                            </div>
                          </div>

                          {item.selectedMadeProduct === "Other" && (
                            <div className="form-group full-width">
                              <label>Custom Battery Name *</label>
                              <input
                                type="text"
                                placeholder="Enter custom battery name"
                                value={item.customMadeProduct || ""}
                                onChange={(e) => handleProductItemChange(idx, "customMadeProduct", e.target.value)}
                                required
                              />
                            </div>
                          )}

                          {/* Row 3: Product Description specs (Voltage, Capacity, Chemistry) */}
                          <div className="form-group full-width">
                            <label>Product Specifications (V, Ah, Chemistry)</label>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", overflowX: "auto" }}>
                              <input
                                type="number"
                                placeholder="V"
                                value={item.voltage || ""}
                                onChange={(e) => handleProductItemChange(idx, "voltage", e.target.value)}
                                min="0"
                                style={{ width: "65px", padding: "8px 8px", border: "1px solid #D1D5DB", borderRadius: "8px", fontSize: "13px", outline: "none", boxSizing: "border-box", textAlign: "center" }}
                              />
                              <span style={{ fontWeight: 600, color: "#374151", fontSize: "14px" }}>V</span>
                              <input
                                type="number"
                                placeholder="Ah"
                                value={item.capacity || ""}
                                onChange={(e) => handleProductItemChange(idx, "capacity", e.target.value)}
                                min="0"
                                style={{ width: "65px", padding: "8px 8px", border: "1px solid #D1D5DB", borderRadius: "8px", fontSize: "13px", outline: "none", boxSizing: "border-box", textAlign: "center" }}
                              />
                              <span style={{ fontWeight: 600, color: "#374151", fontSize: "14px" }}>Ah</span>
                              <span style={{ fontWeight: 600, color: "#374151", fontSize: "14px", marginLeft: "16px" }}>Chemistry:</span>
                              <select
                                value={item.chemistry || "NMC"}
                                onChange={(e) => handleProductItemChange(idx, "chemistry", e.target.value)}
                                style={{
                                  width: "130px",
                                  padding: "8px 12px",
                                  border: "1px solid #D1D5DB",
                                  borderRadius: "8px",
                                  fontSize: "13px",
                                  outline: "none",
                                  background: "#fff",
                                  cursor: "pointer"
                                }}
                              >
                                <option value="NMC">NMC</option>
                                <option value="LiFePO4">LiFePO4</option>
                              </select>
                            </div>
                            {(item.voltage || item.capacity) && (
                              <div style={{ marginTop: "6px", fontSize: "12px", color: "#6B7280" }}>
                                Preview:{" "}
                                <strong style={{ color: "#111827" }}>
                                  {item.voltage}V {item.capacity}Ah Chemistry = {item.chemistry || "NMC"}
                                </strong>
                              </div>
                            )}
                          </div>

                          {/* Row 4: Barcode / Range */}
                          {item.mode === "single" && item.quantity === 1 ? (
                            <div className="form-group full-width">
                              <label>Barcode / Serial Number *</label>
                              <input
                                type="text"
                                placeholder="e.g. BAT001"
                                value={item.barcode || ""}
                                onChange={(e) => handleProductItemChange(idx, "barcode", e.target.value)}
                                required
                              />
                            </div>
                          ) : (
                            <>
                              <div className="form-group">
                                <label>Start Barcode *</label>
                                <input
                                  type="text"
                                  placeholder="e.g. BAT001"
                                  value={item.startBarcode || ""}
                                  onChange={(e) => handleProductItemChange(idx, "startBarcode", e.target.value)}
                                  required
                                />
                              </div>
                              <div className="form-group">
                                <label>End Barcode *</label>
                                <input
                                  type="text"
                                  placeholder="e.g. BAT005"
                                  value={item.endBarcode || ""}
                                  onChange={(e) => handleProductItemChange(idx, "endBarcode", e.target.value)}
                                  required
                                />
                              </div>
                            </>
                          )}

                          {/* Row 5: Warranty Start Date, Full Warranty, Service Warranty */}
                          <div className="form-group">
                            <label>Warranty Start Date *</label>
                            <input
                              type="date"
                              value={item.warrantyStartDate || ""}
                              onChange={(e) => handleProductItemChange(idx, "warrantyStartDate", e.target.value)}
                              required
                            />
                          </div>

                          <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                            <div>
                              <label>Full Warranty (Years)</label>
                              <input
                                type="number"
                                min="0"
                                value={item.fullWarrantyYears}
                                onChange={(e) => handleProductItemChange(idx, "fullWarrantyYears", e.target.value)}
                                required
                              />
                            </div>
                            <div>
                              <label>Full Warranty (Months)</label>
                              <input
                                type="number"
                                min="0"
                                max="11"
                                value={item.fullWarrantyMonths}
                                onChange={(e) => handleProductItemChange(idx, "fullWarrantyMonths", e.target.value)}
                                required
                              />
                            </div>
                          </div>

                          <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                            <div>
                              <label>Service Warranty (Years)</label>
                              <input
                                type="number"
                                min="0"
                                value={item.serviceWarrantyYears}
                                onChange={(e) => handleProductItemChange(idx, "serviceWarrantyYears", e.target.value)}
                                required
                              />
                            </div>
                            <div>
                              <label>Service Warranty (Months)</label>
                              <input
                                type="number"
                                min="0"
                                max="11"
                                value={item.serviceWarrantyMonths}
                                onChange={(e) => handleProductItemChange(idx, "serviceWarrantyMonths", e.target.value)}
                                required
                              />
                            </div>
                          </div>

                          <div className="form-group">
                            <label>Total Warranty (Auto Calculated)</label>
                            <input
                              type="text"
                              value={calculateExpiryAndTotal(
                                item.warrantyStartDate,
                                item.fullWarrantyYears,
                                item.fullWarrantyMonths,
                                item.serviceWarrantyYears,
                                item.serviceWarrantyMonths
                              ).totalWarrantyLabel}
                              readOnly
                              style={{ background: "#f5f5f5", cursor: "not-allowed" }}
                            />
                          </div>

                          <div className="form-group full-width">
                            <label>Warranty Expiry Date (Auto Calculated)</label>
                            <input
                              type="date"
                              value={item.warrantyEndDate || ""}
                              readOnly
                              required
                              style={{ background: "#f5f5f5", cursor: "not-allowed" }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom Add Product Button */}
              <button
                type="button"
                onClick={handleAddProduct}
                style={{
                  width: "100%",
                  background: "#F8FAFC",
                  border: "2px dashed #93C5FD",
                  color: "#2563EB",
                  borderRadius: "10px",
                  padding: "12px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  marginBottom: "20px"
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                + Add Another Product
              </button>

              <div className="form-actions">
                <button type="button" className="action-btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="maint-btn" disabled={registerLoading}>
                  {registerLoading ? "Registering All..." : `Register All Products (${formData.products.length})`}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto' }}>
                    <input
                      type="number"
                      placeholder="V"
                      value={editFormData.voltage}
                      onChange={(e) => setEditFormData({ ...editFormData, voltage: e.target.value })}
                      min="0"
                      style={{ width: '60px', padding: '8px 8px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', textAlign: 'center' }}
                    />
                    <span style={{ fontWeight: 600, color: '#374151', fontSize: '14px' }}>V</span>
                    <input
                      type="number"
                      placeholder="Ah"
                      value={editFormData.capacity}
                      onChange={(e) => setEditFormData({ ...editFormData, capacity: e.target.value })}
                      min="0"
                      style={{ width: '60px', padding: '8px 8px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', textAlign: 'center' }}
                    />
                    <span style={{ fontWeight: 600, color: '#374151', fontSize: '14px' }}>Ah</span>
                    <span style={{ fontWeight: 600, color: '#374151', fontSize: '14px', marginLeft: '16px' }}>Chemistry =</span>
                    <select
                      value={editFormData.chemistry}
                      onChange={(e) => setEditFormData({ ...editFormData, chemistry: e.target.value })}
                      style={{ padding: '8px 12px', border: '1px solid #000000ff', borderRadius: '8px', fontSize: '13px', outline: 'none', background: '#fff', cursor: 'pointer' }}
                    >
                      <option value="NMC">NMC</option>
                      <option value="LiFePO4">LiFePO4</option>
                    </select>
                  </div>
                  {(editFormData.voltage || editFormData.capacity) && (
                    <div style={{ marginTop: '6px', fontSize: '12px', color: '#6B7280' }}>
                      Preview: <strong style={{ color: '#111827' }}>{editFormData.voltage}V {editFormData.capacity}Ah Chemistry = {editFormData.chemistry}</strong>
                    </div>
                  )}
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

                <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label>Full Warranty (Years)</label>
                    <input
                      type="number"
                      min="0"
                      value={editFormData.fullWarrantyYears}
                      onChange={(e) => handleEditFormChange("fullWarrantyYears", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label>Full Warranty (Months)</label>
                    <input
                      type="number"
                      min="0"
                      max="11"
                      value={editFormData.fullWarrantyMonths}
                      onChange={(e) => handleEditFormChange("fullWarrantyMonths", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label>Service Warranty (Years)</label>
                    <input
                      type="number"
                      min="0"
                      value={editFormData.serviceWarrantyYears}
                      onChange={(e) => handleEditFormChange("serviceWarrantyYears", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label>Service Warranty (Months)</label>
                    <input
                      type="number"
                      min="0"
                      max="11"
                      value={editFormData.serviceWarrantyMonths}
                      onChange={(e) => handleEditFormChange("serviceWarrantyMonths", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Total Warranty (Auto Calculated)</label>
                  <input
                    type="text"
                    value={calculateExpiryAndTotal(
                      editFormData.warrantyStartDate,
                      editFormData.fullWarrantyYears,
                      editFormData.fullWarrantyMonths,
                      editFormData.serviceWarrantyYears,
                      editFormData.serviceWarrantyMonths
                    ).totalWarrantyLabel}
                    readOnly
                    style={{ background: "#f5f5f5", cursor: "not-allowed" }}
                  />
                </div>

                <div className="form-group">
                  <label>Warranty Expiry Date (Auto Calculated)</label>
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
                  const targetIds = deleteTarget.originalBatteries.map(orig => orig.id);
                  const targetBarcodes = deleteTarget.originalBatteries.map(orig => String(orig.barcode || ""));

                  const newDeletedIds = [...deletedIds, ...targetIds];
                  const newDeletedBarcodes = [...deletedBarcodes, ...targetBarcodes];

                  setDeletedIds(newDeletedIds);
                  setDeletedBarcodes(newDeletedBarcodes);

                  localStorage.setItem("battery_inventory_deleted_ids", JSON.stringify(newDeletedIds));
                  localStorage.setItem("battery_inventory_deleted_barcodes", JSON.stringify(newDeletedBarcodes));

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

      {/* ===== Excel Uploading Overlay ===== */}
      {excelUploading && (
        <div className="excel-uploading-overlay">
          <div className="excel-uploading-card">
            <div className="excel-uploading-spinner" />
            <p className="excel-uploading-text">Uploading Excel File…</p>
            <p className="excel-uploading-subtext">Please wait while your file is being processed.<br />This may take a few moments.</p>
          </div>
        </div>
      )}

      {/* ===== Excel Upload Result Modal ===== */}
      {excelUploadResult && (
        <div className="excel-modal-overlay" onClick={handleExcelUploadResult}>
          <div className="excel-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="excel-modal-header">
              <h3 className="excel-modal-title">
                {excelUploadResult.success ? "✅ Bulk Upload Complete" : "⚠️ Upload Result"}
              </h3>
              <button
                type="button"
                className="excel-modal-close-btn"
                onClick={handleExcelUploadResult}
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Success / Error Alert */}
            {excelUploadResult.success ? (
              <div className="excel-alert-success">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Battery data uploaded successfully! The battery list has been refreshed.
              </div>
            ) : (
              <div className="excel-alert-error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>
                  {excelUploadResult.error || "Upload failed. Please review the details below and try again."}
                </span>
              </div>
            )}

            {/* Summary Statistics */}
            {excelUploadResult.data && (
              <>
                {(excelUploadResult.data.totalRowsProcessed !== undefined ||
                  excelUploadResult.data.successCount !== undefined ||
                  excelUploadResult.data.skippedCount !== undefined) && (
                    <div className="excel-summary-grid">
                      {excelUploadResult.data.totalRowsProcessed !== undefined && (
                        <div className="excel-summary-card">
                          <span className="excel-summary-label">Total Rows Processed</span>
                          <span className="excel-summary-value">
                            {excelUploadResult.data.totalRowsProcessed ?? 0}
                          </span>
                        </div>
                      )}
                      {excelUploadResult.data.successCount !== undefined && (
                        <div className="excel-summary-card">
                          <span className="excel-summary-label">Success Count</span>
                          <span className="excel-summary-value success-color">
                            {excelUploadResult.data.successCount ?? 0}
                          </span>
                        </div>
                      )}
                      {excelUploadResult.data.skippedCount !== undefined && (
                        <div className="excel-summary-card">
                          <span className="excel-summary-label">Skipped Count</span>
                          <span className="excel-summary-value skip-color">
                            {excelUploadResult.data.skippedCount ?? 0}
                          </span>
                        </div>
                      )}
                      {excelUploadResult.data.errors !== undefined && (
                        <div className="excel-summary-card">
                          <span className="excel-summary-label">Error Count</span>
                          <span className="excel-summary-value error-color">
                            {Array.isArray(excelUploadResult.data.errors)
                              ? excelUploadResult.data.errors.length
                              : 0}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                {/* Registered Batteries Table */}
                {Array.isArray(excelUploadResult.data.registeredBatteries) &&
                  excelUploadResult.data.registeredBatteries.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <p className="excel-error-section-title">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Registered Batteries ({excelUploadResult.data.registeredBatteries.length})
                      </p>
                      <div className="excel-registered-table-wrapper">
                        <table className="excel-registered-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Barcode</th>
                              <th>Customer Name</th>
                              <th>Invoice Number</th>
                            </tr>
                          </thead>
                          <tbody>
                            {excelUploadResult.data.registeredBatteries.map((bat, idx) => (
                              <tr key={idx}>
                                <td style={{ color: '#6B7280', fontWeight: 500 }}>{idx + 1}</td>
                                <td style={{ fontWeight: 600 }}>{bat.barcode || bat.serialNumber || "-"}</td>
                                <td>{bat.customerName || "-"}</td>
                                <td>{bat.invoiceNumber || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                {/* Errors Table */}
                {Array.isArray(excelUploadResult.data.errors) &&
                  excelUploadResult.data.errors.length > 0 && (
                    <div>
                      <p className="excel-error-section-title">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="8" x2="12" y2="12"></line>
                          <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        Errors ({excelUploadResult.data.errors.length})
                      </p>
                      <div className="excel-error-table-wrapper">
                        <table className="excel-error-table">
                          <thead>
                            <tr>
                              <th>Row #</th>
                              <th>Barcode</th>
                              <th>Error Message</th>
                            </tr>
                          </thead>
                          <tbody>
                            {excelUploadResult.data.errors.map((err, idx) => (
                              <tr key={idx}>
                                <td style={{ fontWeight: 600, color: '#DC2626', whiteSpace: 'nowrap' }}>
                                  {err.rowNumber ?? err.row ?? (idx + 1)}
                                </td>
                                <td style={{ fontWeight: 500 }}>
                                  {err.barcode || err.serialNumber || err.barcodeNumber || "-"}
                                </td>
                                <td>{err.errorMessage || err.message || err.error || err.reason || String(err)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
              </>
            )}

            <div className="form-actions" style={{ marginTop: 24, borderTop: '1px solid #E5E7EB', paddingTop: 20 }}>
              <button
                type="button"
                className="action-btn"
                onClick={handleExcelUploadResult}
              >
                Close
              </button>
              <button
                type="button"
                className="upload-excel-btn"
                style={{ borderRadius: 8 }}
                onClick={() => {
                  handleExcelUploadResult();
                  setTimeout(() => {
                    setExcelFileError(null);
                    excelFileInputRef.current && excelFileInputRef.current.click();
                  }, 100);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                Upload Another File
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
      String(battery.customerName || ""),
      String(battery.productDetails || ""),
      String(battery.invoiceNumber || ""),
      String(battery.warrantyStartDate || ""),
      String(battery.warrantyEndDate || ""),
      battery.fullWarrantyActive ? "full-active" : "full-inactive",
      battery.serviceWarrantyActive ? "srv-active" : "srv-inactive",
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
    const serialStr = String(serial);
    const match = serialStr.match(/^([a-zA-Z_-]*)(0*)(\d+)$/);
    if (!match) return null;
    return {
      prefix: match[1],
      padding: match[2],
      num: parseInt(match[3], 10),
      numStr: match[3],
      original: serialStr
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
