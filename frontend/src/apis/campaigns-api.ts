/**
 * Campaigns API Module
 *
 * Endpoints:
 * - GET /api/v1/campaigns
 * - POST /api/v1/campaigns
 * - GET /api/v1/campaigns/{campaign_id}
 * - PATCH /api/v1/campaigns/{campaign_id}
 * - DELETE /api/v1/campaigns/{campaign_id}
 */

import { getAPIClient, UnknownRecord } from './base-client';
import * as Types from './generated/types';

function normalizeCampaign(raw: unknown): Types.Campaign {
  const item = (raw ?? {}) as UnknownRecord;
  const creator = (item.creator ?? {}) as UnknownRecord;
  const creatorUsername = typeof creator.username === 'string' ? creator.username : undefined;
  const creatorEmail = typeof creator.email === 'string' ? creator.email : undefined;

  return {
    id: String(item.id ?? item.campaign_id ?? ''),
    name: String(item.name ?? ''),
    status: typeof item.status === 'string' ? (item.status as Types.Campaign['status']) : undefined,
    description: typeof item.description === 'string' ? item.description : undefined,
    startDate: typeof item.startDate === 'string' ? item.startDate : typeof item.start_date === 'string' ? item.start_date : undefined,
    endDate: typeof item.endDate === 'string' ? item.endDate : typeof item.end_date === 'string' ? item.end_date : undefined,
    googleEventId: typeof item.googleEventId === 'string' ? item.googleEventId : typeof item.google_event_id === 'string' ? item.google_event_id : undefined,
    calendarSyncStatus: typeof item.calendarSyncStatus === 'string' ? (item.calendarSyncStatus as Types.Campaign['calendarSyncStatus']) : typeof item.calendar_sync_status === 'string' ? (item.calendar_sync_status as Types.Campaign['calendarSyncStatus']) : undefined,
    calendarLastSyncedAt: typeof item.calendarLastSyncedAt === 'string' ? item.calendarLastSyncedAt : typeof item.calendar_last_synced_at === 'string' ? item.calendar_last_synced_at : undefined,
    gaType: typeof item.gaType === 'string' ? (item.gaType as Types.Campaign['gaType']) : typeof item.ga_type === 'string' ? (item.ga_type as Types.Campaign['gaType']) : typeof item.gaMode === 'string' ? (item.gaMode as Types.Campaign['gaType']) : typeof item.ga_mode === 'string' ? (item.ga_mode as Types.Campaign['gaType']) : undefined,
    gaMode: typeof item.gaMode === 'string' ? (item.gaMode as Types.Campaign['gaMode']) : typeof item.gaType === 'string' ? (item.gaType as Types.Campaign['gaMode']) : typeof item.ga_type === 'string' ? (item.ga_type as Types.Campaign['gaMode']) : typeof item.ga_mode === 'string' ? (item.ga_mode as Types.Campaign['gaMode']) : undefined,
    gaMeasurementId: typeof item.gaMeasurementId === 'string' ? item.gaMeasurementId : typeof item.ga_measurement_id === 'string' ? item.ga_measurement_id : undefined,
    gaPropertyId: typeof item.gaPropertyId === 'string' ? item.gaPropertyId : typeof item.ga_property_id === 'string' ? item.ga_property_id : undefined,
    gaSource: typeof item.gaSource === 'string' ? item.gaSource : typeof item.ga_source === 'string' ? item.ga_source : undefined,
    createdAt: String(item.createdAt ?? item.created_at ?? new Date().toISOString()),
    updatedAt: String(item.updatedAt ?? item.updated_at ?? new Date().toISOString()),
    ...(item.userId !== undefined || item.user_id !== undefined
      ? { userId: String(item.userId ?? item.user_id) }
      : {}),
    ...(creatorUsername || creatorEmail
      ? {
          creator: {
            ...(creatorUsername ? { username: creatorUsername } : {}),
            ...(creatorEmail ? { email: creatorEmail } : {}),
          },
        }
      : {}),
  } as Types.Campaign;
}

function looksLikeCampaign(raw: unknown): boolean {
  const item = (raw ?? {}) as UnknownRecord;
  return (typeof item.id === 'number' || typeof item.id === 'string') && typeof item.name === 'string';
}

function normalizeCampaignListResponse(raw: unknown): Types.GetCampaignsResponse {
  const data = (raw ?? {}) as UnknownRecord;

  if (Array.isArray(raw)) {
    const campaigns = raw.map((item) => normalizeCampaign(item));
    return { campaigns, total: campaigns.length };
  }

  const candidate =
    (Array.isArray(data.campaigns) && data.campaigns) ||
    (Array.isArray(data.items) && data.items) ||
    ((data.data as UnknownRecord | undefined) && Array.isArray((data.data as UnknownRecord).campaigns)
      ? ((data.data as UnknownRecord).campaigns as unknown[])
      : undefined) ||
    ((data.data as UnknownRecord | undefined) && Array.isArray((data.data as UnknownRecord).items)
      ? ((data.data as UnknownRecord).items as unknown[])
      : undefined);

  const campaigns = (candidate ?? []).map((item) => normalizeCampaign(item));
  const rawTotal = data.total;
  const total = typeof rawTotal === 'number' ? rawTotal : campaigns.length;

  return { campaigns, total };
}

export async function getCampaigns(): Promise<Types.GetCampaignsResponse> {
  const response = await getAPIClient().get('/campaigns');
  return normalizeCampaignListResponse(response.data);
}

export async function createCampaign(req: Types.CreateCampaignRequest): Promise<Types.Campaign> {
  const response = await getAPIClient().post('/campaigns', req);
  return normalizeCampaign(response.data);
}

export async function getCampaignById(req: Types.GetCampaignByIdRequest): Promise<Types.Campaign> {
  const response = await getAPIClient().get(`/campaigns/${req.campaignId}`);
  return normalizeCampaign(response.data);
}

export async function updateCampaign(req: Types.UpdateCampaignRequest): Promise<Types.Campaign> {
  const { campaignId, ...payload } = req;
  const response = await getAPIClient().patch(`/campaigns/${campaignId}`, payload);
  return normalizeCampaign(response.data);
}

export async function deleteCampaign(req: Types.DeleteCampaignRequest): Promise<void> {
  await getAPIClient().delete(`/campaigns/${req.campaignId}`);
}

export { looksLikeCampaign, normalizeCampaign };
export type { Campaign } from './generated/types';
