import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Settings, Plus, Edit2, X, CheckCircle2, ShieldAlert, RefreshCw, AlertCircle, Info } from "lucide-react";
import { Toast } from "../../../components/common/Toast";
import { crmService } from "../../../services/crmService";

const DEFAULT_MASTER_DATA = [
  { id: "lead_status", master: "Lead Status", values: "New, Contacted, Qualified, Follow-up, Won, Lost" },
  { id: "call_outcomes", master: "Call Outcomes", values: "Interested, Call Back, No Answer, Not Interested" },
  { id: "next_actions", master: "Next Actions", values: "Quote, Brochure, Call Back, Meeting, Visit" },
  { id: "lead_sources", master: "Lead Sources", values: "IndiaMART, Phone, Website, Referral, Campaign" }
];

const DEFAULT_AUTOMATIONS = [
  { id: 1, title: "IndiaMART Inbound Ingestion", desc: "Ingest inquiry → Parse contact → Assign owner → Trigger first-contact task" },
  { id: 2, title: "Call Back Outcome Task", desc: "Create calendar follow-up task automatically when outcome is Call Back" },
  { id: 3, title: "Quotation Expiry Reminder", desc: "Notify deal owner 48 hours before quotation validity period expires" },
  { id: 4, title: "Overdue SLA Escalation", desc: "Alert sales administrator when a follow-up is overdue by >24 hours" }
];

