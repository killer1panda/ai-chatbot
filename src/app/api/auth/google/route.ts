import { client } from '@/lib/prisma'
import { jwtVerify, createRemoteJWKSet } from 'jose'
import { NextResponse } from 'next/server'

const JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'))

export async function POST(req: Request) {
  try {
    const { token } = await req.json()

    // Verify Google token
    const { payload } = await jwtVerify(token, JWKS)

    if (!payload.email) {
      return NextResponse.json({ error: 'No email in token' }, { status: 400 })
    }

    // Create or update user
    const user = await client.user.upsert({
      where: { email: payload.email as string },
      update: {},
      create: {
        email: payload.email as string,
        name: payload.name as string || 'Anonymous User',
        image: (payload.picture as string) || null,
        subscription: {
          create: {
            plan: 'STANDARD',
            credits: 0,
          },
        },
      },
    })

    // Create session
    const sessionToken = Buffer.from(JSON.stringify({ 
      userId: user.id, 
      email: user.email,
      expires: Date.now() + 24 * 60 * 60 * 1000 
    })).toString('base64')

    const response = NextResponse.json({ success: true, user })
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Google auth error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
  }
}
