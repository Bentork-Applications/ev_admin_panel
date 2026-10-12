import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  User,
  Search,
  Plus,
  Phone,
  Mail,
  Building,
  RefreshCw,
  PhoneCall,
  CheckCircle2
} from "lucide-react";
import { crmService } from "../../../services/crmService";
import { Toast } from "../../../components/common/Toast";
import { CreateContactModal } from "../../../components/crm/CreateContactModal";
import { NewCallDrawer } from "../../../components/crm/NewCallDrawer";

export default function CrmContactsPage() {
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Drawers
  const [showCreateContactModal, setShowCreateContactModal] = useState(false);
  const [showNewCallDrawer, setShowNewCallDrawer] = useState(false);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  // Fetch companies for dropdown filter
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const data = await crmService.getAllCompanies();
        setCompanies(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn("Failed to fetch companies:", err);
      }
    };
    fetchCompanies();
  }, []);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      if (selectedCompanyId) {
        const data = await crmService.getContactsByCompany(selectedCompanyId);
        setContacts(Array.isArray(data) ? data : []);
      } else {
        // Fetch contacts across all companies
        const allCompanies = await crmService.getAllCompanies();
        const contactPromises = (Array.isArray(allCompanies) ? allCompanies : []).map((comp) =>
          crmService.getContactsByCompany(comp.id).catch(() => [])
        );
        const contactArrays = await Promise.all(contactPromises);
        const aggregated = contactArrays.flat();
        setContacts(aggregated);
      }
    } catch (err) {
      console.error("Failed to load contacts:", err);
      showToast(err.message || "Failed to load contacts", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId, showToast]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const q = searchQuery.toLowerCase();
    return contacts.filter(
      (c) =>
        (c.name || "").toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.designation || "").toLowerCase().includes(q) ||
        (c.companyName || "").toLowerCase().includes(q)
    );
  }, [contacts, searchQuery]);

  return (
    <div style={{ maxWidth: "1440px", margin: "0 auto", padding: "8px 12px" }}>
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
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#111827", margin: 0 }}>
            Contacts Directory
          </h1>
          <p style={{ fontSize: "13px", color: "#6B7280", margin: "3px 0 0 0" }}>
            Customer contacts, buyers, technical heads, and decision makers
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={() => setShowNewCallDrawer(true)}
            style={{
              padding: "9px 16px",
              borderRadius: "8px",
              backgroundColor: "#10B981",
              color: "#ffffff",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 4px rgba(16, 185, 129, 0.2)"
            }}
          >
            <PhoneCall size={16} />
            <span>+ New Call</span>
          </button>

          <button
            onClick={() => setShowCreateContactModal(true)}
            style={{
              padding: "9px 16px",
              borderRadius: "8px",
              backgroundColor: "#059669",
              color: "#ffffff",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <Plus size={16} />
            <span>+ Add Contact</span>
          </button>

          <button
            onClick={fetchContacts}
            title="Refresh"
            style={{
              padding: "9px",
              borderRadius: "8px",
              backgroundColor: "#ffffff",
              border: "1px solid #D1D5DB",
              color: "#4B5563",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "12px"
        }}
      >
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {/* Text Search */}
          <div style={{ position: "relative", width: "260px" }}>
            <Search size={15} color="#9CA3AF" style={{ position: "absolute", left: "10px", top: "10px" }} />
            <input
              type="text"
              placeholder="Search name, phone, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 34px",
                borderRadius: "8px",
                border: "1px solid #D1D5DB",
                fontSize: "13px",
                boxSizing: "border-box"
              }}
            />
          </div>

          {/* Company Filter Dropdown */}
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #D1D5DB",
              fontSize: "13px",
              backgroundColor: "#ffffff",
              color: "#374151"
            }}
          >
            <option value="">All Companies ({companies.length})</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <span style={{ fontSize: "13px", color: "#6B7280" }}>
          Showing <strong>{filteredContacts.length}</strong> contacts
        </span>
      </div>

      {/* Contacts Table */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "14px",
          border: "1px solid #E5E7EB",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
          overflow: "hidden"
        }}
      >
        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#6B7280" }}>
            Loading contacts...
          </div>
        ) : filteredContacts.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center", color: "#6B7280" }}>
            <User size={40} color="#9CA3AF" style={{ marginBottom: "12px" }} />
            <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: 700, color: "#111827" }}>
              No contacts found
            </h3>
            <p style={{ margin: "0 0 16px 0", fontSize: "13px" }}>
              {searchQuery ? "No contacts matched your search query." : "No contacts added yet."}
            </p>
            <button
              onClick={() => setShowCreateContactModal(true)}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                backgroundColor: "#10B981",
                color: "#ffffff",
                border: "none",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              + Add First Contact
            </button>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ backgroundColor: "#F9FAFB", borderBottom: "1px solid #E5E7EB", textAlign: "left", color: "#6B7280" }}>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>Contact Name</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>Designation</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>Associated Company</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>Phone</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>Email</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((ct) => (
                  <tr
                    key={ct.id || Math.random()}
                    style={{
                      borderBottom: "1px solid #F3F4F6",
                      transition: "background-color 0.15s"
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F9FAFB")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            backgroundColor: "#ECFDF5",
                            color: "#10B981",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: "12px",
                            flexShrink: 0
                          }}
                        >
                          {(ct.name || "U")[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <strong style={{ color: "#111827" }}>{ct.name}</strong>
                            {ct.isPrimary && (
                              <span style={{ fontSize: "10px", fontWeight: 700, color: "#10B981", backgroundColor: "#ECFDF5", padding: "1px 6px", borderRadius: "4px" }}>
                                PRIMARY
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: "12px 16px", color: "#4B5563" }}>
                      {ct.designation || "—"}
                    </td>

                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#111827", fontWeight: 500 }}>
                        <Building size={14} color="#6B7280" />
                        <span>{ct.companyName || "—"}</span>
                      </div>
                    </td>

                    <td style={{ padding: "12px 16px", color: "#111827", fontWeight: 500 }}>
                      {ct.phone || "—"}
                    </td>

                    <td style={{ padding: "12px 16px", color: "#6B7280" }}>
                      {ct.email || "—"}
                    </td>

                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <button
                        onClick={() => setShowNewCallDrawer(true)}
                        style={{
                          padding: "5px 12px",
                          borderRadius: "6px",
                          backgroundColor: "#ECFDF5",
                          color: "#065F46",
                          border: "1px solid #A7F3D0",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        <PhoneCall size={12} />
                        <span>Call</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals & Drawers */}
      {showCreateContactModal && (
        <CreateContactModal
          isOpen={showCreateContactModal}
          onClose={() => setShowCreateContactModal(false)}
          companyId={selectedCompanyId || null}
          onContactSaved={fetchContacts}
          showToast={showToast}
        />
      )}

      {showNewCallDrawer && (
        <NewCallDrawer
          isOpen={showNewCallDrawer}
          onClose={() => setShowNewCallDrawer(false)}
          onSuccess={fetchContacts}
          showToast={showToast}
        />
      )}
    </div>
  );
}
