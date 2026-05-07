/**
 * QR API Module
 *
 * Endpoints:
 * - POST /api/v1/qr
 * - GET /api/v1/qr
 * - GET /api/v1/qr/{qr_id}
 * - PATCH /api/v1/qr/{qr_id}
 * - DELETE /api/v1/qr/{qr_id}
 * - PATCH /api/v1/qr/{qr_id}/status
 */

import { getAPIClient, UnknownRecord, toNumericUserId } from './base-client';
import { getAuthContext } from './auth-fetch';
import * as Types from './generated/types';

function normalizeQRCode(raw: unknown): Types.QRCode {
  const item = (raw ?? {}) as UnknownRecord;
  const destinationUrl = String(item.destination_url ?? item.destinationUrl ?? item.url ?? item.target_url ?? '');
  const qrTypeRaw = String(item.qr_type ?? item.qrType ?? 'url');
  const qrType: 'url' | 'event' = qrTypeRaw === 'event' ? 'event' : 'url';
  const campaignIdRaw = item.campaign_id ?? item.campaignId;

  // Extract employee info if present in API response
  const employee = (item.employee ?? {}) as UnknownRecord;
  const employeeUsername = typeof employee.username === 'string' ? employee.username : undefined;
  const employeeEmail = typeof employee.email === 'string' ? employee.email : undefined;

  // Extract campaign info if present in API response
  const campaign = (item.campaign ?? {}) as UnknownRecord;
  const campaignIdFromObj = typeof campaign.id === 'number' ? campaign.id : undefined;
  const campaignName = typeof campaign.name === 'string' ? campaign.name : undefined;
  const campaignDescription = typeof campaign.description === 'string' ? campaign.description : undefined;

  return {
    id: String(item.id ?? item.qr_id ?? ''),
    name: String(item.name ?? ''),
    description: typeof item.description === 'string' ? item.description : undefined,
    campaign_id: campaignIdFromObj ?? (typeof campaignIdRaw === 'number' ? campaignIdRaw : typeof campaignIdRaw === 'string' && campaignIdRaw.length > 0 ? Number(campaignIdRaw) : null),
    campaignId: String(campaignIdFromObj ?? campaignIdRaw ?? ''),
    destination_url: destinationUrl,
    destinationUrl,
    qr_type: qrType,
    qrType,
    design_config: typeof item.design_config === 'object' && item.design_config !== null ? (item.design_config as Record<string, unknown>) : null,
    ga_measurement_id: typeof item.ga_measurement_id === 'string' ? item.ga_measurement_id : undefined,
    utm_source: typeof item.utm_source === 'string' ? item.utm_source : undefined,
    utm_medium: typeof item.utm_medium === 'string' ? item.utm_medium : undefined,
    utm_campaign: typeof item.utm_campaign === 'string' ? item.utm_campaign : undefined,
    shortCode: String(item.shortCode ?? item.short_code ?? ''),
    short_code: typeof item.short_code === 'string' ? item.short_code : undefined,
    user_id: typeof item.user_id === 'number' ? item.user_id : undefined,
    deleted_at: typeof item.deleted_at === 'string' ? item.deleted_at : null,
    status: typeof item.status === 'string' ? (item.status as Types.QRCode['status']) : undefined,
    createdAt: String(item.createdAt ?? item.created_at ?? new Date().toISOString()),
    created_at: typeof item.created_at === 'string' ? item.created_at : undefined,
    updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : typeof item.updated_at === 'string' ? item.updated_at : undefined,
    updated_at: typeof item.updated_at === 'string' ? item.updated_at : undefined,
    ...(employeeUsername || employeeEmail
      ? {
          employee: {
            ...(employeeUsername ? { username: employeeUsername } : {}),
            ...(employeeEmail ? { email: employeeEmail } : {}),
          },
        }
      : {}),
    ...(campaignName
      ? {
          campaign: {
            name: campaignName,
            ...(campaignIdFromObj ? { id: campaignIdFromObj } : {}),
            ...(campaignDescription ? { description: campaignDescription } : {}),
          },
        }
      : {}),
  };
}

