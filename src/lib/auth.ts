import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { client } from './prisma'
import Google from 'next-auth/providers/google'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(client) as any,
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
    async redirect({ url, baseUrl }: { url: string, baseUrl: string }) {
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      if (url.startsWith(baseUrl)) return url
      return baseUrl
    },
    async signIn({ user, account, profile }: { user: any, account: any, profile: any }) {
      // Create subscription for new users
      if (account?.provider === 'google') {
        await client.user.upsert({
          where: { email: user.email! },
          update: {},
          create: {
            email: user.email!,
            name: user.name!,
            image: user.image!,
            subscription: {
              create: {
                plan: 'STANDARD',
                credits: 0,
              },
            },
          },
        })
      }
      return true
    },
  },
})