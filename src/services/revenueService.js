import { apiClient } from "./apiClient";

export const revenueService = {
  getTotalRevenue: async () => {
    return await apiClient.get("/revenue/total");
  },

  getPendingRevenue: async () => {
    return await apiClient.get("/revenue/pending");
  },

  getTotalTransactions: async () => {
    return await apiClient.get("/revenue/transactions/total");
  },

  getSuccessRate: async () => {
    return await apiClient.get("/revenue/success-rate");
  },

  getAllRevenueRecords: async () => {
    return await apiClient.get("/revenue/all");
  },

  getDealerTotalRevenue: async () => {
    return await apiClient.get("/dealer/revenue/total");
  },

  getDealerRevenueRecords: async () => {
    return await apiClient.get("/dealer/revenue");
  },

  getDealerStations: async () => {
    return await apiClient.get("/dealer/stations");
  },

  getDealerChargers: async () => {
    return await apiClient.get("/dealer/chargers");
  },

  getDealerSessions: async () => {
    return await apiClient.get("/dealer/sessions");
  }
};
