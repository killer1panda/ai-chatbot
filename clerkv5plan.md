Critical Issues Found & Fixes:
1. Clerk v4 → v5 Migration Required
Your package.json shows @clerk/nextjs@^4.29.12 which is outdated. Clerk v5 has breaking changes:
Fix package.json:
json
"@clerk/nextjs": "^5.7.0"

2. Root Layout - ClerkProvider Placement (CRITICAL)
Current Issue: ClerkProvider wraps the <html> tag incorrectly
Fix /workspace/src/app/layout.tsx:
import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { ThemeProvider } from '@/context/them-provider'
import PusherBeams from '@/components/pusher-beams'

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Corinna AI',
  description: 'AI powered sales assistant chatbot',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={jakarta.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          <PusherBeams />
        </ThemeProvider>
      </body>
    </html>
  )
}


Create /workspace/src/components/providers/clerk-provider.tsx:
'use client'

import { ClerkProvider as ClerkProviderBase } from '@clerk/nextjs'
import { usePathname } from 'next/navigation'

interface ClerkProviderProps {
  children: React.ReactNode
}

export function ClerkProvider({ children }: ClerkProviderProps) {
  const pathname = usePathname()
  
  // Don't wrap portal routes with ClerkProvider
  if (pathname?.startsWith('/portal')) {
    return <>{children}</>
  }

  return (
    <ClerkProviderBase
      afterSignInUrl="/dashboard"
      afterSignUpUrl="/dashboard"
      signInUrl="/auth/sign-in"
      signUpUrl="/auth/sign-up"
      appearance={{
        elements: {
          formButtonPrimary: 'bg-gravel hover:bg-gravel/90',
          card: 'bg-white',
        },
      }}
    >
      {children}
    </ClerkProviderBase>
  )
}


Update root layout to import ClerkProvider:
// Add at top of layout.tsx
import { ClerkProvider } from '@/components/providers/clerk-provider'

// Wrap children with ClerkProvider in body
<body className={jakarta.className}>
  <ClerkProvider>
    <ThemeProvider...>
      {children}
      ...
    </ThemeProvider>
  </ClerkProvider>
</body>



3. Middleware - Update to Clerk v5 Syntax
Fix /workspace/src/middleware.ts:
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/auth(.*)',
  '/portal(.*)',
  '/images(.*)',
  '/service-worker.js',
  '/api(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  // Allow public routes
  if (isPublicRoute(req)) {
    return NextResponse.next()
  }

  // Protect private routes
  await auth.protect()
})

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}



4. Replace Custom Sign-In Form with Clerk Component
Replace /workspace/src/app/auth/sign-in/[[...sign-in]]/page.tsx:

import { SignIn } from '@clerk/nextjs'

export const dynamic = 'force-dynamic'

const SignInPage = () => {
  return (
    <div className="flex-1 py-20 md:px-16 w-full flex justify-center">
      <SignIn 
        routing="path"
        path="/auth/sign-in"
        signUpUrl="/auth/sign-up"
        appearance={{
          elements: {
            rootBox: 'w-full max-w-md',
            card: 'bg-white shadow-sm border border-muted rounded-2xl p-8',
            headerTitle: 'text-2xl font-semibold text-gravel',
            headerSubtitle: 'text-sm text-iridium',
            socialButtonsBlockButton: 'border border-muted',
            formButtonPrimary: 'bg-gravel hover:bg-gravel/90',
          },
        }}
      />
    </div>
  )
}

export default SignInPage


Delete: /workspace/src/app/auth/sign-in/[[...sign-in]]/sign-in-client.tsx (no longer needed)
5. Replace Custom Sign-Up Flow
Replace /workspace/src/app/auth/sign-up/page.tsx:



import { SignUp } from '@clerk/nextjs'

export const dynamic = 'force-dynamic'

const SignUpPage = () => {
  return (
    <div className="flex-1 py-20 md:px-16 w-full flex justify-center">
      <SignUp 
        routing="path"
        path="/auth/sign-up"
        signInUrl="/auth/sign-in"
        appearance={{
          elements: {
            rootBox: 'w-full max-w-md',
            card: 'bg-white shadow-sm border border-muted rounded-2xl p-8',
            headerTitle: 'text-2xl font-semibold text-gravel',
            headerSubtitle: 'text-sm text-iridium',
            socialButtonsBlockButton: 'border border-muted',
            formButtonPrimary: 'bg-gravel hover:bg-gravel/90',
          },
        }}
      />
    </div>
  )
}

