
# Create a complete NextAuth.js replacement for Clerk

# 1. Auth configuration
auth_config = """import { PrismaAdapter } from '@auth/prisma-adapter'
import { client } from './prisma'
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  adapter: PrismaAdapter(client),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/auth/sign-in',
    error: '/auth/sign-in',
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
      }
      return session
    },
  },
  events: {
    async signIn({ user, isNewUser }) {
      if (isNewUser) {
        // Create subscription for new users
        await client.user.update({
          where: { id: user.id },
          data: {
            subscription: {
              create: {
                plan: 'STANDARD',
                credits: 0,
              },
            },
          },
        })
      }
    },
  },
})
"""

# 2. API route
api_route = """import { GET, POST } from '@/lib/auth'

export { GET, POST }
"""

# 3. Middleware (simple, no Clerk)
middleware_simple = """import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  const isApiAuthRoute = nextUrl.pathname.startsWith('/api/auth')
  const isPublicRoute = ['/', '/auth/sign-in', '/portal', '/chatbot', '/images'].some(
    (route) => nextUrl.pathname.startsWith(route)
  )
  const isAuthRoute = nextUrl.pathname.startsWith('/auth')

  if (isApiAuthRoute) {
    return NextResponse.next()
  }

  if (isAuthRoute) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/dashboard', nextUrl))
    }
    return NextResponse.next()
  }

  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL('/auth/sign-in', nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)', '/(api|trpc)(.*)'],
}
"""

# 4. Sign-in page (custom, no Clerk)
signin_custom = """'use client'

import { signIn } from 'next-auth/react'
import Image from 'next/image'

export default function SignInPage() {
  return (
    <div className="h-screen flex w-full justify-center">
      <div className="w-[600px] lg:w-full flex flex-col items-start p-6">
        <Image
          src="/images/logo.png"
          alt="LOGO"
          sizes="100vw"
          style={{ width: '20%', height: 'auto' }}
          width={0}
          height={0}
        />
        <div className="flex-1 flex flex-col justify-center items-center w-full">
          <h1 className="text-3xl font-bold mb-8">Welcome</h1>
          <button
            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
            className="flex items-center gap-3 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
      <div className="hidden lg:flex flex-1 w-full max-h-full max-w-4000px overflow-hidden relative bg-cream flex-col pt-10 pl-24 gap-3">
        <h2 className="text-gravel md:text-4xl font-bold">
          Hi, I'm your AI powered sales assistant, Corinna!
        </h2>
        <p className="text-iridium md:text-sm mb-10">
          Corinna is capable of capturing lead information without a form...
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
"""

# 5. Auth layout (simple, no redirects)
auth_layout_simple = """export const dynamic = 'force-dynamic'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
"""

# 6. Dashboard layout (uses NextAuth session)
dashboard_layout_nextauth = """export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { client } from '@/lib/prisma'
import SideBar from '@/components/sidebar'
import { ChatProvider } from '@/context/user-chat-context'
import { redirect } from 'next/navigation'

const OwnerLayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/auth/sign-in')
  }

  const user = await client.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      fullname: true,
      email: true,
      domains: {
        select: {
          name: true,
          icon: true,
          id: true,
        },
      },
    },
  })

  if (!user) {
    redirect('/auth/sign-in')
  }

  return (
    <ChatProvider>
      <div className="flex h-screen w-full">
        <SideBar domains={user.domains || []} />
        <div className="w-full h-screen flex flex-col pl-20 md:pl-4">
          {children}
        </div>
      </div>
    </ChatProvider>
  )
}

export default OwnerLayout
"""

# 7. Auth actions (no Clerk)
auth_actions_nextauth = """'use server'

import { client } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const onGetCurrentUser = async () => {
  const session = await auth()
  if (!session?.user?.id) return null

  return client.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      fullname: true,
      email: true,
      type: true,
      domains: {
        select: {
          name: true,
          icon: true,
          id: true,
        },
      },
    },
  })
}

export const onLoginUser = async () => {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/auth/sign-in')
  }

  const user = await client.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      fullname: true,
      type: true,
    },
  })

  if (!user) {
    redirect('/auth/sign-in')
  }

  const domains = await client.domain.findMany({
    where: { userId: user.id },
    select: {
      name: true,
      icon: true,
      id: true,
    },
  })

  return { status: 200, user, domain: domains }
}
"""

