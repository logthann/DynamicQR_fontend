'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Calendar } from 'lucide-react';

interface CampaignCardProps {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'draft' | 'archived';
  totalScans: number;
  uniqueUsers: number;
  createdAt: string;
}

export function CampaignCard({
  id,
  name,
  description,
  status,
  totalScans,
  uniqueUsers,
  createdAt,
}: CampaignCardProps) {
  const statusConfig = {
    active: { variant: 'default' as const, className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/50' },
    inactive: { variant: 'secondary' as const, className: '' },
    draft: { variant: 'outline' as const, className: '' },
    archived: { variant: 'secondary' as const, className: 'opacity-60' },
  };

  const config = statusConfig[status];

  return (
    <Card className="group transition-all hover:border-primary/50 hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{name}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <Badge variant={config.variant} className={config.className}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>{totalScans.toLocaleString()} scans</span>
            <span>{uniqueUsers.toLocaleString()} unique users</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="size-3" />
            <span>{new Date(createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="mt-4 w-full opacity-0 transition-opacity group-hover:opacity-100"
        >
          <Link href={`/campaigns/${id}`}>
            <Eye className="mr-1 size-3" />
            View Details
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
