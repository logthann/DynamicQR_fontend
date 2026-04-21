import { describe, expect, it } from 'vitest';
import {
  buildGAModePayload,
  isValidManualMeasurementId,
  shouldEnableGA4PropertiesQuery,
} from '../../../src/modules/ga4/ga4-mode';

describe('GA4 mode helpers', () => {
  describe('isValidManualMeasurementId', () => {
    it('accepts valid G- prefixed ids', () => {
      expect(isValidManualMeasurementId('G-ABC12345')).toBe(true);
      expect(isValidManualMeasurementId(' G-AB12CD34 ')).toBe(true);
    });

    it('rejects invalid ids', () => {
      expect(isValidManualMeasurementId('')).toBe(false);
      expect(isValidManualMeasurementId('UA-12345')).toBe(false);
      expect(isValidManualMeasurementId('g-abc12345')).toBe(false);
      expect(isValidManualMeasurementId('G-123')).toBe(false);
    });
  });

  describe('buildGAModePayload', () => {
    it('maps OAUTH mode payload', () => {
      const payload = buildGAModePayload({
        mode: 'OAUTH',
        selectedPropertyId: 'properties/1234',
        oauthMeasurementId: 'G-AAA11111',
        sourceWhenOAuth: 'qr_override',
      });

      expect(payload).toEqual({
        ga_mode: 'OAUTH',
        ga_property_id: 'properties/1234',
        ga_measurement_id: 'G-AAA11111',
        ga_source: 'qr_override',
      });
    });

    it('maps MANUAL mode payload', () => {
      const payload = buildGAModePayload({
        mode: 'MANUAL',
        manualMeasurementId: 'G-MANUAL123',
      });

      expect(payload).toEqual({
        ga_mode: 'MANUAL',
        ga_property_id: undefined,
        ga_measurement_id: 'G-MANUAL123',
        ga_source: 'manual',
      });
    });

    it('maps NO/default mode payload', () => {
      const payload = buildGAModePayload({ mode: 'NO' });

      expect(payload).toEqual({
        ga_mode: 'NO',
        ga_property_id: undefined,
        ga_measurement_id: undefined,
        ga_source: 'campaign_default',
      });
    });
  });

  describe('shouldEnableGA4PropertiesQuery', () => {
    it('returns false when not connected or analytics scope missing', () => {
      expect(
        shouldEnableGA4PropertiesQuery({
          isGoogleConnected: false,
          hasAnalyticsScope: true,
        })
      ).toBe(false);

      expect(
        shouldEnableGA4PropertiesQuery({
          isGoogleConnected: true,
          hasAnalyticsScope: false,
        })
      ).toBe(false);
    });

    it('supports endpoint call guard for editing-only screens', () => {
      expect(
        shouldEnableGA4PropertiesQuery({
          isGoogleConnected: true,
          hasAnalyticsScope: true,
          requiresEditing: true,
          isEditing: false,
        })
      ).toBe(false);

      expect(
        shouldEnableGA4PropertiesQuery({
          isGoogleConnected: true,
          hasAnalyticsScope: true,
          requiresEditing: true,
          isEditing: true,
        })
      ).toBe(true);
    });
  });
});

