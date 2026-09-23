import { apiClient } from "./apiClient";

export const sessionService = {
  getAllSessionRecords: async () => {
    return await apiClient.get("/sessions/all/records");
  },

  getDealerSessions: async () => {
    return await apiClient.get("/dealer/sessions");
  }
};
