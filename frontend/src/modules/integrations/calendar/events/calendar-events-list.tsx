/**
 * Calendar events browse flow (AC-008)
 * GET /api/v1/integrations/google-calendar/events.
 */

'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys, staleTimes } from '@/lib/cache/query-client';

interface CalendarEventsListProps {
  selectedEventIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export default function CalendarEventsList({
  selectedEventIds,
  onSelectionChange,
}: CalendarEventsListProps) {
  const now = new Date();
  const [rangeType, setRangeType] = useState<'month' | 'year'>('month');
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);

  const queryKey = useMemo(
    () => [...queryKeys.integrations.calendar.all, 'events', { rangeType, year, month }] as const,
    [rangeType, year, month]
  );

  const eventsQuery = useQuery({
    queryKey,
    queryFn: () =>
      apiClient.getCalendarEvents({
        rangeType,
        year,
        month: rangeType === 'month' ? month : undefined,
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
            onChange={(e) => setRangeType(e.target.value as 'month' | 'year')}
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
            onChange={(e) => setYear(Number(e.target.value))}
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
            onChange={(e) => setMonth(Number(e.target.value))}
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
                  {new Date(event.startTime).toLocaleString()} - {new Date(event.endTime).toLocaleString()}
                </span>
              </span>
            </label>
          ))}
        </div>
      )}
    </section>
  );
}

