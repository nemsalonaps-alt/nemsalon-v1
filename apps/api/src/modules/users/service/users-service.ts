import { usersRepo, type ListUsersOptions } from '../repo/users-repo.js';

export const usersService = {
  listUsers(options: ListUsersOptions) {
    return usersRepo.listUsers(options);
  },
  getUserById(userId: string) {
    return usersRepo.getUserById(userId);
  }
};