# 8. Settings actions (no Clerk)
settings_actions_nextauth = """'use server'
import { client } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export const onIntegrateDomain = async (domain: string, icon: string) => {
  const session = await auth()
  if (!session?.user?.id) return { status: 401, message: 'Not authenticated' }

  try {
    const userData = await client.user.findUnique({
      where: { id: session.user.id },
      select: {
        _count: { select: { domains: true } },
        subscription: { select: { plan: true } },
      },
    })

    if (!userData) {
      return { status: 400, message: 'User not found' }
    }

    const domainExists = await client.domain.findFirst({
      where: {
        userId: session.user.id,
        name: domain,
      },
    })

    if (domainExists) {
      return { status: 400, message: 'Domain already exists' }
    }

    const plan = userData.subscription?.plan || 'STANDARD'
    const domainCount = userData._count.domains
    const planLimits: Record<string, number> = {
      'STANDARD': 1,
      'PRO': 5,
      'ULTIMATE': 10,
    }
    const limit = planLimits[plan] || 1

    if (domainCount >= limit) {
      return {
        status: 400,
        message: `You've reached the maximum (${limit}) for your ${plan} plan.`,
      }
    }

    await client.domain.create({
      data: {
        name: domain,
        icon,
        userId: session.user.id,
        chatBot: {
          create: {
            welcomeMessage: 'Hey there, have a question? Text us here',
          },
        },
      },
    })

    return { status: 200, message: 'Domain successfully added' }
  } catch (error) {
    console.error('onIntegrateDomain error:', error)
    return { status: 500, message: 'An error occurred' }
  }
}

export const onGetSubscriptionPlan = async () => {
  const session = await auth()
  if (!session?.user?.id) return

  const plan = await client.user.findUnique({
    where: { id: session.user.id },
    select: { subscription: { select: { plan: true } } },
  })

  return plan?.subscription?.plan || 'STANDARD'
}

export const onGetAllAccountDomains = async () => {
  const session = await auth()
  if (!session?.user?.id) return

  return client.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      domains: {
        select: {
          name: true,
          icon: true,
          id: true,
          customer: {
            select: {
              chatRoom: {
                select: { id: true, live: true },
              },
            },
          },
        },
      },
    },
  })
}

export const onUpdatePassword = async (password: string) => {
  // Not supported with Google OAuth - would need custom credentials provider
  return { status: 400, message: 'Password update not available with Google sign-in' }
}

export const onGetCurrentDomainInfo = async (domain: string) => {
  const session = await auth()
  if (!session?.user?.id) return

  return client.user.findUnique({
    where: { id: session.user.id },
    select: {
      subscription: { select: { plan: true } },
      domains: {
        where: { name: { contains: domain } },
        select: {
          id: true,
          name: true,
          icon: true,
          userId: true,
          products: true,
          chatBot: {
            select: { id: true, welcomeMessage: true, icon: true },
          },
        },
      },
    },
  })
}

export const onUpdateDomain = async (id: string, name: string) => {
  try {
    const domainExists = await client.domain.findFirst({
      where: { name: { contains: name } },
    })

    if (domainExists) {
      return { status: 400, message: 'Domain with this name already exists' }
    }

    const domain = await client.domain.update({
      where: { id },
      data: { name },
    })

    if (domain) {
      return { status: 200, message: 'Domain updated' }
    }
    return { status: 400, message: 'Oops something went wrong!' }
  } catch (error) {
    console.log(error)
  }
}

export const onChatBotImageUpdate = async (id: string, icon: string) => {
  const session = await auth()
  if (!session?.user?.id) return

  try {
    const domain = await client.domain.update({
      where: { id },
      data: {
        chatBot: {
          update: {
            data: { icon },
          },
        },
      },
    })

    if (domain) {
      return { status: 200, message: 'Domain updated' }
    }
    return { status: 400, message: 'Oops something went wrong!' }
  } catch (error) {
    console.log(error)
  }
}

export const onUpdateWelcomeMessage = async (message: string, domainId: string) => {
  try {
    const update = await client.domain.update({
      where: { id: domainId },
      data: {
        chatBot: {
          update: {
            data: { welcomeMessage: message },
          },
        },
      },
    })

    if (update) {
      return { status: 200, message: 'Welcome message updated' }
    }
  } catch (error) {
    console.log(error)
  }
}

export const onDeleteUserDomain = async (id: string) => {
  const session = await auth()
  if (!session?.user?.id) return

  try {
    const deletedDomain = await client.domain.delete({
      where: {
        userId: session.user.id,
        id,
      },
      select: { name: true },
    })

    if (deletedDomain) {
      return {
        status: 200,
        message: `${deletedDomain.name} was deleted successfully`,
      }
    }
  } catch (error) {
    console.log(error)
  }
}

export const onCreateHelpDeskQuestion = async (id: string, question: string, answer: string) => {
  try {
    const helpDeskQuestion = await client.domain.update({
      where: { id },
      data: {
        helpdesk: {
          create: { question, answer },
        },
      },
      include: {
        helpdesk: {
          select: { id: true, question: true, answer: true },
        },
      },
    })

    if (helpDeskQuestion) {
      return {
        status: 200,
        message: 'New help desk question added',
        questions: helpDeskQuestion.helpdesk,
      }
    }
    return { status: 400, message: 'Oops! something went wrong' }
  } catch (error) {
    console.log(error)
  }
}

export const onGetAllHelpDeskQuestions = async (id: string) => {
  try {
    const questions = await client.helpDesk.findMany({
      where: { domainId: id },
      select: { question: true, answer: true, id: true },
    })

    return {
      status: 200,
      message: 'Questions fetched',
      questions,
    }
  } catch (error) {
    console.log(error)
  }
}

export const onCreateFilterQuestions = async (id: string, question: string) => {
  try {
    const filterQuestion = await client.domain.update({
      where: { id },
      data: {
        filterQuestions: {
          create: { question },
        },
      },
      include: {
        filterQuestions: {
          select: { id: true, question: true },
        },
      },
    })

    if (filterQuestion) {
      return {
        status: 200,
        message: 'Filter question added',
        questions: filterQuestion.filterQuestions,
      }
    }
    return { status: 400, message: 'Oops! something went wrong' }
  } catch (error) {
    console.log(error)
  }
}

export const onGetAllFilterQuestions = async (id: string) => {
  try {
    const questions = await client.filterQuestions.findMany({
      where: { domainId: id },
      select: { question: true, id: true },
      orderBy: { question: 'asc' },
    })

    return { status: 200, message: '', questions }
  } catch (error) {
    console.log(error)
  }
}

export const onGetPaymentConnected = async () => {
  const session = await auth()
  if (!session?.user?.id) return

  const connected = await client.user.findUnique({
    where: { id: session.user.id },
    select: { stripeId: true },
  })

  return connected?.stripeId
}

export const onCreateNewDomainProduct = async (id: string, name: string, image: string, price: string) => {
  try {
    const product = await client.domain.update({
      where: { id },
      data: {
        products: {
          create: {
            name,
            image,
            price: parseInt(price),
          },
        },
      },
    })

    if (product) {
      return { status: 200, message: 'Product successfully created' }
    }
  } catch (error) {
    console.log(error)
  }
}
"""

