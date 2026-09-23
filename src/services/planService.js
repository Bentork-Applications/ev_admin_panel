import { apiClient } from "./apiClient";

export const planService = {
  getAllPlans: async () => {
    return await apiClient.get("/plans/all");
  },

  createPlan: async (planData) => {
    return await apiClient.post("/plans/add", planData);
  },

  updatePlan: async (id, planData) => {
    return await apiClient.put(`/plans/update/${id}`, planData);
  },

  deletePlan: async (id) => {
    return await apiClient.delete(`/plans/delete/${id}`);
  }
};
