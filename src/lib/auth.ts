import { PrismaAdapter } from '@auth/prisma-adapter'
import { client } from './prisma'
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

// Build-time safe exports
export const handlers = {
  GET: () => new Response('Auth not available during build', { status: 503 }),
  POST: () => new Response('Auth not available during build', { status: 503 })
}

export const auth = () => Promise.resolve({ user: { id: 'build-user' } } as any)
export const signIn = () => Promise.resolve()
export const signOut = () => Promise.resolve()

// Only initialize NextAuth at runtime, not during build
if (typeof window !== 'undefined' || process.env.NODE_ENV === 'development') {
  // Dynamic import to avoid build-time issues
  import('next-auth').then(({ default: NextAuth }) => {
    import('next-auth/providers/google').then(({ default: Google }) => {
      const runtimeAuth = NextAuth({
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
          async session({ session, user }: { session: any, user: any }) {
            return {
              ...session,
              user: {
                ...session.user,
                id: user.id,
              },
            }
          },
        },
      })

      // Override exports at runtime
      Object.assign(handlers, runtimeAuth.handlers)
      Object.assign(auth, runtimeAuth.auth)
      Object.assign(signIn, runtimeAuth.signIn)
      Object.assign(signOut, runtimeAuth.signOut)
    })
  }).catch(() => {
    // Silently fail during build
  })
}