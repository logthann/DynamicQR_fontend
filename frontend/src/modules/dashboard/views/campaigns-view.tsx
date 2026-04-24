'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  BarChart3,
  Calendar,
  CalendarIcon,
  CalendarCheck,
  CalendarX,
  CheckCircle2,
  Circle,
  Eye,
  Trash2,
  User,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { cacheInvalidations, queryClient, queryKeys, staleTimes } from '@/lib/cache/query-client';
import type { Campaign } from '@/lib/api/generated/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Calendar as UiCalendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'active' | 'paused';
type PeriodFilter = 'all-time' | 'today' | 'this-week' | 'this-month' | 'this-quarter' | 'this-year';

function parseDate(value?: string): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDayEnd(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function readStartDate(campaign: Campaign): string | undefined {
  const raw = campaign as unknown as Record<string, unknown>;
  return campaign.startDate || (typeof raw.start_date === 'string' ? raw.start_date : undefined);
}

function readEndDate(campaign: Campaign): string | undefined {
  const raw = campaign as unknown as Record<string, unknown>;
  return campaign.endDate || (typeof raw.end_date === 'string' ? raw.end_date : undefined);
}

function readCreatedBy(campaign: Campaign): string {
  const raw = campaign as unknown as Record<string, unknown>;
  const value = raw.createdBy ?? raw.created_by ?? raw.owner_name ?? raw.company_name;
  return typeof value === 'string' && value.trim().length > 0 ? value : 'Unknown owner';
}

function formatDateLabel(value?: string): string {
  const parsed = parseDate(value);
  return parsed ? parsed.toLocaleDateString() : '-';
}

function readStatus(campaign: Campaign): string {
  const raw = campaign as unknown as Record<string, unknown>;
  const value = campaign.status ?? raw.status;
  return typeof value === 'string' ? value : 'paused';
}


export default function CampaignsView() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all-time');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const campaignFilters = useMemo(
    () => ({
      status: statusFilter,
      period: periodFilter,
      from: startDateFilter,
      to: endDateFilter,
    }),
    [endDateFilter, periodFilter, startDateFilter, statusFilter]
  );

  const {
    data: response,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.campaigns.list(campaignFilters),
    queryFn: () => apiClient.getCampaigns(),
    staleTime: staleTimes.campaigns,
  });

  const campaigns = useMemo(() => response?.campaigns ?? [], [response?.campaigns]);

  const deleteMutation = useMutation({
    mutationFn: apiClient.deleteCampaign,
    onSuccess: () => {
      cacheInvalidations.deleteCampaign();
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.all });
      setActionMessage('Campaign deleted successfully.');
    },
    onError: (err: unknown) => {
      const message =
        typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string'
          ? err.message
          : 'Failed to delete campaign.';
      setActionMessage(message);
    },
  });

  const filteredCampaigns = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const mondayOffset = (now.getDay() + 6) % 7;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const customFrom = parseDate(startDateFilter) ?? undefined;
    const customTo = parseDate(endDateFilter) ?? undefined;

    return campaigns.filter((campaign) => {
      const campaignStatus = (campaign.status || '').toLowerCase();
      if (statusFilter !== 'all' && campaignStatus !== statusFilter) {
        return false;
      }

      const campaignStartDate = parseDate(readStartDate(campaign));
      if (!campaignStartDate) {
        return periodFilter === 'all-time' && !customFrom && !customTo;
      }

      if (periodFilter === 'today' && campaignStartDate < startOfToday) {
        return false;
      }
      if (periodFilter === 'this-week' && campaignStartDate < startOfWeek) {
        return false;
      }
      if (periodFilter === 'this-month' && campaignStartDate < startOfMonth) {
        return false;
      }
      if (periodFilter === 'this-quarter' && campaignStartDate < startOfQuarter) {
        return false;
      }
      if (periodFilter === 'this-year' && campaignStartDate < startOfYear) {
        return false;
      }

      if (customFrom && campaignStartDate < customFrom) {
        return false;
      }
      if (customTo && campaignStartDate > toDayEnd(customTo)) {
        return false;
      }

      return true;
    });
  }, [campaigns, endDateFilter, periodFilter, startDateFilter, statusFilter]);

  const handlePeriodFilterChange = (value: PeriodFilter) => {
    setPeriodFilter(value);
    if (value !== 'all-time') {
      setStartDateFilter('');
      setEndDateFilter('');
    }
  };

  const handleDateRangeChange = (startDate: string, endDate: string) => {
    setStartDateFilter(startDate);
    setEndDateFilter(endDate);
    if (startDate || endDate) {
      setPeriodFilter('all-time');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button asChild className="w-full sm:w-auto">
          <Link href="/campaigns/create">Create Campaign</Link>
        </Button>
      </div>

      <CampaignFilters
        statusFilter={statusFilter}
        periodFilter={periodFilter}
        startDate={startDateFilter}
        endDate={endDateFilter}
        campaignCount={filteredCampaigns.length}
        onStatusFilterChange={setStatusFilter}
        onPeriodFilterChange={handlePeriodFilterChange}
        onDateRangeChange={handleDateRangeChange}
      />

      {isLoading && (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">Loading campaigns...</CardContent>
        </Card>
      )}

      {isError && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="p-4">
            <p className="text-sm text-destructive">
              Failed to load campaigns: {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && filteredCampaigns.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center">
            <h4 className="text-lg font-medium text-foreground">No campaigns found</h4>
            <p className="mt-1 text-sm text-muted-foreground">Try changing filters or create a new campaign.</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && filteredCampaigns.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              isDeleting={deleteMutation.isPending}
              onDelete={(campaignId) => {
                setActionMessage(null);
                deleteMutation.mutate({ campaignId });
              }}
            />
          ))}
        </div>
      )}

      {actionMessage && <p className="rounded-md border bg-card p-3 text-sm">{actionMessage}</p>}
    </div>
  );
}

