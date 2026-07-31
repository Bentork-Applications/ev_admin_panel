import { apiClient } from "./apiClient";

export const slotService = {
  getAllSlots: async () => {
    return await apiClient.get("/slots/all");
  },

  getSlotById: async (id) => {
    return await apiClient.get(`/slots/${id}`);
  },

  createSlot: async (slotData) => {
    return await apiClient.post("/slots/create", slotData);
  },

  updateSlot: async (id, slotData) => {
    return await apiClient.put(`/slots/update/${id}`, slotData);
  },

  deleteSlot: async (id) => {
    return await apiClient.delete(`/slots/delete/${id}`);
  },

  getAllBookings: async () => {
    return await apiClient.get("/slots/bookings/all");
  }
};
