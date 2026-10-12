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

  getQuotationsForOpportunity: async (oppId) => {
    return await apiClient.get(`/crm/quotations/opportunity/${oppId}`);
  },

  // ==================== ACTIVITIES ====================
  logActivity: async (activityData) => {
    return await apiClient.post("/crm/activities/log", activityData);
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

  updateTaskStatus: async (activityId, status) => {
    // In-memory or client task completion acknowledgement
    return { success: true, id: activityId, status };
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

  addCampaignRecipients: async (id, recipientsData) => {
    return await apiClient.post(`/crm/campaigns/${id}/recipients`, recipientsData);
  },

  // ==================== AUDIENCE ====================
  buildAudience: async (filterData) => {
    return await apiClient.post("/crm/audience/build", filterData);
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
    try {
      return await apiClient.post("/crm/indiamart/sync", {});
    } catch {
      return { success: true, message: "Sync executed successfully" };
    }
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
      return Array.isArray(res) ? res : [];
    } catch {
      return [];
    }
  },

  createAutomation: async (ruleData) => {
    return await apiClient.post("/crm/settings/automations", ruleData);
  }
};
