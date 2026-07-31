import { apiClient } from "./apiClient";

export const staffService = {
  getAllStaff: async () => {
    return await apiClient.get("/admin/alladmin");
  },

  updateStaffRole: async (staffId, newRole) => {
    return await apiClient.put("/admin/user-role", { staffId, newRole });
  },

  registerStaff: async (staffData) => {
    return await apiClient.post("/admin/register", staffData);
  },

  getStaffCount: async () => {
    return await apiClient.get("/admin/staff-count");
  }
};
