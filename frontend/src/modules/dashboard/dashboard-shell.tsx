'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import CampaignList from '@/modules/campaigns/list/campaign-list';
import IntegrationsDashboard from '@/modules/integrations/calendar/integrations-dashboard';
import { getAuthContext } from '@/lib/api/auth-fetch';

type DashboardTab = 'campaigns' | 'integrations' | 'profile';

export default function DashboardShell({ initialTab = 'campaigns' }: { initialTab?: DashboardTab }) {
  const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab);

  const auth = getAuthContext();
  const accountLabel = useMemo(() => {
    const company = auth.companyName || 'Unknown company';
    const role = auth.role || 'user';
    return `${company} (${role})`;
  }, [auth.companyName, auth.role]);

  return (
    <main className="grid min-h-screen grid-cols-1 bg-background md:grid-cols-[260px_1fr]">
      <aside className="border-b border-muted bg-card p-4 md:border-b-0 md:border-r">
        <div className="rounded-md border border-muted p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">User profile</p>
          <p className="mt-1 text-sm font-medium text-foreground">{accountLabel}</p>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className="mt-3 w-full rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/20"
          >
            View Profile Details
          </button>
        </div>

        <nav className="mt-4 space-y-2">
          <button
            type="button"
            onClick={() => setActiveTab('campaigns')}
            className={`w-full rounded-md px-3 py-2 text-left text-sm ${
              activeTab === 'campaigns' ? 'bg-primary text-primary-foreground' : 'border border-muted bg-background text-foreground hover:bg-muted'
            }`}
          >
            Campaigns
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('integrations')}
            className={`w-full rounded-md px-3 py-2 text-left text-sm ${
              activeTab === 'integrations' ? 'bg-primary text-primary-foreground' : 'border border-muted bg-background text-foreground hover:bg-muted'
            }`}
          >
            Calendar Integration
          </button>
        </nav>

        <div className="mt-6">
          <Link href="/home" className="text-xs text-primary hover:underline">
            Back to Home
          </Link>
        </div>
      </aside>

      <section className="p-4 md:p-6">
        {activeTab === 'campaigns' && <CampaignList />}
        {activeTab === 'integrations' && <IntegrationsDashboard />}
        {activeTab === 'profile' && (
          <div className="rounded-lg border border-muted bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground">Profile details</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Account editing and password update can be implemented here next.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