function normalizeQRListResponse(raw: unknown): Types.GetQRsResponse {
  const data = (raw ?? {}) as UnknownRecord;

  if (Array.isArray(raw)) {
    const qrCodes = raw.map((item) => normalizeQRCode(item));
    return { qrCodes, total: qrCodes.length };
  }

  const candidate =
    (Array.isArray(data.qrCodes) && data.qrCodes) ||
    (Array.isArray(data.qr_codes) && data.qr_codes) ||
    (Array.isArray(data.items) && data.items) ||
    ((data.data as UnknownRecord | undefined) && Array.isArray((data.data as UnknownRecord).qrCodes)
      ? ((data.data as UnknownRecord).qrCodes as unknown[])
      : undefined) ||
    ((data.data as UnknownRecord | undefined) && Array.isArray((data.data as UnknownRecord).qr_codes)
      ? ((data.data as UnknownRecord).qr_codes as unknown[])
      : undefined) ||
    ((data.data as UnknownRecord | undefined) && Array.isArray((data.data as UnknownRecord).items)
      ? ((data.data as UnknownRecord).items as unknown[])
      : undefined);

  const qrCodes = (candidate ?? []).map((item) => normalizeQRCode(item));
  const rawTotal = data.total;
  const total = typeof rawTotal === 'number' ? rawTotal : qrCodes.length;

  return { qrCodes, total };
}

export async function createQR(req: Types.CreateQRRequest): Promise<Types.CreateQRResponse> {
  const authContext = getAuthContext();
  const contextOwnerUserId = toNumericUserId(authContext.userId);
  const requestOwnerUserId = typeof req.owner_user_id === 'number' ? req.owner_user_id : contextOwnerUserId;
  const { owner_user_id: _ignoredOwnerUserId, ...payload } = req;

  const response = await getAPIClient().post('/qr/', payload, {
    params: {
      ...(typeof requestOwnerUserId === 'number' ? { owner_user_id: requestOwnerUserId } : {}),
    },
  });
  return normalizeQRCode(response.data);
}

export async function getQRs(req?: Types.GetQRsRequest): Promise<Types.GetQRsResponse> {
  const authContext = getAuthContext();
  const contextOwnerUserId = toNumericUserId(authContext.userId);
  const requestOwnerUserId = typeof req?.owner_user_id === 'number' ? req.owner_user_id : contextOwnerUserId;

  const response = await getAPIClient().get('/qr/', {
    params: {
      ...(typeof requestOwnerUserId === 'number' ? { owner_user_id: requestOwnerUserId } : {}),
      ...(typeof req?.campaign_id === 'number' ? { campaign_id: req.campaign_id } : {}),
      ...(req?.status_filter ? { status_filter: req.status_filter } : {}),
      ...(typeof req?.include_deleted === 'boolean' ? { include_deleted: req.include_deleted } : {}),
      ...(typeof req?.limit === 'number' ? { limit: req.limit } : {}),
      ...(typeof req?.offset === 'number' ? { offset: req.offset } : {}),
    },
  });
  return normalizeQRListResponse(response.data);
}

export async function getQRById(req: Types.GetQRByIdRequest): Promise<Types.QRCode> {
  const response = await getAPIClient().get(`/qr/${req.qrId}`);
  return normalizeQRCode(response.data);
}

export async function updateQR(req: Types.UpdateQRRequest): Promise<Types.QRCode> {
  const { qrId, ...payload } = req;
  const response = await getAPIClient().patch(`/qr/${qrId}`, payload);
  return normalizeQRCode(response.data);
}

export async function deleteQR(req: Types.DeleteQRRequest): Promise<void> {
  await getAPIClient().delete(`/qr/${req.qrId}`);
}

export async function updateQRStatus(req: Types.UpdateQRStatusRequest): Promise<Types.QRCode> {
  const response = await getAPIClient().patch(`/qr/${req.qrId}/status`, { status: req.status });
  return normalizeQRCode(response.data);
}

export { normalizeQRCode };
