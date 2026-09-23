import { apiClient } from "./apiClient";

export const maintenanceService = {
  getAllMaintenanceRecords: async () => {
    return await apiClient.get("/maintenance/all");
  },

  getMaintenanceById: async (id) => {
    return await apiClient.get(`/maintenance/${id}`);
  },

  getActiveSchedules: async () => {
    return await apiClient.get("/maintenance/active");
  },

  getStationMaintenance: async (stationId) => {
    return await apiClient.get(`/maintenance/station/${stationId}`);
  },

  getChargerMaintenance: async (chargerId) => {
    return await apiClient.get(`/maintenance/charger/${chargerId}`);
  },

  createMaintenanceRecord: async (data) => {
    return await apiClient.post("/maintenance/create", data);
  },

  updateMaintenanceRecord: async (id, data) => {
    return await apiClient.put(`/maintenance/update/${id}`, data);
  },

  cancelMaintenanceRecord: async (id) => {
    return await apiClient.put(`/maintenance/${id}/cancel`);
  },

  deleteMaintenanceRecord: async (id) => {
    return await apiClient.delete(`/maintenance/delete/${id}`);
  },

  getAllEmergencyContacts: async () => {
    return await apiClient.get("/emergency-contacts/all");
  },

  createEmergencyContact: async (data) => {
    return await apiClient.post("/emergency-contacts/create", data);
  },

  updateEmergencyContact: async (id, data) => {
    return await apiClient.put(`/emergency-contacts/update/${id}`, data);
  },

  deleteEmergencyContact: async (id) => {
    return await apiClient.delete(`/emergency-contacts/delete/${id}`);
  },

  getPendingCount: async () => {
    try {
      const records = await apiClient.get("/maintenance/all");
      return Array.isArray(records)
        ? records.filter((m) => m.status === "SCHEDULED" || m.status === "IN_PROGRESS" || m.status === "PENDING").length
        : 0;
    } catch {
      return 0;
    }
  }
};
