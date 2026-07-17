import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import totalIcon from "../../assets/icons/stationicon/Vector.svg";
import activeIcon from "../../assets/icons/stationicon/green.svg";
import uptimeIcon from "../../assets/icons/stationicon/yellow.svg";
import editIcon from "../../assets/icons/stationicon/edit.svg";
import deleteIcon from "../../assets/icons/stationicon/red.svg";
import plusIcon from "../../assets/icons/stafficon/plus.svg";

// ── Shimmer Skeleton Loader ───────────────────────────────────────────────────
const LoadingSpinner = () => (
  <div style={{ padding: "8px 0" }}>
    {[...Array(5)].map((_, i) => (
      <div
        key={i}
        style={{
          height: "56px",
          borderRadius: "10px",
          marginBottom: "8px",
          background: "linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)",
          backgroundSize: "200% 100%",
          animation: `cc-shimmer 1.4s ease infinite`,
          animationDelay: `${i * 0.07}s`,
        }}
      />
    ))}
  </div>
);

// ── Premium Modal Component ───────────────────────────────────────────────────
const Modal = ({ children, onClose }) => (
  <div className="cc-modal-overlay" onClick={onClose}>
    <div className="cc-modal-content" onClick={(e) => e.stopPropagation()}>
      {children}
    </div>
  </div>
);

