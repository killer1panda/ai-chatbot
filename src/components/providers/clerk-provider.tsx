'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

interface ClerkProviderProps {
  children: ReactNode
}

export function ClerkProvider({ children }: ClerkProviderProps) {
  // No longer using Clerk, just return children
  return <>{children}</>
}
