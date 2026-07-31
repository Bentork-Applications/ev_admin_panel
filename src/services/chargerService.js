import { apiClient } from "./apiClient";

export const chargerService = {
  getAllChargers: async () => {
    return await apiClient.get("/chargers/all");
  },

  getChargerById: async (id) => {
    return await apiClient.get(`/chargers/${id}`);
  },

  createCharger: async (chargerData) => {
    return await apiClient.post("/chargers/create", chargerData);
  },

  updateCharger: async (id, chargerData) => {
    return await apiClient.put(`/chargers/update/${id}`, chargerData);
  },

  deleteCharger: async (id) => {
    return await apiClient.delete(`/chargers/delete/${id}`);
  }
};