// ── Animated Counter ──────────────────────────────────────────────────────────
const AnimatedNumber = ({ value }) => {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const target = parseInt(value, 10) || 0;
    if (target === 0) { setCurrent(0); return; }
    let start = 0;
    const stepTime = Math.max(Math.floor(500 / target), 10);
    const timer = setInterval(() => {
      start += Math.ceil(target / 40);
      if (start >= target) { setCurrent(target); clearInterval(timer); }
      else setCurrent(start);
    }, stepTime);
    return () => clearInterval(timer);
  }, [value]);
  return <>{current}</>;
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function CafeConfig({ baseUrl }) {
  const navigate = useNavigate();

  // ── All state preserved exactly ───────────────────────────────────────────
  const [cafes, setCafes] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [activeTab, setActiveTab] = useState("Cafe");
  const [addSectionType, setAddSectionType] = useState("Cafe");
  const [editSectionType, setEditSectionType] = useState("Cafe");
  const [isAddDropdownOpen, setIsAddDropdownOpen] = useState(false);

  // ── All helper functions preserved exactly ────────────────────────────────
  const getSectionFromCafe = (cafe) => {
    if (cafe && cafe.category) {
      const cat = cafe.category.trim().toLowerCase();
      if (cat === "restaurant") return "Restaurant";
      if (cat === "mall") return "Mall";
      return "Cafe";
    }
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

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCafe, setSelectedCafe] = useState(null);

  const [formData, setFormData] = useState({
    stationId: "",
    name: "",
    address: "",
    latitude: "",
    longitude: "",
    rating: "5.0",
    isOpen: true,
    googleMapLocation: "",
    googleMapImageUrl: "",
    category: "Cafe",
  });

  const [formErrors, setFormErrors] = useState({});
  const [formSubmitting, setFormSubmitting] = useState(false);

  // ── All useEffects / API calls preserved exactly ──────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) { navigate("/"); return; }

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      try {
        const cafeRes = await fetch(`${baseUrl}/cafes/all`, { headers });
        if (cafeRes.status === 401 || cafeRes.status === 403) {
          localStorage.removeItem("token");
          navigate("/");
          return;
        }
        const cafeData = await cafeRes.json();
        const sortedCafes = Array.isArray(cafeData)
          ? cafeData.sort((a, b) => (b.rating || 0) - (a.rating || 0))
          : [];
        setCafes(sortedCafes);

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

  // ── All modal / form handlers preserved exactly ───────────────────────────
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

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validateForm = () => {
    const errors = {};
    const sectionName = (isEditModalOpen ? editSectionType : addSectionType) === "Cafe"
      ? "Café"
      : (isEditModalOpen ? editSectionType : addSectionType);
    if (!formData.name.trim()) errors.name = `${sectionName} Name is required`;
    if (!formData.address.trim()) errors.address = "Address is required";
    if (!formData.stationId) errors.stationId = "Associated Station is required";
    if (!formData.category) errors.category = "Category is required";
    const latVal = parseFloat(formData.latitude);
    if (isNaN(latVal) || latVal < -90 || latVal > 90)
      errors.latitude = "Latitude must be a valid number between -90 and 90";
    const lngVal = parseFloat(formData.longitude);
    if (isNaN(lngVal) || lngVal < -180 || lngVal > 180)
      errors.longitude = "Longitude must be a valid number between -180 and 180";
    const ratingVal = parseFloat(formData.rating);
    if (isNaN(ratingVal) || ratingVal < 0)
      errors.rating = "Ranking priority must be a valid positive number";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

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
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setIsAddModalOpen(false);
        setActiveTab(formData.category);
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
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
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

  const handleToggleActiveState = async (cafe) => {
    const token = localStorage.getItem("token");
    const payload = {
      stationId: cafe.stationId,
      name: cafe.name,
      googleMapLocation: cafe.googleMapsUri,
      googleMapImageUrl: cafe.googleMapImageUrl,
      rating: cafe.rating,
      isOpen: !cafe.openNow,
      latitude: cafe.latitude,
      longitude: cafe.longitude,
      address: cafe.address,
      category: cafe.category,
    };
    try {
      const res = await fetch(`${baseUrl}/cafes/update/${cafe.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) { setRefreshKey((prev) => prev + 1); }
      else { alert("Failed to update status"); }
    } catch (err) {
      console.error("Error toggling status:", err);
    }
  };

  const handleDeleteCafe = async (cafe) => {
    const sectionName = getSectionFromCafe(cafe) === "Cafe" ? "café" : getSectionFromCafe(cafe).toLowerCase();
    if (!window.confirm(`Are you sure you want to delete this ${sectionName} configuration?`)) return;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${baseUrl}/cafes/delete/${cafe.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) { setRefreshKey((prev) => prev + 1); }
      else { alert(`Failed to delete ${sectionName}`); }
    } catch (error) {
      console.error(`Error deleting ${sectionName}:`, error);
    }
  };

  // ── All filtering / computation preserved exactly ─────────────────────────
  const sectionCafes = cafes.filter((cafe) => getSectionFromCafe(cafe) === activeTab);
  const filteredCafes = sectionCafes.filter(
    (cafe) =>
      (getCleanName(cafe.name) || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cafe.address || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cafe.stationName || "").toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalCount = sectionCafes.length;
  const activeCount = sectionCafes.filter((c) => c.openNow).length;
  const highestRanked = sectionCafes.length > 0 ? sectionCafes[0] : null;
  const tabLabel = activeTab === "Cafe" ? "Café" : activeTab;
  const tabLabelPlural = activeTab === "Cafe" ? "Cafés" : activeTab + "s";

  // ── Reusable form fields shared between Add and Edit modals ───────────────
  const renderFormFields = () => (
    <div className="cc-form-grid">
      <div className="cc-form-group cc-full">
        <label className="cc-form-label">Associated Station</label>
        <select className="cc-form-input" name="stationId" value={formData.stationId} onChange={handleInputChange}>
          {stations.map((st) => (
            <option key={st.id} value={st.id}>{st.name} (ID: {st.locationId || st.id})</option>
          ))}
        </select>
        {formErrors.stationId && <span className="cc-error">{formErrors.stationId}</span>}
      </div>

      <div className="cc-form-group cc-full">
        <label className="cc-form-label">Category</label>
        <select className="cc-form-input" name="category" value={formData.category} onChange={handleInputChange}>
          <option value="Cafe">Cafe</option>
          <option value="Restaurant">Restaurant</option>
          <option value="Mall">Mall</option>
        </select>
        {formErrors.category && <span className="cc-error">{formErrors.category}</span>}
      </div>

      <div className="cc-form-group cc-full">
        <label className="cc-form-label">{formData.category === "Cafe" ? "Café" : formData.category} Name</label>
        <input
          type="text"
          className="cc-form-input"
          name="name"
          placeholder={`E.g. Antigravity ${formData.category === "Cafe" ? "Café" : formData.category} Lounge`}
          value={formData.name}
          onChange={handleInputChange}
        />
        {formErrors.name && <span className="cc-error">{formErrors.name}</span>}
      </div>

      <div className="cc-form-group cc-full">
        <label className="cc-form-label">Address</label>
        <input
          type="text"
          className="cc-form-input"
          name="address"
          placeholder="Enter full physical address"
          value={formData.address}
          onChange={handleInputChange}
        />
        {formErrors.address && <span className="cc-error">{formErrors.address}</span>}
      </div>

      <div className="cc-form-group">
        <label className="cc-form-label">Latitude</label>
        <input type="text" className="cc-form-input" name="latitude" placeholder="E.g. 19.0760" value={formData.latitude} onChange={handleInputChange} />
        {formErrors.latitude && <span className="cc-error">{formErrors.latitude}</span>}
      </div>

      <div className="cc-form-group">
        <label className="cc-form-label">Longitude</label>
        <input type="text" className="cc-form-input" name="longitude" placeholder="E.g. 72.8777" value={formData.longitude} onChange={handleInputChange} />
        {formErrors.longitude && <span className="cc-error">{formErrors.longitude}</span>}
      </div>

      <div className="cc-form-group">
        <label className="cc-form-label">Ranking Priority (Rating)</label>
        <input type="text" className="cc-form-input" name="rating" placeholder="E.g. 5.0" value={formData.rating} onChange={handleInputChange} />
        {formErrors.rating && <span className="cc-error">{formErrors.rating}</span>}
      </div>

      <div className="cc-form-group" style={{ display: "flex", alignItems: "flex-end" }}>
        <label className="cc-toggle-wrap">
          <div style={{ position: "relative", display: "inline-block", width: "44px", height: "24px" }}>
            <input
              type="checkbox"
              id={isEditModalOpen ? "isOpenEdit" : "isOpenAdd"}
              name="isOpen"
              checked={formData.isOpen}
              onChange={handleInputChange}
              style={{ opacity: 0, width: 0, height: 0, position: "absolute" }}
            />
            <span
              style={{
                position: "absolute", cursor: "pointer", inset: 0,
                background: formData.isOpen ? "#10b981" : "#D1D5DB",
                borderRadius: "24px",
                transition: "background 0.25s ease",
              }}
            />
            <span
              style={{
                position: "absolute",
                height: "18px", width: "18px",
                left: formData.isOpen ? "23px" : "3px",
                bottom: "3px",
                background: "#fff",
                borderRadius: "50%",
                transition: "left 0.25s ease",
                boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
              }}
            />
          </div>
          <span className="cc-form-label" style={{ cursor: "pointer", userSelect: "none", marginLeft: "10px" }}>
            Is Open / Active
          </span>
        </label>
      </div>

      <div className="cc-form-group cc-full">
        <label className="cc-form-label">Google Maps Location URL</label>
        <input type="text" className="cc-form-input" name="googleMapLocation" placeholder="E.g. https://maps.google.com/?q=..." value={formData.googleMapLocation} onChange={handleInputChange} />
      </div>

      <div className="cc-form-group cc-full">
        <label className="cc-form-label">Google Maps Image URL</label>
        <input type="text" className="cc-form-input" name="googleMapImageUrl" placeholder="Enter visual thumbnail URL (optional)" value={formData.googleMapImageUrl} onChange={handleInputChange} />
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── All Inline Styles ───────────────────────────────────────────── */}
      <style>{`
        /* ── Keyframes ────────────────────────────────────────────────── */
        @keyframes cc-fadeInPage {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes cc-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes cc-fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes cc-slideUp {
          from { opacity: 0; transform: scale(0.97) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        /* ── Page Container ───────────────────────────────────────────── */
        .cc-page {
          padding: 24px;
          font-family: 'Lexend', sans-serif;
          background-color: #F9FAFB;
          min-height: 100vh;
          animation: cc-fadeInPage 400ms ease-out forwards;
        }

        /* ── Page Header ──────────────────────────────────────────────── */
        .cc-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
          flex-wrap: wrap;
          gap: 16px;
        }
        .cc-header-left h2 {
          font-size: 28px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 4px 0;
        }
        .cc-header-left p {
          font-size: 13px;
          color: #6B7280;
          margin: 0;
        }
        .cc-header-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        /* ── Date Tabs (UI-only) ──────────────────────────────────────── */
        .cc-tab-group {
          display: flex;
          background: #F3F4F6;
          border-radius: 10px;
          padding: 3px;
          gap: 2px;
        }
        .cc-tab {
          border: none;
          background: transparent;
          color: #6B7280;
          font-size: 12px;
          font-weight: 600;
          padding: 7px 14px;
          border-radius: 8px;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .cc-tab:hover { color: #111827; }
        .cc-tab.active {
          background: #fff;
          color: #111827;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }

        /* ── Add Section Dropdown Button ──────────────────────────────── */
        .cc-add-wrap { position: relative; display: inline-block; }
        .cc-add-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #111827;
          color: #fff;
          border: none;
          border-radius: 10px;
          padding: 10px 20px;
          font-size: 13px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: transform 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
        }
        .cc-add-btn:hover {
          background: #374151;
          transform: scale(1.03);
          box-shadow: 0 4px 12px rgba(17,24,39,0.15);
        }
        .cc-add-btn:active { transform: scale(0.97); }
        .cc-dropdown-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: #fff;
          border-radius: 12px;
          border: 1px solid #E5E7EB;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          z-index: 200;
          min-width: 160px;
          padding: 6px;
          display: flex;
          flex-direction: column;
          gap: 3px;
          animation: cc-fadeIn 0.15s ease-out;
        }
        .cc-dropdown-item {
          border: none;
          background: none;
          text-align: left;
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          border-radius: 8px;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .cc-dropdown-item:hover { background: #F0FDF4; color: #059669; }

        /* ── Section Tabs ─────────────────────────────────────────────── */
        .cc-section-tabs {
          display: flex;
          gap: 4px;
          margin-bottom: 24px;
          background: #F3F4F6;
          border-radius: 12px;
          padding: 4px;
          width: fit-content;
        }
        .cc-section-tab {
          border: none;
          background: transparent;
          padding: 9px 22px;
          font-size: 14px;
          font-weight: 600;
          color: #6B7280;
          border-radius: 9px;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .cc-section-tab:hover { color: #111827; background: rgba(255,255,255,0.6); }
        .cc-section-tab.active {
          background: #fff;
          color: #111827;
          box-shadow: 0 1px 4px rgba(0,0,0,0.1);
        }

        /* ── Analytics Cards ──────────────────────────────────────────── */
        .cc-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 24px;
        }
        @media (max-width: 900px)  { .cc-stats-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 540px)  { .cc-stats-grid { grid-template-columns: 1fr; } }

        .cc-stat-card {
          background: #fff;
          border-radius: 16px;
          padding: 22px 20px;
          border: 1px solid #E5E7EB;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 132px;
          box-sizing: border-box;
          transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
          cursor: default;
        }
        .cc-stat-card:hover {
          transform: translateY(-5px) scale(1.02);
          box-shadow: 0 12px 24px rgba(0,0,0,0.08);
          border-color: #10b981;
        }
        .cc-stat-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .cc-stat-meta { display: flex; flex-direction: column; gap: 3px; }
        .cc-stat-label {
          font-size: 12px;
          font-weight: 600;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .cc-stat-subtitle { font-size: 11px; color: #9CA3AF; font-weight: 500; }
        .cc-stat-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .cc-stat-value {
          font-size: 30px;
          font-weight: 700;
          color: #111827;
          line-height: 1;
          margin-top: 10px;
        }
        .cc-stat-value-sm {
          font-size: 18px;
          font-weight: 700;
          color: #111827;
          line-height: 1.3;
          margin-top: 10px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* ── Controls Row ─────────────────────────────────────────────── */
        .cc-controls {
          background: #fff;
          border-radius: 16px;
          border: 1px solid #E5E7EB;
          padding: 16px 20px;
          margin-bottom: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }
        .cc-search-wrap { position: relative; flex: 1; min-width: 220px; }
        .cc-search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
        }
        .cc-search-input {
          width: 100%;
          padding: 10px 14px 10px 38px;
          border: 1.5px solid #E5E7EB;
          border-radius: 10px;
          font-size: 14px;
          font-family: inherit;
          outline: none;
          background: #F9FAFB;
          color: #111827;
          box-sizing: border-box;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }
        .cc-search-input:focus {
          border-color: #10b981;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(16,185,129,0.12);
        }
        .cc-search-clear {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #9CA3AF;
          cursor: pointer;
          font-size: 14px;
          padding: 2px 4px;
          display: flex;
          align-items: center;
          border-radius: 4px;
          transition: color 0.15s;
        }
        .cc-search-clear:hover { color: #374151; }

        /* ── Table Card ───────────────────────────────────────────────── */
        .cc-table-card {
          background: #fff;
          border-radius: 16px;
          border: 1px solid #E5E7EB;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          overflow: hidden;
          transition: box-shadow 0.3s ease;
        }
        .cc-table-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.06); }
        .cc-table-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 24px;
          border-bottom: 1px solid #F3F4F6;
          flex-wrap: wrap;
          gap: 10px;
        }
        .cc-table-card-title { font-size: 16px; font-weight: 700; color: #111827; margin: 0; }
        .cc-table-count {
          font-size: 12px;
          color: #6B7280;
          background: #F3F4F6;
          padding: 4px 10px;
          border-radius: 20px;
          font-weight: 600;
        }
        .cc-table-scroll { overflow-x: auto; }

        /* ── Table ────────────────────────────────────────────────────── */
        .cc-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 14px;
        }
        .cc-table th {
          text-align: left;
          padding: 13px 16px;
          font-size: 11px;
          font-weight: 600;
          color: #4B5563;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #E5E7EB;
          background: #F9FAFB;
          white-space: nowrap;
        }
        .cc-table td {
          padding: 16px;
          color: #374151;
          border-bottom: 1px solid #F3F4F6;
          vertical-align: middle;
          transition: background-color 0.2s ease;
        }
        .cc-table tr td:first-child {
          border-left: 3px solid transparent;
          transition: border-left-color 0.2s ease, background-color 0.2s ease;
        }
        .cc-table tr:hover td { background-color: #F0FDF4 !important; }
        .cc-table tr:hover td:first-child { border-left-color: #10b981; }
        .cc-table tr:last-child td { border-bottom: none; }

        /* ── Status Badge ─────────────────────────────────────────────── */
        .cc-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 12px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
          cursor: pointer;
          transition: opacity 0.2s ease, transform 0.15s ease;
          border: none;
          background: none;
          font-family: inherit;
        }
        .cc-badge:hover { opacity: 0.8; transform: scale(1.04); }
        .cc-badge::before {
          content: '';
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .cc-badge-open    { background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0; }
        .cc-badge-open::before    { background: #10B981; }
        .cc-badge-closed  { background: #FEF2F2; color: #991B1B; border: 1px solid #FECACA; }
        .cc-badge-closed::before  { background: #EF4444; }

        /* ── Priority Badge ───────────────────────────────────────────── */
        .cc-priority {
          display: inline-block;
          background: #EEF2FF;
          color: #4338CA;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 12px;
        }

        /* ── Action Buttons ───────────────────────────────────────────── */
        .cc-action-row { display: flex; gap: 8px; align-items: center; justify-content: center; }
        .cc-icon-btn {
          border: 1.5px solid #E5E7EB;
          background: #fff;
          cursor: pointer;
          padding: 7px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .cc-icon-btn:hover { background: #F3F4F6; border-color: #D1D5DB; transform: scale(1.05); }
        .cc-icon-btn-del:hover { background: #FEF2F2; border-color: #FECACA; }
        .cc-icon-img { width: 14px; height: 14px; }

        /* ── Maps Link ────────────────────────────────────────────────── */
        .cc-map-link {
          color: #2563EB;
          text-decoration: none;
          font-weight: 600;
          font-size: 13px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: color 0.15s ease;
        }
        .cc-map-link:hover { color: #1D4ED8; text-decoration: underline; }

        /* ── Empty State ──────────────────────────────────────────────── */
        .cc-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 24px;
          text-align: center;
          animation: cc-fadeIn 0.3s ease;
        }
        .cc-empty-icon { font-size: 52px; margin-bottom: 16px; line-height: 1; }
        .cc-empty h3 { margin: 0 0 8px; font-size: 18px; font-weight: 700; color: #111827; }
        .cc-empty p { margin: 0; font-size: 14px; color: #6B7280; max-width: 320px; }

        /* ── Modal ────────────────────────────────────────────────────── */
        .cc-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15,23,42,0.45);
          backdrop-filter: blur(5px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: cc-fadeIn 0.2s ease;
          padding: 20px;
        }
        .cc-modal-content {
          background: #fff;
          border-radius: 20px;
          width: 100%;
          max-width: 640px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0,0,0,0.15);
          animation: cc-slideUp 0.25s cubic-bezier(0.16,1,0.3,1);
          font-family: 'Lexend', sans-serif;
        }
        .cc-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 24px 28px 20px;
          border-bottom: 1px solid #F3F4F6;
          flex-shrink: 0;
        }
        .cc-modal-header h2 { font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 4px; }
        .cc-modal-header p { font-size: 13px; color: #6B7280; margin: 0; }
        .cc-modal-close {
          background: #F3F4F6;
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          font-size: 16px;
          color: #6B7280;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s ease;
          margin-left: 12px;
        }
        .cc-modal-close:hover { background: #E5E7EB; color: #111827; }
        .cc-modal-body { padding: 24px 28px; overflow-y: auto; }
        .cc-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 16px 28px 24px;
          border-top: 1px solid #F3F4F6;
          flex-shrink: 0;
        }

        /* ── Form ─────────────────────────────────────────────────────── */
        .cc-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        @media (max-width: 540px) { .cc-form-grid { grid-template-columns: 1fr; } }
        .cc-full { grid-column: span 2; }
        @media (max-width: 540px) { .cc-full { grid-column: span 1; } }
        .cc-form-group { display: flex; flex-direction: column; gap: 6px; }
        .cc-form-label {
          font-size: 11px;
          font-weight: 700;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .cc-form-input {
          padding: 11px 14px;
          border-radius: 10px;
          border: 1.5px solid #E5E7EB;
          font-size: 14px;
          outline: none;
          font-family: 'Lexend', sans-serif;
          background: #F9FAFB;
          color: #111827;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
          width: 100%;
          box-sizing: border-box;
          appearance: none;
          -webkit-appearance: none;
        }
        .cc-form-input:focus {
          border-color: #10b981;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(16,185,129,0.12);
        }
        .cc-error { font-size: 11px; color: #DC2626; font-weight: 600; }
        .cc-toggle-wrap {
          display: flex;
          align-items: center;
          cursor: pointer;
          gap: 0;
          margin-top: 20px;
        }

        /* ── Form Buttons ─────────────────────────────────────────────── */
        .cc-btn-cancel {
          padding: 10px 22px;
          border-radius: 10px;
          border: 1.5px solid #E5E7EB;
          background: #fff;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          font-family: inherit;
          color: #374151;
          transition: all 0.2s ease;
        }
        .cc-btn-cancel:hover { background: #F3F4F6; border-color: #D1D5DB; }
        .cc-btn-submit {
          padding: 10px 24px;
          border-radius: 10px;
          border: none;
          background: #111827;
          color: #fff;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          font-family: inherit;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .cc-btn-submit:hover { background: #374151; transform: scale(1.02); }
        .cc-btn-submit:disabled { background: #9CA3AF; cursor: not-allowed; transform: none; }

        /* ── Name+Address cell ────────────────────────────────────────── */
        .cc-cell-name { font-weight: 700; color: #111827; font-size: 14px; }
        .cc-cell-sub  { font-size: 11px; color: #6B7280; margin-top: 3px; }
        .cc-cell-station { color: #4B5563; font-weight: 500; }
      `}</style>

      {/* ── Add Modal ───────────────────────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="cc-modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="cc-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="cc-modal-header">
              <div>
                <h2>Add {formData.category === "Cafe" ? "Café" : formData.category} Configuration</h2>
                <p>Configure a new {formData.category === "Cafe" ? "café" : formData.category.toLowerCase()} location and map it to an active charging station.</p>
              </div>
              <button className="cc-modal-close" onClick={() => setIsAddModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="cc-modal-body">
                {renderFormFields()}
              </div>
              <div className="cc-modal-footer">
                <button type="button" className="cc-btn-cancel" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                <button type="submit" className="cc-btn-submit" disabled={formSubmitting}>
                  {formSubmitting ? "Saving…" : `Add ${formData.category === "Cafe" ? "Café" : formData.category}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Modal ──────────────────────────────────────────────────── */}
      {isEditModalOpen && (
        <div className="cc-modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="cc-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="cc-modal-header">
              <div>
                <h2>Edit {formData.category === "Cafe" ? "Café" : formData.category} Configuration</h2>
                <p>Modify the configuration, priority, or station mappings of this {formData.category === "Cafe" ? "café" : formData.category.toLowerCase()}.</p>
              </div>
              <button className="cc-modal-close" onClick={() => setIsEditModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="cc-modal-body">
                {renderFormFields()}
              </div>
              <div className="cc-modal-footer">
                <button type="button" className="cc-btn-cancel" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                <button type="submit" className="cc-btn-submit" disabled={formSubmitting}>
                  {formSubmitting ? "Saving…" : `Update ${formData.category === "Cafe" ? "Café" : formData.category}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Page Body ───────────────────────────────────────────────────── */}
      <div className="cc-page">

        {/* ── Page Header ─────────────────────────────────────────────── */}
        <div className="cc-header">
          <div className="cc-header-left">
            <h2>Cafe Configuration</h2>
            <p>Manage cafe settings, menu configuration, pricing, and operational preferences.</p>
          </div>
          <div className="cc-header-right">
            {/* Date filter tabs – UI only */}
            <div className="cc-tab-group">
              {["Today", "This Week", "This Month", "This Year"].map(tab => (
                <button key={tab} className="cc-tab">{tab}</button>
              ))}
            </div>

            {/* Add Section Dropdown */}
            <div className="cc-add-wrap">
              <button className="cc-add-btn" onClick={() => setIsAddDropdownOpen(!isAddDropdownOpen)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Section
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
              </button>
              {isAddDropdownOpen && (
                <div className="cc-dropdown-menu">
                  {["Cafe", "Restaurant", "Mall"].map(type => (
                    <button
                      key={type}
                      type="button"
                      className="cc-dropdown-item"
                      onClick={() => { openAddModal(type); setIsAddDropdownOpen(false); }}
                    >
                      {type === "Cafe" ? "☕ Cafe" : type === "Restaurant" ? "🍽️ Restaurant" : "🏬 Mall"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Section Tabs (Cafe / Restaurant / Mall) ─────────────────── */}
        <div className="cc-section-tabs">
          {["Cafe", "Restaurant", "Mall"].map(tab => (
            <button
              key={tab}
              type="button"
              className={`cc-section-tab${activeTab === tab ? " active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "Cafe" ? "☕ Cafe" : tab === "Restaurant" ? "🍽️ Restaurant" : "🏬 Mall"}
            </button>
          ))}
        </div>

        {/* ── Analytics Summary Cards ──────────────────────────────────── */}
        <div className="cc-stats-grid">
          {/* Total */}
          <div className="cc-stat-card">
            <div className="cc-stat-top">
              <div className="cc-stat-meta">
                <span className="cc-stat-label">Total {tabLabelPlural}</span>
                <span className="cc-stat-subtitle">Configured in system</span>
              </div>
              <div className="cc-stat-icon" style={{ background: "#EEF2FF" }}>
                <img src={totalIcon} alt="" style={{ width: 22, height: 22 }} />
              </div>
            </div>
            <div className="cc-stat-value"><AnimatedNumber value={totalCount} /></div>
          </div>

          {/* Active */}
          <div className="cc-stat-card">
            <div className="cc-stat-top">
              <div className="cc-stat-meta">
                <span className="cc-stat-label">Open / Active</span>
                <span className="cc-stat-subtitle">Visible on app search</span>
              </div>
              <div className="cc-stat-icon" style={{ background: "#ECFDF5" }}>
                <img src={activeIcon} alt="" style={{ width: 22, height: 22 }} />
              </div>
            </div>
            <div className="cc-stat-value"><AnimatedNumber value={activeCount} /></div>
          </div>

          {/* Top Priority */}
          <div className="cc-stat-card">
            <div className="cc-stat-top">
              <div className="cc-stat-meta">
                <span className="cc-stat-label">Top Priority {tabLabel}</span>
                <span className="cc-stat-subtitle">
                  {highestRanked ? `Rank: ${highestRanked.rating || "N/A"}` : "Set priority in config"}
                </span>
              </div>
              <div className="cc-stat-icon" style={{ background: "#FFFBEB" }}>
                <img src={uptimeIcon} alt="" style={{ width: 22, height: 22 }} />
              </div>
            </div>
            <div className="cc-stat-value-sm">
              {highestRanked ? getCleanName(highestRanked.name) : "N/A"}
            </div>
          </div>
        </div>

        {/* ── Search & Filter Controls ─────────────────────────────────── */}
        <div className="cc-controls">
          <div className="cc-search-wrap">
            <span className="cc-search-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>
            <input
              type="text"
              className="cc-search-input"
              placeholder={`Search ${activeTab === "Cafe" ? "cafés" : activeTab === "Restaurant" ? "restaurants" : "malls"} by name, station, or address…`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="cc-search-clear" onClick={() => setSearchTerm("")}>✕</button>
            )}
          </div>
        </div>

        {/* ── Table Card ──────────────────────────────────────────────── */}
        <div className="cc-table-card">
          <div className="cc-table-card-header">
            <h3 className="cc-table-card-title">{tabLabel} Locations</h3>
            <span className="cc-table-count">{filteredCafes.length} record{filteredCafes.length !== 1 ? "s" : ""}</span>
          </div>

          {loading ? (
            <div style={{ padding: "16px 24px" }}><LoadingSpinner /></div>
          ) : filteredCafes.length === 0 ? (
            <div className="cc-empty">
              <div className="cc-empty-icon">{activeTab === "Cafe" ? "☕" : activeTab === "Restaurant" ? "🍽️" : "🏬"}</div>
              <h3>
                {searchTerm
                  ? `No ${tabLabelPlural} matching "${searchTerm}"`
                  : `No ${tabLabelPlural} Configured`}
              </h3>
              <p>
                {searchTerm
                  ? "Try adjusting your search term."
                  : `${tabLabel} configuration data will appear here once available.`}
              </p>
            </div>
          ) : (
            <div className="cc-table-scroll">
              <table className="cc-table">
                <thead>
                  <tr>
                    <th>{tabLabel} Details</th>
                    <th>Associated Station</th>
                    <th style={{ textAlign: "center" }}>Rank Priority</th>
                    <th style={{ textAlign: "center" }}>Status</th>
                    <th>Directions</th>
                    <th style={{ textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCafes.map((cafe) => (
                    <tr key={cafe.id}>
                      <td>
                        <div className="cc-cell-name">{getCleanName(cafe.name)}</div>
                        <div className="cc-cell-sub">{cafe.address || "No address entered"}</div>
                      </td>
                      <td>
                        <span className="cc-cell-station">
                          {cafe.stationName || `Station ID: ${cafe.stationId}`}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className="cc-priority">{cafe.rating || "0.0"}</span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          className={`cc-badge ${cafe.openNow ? "cc-badge-open" : "cc-badge-closed"}`}
                          onClick={() => handleToggleActiveState(cafe)}
                          title="Click to toggle active status"
                        >
                          {cafe.openNow ? "Open" : "Closed"}
                        </button>
                      </td>
                      <td>
                        {cafe.googleMapsUri ? (
                          <a href={cafe.googleMapsUri} target="_blank" rel="noopener noreferrer" className="cc-map-link">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                            View on Maps
                          </a>
                        ) : (
                          <span style={{ color: "#9CA3AF", fontStyle: "italic", fontSize: "13px" }}>No link</span>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div className="cc-action-row">
                          <button className="cc-icon-btn" onClick={() => openEditModal(cafe)} title="Edit Configuration">
                            <img src={editIcon} alt="Edit" className="cc-icon-img" />
                          </button>
                          <button className="cc-icon-btn cc-icon-btn-del" onClick={() => handleDeleteCafe(cafe)} title="Delete Configuration">
                            <img src={deleteIcon} alt="Delete" className="cc-icon-img" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