export default function CrmSettingsPage() {
  const [masterData, setMasterData] = useState(DEFAULT_MASTER_DATA);
  const [automations, setAutomations] = useState(DEFAULT_AUTOMATIONS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Edit Master modal
  const [editingMaster, setEditingMaster] = useState(null);
  const [editValues, setEditValues] = useState("");
  const [savingMaster, setSavingMaster] = useState(false);

  // Add rule modal
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [newRule, setNewRule] = useState({ title: "", desc: "" });
  const [savingRule, setSavingRule] = useState(false);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [settingsRes, autosRes] = await Promise.all([
        crmService.getAllSettings().catch(() => ({})),
        crmService.getAutomations().catch(() => [])
      ]);

      if (Array.isArray(settingsRes) && settingsRes.length > 0) {
        const mapped = settingsRes.map((item) => ({
          id: item.key || item.id,
          master: (item.key || item.name || "").replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
          values: typeof item.value === "string" ? item.value : JSON.stringify(item.value || item.defaultValue || "")
        }));
        if (mapped.length > 0) setMasterData(mapped);
      } else if (settingsRes && typeof settingsRes === "object" && Object.keys(settingsRes).length > 0) {
        const mapped = Object.keys(settingsRes).map((k) => ({
          id: k,
          master: k.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
          values: typeof settingsRes[k] === "string" ? settingsRes[k] : JSON.stringify(settingsRes[k])
        }));
        if (mapped.length > 0) setMasterData(mapped);
      }

      if (Array.isArray(autosRes) && autosRes.length > 0) {
        setAutomations(autosRes);
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
      setError(err.message || "Failed to load CRM settings");
      showToast(err.message || "Failed to load CRM settings", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSaveMaster = async (e) => {
    e.preventDefault();
    if (!editingMaster) return;

    setSavingMaster(true);
    try {
      await crmService.updateSetting(editingMaster.id, editValues);
      setMasterData((prev) =>
        prev.map((m) => (m.id === editingMaster.id ? { ...m, values: editValues } : m))
      );
      showToast("Master Data values updated successfully in backend", "success");
      setEditingMaster(null);
    } catch (err) {
      console.error("Save master data error:", err);
      showToast(err.message || "Failed to save master values on server", "error");
    } finally {
      setSavingMaster(false);
    }
  };

  const handleAddRule = async (e) => {
    e.preventDefault();
    if (!newRule.title) return;

    setSavingRule(true);
    try {
      const res = await crmService.createAutomation(newRule);
      if (res && res.id) {
        setAutomations((prev) => [...prev, res]);
        showToast("Automation rule created on server", "success");
        setShowAddRuleModal(false);
        setNewRule({ title: "", desc: "" });
      } else {
        showToast("Backend Required: Custom automation rules engine endpoint is not implemented on server", "info");
      }
    } catch (err) {
      showToast(
        "Backend Required: Custom automation engine API (/api/crm/settings/automations) is pending backend development.",
        "info"
      );
    } finally {
      setSavingRule(false);
    }
  };

  return (
    <div style={{ maxWidth: "1480px", margin: "0 auto", padding: "16px 20px" }}>
      <style>{`
        .crm-settings-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 24px;
          align-items: flex-start;
        }
        @media (max-width: 992px) {
          .crm-settings-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#0F172A", margin: 0 }}>
            CRM Configuration & Settings
          </h1>
          <p style={{ fontSize: "13px", color: "#64748B", margin: "4px 0 0 0" }}>
            Configure CRM master dropdown values, status definitions and automation workflows
          </p>
        </div>

        <button
          onClick={fetchSettings}
          disabled={loading}
          style={{
            padding: "9px 14px",
            borderRadius: "8px",
            backgroundColor: "#ffffff",
            border: "1px solid #CBD5E1",
            fontSize: "13px",
            fontWeight: 600,
            color: "#475569",
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

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
            onClick={fetchSettings}
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

      {/* 2-Column Responsive Grid */}
      <div className="crm-settings-grid">
        {/* Left Col: Master Data */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
            overflow: "hidden"
          }}
        >
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0" }}>
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>
              Master Data Dropdowns
            </h3>
            <span style={{ fontSize: "12px", color: "#64748B", marginTop: "2px", display: "block" }}>
              Dynamic values configured for lead statuses, call outcomes and sources
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid #E2E8F0", textAlign: "left", color: "#64748B" }}>
                  <th style={{ padding: "12px 16px", fontWeight: 600, width: "140px" }}>MASTER</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>CONFIGURED VALUES</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "right", width: "80px" }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {masterData.map((row) => (
                  <tr key={row.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 600, color: "#0F172A" }}>{row.master}</td>
                    <td style={{ padding: "12px 16px", color: "#334155" }}>{row.values}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <button
                        onClick={() => {
                          setEditingMaster(row);
                          setEditValues(row.values);
                        }}
                        title="Edit Master Values"
                        style={{
                          padding: "4px 8px",
                          borderRadius: "6px",
                          border: "1px solid #CBD5E1",
                          backgroundColor: "#fff",
                          color: "#2563EB",
                          fontSize: "12px",
                          cursor: "pointer"
                        }}
                      >
                        <Edit2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Col: Automation Rules */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #E2E8F0",
            padding: "20px",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>
                Automation Rules
              </h3>
              <span style={{ fontSize: "11px", color: "#64748B" }}>
                Default system workflows
              </span>
            </div>

            <button
              onClick={() => setShowAddRuleModal(true)}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                backgroundColor: "#2563EB",
                color: "#fff",
                border: "none",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}
            >
              <Plus size={14} />
              <span>Add Rule</span>
            </button>
          </div>

          <div
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              backgroundColor: "#F8FAFC",
              border: "1px solid #E2E8F0",
              fontSize: "11.5px",
              color: "#64748B",
              marginBottom: "14px"
            }}
          >
            Custom workflow engine persistence is <strong>Backend Required</strong>. Built-in system triggers shown below.
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {automations.map((a) => (
              <div
                key={a.id}
                style={{
                  backgroundColor: "#F8FAFC",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  border: "1px solid #E2E8F0"
                }}
              >
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A", marginBottom: "2px" }}>
                  {a.title}
                </div>
                <div style={{ fontSize: "12px", color: "#64748B" }}>{a.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit Master Modal */}
      {editingMaster && (
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
          onClick={() => setEditingMaster(null)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "480px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
                Edit {editingMaster.master} Values
              </h3>
              <button onClick={() => setEditingMaster(null)} style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveMaster} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                  Comma-separated Values
                </label>
                <textarea
                  rows={3}
                  value={editValues}
                  onChange={(e) => setEditValues(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setEditingMaster(null)}
                  style={{ padding: "8px 16px", borderRadius: "8px", backgroundColor: "#fff", border: "1px solid #CBD5E1", fontSize: "13px", fontWeight: 600, color: "#475569", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingMaster}
                  style={{ padding: "8px 18px", borderRadius: "8px", backgroundColor: "#2563EB", border: "none", fontSize: "13px", fontWeight: 600, color: "#fff", cursor: savingMaster ? "not-allowed" : "pointer" }}
                >
                  {savingMaster ? "Saving..." : "Save Values"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Automation Rule Modal */}
      {showAddRuleModal && (
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
          onClick={() => setShowAddRuleModal(false)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "480px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>Add Automation Rule</h3>
              <button onClick={() => setShowAddRuleModal(false)} style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddRule} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Rule Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Inactivity Reminder"
                  value={newRule.title}
                  onChange={(e) => setNewRule({ ...newRule, title: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Workflow Description</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Notify owner when lead has no contact for 5 days"
                  value={newRule.desc}
                  onChange={(e) => setNewRule({ ...newRule, desc: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowAddRuleModal(false)}
                  style={{ padding: "8px 16px", borderRadius: "8px", backgroundColor: "#fff", border: "1px solid #CBD5E1", fontSize: "13px", fontWeight: 600, color: "#475569", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRule}
                  style={{ padding: "8px 18px", borderRadius: "8px", backgroundColor: "#2563EB", border: "none", fontSize: "13px", fontWeight: 600, color: "#fff", cursor: savingRule ? "not-allowed" : "pointer" }}
                >
                  {savingRule ? "Saving..." : "Save Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
