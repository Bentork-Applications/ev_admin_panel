import { apiClient } from "./apiClient";

export const maintenanceService = {
  getAllMaintenanceRecords: async () => {
    return await apiClient.get("/maintenance/all");
  },

  getMaintenanceById: async (id) => {
    return await apiClient.get(`/maintenance/${id}`);
  },

  createMaintenanceRecord: async (data) => {
    return await apiClient.post("/maintenance/create", data);
  },

  updateMaintenanceRecord: async (id, data) => {
    return await apiClient.put(`/maintenance/update/${id}`, data);
  },

  deleteMaintenanceRecord: async (id) => {
    return await apiClient.delete(`/maintenance/delete/${id}`);
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
