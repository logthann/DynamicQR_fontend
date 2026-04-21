"use client"

import {
  BarChart3,
  Calendar,
  CalendarCheck,
  CalendarX,
  CheckCircle2,
  Circle,
  Eye,
  Trash2,
  User,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
} from "@/components/ui/alert-dialog"

export interface Campaign {
  id: string
  name: string
  description: string
  status: "active" | "paused"
  createdBy: string
  startDate: string
  endDate: string
  calendarLinked: boolean
  analyticsLinked: boolean
}

interface CampaignCardProps {
  campaign: Campaign
  onDelete?: (id: string) => void
  onViewDetails?: (id: string) => void
}

export function CampaignCard({
  campaign,
  onDelete,
  onViewDetails,
}: CampaignCardProps) {
  return (
    <Card className="flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3 overflow-hidden">
          <div className="min-w-0 flex-1 overflow-hidden">
            <CardTitle className="block truncate text-lg leading-tight">{campaign.name}</CardTitle>
            <CardDescription className="mt-1.5 line-clamp-2">
              {campaign.description}
            </CardDescription>
          </div>
          <Badge
            variant={campaign.status === "active" ? "default" : "secondary"}
            className={cn(
              "shrink-0 whitespace-nowrap capitalize",
              campaign.status === "active"
                ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
            )}
          >
            {campaign.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <User className="size-4 shrink-0" />
          <span className="truncate">{campaign.createdBy}</span>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="size-4 shrink-0" />
          <span>
            {campaign.startDate} - {campaign.endDate}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {campaign.calendarLinked ? (
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
          {campaign.analyticsLinked ? (
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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewDetails?.(campaign.id)}
        >
          <Eye className="mr-1.5 size-4" />
          View Details
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-4" />
              <span className="sr-only">Delete campaign</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{campaign.name}&quot;?
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete?.(campaign.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  )
}
