'use client'

import React, { useEffect, useState } from 'react'
import { getAuthContext } from '@/apis/auth-fetch'

export default function FooterAuthInfo() {
  const [companyName, setCompanyName] = useState<string | undefined>(undefined)
  const [fullName, setFullName] = useState<string | undefined>(undefined)

  useEffect(() => {
    try {
      const ctx = getAuthContext()
      setCompanyName(ctx.companyName)
      setFullName(ctx.fullName)
    } catch (e) {
      // ignore
    }
  }, [])

  const company = companyName || 'DynamicQR'

  return (
    <p className="text-sm text-muted-foreground">
      &copy; {new Date().getFullYear()} {company}{fullName ? ` — ${fullName}` : ''}. All rights reserved.
    </p>
  )
}

