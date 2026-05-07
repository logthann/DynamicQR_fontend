/**
 * Users/Employees API Module
 *
 * Endpoints:
 * - GET /api/v1/users
 * - GET /api/v1/users/{user_id}
 * - PATCH /api/v1/users/{user_id}
 * - DELETE /api/v1/users/{user_id}
 */

import { getAPIClient, UnknownRecord } from './base-client';

export interface User {
  id: string;
  username: string;
  fullName?: string;
  phoneNumber?: string;
  address?: string;
  passwordMasked?: string;
  email: string;
  role: "admin" | "employee";
  campaignsCreated: number;
  qrCodesCreated: number;
  createdAt: string;
}

export interface UserCampaignSummary {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'draft';
  createdAt: string;
}

export interface UserQRCodeSummary {
  id: string;
  name: string;
  scans: number;
  createdAt: string;
}

export interface UserDetailResponse {
  user: User;
  campaigns: UserCampaignSummary[];
  qrCodes: UserQRCodeSummary[];
}

export interface GetUsersResponse {
  users: User[];
  total: number;
}

export interface GetUsersRequest {
  page?: number;
  limit?: number;
}

export interface GetUserByIdRequest {
  userId: string;
}

export interface UpdateUserRequest {
  userId: string;
  username?: string;
  fullName?: string;
  phoneNumber?: string;
  address?: string;
  password?: string;
  email?: string;
  role?: "admin" | "employee";
}

export interface DeleteUserRequest {
  userId: string;
}

export interface ChangePasswordRequest {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

function normalizeUser(raw: unknown): User {
  const item = (raw ?? {}) as UnknownRecord;

  return {
    id: String(item.id ?? item.user_id ?? ''),
    username: String(item.username ?? item.name ?? ''),
    fullName:
      typeof item.fullName === 'string'
        ? item.fullName
        : typeof item.full_name === 'string'
          ? item.full_name
          : undefined,
    phoneNumber:
      typeof item.phoneNumber === 'string'
        ? item.phoneNumber
        : typeof item.phone_number === 'string'
          ? item.phone_number
          : undefined,
    address: typeof item.address === 'string' ? item.address : undefined,
    passwordMasked:
      typeof item.passwordMasked === 'string'
        ? item.passwordMasked
        : typeof item.password_masked === 'string'
          ? item.password_masked
          : undefined,
    email: String(item.email ?? ''),
    role: (item.role === 'admin' ? 'admin' : 'employee') as User['role'],
    campaignsCreated: Number(item.campaignsCreated ?? item.campaigns_created ?? 0),
    qrCodesCreated: Number(item.qrCodesCreated ?? item.qr_codes_created ?? 0),
    createdAt: String(item.createdAt ?? item.created_at ?? new Date().toISOString()),
  };
}

function normalizeCampaignSummary(raw: unknown): UserCampaignSummary {
  const item = (raw ?? {}) as UnknownRecord;
  const rawStatus = typeof item.status === 'string' ? item.status : 'draft';
  const status = rawStatus === 'active' || rawStatus === 'completed' ? rawStatus : 'draft';

  return {
    id: String(item.id ?? item.campaign_id ?? ''),
    name: String(item.name ?? item.campaign_name ?? ''),
    status,
    createdAt: String(item.createdAt ?? item.created_at ?? new Date().toISOString()),
  };
}

function normalizeQRCodeSummary(raw: unknown): UserQRCodeSummary {
  const item = (raw ?? {}) as UnknownRecord;
  return {
    id: String(item.id ?? item.qr_id ?? ''),
    name: String(item.name ?? item.qr_name ?? ''),
    scans: Number(item.scans ?? item.views ?? 0),
    createdAt: String(item.createdAt ?? item.created_at ?? new Date().toISOString()),
  };
}

function normalizeUserDetailResponse(raw: unknown): UserDetailResponse {
  const data = (raw ?? {}) as UnknownRecord;
  const sourceUser = (data.user as unknown) ?? raw;
  const campaignsSource =
    (Array.isArray(data.campaigns) && data.campaigns) ||
    (Array.isArray(data.campaign_list) && data.campaign_list) ||
    [];
  const qrCodesSource =
    (Array.isArray(data.qr_codes) && data.qr_codes) ||
    (Array.isArray(data.qrCodes) && data.qrCodes) ||
    [];

  return {
    user: normalizeUser(sourceUser),
    campaigns: campaignsSource.map((item) => normalizeCampaignSummary(item)),
    qrCodes: qrCodesSource.map((item) => normalizeQRCodeSummary(item)),
  };
}

function normalizeUserListResponse(raw: unknown): GetUsersResponse {
  const data = (raw ?? {}) as UnknownRecord;

  if (Array.isArray(raw)) {
    const users = raw.map((item) => normalizeUser(item));
    return { users, total: users.length };
  }

  const candidate =
    (Array.isArray(data.users) && data.users) ||
    (Array.isArray(data.items) && data.items) ||
    ((data.data as UnknownRecord | undefined) && Array.isArray((data.data as UnknownRecord).users)
      ? ((data.data as UnknownRecord).users as unknown[])
      : undefined) ||
    ((data.data as UnknownRecord | undefined) && Array.isArray((data.data as UnknownRecord).items)
      ? ((data.data as UnknownRecord).items as unknown[])
      : undefined);

  const users = (candidate ?? []).map((item) => normalizeUser(item));
  const rawTotal = data.total;
  const total = typeof rawTotal === 'number' ? rawTotal : users.length;

  return { users, total };
}

export async function getUsers(req?: GetUsersRequest): Promise<GetUsersResponse> {
  const params = new URLSearchParams();
  if (req?.page !== undefined && req.page > 0) {
    params.append('page', String(req.page));
  }
  if (req?.limit !== undefined && req.limit > 0) {
    params.append('limit', String(req.limit));
  }
  const queryString = params.toString();
  const url = queryString ? `/users?${queryString}` : '/users';
  const response = await getAPIClient().get(url);
  return normalizeUserListResponse(response.data);
}

export async function getUserById(req: GetUserByIdRequest): Promise<UserDetailResponse> {
  const response = await getAPIClient().get(`/users/${req.userId}`);
  return normalizeUserDetailResponse(response.data);
}

export async function updateUser(req: UpdateUserRequest): Promise<User> {
  const { userId, ...payload } = req;
  const mappedPayload = {
    ...(typeof payload.username === 'string' ? { username: payload.username } : {}),
    ...(typeof payload.fullName === 'string' ? { full_name: payload.fullName } : {}),
    ...(typeof payload.phoneNumber === 'string' ? { phone_number: payload.phoneNumber } : {}),
    ...(typeof payload.address === 'string' ? { address: payload.address } : {}),
    ...(typeof payload.password === 'string' ? { password: payload.password } : {}),
    ...(typeof payload.email === 'string' ? { email: payload.email } : {}),
    ...(typeof payload.role === 'string' ? { role: payload.role } : {}),
  };
  const response = await getAPIClient().patch(`/users/${userId}`, mappedPayload);
  return normalizeUser(response.data);
}

export async function deleteUser(req: DeleteUserRequest): Promise<void> {
  await getAPIClient().delete(`/users/${req.userId}`);
}

export async function changePassword(req: ChangePasswordRequest): Promise<void> {
  const { userId, currentPassword, newPassword } = req;
  await getAPIClient().post(`/users/${userId}/password`, {
    current_password: currentPassword,
    new_password: newPassword,
  });
}

export { normalizeUser };
