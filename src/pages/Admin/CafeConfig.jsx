import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import totalIcon from "../../assets/icons/stationicon/Vector.svg";
import activeIcon from "../../assets/icons/stationicon/green.svg";
import uptimeIcon from "../../assets/icons/stationicon/yellow.svg";
import editIcon from "../../assets/icons/stationicon/edit.svg";
import deleteIcon from "../../assets/icons/stationicon/red.svg";
import plusIcon from "../../assets/icons/stafficon/plus.svg";

const LoadingSpinner = () => (
  <div className="loading-spinner">
    <div className="spinner"></div>
    <p>Loading café configurations...</p>
  </div>
);

const Modal = ({ children, onClose }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      {children}
    </div>
  </div>
);

export default function CafeConfig({ baseUrl }) {
  const navigate = useNavigate();
  const [cafes, setCafes] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Section states
  const [activeTab, setActiveTab] = useState("Cafe");
  const [addSectionType, setAddSectionType] = useState("Cafe");
  const [editSectionType, setEditSectionType] = useState("Cafe");
  const [isAddDropdownOpen, setIsAddDropdownOpen] = useState(false);

  // Helper functions to manage sections
  const getSectionFromCafe = (cafe) => {
    if (cafe && cafe.category) {
      const cat = cafe.category.trim().toLowerCase();
      if (cat === "restaurant") return "Restaurant";
      if (cat === "mall") return "Mall";
      return "Cafe";
    }
    // Fallback to name prefix check for backward compatibility with prefix-tagged items
    if (cafe && cafe.name) {
      if (cafe.name.startsWith("[Restaurant] ")) return "Restaurant";
      if (cafe.name.startsWith("[Mall] ")) return "Mall";
    }
    return "Cafe";
  };

  const getCleanName = (name) => {
    if (!name) return "";
    if (name.startsWith("[Cafe] ")) return name.slice(7);
    if (name.startsWith("[Restaurant] ")) return name.slice(13);
    if (name.startsWith("[Mall] ")) return name.slice(7);
    return name;
  };

  // Modal control states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCafe, setSelectedCafe] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    stationId: "",
    name: "",
    address: "",
    latitude: "",
    longitude: "",
    rating: "5.0", // Maps to Ranking Priority
    isOpen: true,
    googleMapLocation: "",
    googleMapImageUrl: "",
    category: "Cafe",
  });

  const [formErrors, setFormErrors] = useState({});
  const [formSubmitting, setFormSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/");
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      try {
        // Fetch All Admin Cafes
        const cafeRes = await fetch(`${baseUrl}/cafes/all`, { headers });
        if (cafeRes.status === 401 || cafeRes.status === 403) {
          localStorage.removeItem("token");
          navigate("/");
          return;
        }

        const cafeData = await cafeRes.json();
        // The café with the highest ranking (rating) should display first.
        // We sort descending by rating.
        const sortedCafes = Array.isArray(cafeData)
          ? cafeData.sort((a, b) => (b.rating || 0) - (a.rating || 0))
          : [];
        setCafes(sortedCafes);

        // Fetch Stations for the dropdown
        const stationRes = await fetch(`${baseUrl}/stations/all`, { headers });
        if (stationRes.ok) {
          const stationData = await stationRes.json();
          setStations(Array.isArray(stationData) ? stationData : []);
          if (stationData.length > 0 && !formData.stationId) {
            setFormData((prev) => ({ ...prev, stationId: stationData[0].id }));
          }
        }
      } catch (error) {
        console.error("Error fetching café/station data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [baseUrl, navigate, refreshKey]);

  // Handle open Add Modal
  const openAddModal = (type = "Cafe") => {
    setAddSectionType(type);
    setFormData({
      stationId: stations.length > 0 ? stations[0].id.toString() : "",
      name: "",
      address: "",
      latitude: "",
      longitude: "",
      rating: "5.0",
      isOpen: true,
      googleMapLocation: "",
      googleMapImageUrl: "",
      category: type,
    });
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  // Handle open Edit Modal
  const openEditModal = (cafe) => {
    setSelectedCafe(cafe);
    const type = getSectionFromCafe(cafe);
    setEditSectionType(type);
    setFormData({
      stationId: cafe.stationId ? cafe.stationId.toString() : "",
      name: getCleanName(cafe.name),
      address: cafe.address || "",
      latitude: cafe.latitude ? cafe.latitude.toString() : "",
      longitude: cafe.longitude ? cafe.longitude.toString() : "",
      rating: cafe.rating ? cafe.rating.toString() : "5.0",
      isOpen: cafe.openNow !== undefined ? cafe.openNow : true,
      googleMapLocation: cafe.googleMapsUri || "",
      googleMapImageUrl: cafe.googleMapImageUrl || "",
      category: type,
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  // Form Input Change Handler
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Validate the Form Data
  const validateForm = () => {
    const errors = {};
    const sectionName = (isEditModalOpen ? editSectionType : addSectionType) === "Cafe" ? "Café" : (isEditModalOpen ? editSectionType : addSectionType);
    if (!formData.name.trim()) errors.name = `${sectionName} Name is required`;
    if (!formData.address.trim()) errors.address = "Address is required";
    if (!formData.stationId) errors.stationId = "Associated Station is required";
    if (!formData.category) errors.category = "Category is required";

    const latVal = parseFloat(formData.latitude);
    if (isNaN(latVal) || latVal < -90 || latVal > 90) {
      errors.latitude = "Latitude must be a valid number between -90 and 90";
    }

    const lngVal = parseFloat(formData.longitude);
    if (isNaN(lngVal) || lngVal < -180 || lngVal > 180) {
      errors.longitude = "Longitude must be a valid number between -180 and 180";
    }

    const ratingVal = parseFloat(formData.rating);
    if (isNaN(ratingVal) || ratingVal < 0) {
      errors.rating = "Ranking priority must be a valid positive number";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Create Café/Section Submission
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setFormSubmitting(true);
    const token = localStorage.getItem("token");

    const payload = {
      stationId: parseInt(formData.stationId),
      name: formData.name.trim(),
      googleMapLocation: formData.googleMapLocation,
      googleMapImageUrl: formData.googleMapImageUrl,
      rating: parseFloat(formData.rating),
      isOpen: formData.isOpen,
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      address: formData.address,
      category: formData.category,
    };

    try {
      const res = await fetch(`${baseUrl}/cafes/add`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        setActiveTab(formData.category); // Switch to added category tab
        setRefreshKey((prev) => prev + 1);
      } else {
        const errorData = await res.json();
        alert(errorData.error || `Failed to create ${formData.category.toLowerCase()}`);
      }
    } catch (err) {
      console.error(`Error creating ${formData.category.toLowerCase()}:`, err);
      alert("An unexpected error occurred.");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Update Café/Section Submission
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setFormSubmitting(true);
    const token = localStorage.getItem("token");

    const payload = {
      stationId: parseInt(formData.stationId),
      name: formData.name.trim(),
      googleMapLocation: formData.googleMapLocation,
      googleMapImageUrl: formData.googleMapImageUrl,
      rating: parseFloat(formData.rating),
      isOpen: formData.isOpen,
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      address: formData.address,
      category: formData.category,
    };

    try {
      const res = await fetch(`${baseUrl}/cafes/update/${selectedCafe.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsEditModalOpen(false);
        setSelectedCafe(null);
        setRefreshKey((prev) => prev + 1);
      } else {
        const errorData = await res.json();
        alert(errorData.error || `Failed to update ${formData.category.toLowerCase()}`);
      }
    } catch (err) {
      console.error(`Error updating ${formData.category.toLowerCase()}:`, err);
      alert("An unexpected error occurred.");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Toggle active/isOpen state directly from table
  const handleToggleActiveState = async (cafe) => {
    const token = localStorage.getItem("token");
    const payload = {
      stationId: cafe.stationId,
      name: cafe.name,
      googleMapLocation: cafe.googleMapsUri,
      googleMapImageUrl: cafe.googleMapImageUrl,
      rating: cafe.rating,
      isOpen: !cafe.openNow, // Toggle state
      latitude: cafe.latitude,
      longitude: cafe.longitude,
      address: cafe.address,
      category: cafe.category,
    };

    try {
      const res = await fetch(`${baseUrl}/cafes/update/${cafe.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setRefreshKey((prev) => prev + 1);
      } else {
        alert("Failed to update status");
      }
    } catch (err) {
      console.error("Error toggling status:", err);
    }
  };

  // Delete Café/Section configuration
  const handleDeleteCafe = async (cafe) => {
    const sectionName = getSectionFromCafe(cafe) === "Cafe" ? "café" : getSectionFromCafe(cafe).toLowerCase();
    if (!window.confirm(`Are you sure you want to delete this ${sectionName} configuration?`)) return;

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${baseUrl}/cafes/delete/${cafe.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setRefreshKey((prev) => prev + 1);
      } else {
        alert(`Failed to delete ${sectionName}`);
      }
    } catch (error) {
      console.error(`Error deleting ${sectionName}:`, error);
    }
  };

  // Filter cafes by the active section type
  const sectionCafes = cafes.filter(
    (cafe) => getSectionFromCafe(cafe) === activeTab
  );

  // Filtering for local table search
  const filteredCafes = sectionCafes.filter(
    (cafe) =>
      (getCleanName(cafe.name) || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cafe.address || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cafe.stationName || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Statistics calculation for the active section type
  const totalCount = sectionCafes.length;
  const activeCount = sectionCafes.filter((c) => c.openNow).length;
  const highestRanked = sectionCafes.length > 0 ? sectionCafes[0] : null;

  return (
    <>
      <style>
        {`
          .cafes-page-container {
            padding: 30px;
            font-family: 'Roboto', sans-serif;
            background-color: #F3F4F6;
            min-height: 100vh;
          }
          .page-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
          }
          .page-header h1 {
            font-size: 26px;
            font-weight: 700;
            color: #111;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .loading-spinner {
            text-align: center;
            padding: 100px 50px;
            font-size: 16px;
            color: #555;
          }
          .spinner {
            border: 4px solid rgba(0, 0, 0, 0.1);
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border-left-color: #000;
            animation: spin 1s linear infinite;
            margin: 0 auto 16px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .modal-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background-color: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }
          .modal-content {
            background-color: white;
            border-radius: 20px;
            width: 90%;
            max-width: 650px;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
            box-shadow: 0 15px 40px rgba(0,0,0,0.15);
            animation: slideUp 0.25s ease-out;
            padding: 30px;
            font-family: 'Lexend', sans-serif;
          }
          @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          .summary-cards-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 30px;
          }
          .summary-card {
            background-color: white;
            border-radius: 16px;
            padding: 20px 24px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            box-shadow: 0 2px 8px rgba(0,0,0,0.02);
            min-height: 120px;
            border: 1px solid #E5E7EB;
            transition: transform 0.2s, box-shadow 0.2s;
          }
          .summary-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          }
          .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
            margin-bottom: 8px;
          }
          .card-title {
            font-size: 13px;
            color: #666;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .card-icon {
            width: 18px;
            height: 18px;
            opacity: 0.8;
          }
          .card-value {
            font-size: 28px;
            font-weight: 700;
            color: #111;
            line-height: 1.2;
            margin-bottom: 4px;
          }
          .card-subtext {
            font-size: 12px;
            color: #888;
            font-weight: 500;
          }
          .search-bar-container {
            display: flex;
            gap: 16px;
            margin-bottom: 24px;
            align-items: center;
            width: 100%;
          }
          .search-input-wrapper {
            flex: 1;
            background-color: #fff;
            border-radius: 24px;
            padding: 10px 20px;
            display: flex;
            align-items: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.02);
            border: 1px solid #E5E7EB;
          }
          .search-input {
            border: none;
            background: none;
            outline: none;
            width: 100%;
            font-size: 14px;
            margin-left: 10px;
            font-family: 'Lexend', sans-serif;
          }
          .create-btn {
            background-color: #000;
            color: #fff;
            border-radius: 24px;
            padding: 12px 28px;
            font-size: 13px;
            font-weight: 600;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: background-color 0.2s, transform 0.1s;
          }
          .create-btn:hover {
            background-color: #222;
            transform: translateY(-1px);
          }
          .create-btn:active {
            transform: translateY(0);
          }
          .create-plus {
            font-size: 18px;
            font-weight: 700;
            line-height: 0;
          }
          .cafes-list-section {
            background-color: #fff;
            border-radius: 18px;
            padding: 24px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.02);
            border: 1px solid #E5E7EB;
            font-family: 'Lexend', sans-serif;
          }
          .table-header {
            font-size: 18px;
            font-weight: 700;
            color: #111;
            margin: 0 0 20px 0;
          }
          .cafes-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
          }
          .table-th {
            font-size: 12px;
            font-weight: 700;
            color: #4B5563;
            text-transform: uppercase;
            padding: 12px 16px;
            border-bottom: 2px solid #E5E7EB;
            text-align: left;
            letter-spacing: 0.5px;
          }
          .table-row {
            font-size: 13px;
            color: #374151;
            transition: background-color 0.15s;
          }
          .table-row:hover {
            background-color: #F9FAFB;
          }
          .table-td {
            padding: 18px 16px;
            border-bottom: 1px solid #E5E7EB;
            vertical-align: middle;
          }
          .td-name {
            font-weight: 700;
            color: #111;
            font-size: 14px;
          }
          .td-station {
            color: #4B5563;
            font-weight: 500;
          }
          .status-toggle {
            cursor: pointer;
            border: none;
            background: none;
            padding: 0;
            display: inline-block;
          }
          .status-badge {
            display: inline-block;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 700;
            text-align: center;
            min-width: 90px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            transition: filter 0.2s;
          }
          .status-badge:hover {
            filter: brightness(0.95);
          }
          .status-active {
            background-color: #D1FAE5;
            color: #065F46;
          }
          .status-inactive {
            background-color: #FEE2E2;
            color: #991B1B;
          }
          .priority-badge {
            display: inline-block;
            background-color: #EEF2F6;
            color: #1E293B;
            font-weight: 700;
            padding: 4px 10px;
            border-radius: 8px;
            font-size: 12px;
          }
          .link-text {
            color: #2563EB;
            text-decoration: none;
            font-weight: 600;
            transition: color 0.15s;
          }
          .link-text:hover {
            color: #1D4ED8;
            text-decoration: underline;
          }
          .action-buttons {
            display: flex;
            gap: 12px;
            align-items: center;
          }
          .icon-btn {
            border: none;
            background: none;
            cursor: pointer;
            padding: 6px;
            border-radius: 8px;
            transition: background-color 0.15s;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .icon-btn:hover {
            background-color: #F3F4F6;
          }
          .icon-btn-delete:hover {
            background-color: #FEE2E2;
          }
          .icon-img {
            width: 15px;
            height: 15px;
          }
          .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #6B7280;
            font-size: 14px;
          }
          .empty-state p {
            margin: 0;
            font-weight: 500;
          }

          /* Form Styles */
          .form-header {
            margin-bottom: 24px;
          }
          .form-header h2 {
            font-size: 22px;
            font-weight: 700;
            margin: 0 0 6px 0;
            color: #111;
          }
          .form-header p {
            font-size: 13px;
            color: #666;
            margin: 0;
          }
          .form-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            margin-bottom: 24px;
          }
          .form-group-full {
            grid-column: span 2;
          }
          .form-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .form-label {
            font-size: 12px;
            font-weight: 700;
            color: #374151;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .form-input {
            padding: 12px 16px;
            border-radius: 12px;
            border: 1px solid #D1D5DB;
            font-size: 14px;
            outline: none;
            font-family: 'Lexend', sans-serif;
            background-color: #FAFAFA;
            transition: border-color 0.15s, background-color 0.15s;
          }
          .form-input:focus {
            border-color: #000;
            background-color: #fff;
          }
          .form-checkbox-group {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-top: 12px;
          }
          .form-checkbox {
            width: 18px;
            height: 18px;
            cursor: pointer;
            accent-color: #000;
          }
          .error-text {
            font-size: 11px;
            color: #DC2626;
            font-weight: 600;
            margin-top: 2px;
          }
          .form-actions {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            margin-top: 20px;
          }
          .btn-cancel {
            padding: 12px 28px;
            border-radius: 24px;
            border: 1px solid #D1D5DB;
            background-color: #fff;
            cursor: pointer;
            font-weight: 600;
            font-size: 13px;
            font-family: 'Lexend', sans-serif;
            transition: background-color 0.15s;
          }
          .btn-cancel:hover {
            background-color: #F9FAFB;
          }
          .btn-submit {
            padding: 12px 32px;
            border-radius: 24px;
            border: none;
            background-color: #000;
            color: #fff;
            cursor: pointer;
            font-weight: 600;
            font-size: 13px;
            font-family: 'Lexend', sans-serif;
            transition: background-color 0.15s;
          }
          .btn-submit:hover {
            background-color: #222;
          }
          .btn-submit:disabled {
            background-color: #9CA3AF;
            cursor: not-allowed;
          }

          /* Tabs styling */
          .tabs-wrapper {
            display: flex;
            gap: 12px;
            margin-bottom: 24px;
            background-color: #fff;
            padding: 6px;
            border-radius: 30px;
            border: 1px solid #E5E7EB;
            width: fit-content;
            box-shadow: 0 2px 4px rgba(0,0,0,0.02);
          }
          .tab-btn {
            border: none;
            background: none;
            padding: 10px 24px;
            font-size: 14px;
            font-weight: 600;
            color: #4B5563;
            border-radius: 24px;
            cursor: pointer;
            transition: all 0.2s ease;
            font-family: 'Lexend', sans-serif;
          }
          .tab-btn:hover {
            color: #111;
            background-color: #F3F4F6;
          }
          .tab-btn.active {
            background-color: #000;
            color: #fff;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          }

          /* Dropdown styling */
          .add-dropdown-container {
            position: relative;
            display: inline-block;
          }
          .dropdown-menu {
            position: absolute;
            top: calc(100% + 8px);
            right: 0;
            background-color: white;
            border-radius: 12px;
            border: 1px solid #E5E7EB;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            z-index: 100;
            min-width: 160px;
            padding: 6px;
            display: flex;
            flex-direction: column;
            gap: 4px;
            animation: fadeIn 0.15s ease-out;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-5px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .dropdown-item {
            border: none;
            background: none;
            text-align: left;
            padding: 10px 16px;
            font-size: 13px;
            font-weight: 600;
            color: #374151;
            border-radius: 8px;
            cursor: pointer;
            font-family: 'Lexend', sans-serif;
            transition: background-color 0.15s, color 0.15s;
          }
          .dropdown-item:hover {
            background-color: #F3F4F6;
            color: #111;
          }
        `}
      </style>

      <div className="cafes-page-container">
        {/* Modals */}
        {isAddModalOpen && (
          <Modal onClose={() => setIsAddModalOpen(false)}>
            <div className="form-header">
              <h2>Add {formData.category === 'Cafe' ? 'Café' : formData.category} Configuration</h2>
              <p>Configure a new {formData.category === 'Cafe' ? 'café' : formData.category.toLowerCase()} location and map it to an active charging station.</p>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="form-grid">
                <div className="form-group form-group-full">
                  <label className="form-label">Associated Station</label>
                  <select
                    className="form-input"
                    name="stationId"
                    value={formData.stationId}
                    onChange={handleInputChange}
                  >
                    {stations.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} (ID: {st.locationId || st.id})
                      </option>
                    ))}
                  </select>
                  {formErrors.stationId && <span className="error-text">{formErrors.stationId}</span>}
                </div>

                <div className="form-group form-group-full">
                  <label className="form-label">Category</label>
                  <select
                    className="form-input"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                  >
                    <option value="Cafe">Cafe</option>
                    <option value="Restaurant">Restaurant</option>
                    <option value="Mall">Mall</option>
                  </select>
                  {formErrors.category && <span className="error-text">{formErrors.category}</span>}
                </div>

                <div className="form-group form-group-full">
                  <label className="form-label">{formData.category === 'Cafe' ? 'Café' : formData.category} Name</label>
                  <input
                    type="text"
                    className="form-input"
                    name="name"
                    placeholder={`E.g. Antigravity ${formData.category === 'Cafe' ? 'Café' : formData.category} Lounge`}
                    value={formData.name}
                    onChange={handleInputChange}
                  />
                  {formErrors.name && <span className="error-text">{formErrors.name}</span>}
                </div>

                <div className="form-group form-group-full">
                  <label className="form-label">Address</label>
                  <input
                    type="text"
                    className="form-input"
                    name="address"
                    placeholder="Enter full physical address"
                    value={formData.address}
                    onChange={handleInputChange}
                  />
                  {formErrors.address && <span className="error-text">{formErrors.address}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Latitude</label>
                  <input
                    type="text"
                    className="form-input"
                    name="latitude"
                    placeholder="E.g. 19.0760"
                    value={formData.latitude}
                    onChange={handleInputChange}
                  />
                  {formErrors.latitude && <span className="error-text">{formErrors.latitude}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Longitude</label>
                  <input
                    type="text"
                    className="form-input"
                    name="longitude"
                    placeholder="E.g. 72.8777"
                    value={formData.longitude}
                    onChange={handleInputChange}
                  />
                  {formErrors.longitude && <span className="error-text">{formErrors.longitude}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Ranking Priority (Rating)</label>
                  <input
                    type="text"
                    className="form-input"
                    name="rating"
                    placeholder="E.g. 5.0"
                    value={formData.rating}
                    onChange={handleInputChange}
                  />
                  {formErrors.rating && <span className="error-text">{formErrors.rating}</span>}
                </div>

                <div className="form-group">
                  <div className="form-checkbox-group">
                    <input
                      type="checkbox"
                      className="form-checkbox"
                      id="isOpenAdd"
                      name="isOpen"
                      checked={formData.isOpen}
                      onChange={handleInputChange}
                    />
                    <label htmlFor="isOpenAdd" className="form-label" style={{ cursor: "pointer", marginTop: "3px" }}>
                      Is Open / Active
                    </label>
                  </div>
                </div>

                <div className="form-group form-group-full">
                  <label className="form-label">Google Maps Location URL</label>
                  <input
                    type="text"
                    className="form-input"
                    name="googleMapLocation"
                    placeholder="E.g. https://maps.google.com/?q=..."
                    value={formData.googleMapLocation}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group form-group-full">
                  <label className="form-label">Google Maps Image URL</label>
                  <input
                    type="text"
                    className="form-input"
                    name="googleMapImageUrl"
                    placeholder="Enter visual thumbnail URL (optional)"
                    value={formData.googleMapImageUrl}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={formSubmitting}>
                  {formSubmitting ? "Saving..." : `Add ${formData.category === 'Cafe' ? 'Café' : formData.category}`}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {isEditModalOpen && (
          <Modal onClose={() => setIsEditModalOpen(false)}>
            <div className="form-header">
              <h2>Edit {formData.category === 'Cafe' ? 'Café' : formData.category} Configuration</h2>
              <p>Modify the configuration, priority, or station mappings of this {formData.category === 'Cafe' ? 'café' : formData.category.toLowerCase()}.</p>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="form-grid">
                <div className="form-group form-group-full">
                  <label className="form-label">Associated Station</label>
                  <select
                    className="form-input"
                    name="stationId"
                    value={formData.stationId}
                    onChange={handleInputChange}
                  >
                    {stations.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} (ID: {st.locationId || st.id})
                      </option>
                    ))}
                  </select>
                  {formErrors.stationId && <span className="error-text">{formErrors.stationId}</span>}
                </div>

                <div className="form-group form-group-full">
                  <label className="form-label">Category</label>
                  <select
                    className="form-input"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                  >
                    <option value="Cafe">Cafe</option>
                    <option value="Restaurant">Restaurant</option>
                    <option value="Mall">Mall</option>
                  </select>
                  {formErrors.category && <span className="error-text">{formErrors.category}</span>}
                </div>

                <div className="form-group form-group-full">
                  <label className="form-label">{formData.category === 'Cafe' ? 'Café' : formData.category} Name</label>
                  <input
                    type="text"
                    className="form-input"
                    name="name"
                    placeholder={`E.g. Antigravity ${formData.category === 'Cafe' ? 'Café' : formData.category} Lounge`}
                    value={formData.name}
                    onChange={handleInputChange}
                  />
                  {formErrors.name && <span className="error-text">{formErrors.name}</span>}
                </div>

                <div className="form-group form-group-full">
                  <label className="form-label">Address</label>
                  <input
                    type="text"
                    className="form-input"
                    name="address"
                    placeholder="Enter full physical address"
                    value={formData.address}
                    onChange={handleInputChange}
                  />
                  {formErrors.address && <span className="error-text">{formErrors.address}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Latitude</label>
                  <input
                    type="text"
                    className="form-input"
                    name="latitude"
                    placeholder="E.g. 19.0760"
                    value={formData.latitude}
                    onChange={handleInputChange}
                  />
                  {formErrors.latitude && <span className="error-text">{formErrors.latitude}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Longitude</label>
                  <input
                    type="text"
                    className="form-input"
                    name="longitude"
                    placeholder="E.g. 72.8777"
                    value={formData.longitude}
                    onChange={handleInputChange}
                  />
                  {formErrors.longitude && <span className="error-text">{formErrors.longitude}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Ranking Priority (Rating)</label>
                  <input
                    type="text"
                    className="form-input"
                    name="rating"
                    placeholder="E.g. 5.0"
                    value={formData.rating}
                    onChange={handleInputChange}
                  />
                  {formErrors.rating && <span className="error-text">{formErrors.rating}</span>}
                </div>

                <div className="form-group">
                  <div className="form-checkbox-group">
                    <input
                      type="checkbox"
                      className="form-checkbox"
                      id="isOpenEdit"
                      name="isOpen"
                      checked={formData.isOpen}
                      onChange={handleInputChange}
                    />
                    <label htmlFor="isOpenEdit" className="form-label" style={{ cursor: "pointer", marginTop: "3px" }}>
                      Is Open / Active
                    </label>
                  </div>
                </div>

                <div className="form-group form-group-full">
                  <label className="form-label">Google Maps Location URL</label>
                  <input
                    type="text"
                    className="form-input"
                    name="googleMapLocation"
                    placeholder="E.g. https://maps.google.com/?q=..."
                    value={formData.googleMapLocation}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group form-group-full">
                  <label className="form-label">Google Maps Image URL</label>
                  <input
                    type="text"
                    className="form-input"
                    name="googleMapImageUrl"
                    placeholder="Enter visual thumbnail URL (optional)"
                    value={formData.googleMapImageUrl}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={formSubmitting}>
                  {formSubmitting ? "Saving..." : `Update ${formData.category === 'Cafe' ? 'Café' : formData.category}`}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* Page Header */}
        <div className="page-header">
          <h1>{activeTab === 'Cafe' ? 'Café' : activeTab} Configuration Settings</h1>
          <div className="add-dropdown-container">
            <button className="create-btn" onClick={() => setIsAddDropdownOpen(!isAddDropdownOpen)}>
              <span className="create-plus">+</span> Add Section <span style={{ fontSize: "10px", marginLeft: "4px" }}>▼</span>
            </button>
            {isAddDropdownOpen && (
              <div className="dropdown-menu">
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    openAddModal("Cafe");
                    setIsAddDropdownOpen(false);
                  }}
                >
                  Cafe
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    openAddModal("Restaurant");
                    setIsAddDropdownOpen(false);
                  }}
                >
                  Restaurant
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    openAddModal("Mall");
                    setIsAddDropdownOpen(false);
                  }}
                >
                  Mall
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tabs-wrapper">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'Cafe' ? 'active' : ''}`}
            onClick={() => setActiveTab("Cafe")}
          >
            Cafe
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'Restaurant' ? 'active' : ''}`}
            onClick={() => setActiveTab("Restaurant")}
          >
            Restaurant
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'Mall' ? 'active' : ''}`}
            onClick={() => setActiveTab("Mall")}
          >
            Mall
          </button>
        </div>

        {/* Summary Cards */}
        <div className="summary-cards-grid">
          <div className="summary-card">
            <div className="card-header">
              <span className="card-title">Total Configured {activeTab === 'Cafe' ? 'Cafés' : activeTab + 's'}</span>
              <img src={totalIcon} alt="" className="card-icon" />
            </div>
            <div>
              <div className="card-value">{totalCount}</div>
              <div className="card-subtext">Mapped stations around areas</div>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-header">
              <span className="card-title">Open / Active {activeTab === 'Cafe' ? 'Cafés' : activeTab + 's'}</span>
              <img src={activeIcon} alt="" className="card-icon" />
            </div>
            <div>
              <div className="card-value">{activeCount}</div>
              <div className="card-subtext">Currently active on app search</div>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-header">
              <span className="card-title">Top Priority {activeTab === 'Cafe' ? 'Café' : activeTab}</span>
              <img src={uptimeIcon} alt="" className="card-icon" />
            </div>
            <div>
              <div className="card-value" style={{ fontSize: "18px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {highestRanked ? getCleanName(highestRanked.name) : "N/A"}
              </div>
              <div className="card-subtext">
                {highestRanked ? `Rank priority: ${highestRanked.rating || 'N/A'}` : "Set priority in configuration"}
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="search-bar-container">
          <div className="search-input-wrapper">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder={`Search ${activeTab === 'Cafe' ? 'cafés' : activeTab === 'Restaurant' ? 'restaurants' : 'malls'} by Name, Station, or Address...`}
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* List Table Section */}
        <div className="cafes-list-section">
          <h3 className="table-header">{activeTab === 'Cafe' ? 'Café' : activeTab} Locations</h3>

          {loading ? (
            <LoadingSpinner />
          ) : filteredCafes.length === 0 ? (
            <div className="empty-state">
              <p>{searchTerm ? `No ${activeTab === 'Cafe' ? 'cafés' : activeTab.toLowerCase() + 's'} found matching "${searchTerm}"` : `No ${activeTab === 'Cafe' ? 'cafés' : activeTab.toLowerCase() + 's'} configured in the system.`}</p>
            </div>
          ) : (
            <table className="cafes-table">
              <thead>
                <tr>
                  <th className="table-th">{activeTab === 'Cafe' ? 'Café' : activeTab} Details</th>
                  <th className="table-th">Associated Station</th>
                  <th className="table-th" style={{ textAlign: "center" }}>Rank Priority</th>
                  <th className="table-th" style={{ textAlign: "center" }}>Status</th>
                  <th className="table-th">Directions</th>
                  <th className="table-th" style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCafes.map((cafe) => (
                  <tr key={cafe.id} className="table-row">
                    <td className="table-td">
                      <div className="td-name">{getCleanName(cafe.name)}</div>
                      <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "4px" }}>{cafe.address || "No address entered"}</div>
                    </td>
                    <td className="table-td td-station">
                      {cafe.stationName || `Station ID: ${cafe.stationId}`}
                    </td>
                    <td className="table-td" style={{ textAlign: "center" }}>
                      <span className="priority-badge">{cafe.rating || "0.0"}</span>
                    </td>
                    <td className="table-td" style={{ textAlign: "center" }}>
                      <button
                        className="status-toggle"
                        onClick={() => handleToggleActiveState(cafe)}
                        title="Click to toggle active status"
                      >
                        <span className={`status-badge ${cafe.openNow ? "status-active" : "status-inactive"}`}>
                          {cafe.openNow ? "Open" : "Closed"}
                        </span>
                      </button>
                    </td>
                    <td className="table-td">
                      {cafe.googleMapsUri ? (
                        <a href={cafe.googleMapsUri} target="_blank" rel="noopener noreferrer" className="link-text">
                          View on Maps
                        </a>
                      ) : (
                        <span style={{ color: "#9CA3AF", fontStyle: "italic" }}>No link</span>
                      )}
                    </td>
                    <td className="table-td" style={{ textAlign: "center" }}>
                      <div className="action-buttons" style={{ justifyContent: "center" }}>
                        <button className="icon-btn" onClick={() => openEditModal(cafe)} title="Edit Configuration">
                          <img src={editIcon} alt="Edit" className="icon-img" />
                        </button>
                        <button
                          className="icon-btn icon-btn-delete"
                          onClick={() => handleDeleteCafe(cafe)}
                          title="Delete Configuration"
                        >
                          <img src={deleteIcon} alt="Delete" className="icon-img" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
