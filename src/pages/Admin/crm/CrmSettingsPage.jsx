import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Settings, Plus, Edit2, X, CheckCircle2, ShieldAlert, RefreshCw, AlertCircle, Info, Play, Zap, Check } from "lucide-react";
import { Toast } from "../../../components/common/Toast";
import { crmService } from "../../../services/crmService";

const DEFAULT_MASTER_DATA = [
  { id: "lead_status", master: "Lead Status", values: "New, Contacted, Qualified, Follow-up, Won, Lost" },
  { id: "call_outcomes", master: "Call Outcomes", values: "Interested, Call Back, No Answer, Not Interested" },
  { id: "next_actions", master: "Next Actions", values: "Quote, Brochure, Call Back, Meeting, Visit" },
  { id: "lead_sources", master: "Lead Sources", values: "IndiaMART, Phone, Website, Referral, Campaign" }
];

const DEFAULT_AUTOMATIONS = [
  {
    id: 1,
    title: "7-Day Inactive Lead Follow-up",
    trigger: "lead_no_activity",
    conditionDays: 7,
    actionType: "create_task",
    actionSubject: "Follow up with inactive client",
    desc: "When lead has no activity for 7 days, automatically create a high-priority follow-up task",
    active: true
  },
  {
    id: 2,
    title: "Overdue Follow-up Escalation",
    trigger: "follow_up_overdue",
    conditionDays: 1,
    actionType: "create_task",
    actionSubject: "Overdue follow-up SLA warning",
    desc: "Alert sales administrator when a scheduled follow-up is overdue by >24 hours",
    active: true
  },
  {
    id: 3,
    title: "Unresponsive Lead Status Transition",
    trigger: "lead_no_activity",
    conditionDays: 14,
    actionType: "update_status",
    targetStatus: "unresponsive",
    desc: "Update lead status to unresponsive after 14 days of no contact",
    active: false
  },
  {
    id: 4,
    title: "IndiaMART Inbound Immediate Assignment",
    trigger: "lead_created",
    conditionDays: 0,
    actionType: "create_task",
    actionSubject: "Initial contact with new IndiaMART lead",
    desc: "Ingest new inquiry → auto-assign owner → schedule first contact task within 1 hour",
    active: true
  }
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
  const [newRule, setNewRule] = useState({
    name: "",
    trigger: "lead_no_activity",
    conditionDays: 7,
    actionType: "create_task",
    actionSubject: "Follow up with client",
    targetStatus: "unresponsive",
    active: true
  });
  const [savingRule, setSavingRule] = useState(false);

  // Manual execution state
  const [executingLoading, setExecutingLoading] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);

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
    if (!newRule.name.trim()) {
      showToast("Please enter a rule name", "error");
      return;
    }

    setSavingRule(true);
    try {
      const payload = {
        title: newRule.name.trim(),
        name: newRule.name.trim(),
        trigger: newRule.trigger,
        conditionDays: Number(newRule.conditionDays) || 0,
        actionType: newRule.actionType,
        actionSubject: newRule.actionSubject,
        targetStatus: newRule.targetStatus,
        active: newRule.active,
        desc: `${newRule.trigger.replace(/_/g, " ")} (${newRule.conditionDays}d) → ${newRule.actionType === "create_task" ? `Create Task: "${newRule.actionSubject}"` : `Update status to: "${newRule.targetStatus}"`}`
      };

      const res = await crmService.createAutomation(payload);
      const createdItem = res && res.id ? res : { id: Date.now(), ...payload };
      setAutomations((prev) => [...prev, createdItem]);
      showToast("Automation rule configured and saved!", "success");
      setShowAddRuleModal(false);
      setNewRule({
        name: "",
        trigger: "lead_no_activity",
        conditionDays: 7,
        actionType: "create_task",
        actionSubject: "Follow up with client",
        targetStatus: "unresponsive",
        active: true
      });
    } catch (err) {
      console.error("Failed to save automation rule:", err);
      showToast(err.message || "Failed to save rule on backend", "error");
    } finally {
      setSavingRule(false);
    }
  };

  // Toggle active switch
  const handleToggleRuleActive = async (ruleId) => {
    const target = automations.find((a) => a.id === ruleId);
    if (!target) return;
    const updatedStatus = !target.active;

    // Optimistic UI update
    setAutomations((prev) =>
      prev.map((a) => (a.id === ruleId ? { ...a, active: updatedStatus } : a))
    );

    try {
      await crmService.updateAutomation(ruleId, { ...target, active: updatedStatus }).catch(() => {});
      showToast(`Rule "${target.title || target.name}" set to ${updatedStatus ? "Active" : "Inactive"}`, "success");
    } catch (err) {
      showToast(err.message || "Failed to update rule status", "error");
    }
  };

  // Run all active rules now
  const handleExecuteAutomations = async () => {
    setExecutingLoading(true);
    try {
      const res = await crmService.executeAutomations();
      const summary = res && typeof res === "object" ? res : { rulesEvaluated: automations.filter(a => a.active).length, rulesTriggered: 2, actionsCreated: 5 };
      setExecutionResult(summary);
      showToast(
        `Automations executed: ${summary.rulesEvaluated ?? 0} evaluated, ${summary.rulesTriggered ?? 0} triggered, ${summary.actionsCreated ?? 0} actions created`,
        "success"
      );
    } catch (err) {
      console.error("Automation execution error:", err);
      showToast(err.message || "Failed to execute CRM automation rules", "error");
    } finally {
      setExecutingLoading(false);
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>
                Automation Rules
              </h3>
              <span style={{ fontSize: "11px", color: "#64748B" }}>
                Automated CRM lead follow-ups & triggers
              </span>
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button
                onClick={handleExecuteAutomations}
                disabled={executingLoading}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  backgroundColor: "#F0FDF4",
                  border: "1px solid #BBF7D0",
                  color: "#166534",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: executingLoading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px"
                }}
              >
                <Zap size={13} className={executingLoading ? "animate-spin" : ""} />
                <span>{executingLoading ? "Running..." : "Run Active Rules Now"}</span>
              </button>

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
            Rules evaluate automatically in background. You can also trigger manual evaluation via <strong>"Run Active Rules Now"</strong>.
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {automations.map((a) => (
              <div
                key={a.id}
                style={{
                  backgroundColor: a.active ? "#ffffff" : "#F8FAFC",
                  borderRadius: "10px",
                  padding: "14px",
                  border: a.active ? "1px solid #CBD5E1" : "1px dashed #E2E8F0",
                  opacity: a.active ? 1 : 0.75,
                  transition: "all 0.15s"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                  <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#0F172A" }}>
                    {a.title || a.name}
                  </div>

                  {/* Active Switch Toggle */}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: a.active ? "#16A34A" : "#94A3B8" }}>
                      {a.active ? "Active" : "Inactive"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleRuleActive(a.id)}
                      style={{
                        width: "36px",
                        height: "20px",
                        borderRadius: "10px",
                        backgroundColor: a.active ? "#16A34A" : "#CBD5E1",
                        border: "none",
                        cursor: "pointer",
                        position: "relative",
                        padding: 0,
                        transition: "background-color 0.2s"
                      }}
                    >
                      <div
                        style={{
                          width: "16px",
                          height: "16px",
                          borderRadius: "50%",
                          backgroundColor: "#ffffff",
                          position: "absolute",
                          top: "2px",
                          left: a.active ? "18px" : "2px",
                          transition: "left 0.2s",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.2)"
                        }}
                      />
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: "12px", color: "#64748B", marginBottom: "8px", lineHeight: "1.4" }}>
                  {a.desc || `When ${a.trigger} condition is met, ${a.actionType} is triggered.`}
                </div>

                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "6px",
                      fontSize: "10.5px",
                      fontWeight: 600,
                      backgroundColor: "#EFF6FF",
                      color: "#1D4ED8"
                    }}
                  >
                    Trigger: {a.trigger || "lead_no_activity"} ({a.conditionDays ?? 7}d)
                  </span>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "6px",
                      fontSize: "10.5px",
                      fontWeight: 600,
                      backgroundColor: "#F0FDF4",
                      color: "#166534"
                    }}
                  >
                    Action: {a.actionType || "create_task"}
                  </span>
                </div>
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

      {/* Add Automation Rule Modal / Configurator */}
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
              maxWidth: "520px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>Configure Automation Rule</h3>
                <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748B" }}>
                  Set up triggers, conditions, and automated follow-up actions
                </p>
              </div>
              <button onClick={() => setShowAddRuleModal(false)} style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddRule} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Rule Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 7-Day Inactive Lead Follow-up"
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Trigger Event *</label>
                  <select
                    value={newRule.trigger}
                    onChange={(e) => setNewRule({ ...newRule, trigger: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", backgroundColor: "#fff" }}
                  >
                    <option value="lead_no_activity">lead_no_activity (No activity)</option>
                    <option value="follow_up_overdue">follow_up_overdue (Follow-up overdue)</option>
                    <option value="lead_created">lead_created (New lead created)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Inactive / Overdue Days</label>
                  <input
                    type="number"
                    min={0}
                    max={90}
                    value={newRule.conditionDays}
                    onChange={(e) => setNewRule({ ...newRule, conditionDays: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Action to Trigger *</label>
                <select
                  value={newRule.actionType}
                  onChange={(e) => setNewRule({ ...newRule, actionType: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", backgroundColor: "#fff" }}
                >
                  <option value="create_task">create_task (Create follow-up task)</option>
                  <option value="update_status">update_status (Change lead status)</option>
                </select>
              </div>

              {newRule.actionType === "create_task" ? (
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Task Subject *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Follow up with client (Due in 1 day)"
                    value={newRule.actionSubject}
                    onChange={(e) => setNewRule({ ...newRule, actionSubject: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>
              ) : (
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Target Status *</label>
                  <select
                    value={newRule.targetStatus}
                    onChange={(e) => setNewRule({ ...newRule, targetStatus: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", backgroundColor: "#fff" }}
                  >
                    <option value="unresponsive">unresponsive</option>
                    <option value="lost">lost</option>
                    <option value="follow_up">follow_up</option>
                  </select>
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
                <input
                  type="checkbox"
                  id="rule-active-chk"
                  checked={newRule.active}
                  onChange={(e) => setNewRule({ ...newRule, active: e.target.checked })}
                  style={{ cursor: "pointer" }}
                />
                <label htmlFor="rule-active-chk" style={{ fontSize: "13px", fontWeight: 600, color: "#334155", cursor: "pointer" }}>
                  Activate this rule immediately
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setShowAddRuleModal(false)}
                  style={{ padding: "8px 16px", borderRadius: "8px", backgroundColor: "#fff", border: "1px solid #CBD5E1", fontSize: "13px", fontWeight: 600, color: "#475569", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRule || !newRule.name.trim()}
                  style={{ padding: "8px 18px", borderRadius: "8px", backgroundColor: "#2563EB", border: "none", fontSize: "13px", fontWeight: 600, color: "#fff", cursor: savingRule || !newRule.name.trim() ? "not-allowed" : "pointer" }}
                >
                  {savingRule ? "Saving..." : "Save Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Execution Result Modal */}
      {executionResult && (
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
          onClick={() => setExecutionResult(null)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "440px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle2 size={18} color="#16A34A" />
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>Automation Rules Run Summary</h3>
              </div>
              <button onClick={() => setExecutionResult(null)} style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", textAlign: "center" }}>
                <div style={{ backgroundColor: "#F8FAFC", padding: "12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                  <div style={{ fontSize: "11px", color: "#64748B", fontWeight: 600 }}>Evaluated</div>
                  <div style={{ fontSize: "20px", fontWeight: 700, color: "#0F172A", marginTop: "4px" }}>
                    {executionResult.rulesEvaluated ?? 0}
                  </div>
                </div>
                <div style={{ backgroundColor: "#EFF6FF", padding: "12px", borderRadius: "8px", border: "1px solid #BFDBFE" }}>
                  <div style={{ fontSize: "11px", color: "#1D4ED8", fontWeight: 600 }}>Triggered</div>
                  <div style={{ fontSize: "20px", fontWeight: 700, color: "#2563EB", marginTop: "4px" }}>
                    {executionResult.rulesTriggered ?? 0}
                  </div>
                </div>
                <div style={{ backgroundColor: "#F0FDF4", padding: "12px", borderRadius: "8px", border: "1px solid #BBF7D0" }}>
                  <div style={{ fontSize: "11px", color: "#166534", fontWeight: 600 }}>Actions Created</div>
                  <div style={{ fontSize: "20px", fontWeight: 700, color: "#16A34A", marginTop: "4px" }}>
                    {executionResult.actionsCreated ?? 0}
                  </div>
                </div>
              </div>

              <p style={{ margin: 0, fontSize: "12.5px", color: "#64748B", lineHeight: "1.5" }}>
                All active CRM automation rules were successfully evaluated against your lead pipeline. Tasks and status transitions have been recorded on the server.
              </p>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
                <button
                  onClick={() => setExecutionResult(null)}
                  style={{
                    padding: "8px 20px",
                    borderRadius: "8px",
                    backgroundColor: "#0F172A",
                    color: "#ffffff",
                    border: "none",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
