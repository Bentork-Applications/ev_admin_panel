import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Search,
  Filter,
  RefreshCw,
  X,
  Edit2,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import { Toast } from "../../../components/common/Toast";
import { crmService } from "../../../services/crmService";
import { CreateOpportunityModal } from "../../../components/crm/CreateOpportunityModal";

const PAGE_SIZE = 10;

export default function CrmRequirementsPage() {
  const [requirements, setRequirements] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState(null);

  // Convert to Opp modal state
  const [convertModalReq, setConvertModalReq] = useState(null);

  // Filters
  const [productFilter, setProductFilter] = useState("ALL");
  const [timelineFilter, setTimelineFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Form State
  const [customProductCategory, setCustomProductCategory] = useState("");
  const [formReq, setFormReq] = useState({
    companyId: "",
    companyName: "",
    productCategory: "EV Battery Pack",
    voltage: "",
    capacity: "",
    quantity: "",
    timeline: "Immediate",
    budget: "",
    requirement: "",
    nextAction: "Send quote"
  });

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reqList, compList] = await Promise.all([
        crmService.getAllRequirements(),
        crmService.getAllCompanies().catch(() => [])
      ]);

      const reqArray = Array.isArray(reqList) ? reqList : [];
      setRequirements(reqArray);
      setCompanies(Array.isArray(compList) ? compList : []);
    } catch (err) {
      console.error("Failed to load requirements:", err);
      setError(err.message || "Failed to load requirements");
      showToast(err.message || "Failed to load requirements", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreateModal = () => {
    setEditingId(null);
    setCustomProductCategory("");
    setFormReq({
      companyId: "",
      companyName: "",
      productCategory: "EV Battery Pack",
      voltage: "",
      capacity: "",
      quantity: "",
      timeline: "Immediate",
      budget: "",
      requirement: "",
      nextAction: "Send quote"
    });
    setShowModal(true);
  };

  const openEditModal = (req) => {
    setEditingId(req.id);
    const standardProducts = ["EV Battery Pack", "BESS", "BMS", "Connectors"];
    const prod = req.productCategory || req.product || "EV Battery Pack";
    const isCustom = !standardProducts.includes(prod);

    setCustomProductCategory(isCustom ? prod : "");
    setFormReq({
      companyId: req.companyId ? String(req.companyId) : "",
      companyName: req.company || req.companyName || "",
      productCategory: isCustom ? "Other" : prod,
      voltage: req.voltage || "",
      capacity: req.capacity || "",
      quantity: req.quantity || req.qty || "",
      timeline: req.timeline || "Immediate",
      budget: req.budget || "",
      requirement: req.requirement || req.description || "",
      nextAction: req.nextAction || "Send quote"
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formReq.companyName && !formReq.companyId) {
      showToast("Please enter or select a company name", "error");
      return;
    }

    try {
      const effectiveProduct =
        formReq.productCategory === "Other"
          ? customProductCategory.trim() || "Other"
          : formReq.productCategory;

      const payload = {
        companyId: formReq.companyId ? Number(formReq.companyId) : null,
        company:
          formReq.companyName ||
          companies.find((c) => c.id === Number(formReq.companyId))?.name ||
          "Customer",
        productCategory: effectiveProduct,
        product: effectiveProduct,
        voltage: formReq.voltage,
        capacity: formReq.capacity,
        quantity: Number(formReq.quantity) || 1,
        qty: Number(formReq.quantity) || 1,
        timeline: formReq.timeline,
        budget: formReq.budget,
        requirement:
          formReq.requirement ||
          `${formReq.voltage ? formReq.voltage + "V " : ""}${
            formReq.capacity ? formReq.capacity + "Ah " : ""
          }${effectiveProduct}`,
        nextAction: formReq.nextAction
      };

      if (editingId) {
        await crmService.updateRequirement(editingId, payload);
        setRequirements((prev) =>
          prev.map((r) => (r.id === editingId ? { ...r, ...payload } : r))
        );
        showToast("Requirement updated successfully", "success");
      } else {
        const res = await crmService.createRequirement(payload);
        const createdItem =
          res && typeof res === "object" && res.id ? res : { id: Date.now(), ...payload };
        setRequirements((prev) => [createdItem, ...prev]);
        showToast("Requirement saved successfully", "success");
      }

      setShowModal(false);
      setEditingId(null);
    } catch (err) {
      console.error("Failed to save requirement:", err);
      showToast(err.message || "Failed to save requirement", "error");
    }
  };

  const filteredRequirements = useMemo(() => {
    return requirements.filter((req) => {
      const prodMatch =
        productFilter === "ALL" || (req.product || req.productCategory || "") === productFilter;
      const timeMatch = timelineFilter === "ALL" || (req.timeline || "") === timelineFilter;
      const searchMatch =
        !searchQuery.trim() ||
        (req.company || req.companyName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (req.requirement || "").toLowerCase().includes(searchQuery.toLowerCase());
      return prodMatch && timeMatch && searchMatch;
    });
  }, [requirements, productFilter, timelineFilter, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [productFilter, timelineFilter, searchQuery]);

  const totalPages = Math.ceil(filteredRequirements.length / PAGE_SIZE) || 1;
  const paginatedRequirements = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRequirements.slice(start, start + PAGE_SIZE);
  }, [filteredRequirements, currentPage]);

  return (
    <div style={{ maxWidth: "1480px", margin: "0 auto", padding: "16px 20px" }}>
      <style>{`
        .crm-req-filter-bar {
          display: flex;
          gap: 10px;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .crm-req-filter-bar select,
        .crm-req-filter-bar input {
          box-sizing: border-box;
          border-radius: 8px;
          border: 1px solid #CBD5E1;
          font-size: 13px;
        }
        .crm-req-skeleton {
          height: 14px;
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: crmPulse 1.5s infinite;
          border-radius: 4px;
        }
        @keyframes crmPulse {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px"
        }}
      >
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#0F172A", margin: 0 }}>
            Requirements
          </h1>
          <p style={{ fontSize: "13px", color: "#64748B", margin: "4px 0 0 0" }}>
            Technical specifications, RFQs and battery sizing needs from customers
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={openCreateModal}
            style={{
              padding: "9px 16px",
              borderRadius: "8px",
              backgroundColor: "#2563EB",
              color: "#ffffff",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)"
            }}
          >
            <Plus size={16} />
            <span>+ New Requirement</span>
          </button>

          <button
            onClick={fetchData}
            disabled={loading}
            title="Refresh"
            style={{
              padding: "9px",
              borderRadius: "8px",
              backgroundColor: "#ffffff",
              border: "1px solid #CBD5E1",
              color: "#475569",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Error state with retry */}
      {error && !loading && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px 16px",
            borderRadius: "8px",
            backgroundColor: "#FEF2F2",
            border: "1px solid #FECACA",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#991B1B",
            fontSize: "13px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertCircle size={16} color="#DC2626" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchData}
            style={{
              padding: "4px 12px",
              borderRadius: "6px",
              backgroundColor: "#DC2626",
              color: "#fff",
              border: "none",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="crm-req-filter-bar">
        <div style={{ position: "relative", minWidth: "220px", flex: "1 1 220px" }}>
          <Search size={16} color="#94A3B8" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            placeholder="Search company or requirement..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: "100%", padding: "9px 12px 9px 36px" }}
          />
        </div>

        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          style={{ padding: "9px 12px", backgroundColor: "#fff" }}
        >
          <option value="ALL">All Products</option>
          <option value="EV Battery Pack">EV Battery Pack</option>
          <option value="BESS">BESS</option>
          <option value="BMS">BMS</option>
          <option value="Connectors">Connectors</option>
        </select>

        <select
          value={timelineFilter}
          onChange={(e) => setTimelineFilter(e.target.value)}
          style={{ padding: "9px 12px", backgroundColor: "#fff" }}
        >
          <option value="ALL">All Timelines</option>
          <option value="Immediate">Immediate</option>
          <option value="1–3 Months">1–3 Months</option>
          <option value="3–6 Months">3–6 Months</option>
        </select>
      </div>

      {/* Table */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "14px",
          border: "1px solid #E2E8F0",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
          overflow: "hidden"
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid #E2E8F0", textAlign: "left", color: "#64748B" }}>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>COMPANY</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>PRODUCT</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>QTY</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>TIMELINE</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>BUDGET</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>REQUIREMENT</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>NEXT ACTION</th>
                <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "right" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1, 2, 3, 4].map((i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <td style={{ padding: "14px 16px" }}><div className="crm-req-skeleton" style={{ width: "120px" }} /></td>
                    <td style={{ padding: "14px 16px" }}><div className="crm-req-skeleton" style={{ width: "90px" }} /></td>
                    <td style={{ padding: "14px 16px" }}><div className="crm-req-skeleton" style={{ width: "40px" }} /></td>
                    <td style={{ padding: "14px 16px" }}><div className="crm-req-skeleton" style={{ width: "70px" }} /></td>
                    <td style={{ padding: "14px 16px" }}><div className="crm-req-skeleton" style={{ width: "80px" }} /></td>
                    <td style={{ padding: "14px 16px" }}><div className="crm-req-skeleton" style={{ width: "180px" }} /></td>
                    <td style={{ padding: "14px 16px" }}><div className="crm-req-skeleton" style={{ width: "80px" }} /></td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}><div className="crm-req-skeleton" style={{ width: "80px", marginLeft: "auto" }} /></td>
                  </tr>
                ))
              ) : filteredRequirements.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
                    No customer requirements found. Click <strong>+ New Requirement</strong> to add one.
                  </td>
                </tr>
              ) : (
                paginatedRequirements.map((req) => (
                  <tr key={req.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 600, color: "#0F172A" }}>
                      {req.company || req.companyName || "—"}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#334155" }}>
                      {req.product || req.productCategory || "—"}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#334155" }}>
                      {req.qty || req.quantity || "—"}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#64748B" }}>
                      {req.timeline || "—"}
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: 600, color: "#0F172A" }}>
                      {req.budget || "—"}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#334155" }}>
                      {req.requirement || req.description || "—"}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#2563EB", fontWeight: 500 }}>
                      {req.nextAction || "Send quote"}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                        <button
                          onClick={() => openEditModal(req)}
                          title="Edit Requirement"
                          style={{
                            padding: "4px 8px",
                            borderRadius: "6px",
                            backgroundColor: "#F1F5F9",
                            border: "1px solid #CBD5E1",
                            color: "#475569",
                            fontSize: "11px",
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "3px"
                          }}
                        >
                          <Edit2 size={12} />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => setConvertModalReq(req)}
                          title="Convert to Opportunity"
                          style={{
                            padding: "4px 8px",
                            borderRadius: "6px",
                            backgroundColor: "#EFF6FF",
                            border: "1px solid #BFDBFE",
                            color: "#2563EB",
                            fontSize: "11px",
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "3px"
                          }}
                        >
                          <TrendingUp size={12} />
                          <span>Convert</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && filteredRequirements.length > PAGE_SIZE && (
          <div
            style={{
              padding: "10px 16px",
              borderTop: "1px solid #E2E8F0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "#FAFBFD",
              fontSize: "12px",
              color: "#64748B"
            }}
          >
            <div>
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(filteredRequirements.length, currentPage * PAGE_SIZE)} of {filteredRequirements.length}
            </div>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: "4px 8px",
                  borderRadius: "4px",
                  border: "1px solid #CBD5E1",
                  backgroundColor: currentPage === 1 ? "#F1F5F9" : "#fff",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer"
                }}
              >
                <ChevronLeft size={13} />
              </button>
              <span style={{ padding: "0 6px", fontWeight: 600 }}>{currentPage} / {totalPages}</span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                style={{
                  padding: "4px 8px",
                  borderRadius: "4px",
                  border: "1px solid #CBD5E1",
                  backgroundColor: currentPage >= totalPages ? "#F1F5F9" : "#fff",
                  cursor: currentPage >= totalPages ? "not-allowed" : "pointer"
                }}
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Requirement Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 1300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px"
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "520px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
                {editingId ? "Edit Requirement" : "Add Requirement"}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Company *</label>
                {companies.length > 0 ? (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <select
                      value={formReq.companyId}
                      onChange={(e) => {
                        const sel = companies.find((c) => c.id === Number(e.target.value));
                        setFormReq({ ...formReq, companyId: e.target.value, companyName: sel ? sel.name : "" });
                      }}
                      style={{ flex: 1, padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", backgroundColor: "#fff" }}
                    >
                      <option value="">Select Existing Company...</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Or type company name..."
                      value={formReq.companyName}
                      onChange={(e) => setFormReq({ ...formReq, companyName: e.target.value, companyId: "" })}
                      style={{ flex: 1, padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px" }}
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="Company or client name"
                    value={formReq.companyName}
                    onChange={(e) => setFormReq({ ...formReq, companyName: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", boxSizing: "border-box" }}
                  />
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Product Category</label>
                  <select
                    value={formReq.productCategory}
                    onChange={(e) => setFormReq({ ...formReq, productCategory: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", backgroundColor: "#fff" }}
                  >
                    <option value="EV Battery Pack">EV Battery Pack</option>
                    <option value="BESS">BESS</option>
                    <option value="BMS">BMS</option>
                    <option value="Connectors">Connectors</option>
                    <option value="Other">Other (Custom)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Quantity</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 50"
                    value={formReq.quantity}
                    onChange={(e) => setFormReq({ ...formReq, quantity: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              {formReq.productCategory === "Other" && (
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Specify Product *</label>
                  <input
                    type="text"
                    required
                    placeholder="Custom battery specification..."
                    value={customProductCategory}
                    onChange={(e) => setCustomProductCategory(e.target.value)}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Voltage (V)</label>
                  <input
                    type="text"
                    placeholder="e.g. 48V, 72V"
                    value={formReq.voltage}
                    onChange={(e) => setFormReq({ ...formReq, voltage: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Capacity (Ah)</label>
                  <input
                    type="text"
                    placeholder="e.g. 30Ah, 100Ah"
                    value={formReq.capacity}
                    onChange={(e) => setFormReq({ ...formReq, capacity: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Timeline</label>
                  <select
                    value={formReq.timeline}
                    onChange={(e) => setFormReq({ ...formReq, timeline: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", backgroundColor: "#fff" }}
                  >
                    <option value="Immediate">Immediate</option>
                    <option value="1–3 Months">1–3 Months</option>
                    <option value="3–6 Months">3–6 Months</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Budget (₹)</label>
                  <input
                    type="text"
                    placeholder="e.g. 2,50,000"
                    value={formReq.budget}
                    onChange={(e) => setFormReq({ ...formReq, budget: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Technical Notes</label>
                <textarea
                  rows={2}
                  placeholder="Specific requirements, cell chemistry, application..."
                  value={formReq.requirement}
                  onChange={(e) => setFormReq({ ...formReq, requirement: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "6px" }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: "9px 16px", borderRadius: "8px", backgroundColor: "#fff", border: "1px solid #CBD5E1", fontSize: "13px", color: "#475569", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: "9px 20px", borderRadius: "8px", backgroundColor: "#2563EB", border: "none", fontSize: "13px", fontWeight: 600, color: "#fff", cursor: "pointer" }}
                >
                  {editingId ? "Update Requirement" : "Save Requirement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert to Opportunity Modal */}
      {convertModalReq && (
        <CreateOpportunityModal
          isOpen={!!convertModalReq}
          onClose={() => setConvertModalReq(null)}
          initialCompanyId={convertModalReq.companyId}
          onOpportunityCreated={() => {
            fetchData();
            showToast("Opportunity created from requirement successfully", "success");
            setConvertModalReq(null);
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
}
