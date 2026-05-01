import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { client } from './prisma'
import Google from 'next-auth/providers/google'
import type { Adapter } from 'next-auth/adapters'

export const authOptions = {
  adapter: PrismaAdapter(client) as unknown as Adapter,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
  ],
  pages: {
    signIn: '/auth/sign-in',
    error: '/auth/sign-in',
  },
  callbacks: {
    async jwt({ token, user }: { token: any; user?: any }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session.user && token?.id) {
        ;(session.user as any).id = token.id
      }
      return session
    },
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`
      }
      if (url.startsWith(baseUrl)) {
        return url
      }
      return baseUrl
    },
    async signIn({ user, account, profile }: { user: any; account: any; profile?: any }) {
      if (account?.provider === 'google') {
        try {
          if (!user.email) {
            console.error('Google OAuth did not return an email')
            return false
          }
          await client.user.upsert({
            where: { email: user.email },
            update: {},
            create: {
              email: user.email,
              name: user.name ?? 'Anonymous User',
              image: user.image ?? null,
              subscription: {
                create: {
                  plan: 'STANDARD',
                  credits: 0,
                },
              },
            },
          })
        } catch (error) {
          console.error('Error in signIn callback:', error)
          return false
        }
      }
      return true
    },
  },
}

export default NextAuth(authOptions)

export { getServerSession } from 'next-auth'