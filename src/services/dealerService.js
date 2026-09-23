import { apiClient } from "./apiClient";

export const dealerService = {
  getAllAdmins: async () => {
    return await apiClient.get("/admin/alladmin");
  },

  createDealer: async (dealerData) => {
    return await apiClient.post("/admin/signup", dealerData);
  },

  updateRole: async (payload) => {
    return await apiClient.put("/admin/update-role", payload);
  },

  updateDealer: async (id, dealerData) => {
    return await apiClient.put(`/admin/staff/update/${id}`, dealerData);
  },

  deleteDealer: async (id) => {
    return await apiClient.delete(`/admin/staff/delete/${id}`);
  },

  getAllDealerAssignments: async () => {
    return await apiClient.get("/dealer-stations");
  },

  getStationsByDealerId: async (dealerId) => {
    return await apiClient.get(`/dealer-stations/dealer/${dealerId}`);
  },

  assignStationToDealer: async (payload) => {
    return await apiClient.post("/dealer-stations/assign", payload);
  },

  unassignStationFromDealer: async (dealerId, stationId) => {
    return await apiClient.delete(`/dealer-stations/${dealerId}/${stationId}`);
  }
};
