/**
 * GA4 API Module
 *
 * Endpoints:
 * - GET /api/v1/ga4/properties
 * - GET /api/v1/ga4/detect?url=...
 */

import { getAPIClient, UnknownRecord } from './base-client';
import * as Types from './generated/types';

function normalizeGA4Property(raw: unknown): Types.GA4Property {
  const item = (raw ?? {}) as UnknownRecord;
  const gaMeasurementId =
    typeof item.ga_measurement_id === 'string'
      ? item.ga_measurement_id
      : typeof item.measurement_id === 'string'
        ? item.measurement_id
        : undefined;

  return {
    property_id: String(item.property_id ?? item.propertyId ?? item.id ?? ''),
    display_name: String(item.display_name ?? item.displayName ?? item.name ?? ''),
    ...(gaMeasurementId ? { ga_measurement_id: gaMeasurementId } : {}),
  };
}

function normalizeGA4PropertiesResponse(raw: unknown): Types.GetGA4PropertiesResponse {
  const data = (raw ?? {}) as UnknownRecord;
  const source =
    (Array.isArray(data.properties) && data.properties) ||
    (Array.isArray(data.items) && data.items) ||
    (Array.isArray(raw) ? (raw as unknown[]) : []);

  return {
    properties: source.map((item) => normalizeGA4Property(item)),
  };
}

function normalizeGA4DetectResponse(
  requestUrl: string,
  raw: unknown
): Types.DetectGA4MeasurementResponse {
  const data = (raw ?? {}) as UnknownRecord;
  const measurementIds = Array.isArray(data.measurement_ids)
    ? data.measurement_ids.filter((id): id is string => typeof id === 'string')
    : undefined;

  const gaMeasurementId =
    typeof data.ga_measurement_id === 'string'
      ? data.ga_measurement_id
      : typeof data.measurement_id === 'string'
        ? data.measurement_id
        : measurementIds?.[0];

  return {
    url: typeof data.url === 'string' ? data.url : requestUrl,
    ...(gaMeasurementId ? { ga_measurement_id: gaMeasurementId } : {}),
    ...(measurementIds ? { measurement_ids: measurementIds } : {}),
    ...(typeof data.confidence === 'string' ? { confidence: data.confidence } : {}),
    ...(typeof data.source === 'string' ? { source: data.source } : {}),
  };
}

export async function getGA4Properties(): Promise<Types.GetGA4PropertiesResponse> {
  const response = await getAPIClient().get('/ga4/properties');
  return normalizeGA4PropertiesResponse(response.data);
}

export async function detectGA4Measurement(req: Types.DetectGA4MeasurementRequest): Promise<Types.DetectGA4MeasurementResponse> {
  const response = await getAPIClient().get('/ga4/detect', {
    params: { url: req.url },
  });
  return normalizeGA4DetectResponse(req.url, response.data);
}

export { normalizeGA4Property, normalizeGA4PropertiesResponse, normalizeGA4DetectResponse };
