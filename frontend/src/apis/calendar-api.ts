/**
 * Calendar API Module
 *
 * Endpoints:
 * - GET /api/v1/integrations/google-calendar/events
 * - POST /api/v1/integrations/google-calendar/import-campaigns
 * - POST /api/v1/campaigns/{campaign_id}/calendar/sync
 * - DELETE /api/v1/campaigns/{campaign_id}/calendar/link
 */

import { getAPIClient, UnknownRecord } from './base-client';
import * as Types from './generated/types';
import { looksLikeCampaign, normalizeCampaign } from './campaigns-api';

function normalizeCalendarEvent(raw: unknown): Types.CalendarEvent {
  const item = (raw ?? {}) as UnknownRecord;
  const googleEventId = String(item.google_event_id ?? item.event_id ?? item.id ?? '');
  const startsAt = String(item.starts_at ?? item.start_datetime ?? item.startTime ?? item.start_time ?? '');
  const endsAt = String(item.ends_at ?? item.end_datetime ?? item.endTime ?? item.end_time ?? startsAt);

  return {
    id: googleEventId,
    googleEventId,
    title: String(item.title ?? ''),
    description: typeof item.description === 'string' ? item.description : undefined,
    startTime: startsAt,
    endTime: endsAt,
    eventStatus: typeof item.event_status === 'string' ? item.event_status : typeof item.status === 'string' ? item.status : undefined,
    linkedCampaignId: typeof item.linked_campaign_id === 'number' ? item.linked_campaign_id : null,
    calendarSyncStatus: typeof item.calendar_sync_status === 'string' ? (item.calendar_sync_status as Types.CalendarEvent['calendarSyncStatus']) : undefined,
    lastSyncedAt: typeof item.last_synced_at === 'string' ? item.last_synced_at : undefined,
  };
}

function normalizeCalendarEventsResponse(raw: unknown): Types.GetCalendarEventsResponse {
  const data = (raw ?? {}) as UnknownRecord;
  const eventsRaw = Array.isArray(data.events) ? data.events : [];

  return {
    rangeType: typeof data.range_type === 'string' ? (data.range_type as 'month' | 'year') : undefined,
    year: typeof data.year === 'number' ? data.year : undefined,
    month: typeof data.month === 'number' ? data.month : undefined,
    ...(typeof data.from_month === 'number' ? { fromMonth: data.from_month } : {}),
    ...(typeof data.to_month === 'number' ? { toMonth: data.to_month } : {}),
    total: typeof data.total === 'number' ? data.total : eventsRaw.length,
    events: eventsRaw.map((event) => normalizeCalendarEvent(event)),
  } as Types.GetCalendarEventsResponse;
}

export async function getCalendarEvents(
  req: Types.GetCalendarEventsRequest & { fromMonth?: number; toMonth?: number }
): Promise<Types.GetCalendarEventsResponse> {
  const request = req as Types.GetCalendarEventsRequest & { fromMonth?: number; toMonth?: number };

  const useMonthRange =
    request.rangeType === 'month' &&
    typeof request.fromMonth === 'number' &&
    typeof request.toMonth === 'number';

  const response = await getAPIClient().get('/integrations/google-calendar/events', {
    params: {
      range_type: request.rangeType,
      year: request.year,
      ...(useMonthRange
        ? { from_month: request.fromMonth, to_month: request.toMonth }
        : request.rangeType === 'month' && typeof request.month === 'number'
          ? { month: request.month }
          : {}),
    },
  });
  if (process.env.NODE_ENV === 'development') {
    console.log('[Calendar Events] raw backend response:', response.data);
  }
  return normalizeCalendarEventsResponse(response.data);
}

export async function importCampaigns(
  req: Types.ImportCampaignsRequest & { fromMonth?: number; toMonth?: number }
): Promise<Types.ImportCampaignsResponse> {
  const request = req as Types.ImportCampaignsRequest & { fromMonth?: number; toMonth?: number };

  const eventIds =
    Array.isArray(request.eventIds) && request.eventIds.length > 0
      ? request.eventIds
      : Array.isArray(request.selectedEventIds)
        ? request.selectedEventIds
        : [];

  const response = await getAPIClient().post('/integrations/google-calendar/import-campaigns', {
    range_type: request.rangeType,
    year: request.year,
    ...(request.rangeType === 'month' && typeof request.month === 'number' ? { month: request.month } : {}),
    ...(request.rangeType === 'month' && typeof request.fromMonth === 'number' && typeof request.toMonth === 'number'
      ? { from_month: request.fromMonth, to_month: request.toMonth }
      : {}),
    event_ids: eventIds,
  });
  const data = (response.data ?? {}) as Record<string, unknown>;
  const created = typeof data.created_count === 'number' ? data.created_count : typeof data.created === 'number' ? data.created : 0;
  const updated = typeof data.updated_count === 'number' ? data.updated_count : typeof data.updated === 'number' ? data.updated : 0;
  const skipped = typeof data.skipped_count === 'number' ? data.skipped_count : typeof data.skipped === 'number' ? data.skipped : 0;

  const campaignsRaw = Array.isArray(data.campaigns) ? data.campaigns : [];

  return {
    created,
    updated,
    skipped,
    createdCount: created,
    updatedCount: updated,
    skippedCount: skipped,
    campaigns: campaignsRaw.map((item) => normalizeCampaign(item)),
  };
}

export async function syncCampaign(req: Types.SyncCampaignRequest): Promise<Types.SyncCampaignResponse> {
  const response = await getAPIClient().post(`/campaigns/${req.campaignId}/calendar/sync`, {});
  if (looksLikeCampaign(response.data)) {
    return {
      status: 'success',
      message: 'Campaign synchronized with Google Calendar.',
      campaign: normalizeCampaign(response.data),
    };
  }
  return response.data;
}

export async function unlinkCampaign(req: Types.UnlinkCampaignRequest): Promise<Types.UnlinkCampaignResponse> {
  const response = await getAPIClient().delete(`/campaigns/${req.campaignId}/calendar/link`);
  if (looksLikeCampaign(response.data)) {
    return {
      status: 'success',
      message: 'Campaign unlinked from Google Calendar.',
      campaign: normalizeCampaign(response.data),
    };
  }
  return response.data;
}

export { normalizeCalendarEvent, normalizeCalendarEventsResponse };
