import React, { useState, useEffect } from "react";
import ChargingPlanCard from "../../components/card/ChargingPlanCard";
import EditForm from "../../pages/Admin/form/editform";

const ACCENT = "#7c3aed";

export default function PlansPage({ baseUrl }) {
  const [plans, setPlans] = useState([]);
  const [chargers, setChargers] = useState([]);
  const [selectedCharger, setSelectedCharger] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chargersLoading, setChargersLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [message, setMessage] = useState(null);

  const [newPlan, setNewPlan] = useState({
    planName: "",
    description: "",
    durationMin: "",
    rate: "",
    walletDeduction: "",
    chargerType: "AC",
  });

  // ✅ Fetch all chargers and plans
  useEffect(() => {
    const token = localStorage.getItem("token");
    setLoading(true);
    setChargersLoading(true);

    // Fetch Chargers
    fetch(`${baseUrl}/chargers/all`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Failed to fetch chargers: ${res.status} - ${text}`);
        }
        return res.json();
      })
      .then((data) => {
        setChargers(data || []);
        setChargersLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching chargers:", err);
        setChargersLoading(false);
      });

    // Fetch Plans
    fetch(`${baseUrl}/plans/all`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Failed to fetch plans: ${res.status} - ${text}`);
        }
        return res.json();
      })
      .then((data) => {
        setPlans(data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching plans:", err);
        setError(err.message);
        setLoading(false);
      });
  }, [baseUrl]);

  // Set default charger type when selected charger changes
  useEffect(() => {
    if (selectedCharger) {
      setNewPlan((prev) => ({
        ...prev,
        chargerType: selectedCharger.chargerType || "AC",
      }));
    }
  }, [selectedCharger]);

  // ✅ Delete Plan
  const handleDelete = async (id) => {
    const token = localStorage.getItem("token");
    if (!window.confirm("Are you sure you want to delete this plan?")) return;

    try {
      const res = await fetch(`${baseUrl}/plans/delete/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.text();
      if (!res.ok) throw new Error(data || "Failed to delete plan");

      setPlans((prev) => prev.filter((plan) => plan.id !== id));
      setMessage("✅ Plan deleted successfully");
      await refreshPlans();
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    }
  };

  // ✅ Delete All Plans
  const handleDeactivateAllPlans = async () => {
    if (!window.confirm("Are you sure you want to delete ALL plans?")) return;
    const token = localStorage.getItem("token");
    let successCount = 0;
    let failCount = 0;

    for (const plan of plans) {
      try {
        const res = await fetch(`${baseUrl}/plans/delete/${plan.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        failCount++;
      }
    }

    await refreshPlans();
    setMessage(`✅ Deleted ${successCount} plans successfully.${failCount ? ` Failed to delete ${failCount} plans.` : ""}`);
  };

  // ✅ Edit Plan
  const handleEdit = (plan) => {
    setSelectedPlan(plan);
    setShowEditForm(true);
    window.history.pushState({ edit: true }, "");
  };

  const handleCloseForm = () => {
    setShowEditForm(false);
    setSelectedPlan(null);
  };

  const handleSave = (updatedPlan) => {
    setPlans((prev) =>
      prev.map((p) => (p.id === updatedPlan.id ? updatedPlan : p))
    );
    setMessage("✅ Plan updated successfully");
    handleCloseForm();
  };

  // ✅ Add Plan
  const handleAddPlan = async (e) => {
    e.preventDefault();

    if (!selectedCharger) {
      alert("Please select a charger first.");
      return;
    }
    if (!newPlan.planName.trim()) {
      alert("Plan name is required.");
      return;
    }
    if (!newPlan.durationMin || Number(newPlan.durationMin) <= 0) {
      alert("Please enter a valid duration (greater than 0 minutes).");
      return;
    }
    if (!newPlan.rate || Number(newPlan.rate) < 0) {
      alert("Please enter a valid rate (0 or positive value).");
      return;
    }
    if (!newPlan.walletDeduction || Number(newPlan.walletDeduction) < 0) {
      alert("Please enter a valid wallet deduction (0 or positive value).");
      return;
    }

    const token = localStorage.getItem("token");
    const payload = {
      planName: newPlan.planName,
      description: `[C:${selectedCharger.id}] ${newPlan.description}`,
      durationMin: Number(newPlan.durationMin),
      rate: Number(newPlan.rate),
      walletDeduction: Number(newPlan.walletDeduction),
      chargerType: newPlan.chargerType,
    };

    try {
      const res = await fetch(`${baseUrl}/plans/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text || "Failed to add plan");

      await refreshPlans();
      setMessage("✅ New plan added successfully");
      setShowAddModal(false);
      setNewPlan({
        planName: "",
        description: "",
        durationMin: "",
        rate: "",
        walletDeduction: "",
        chargerType: selectedCharger.chargerType || "AC",
      });
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    }
  };

  const refreshPlans = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${baseUrl}/plans/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
      }
    } catch {
      // ignore
    }
  };

  // Filter plans for the selected charger
  const filteredPlans = selectedCharger
    ? plans.filter((p) => p.isActive !== false && p.description && p.description.startsWith(`[C:${selectedCharger.id}]`))
    : [];

  // Deduplicate and get plans from other chargers to assign
  const availablePlansToAssign = selectedCharger
    ? plans.filter((p) => p.isActive !== false && (!p.description || !p.description.startsWith(`[C:${selectedCharger.id}]`)))
    : [];

  const uniqueTemplates = [];
  const templateKeys = new Set();
  availablePlansToAssign.forEach((p) => {
    const cleanDesc = p.description?.replace(/^\[C:\d+\]\s*/, "") || "";
    const key = `${p.planName}_${p.rate}_${p.durationMin}_${p.walletDeduction}_${p.chargerType}`;
    if (!templateKeys.has(key)) {
      templateKeys.add(key);
      uniqueTemplates.push({
        ...p,
        cleanDescription: cleanDesc,
      });
    }
  });

  if (loading || chargersLoading) return <p style={{ padding: "20px" }}>Loading plans and chargers...</p>;
  if (error) return <p style={{ color: "red", padding: "20px" }}>Error: {error}</p>;

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ fontSize: "32px", fontWeight: "bold", margin: 0 }}>
          Charging Plans
        </h2>
        <div style={{ display: "flex", gap: "12px" }}>
          {selectedCharger && (
            <button
              onClick={() => setShowAssignModal(true)}
              style={{
                background: "#FFFFFF",
                color: "#1E1E1E",
                border: "1px solid #CCC",
                borderRadius: "8px",
                padding: "8px 16px",
                fontSize: "14px",
                cursor: "pointer",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
              </svg>
              Assign Plan
            </button>
          )}
          <button
            onClick={() => {
              if (!selectedCharger) {
                alert("Please select a charger first.");
                return;
              }
              setShowAddModal(true);
            }}
            disabled={!selectedCharger}
            style={{
              background: selectedCharger ? "#1E1E1E" : "#CCCCCC",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "8px 16px",
              fontSize: "14px",
              cursor: selectedCharger ? "pointer" : "not-allowed",
              fontWeight: "500",
            }}
          >
            + Add Plan
          </button>
        </div>
      </div>

      {/* Charger Selector */}
      <div
        style={{
          background: "#FFFFFF",
          padding: "20px",
          borderRadius: "12px",
          border: "0.2px solid #E0E0E0",
          marginBottom: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <label style={{ fontSize: "14px", fontWeight: "600", color: "#333" }}>
          Select Charger to Manage Plans
        </label>
        <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={selectedCharger ? selectedCharger.id : ""}
            onChange={(e) => {
              const chargerId = e.target.value;
              const ch = chargers.find((c) => c.id.toString() === chargerId.toString());
              setSelectedCharger(ch || null);
            }}
            style={{
              flex: "1",
              minWidth: "250px",
              height: "44px",
              borderRadius: "8px",
              border: "1px solid #CCC",
              padding: "0 12px",
              fontSize: "14px",
              backgroundColor: "#FFF",
              cursor: "pointer",
            }}
          >
            <option value="">-- Choose a Charger --</option>
            {chargers.map((c) => (
              <option key={c.id} value={c.id}>
                ID: {c.id} | OCPP: {c.ocppId || "N/A"} ({c.chargerType || "AC"} / {c.connectorType || "CCS2"})
              </option>
            ))}
          </select>

          {selectedCharger && (
            <div style={{ fontSize: "13px", color: "#666", display: "flex", gap: "16px" }}>
              <span><strong>Station ID:</strong> {selectedCharger.stationId || "N/A"}</span>
              <span><strong>Type:</strong> {selectedCharger.chargerType || "AC"}</span>
              <span><strong>Connector:</strong> {selectedCharger.connectorType || "CCS2"}</span>
              <span><strong>Rate:</strong> ₹{selectedCharger.rate || "8.50"}</span>
            </div>
          )}
        </div>
      </div>

      {message && (
        <div
          style={{
            background: "#f0f0f0",
            padding: "10px 16px",
            borderRadius: "6px",
            marginBottom: "16px",
          }}
        >
          {message}
        </div>
      )}

      {showEditForm ? (
        <EditForm
          plan={selectedPlan}
          onClose={handleCloseForm}
          onSave={handleSave}
          baseUrl={baseUrl}
          existingPlans={plans.filter(
            (p) =>
              p.description &&
              p.description.startsWith(`[C:${selectedCharger?.id}]`) &&
              p.id !== selectedPlan?.id
          )}
        />
      ) : !selectedCharger ? (
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "16px",
            border: "0.2px solid #E0E0E0",
            padding: "60px 40px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: "#F5F3FF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: ACCENT,
            }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
              <line x1="12" y1="18" x2="12" y2="12"></line>
              <line x1="12" y1="6" x2="12" y2="6.01"></line>
            </svg>
          </div>
          <h3 style={{ fontSize: "20px", fontWeight: "600", color: "#111" }}>No Charger Selected</h3>
          <p style={{ fontSize: "14px", color: "#666", maxWidth: "400px", margin: 0 }}>
            Select a charger from the dropdown above to view, create, and manage its independent charging plans.
          </p>
        </div>
      ) : (
        <div>
          {filteredPlans.length === 0 ? (
            <div
              style={{
                width: "100%",
                background: "#FFFFFF",
                borderRadius: "16px",
                border: "0.2px solid #E0E0E0",
                padding: "60px 40px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
              }}
            >
              <p style={{ fontSize: "15px", color: "#666", margin: 0 }}>
                No active plans found for this charger. Create a new plan or assign one from other chargers.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
              {filteredPlans.map((plan) => (
                <ChargingPlanCard
                  key={plan.id}
                  {...plan}
                  description={plan.description?.replace(/^\[C:\d+\]\s*/, "") || "No description"}
                  onEdit={() => handleEdit(plan)}
                  onDelete={() => handleDelete(plan.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {showAddModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "30px",
              borderRadius: "12px",
              width: "900px",
              maxWidth: "95vw",
              maxHeight: "85vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "22px", fontWeight: 600, margin: 0 }}>
                Add New Plan for Charger: {selectedCharger?.ocppId || `ID ${selectedCharger?.id}`}
              </h3>
              <span style={{ fontSize: "14px", color: "#666" }}>
                Type: {selectedCharger?.chargerType || "AC/DC"}
              </span>
            </div>

            <div style={{ display: "flex", gap: "30px", flexWrap: "wrap" }}>
              {/* Form Column */}
              <form
                onSubmit={handleAddPlan}
                style={{
                  flex: "2 1 500px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "18px",
                }}
              >
                <FloatingInput
                  label="Plan Name"
                  value={newPlan.planName}
                  onChange={(e) => setNewPlan({ ...newPlan, planName: e.target.value })}
                />
                <FloatingInput
                  label="Description"
                  value={newPlan.description}
                  onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                />
                <FloatingInput
                  type="number"
                  label="Duration (Minutes)"
                  value={newPlan.durationMin}
                  onChange={(e) => setNewPlan({ ...newPlan, durationMin: e.target.value })}
                />
                <FloatingInput
                  type="number"
                  label="Rate (₹)"
                  value={newPlan.rate}
                  onChange={(e) => setNewPlan({ ...newPlan, rate: e.target.value })}
                />
                <FloatingInput
                  type="number"
                  label="Wallet Deduction (₹)"
                  value={newPlan.walletDeduction}
                  onChange={(e) => setNewPlan({ ...newPlan, walletDeduction: e.target.value })}
                />

                <div style={{ display: "flex", flexDirection: "column" }}>
                  <label style={{ fontSize: 12, marginBottom: 4, color: "#666" }}>
                    Charger Type
                  </label>
                  <select
                    value={newPlan.chargerType}
                    onChange={(e) => setNewPlan({ ...newPlan, chargerType: e.target.value })}
                    style={{
                      height: 48,
                      borderRadius: 8,
                      border: "1px solid #ccc",
                      padding: "0 12px",
                      fontSize: 14,
                    }}
                  >
                    <option value="AC">AC</option>
                    <option value="DC">DC</option>
                  </select>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "12px",
                    marginTop: "10px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    style={{
                      padding: "10px 18px",
                      borderRadius: "6px",
                      border: "1px solid #ccc",
                      background: "#f5f5f5",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      background: "#000",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      padding: "10px 20px",
                      cursor: "pointer",
                    }}
                  >
                    Save Plan
                  </button>
                </div>
              </form>

              {/* Existing Plans Column */}
              <div
                style={{
                  flex: "1 1 300px",
                  background: "#F9F9F9",
                  padding: "20px",
                  borderRadius: "10px",
                  border: "1px solid #E0E0E0",
                  maxHeight: "450px",
                  overflowY: "auto",
                }}
              >
                <h4 style={{ fontSize: "15px", fontWeight: "600", margin: "0 0 12px 0", color: "#333" }}>
                  Existing Plans ({filteredPlans.length})
                </h4>
                {filteredPlans.length === 0 ? (
                  <p style={{ fontSize: "13px", color: "#666", margin: 0 }}>
                    No plans created yet for this charger.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {filteredPlans.map((ep) => (
                      <div
                        key={ep.id}
                        style={{
                          background: "#FFF",
                          padding: "10px",
                          borderRadius: "6px",
                          border: "0.2px solid #E0E0E0",
                          fontSize: "13px",
                        }}
                      >
                        <p style={{ margin: 0, fontWeight: "600" }}>{ep.planName}</p>
                        <p style={{ margin: "4px 0 0", color: "#666" }}>
                          ₹{ep.rate}/kWh • {ep.durationMin} mins
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showAssignModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "30px",
              borderRadius: "12px",
              width: "600px",
              maxWidth: "90vw",
              maxHeight: "80vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "20px", fontWeight: 600, margin: 0 }}>
                Assign Existing Plan Template
              </h3>
              <button
                onClick={() => setShowAssignModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "#666",
                }}
              >
                &times;
              </button>
            </div>
            <p style={{ fontSize: "14px", color: "#666", margin: 0 }}>
              Select a plan template from other chargers to assign it to **Charger {selectedCharger?.ocppId || selectedCharger?.id}**.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "10px" }}>
              {uniqueTemplates.length === 0 ? (
                <p style={{ fontSize: "14px", color: "#666", textAlign: "center", padding: "20px" }}>
                  No other plans available to assign.
                </p>
              ) : (
                uniqueTemplates.map((template) => (
                  <div
                    key={template.id}
                    style={{
                      background: "#F9F9F9",
                      padding: "16px",
                      borderRadius: "8px",
                      border: "1px solid #E0E0E0",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "600" }}>
                        {template.planName}
                      </h4>
                      <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#666" }}>
                        Rate: ₹{template.rate}/kWh • Duration: {template.durationMin} mins • Type: {template.chargerType}
                      </p>
                      {template.cleanDescription && (
                        <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#888", fontStyle: "italic" }}>
                          {template.cleanDescription}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={async () => {
                        const token = localStorage.getItem("token");
                        const payload = {
                          planName: template.planName,
                          description: `[C:${selectedCharger.id}] ${template.cleanDescription}`,
                          durationMin: template.durationMin,
                          rate: template.rate,
                          walletDeduction: template.walletDeduction,
                          chargerType: template.chargerType,
                        };

                        try {
                          const res = await fetch(`${baseUrl}/plans/add`, {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify(payload),
                          });
                          if (!res.ok) throw new Error("Failed to assign plan");

                          await refreshPlans();
                          setMessage(`✅ Plan "${template.planName}" assigned successfully`);
                          setShowAssignModal(false);
                        } catch (err) {
                          alert(`Error assigning plan: ${err.message}`);
                        }
                      }}
                      style={{
                        background: "#000",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        padding: "8px 16px",
                        fontSize: "13px",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Assign
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ✅ Floating Input Component
function FloatingInput({ label, value, onChange, type = "text" }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: "relative", width: "100%" }}>
      <label
        style={{
          position: "absolute",
          left: 12,
          top: focused || value ? -8 : "50%",
          transform: focused || value ? "translateY(0)" : "translateY(-50%)",
          fontSize: focused || value ? 12 : 14,
          color: focused ? ACCENT : "#888",
          background: "#fff",
          padding: "0 4px",
          transition: "all 0.2s ease",
        }}
      >
        {label}
      </label>
      <input
        type={type}
        value={value ?? ""}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%",
          height: 48,
          padding: "12px 16px",
          borderRadius: 8,
          border: "1px solid #ccc",
        }}
      />
    </div>
  );
}
