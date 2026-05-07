"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { handleIntegrationCallback } from "@/apis/integrations-api"
import { getGoogleOAuthRedirectUri } from "@/lib/integrations/google-oauth"
import { cacheInvalidations } from "@/lib/cache/query-client"

const OAUTH_RETURN_PATH_KEY = "dqr:oauth-return-path"

export default function GoogleCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = React.useState<string | null>(null)
  const hasCalledBack = React.useRef(false)

  // Get OAuth params from URL
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const errorParam = searchParams.get("error")
  const errorDescription = searchParams.get("error_description")

  // Callback mutation
  const callbackMutation = useMutation({
    mutationFn: handleIntegrationCallback,
    onSuccess: () => {
      // Invalidate integration status cache
      cacheInvalidations.callbackIntegrationProvider()

      // Get return path from session storage
      const returnPath = typeof window !== "undefined"
        ? window.sessionStorage.getItem(OAUTH_RETURN_PATH_KEY) || "/dashboard/integrations/setup"
        : "/dashboard/integrations/setup"

      // Clear return path
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(OAUTH_RETURN_PATH_KEY)
      }

      // Redirect back to setup page
      router.push(returnPath)
    },
    onError: (err: any) => {
      setError(err?.message || "Failed to connect Google account. Please try again.")
    },
  })

  React.useEffect(() => {
    // Prevent multiple API calls
    if (hasCalledBack.current) return

    // Handle OAuth errors from Google
    if (errorParam) {
      setError(errorDescription || `OAuth error: ${errorParam}`)
      return
    }

    // Validate required params
    if (!code || !state) {
      setError("Invalid callback URL. Missing required parameters.")
      return
    }

    // Mark as called to prevent re-calls
    hasCalledBack.current = true

    // Extract provider from state (format: "provider:index:nonce")
    const provider = state.split(":")[0] || "google_calendar"

    // Call backend to complete OAuth flow
    const redirectUri = getGoogleOAuthRedirectUri()
    callbackMutation.mutate({
      provider: provider as "google_calendar" | "google_analytics",
      code,
      state,
      redirectUri,
    })
  }, [code, state, errorParam, errorDescription])

  // Show error state
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="size-6 text-destructive" />
            </div>
            <CardTitle>Connection Failed</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => router.push("/dashboard/integrations/setup")}>
              Return to Setup
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show loading state
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
          <CardTitle>Connecting Google Account</CardTitle>
          <CardDescription>
            Please wait while we complete the connection...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard/integrations/setup")}
          >
            Cancel
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
