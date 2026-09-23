import { apiClient } from "./apiClient";

export const userService = {
  getAllUsers: async () => {
    return await apiClient.get("/user/all");
  },

  getUserById: async (id) => {
    return await apiClient.get(`/user/details/${id}`);
  },

  updateUser: async (id, userData) => {
    return await apiClient.put(`/user/update/${id}`, userData);
  },

  deleteUser: async (id) => {
    return await apiClient.delete(`/user/delete/${id}`);
  },

  getAllRfids: async () => {
    return await apiClient.get("/rfid/all");
  },

  assignRfid: async (payload) => {
    return await apiClient.post("/rfid/assign", payload);
  },

  unassignRfid: async (rfidId) => {
    return await apiClient.post(`/rfid/unassign/${rfidId}`);
  },

  getUserWallet: async (userId) => {
    return await apiClient.get(`/wallet/user/${userId}`);
  }
};
