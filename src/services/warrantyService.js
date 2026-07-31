import { apiClient } from "./apiClient";

export const warrantyService = {
  getAllClaims: async () => {
    return await apiClient.get("/warranty-claims/admin/all");
  },

  getClaimById: async (id) => {
    return await apiClient.get(`/warranty-claims/${id}`);
  },

  updateClaimStatus: async (id, statusData) => {
    return await apiClient.put(`/warranty-claims/${id}/status`, statusData);
  },

  getPendingCount: async () => {
    try {
      const claims = await apiClient.get("/warranty-claims/admin/all");
      return Array.isArray(claims) ? claims.filter((c) => c.status === "request_created").length : 0;
    } catch {
      return 0;
    }
  }
};
