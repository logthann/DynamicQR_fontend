"use client"

import { QrCode, Scan, Users, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const stats = [
  {
    title: "Total QR Codes",
    value: "2,847",
    change: "+12.5%",
    trend: "up",
    icon: QrCode,
  },
  {
    title: "Total Scans",
    value: "48,392",
    change: "+8.2%",
    trend: "up",
    icon: Scan,
  },
  {
    title: "Active Users",
    value: "1,234",
    change: "+23.1%",
    trend: "up",
    icon: Users,
  },
  {
    title: "Conversion Rate",
    value: "3.24%",
    change: "-2.4%",
    trend: "down",
    icon: TrendingUp,
  },
]

export function StatCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="flex items-center text-xs">
              {stat.trend === "up" ? (
                <ArrowUpRight className="mr-1 size-3 text-emerald-500" />
              ) : (
                <ArrowDownRight className="mr-1 size-3 text-red-500" />
              )}
              <span
                className={
                  stat.trend === "up" ? "text-emerald-500" : "text-red-500"
                }
              >
                {stat.change}
              </span>
              <span className="ml-1 text-muted-foreground">from last month</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
