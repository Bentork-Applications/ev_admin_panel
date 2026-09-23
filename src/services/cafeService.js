import { apiClient } from "./apiClient";

export const cafeService = {
  getAllCafes: async () => {
    return await apiClient.get("/cafes/all");
  },

  createCafe: async (cafeData) => {
    return await apiClient.post("/cafes/add", cafeData);
  },

  updateCafe: async (id, cafeData) => {
    return await apiClient.put(`/cafes/update/${id}`, cafeData);
  },

  deleteCafe: async (id) => {
    return await apiClient.delete(`/cafes/delete/${id}`);
  }
};
