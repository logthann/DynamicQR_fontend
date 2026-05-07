import { Suspense } from "react"

import GoogleCallbackPage from "@/modules/integrations/google-callback/page"

function GoogleCallbackFallback() {
  return null
}

export default function GoogleCallbackRoute() {
  return (
    <Suspense fallback={<GoogleCallbackFallback />}>
      <GoogleCallbackPage />
    </Suspense>
  )
}