# 9. Dashboard actions (no Clerk)
dashboard_actions_nextauth = """'use server'

import { client } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET!, {
  typescript: true,
  apiVersion: '2024-04-10',
})

export const getUserClients = async () => {
  try {
    const session = await auth()
    if (!session?.user?.id) return

    return client.customer.count({
      where: {
        Domain: {
          User: { id: session.user.id },
        },
      },
    })
  } catch (error) {
    console.log(error)
  }
}

export const getUserBalance = async () => {
  try {
    const session = await auth()
    if (!session?.user?.id) return

    const connectedStripe = await client.user.findUnique({
      where: { id: session.user.id },
      select: { stripeId: true },
    })

    if (connectedStripe?.stripeId) {
      const transactions = await stripe.balance.retrieve({
        stripeAccount: connectedStripe.stripeId,
      })

      if (transactions) {
        const sales = transactions.pending.reduce((total, next) => total + next.amount, 0)
        return sales / 100
      }
    }
  } catch (error) {
    console.log(error)
  }
}

export const getUserPlanInfo = async () => {
  try {
    const session = await auth()
    if (!session?.user?.id) return

    const plan = await client.user.findUnique({
      where: { id: session.user.id },
      select: {
        _count: { select: { domains: true } },
        subscription: { select: { plan: true, credits: true } },
      },
    })

    if (plan) {
      return {
        plan: plan.subscription?.plan,
        credits: plan.subscription?.credits,
        domains: plan._count.domains,
      }
    }
  } catch (error) {
    console.log(error)
  }
}

export const getUserTotalProductPrices = async () => {
  try {
    const session = await auth()
    if (!session?.user?.id) return

    const products = await client.product.findMany({
      where: {
        Domain: {
          User: { id: session.user.id },
        },
      },
      select: { price: true },
    })

    if (products) {
      return products.reduce((total, next) => total + next.price, 0)
    }
  } catch (error) {
    console.log(error)
  }
}

export const getUserTransactions = async () => {
  try {
    const session = await auth()
    if (!session?.user?.id) return

    const connectedStripe = await client.user.findUnique({
      where: { id: session.user.id },
      select: { stripeId: true },
    })

    if (connectedStripe?.stripeId) {
      return stripe.charges.list({
        stripeAccount: connectedStripe.stripeId,
      })
    }
  } catch (error) {
    console.log(error)
  }
}
"""

# Save all files
files = {
    'lib/auth.ts': auth_config,
    'app/api/auth/[...nextauth]/route.ts': api_route,
    'middleware.ts': middleware_simple,
    'app/auth/sign-in/page.tsx': signin_custom,
    'app/auth/layout.tsx': auth_layout_simple,
    'app/(dashboard)/layout.tsx': dashboard_layout_nextauth,
    'actions/auth/index.ts': auth_actions_nextauth,
    'actions/settings/index.ts': settings_actions_nextauth,
    'actions/dashboard/index.ts': dashboard_actions_nextauth,
}

for path, content in files.items():
    full_path = f'/mnt/agents/output/NEXTAUTH_{path.replace("/", "_")}'
    with open(full_path, 'w') as f:
        f.write(content)
    print(f"Saved: {path}")

print()
print("=" * 70)
print("COMPLETE NEXTAUTH.JS MIGRATION FILES CREATED")
print("=" * 70)
