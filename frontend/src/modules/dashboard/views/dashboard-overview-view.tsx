'use client';

import { ArrowUpRight, BarChart3, QrCode, ScanLine, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const overviewStats = [
  { title: 'Total QR Codes', value: '2,847', icon: QrCode, trend: '+12.5%' },
  { title: 'Total Scans', value: '48,392', icon: ScanLine, trend: '+8.2%' },
  { title: 'Active Users', value: '1,234', icon: Users, trend: '+23.1%' },
  { title: 'Conversion Rate', value: '3.24%', icon: BarChart3, trend: '+1.4%' },
];

export default function DashboardOverviewView() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {overviewStats.map((stat) => (
          <Card key={stat.title} className="border-muted bg-card">
            <CardHeader className="pb-2">
              <CardDescription>{stat.title}</CardDescription>
              <CardTitle className="flex items-center justify-between text-2xl">
                {stat.value}
                <stat.icon className="h-4 w-4 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 text-primary">
                <ArrowUpRight className="h-3 w-3" />
                {stat.trend}
              </span>
              <span className="ml-1">from last month</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-muted bg-card md:col-span-2">
          <CardHeader>
            <CardTitle>Scan Analytics</CardTitle>
            <CardDescription>Monthly scan and engagement trend overview.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">Chart module can be plugged here without changing dashboard routing logic.</CardContent>
        </Card>
        <Card className="border-muted bg-card">
          <CardHeader>
            <CardTitle>Traffic Sources</CardTitle>
            <CardDescription>Distribution by channel and entry source.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">Pie chart module placeholder aligned with the source layout.</CardContent>
        </Card>
      </div>
    </div>
  );
}

