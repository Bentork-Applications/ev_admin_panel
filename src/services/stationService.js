import { apiClient } from "./apiClient";

export const stationService = {
  getAllStations: async () => {
    return await apiClient.get("/stations/all");
  },

  getStationById: async (id) => {
    return await apiClient.get(`/stations/${id}`);
  },

  createStation: async (stationData) => {
    return await apiClient.post("/stations/create", stationData);
  },

  updateStation: async (id, stationData) => {
    return await apiClient.put(`/stations/update/${id}`, stationData);
  },

  deleteStation: async (id) => {
    return await apiClient.delete(`/stations/delete/${id}`);
  }
};
