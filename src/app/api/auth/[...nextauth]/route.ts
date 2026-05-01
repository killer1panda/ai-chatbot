import NextAuth from 'next-auth'
import { authOptions } from './../../../../lib/auth'

export const runtime = 'nodejs'

export const { GET, POST } = NextAuth(authOptions)