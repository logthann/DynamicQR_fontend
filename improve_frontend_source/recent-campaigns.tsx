"use client"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const campaigns = [
  {
    id: 1,
    name: "Summer Sale 2024",
    qrCount: 45,
    status: "active",
    date: "Apr 12, 2026",
  },
  {
    id: 2,
    name: "Product Launch",
    qrCount: 28,
    status: "active",
    date: "Apr 10, 2026",
  },
  {
    id: 3,
    name: "Newsletter Signup",
    qrCount: 12,
    status: "paused",
    date: "Apr 08, 2026",
  },
  {
    id: 4,
    name: "Event Registration",
    qrCount: 89,
    status: "active",
    date: "Apr 05, 2026",
  },
  {
    id: 5,
    name: "Holiday Promo",
    qrCount: 34,
    status: "completed",
    date: "Mar 28, 2026",
  },
]

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case "active":
      return "default"
    case "paused":
      return "secondary"
    case "completed":
      return "outline"
    default:
      return "default"
  }
}

export function RecentCampaigns() {
  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Recent Campaigns</CardTitle>
        <CardDescription>
          Overview of your latest QR code campaigns
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-center">QR Count</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.map((campaign) => (
              <TableRow key={campaign.id}>
                <TableCell className="font-medium">{campaign.name}</TableCell>
                <TableCell className="text-center">{campaign.qrCount}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={getStatusBadgeVariant(campaign.status)}>
                    {campaign.status.charAt(0).toUpperCase() +
                      campaign.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {campaign.date}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
