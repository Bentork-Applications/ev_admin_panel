import React, { useMemo } from "react";
import { PROJECT_OPTIONS, formatProductDetails, createDefaultOrderItem } from "../../utils/formatters";

export const OrderItemsEditor = React.memo(({ data, onChange, errors }) => {
  const items = useMemo(() => {
    return Array.isArray(data.orderItems) && data.orderItems.length > 0
      ? data.orderItems
      : [createDefaultOrderItem()];
  }, [data.orderItems]);

  const updateItem = (index, updates) => {
    const newItems = [...items];
    const item = { ...newItems[index], ...updates };
    item.productDetails = formatProductDetails(item);
    newItems[index] = item;
    onChange({ ...data, orderItems: newItems });
  };

  const addItem = () => {
    const newItems = [...items, createDefaultOrderItem()];
    onChange({ ...data, orderItems: newItems });
  };

  const removeItem = (index) => {
    if (items.length <= 1) return;
    const newItems = items.filter((_, i) => i !== index);
    onChange({ ...data, orderItems: newItems });
  };

  const totalQuantitySum = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
  }, [items]);

  return (
    <div style={{ background: "#F8FAFC", padding: "16px", borderRadius: "12px", border: "1px solid #E2E8F0", marginTop: "6px", marginBottom: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <span style={{ fontSize: "14px", fontWeight: 700, color: "#1E293B" }}>
          Product Line Items ({items.length})
        </span>
        <span style={{ fontSize: "12px", background: "#EFF6FF", color: "#1D4ED8", padding: "4px 10px", borderRadius: "12px", fontWeight: 600 }}>
          Total Batch Quantity: {totalQuantitySum} units
        </span>
      </div>

      {items.map((item, idx) => {
        const selectedProject = item.project === "Other" ? (item.customProject || "Other") : (item.project || "EV Battery");
        const formattedVoltage = item.voltage !== undefined && item.voltage !== "" ? String(item.voltage).padStart(2, "0") : "02";
        const formattedCapacity = item.capacity !== undefined && item.capacity !== "" ? item.capacity : "3";
        const selectedChemistry = item.chemistry || "NMC";
        const notesText = item.notes || "";

        return (
          <div key={item.id || idx} style={{ background: "#FFFFFF", padding: "14px", borderRadius: "10px", border: "1px solid #CBD5E1", marginBottom: idx === items.length - 1 ? "12px" : "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                Item #{idx + 1}
              </span>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  style={{ background: "#FEF2F2", color: "#EF4444", border: "1px solid #FCA5A5", borderRadius: "6px", padding: "3px 8px", fontSize: "12px", cursor: "pointer", fontWeight: 600 }}
                >
                  Remove Item
                </button>
              )}
            </div>

            {/* Project Selection Row */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px", background: "#F1F5F9", padding: "8px 12px", borderRadius: "8px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "220px" }}>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#1E293B", whiteSpace: "nowrap" }}>Select Project *:</label>
                <select
                  value={item.project || "EV Battery"}
                  onChange={(e) => updateItem(idx, { project: e.target.value })}
                  style={{ flex: 1, padding: "6px 10px", border: "1px solid #94A3B8", borderRadius: "6px", fontSize: "13px", fontWeight: 600, color: "#0F172A", background: "#FFFFFF" }}
                >
                  {PROJECT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {item.project === "Other" && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1, minWidth: "180px" }}>
                  <label style={{ fontSize: "12px", color: "#475569", whiteSpace: "nowrap" }}>Battery Name:</label>
                  <input
                    type="text"
                    placeholder="Enter custom battery name..."
                    value={item.customProject || ""}
                    onChange={(e) => updateItem(idx, { customProject: e.target.value })}
                    style={{ width: "100%", padding: "6px 10px", border: "1px solid #CBD5E1", borderRadius: "6px", fontSize: "13px" }}
                  />
                </div>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "10px" }}>
              {/* Voltage */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <label style={{ fontSize: "12px", color: "#64748B" }}>Volts:</label>
                <input
                  type="text"
                  placeholder="02"
                  value={item.voltage}
                  onChange={(e) => updateItem(idx, { voltage: e.target.value })}
                  style={{ width: "55px", padding: "6px 8px", border: "1px solid #CBD5E1", borderRadius: "6px", fontSize: "13px", fontWeight: 600, textAlign: "center" }}
                />
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>V</span>
              </div>

              {/* Capacity */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <label style={{ fontSize: "12px", color: "#64748B" }}>Capacity:</label>
                <input
                  type="number"
                  min="0"
                  placeholder="3"
                  value={item.capacity}
                  onChange={(e) => updateItem(idx, { capacity: e.target.value })}
                  style={{ width: "65px", padding: "6px 8px", border: "1px solid #CBD5E1", borderRadius: "6px", fontSize: "13px", fontWeight: 600, textAlign: "center" }}
                />
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>Ah</span>
              </div>

              {/* Chemistry */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <label style={{ fontSize: "12px", color: "#64748B" }}>Chem:</label>
                <select
                  value={selectedChemistry}
                  onChange={(e) => updateItem(idx, { chemistry: e.target.value })}
                  style={{ padding: "6px 10px", border: "1px solid #CBD5E1", borderRadius: "6px", fontSize: "13px", fontWeight: 600, color: "#0F172A", background: "#FFFFFF" }}
                >
                  <option value="NMC">NMC</option>
                  <option value="LiFePO4">LiFePO4</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Notes */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1, minWidth: "140px" }}>
                <label style={{ fontSize: "12px", color: "#64748B" }}>Notes:</label>
                <input
                  type="text"
                  placeholder="Optional specs..."
                  value={item.notes || ""}
                  onChange={(e) => updateItem(idx, { notes: e.target.value })}
                  style={{ width: "100%", padding: "6px 8px", border: "1px solid #CBD5E1", borderRadius: "6px", fontSize: "13px" }}
                />
              </div>

              {/* Item Quantity */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <label style={{ fontSize: "12px", color: "#1E293B", fontWeight: 700 }}>Qty *:</label>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                  style={{ width: "65px", padding: "6px 8px", border: "1px solid #3B82F6", borderRadius: "6px", fontSize: "13px", fontWeight: 700, textAlign: "center", color: "#1D4ED8", background: "#EFF6FF" }}
                />
              </div>
            </div>

            {/* Spec preview string */}
            <div style={{ fontSize: "12px", color: "#64748B", fontWeight: 500 }}>
              Spec String: <strong style={{ color: "#0F172A" }}>{selectedProject} — {formattedVoltage}V {formattedCapacity}Ah Chemistry = {selectedChemistry}{notesText.trim() ? ` (${notesText.trim()})` : ""}</strong>
            </div>

            {errors?.[`orderItem_${idx}`] && <span className="field-error" style={{ marginTop: "4px", display: "block" }}>{errors[`orderItem_${idx}`]}</span>}
            {errors?.[`orderItemQty_${idx}`] && <span className="field-error" style={{ marginTop: "4px", display: "block" }}>{errors[`orderItemQty_${idx}`]}</span>}
          </div>
        );
      })}

      <button
        type="button"
        onClick={addItem}
        style={{
          background: "#FFFFFF",
          color: "#2563EB",
          border: "1px dashed #3B82F6",
          borderRadius: "8px",
          padding: "8px 14px",
          fontSize: "13px",
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          width: "100%",
          justifyContent: "center"
        }}
      >
        + Add Product Line Item
      </button>

      {errors?.orderItems && <span className="field-error" style={{ marginTop: "8px", display: "block" }}>{errors.orderItems}</span>}
    </div>
  );
});

OrderItemsEditor.displayName = "OrderItemsEditor";
