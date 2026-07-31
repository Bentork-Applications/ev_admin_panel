import { apiClient } from "./apiClient";

export const supportService = {
  getAllRequests: async () => {
    return await apiClient.get("/support/all");
  },

  updateRequestStatus: async (id, statusData) => {
    return await apiClient.put(`/support/${id}/status`, statusData);
  },

  getPendingCount: async () => {
    try {
      const requests = await apiClient.get("/support/all");
      return Array.isArray(requests)
        ? requests.filter((r) => r.status === "OPEN" || r.status === "PENDING" || r.status === "IN_PROGRESS").length
        : 0;
    } catch {
      return 0;
    }
  }
};
