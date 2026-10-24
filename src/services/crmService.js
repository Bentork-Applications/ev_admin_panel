import { apiClient } from "./apiClient";

/**
 * CRM Service - handles all API communication for Bentork Sales CRM.
 * Consumes live backend endpoints defined in CrmDashboardController, CrmLeadController,
 * CrmCompanyController, CrmContactController, CrmOpportunityController,
 * CrmQuotationController, and CrmActivityController.
 */
export const crmService = {
  // ==================== DASHBOARD ====================
  getDashboardKPIs: async () => {
    return await apiClient.get("/crm/dashboard/kpis");
  },

  // ==================== LEADS ====================
  getAllLeads: async () => {
    return await apiClient.get("/crm/leads/all");
  },

  getMyLeads: async () => {
    return await apiClient.get("/crm/leads/my-leads");
  },

  getLeadById: async (id) => {
    return await apiClient.get(`/crm/leads/${id}`);
  },

  createLead: async (leadData) => {
    return await apiClient.post("/crm/leads/create", leadData);
  },

  updateLeadStatus: async (id, status) => {
    return await apiClient.put(`/crm/leads/${id}/status`, { status });
  },

  convertLeadToOpportunity: async (id) => {
    return await apiClient.put(`/crm/leads/${id}/convert`, {});
  },

  combinedCallAndLead: async (combinedData) => {
    return await apiClient.post("/crm/leads/combined-call", combinedData);
  },

  getOverdueFollowUps: async () => {
    return await apiClient.get("/crm/leads/overdue-followups");
  },

  searchLeadsByPhone: async (phone) => {
    return await apiClient.get(`/crm/leads/search?phone=${encodeURIComponent(phone)}`);
  },

  // ==================== COMPANIES ====================
  getAllCompanies: async () => {
    return await apiClient.get("/crm/companies/all");
  },

  getCompanyById: async (id) => {
    return await apiClient.get(`/crm/companies/${id}`);
  },

  getCompany360: async (id) => {
    return await apiClient.get(`/crm/companies/${id}/360`);
  },

  createCompany: async (companyData) => {
    return await apiClient.post("/crm/companies/create", companyData);
  },

  updateCompany: async (id, companyData) => {
    return await apiClient.put(`/crm/companies/${id}/update`, companyData);
  },

  searchCompanies: async (query) => {
    return await apiClient.get(`/crm/companies/search?query=${encodeURIComponent(query)}`);
  },

  deactivateCompany: async (id) => {
    return await apiClient.delete(`/crm/companies/${id}`);
  },

  // ==================== CONTACTS ====================
  createContact: async (contactData) => {
    return await apiClient.post("/crm/contacts/create", contactData);
  },

  getAllContacts: async () => {
    return await apiClient.get("/crm/contacts/all");
  },

  getContactsByCompany: async (companyId) => {
    return await apiClient.get(`/crm/contacts/company/${companyId}`);
  },

  searchContactByPhone: async (phone) => {
    return await apiClient.get(`/crm/contacts/search?phone=${encodeURIComponent(phone)}`);
  },

  // ==================== OPPORTUNITIES ====================
  getKanbanData: async () => {
    return await apiClient.get("/crm/opportunities/kanban");
  },

  getAllOpportunities: async () => {
    return await apiClient.get("/crm/opportunities/all");
  },

  getOpportunityById: async (id) => {
    return await apiClient.get(`/crm/opportunities/${id}`);
  },

  createOpportunity: async (opportunityData) => {
    return await apiClient.post("/crm/opportunities/create", opportunityData);
  },

  updateOpportunityStage: async (id, stageData) => {
    // stageData: { stage: string, lostReason?: string }
    return await apiClient.put(`/crm/opportunities/${id}/stage`, stageData);
  },

  getPipelineValue: async () => {
    return await apiClient.get("/crm/opportunities/pipeline-value");
  },

  // ==================== QUOTATIONS ====================
  getQuotationsPaged: async (page = 0, size = 20) => {
    return await apiClient.get(`/crm/quotations/all?paged=true&page=${page}&size=${size}`);
  },

  getAllQuotations: async () => {
    return await apiClient.get("/crm/quotations/all");
  },

  createQuotation: async (quotationData) => {
    return await apiClient.post("/crm/quotations/create", quotationData);
  },

  getQuotationById: async (id) => {
    return await apiClient.get(`/crm/quotations/${id}`);
  },

  sendQuotation: async (id) => {
    return await apiClient.put(`/crm/quotations/${id}/send`, {});
  },

  acceptQuotation: async (id) => {
    return await apiClient.put(`/crm/quotations/${id}/accept`, {});
  },

  rejectQuotation: async (id) => {
    return await apiClient.put(`/crm/quotations/${id}/reject`, {});
  },

  convertToOrder: async (quotationId) => {
    return await apiClient.post(`/crm/quotations/${quotationId}/convert-to-order`, {});
  },

  getQuotationsForOpportunity: async (oppId) => {
    return await apiClient.get(`/crm/quotations/opportunity/${oppId}`);
  },

  // ==================== ORDERS & PAYMENTS ====================
  recordOrderPayment: async (orderId, payload) => {
    // payload: { amount, paymentMethod, referenceNumber, notes }
    return await apiClient.post(`/crm/orders/${orderId}/payments`, payload);
  },

  // ==================== ACTIVITIES ====================
  logActivity: async (activityData) => {
    return await apiClient.post("/crm/activities/log", activityData);
  },

  getActivitySummary: async (myOnly = false, adminId = null) => {
    const params = new URLSearchParams();
    if (myOnly) params.append("myOnly", "true");
    if (adminId) params.append("adminId", adminId);
    const qs = params.toString();
    return await apiClient.get(`/crm/activities/summary${qs ? `?${qs}` : ""}`);
  },

  getFollowUps: async (bucket = "all", page = 0, size = 20, myOnly = false, adminId = null) => {
    const params = new URLSearchParams();
    if (bucket) params.append("bucket", bucket);
    params.append("page", String(page));
    params.append("size", String(size));
    if (myOnly) params.append("myOnly", "true");
    if (adminId) params.append("adminId", adminId);
    return await apiClient.get(`/crm/activities/follow-ups?${params.toString()}`);
  },

  getAllActivities: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        params.append(key, String(val));
      }
    });
    const qs = params.toString();
    return await apiClient.get(`/crm/activities/all${qs ? `?${qs}` : ""}`);
  },

  rescheduleActivity: async (id, payload) => {
    return await apiClient.put(`/crm/activities/${id}/reschedule`, payload);
  },

  completeActivity: async (id, payload = {}) => {
    return await apiClient.put(`/crm/activities/${id}/complete`, payload);
  },

  getActivitiesForLead: async (leadId) => {
    return await apiClient.get(`/crm/activities/lead/${leadId}`);
  },

  getActivitiesForCompany: async (companyId) => {
    return await apiClient.get(`/crm/activities/company/${companyId}`);
  },

  getActivitiesForOpportunity: async (oppId) => {
    return await apiClient.get(`/crm/activities/opportunity/${oppId}`);
  },

  getTodayActivities: async () => {
    return await apiClient.get("/crm/activities/my-today");
  },

  getActivitiesHistory: async () => {
    try {
      const today = await apiClient.get("/crm/activities/my-today");
      return Array.isArray(today) ? today : [];
    } catch {
      return [];
    }
  },

  completeTask: async (activityId, payload = {}) => {
    return await apiClient.put(`/crm/activities/${activityId}/complete`, payload);
  },

  updateTaskStatus: async (activityId, status) => {
    return await apiClient.put(`/crm/activities/${activityId}/status`, { status });
  },

  // ==================== BULK LEAD ACTIONS & IMPORT ====================
  bulkAssignLeads: async (leadIds, targetOwnerAdminId) => {
    return await apiClient.post("/crm/leads/bulk-assign", { leadIds, targetOwnerAdminId });
  },

  bulkTagLeads: async (leadIds, tags) => {
    return await apiClient.post("/crm/leads/bulk-tag", { leadIds, tags });
  },

  importLeadsCsv: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return await apiClient.upload("/crm/leads/import", formData);
  },

  // ==================== REQUIREMENTS ====================
  getAllRequirements: async () => {
    try {
      const res = await apiClient.get("/crm/requirements");
      return Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
    } catch {
      return [];
    }
  },

  getRequirementById: async (id) => {
    return await apiClient.get(`/crm/requirements/${id}`);
  },

  getRequirementsByCompany: async (companyId) => {
    try {
      const res = await apiClient.get(`/crm/requirements/company/${companyId}`);
      return Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
    } catch {
      return [];
    }
  },

  createRequirement: async (requirementData) => {
    return await apiClient.post("/crm/requirements", requirementData);
  },

  updateRequirement: async (id, requirementData) => {
    return await apiClient.put(`/crm/requirements/${id}`, requirementData);
  },

  // ==================== CAMPAIGNS ====================
  getAllCampaigns: async () => {
    try {
      const res = await apiClient.get("/crm/campaigns");
      return Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
    } catch {
      return [];
    }
  },

  getCampaignById: async (id) => {
    return await apiClient.get(`/crm/campaigns/${id}`);
  },

  createCampaign: async (campaignData) => {
    return await apiClient.post("/crm/campaigns", campaignData);
  },

  updateCampaignStatus: async (id, status) => {
    return await apiClient.put(`/crm/campaigns/${id}/status`, { status });
  },

  sendCampaign: async (id) => {
    return await apiClient.post(`/crm/campaigns/${id}/send`, {});
  },

  attachAudienceSegment: async (campaignId, segmentId) => {
    return await apiClient.post(`/crm/campaigns/${campaignId}/add-from-segment/${segmentId}`, {});
  },

  getCampaignRecipients: async (id) => {
    return await apiClient.get(`/crm/campaigns/${id}/recipients`);
  },

  addCampaignRecipients: async (id, recipientsData) => {
    return await apiClient.post(`/crm/campaigns/${id}/recipients`, recipientsData);
  },

  // ==================== AUDIENCE ====================
  buildAudience: async (filterData) => {
    return await apiClient.post("/crm/audience/build", filterData);
  },

  getAudienceSegments: async () => {
    try {
      const res = await apiClient.get("/crm/audience/segments");
      return Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
    } catch {
      return [];
    }
  },

  saveAudienceSegment: async (segmentData) => {
    return await apiClient.post("/crm/audience/segments", segmentData);
  },

  // ==================== INDIAMART ====================
  getIndiaMartLeads: async () => {
    try {
      const res = await apiClient.get("/crm/indiamart/leads");
      if (Array.isArray(res)) return res;
    } catch {
      // Fallback to searching all leads for source IndiaMART
    }
    try {
      const all = await apiClient.get("/crm/leads/all");
      return Array.isArray(all) ? all.filter((l) => (l.source || "").toUpperCase() === "INDIAMART") : [];
    } catch {
      return [];
    }
  },

  syncIndiaMart: async () => {
    return await apiClient.post("/crm/indiamart/sync", {});
  },

  // ==================== REPORTS & ANALYTICS ====================
  getConversionReport: async () => {
    try {
      return await apiClient.get("/crm/reports/conversions");
    } catch {
      return null;
    }
  },

  getRevenueReport: async () => {
    try {
      return await apiClient.get("/crm/reports/revenue");
    } catch {
      return null;
    }
  },

  getPerformanceReport: async (adminId) => {
    try {
      if (!adminId) return null;
      return await apiClient.get(`/crm/reports/performance/${adminId}`);
    } catch {
      return null;
    }
  },

  // ==================== SETTINGS & MASTER DATA ====================
  getAllSettings: async () => {
    try {
      const res = await apiClient.get("/crm/settings");
      return res || [];
    } catch {
      return [];
    }
  },

  updateSetting: async (key, value) => {
    return await apiClient.put(`/crm/settings/${encodeURIComponent(key)}`, { settingValue: String(value) });
  },

  getAutomations: async () => {
    try {
      const res = await apiClient.get("/crm/settings/automations");
      return Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
    } catch {
      return [];
    }
  },

  createAutomation: async (ruleData) => {
    return await apiClient.post("/crm/settings/automations", ruleData);
  },

  updateAutomation: async (id, ruleData) => {
    return await apiClient.put(`/crm/settings/automations/${id}`, ruleData);
  },

  executeAutomations: async () => {
    try {
      return await apiClient.post("/crm/settings/automation/execute", {});
    } catch (err) {
      if (err.status === 404) {
        return await apiClient.post("/crm/settings/automations/execute", {});
      }
      throw err;
    }
  }
};
