import React, { useState, useEffect } from "react";
import ChargingPlanCard from "../../components/card/ChargingPlanCard";
import EditForm from "../../pages/Admin/form/editform";

const ACCENT = "#7c3aed";

export default function PlansPage({baseUrl}) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [message, setMessage] = useState(null);

  const [newPlan, setNewPlan] = useState({
    planName: "",
    description: "",
    durationMin: "",
    rate: "",
    walletDeduction: "",
    chargerType: "Type 2",
  });

  // ✅ Fetch all plans
  useEffect(() => {
    const token = localStorage.getItem("token");

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
        setPlans(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching plans:", err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

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
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    }
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
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`${baseUrl}/plans/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newPlan),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text || "Failed to add plan");

      // Backend returns text, not JSON, so refetch all
      await refreshPlans();
      setMessage("✅ New plan added successfully");
      setShowAddModal(false);
      setNewPlan({
        planName: "",
        description: "",
        durationMin: "",
        rate: "",
        walletDeduction: "",
        chargerType: "Type 2",
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

  if (loading) return <p>Loading plans...</p>;
  if (error) return <p style={{ color: "red" }}>Error: {error}</p>;

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "20px" }}>
          Charging Plans
        </h2>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            background: "#1E1E1E",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "8px 16px",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          + Add Plan
        </button>
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
        <EditForm plan={selectedPlan} onClose={handleCloseForm} onSave={handleSave} />
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
          {plans.map((plan) => (
            <ChargingPlanCard
              key={plan.id}
              {...plan}
              onEdit={() => handleEdit(plan)}
              onDelete={() => handleDelete(plan.id)}
            />
          ))}
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
          }}
        >
          <form
            onSubmit={handleAddPlan}
            style={{
              background: "#fff",
              padding: "30px",
              borderRadius: "12px",
              width: "650px",
              maxHeight: "70vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            <h3 style={{ fontSize: "22px", fontWeight: 600 }}>Add New Plan</h3>
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
                <option>Type 1</option>
                <option>Type 2</option>
                <option>CCS</option>
                <option>CHAdeMO</option>
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
        value={value}
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