export default SignUpPage






Delete these files (replaced by Clerk):
/workspace/src/components/forms/sign-up/* (entire folder)
/workspace/src/hooks/sign-up/use-sign-up.ts
/workspace/src/context/use-auth-context.tsx
6. Fix Server-Side Auth Calls
Update /workspace/src/actions/auth/index.ts:


'use server'

import { client } from '@/lib/prisma'
import { auth, currentUser, redirectToSignIn } from '@clerk/nextjs/server'
import { onGetAllAccountDomains } from '../settings'

export const onCompleteUserRegistration = async (
  fullname: string,
  clerkId: string,
  type: string
) => {
  try {
    const registered = await client.user.create({
      data: {
        fullname,
        clerkId,
        type,
        subscription: {
          create: {},
        },
      },
      select: {
        fullname: true,
        id: true,
        type: true,
      },
    })

    if (registered) {
      return { status: 200, user: registered }
    }
  } catch (error) {
    console.error('Registration error:', error)
    return { status: 400 }
  }
}

export const onLoginUser = async () => {
  const { userId } = await auth()
  
  if (!userId) {
    return redirectToSignIn()
  }

  const user = await currentUser()
  if (!user) {
    return redirectToSignIn()
  }
  
  try {
    const authenticated = await client.user.findUnique({
      where: {
        clerkId: userId,
      },
      select: {
        fullname: true,
        id: true,
        type: true,
      },
    })
    
    if (!authenticated) {
      return redirectToSignIn()
    }
    
    const domains = await onGetAllAccountDomains()
    return { status: 200, user: authenticated, domain: domains?.domains }
  } catch (error) {
    console.error('Login error:', error)
    return redirectToSignIn()
  }
}




7. Fix Dashboard Layout Auth
Update /workspace/src/app/(dashboard)/layout.tsx:
export const dynamic = 'force-dynamic'
import { onLoginUser } from '@/actions/auth'
import SideBar from '@/components/sidebar'
import { ChatProvider } from '@/context/user-chat-context'
import { redirect } from 'next/navigation'
import React from 'react'

type Props = {
  children: React.ReactNode
}

const OwnerLayout = async ({ children }: Props) => {
  try {
    const authenticated = await onLoginUser()
    
    if (!authenticated || !('user' in authenticated) || !authenticated.user) {
      redirect('/auth/sign-in')
    }

    return (
      <ChatProvider>
        <div className="flex h-screen w-full">
          <SideBar domains={authenticated.domain} />
          <div className="w-full h-screen flex flex-col pl-20 md:pl-4">
            {children}
          </div>
        </div>
      </ChatProvider>
    )
  } catch (error) {
    console.error('Dashboard layout error:', error)
    redirect('/auth/sign-in')
  }
}

export default OwnerLayout




8. Fix Auth Layout Redirect
Update /workspace/src/app/auth/layout.tsx:

export const dynamic = 'force-dynamic'
import { auth } from '@clerk/nextjs/server'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import React from 'react'

type Props = {
  children: React.ReactNode
}

const Layout = async ({ children }: Props) => {
  const { userId } = await auth()

  if (userId) {
    redirect('/dashboard')
  }

  return (
    <div className="h-screen flex w-full justify-center">
      <div className="w-[600px] lg:w-full flex flex-col items-start p-6">
        <Image
          src="/images/logo.png"
          alt="LOGO"
          sizes="100vw"
          style={{
            width: '20%',
            height: 'auto',
          }}
          width={0}
          height={0}
        />
        {children}
      </div>
      <div className="hidden lg:flex flex-1 w-full max-h-full max-w-4000px overflow-hidden relative bg-cream  flex-col pt-10 pl-24 gap-3">
        <h2 className="text-gravel md:text-4xl font-bold">
          Hi, I'm your AI powered sales assistant, Corinna!
        </h2>
        <p className="text-iridium md:text-sm mb-10">
          Corinna is capable of capturing lead information without a form...{' '}
          <br />
          something never done before 😉
        </p>
        <Image
          src="/images/app-ui.png"
          alt="app image"
          loading="lazy"
          sizes="30"
          className="absolute shrink-0 !w-[1600px] top-48"
          width={0}
          height={0}
        />
      </div>
    </div>
  )
}

export default Layout





9. Fix Sidebar Sign Out
Update /workspace/src/context/use-sidebar.tsx:
'use client'
import { useToast } from '@/components/ui/use-toast'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useChatContext } from './user-chat-context'
import { onGetConversationMode, onToggleRealtime } from '@/actions/conversation'
import { ClerkLoaded, useClerk } from '@clerk/nextjs'

const useSideBar = () => {
  const [expand, setExpand] = useState<boolean | undefined>(undefined)
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()
  const [realtime, setRealtime] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)

  const { chatRoom } = useChatContext()

  const onActivateRealtime = async (e: any) => {
    try {
      const realtime = await onToggleRealtime(
        chatRoom!,
        e.target.ariaChecked == 'true' ? false : true
      )
      if (realtime) {
        setRealtime(realtime.chatRoom.live)
        toast({
          title: 'Success',
          description: realtime.message,
        })
      }
    } catch (error) {
      console.log(error)
    }
  }

  const onGetCurrentMode = async () => {
    setLoading(true)
    const mode = await onGetConversationMode(chatRoom!)
    if (mode) {
      setRealtime(mode.live)
      setLoading(false)
    }
  }

  useEffect(() => {
    if (chatRoom) {
      onGetCurrentMode()
    }
  }, [chatRoom])

  const page = pathname.split('/').pop()
  const clerk = useClerk()

  const onSignOut = async () => {
    await clerk.signOut(() => {
      router.push('/')
    })
  }

  const onExpand = () => setExpand((prev) => !prev)

  return {
    expand,
    onExpand,
    page,
    onSignOut,
    realtime,
    onActivateRealtime,
    chatRoom,
    loading,
  }
}

export default useSideBar



11. Add Error Boundaries
Create /workspace/src/app/error.tsx:


'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] gap-4">
      <h2 className="text-2xl font-bold">Something went wrong!</h2>
      <p className="text-muted-foreground">{error.message}</p>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  )
}




Create /workspace/src/app/loading.tsx:
import { Loader } from '@/components/loader'

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[100dvh]">
      <Loader loading={true}>
        <div />
      </Loader>
    </div>
  )
}



12. Install Updated Dependencies
Run these commands:
cd /workspace
npm uninstall @clerk/nextjs
npm install @clerk/nextjs@^5.7.0
npm install date-fns



13. Fix /src/app/layout.tsx - The ClerkProvider should wrap the body content, not the html tag:

<html lang="en">
  <body>
    <ClerkProvider>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </ClerkProvider>
  </body>
</html>




14. Update Portal Routes Security
Portal routes should remain public but add validation:
Add middleware protection check in portal pages if needed:

// In portal pages, add domain ownership verification
const verifyDomainAccess = async (domainId: string) => {
  // Implement domain ownership check
  // Return true if public access allowed or user owns domain
}

Update /src/middleware.ts - Already using correct v5 syntax, but ensure API routes are included in public routes.



Summary of Files to Delete:
/workspace/src/app/auth/sign-in/[[...sign-in]]/sign-in-client.tsx
/workspace/src/components/forms/sign-up/ (entire folder)
/workspace/src/hooks/sign-up/use-sign-up.ts
/workspace/src/hooks/sign-in/ (if only used for custom forms)
/workspace/src/context/use-auth-context.tsx
Testing Checklist:
After implementing fixes:
✅ Run npm run build to check for TypeScript errors
✅ Test sign-in flow with Clerk components
✅ Test sign-up flow with Clerk components
✅ Verify dashboard protection redirects unauthenticated users
✅ Verify portal routes remain accessible
✅ Test sign-out functionality
✅ Check all environment variables are set
This comprehensive fix addresses all Clerk v5 migration issues, proper provider placement, deprecated API usage, security gaps, and adds proper error handling throughout the application.