function CampaignFilters({
  statusFilter,
  periodFilter,
  startDate,
  endDate,
  campaignCount,
  onStatusFilterChange,
  onPeriodFilterChange,
  onDateRangeChange,
}: {
  statusFilter: StatusFilter;
  periodFilter: PeriodFilter;
  startDate?: string;
  endDate?: string;
  campaignCount: number;
  onStatusFilterChange: (value: StatusFilter) => void;
  onPeriodFilterChange: (value: PeriodFilter) => void;
  onDateRangeChange: (startDate: string, endDate: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center">
      <Tabs
        value={statusFilter}
        onValueChange={(value) => onStatusFilterChange(value as StatusFilter)}
        className="w-full sm:w-auto"
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="paused">Paused</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="h-px bg-border sm:h-6 sm:w-px" />

      <Select value={periodFilter} onValueChange={(value) => onPeriodFilterChange(value as PeriodFilter)}>
        <SelectTrigger className="w-full sm:w-[160px]">
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent className="bg-popover text-popover-foreground">
          <SelectItem value="all-time">All Time</SelectItem>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="this-week">This Week</SelectItem>
          <SelectItem value="this-month">This Month</SelectItem>
          <SelectItem value="this-quarter">This Quarter</SelectItem>
          <SelectItem value="this-year">This Year</SelectItem>
        </SelectContent>
      </Select>

      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onDateRangeChange={onDateRangeChange}
        className="w-full sm:w-auto"
      />

      <div className="ml-auto hidden text-sm text-muted-foreground lg:block">
        {campaignCount} campaign{campaignCount !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

export function DateRangePicker({
  className,
  startDate,
  endDate,
  onDateRangeChange,
}: {
  className?: string;
  startDate?: string;
  endDate?: string;
  onDateRangeChange: (startDate: string, endDate: string) => void;
}) {
  const [from, setFrom] = useState<Date | undefined>(startDate ? new Date(startDate) : undefined);
  const [to, setTo] = useState<Date | undefined>(endDate ? new Date(endDate) : undefined);

  useEffect(() => {
    setFrom(startDate ? new Date(startDate) : undefined);
    setTo(endDate ? new Date(endDate) : undefined);
  }, [startDate, endDate]);

  const handleDateChange = (field: 'from' | 'to', date: Date | undefined) => {
    if (field === 'from') {
      setFrom(date);
      if (date && to) {
        onDateRangeChange(format(date, 'yyyy-MM-dd'), format(to, 'yyyy-MM-dd'));
      }
    } else {
      setTo(date);
      if (from && date) {
        onDateRangeChange(format(from, 'yyyy-MM-dd'), format(date, 'yyyy-MM-dd'));
      }
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn('h-10 w-full justify-start text-left font-normal', !from && !to && 'text-muted-foreground', className)}
        >
          <CalendarIcon className="mr-2 size-4" />
          {from ? (
            to ? (
              <>
                {format(from, 'MMM dd, yyyy')} - {format(to, 'MMM dd, yyyy')}
              </>
            ) : (
              format(from, 'MMM dd, yyyy')
            )
          ) : (
            <span>Pick a date range</span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto border bg-popover p-0 text-popover-foreground shadow-md" align="start">
        <div className="grid grid-cols-1 gap-2 p-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="mb-2 text-sm font-medium text-muted-foreground">Start Date</p>
            <UiCalendar
              mode="single"
              selected={from}
              onSelect={(date) => handleDateChange('from', date)}
              disabled={(date) => (to ? date > to : false)}
            />
          </div>
          <div className="space-y-2">
            <p className="mb-2 text-sm font-medium text-muted-foreground">End Date</p>
            <UiCalendar
              mode="single"
              selected={to}
              onSelect={(date) => handleDateChange('to', date)}
              disabled={(date) => (from ? date < from : false)}
            />
          </div>
        </div>

        <div className="border-t p-3">
          <Button
            type="button"
            variant="ghost"
            className="h-8 w-full justify-center text-xs"
            onClick={() => {
              setFrom(undefined);
              setTo(undefined);
              onDateRangeChange('', '');
            }}
          >
            Clear date range
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CampaignCard({
  campaign,
  onDelete,
  isDeleting,
}: {
  campaign: Campaign;
  onDelete: (campaignId: string) => void;
  isDeleting: boolean;
}) {
  const status = readStatus(campaign).toLowerCase();
  const calendarStatus = campaign.calendarSyncStatus || 'not_linked';
  const isCalendarLinked =
    Boolean(campaign.googleEventId) || calendarStatus === 'synced' || calendarStatus === 'out_of_sync';
  const gaLinked = campaign.gaType === 'OAUTH' || campaign.gaMode === 'OAUTH';

  return (
    <Card className="flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3 overflow-hidden">
          <div className="min-w-0 flex-1 overflow-hidden">
            <CardTitle className="block truncate text-lg leading-tight">{campaign.name}</CardTitle>
            <CardDescription className="mt-1.5 line-clamp-2">{campaign.description || 'No description yet.'}</CardDescription>
          </div>
          <Badge
            variant={status === 'active' ? 'default' : 'secondary'}
            className={`shrink-0 whitespace-nowrap capitalize ${
              status === 'active'
                ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <User className="size-4 shrink-0" />
          <span className="truncate">{readCreatedBy(campaign)}</span>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="size-4 shrink-0" />
          <span>
            {formatDateLabel(readStartDate(campaign))} - {formatDateLabel(readEndDate(campaign))}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isCalendarLinked ? (
            <>
              <CalendarCheck className="size-4 shrink-0 text-emerald-500" />
              <Badge
                variant="outline"
                className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400"
              >
                Google Calendar Linked
              </Badge>
            </>
          ) : (
            <>
              <CalendarX className="size-4 shrink-0 text-muted-foreground" />
              <Badge variant="outline" className="text-muted-foreground">
                Calendar Unlinked
              </Badge>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {gaLinked ? (
            <>
              <BarChart3 className="size-4 shrink-0 text-blue-500" />
              <Badge
                variant="outline"
                className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-400"
              >
                <CheckCircle2 className="mr-1 size-3" />
                GA4 Connected
              </Badge>
            </>
          ) : (
            <>
              <BarChart3 className="size-4 shrink-0 text-muted-foreground" />
              <Badge variant="outline" className="text-muted-foreground">
                <Circle className="mr-1 size-3" />
                GA4 Not Connected
              </Badge>
            </>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t pt-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard?tab=campaign-detail&campaignId=${campaign.id}&campaignName=${encodeURIComponent(campaign.name || `Campaign ${campaign.id}`)}`}>
            <Eye className="mr-1.5 size-4" />
            View Details
          </Link>
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-destructive"
              disabled={isDeleting}
            >
              <Trash2 className="size-4" />
              <span className="sr-only">Delete campaign</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{campaign.name}&quot;? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(String(campaign.id))}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}

