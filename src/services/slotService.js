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
    return await apiClient.delete(`/slots/${id}`);
  },

  getAllBookings: async () => {
    return await apiClient.get("/slots/bookings/all");
  },

  getBookingsByStation: async (stationId) => {
    return await apiClient.get(`/slot-bookings/station/${stationId}`);
  },

  getAvailableSlotsByCharger: async (chargerId) => {
    return await apiClient.get(`/slots/charger/${chargerId}/available`);
  },

  cancelBooking: async (bookingId) => {
    return await apiClient.put(`/slot-bookings/${bookingId}/cancel`);
  }
};
