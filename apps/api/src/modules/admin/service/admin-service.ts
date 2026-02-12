import { adminRepo } from '../repo/admin-repo.js';

export const adminService = {
  getOverview() {
    return adminRepo.getOverview();
  }
};
