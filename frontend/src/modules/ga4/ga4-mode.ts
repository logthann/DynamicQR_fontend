export type GA4Mode = 'OAUTH' | 'MANUAL' | 'NO';

const GA_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{6,20}$/;

export interface BuildGAModePayloadInput {
  mode: GA4Mode;
  selectedPropertyId?: string;
  manualMeasurementId?: string;
  oauthMeasurementId?: string;
  sourceWhenOAuth?: string;
  sourceWhenManual?: string;
  sourceWhenNo?: string;
}

export interface BuildGAModePayloadResult {
  ga_mode: GA4Mode;
  ga_property_id?: string;
  ga_measurement_id?: string;
  ga_source: string;
}

export function isValidManualMeasurementId(value: string): boolean {
  return GA_MEASUREMENT_ID_PATTERN.test(value.trim());
}

export function buildGAModePayload(input: BuildGAModePayloadInput): BuildGAModePayloadResult {
  const {
    mode,
    selectedPropertyId,
    manualMeasurementId,
    oauthMeasurementId,
    sourceWhenOAuth = 'campaign_default',
    sourceWhenManual = 'manual',
    sourceWhenNo = 'campaign_default',
  } = input;

  if (mode === 'OAUTH') {
    return {
      ga_mode: 'OAUTH',
      ga_property_id: selectedPropertyId || undefined,
      ga_measurement_id: oauthMeasurementId || undefined,
      ga_source: sourceWhenOAuth,
    };
  }

  if (mode === 'MANUAL') {
    return {
      ga_mode: 'MANUAL',
      ga_property_id: undefined,
      ga_measurement_id: manualMeasurementId || undefined,
      ga_source: sourceWhenManual,
    };
  }

  return {
    ga_mode: 'NO',
    ga_property_id: undefined,
    ga_measurement_id: undefined,
    ga_source: sourceWhenNo,
  };
}

export function shouldEnableGA4PropertiesQuery(input: {
  isGoogleConnected: boolean;
  hasAnalyticsScope: boolean;
  isEditing?: boolean;
  requiresEditing?: boolean;
}): boolean {
  const { isGoogleConnected, hasAnalyticsScope, isEditing = true, requiresEditing = false } = input;

  if (!isGoogleConnected || !hasAnalyticsScope) {
    return false;
  }

  if (requiresEditing && !isEditing) {
    return false;
  }

  return true;
}

