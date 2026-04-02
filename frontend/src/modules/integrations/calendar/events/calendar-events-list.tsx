/**
 * Calendar events browse flow (AC-008)
 * GET /api/v1/integrations/google-calendar/events.
 */

'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys, staleTimes } from '@/lib/cache/query-client';

interface CalendarEventsListProps {
  selectedEventIds: string[];
  onSelectionChange: (ids: string[]) => void;
  calendarQuery: {
    rangeType: 'month' | 'year';
    year: number;
    month?: number;
    fromMonth?: number;
    toMonth?: number;
  };
  onCalendarQueryChange: (next: {
    rangeType: 'month' | 'year';
    year: number;
    month?: number;
    fromMonth?: number;
    toMonth?: number;
  }) => void;
}

function formatEventDate(value?: string): string {
  if (!value) {
    return 'N/A';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return `Invalid date (${value})`;
  }
  return parsed.toLocaleString();
}

export default function CalendarEventsList({
  selectedEventIds,
  onSelectionChange,
  calendarQuery,
  onCalendarQueryChange,
}: CalendarEventsListProps) {
  const { rangeType, year, month = new Date().getMonth() + 1, fromMonth, toMonth } = calendarQuery;

  const queryKey = useMemo(
    () =>
      [
        ...queryKeys.integrations.calendar.all,
        'events',
        { rangeType, year, month, fromMonth, toMonth },
      ] as const,
    [rangeType, year, month, fromMonth, toMonth]
  );

  const eventsQuery = useQuery({
    queryKey,
    queryFn: () =>
      apiClient.getCalendarEvents({
        rangeType,
        year,
        month: rangeType === 'month' ? month : undefined,
        ...(rangeType === 'month' && typeof fromMonth === 'number' && typeof toMonth === 'number'
          ? { fromMonth, toMonth }
          : {}),
      }),
    staleTime: staleTimes.calendarEvents,
  });

  const toggleEvent = (eventId: string) => {
    if (selectedEventIds.includes(eventId)) {
      onSelectionChange(selectedEventIds.filter((id) => id !== eventId));
      return;
    }
    onSelectionChange([...selectedEventIds, eventId]);
  };

  return (
    <section className="space-y-4 rounded-lg border border-muted bg-card p-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Calendar Events</h2>
        <p className="text-sm text-muted-foreground">
          Browse events by range and select events to import.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm text-foreground">
          Range
          <select
            data-testid="calendar-range-type"
            className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-foreground"
            value={rangeType}
            onChange={(e) =>
              onCalendarQueryChange({
                ...calendarQuery,
                rangeType: e.target.value as 'month' | 'year',
              })
            }
          >
            <option value="month">Month</option>
            <option value="year">Year</option>
          </select>
        </label>

        <label className="text-sm text-foreground">
          Year
          <input
            data-testid="calendar-year"
            type="number"
            className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-foreground"
            value={year}
            onChange={(e) =>
              onCalendarQueryChange({
                ...calendarQuery,
                year: Number(e.target.value),
              })
            }
          />
        </label>

        <label className="text-sm text-foreground">
          Month
          <input
            data-testid="calendar-month"
            type="number"
            min={1}
            max={12}
            disabled={rangeType !== 'month'}
            className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-foreground disabled:opacity-40"
            value={month}
            onChange={(e) =>
              onCalendarQueryChange({
                ...calendarQuery,
                month: Number(e.target.value),
              })
            }
          />
        </label>

        <label className="text-sm text-foreground">
          From month (optional)
          <input
            data-testid="calendar-from-month"
            type="number"
            min={1}
            max={12}
            disabled={rangeType !== 'month'}
            className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-foreground disabled:opacity-40"
            value={fromMonth ?? ''}
            onChange={(e) => {
              const value = e.target.value;
              onCalendarQueryChange({
                ...calendarQuery,
                fromMonth: value ? Number(value) : undefined,
              });
            }}
            placeholder="e.g. 4"
          />
        </label>

        <label className="text-sm text-foreground">
          To month (optional)
          <input
            data-testid="calendar-to-month"
            type="number"
            min={1}
            max={12}
            disabled={rangeType !== 'month'}
            className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-foreground disabled:opacity-40"
            value={toMonth ?? ''}
            onChange={(e) => {
              const value = e.target.value;
              onCalendarQueryChange({
                ...calendarQuery,
                toMonth: value ? Number(value) : undefined,
              });
            }}
            placeholder="e.g. 6"
          />
        </label>
      </div>

      {eventsQuery.isLoading && (
        <p className="text-sm text-muted-foreground">Loading calendar events...</p>
      )}

      {eventsQuery.isError && (
        <p className="text-sm text-destructive">Failed to load calendar events.</p>
      )}

      {eventsQuery.data && eventsQuery.data.events.length === 0 && (
        <p className="text-sm text-muted-foreground">No events found for selected range.</p>
      )}

      {eventsQuery.data && eventsQuery.data.events.length > 0 && (
        <div className="space-y-2">
          {eventsQuery.data.events.map((event) => (
            <label
              key={event.id}
              className="flex items-start gap-3 rounded border border-muted p-3 text-sm text-foreground"
            >
              <input
                data-testid={`calendar-event-${event.id}`}
                type="checkbox"
                checked={selectedEventIds.includes(event.id)}
                onChange={() => toggleEvent(event.id)}
                className="mt-1"
              />
              <span>
                <span className="block font-medium">{event.title}</span>
                <span className="block text-muted-foreground">
                  {formatEventDate(event.startTime)} - {formatEventDate(event.endTime)}
                </span>
                {event.calendarSyncStatus && (
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Status: {event.calendarSyncStatus.replace('_', ' ')}
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
      )}
    </section>
  );
}

