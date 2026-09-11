export interface AdminQuotaState {
  total: number;
  usedToday: number;
  remainingToday: number;
  permanentTotal?: number;
  permanentUsed?: number;
  permanentRemaining?: number;
  bonusRemaining?: number;
  bonusExpiresAt?: string | null;
}

export interface AdminUser {
  id: string;
  username: string | null;
  name: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
  quota: AdminQuotaState;
}

export interface AdminUsersResponse {
  users: AdminUser[];
}

export interface AdminUserResponse {
  user: AdminUser;
}

export interface CreateAdminUserRequest {
  username: string;
  password: string;
  dailyTotal?: number;
  permanentTotal?: number;
}

export interface UpdateAdminUserQuotaRequest {
  dailyTotal?: number;
  permanentTotal?: number;
}
