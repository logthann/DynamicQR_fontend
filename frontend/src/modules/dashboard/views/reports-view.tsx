'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ReportsView() {
  return (
    <Card className="border-muted bg-card">
      <CardHeader>
        <CardTitle className="text-lg">Reports</CardTitle>
        <CardDescription>Report modules and data export workflows can be mounted here.</CardDescription>
      </CardHeader>
      <CardContent className="pt-0 text-sm text-muted-foreground">The route and sidebar item are wired to match the source navigation structure.</CardContent>
    </Card>
  );
}

